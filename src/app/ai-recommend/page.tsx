import type { Metadata } from "next";
import { Topbar } from "@/components/topbar";
import { AIRecoView } from "@/components/ai-reco-view";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "AI 추천 공고 · 비드메이트",
  description: "참가 가능한 공고 중 회사 관심사와 유사한 공고를 AI가 추천합니다.",
};

export default function AIRecommendPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <AIRecoView />
      <SiteFooter />
    </div>
  );
}
