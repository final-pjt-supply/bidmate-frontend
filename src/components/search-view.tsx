import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Bid, BidCategory } from "@/lib/types";
import { BidCard } from "@/components/bid-card";
import { SyncIndicator } from "@/components/sync-indicator";

const CATEGORIES: { label: string; value: BidCategory | "all" }[] = [
  { label: "전체", value: "all" },
  { label: "공사", value: "cnstwk" },
  { label: "용역", value: "servc" },
  { label: "물품", value: "thng" },
  { label: "외자", value: "frgcpt" },
];

/** 페이지네이션에 노출할 페이지 번호 목록(많으면 말줄임). */
function buildPages(total: number, current: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3)
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

/**
 * 공고 검색 — 서버 페이징 목록.
 *
 * 백엔드 GET /bids가 받는 건 category·sort·page뿐이라 지금은 업무구분 필터와 페이징만
 * 서버로 넘긴다. 마감된 공고는 서버가 이미 제외한다.
 * 공고명 검색·지역·추정금액·낙찰방법 필터는 백엔드에 파라미터가 생기면 붙인다
 * (기존 클라이언트 필터 UI는 20건 단위 페이지 안에서만 걸려 잘못된 결과를 주므로 걷어냈다.
 *  마크업이 필요하면 커밋 3f2506a 이전 버전에서 되살릴 것).
 */
export function SearchView({
  items,
  total,
  page,
  pageSize,
  category,
}: {
  items: Bid[];
  total: number;
  page: number;
  pageSize: number;
  category?: BidCategory;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hrefFor = (p: number, cat?: BidCategory | "all") => {
    const c = cat === undefined ? category : cat === "all" ? undefined : cat;
    const qs = new URLSearchParams();
    if (c) qs.set("cat", c);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/search?${s}` : "/search";
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-16 pt-7 sm:px-6 lg:px-10">
      {/* 검색바 — 백엔드에 공고명 검색 파라미터가 없어 아직 비활성 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-slate-50 py-1.5 pl-[18px] pr-1.5">
          <input
            type="text"
            disabled
            placeholder="공고명 또는 발주기관으로 검색해 보세요"
            className="min-w-0 flex-1 cursor-not-allowed bg-transparent text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            disabled
            className="shrink-0 cursor-not-allowed rounded-lg bg-slate-300 px-6 py-2.5 text-[15px] font-bold text-white"
          >
            검색
          </button>
        </div>
        <p className="text-[13px] text-slate-400">
          공고명 검색과 상세 검색(지역·추정금액·낙찰방법)은 준비 중이에요. 지금은 업무구분으로 좁혀볼 수 있어요.
        </p>
      </div>

      {/* 업무구분 필터 (서버 필터) */}
      <div className="flex flex-wrap gap-2.5">
        {CATEGORIES.map(({ label, value }) => {
          const active = value === "all" ? !category : category === value;
          return (
            <Link
              key={value}
              href={hrefFor(1, value)}
              className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* 결과 헤더: 건수 + 동기화 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold text-gray-900">공고 목록</h1>
          <span className="text-sm text-slate-400">총 {total}건 · 마감 임박순</span>
        </div>
        <SyncIndicator />
      </div>

      {/* 카드 그리드 / 빈 상태 */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((bid, i) => (
            <BidCard
              key={bid.bid_id}
              bid={bid}
              position={(page - 1) * pageSize + i + 1}
              sort="deadline"
              list="search"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white py-20 text-center">
          <p className="text-[15px] font-bold text-gray-900">표시할 공고가 없어요</p>
          <p className="text-sm text-slate-500">다른 업무구분으로 다시 찾아보세요.</p>
        </div>
      )}

      {/* 페이지네이션 (서버 페이징 — 링크 이동) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-3">
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              aria-label="이전 페이지"
              className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
            >
              <ChevronLeft className="size-4" strokeWidth={2} />
            </Link>
          ) : (
            <span className="flex size-9 items-center justify-center rounded-lg text-slate-500 opacity-40">
              <ChevronLeft className="size-4" strokeWidth={2} />
            </span>
          )}

          {buildPages(totalPages, page).map((p, i) =>
            p === "ellipsis" ? (
              <span key={`e${i}`} className="px-1 text-xs text-slate-400">
                …
              </span>
            ) : (
              <Link
                key={p}
                href={hrefFor(p)}
                aria-current={p === page ? "page" : undefined}
                className={`flex size-9 items-center justify-center rounded-lg text-sm transition-colors ${
                  p === page
                    ? "bg-indigo-700 font-bold text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {p}
              </Link>
            )
          )}

          {page < totalPages ? (
            <Link
              href={hrefFor(page + 1)}
              aria-label="다음 페이지"
              className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
            >
              <ChevronRight className="size-4" strokeWidth={2} />
            </Link>
          ) : (
            <span className="flex size-9 items-center justify-center rounded-lg text-slate-500 opacity-40">
              <ChevronRight className="size-4" strokeWidth={2} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
