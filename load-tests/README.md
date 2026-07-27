# 프론트엔드 부하 테스트

운영과 동일한 AWS 경로인 `인터넷 → EC2 Nginx → Next.js 컨테이너`의 처리량을 k6로 측정한다.
백엔드와 DB 성능이 섞이지 않도록 입찰 API를 호출하는 `/`와 `/search`는 대상에서 제외한다.

## 테스트 대상

- `TARGET=health`: 캐시되지 않는 `/health`를 호출해 Nginx와 Next.js의 동적 HTTP 처리량을 측정한다.
- `TARGET=page`: `/guide` HTML을 반복 요청하고, `/_next/static/` 자산은 각 VU의 최초 방문에 한 번만 요청한다.
  실제 브라우저가 정적 자산을 캐시하는 흐름을 모사한다.

두 테스트는 결과 해석이 다르므로 한 번에 하나씩 실행한다. 일반 k6 HTTP 테스트는 JavaScript 실행, 화면 렌더링,
Cognito 로그인, Sentry 및 사용자 이벤트 전송을 수행하지 않는다.

## 설치

Windows에서는 공식 문서에 안내된 Winget 패키지를 사용한다.

```powershell
winget install k6 --source winget
k6 version
```

설치 문서: <https://grafana.com/docs/k6/latest/set-up/install-k6/>

## 안전장치

- 기본 프로필은 `smoke`이며 1 VU로 30초만 실행한다.
- `capacity`는 `ALLOW_LOAD_TEST=true`를 명시하지 않으면 시작되지 않는다.
- 요청에는 `User-Agent: bidmate-k6-frontend-load-test/1.0`과 `X-Load-Test` 헤더를 붙인다.
- 실패율 5% 초과, p95 2초 초과 또는 체크 성공률 95% 미만이면 테스트를 자동 중단한다.
- 실제 데이터 변경 요청은 보내지 않는다.

## 실행 순서

프로젝트 루트에서 먼저 Smoke Test를 각각 실행한다.

```powershell
$env:BASE_URL="http://13.125.187.40"
$env:PROFILE="smoke"
$env:TARGET="health"
k6 run .\load-tests\frontend.js

$env:TARGET="page"
k6 run .\load-tests\frontend.js
```

Smoke Test와 서버 모니터링이 정상인 경우에만 승인 후 단계 테스트를 실행한다.

```powershell
$env:BASE_URL="http://13.125.187.40"
$env:PROFILE="capacity"
$env:TARGET="health"
$env:ALLOW_LOAD_TEST="true"
New-Item -ItemType Directory -Force .\load-tests\results
k6 run --summary-export .\load-tests\results\health-capacity.json .\load-tests\frontend.js
```

`TARGET=page`도 별도 실행한다. Capacity 프로필은 10 → 30 → 50 → 100 VU 순으로 증가하며 각 구간을
2분 유지한다. VU는 동시 사용자 모델이며 RPS와 동일한 값이 아니다.

## 동시에 확인할 지표

- k6: `http_reqs`, `http_req_failed`, `http_req_duration`의 평균·p95·p99, iteration 수
- EC2: CPUUtilization, CPUCreditBalance, NetworkIn/Out, StatusCheckFailed
- 컨테이너: CPU·메모리, 재시작 여부
- 서비스: 별도 `/health` 감시의 연속 실패 여부

메모리는 기본 CloudWatch EC2 지표에 포함되지 않으므로 테스트 중 SSM으로 `docker stats --no-stream`을
주기적으로 확인한다.

## 결과 해석

- `health`만 느리면 Nginx, Node.js 또는 EC2 자원 한계를 우선 확인한다.
- `health`는 정상인데 `page`만 느리면 HTML 크기, 정적 자산 수, 네트워크 전송량을 확인한다.
- 둘 다 정상인데 `/`나 `/search`가 느리면 백엔드 API와 DB를 별도 통합 테스트한다.
- 한 대의 부하 발생 PC가 먼저 포화될 수 있으므로 높은 처리량 결과는 부하 발생기 CPU와 네트워크도 함께 확인한다.
