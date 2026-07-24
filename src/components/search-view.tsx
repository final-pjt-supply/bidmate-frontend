import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Bid, BidCategory } from "@/lib/types";
import { BidCard } from "@/components/bid-card";
import { AdvancedSearchPanel } from "@/components/advanced-search-panel";
import { SearchForm } from "@/components/search-form";
import { SyncIndicator } from "@/components/sync-indicator";
import { buildSearchHref, type SearchConditions, type SearchSort } from "@/lib/search-params";

type SortKey = SearchSort;

const SORTS: { key: SortKey; label: string }[] = [
  { key: "deadline", label: "마감 임박순" },
  { key: "recent", label: "최신 등록순" },
];

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
 * 공고 검색 — 서버 검색·페이징 목록.
 *
 * 검색어·업무구분·정렬·마감 포함 여부·페이징을 모두 URL 파라미터로 두고
 * 서버(GET /bids/search)가 처리한다. 클라이언트에서 필터링하면 한 페이지 안에서만
 * 걸려 잘못된 결과가 된다.
 *
 * 상세 검색 패널에는 **서버가 지원하는 조건만** 넣는다. 지역·추정금액·낙찰방법·
 * 중소기업은 백엔드에 파라미터가 생길 때 하나씩 추가한다.
 */
export function SearchView({
  items,
  total,
  pageSize,
  conditions,
}: {
  items: Bid[];
  total: number;
  pageSize: number;
  conditions: SearchConditions;
}) {
  const { category, sort, query, page } = conditions;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  /** 조건 일부만 바꾼 링크. 변환 규칙은 buildSearchHref 한 곳에만 있다(#66). */
  const hrefFor = (changes: Partial<SearchConditions>) =>
    buildSearchHref(conditions, changes);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-16 pt-7 sm:px-6 lg:px-10">
      {/* 검색바 */}
      <SearchForm conditions={conditions} />

      <AdvancedSearchPanel conditions={conditions} />

      {/* 업무구분 필터 (서버 필터) */}
      <div className="flex flex-wrap gap-2.5">
        {CATEGORIES.map(({ label, value }) => {
          const active = value === "all" ? !category : category === value;
          return (
            <Link
              key={value}
              href={hrefFor({ category: value === "all" ? undefined : value })}
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

      {/* 결과 헤더: 건수 + 동기화 + 정렬 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold text-gray-900">{query ? "검색 결과" : "공고 목록"}</h1>
          <span className="text-sm text-slate-400">총 {total}건</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SyncIndicator />
          <div className="flex items-center gap-2">
            {SORTS.map(({ key, label }) => {
              const active = sort === key;
              return (
                <Link
                  key={key}
                  href={hrefFor({ sort: key })}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "border border-slate-200 bg-white font-medium text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* 카드 그리드 / 빈 상태 */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((bid, i) => (
            <BidCard
              key={bid.bid_id}
              bid={bid}
              position={(page - 1) * pageSize + i + 1}
              sort={sort}
              list="search"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white py-20 text-center">
          <p className="text-[15px] font-bold text-gray-900">
            {query ? "검색 결과가 없어요" : "표시할 공고가 없어요"}
          </p>
          <p className="text-sm text-slate-500">
            {query ? "다른 검색어나 업무구분으로 다시 찾아보세요." : "다른 업무구분으로 다시 찾아보세요."}
          </p>
        </div>
      )}

      {/* 페이지네이션 (서버 페이징 — 링크 이동) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-3">
          {page > 1 ? (
            <Link
              href={hrefFor({ page: page - 1 })}
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
                href={hrefFor({ page: p })}
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
              href={hrefFor({ page: page + 1 })}
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
