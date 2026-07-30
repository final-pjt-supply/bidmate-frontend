import type { Metadata } from "next";
import { Topbar } from "@/components/topbar";
import { RecoView } from "@/components/reco-view";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "맞춤 추천 · 비드프렌드",
  description: "회사 조건에 맞춰 자격 적합도를 판정한 공공입찰 공고 목록입니다.",
};

/**
 * 매칭 목록은 서버에서 미리 받아둘 수 없다 — GET /me/matches가 로그인 토큰을
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
