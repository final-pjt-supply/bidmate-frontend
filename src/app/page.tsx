import bidsData from "@/lib/data/bids.json";
import type { Bid } from "@/lib/types";
import { computeDday } from "@/lib/format";
import { Topbar } from "@/components/topbar";
import { HomeView } from "@/components/home-view";
import { SiteFooter } from "@/components/site-footer";

const bids = (bidsData as { bids: Bid[] }).bids;

// 추천: 매칭 점수순 (점수는 에이전트가 채우기 전까지 null → 원래 순서 유지)
const recommendedBids = [...bids].sort(
  (a, b) => (b.match_score ?? -1) - (a.match_score ?? -1)
);

// 최신: 공고 등록일 내림차순
const recentBids = [...bids].sort(
  (a, b) => new Date(b.bid_ntce_dt).getTime() - new Date(a.bid_ntce_dt).getTime()
);

export default function Home() {
  const urgentCount = bids.filter((bid) => computeDday(bid.bid_clse_dt).kind === "urgent").length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="flex flex-1 flex-col">
        <HomeView
          recommendedBids={recommendedBids}
          recentBids={recentBids}
          urgentCount={urgentCount}
          totalCount={bids.length}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
