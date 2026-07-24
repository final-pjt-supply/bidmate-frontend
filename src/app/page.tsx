import { computeDday } from "@/lib/format";
import { getBids, searchBids } from "@/lib/api/bids";
import { Topbar } from "@/components/topbar";
import { HomeView } from "@/components/home-view";
import { SiteFooter } from "@/components/site-footer";
import type { Bid } from "@/lib/types";

// 백엔드는 프라이빗 서브넷에 있어 빌드 환경(CI 러너)에서 닿을 수 없다. 정적 프리렌더로
// 두면 빌드 때 fetch가 실패해 '빈 목록'이 HTML에 구워진 채 배포된다. 요청 시 렌더로 고정.
export const dynamic = "force-dynamic";

export default async function Home() {
  // 추천: 매칭 점수순(sort=score, 점수 준비 전엔 마감순 폴백)
  // 최신: 등록이 최근인 순. today=true(오늘 등록분)로 두면 신규 유입이 없는 저녁·주말에
  //       섹션이 비거나 몇 건만 떴다 — 실측상 신규는 KST 업무시간에 몰린다.
  // allSettled: 한쪽이 실패해도 나머지 섹션은 살린다(all이면 둘 다 빈 화면이 된다).
  const [recommended, latest] = await Promise.allSettled([
    getBids({ sort: "score", page: 1 }),
    searchBids({ sort: "recent", page: 1 }),
  ]);

  if (recommended.status === "rejected") console.error("추천 공고 로드 실패:", recommended.reason);
  if (latest.status === "rejected") console.error("최신 공고 로드 실패:", latest.reason);

  const recommendedBids: Bid[] = recommended.status === "fulfilled" ? recommended.value.items : [];
  const recentBids: Bid[] = latest.status === "fulfilled" ? latest.value.items : [];
  const totalCount = recommended.status === "fulfilled" ? recommended.value.total : 0;

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
