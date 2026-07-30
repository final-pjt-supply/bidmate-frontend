// SNS 공유 미리보기 이미지(1200x630). 바이너리 파일을 두는 대신 코드로 그린다 —
// 문구가 바뀌어도 디자인 도구를 거칠 필요가 없다. layout.tsx의 openGraph/twitter가
// 이 라우트를 자동으로 참조한다.
//
// ⚠ 한글 줄은 "빌드 시점 외부 네트워크"에 의존한다.
//
// next/og가 번들로 갖고 있는 폰트는 Geist-Regular.ttf(라틴) 하나뿐이다. 한글 글리프를
// 만나면 그때마다 https://fonts.googleapis.com/css2?family=Noto+Sans+KR 를 받아온다
// (node_modules/next/dist/compiled/@vercel/og/index.node.js 의 loadGoogleFont).
// 이 라우트는 정적 생성이라 그 요청이 **빌드 중에** 나간다. 실패하면 loadDynamicAsset이
// try/catch로 삼켜서 console.error만 남기고 렌더는 그대로 진행된다 → 빌드는 exit 0으로
// 성공하는데 이미지의 한글 줄만 두부(□□□□)로 구워진다. CI·컨테이너 빌드에서 egress가
// 막혀 있으면 아무도 모르게 깨진 카드가 배포된다.
//
// 실측(2026-07-31): fonts.googleapis.com 요청만 막고 clean build를 돌린 결과
// "Failed to load dynamic font for 나라장터공입찰고추천" 로그와 함께 exit 0으로 끝났고,
// 부제 줄이 전부 두부로 렌더됐다. 정상 네트워크에서는 제대로 나온다.
//
// 재현·확인 방법: rm -rf .next 로 캐시를 비우고 빌드한 뒤(캐시가 있으면 이미지를 다시
// 굽지 않는다) .next/server/app/opengraph-image.body 를 PNG로 열어 눈으로 본다.
//
// 근본 해결은 한글 폰트 파일(subset)을 저장소에 두고 fonts 옵션으로 직접 넘기는 것이다.
// 바이너리 자산 추가는 별도 승인이 필요해 이번 범위에서 하지 않았다. 그때까지는 배포
// 파이프라인에서 fonts.googleapis.com egress가 열려 있어야 한다.
import { ImageResponse } from "next/og";

// runtime을 edge로 두면 Next가 이 라우트의 정적 생성을 끈다("Using edge runtime on a
// page currently disables static generation"). 내용이 고정된 이미지라 빌드 때 한 번
// 굽는 편이 낫다 — 기본 Node 런타임을 그대로 쓴다.
export const alt = "비드프렌드 — 나라장터 공공입찰 공고 추천";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          // 푸터와 같은 slate-800. 브랜드 톤을 링크 카드까지 이어붙인다.
          backgroundColor: "#1e293b",
        }}
      >
        <div style={{ fontSize: 128, fontWeight: 700, color: "#ffffff", letterSpacing: -2 }}>
          BidFriend
        </div>
        <div style={{ marginTop: 24, fontSize: 40, color: "#94a3b8" }}>
          나라장터 공공입찰 공고 추천
        </div>
      </div>
    ),
    size
  );
}
