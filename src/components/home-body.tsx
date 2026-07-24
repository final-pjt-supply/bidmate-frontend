"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import type { Bid, BidCategory } from "@/lib/types";
import { BidCard } from "@/components/bid-card";
import { SyncIndicator } from "@/components/sync-indicator";
import { logEvent } from "@/lib/analytics/track";

/** 섹션 헤더 우측 더보기 링크 (숨겨진 공고가 있을 때만 노출) */
function MoreLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-indigo-700 transition-colors hover:text-indigo-800"
    >
      더보기
      <ChevronRight className="size-4" strokeWidth={2} />
    </Link>
  );
}

/** 비회원 추천 잠금 오버레이 (Figma 150:103) */
function LoginGate() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 rounded-xl bg-slate-50/70 px-4 text-center backdrop-blur-[1px]">
      <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
        <Lock className="size-[22px] text-indigo-600" strokeWidth={2} />
      </span>
      <p className="text-lg font-bold text-gray-900">우리 회사 맞춤 추천이 준비돼 있어요</p>
      <p className="text-sm text-gray-500">무료로 가입하면 회사 조건에 맞는 추천 공고를 볼 수 있어요.</p>
      <Link
        href="/signup"
        className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
      >
        무료로 시작하기
      </Link>
    </div>
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
  /** 비회원: 추천 섹션을 블러 + 로그인 유도 오버레이로 잠금 */
  gated?: boolean;
};

export function HomeBody({ recommendedBids, recentBids, gated = false }: HomeBodyProps) {
  const [filter, setFilter] = useState<BidCategory | "all">("all");

  const MAX_CARDS = 6;
  const byFilter = (bid: Bid) => filter === "all" || bid.bid_category === filter;
  const recommendedAll = recommendedBids.filter(byFilter);
  const recentAll = recentBids.filter(byFilter);
  const recommended = recommendedAll.slice(0, MAX_CARDS);
  const recent = recentAll.slice(0, MAX_CARDS);

  // 내 조건 맞춤 추천 섹션 (비회원은 블러 + 로그인 유도)
  const recommendedSection = (
    <div className="flex flex-col gap-6" key="recommended">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-gray-900">내 조건 맞춤 추천</h2>
          <p className="text-sm text-slate-500">
            {gated ? "로그인하면 회사 조건에 맞는 공고를 볼 수 있어요." : "회사 조건에 맞는 공고를 모아드려요."}
          </p>
        </div>
        {!gated && <SyncIndicator />}
      </div>

      {gated ? (
        <div className="relative">
          <div className="pointer-events-none grid select-none grid-cols-1 gap-5 blur-[6px] md:grid-cols-2 xl:grid-cols-3">
            {recommended.map((bid) => (
              <BidCard key={bid.bid_id} bid={bid} />
            ))}
          </div>
          <LoginGate />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {recommended.map((bid, i) => (
              <BidCard key={bid.bid_id} bid={bid} position={i + 1} list="reco" />
            ))}
          </div>
          {recommendedAll.length > MAX_CARDS && (
            <div className="flex justify-end">
              <MoreLink href="/recommend" />
            </div>
          )}
        </>
      )}
    </div>
  );

  // 최신 공고 섹션 (회원·비회원 모두 공개)
  const latestSection = (
    <div className="flex flex-col gap-6" key="latest">
      {/* 새로고침은 여기에도 둔다 — 추천 섹션 헤더에만 있으면 그 섹션이 잠긴 비회원은
          홈에서 갱신할 방법이 없다. 비회원이 실제로 보는 목록이 이 섹션이다. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-bold text-gray-900">최신 공고</h2>
          <p className="text-[13px] text-slate-400">최근 자동 수집된 공고예요.</p>
        </div>
        {gated && <SyncIndicator />}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {recent.map((bid, i) => (
          <BidCard key={bid.bid_id} bid={bid} position={i + 1} sort="recent" list="latest" />
        ))}
      </div>
      {recentAll.length > MAX_CARDS && (
        <div className="flex justify-end">
          <MoreLink href="/search" />
        </div>
      )}
    </div>
  );

  // 비회원은 최신 공고를 위로, 추천을 아래로
  const sections = gated ? [latestSection, recommendedSection] : [recommendedSection, latestSection];

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
              onClick={() => {
                setFilter(value);
                logEvent("bid_list_filtered", { page: "home", properties: { category: value } });
              }}
              className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {sections}
    </div>
  );
}
