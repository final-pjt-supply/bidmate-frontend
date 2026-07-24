import type { Metadata } from "next";
import { getBids } from "@/lib/api/bids";
import type { Bid, BidCategory } from "@/lib/types";
import { Topbar } from "@/components/topbar";
import { SearchView } from "@/components/search-view";
import { SiteFooter } from "@/components/site-footer";

const CATEGORIES: BidCategory[] = ["cnstwk", "servc", "thng", "frgcpt"];
const toCategory = (v?: string): BidCategory | undefined =>
  v && (CATEGORIES as string[]).includes(v) ? (v as BidCategory) : undefined;

export const metadata: Metadata = {
  title: "공고 검색 · 비드메이트",
  description: "나라장터 공공입찰 공고를 업무구분으로 좁혀 마감 임박순으로 확인하세요.",
};

// 백엔드는 프라이빗 서브넷이라 빌드 환경에서 닿을 수 없다(홈과 동일 이유).
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; cat?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const category = toCategory(sp.cat);

  // 마감 지난 공고는 서버가 제외한다. 정렬은 마감 임박순(백엔드 기본).
  let items: Bid[] = [];
  let total = 0;
  let pageSize = 20;
  try {
    const data = await getBids({ page, category, sort: "deadline" });
    items = data.items;
    total = data.total;
    pageSize = data.page_size;
  } catch (err) {
    console.error("공고 목록 로드 실패:", err);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="flex flex-1 flex-col">
        <SearchView items={items} total={total} page={page} pageSize={pageSize} category={category} />
      </main>
      <SiteFooter />
    </div>
  );
}
