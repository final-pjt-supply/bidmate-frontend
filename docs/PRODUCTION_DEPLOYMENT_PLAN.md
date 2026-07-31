# Bidmate 운영 배포 계획

> 기준일: 2026-07-27  
> 목표 배포일: 2026-07-29(수)  
> 상태: Draft  
> 이 문서는 다른 PC나 작업자가 배포 준비를 즉시 이어갈 수 있도록 관리하는 기준 문서다.

## 1. 목표

- 실제 사용자의 트래픽을 안전하게 수신한다.
- 배포 실패 시 서비스를 유지하거나 빠르게 이전 버전으로 복구한다.
- 운영 중 오류, 자원 사용량, 배포 상태를 확인할 수 있게 한다.
- 실제 트래픽과 운영 경험을 포트폴리오 근거로 남긴다.

## 2. 현재 CI/CD 구성

```text
main PR
  -> GitHub Actions CI
     -> npm ci
     -> TypeScript 검사
     -> ESLint
     -> Next.js 빌드

main push
  -> CI 통과
  -> GitHub OIDC로 AWS 인증
  -> Docker 이미지 빌드
  -> ECR에 commit SHA 및 latest 태그 push
  -> SSM Run Command로 EC2에 배포 명령 전송
  -> EC2가 commit SHA 이미지 pull
  -> 기존 bidmate-web 컨테이너 삭제
  -> 신규 컨테이너 실행
  -> 홈페이지 HTTP 헬스체크
```

관련 파일:

- `.github/workflows/deploy.yml`
- `Dockerfile`
- `docker-compose.yml`
- `next.config.ts`

현재 배포 방식의 핵심 위험:

- 신규 컨테이너를 검증하기 전에 기존 컨테이너를 삭제해 짧은 다운타임이 발생한다.
- 신규 버전이 실패해도 이전 버전으로 자동 롤백하지 않는다.
- 연속 push 시 배포가 겹칠 수 있다.
- 애플리케이션 전용 health endpoint가 없다.

## 3. 수요일까지 우선순위

### P0 — 실제 공개 전 필수

- [ ] 운영 도메인과 DNS 연결 확인
- [ ] HTTPS 인증서 적용 및 HTTP -> HTTPS 리다이렉트
- [ ] 프론트엔드와 백엔드 운영 환경변수 점검
- [ ] DB 백업 생성 및 복구 방법 확인
- [ ] 애플리케이션 health endpoint 추가
- [ ] 배포 실패 시 기존 버전 유지 또는 자동 롤백
- [ ] GitHub Actions `concurrency` 설정으로 동시 배포 방지
- [ ] 배포 전후 핵심 기능 smoke test
- [ ] 실제 배포 리허설 1회 이상 수행

### P1 — 가능하면 수요일 전 적용

- [ ] ALB 도입 및 target health check 설정
- [ ] Nginx reverse proxy 구성
- [ ] Blue/Green 컨테이너 전환 구현
- [ ] 백엔드 예외와 5xx 로그 수집 확인
- [ ] EC2 CPU, 메모리, 디스크 확인 방법 마련
- [ ] 주요 장애 알람 설정
- [ ] 간단한 부하 테스트 및 결과 기록

### P2 — 실제 트래픽 수집 후 검토

- [ ] ECS 또는 ECS Fargate 전환
- [ ] Auto Scaling 도입
- [ ] Canary 배포
- [ ] WAF rate-based rule 및 관리형 규칙
- [ ] 다중 EC2 및 Multi-AZ 고가용성
- [ ] Kubernetes/EKS 도입 타당성 검토

## 4. 목표 배포 구조

수요일까지 현실적인 목표는 단일 EC2를 유지하면서 배포 중단과 롤백 문제를 개선하는 것이다.

```text
사용자
  -> Route 53
  -> ALB (HTTPS 종료, HTTP -> HTTPS, health check)
  -> EC2
  -> Nginx :80
     -> Blue 컨테이너 :3001
     -> Green 컨테이너 :3002
```

주의:

- 단일 EC2이므로 EC2 자체 장애에는 대응하지 못한다.
- ALB는 HTTPS와 health check를 담당한다.
- Nginx는 요청 전달과 Blue/Green 트래픽 전환을 담당한다.
- Kubernetes는 이번 배포 범위에 포함하지 않는다.

## 5. Blue/Green 배포 절차

```text
1. 현재 활성 색상과 포트를 확인한다.
2. 새 commit SHA 이미지를 ECR에서 pull한다.
3. 비활성 색상의 컨테이너를 다른 포트에 실행한다.
4. 신규 컨테이너 health endpoint를 검사한다.
5. 실패하면 신규 컨테이너만 제거하고 기존 버전을 유지한다.
6. 성공하면 Nginx upstream을 신규 컨테이너로 변경한다.
7. nginx -t로 설정을 검증한다.
8. Nginx를 graceful reload한다.
9. 외부 도메인에서 smoke test를 실행한다.
10. 성공하면 이전 컨테이너를 종료한다.
11. 실패하면 Nginx upstream을 이전 컨테이너로 되돌린다.
```

