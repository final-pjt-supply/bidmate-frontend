import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Sentry 조직·프로젝트 (소스맵 업로드는 빌드 시 SENTRY_AUTH_TOKEN 있을 때만 동작 → 배포 단계)
  org: "bidmate",
  project: "javascript-nextjs",
  // 빌드 로그 최소화
  silent: !process.env.CI,
  // 광고차단기에 막히지 않게 이벤트를 우리 도메인 경유로 전송
  tunnelRoute: "/monitoring",
  // 소스맵을 클라이언트 번들에서 제거(스택트레이스는 Sentry에서만)
  sourcemaps: { disable: false },
});
