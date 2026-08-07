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
      // 어느 EC2에서 난 에러인지 구분한다. ALB 뒤에 인스턴스가 2대라, 이 값이
      // 없으면 SDK 기본값인 컨테이너 호스트명(무작위 문자열)이 들어가 인스턴스를
      // 특정할 수 없다. 값은 배포 스크립트가 IMDS에서 읽어 주입한다
      // (deploy/blue-green-deploy.sh의 instance_id). 주입 실패 시 undefined가
      // 되어 기존과 동일하게 동작한다.
      serverName: process.env.SENTRY_SERVER_NAME || undefined,
      // 어느 배포부터 에러가 늘었는지 추적한다. 이미지 태그와 같은 커밋 SHA라
      // Sentry에서 본 release로 곧바로 코드를 찾을 수 있다. 빌드 시점에
      // 번들로 들어간다(Dockerfile의 ARG) — 롤백해도 그 이미지에 박힌 값이
      // 따라오므로 실제 돌고 있는 버전과 항상 일치한다.
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
    });
  }
}

// 서버 컴포넌트/라우트 핸들러에서 발생한 요청 에러 캡처
export const onRequestError = Sentry.captureRequestError;
