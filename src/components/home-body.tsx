"use client";

import { useState } from "react";
import { RefreshCw, Info } from "lucide-react";
import type { Bid, BidCategory } from "@/lib/types";
import { BidCard } from "@/components/bid-card";

const FILTERS: { label: string; value: BidCategory | "all" }[] = [
  { label: "전체", value: "all" },
  { label: "공사", value: "cnstwk" },
  { label: "용역", value: "servc" },
  { label: "물품", value: "thng" },
  { label: "외자", value: "frgcpt" },
];

type HomeBodyProps = {
  recommendedBids: Bid[];
  recentBids: Bid[];
};

export function HomeBody({ recommendedBids, recentBids }: HomeBodyProps) {
  const [filter, setFilter] = useState<BidCategory | "all">("all");

  const MAX_CARDS = 6;
  const byFilter = (bid: Bid) => filter === "all" || bid.bid_category === filter;
  const recommended = recommendedBids.filter(byFilter).slice(0, MAX_CARDS);
  const recent = recentBids.filter(byFilter).slice(0, MAX_CARDS);

  return (
    <div className="flex w-full flex-col gap-6 px-10 pb-16 pt-8">
      {/* 업종 필터 */}
      <div className="flex gap-2.5">
        {FILTERS.map(({ label, value }) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-[18px] py-2 text-[15px] font-bold transition-colors ${
                active
                  ? "bg-indigo-700 text-white"
                  : "border border-gray-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 내 조건 맞춤 추천 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-gray-900">내 조건 맞춤 추천</h2>
          <p className="text-sm text-slate-500">매칭 점수가 높은 순으로 보여드려요.</p>
        </div>
        <div className="flex items-center gap-[5px] text-gray-500">
          <RefreshCw className="size-3.5" strokeWidth={2} />
          <span className="text-[11.5px]">목록 동기화 3분 전</span>
          <Info className="size-[13px]" strokeWidth={2} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {recommended.map((bid) => (
          <BidCard key={bid.bid_id} bid={bid} showMatch />
        ))}
      </div>

      {/* 최신 공고 */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-bold text-gray-900">최신 공고</h2>
        <p className="text-[13px] text-slate-400">최근 자동 수집된 공고예요.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {recent.map((bid) => (
          <BidCard key={bid.bid_id} bid={bid} />
        ))}
      </div>
    </div>
  );
}
