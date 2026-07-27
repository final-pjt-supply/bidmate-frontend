# 프론트엔드 부하 테스트

운영과 동일한 AWS 경로인 `인터넷 → EC2 Nginx → Next.js 컨테이너`의 처리량을 k6로 측정한다.
백엔드와 DB 성능이 섞이지 않도록 입찰 API를 호출하는 `/`와 `/search`는 대상에서 제외한다.

## 테스트 대상

- `TARGET=health`: 캐시되지 않는 `/health`를 호출해 Nginx와 Next.js의 동적 HTTP 처리량을 측정한다.
- `TARGET=page`: `/guide` HTML을 반복 요청하고, `/_next/static/` 자산은 각 VU의 최초 방문에 한 번만 요청한다.
  실제 브라우저가 정적 자산을 캐시하는 흐름을 모사한다.
- `TARGET=html`: `/guide` HTML만 반복 요청해 Nginx와 Next.js의 HTML 응답을 분리 측정한다.
- `TARGET=assets`: 시작 시 `/guide`에서 자산 URL을 한 번 찾고 정적 자산 묶음만 반복 요청한다.

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
- `diagnostic`과 `capacity`는 `ALLOW_LOAD_TEST=true`를 명시하지 않으면 시작되지 않는다.
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

## 지연 원인 분리

Page Capacity Test가 30 VU 상승 구간에서 타임아웃된 원인을 분리할 때는 짧은 `diagnostic` 프로필을 쓴다.
이 프로필은 10 → 30 VU까지만 실행하며 각 단계를 1분 유지한다.

```powershell
$env:BASE_URL="http://13.125.187.40"
$env:PROFILE="diagnostic"
$env:ALLOW_LOAD_TEST="true"

$env:TARGET="html"
k6 run .\load-tests\frontend.js

$env:TARGET="assets"
k6 run .\load-tests\frontend.js
```

테스트 중 부하 발생 PC도 함께 확인한다.

```powershell
Get-Counter '\Processor(_Total)\% Processor Time',
  '\Network Interface(*)\Bytes Total/sec' -SampleInterval 5 -Continuous
```

서버 처리시간을 구분하려면 실제 적용 전에 Nginx 접근 로그에 다음 항목을 추가하는 변경을 별도로 검토한다.

- `$request_time`: Nginx가 요청을 받은 뒤 응답을 끝낼 때까지 걸린 전체 시간
- `$upstream_response_time`: Next.js가 Nginx에 응답하는 데 걸린 시간
- `$upstream_status`: Next.js가 반환한 상태 코드

이 로그 변경은 테스트 스크립트 PR에 포함하지 않으며 별도 승인 후 운영 설정에 적용한다.

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

## 2026-07-27 측정 결과

### Health Capacity

- 10 → 30 → 50 → 100 VU, 10분 30초
- 27,814 요청, 실패율 0%, 평균 24.35ms, p95 69.83ms
- 컨테이너 CPU 최대 35.06%, 평균 12.73%
- 최소 가용 메모리 1,143MB, 재시작 및 내부/외부 health 실패 0회
- EC2 CPUCreditBalance 576 유지

`/health` 기준으로는 단일 t3.small EC2가 100 VU 구간을 여유 있게 처리했다. 이 결과는 페이지 렌더링이나
백엔드 API 처리량을 의미하지 않는다.

### Page Capacity

- 10 VU 유지 후 30 VU 상승 구간에서 자동 중단
- 중단 시점 3분 6초, 2,211 요청, 실패율 2.39%, p95 2.43초
- 정적 자산 실패율 7.77%, 5초 요청 타임아웃 발생
- 중단 전 컨테이너 CPU 최대 7.21%, 최소 가용 메모리 1,174MB
- 컨테이너 재시작 및 내부/외부 health 실패 0회
- Nginx 최근 5,000개 요청 집계는 4,995개가 HTTP 200

서버 자원 포화와 서비스 장애는 확인되지 않았다. k6가 실행된 로컬 PC·인터넷 경로, 신규 VU의 순간적인
정적 자산 동시 연결, 서버 응답시간을 분리 측정해야 하므로 이 결과만으로 EC2의 페이지 처리 한계를
30 VU라고 결론 내리지 않는다. 다음 측정에서는 부하 발생기 CPU·네트워크와 Nginx의
`request_time`/`upstream_response_time`을 함께 수집한다.
