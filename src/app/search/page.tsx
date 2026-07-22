import type { Metadata } from "next";
import bidsData from "@/lib/data/bids.json";
import type { Bid, BidCategory } from "@/lib/types";
import { Topbar } from "@/components/topbar";
import { SearchView } from "@/components/search-view";
import { SiteFooter } from "@/components/site-footer";

const CATEGORIES: BidCategory[] = ["cnstwk", "servc", "thng", "frgcpt"];
const toCategory = (v?: string): BidCategory | undefined =>
  v && (CATEGORIES as string[]).includes(v) ? (v as BidCategory) : undefined;

export const metadata: Metadata = {
  title: "공고 검색 · 비드메이트",
  description: "나라장터 공공입찰 공고를 공고명·발주기관으로 검색하고 마감·금액·등록순으로 정렬해 확인하세요.",
};

const bids = (bidsData as { bids: Bid[] }).bids;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Topbar />
      <main className="flex flex-1 flex-col">
        <SearchView bids={bids} initialQuery={q ?? ""} initialCategory={toCategory(cat)} />
      </main>
      <SiteFooter />
    </div>
  );
}
