#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_NAME="bidmate-frontend"
readonly STATE_DIR="/opt/${APP_NAME}"
readonly ACTIVE_FILE="${STATE_DIR}/active-slot"
readonly LOCK_FILE="${STATE_DIR}/deploy.lock"
readonly NGINX_SOURCE="${STATE_DIR}/nginx.conf"
readonly NGINX_CONFIG="/etc/nginx/nginx.conf"
readonly UPSTREAM_CONFIG="/etc/nginx/bidmate-upstream.conf"
readonly LEGACY_CONTAINER="bidmate-web"
readonly HEALTH_ATTEMPTS=30
readonly HEALTH_INTERVAL_SECONDS=1
readonly DRAIN_SECONDS=10

# 홈 응답에서 보는 두 표식. 둘 다 ASCII라 로케일에 안 물린다.
#
#   셸  — 상단 내비 링크(src/components/topbar.tsx). Topbar는 page.tsx에서 HomeView
#         바깥에 있어 로그인 여부·백엔드 상태와 무관하게 항상 SSR된다. 렌더 자체의 증거.
#
#   공고 — RSC 페이로드에 직렬화된 공고 필드. '카드 링크'가 아니라 이걸 세는 이유:
#         HomeView는 useAuth().ready가 서버에서 항상 false라 스켈레톤으로 SSR된다
#         (home-view.tsx). 카드는 클라이언트 마운트 뒤에 붙으므로 HTML엔 없다.
#         반면 page.tsx가 서버에서 받아온 목록은 클라이언트 컴포넌트 props로
#         페이로드에 실려 나온다 — 즉 '서버가 백엔드에서 공고를 실제로 받아왔는가'를
#         바로 재는 값이다. 페이로드 안에서는 따옴표가 이스케이프돼 \"bid_id\" 로 나온다.
readonly HOME_SHELL_MARKER='href="/search"'
readonly HOME_BID_MARKER='\"bid_id\":'

: "${IMAGE:?IMAGE is required}"
: "${API_BASE_URL:?API_BASE_URL is required}"

mkdir -p "${STATE_DIR}"
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "Another frontend deployment is already running." >&2
  exit 1
fi

new_container=""
traffic_switched="false"
# run_slot이 방금 띄운 슬롯의 홈 공고 건수를 여기 남긴다(전환 직전 비교에 쓴다).
slot_bid_count=0

cleanup_on_exit() {
  local exit_code=$?

  if [[ ${exit_code} -ne 0 && "${traffic_switched}" == "false" && -n "${new_container}" ]]; then
    docker rm -f "${new_container}" >/dev/null 2>&1 || true
  fi
}
trap cleanup_on_exit EXIT

slot_port() {
  case "$1" in
    blue) echo "3001" ;;
    green) echo "3002" ;;
    *)
      echo "Unknown slot: $1" >&2
      return 1
      ;;
  esac
}

slot_container() {
  echo "bidmate-web-$1"
}

write_upstream() {
  local port=$1
  local destination=$2

  cat >"${destination}" <<EOF
upstream bidmate_frontend {
    server 127.0.0.1:${port};
    keepalive 32;
}
EOF
}

wait_for_health() {
  local url=$1
  local attempt

  for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt++)); do
    if curl -fsS --max-time 5 "${url}" >/dev/null; then
      return 0
    fi
    sleep "${HEALTH_INTERVAL_SECONDS}"
  done

  echo "Health check failed after ${HEALTH_ATTEMPTS} attempts: ${url}" >&2
  return 1
}

# EC2 인스턴스 ID를 IMDS에서 읽는다. Sentry 이벤트에 어느 인스턴스에서 난
# 에러인지 남기기 위한 값 — 다중 AZ로 2대를 굴리면서 "절반만 실패"하는 장애를
# 만났을 때 로그 서버를 일일이 뒤져야 했던 문제(2026-08-06) 대응.
#
# 이 인스턴스는 IMDSv2를 강제하므로 토큰을 먼저 받아야 한다(v1 방식은 401).
# 실패해도 배포는 계속한다 — 태그가 없으면 Sentry 기본값(컨테이너 호스트명)이
# 쓰일 뿐이고, 그것 때문에 배포를 막을 이유는 없다.
instance_id() {
  local token
  token="$(curl -fsS -m 2 -X PUT http://169.254.169.254/latest/api/token \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 60" 2>/dev/null)" || return 0
  curl -fsS -m 2 -H "X-aws-ec2-metadata-token: ${token}" \
    http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || return 0
}

