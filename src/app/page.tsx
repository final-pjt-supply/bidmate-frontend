import { getBids, searchBids } from "@/lib/api/bids";
import { Topbar } from "@/components/topbar";
import { HomeView } from "@/components/home-view";
import { SiteFooter } from "@/components/site-footer";
import type { Bid } from "@/lib/types";

// 백엔드는 프라이빗 서브넷에 있어 빌드 환경(CI 러너)에서 닿을 수 없다. 정적 프리렌더로
// 두면 빌드 때 fetch가 실패해 '빈 목록'이 HTML에 구워진 채 배포된다. 요청 시 렌더로 고정.
export const dynamic = "force-dynamic";

export default async function Home() {
  // 카드 목록은 비회원도 보는 화면이라 서버에서 미리 받는다(로그인 불필요).
  // 회원 대시보드 건수와 맞춤 추천 목록은 토큰이 필요해 HomeView가 마운트 후 따로 부른다
  // — 그래서 아래 recommended는 비회원 미리보기 전용이다.
  //
  // 최신: 등록이 최근인 순. today=true(오늘 등록분)로 두면 신규 유입이 없는 저녁·주말에
  //       섹션이 비거나 몇 건만 떴다 — 실측상 신규는 KST 업무시간에 몰린다.
  // allSettled: 한쪽이 실패해도 나머지 섹션은 살린다(all이면 둘 다 빈 화면이 된다).
  const [recommended, latest] = await Promise.allSettled([
    getBids({ sort: "deadline", page: 1 }),
    searchBids({ sort: "recent", page: 1 }),
  ]);

  if (recommended.status === "rejected") console.error("추천 공고 로드 실패:", recommended.reason);
  if (latest.status === "rejected") console.error("최신 공고 로드 실패:", latest.reason);

  const recommendedBids: Bid[] = recommended.status === "fulfilled" ? recommended.value.items : [];
  const recentBids: Bid[] = latest.status === "fulfilled" ? latest.value.items : [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="flex flex-1 flex-col">
        <HomeView
          recommendedBids={recommendedBids}
          recentBids={recentBids}
          recentLoadFailed={latest.status === "rejected"}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
