import type { Metadata } from "next";
import { notFound } from "next/navigation";
import bidsData from "@/lib/data/bids.json";
import type { Bid } from "@/lib/types";
import { Topbar } from "@/components/topbar";
import { BidDetailView } from "@/components/bid-detail-view";
import { SiteFooter } from "@/components/site-footer";

const bids = (bidsData as { bids: Bid[] }).bids;

const findBid = (id: string) => bids.find((b) => b.bid_id === id);

export function generateStaticParams() {
  return bids.map((b) => ({ bid_id: b.bid_id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bid_id: string }>;
}): Promise<Metadata> {
  const { bid_id } = await params;
  const bid = findBid(bid_id);
  if (!bid) return { title: "공고를 찾을 수 없어요 · 비드메이트" };
  return {
    title: `${bid.bid_ntce_nm} · 비드메이트`,
    description: `${bid.dminstt_nm}이(가) 공고한 ${bid.bid_ntce_nm}의 공고 정보와 자격요건을 확인하세요.`,
  };
}

export default async function BidDetailPage({
  params,
}: {
  params: Promise<{ bid_id: string }>;
}) {
  const { bid_id } = await params;
  const bid = findBid(bid_id);
  if (!bid) notFound();

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Topbar />
      <main className="flex flex-1 flex-col">
        <BidDetailView bid={bid} />
      </main>
      <SiteFooter />
    </div>
  );
}