# 홈을 한 번 받아 셸이 렌더됐는지 확인하고, 응답에 실린 공고 건수를 stdout으로 낸다.
# 셸조차 없으면 실패로 본다 — 200이어도 내용이 없는 응답은 전환하면 안 된다.
home_bid_count() {
  local port=$1
  local html

  html="$(curl -fsS --max-time 10 "http://127.0.0.1:${port}/")" || return 1

  if ! grep -qF "${HOME_SHELL_MARKER}" <<<"${html}"; then
    echo "Home on port ${port} rendered without the nav shell." >&2
    return 1
  fi

  # grep -c는 '일치한 줄 수'라 SSR HTML처럼 전부 한 줄로 붙어 나오면 24건이든 1건이든
  # 1이 된다. 실제 개수를 세려면 -o로 뽑아야 한다. 0건이면 grep이 1로 끝나는데,
  # 여기까지 왔으면 응답과 셸은 이미 확인됐으므로 '못 찾음'만 남는다 — 흡수해도 안전하다.
  { grep -oF "${HOME_BID_MARKER}" <<<"${html}" || true; } | wc -l | tr -d '[:space:]'
}

run_slot() {
  local slot=$1
  local port
  local container
  local sentry_server_name

  port="$(slot_port "${slot}")"
  container="$(slot_container "${slot}")"
  sentry_server_name="$(instance_id)"

  docker rm -f "${container}" >/dev/null 2>&1 || true
  docker run -d \
    --name "${container}" \
    --label "com.bidmate.app=${APP_NAME}" \
    --label "com.bidmate.slot=${slot}" \
    --label "com.bidmate.image=${IMAGE}" \
    --publish "127.0.0.1:${port}:3000" \
    --env NODE_ENV=production \
    --env "API_BASE_URL=${API_BASE_URL}" \
    --env "SENTRY_SERVER_NAME=${sentry_server_name}" \
    --restart unless-stopped \
    "${IMAGE}" >/dev/null

  new_container="${container}"
  wait_for_health "http://127.0.0.1:${port}/health"

  # /health는 상수 200이라 Node 프로세스 생존만 증명한다. 실제 SSR 렌더까지 확인해야
  # 500이나 빈 화면을 트래픽 전환 '전에' 잡는다. 홈은 백엔드 조회가 실패해도
  # allSettled로 200을 반환하므로(src/app/page.tsx), 이 검사는 백엔드 장애에 물리지 않는다.
  wait_for_health "http://127.0.0.1:${port}/"

  # 200이어도 목록이 비었을 수 있다(예: API_BASE_URL 오타 → 홈은 200, 공고는 0건).
  # 건수를 남겨 두면 전환 직전에 구 슬롯과 비교할 수 있고, 로그로도 바로 눈에 띈다.
  slot_bid_count="$(home_bid_count "${port}")"
  echo "Slot ${slot} served the home page with ${slot_bid_count} bids in the payload."
}

validate_nginx_source() {
  local candidate="${STATE_DIR}/nginx.conf.candidate"

  # Let’s Encrypt의 HTTP-01 검증 파일을 Nginx가 항상 읽을 수 있게 한다.
  # 신규 도메인 발급뿐 아니라 이후 certbot renew에도 같은 경로를 사용한다.
  install -d -m 0755 /var/www/certbot
  install -m 0644 "${NGINX_SOURCE}" "${candidate}"
  nginx -t -c "${candidate}"
  install -m 0644 "${candidate}" "${NGINX_CONFIG}"
  rm -f "${candidate}"
}

bootstrap_nginx() {
  local initial_slot="blue"
  local initial_port
  local upstream_candidate="${STATE_DIR}/upstream.initial"
  local legacy_stopped="false"

  initial_port="$(slot_port "${initial_slot}")"
  echo "Bootstrapping Nginx with ${initial_slot} on port ${initial_port}."

  if ! command -v nginx >/dev/null 2>&1; then
    dnf install -y nginx
  fi

  run_slot "${initial_slot}"
  write_upstream "${initial_port}" "${upstream_candidate}"
  install -m 0644 "${upstream_candidate}" "${UPSTREAM_CONFIG}"
  validate_nginx_source

  if docker ps --format '{{.Names}}' | grep -Fxq "${LEGACY_CONTAINER}"; then
    docker stop --time 10 "${LEGACY_CONTAINER}" >/dev/null
    legacy_stopped="true"
  fi

  systemctl enable nginx >/dev/null
  if ! systemctl restart nginx; then
    systemctl stop nginx >/dev/null 2>&1 || true
    if [[ "${legacy_stopped}" == "true" ]]; then
      docker start "${LEGACY_CONTAINER}" >/dev/null || true
    fi
    return 1
  fi

  if ! wait_for_health "http://127.0.0.1/health"; then
    systemctl stop nginx || true
    if [[ "${legacy_stopped}" == "true" ]]; then
      docker start "${LEGACY_CONTAINER}" >/dev/null || true
    fi
    return 1
  fi

  printf '%s\n' "${initial_slot}" >"${ACTIVE_FILE}.tmp"
  mv -f "${ACTIVE_FILE}.tmp" "${ACTIVE_FILE}"
  traffic_switched="true"

  docker rm -f "${LEGACY_CONTAINER}" >/dev/null 2>&1 || true
  rm -f "${upstream_candidate}"
  echo "Nginx bootstrap completed. Active slot: ${initial_slot}"
}

