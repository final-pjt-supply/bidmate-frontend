import type { Bid } from "@/lib/types";
import { categoryLabel, shortMethod, formatAmount, computeDday } from "@/lib/format";

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
};

export function BidCard({ bid, showMatch = false, className = "" }: BidCardProps) {
  const dday = computeDday(bid.bid_clse_dt);
  const amount = formatAmount(bid);
  const method = shortMethod(bid.sucsfbid_mthd_nm);

  return (
    <div
      className={`flex h-64 flex-col gap-3.5 rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md ${className}`}
    >
      <div className="flex items-center gap-2">
        {showMatch && (
          <span className="rounded-lg bg-indigo-700 px-[11px] py-[5px] text-xs font-bold text-white">
            {bid.match_score == null ? "매칭 —" : `매칭 ${bid.match_score}점`}
          </span>
        )}
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${DDAY_STYLE[dday.kind]}`}>
          {dday.text}
        </span>
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

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm font-bold text-gray-500">{amount || "금액 미정"}</span>
        <button
          type="button"
          className="flex h-8 items-center rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-200"
        >
          상세보기
        </button>
      </div>
    </div>
  );
}
