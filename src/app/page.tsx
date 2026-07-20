import bidsData from "@/lib/data/bids.json";
import type { Bid } from "@/lib/types";
import { BidCard } from "@/components/bid-card";

const bids = (bidsData as { bids: Bid[] }).bids;

const recentBids = [...bids]
  .sort((a, b) => new Date(b.bid_ntce_dt).getTime() - new Date(a.bid_ntce_dt).getTime())
  .slice(0, 6);

export default function Home() {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 sm:px-8">
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            최근 등록된 공고
          </h2>
          <div className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-2 sm:-mx-8 sm:px-8">
            {recentBids.map((bid) => (
              <BidCard key={bid.bid_id} bid={bid} className="w-64 shrink-0" />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            전체 공고 <span className="text-zinc-400 dark:text-zinc-500">({bids.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {bids.map((bid) => (
              <BidCard key={bid.bid_id} bid={bid} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
