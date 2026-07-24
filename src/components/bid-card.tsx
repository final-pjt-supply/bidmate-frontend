"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import type { Bid } from "@/lib/types";
import { categoryLabel, shortMethod, computeDday } from "@/lib/format";
import { logEvent } from "@/lib/analytics/track";
import { useAuth } from "@/lib/auth";
import { isScrapped, subscribeScraps, toggleScrap } from "@/lib/scraps";

const DDAY_STYLE: Record<string, string> = {
  urgent: "bg-rose-50 text-orange-700",
  normal: "bg-slate-200 text-slate-500",
  always: "bg-orange-100 text-yellow-700",
  closed: "bg-slate-200 text-slate-500",
  unknown: "bg-slate-200 text-slate-500",
};

type BidCardProps = {
  bid: Bid;
  className?: string;
  /** 로그용: 목록 내 전역 순위(1-based) */
  position?: number;
  /** 로그용: 현재 정렬 */
  sort?: string;
  /** 로그용: 어느 목록인지 (reco/latest/search/scraps) */
  list?: string;
};

export function BidCard({ bid, className = "", position, sort, list }: BidCardProps) {
  const dday = computeDday(bid.bid_clse_dt);
  const method = shortMethod(bid.sucsfbid_mthd_nm);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const { user } = useAuth();

  // 스크랩 상태는 브라우저 저장소에 있어 서버 렌더 시점에 알 수 없다. 서버 스냅샷을
  // false로 두어 첫 렌더는 빈 아이콘으로 그리고, 마운트 후 실제 값으로 맞춘다.
  // TODO(스크랩 서버 저장): API가 붙으면 이 자리만 서버 상태로 교체한다. UI는 그대로.
  const email = user?.email;
  const scrapped = useSyncExternalStore(
    subscribeScraps,
    useCallback(() => (email ? isScrapped(email, bid.bid_id) : false), [email, bid.bid_id]),
    () => false
  );

  const onToggleScrap = (e: React.MouseEvent) => {
    // 카드 전체가 링크라, 버튼 클릭이 상세 페이지 이동으로 번지지 않게 막는다.
    e.preventDefault();
    e.stopPropagation();
    if (!email) return;
    const next = toggleScrap(email, bid.bid_id);
    logEvent("bid_bookmarked", { bid_id: bid.bid_id, properties: { on: next, list } });
  };

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
        {/* 스크랩: 우측 상단. 비회원에겐 노출하지 않는다(담을 곳이 없다). */}
        {user && (
          <button
            type="button"
            onClick={onToggleScrap}
            aria-label={scrapped ? "스크랩 해제" : "스크랩"}
            aria-pressed={scrapped}
            className={`-m-1 rounded-md p-1 transition-colors ${
              scrapped ? "text-indigo-600" : "text-slate-300 hover:text-indigo-600"
            }`}
          >
            <Bookmark className={`size-[18px] ${scrapped ? "fill-current" : ""}`} strokeWidth={2} />
          </button>
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
