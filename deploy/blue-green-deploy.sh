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

run_slot() {
  local slot=$1
  local port
  local container

  port="$(slot_port "${slot}")"
  container="$(slot_container "${slot}")"

  docker rm -f "${container}" >/dev/null 2>&1 || true
  docker run -d \
    --name "${container}" \
    --label "com.bidmate.app=${APP_NAME}" \
    --label "com.bidmate.slot=${slot}" \
    --label "com.bidmate.image=${IMAGE}" \
    --publish "127.0.0.1:${port}:3000" \
    --env NODE_ENV=production \
    --env "API_BASE_URL=${API_BASE_URL}" \
    --restart unless-stopped \
    "${IMAGE}" >/dev/null

  new_container="${container}"
  wait_for_health "http://127.0.0.1:${port}/health"
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
switch_traffic "${target_slot}"

printf '%s\n' "${target_slot}" >"${ACTIVE_FILE}.tmp"
mv -f "${ACTIVE_FILE}.tmp" "${ACTIVE_FILE}"

echo "Traffic switched to ${target_slot}. Draining ${active_slot} for ${DRAIN_SECONDS}s."
sleep "${DRAIN_SECONDS}"
docker rm -f "${active_container}" >/dev/null 2>&1 || true
docker image prune -af --filter "until=168h" >/dev/null || true

echo "Deployment completed. Active slot: ${target_slot}, image: ${IMAGE}"
