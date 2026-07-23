"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Bid } from "@/lib/types";
import { categoryLabel, shortMethod, computeDday } from "@/lib/format";
import { logEvent } from "@/lib/analytics/track";

const DDAY_STYLE: Record<string, string> = {
  urgent: "bg-rose-50 text-orange-700",
  normal: "bg-slate-200 text-slate-500",
  always: "bg-orange-100 text-yellow-700",
  closed: "bg-slate-200 text-slate-500",
  unknown: "bg-slate-200 text-slate-500",
};

type BidCardProps = {
  bid: Bid;
  /** 추천 섹션에서만 매칭 배지 표시 (점수는 에이전트가 채우기 전까지 null → "매칭 —") */
  showMatch?: boolean;
  className?: string;
  /** 로그용: 목록 내 전역 순위(1-based) */
  position?: number;
  /** 로그용: 현재 정렬 */
  sort?: string;
  /** 로그용: 어느 목록인지 (reco/latest/search/scraps) */
  list?: string;
};

export function BidCard({ bid, showMatch = false, className = "", position, sort, list }: BidCardProps) {
  const dday = computeDday(bid.bid_clse_dt);
  const method = shortMethod(bid.sucsfbid_mthd_nm);
  const cardRef = useRef<HTMLAnchorElement>(null);

  // 노출(impression): 목록 맥락(list)이 있을 때, 카드가 실제로 보이면 뷰당 1회 기록.
  // "보였는데 클릭 안 함"을 알 수 있어야 CTR·비선호 학습이 가능하다.
  useEffect(() => {
    if (!list) return;
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let fired = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !fired) {
            fired = true;
            logEvent("bid_impression", {
              bid_id: bid.bid_id,
              properties: { position, sort, list },
            });
            io.disconnect();
          }
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [bid.bid_id, position, sort, list]);

  return (
    <Link
      ref={cardRef}
      href={`/bids/${bid.bid_id}`}
      onClick={() =>
        logEvent("bid_card_clicked", {
          bid_id: bid.bid_id,
          properties: { position, sort, list },
        })
      }
      className={`flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:border-indigo-200 hover:shadow-md ${className}`}
    >
      <div className="flex items-center justify-between">
        {/* D-day: 좌측 상단 고정 */}
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${DDAY_STYLE[dday.kind]}`}>
          {dday.text}
        </span>
        {/* 매칭 점수: 우측 상단 */}
        {showMatch && (
          <span className="rounded-md bg-indigo-50 px-[11px] py-[5px] text-xs font-bold text-indigo-700">
            {bid.match_score == null ? "매칭 —" : `매칭 ${bid.match_score}점`}
          </span>
        )}
      </div>

      <h3 className="line-clamp-2 min-h-[46px] text-[15px] font-bold leading-[1.45] text-gray-900">
        {bid.bid_ntce_nm}
      </h3>

      <p className="truncate text-sm text-gray-500">{bid.dminstt_nm}</p>

      <div className="flex gap-1.5">
        <span className="rounded-md bg-indigo-50 px-[9px] py-[3px] text-xs font-bold text-indigo-800">
          {categoryLabel(bid.bid_category)}
        </span>
        {method && (
          <span className="rounded-md bg-slate-100 px-[9px] py-[3px] text-xs font-bold text-slate-600">
            {method}
          </span>
        )}
      </div>
    </Link>
  );
}
