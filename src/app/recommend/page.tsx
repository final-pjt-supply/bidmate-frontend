import type { Metadata } from "next";
import { Topbar } from "@/components/topbar";
import { RecoView } from "@/components/reco-view";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "AI 맞춤 추천 · 비드메이트",
  description: "참가 가능한 공고 중 회사 관심사와 유사한 공고를 AI가 추천합니다.",
};

/**
 * 추천 목록은 서버에서 미리 받아둘 수 없다 — GET /me/recommendations가 로그인 토큰을
 * 요구하는데 토큰은 브라우저에만 있다(Cognito, localStorage). 그래서 데이터 로드는
 * RecoView가 마운트 후 직접 한다(스크랩 목록과 같은 구조).
 */
export default function RecommendPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <RecoView />
      <SiteFooter />
    </div>
  );
}
