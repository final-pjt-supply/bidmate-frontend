"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Bid, BidCategory } from "@/lib/types";
import { BidCard } from "@/components/bid-card";
import { SyncIndicator } from "@/components/sync-indicator";

type SortKey = "deadline" | "recent";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "deadline", label: "마감 임박순" },
  { key: "recent", label: "최신 등록순" },
];

const CATEGORY_FILTERS: { label: string; value: BidCategory | "all" }[] = [
  { label: "전체", value: "all" },
  { label: "공사", value: "cnstwk" },
  { label: "용역", value: "servc" },
  { label: "물품", value: "thng" },
  { label: "외자", value: "frgcpt" },
];

const PAGE_SIZE = 6;

// 마감 임박순 정렬키: 마감이 임박한 활성 공고 우선 → 마감된 공고 → 마감 미정 순.
// (활성 공고끼리는 마감일이 빠른 순)
const deadlineSortKey = (b: Bid, nowMs: number) => {
  if (!b.bid_clse_dt) return Number.MAX_SAFE_INTEGER; // 마감 미정: 맨 뒤
  const t = new Date(b.bid_clse_dt).getTime();
  if (t < nowMs) return Number.MAX_SAFE_INTEGER - 1; // 이미 마감: 활성 뒤·미정 앞
  return t; // 활성: 빠른 마감 우선
};

/** 페이지네이션에 노출할 페이지 번호 목록(많으면 말줄임). */
function buildPages(total: number, current: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3)
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

export function SearchView({ bids }: { bids: Bid[] }) {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("deadline");
  const [category, setCategory] = useState<BidCategory | "all">("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [page, setPage] = useState(1);
  // 마감 임박순 기준 시각: 마운트 시점으로 한 번만 고정(렌더 중 재계산 방지).
  const [nowMs] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = bids.filter((b) => {
      const matchesQuery =
        !q ||
        b.bid_ntce_nm.toLowerCase().includes(q) ||
        b.dminstt_nm.toLowerCase().includes(q);
      const matchesCategory = category === "all" || b.bid_category === category;
      return matchesQuery && matchesCategory;
    });
    return [...list].sort((a, b) => {
      if (sort === "deadline") return deadlineSortKey(a, nowMs) - deadlineSortKey(b, nowMs);
      return new Date(b.bid_ntce_dt).getTime() - new Date(a.bid_ntce_dt).getTime();
    });
  }, [bids, query, category, sort, nowMs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(queryInput);
    setPage(1);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-16 pt-7 sm:px-6 lg:px-10">
      {/* 검색바 */}
      <form
        onSubmit={submitSearch}
        className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white py-1.5 pl-[18px] pr-1.5"
      >
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="공고명 또는 발주기관으로 검색해 보세요"
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-indigo-700 px-6 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-indigo-800"
        >
          검색
        </button>
      </form>

      {/* 상세 검색 토글 */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          className="flex h-8 w-fit items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
        >
          상세 검색
          <ChevronDown
            className={`size-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </button>

        {advancedOpen && (
          <div className="flex flex-wrap gap-2.5 rounded-xl border border-slate-200 bg-white p-4">
            {CATEGORY_FILTERS.map(({ label, value }) => {
              const active = category === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setCategory(value);
                    setPage(1);
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
        )}
      </div>

      {/* 결과 헤더: 건수 + 동기화 + 정렬 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold text-gray-900">검색 결과</h1>
          <span className="text-sm text-slate-400">총 {filtered.length}건</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SyncIndicator />
          <div className="flex items-center gap-2">
            {SORTS.map(({ key, label }) => {
              const active = sort === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSort(key);
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "border border-slate-200 bg-white font-medium text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 카드 그리드 / 빈 상태 */}
      {pageItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((bid) => (
            <BidCard key={bid.bid_id} bid={bid} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white py-20 text-center">
          <p className="text-[15px] font-bold text-gray-900">검색 결과가 없어요</p>
          <p className="text-sm text-slate-500">다른 검색어나 조건으로 다시 찾아보세요.</p>
        </div>
      )}

      {/* 페이지네이션 */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-1.5 pt-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="이전 페이지"
            className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
          </button>

          {buildPages(totalPages, currentPage).map((p, i) =>
            p === "ellipsis" ? (
              <span key={`e${i}`} className="px-1 text-xs text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === currentPage ? "page" : undefined}
                className={`flex size-9 items-center justify-center rounded-lg text-sm transition-colors ${
                  p === currentPage
                    ? "font-bold text-indigo-700"
                    : "font-medium text-slate-500 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="다음 페이지"
            className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="size-4" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
