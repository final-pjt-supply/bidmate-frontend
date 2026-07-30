// /robots.txt — 검색엔진 크롤링 규칙 (App Router 메타데이터 라우트).
//
// 차단 목록은 sitemap.ts의 제외 목록과 같은 기준이다: 인증·개인·회원별 결과·
// 미완성 기능·데이터 경로. 나머지는 모두 허용하고 사이트맵 주소를 알린다.

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/login",
        "/signup",
        "/forgot-password",
        "/mypage",
        "/recommend",
        "/ai-recommend",
        "/bidbot",
      ],
    },
    sitemap: "https://bidfriend.ai.kr/sitemap.xml",
  };
}
