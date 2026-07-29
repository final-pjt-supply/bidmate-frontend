import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// 모든 응답에 붙이는 보안 헤더. 값은 고정이라 상수로 뺀다.
//
// HSTS(Strict-Transport-Security)는 일부러 빠져 있다. "앞으로 HTTPS로만 접속"을
// 브라우저에 각인시키는 헤더인데, 아직 TLS가 없어 지금 켜면 사용자가 사이트에
// 접속 자체를 못 하게 된다. TLS 도입과 함께 추가한다.
const securityHeaders = [
  // 우리 페이지를 다른 사이트 iframe에 넣지 못하게 한다(클릭재킹 방지).
  // CSP frame-ancestors의 구형 브라우저용 대체재이기도 하다.
  { key: "X-Frame-Options", value: "DENY" },
  // 브라우저가 응답의 Content-Type을 멋대로 추측(sniffing)하지 못하게 한다.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 외부 사이트로 이동할 때 전체 URL(경로·쿼리) 대신 출처만 넘긴다.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 쓰지 않는 브라우저 기능을 명시적으로 끈다.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // CSP는 우선 "Report-Only"로 넣는다 — 아무것도 차단하지 않고 위반만 콘솔에 보고한다.
  // 실제 환경에서 무엇이 막히는지(Cognito 직접 호출 등) 먼저 관찰한 뒤, 허용 목록을
  // 좁혀 잡고 강제(Content-Security-Policy)로 전환한다.
  //
  // script-src의 'unsafe-inline'/'unsafe-eval'은 임시다. Next가 인라인 스크립트를
  // 쓰기 때문인데, 이게 있으면 CSP의 XSS 방어가 약해진다. 최종 강화 단계에서
  // nonce(요청마다 바뀌는 일회용 값)로 대체해 제거한다.
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // 외부 통신은 우리 도메인 + 관찰로 확인된 출처만 허용한다.
      // Report-Only로 관찰해보니 로그인 시 Cognito(AWS)로 직접 호출이 나가 connect-src
      // 위반으로 잡혔다 → 그 도메인만 허용 목록에 추가한다. 백엔드 API는 /api/* 프록시라
      // same-origin, Sentry는 tunnelRoute 덕에 same-origin이라 별도 추가가 필요 없다.
      "connect-src 'self' https://cognito-idp.ap-northeast-2.amazonaws.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Docker 배포용: 실행에 필요한 최소 파일만 .next/standalone 으로 추려낸다.
  // (node_modules 통째로 복사할 필요가 없어져 이미지가 크게 작아짐)
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
