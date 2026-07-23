// 브라우저(클라이언트) 에러 수집 초기화.
// DSN은 공개용(클라이언트 번들에 노출되는 게 정상) — env로 override 가능.
import * as Sentry from "@sentry/nextjs";

const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://6d1cfa157891ea0326183b02ce24d524@o4511783481180160.ingest.us.sentry.io/4511783484915712";

Sentry.init({
  dsn: DSN,
  // 성능 트레이스 샘플링 — 개발 단계라 낮게(원하면 조정)
  tracesSampleRate: 0.1,
  // 개발 중엔 로컬에서도 전송해 테스트 가능. 배포 후 dev 잡음 줄이려면
  // NEXT_PUBLIC_SENTRY_ENABLED=false 로 끄거나 NODE_ENV 게이트로 조이면 됨.
  enabled: process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "false",
});

// App Router 라우터 전환 계측
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
