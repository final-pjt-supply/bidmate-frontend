import type { Metadata } from "next";
import { Topbar } from "@/components/topbar";
import { SiteFooter } from "@/components/site-footer";
import { StatsView } from "@/components/stats-view";
import { getStats, type StatsCategory } from "@/lib/api/stats";
import type { BidCategory } from "@/lib/types";

const CATEGORIES: BidCategory[] = ["cnstwk", "servc", "thng", "frgcpt"];
// 기본은 업종 무관 전체. 시장 규모를 먼저 보여주고 업종은 화면에서 좁힌다.
// 서버도 같은 기본값을 쓰지만 여기서 한 번 거르는 건 '전체' 칩의 활성 상태를
// 판단하려면 화면이 category를 알아야 하기 때문이다.
const toCategory = (v?: string): StatsCategory =>
  v === "ALL" || (v && (CATEGORIES as string[]).includes(v)) ? (v as StatsCategory) : "ALL";

export const metadata: Metadata = {
  title: "공고 통계 · 비드프렌드",
  description:
    "업종·품목별 예산 규모 분포, 자주 발주하는 수요기관, 월별 공고 추세를 확인하세요.",
};

/**
 * 집계는 DB의 bid_stats matview에 있고 백엔드가 조회만 한다(bidmate-backend #125).
 * 응답은 한 조건 분량이라 화면이 다시 거를 필요가 없다.
 *
 * 화면 상태는 쿼리스트링이 정본이다(cat·tag). 검색 화면과 같은 관례다.
 * tag 유효성은 서버가 판단한다 — 고를 수 있는 품목 목록이 응답 안에 있어서
 * 요청 전에는 알 수 없다. 무효하면 서버가 전체로 폴백하고 conditions에 실제 적용된
 * 조건을 담아 돌려준다.
 */
export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const category = toCategory(sp.cat);

  // 응답의 tags(품목 칩)는 업종 단위인데 total은 조건 단위다. 그래서 품목을 고른
  // 상태에서는 '전체' 칩에 붙일 업종 총계가 응답에 없다. 그때만 업종 단위 응답을
  // 한 번 더 받는다 — 45행 matview 조회라 비용이 없고, 캐시 키도 같아 재사용된다.
  const [data, categoryScoped] = await Promise.all([
    getStats({ category, tag: sp.tag }),
    sp.tag ? getStats({ category }) : Promise.resolve(null),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="flex flex-1 flex-col">
        <StatsView data={data} categoryTotal={(categoryScoped ?? data).total} />
      </main>
      <SiteFooter />
    </div>
  );
}
