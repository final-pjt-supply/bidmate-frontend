import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Docker 배포용: 실행에 필요한 최소 파일만 .next/standalone 으로 추려낸다.
  // (node_modules 통째로 복사할 필요가 없어져 이미지가 크게 작아짐)
  output: "standalone",
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
