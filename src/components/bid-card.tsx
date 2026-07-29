"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import type { Bid } from "@/lib/types";
import { categoryLabel, shortMethod, computeDday, formatAmount } from "@/lib/format";
import { logEvent } from "@/lib/analytics/track";
import { useAuth } from "@/lib/auth";
import { isScrapped, subscribeScraps, toggleScrap } from "@/lib/scraps";

// D-day 색은 긴급도 한 방향으로만 읽힌다: 경고(따뜻한) 계열은 마감 임박(urgent)에만 쓰고
// 그때가 가장 강하다. 나머지는 중립 채움 한 단계(slate-200)로 통일하고 텍스트 톤으로만
// 구분한다 — 회색 3단계는 흰 카드·연회색 스트립 위에서 구별되지 않고, 문구("상시"/"마감"/
// "마감 미정")가 이미 상태를 말해준다.
const DDAY_STYLE: Record<string, string> = {
  urgent: "bg-rose-100 text-rose-700",
  normal: "bg-slate-200 text-slate-700",
  always: "bg-slate-200 text-slate-600",
  closed: "bg-slate-200 text-slate-600",
  unknown: "bg-slate-200 text-slate-600",
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
  /**
   * 업무구분·낙찰방법 태그 옆에 붙일 배지. AI 추천에서 자격 판정을 여기 놓는다 —
   * 카드 밖에 두면 공고 정보와 분리돼 보여 무엇에 대한 판정인지 흐려진다.
   */
  tagSlot?: React.ReactNode;
  /** 카드 우하단 배지. AI 추천 점수처럼 목록 성격에 따라 붙는 값. */
  cornerSlot?: React.ReactNode;
};

export function BidCard({
  bid,
  className = "",
  position,
  sort,
  list,
  tagSlot,
  cornerSlot,
}: BidCardProps) {
  const dday = computeDday(bid.bid_clse_dt);
  const method = shortMethod(bid.sucsfbid_mthd_nm);
  // 금액은 참여 여부를 가르는 1차 필터다. 예산·추정가격이 모두 없으면 빈 문자열이라
  // 아무것도 그리지 않는다(formatAmount의 기존 규약).
  const amount = formatAmount(bid);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const { user } = useAuth();

  // 스크랩 상태는 로그인 사용자의 서버 저장분이다(메모리 캐시로 공유). 서버 렌더
  // 시점엔 알 수 없어 스냅샷을 false로 두고, 마운트 후 캐시 값으로 맞춘다.
  const scrapped = useSyncExternalStore(
    subscribeScraps,
    useCallback(() => isScrapped(bid.bid_id), [bid.bid_id]),
    () => false
  );

  const onToggleScrap = (e: React.MouseEvent) => {
    // 카드 전체가 링크라, 버튼 클릭이 상세 페이지 이동으로 번지지 않게 막는다.
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const next = toggleScrap(bid.bid_id);   // 낙관적 — 즉시 반영, 실패 시 자동 되돌림
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

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md bg-indigo-50 px-[9px] py-[3px] text-xs font-bold text-indigo-800">
          {categoryLabel(bid.bid_category)}
        </span>
        {method && (
          <span className="rounded-md bg-slate-100 px-[9px] py-[3px] text-xs font-bold text-slate-600">
            {method}
          </span>
        )}
        {tagSlot}
        {/* 태그 줄 오른쪽 끝은 한 자리다 — 카드 높이를 늘리지 않는다. 목록이 배지를
            내려주면(AI 추천 점수) 그쪽이 우선이고, 없으면 금액을 텍스트로 놓는다. */}
        {cornerSlot ? (
          <span className="ml-auto">{cornerSlot}</span>
        ) : (
          amount && (
            <span className="ml-auto shrink-0 text-xs font-bold whitespace-nowrap text-slate-700">
              {amount}
            </span>
          )
        )}
      </div>
    </Link>
  );
}
