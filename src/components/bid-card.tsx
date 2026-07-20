"use client";

import { useState } from "react";
import type { Bid } from "@/lib/types";
import { categoryLabel, shortMethod, formatAmount, computeDday } from "@/lib/format";

const DDAY_STYLE: Record<string, string> = {
  urgent: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  normal: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  always: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
  closed: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  unknown: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export function BidCard({ bid, className = "" }: { bid: Bid; className?: string }) {
  const [scrapped, setScrapped] = useState(false);
  const dday = computeDday(bid.bid_clse_dt);
  const amount = formatAmount(bid);

  return (
    <div
      className={`flex h-full flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DDAY_STYLE[dday.kind]}`}
        >
          {dday.text}
        </span>
        <button
          type="button"
          onClick={() => setScrapped((v) => !v)}
          aria-pressed={scrapped}
          aria-label={scrapped ? "스크랩 해제" : "스크랩"}
          className={`text-lg leading-none transition-colors ${
            scrapped
              ? "text-amber-400"
              : "text-zinc-300 hover:text-zinc-400 dark:text-zinc-600 dark:hover:text-zinc-500"
          }`}
        >
          {scrapped ? "★" : "☆"}
        </button>
      </div>

      <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
        {bid.bid_ntce_nm}
      </h3>

      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{bid.dminstt_nm}</p>

      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {categoryLabel(bid.bid_category)}
        </span>
        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {shortMethod(bid.sucsfbid_mthd_nm)}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between pt-1 text-xs">
        <span className="font-medium text-zinc-600 dark:text-zinc-300">
          {amount || "금액 미정"}
        </span>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          {bid.match_score == null ? "매칭 —" : `매칭 ${bid.match_score}`}
        </span>
      </div>
    </div>
  );
}
