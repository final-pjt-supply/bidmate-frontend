import type { Metadata } from "next";
import { getBids } from "@/lib/api/bids";
import { Topbar } from "@/components/topbar";
import { RecoView } from "@/components/reco-view";
import { SiteFooter } from "@/components/site-footer";
import type { Bid } from "@/lib/types";

export const metadata: Metadata = {
  title: "맞춤 추천 · 비드메이트",
  description: "회사 조건에 맞춰 매칭 점수순으로 추천하는 공공입찰 공고 목록입니다.",
};

export default async function RecommendPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort: "score" | "deadline" = sp.sort === "deadline" ? "deadline" : "score";

  let items: Bid[] = [];
  let total = 0;
  let pageSize = 20;
  try {
    const data = await getBids({ sort, page });
    items = data.items;
    total = data.total;
    pageSize = data.page_size;
  } catch (err) {
    console.error("맞춤 추천 목록 로드 실패:", err);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <RecoView items={items} total={total} page={page} pageSize={pageSize} sort={sort} />
      <SiteFooter />
    </div>
  );
}
