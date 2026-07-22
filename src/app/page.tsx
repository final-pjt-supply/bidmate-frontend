import { computeDday } from "@/lib/format";
import { getBids } from "@/lib/api/bids";
import { Topbar } from "@/components/topbar";
import { HomeView } from "@/components/home-view";
import { SiteFooter } from "@/components/site-footer";
import type { Bid } from "@/lib/types";

export default async function Home() {
  // 추천: 매칭 점수순(sort=score, 점수 준비 전엔 마감순 폴백) · 최신: 오늘 수집된 공고(today)
  let recommendedBids: Bid[] = [];
  let recentBids: Bid[] = [];
  let totalCount = 0;
  try {
    const [recommended, latest] = await Promise.all([
      getBids({ sort: "score", page: 1 }),
      getBids({ today: true, page: 1 }),
    ]);
    recommendedBids = recommended.items;
    recentBids = latest.items;
    totalCount = recommended.total;
  } catch (err) {
    console.error("공고 목록 로드 실패:", err);
  }

  const urgentCount = recommendedBids.filter(
    (bid) => computeDday(bid.bid_clse_dt).kind === "urgent"
  ).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="flex flex-1 flex-col">
        <HomeView
          recommendedBids={recommendedBids}
          recentBids={recentBids}
          urgentCount={urgentCount}
          totalCount={totalCount}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