switch_traffic() {
  local target_slot=$1
  local target_port
  local upstream_candidate="${STATE_DIR}/upstream.candidate"
  local upstream_backup="${STATE_DIR}/upstream.backup"

  target_port="$(slot_port "${target_slot}")"
  write_upstream "${target_port}" "${upstream_candidate}"
  cp -f "${UPSTREAM_CONFIG}" "${upstream_backup}"
  install -m 0644 "${upstream_candidate}" "${UPSTREAM_CONFIG}"

  if ! nginx -t; then
    install -m 0644 "${upstream_backup}" "${UPSTREAM_CONFIG}"
    return 1
  fi

  systemctl reload nginx
  if ! wait_for_health "http://127.0.0.1/health"; then
    echo "Post-switch health check failed. Restoring previous upstream." >&2
    install -m 0644 "${upstream_backup}" "${UPSTREAM_CONFIG}"
    nginx -t
    systemctl reload nginx
    wait_for_health "http://127.0.0.1/health"
    return 1
  fi

  rm -f "${upstream_candidate}" "${upstream_backup}"
  traffic_switched="true"
}

if [[ ! -s "${ACTIVE_FILE}" ]]; then
  bootstrap_nginx
  exit 0
fi

active_slot="$(tr -d '[:space:]' <"${ACTIVE_FILE}")"
active_port="$(slot_port "${active_slot}")"
active_container="$(slot_container "${active_slot}")"

if ! systemctl is-active --quiet nginx; then
  echo "Nginx is not active while ${ACTIVE_FILE} exists. Refusing an unsafe deployment." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -Fxq "${active_container}"; then
  echo "Active container is missing: ${active_container}" >&2
  exit 1
fi

if ! wait_for_health "http://127.0.0.1:${active_port}/health"; then
  echo "Active slot is unhealthy before deployment: ${active_slot}" >&2
  exit 1
fi

validate_nginx_source
nginx -t
systemctl reload nginx

current_image="$(docker inspect --format '{{.Config.Image}}' "${active_container}")"
if [[ "${current_image}" == "${IMAGE}" ]]; then
  echo "Image is already active: ${IMAGE}"
  exit 0
fi

if [[ "${active_slot}" == "blue" ]]; then
  target_slot="green"
else
  target_slot="blue"
fi

target_container="$(slot_container "${target_slot}")"
echo "Deploying ${IMAGE} to ${target_slot}."
run_slot "${target_slot}"
new_bid_count="${slot_bid_count}"

# 회귀 게이트 — '공고 0건'을 절대 기준으로 삼으면 백엔드 장애 때 프론트 배포가 막힌다.
# 그래서 구 슬롯과 비교한다: 구는 나오는데 신은 안 나오면 이번 배포가 원인이다.
# (둘 다 0이면 백엔드 쪽 문제이므로 배포를 막지 않는다.)
# 구 슬롯 조회가 실패하면 비교를 포기하고 통과시킨다 — 판단 근거가 없는데
# 배포를 막으면, 정작 고쳐야 할 때 배포가 안 되는 쪽이 더 위험하다.
active_bid_count="$(home_bid_count "${active_port}" || echo -1)"
echo "Bids in payload — active(${active_slot}): ${active_bid_count}, new(${target_slot}): ${new_bid_count}."
if [[ "${active_bid_count}" -gt 0 && "${new_bid_count}" -eq 0 ]]; then
  echo "New slot renders no bids while the active slot renders ${active_bid_count}." >&2
  echo "Aborting before traffic switch — check API_BASE_URL and build args." >&2
  exit 1
fi

switch_traffic "${target_slot}"

printf '%s\n' "${target_slot}" >"${ACTIVE_FILE}.tmp"
mv -f "${ACTIVE_FILE}.tmp" "${ACTIVE_FILE}"

echo "Traffic switched to ${target_slot}. Draining ${active_slot} for ${DRAIN_SECONDS}s."
sleep "${DRAIN_SECONDS}"
docker rm -f "${active_container}" >/dev/null 2>&1 || true
docker image prune -af --filter "until=168h" >/dev/null || true

echo "Deployment completed. Active slot: ${target_slot}, image: ${IMAGE}"
