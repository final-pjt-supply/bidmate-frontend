"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Info, ChevronRight, Lock } from "lucide-react";
import type { Bid, BidCategory } from "@/lib/types";
import { BidCard } from "@/components/bid-card";

/** 목록 동기화 안내 툴팁 (info 아이콘 hover/focus 시 노출) */
function SyncTooltip() {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="데이터 수집·표시 안내"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`flex cursor-pointer items-center rounded-full p-1 transition-colors ${
          open ? "bg-slate-200 text-indigo-600" : "text-gray-400 hover:bg-slate-100 hover:text-indigo-600"
        }`}
      >
        <Info className="size-[13px]" strokeWidth={2} />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute right-0 top-full z-10 mt-2 w-[340px] rounded-md bg-slate-400 px-[13px] py-[7px] text-[12px] font-medium leading-[1.4] text-white shadow-[0px_4px_10px_rgba(30,41,59,0.25)] transition-all duration-150 ${
          open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
        }`}
      >
        <span
          aria-hidden
          className="absolute -top-1 right-1.5 size-2 rotate-45 rounded-[1px] bg-slate-400"
        />
        나라장터 공고를 5분마다 수집하고, 첨부문서의 자격요건은 AI 분석을 거쳐 제공돼요. 게시 후 표시까지 시간이 걸릴 수 있어요.
      </span>
    </span>
  );
}

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

/** 비회원 추천 잠금 오버레이 (Figma 150:103) */
function LoginGate() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 rounded-xl bg-slate-50/70 px-4 text-center backdrop-blur-[1px]">
      <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
        <Lock className="size-[22px] text-indigo-600" strokeWidth={2} />
      </span>
      <p className="text-lg font-bold text-gray-900">우리 회사 맞춤 추천이 준비돼 있어요</p>
      <p className="text-sm text-gray-500">무료로 가입하면 매칭 점수순으로 추천 공고를 볼 수 있어요.</p>
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
            {gated ? "로그인하면 매칭 점수순으로 볼 수 있어요." : "매칭 점수가 높은 순으로 보여드려요."}
          </p>
        </div>
        {!gated && (
          <div className="flex items-center gap-[5px] text-gray-500">
            <RefreshCw className="size-3.5" strokeWidth={2} />
            <span className="text-[11.5px]">목록 동기화 3분 전</span>
            <SyncTooltip />
          </div>
        )}
      </div>

      {gated ? (
        <div className="relative">
          <div className="pointer-events-none grid select-none grid-cols-1 gap-5 blur-[6px] md:grid-cols-2 xl:grid-cols-3">
            {recommended.map((bid) => (
              <BidCard key={bid.bid_id} bid={bid} showMatch />
            ))}
          </div>
          <LoginGate />
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );

  // 최신 공고 섹션 (회원·비회원 모두 공개)
  const latestSection = (
    <div className="flex flex-col gap-6" key="latest">
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
              onClick={() => setFilter(value)}
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
