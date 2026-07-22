import type { Metadata } from "next";
import bidsData from "@/lib/data/bids.json";
import type { Bid } from "@/lib/types";
import { Topbar } from "@/components/topbar";
import { RecoView } from "@/components/reco-view";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "맞춤 추천 · 비드메이트",
  description: "회사 조건에 맞춰 매칭 점수순으로 추천하는 공공입찰 공고 목록입니다.",
};

const bids = (bidsData as { bids: Bid[] }).bids;

export default function RecommendPage() {
  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Topbar />
      <RecoView bids={bids} />
      <SiteFooter />
    </div>
  );
}
