"use client";

import { useState } from "react";
import { RefreshCw, Info, ChevronRight } from "lucide-react";
import type { Bid, BidCategory } from "@/lib/types";
import { BidCard } from "@/components/bid-card";

/** 섹션 헤더 우측 더보기 링크 (숨겨진 공고가 있을 때만 노출) */
function MoreLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-indigo-700 transition-colors hover:text-indigo-800"
    >
      더보기
      <ChevronRight className="size-4" strokeWidth={2} />
    </a>
  );
}

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
  const recommendedAll = recommendedBids.filter(byFilter);
  const recentAll = recentBids.filter(byFilter);
  const recommended = recommendedAll.slice(0, MAX_CARDS);
  const recent = recentAll.slice(0, MAX_CARDS);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
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
      {recommendedAll.length > MAX_CARDS && (
        <div className="flex justify-end">
          <MoreLink href="#" />
        </div>
      )}

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
      {recentAll.length > MAX_CARDS && (
        <div className="flex justify-end">
          <MoreLink href="#" />
        </div>
      )}
    </div>
  );
}
