// 서버/엣지 런타임 에러 수집 초기화.
import * as Sentry from "@sentry/nextjs";

const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://6d1cfa157891ea0326183b02ce24d524@o4511783481180160.ingest.us.sentry.io/4511783484915712";

export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({
      dsn: DSN,
      tracesSampleRate: 0.1,
      enabled: process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "false",
    });
  }
}

// 서버 컴포넌트/라우트 핸들러에서 발생한 요청 에러 캡처
export const onRequestError = Sentry.captureRequestError;