완료 조건:

- [ ] 배포 중 기존 요청이 중단되지 않는다.
- [ ] 신규 컨테이너 health check 실패 시 기존 버전이 유지된다.
- [ ] 트래픽 전환 후 실패 시 이전 버전으로 복구된다.
- [ ] 배포에 사용한 commit SHA를 확인할 수 있다.

## 6. HTTPS 및 네트워크

- Route 53 또는 사용 중인 DNS에서 도메인을 ALB로 연결한다.
- ACM 인증서를 ALB의 443 listener에 연결한다.
- 80 listener는 443으로 리다이렉트한다.
- EC2 애플리케이션 포트는 인터넷에 직접 공개하지 않는다.
- EC2 보안 그룹은 ALB 보안 그룹에서 오는 요청만 허용한다.
- 서버 관리는 SSH 대신 현재 SSM 방식을 유지한다.

## 7. 로그와 최소 모니터링

Grafana 구축은 수요일 배포의 필수 조건이 아니다. 현재 이벤트 로그와 Sentry 브라우저 오류 수집을 유지하면서 서버 측 상태를 보완한다.

확인할 항목:

- [x] 사용자 이벤트 로그 수집
- [x] Sentry 브라우저 오류 수집
- [ ] 백엔드 예외 및 5xx 로그 수집
- [ ] API 평균 및 p95 응답시간 확인
- [ ] EC2 CPU 사용률 확인
- [ ] EC2 메모리 및 디스크 사용량 확인
- [ ] Docker 컨테이너 중단 및 재시작 확인
- [ ] GitHub Actions 배포 성공 및 실패 확인

최소 알람 후보:

- [ ] 5xx 오류 급증
- [ ] CPU 지속 과부하
- [ ] 디스크 여유 공간 부족
- [ ] health check 실패
- [ ] 배포 실패

초기에는 Sentry, CloudWatch 기본 지표, CloudWatch Logs, GitHub Actions 실행 기록이면 충분하다. Grafana는 여러 데이터 소스를 한 대시보드에 통합할 필요가 생겼을 때 검토한다.

## 8. 배포 전 체크리스트

- [ ] CI의 typecheck, lint, build 모두 성공
- [ ] DB 백업 완료
- [ ] 운영 환경변수 확인
- [ ] Cognito 로그인, 로그아웃, 회원가입 확인
- [ ] 핵심 조회 및 저장 API 확인
- [ ] 프론트엔드 및 백엔드 health check 성공
- [ ] HTTPS 인증서와 리다이렉트 확인
- [ ] Sentry 이벤트 수신 확인
- [ ] 서버 로그 확인 가능
- [ ] 롤백 대상 이미지 SHA 기록
- [ ] 롤백 명령 또는 자동 롤백 동작 확인
- [ ] 모니터링 화면과 담당자 연락 채널 준비

## 9. 배포 후 기록할 지표

- 총 요청 수와 시간대별 요청 수
- 실제 사용자 수
- 평균 및 p95 API 응답시간
- 4xx 및 5xx 비율
- 프론트엔드 및 백엔드 오류 수
- EC2 CPU, 메모리, 디스크 사용량
- 배포 횟수와 배포 소요 시간
- 배포 중 다운타임
- 실패한 배포와 롤백 여부
- 발생한 장애, 원인, 탐지 방법, 복구 시간

## 10. 포트폴리오 기록 초안

> GitHub Actions, AWS OIDC, ECR, SSM을 이용해 배포 자동화를 구성했다. 기존 컨테이너 선삭제 방식에서 발생하는 다운타임과 롤백 부재를 발견하고, health check 기반 Blue/Green 배포와 실패 시 이전 버전 유지 방식으로 개선했다. HTTPS와 최소 운영 모니터링을 구성하고 실제 트래픽의 오류율, 응답시간, 자원 사용량을 측정했다.

## 11. 다음 작업자가 먼저 확인할 것

1. 현재 브랜치와 `origin/main`의 차이
2. `.github/workflows/deploy.yml`의 최신 상태
3. AWS의 Route 53, ACM, ALB, EC2, ECR, IAM, SSM 구성
4. 프론트엔드와 백엔드의 health endpoint 존재 여부
5. DB 종류, 백업 위치, 복구 절차
6. 운영 도메인과 보안 그룹 규칙
7. 이 문서의 미완료 체크박스

## 12. 문서 관리 원칙

- 이 Git 저장소의 Markdown 파일을 기준 문서로 사용한다.
- 결정이나 구성이 바뀌면 코드 변경과 함께 이 문서를 갱신한다.
- Notion에는 같은 내용의 공유용 사본을 두되, 충돌 시 Git 문서를 우선한다.
- 비밀번호, 토큰, 개인키 등 비밀값은 문서에 기록하지 않는다.
