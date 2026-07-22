"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Bid, BidCategory } from "@/lib/types";
import { BidCard } from "@/components/bid-card";
import { SyncIndicator } from "@/components/sync-indicator";
import { computeDday, shortMethod } from "@/lib/format";

type SortKey = "deadline" | "recent";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "deadline", label: "마감 임박순" },
  { key: "recent", label: "최신 등록순" },
];

const CATEGORIES: { label: string; value: BidCategory }[] = [
  { label: "공사", value: "cnstwk" },
  { label: "용역", value: "servc" },
  { label: "물품", value: "thng" },
  { label: "외자", value: "frgcpt" },
];

// 낙찰방법 필터: 낙찰방법(sucsfbid_mthd_nm)·계약체결방법(cntrct_cncls_mthd_nm) 조합으로 판정
const METHODS: { key: string; label: string; match: (b: Bid) => boolean }[] = [
  { key: "negotiated", label: "협상에 의한 계약", match: (b) => shortMethod(b.sucsfbid_mthd_nm).includes("협상") },
  { key: "eligibility", label: "적격심사제", match: (b) => shortMethod(b.sucsfbid_mthd_nm).includes("적격") },
  {
    key: "private",
    label: "수의계약",
    match: (b) => b.cntrct_cncls_mthd_nm === "수의계약" || shortMethod(b.sucsfbid_mthd_nm).includes("수의"),
  },
  { key: "open", label: "일반경쟁", match: (b) => b.cntrct_cncls_mthd_nm === "일반경쟁" },
];

const REGIONS = [
  "전체",
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

// "부산광역시" → "부산" 처럼 접미사를 떼어 기관명과 느슨하게 매칭
const regionCore = (region: string) =>
  region.replace(/(특별자치도|특별자치시|특별시|광역시|도)$/, "");

const PAGE_SIZE = 6;

type Filters = {
  cats: BidCategory[];
  region: string;
  methods: string[];
  min: string;
  max: string;
  sme: boolean;
  includeClosed: boolean;
};

const EMPTY_FILTERS: Filters = {
  cats: [],
  region: "전체",
  methods: [],
  min: "",
  max: "",
  sme: false,
  includeClosed: false,
};

// 마감 임박순 정렬키: 마감이 임박한 활성 공고 우선 → 마감된 공고 → 마감 미정 순.
const deadlineSortKey = (b: Bid, nowMs: number) => {
  if (!b.bid_clse_dt) return Number.MAX_SAFE_INTEGER; // 마감 미정: 맨 뒤
  const t = new Date(b.bid_clse_dt).getTime();
  if (t < nowMs) return Number.MAX_SAFE_INTEGER - 1; // 이미 마감: 활성 뒤·미정 앞
  return t; // 활성: 빠른 마감 우선
};

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

/** 페이지네이션에 노출할 페이지 번호 목록(많으면 말줄임). */
function buildPages(total: number, current: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3)
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

/** 체크박스 한 줄 */
function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className="flex items-center gap-2 text-left"
    >
      <span
        className={`flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
          checked ? "border-indigo-700 bg-indigo-700" : "border-slate-200 bg-white"
        }`}
      >
        {checked && <Check className="size-3 text-white" strokeWidth={3} />}
      </span>
      <span className="text-sm text-slate-600">{label}</span>
    </button>
  );
}

/** 필터 그룹 (제목 + 컨트롤) */
function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-bold text-gray-900">{title}</p>
      {children}
    </div>
  );
}

export function SearchView({
  bids,
  initialQuery = "",
  initialCategory,
}: {
  bids: Bid[];
  initialQuery?: string;
  initialCategory?: BidCategory;
}) {
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>("deadline");
  // 업종을 지정해 진입하면 상세 검색 패널을 펼친 상태로 시작
  const [advancedOpen, setAdvancedOpen] = useState(!!initialCategory);
  const [page, setPage] = useState(1);
  // 마감 임박순/마감 판정 기준 시각: 마운트 시점으로 한 번만 고정.
  const [nowMs] = useState(() => Date.now());

  // 패널 입력값(draft) — "조건 적용" 클릭 시에만 실제 필터(filters)에 반영.
  // 업종 지정 진입 시 해당 업종을 선택·적용한 상태로 시작.
  const initialFilters: Filters = {
    ...EMPTY_FILTERS,
    cats: initialCategory ? [initialCategory] : [],
  };
  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = filters.min ? Number(filters.min) : null;
    const max = filters.max ? Number(filters.max) : null;
    const core = filters.region === "전체" ? null : regionCore(filters.region);

    const list = bids.filter((b) => {
      if (q && !(b.bid_ntce_nm.toLowerCase().includes(q) || b.dminstt_nm.toLowerCase().includes(q)))
        return false;
      if (filters.cats.length && !filters.cats.includes(b.bid_category)) return false;
      if (filters.methods.length && !METHODS.some((m) => filters.methods.includes(m.key) && m.match(b)))
        return false;
      if (core && !`${b.dminstt_nm} ${b.ntce_instt_nm ?? ""}`.includes(core)) return false;
      const amtEok = (b.bdgt_amt ?? b.presmpt_prce ?? 0) / 100_000_000;
      if (min != null && amtEok < min) return false;
      if (max != null && amtEok > max) return false;
      if (filters.sme && b.qualification?.company_size_limit !== "sme_only") return false;
      if (!filters.includeClosed && computeDday(b.bid_clse_dt, new Date(nowMs)).kind === "closed")
        return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sort === "deadline") return deadlineSortKey(a, nowMs) - deadlineSortKey(b, nowMs);
      return new Date(b.bid_ntce_dt).getTime() - new Date(a.bid_ntce_dt).getTime();
    });
  }, [bids, query, filters, sort, nowMs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(queryInput);
    setPage(1);
  };

  const applyFilters = () => {
    setFilters(draft);
    setPage(1);
  };

  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const patch = (p: Partial<Filters>) => setDraft((d) => ({ ...d, ...p }));

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
          <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white px-6 py-5">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* 업무구분 */}
              <FilterGroup title="업무구분">
                <CheckRow
                  checked={draft.cats.length === 0}
                  onChange={() => patch({ cats: [] })}
                  label="전체"
                />
                {CATEGORIES.map((c) => (
                  <CheckRow
                    key={c.value}
                    checked={draft.cats.includes(c.value)}
                    onChange={() => patch({ cats: toggle(draft.cats, c.value) })}
                    label={c.label}
                  />
                ))}
              </FilterGroup>

              {/* 지역 */}
              <FilterGroup title="지역">
                <div className="relative">
                  <select
                    value={draft.region}
                    onChange={(e) => patch({ region: e.target.value })}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3.5 py-3 pr-9 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none"
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 size-[18px] -translate-y-1/2 text-slate-400"
                    strokeWidth={2}
                  />
                </div>
              </FilterGroup>

              {/* 낙찰방법 */}
              <FilterGroup title="낙찰방법">
                {METHODS.map((m) => (
                  <CheckRow
                    key={m.key}
                    checked={draft.methods.includes(m.key)}
                    onChange={() => patch({ methods: toggle(draft.methods, m.key) })}
                    label={m.label}
                  />
                ))}
              </FilterGroup>

              {/* 추정금액 (억원) */}
              <FilterGroup title="추정금액 (억원)">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={draft.min}
                    onChange={(e) => patch({ min: e.target.value })}
                    placeholder="최소"
                    className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                  />
                  <span className="text-[13px] text-slate-400">~</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={draft.max}
                    onChange={(e) => patch({ max: e.target.value })}
                    placeholder="최대"
                    className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </FilterGroup>

              {/* 기업규모 */}
              <FilterGroup title="기업규모">
                <CheckRow
                  checked={draft.sme}
                  onChange={() => patch({ sme: !draft.sme })}
                  label="중소기업 참여가능만"
                />
              </FilterGroup>

              {/* 마감 여부 */}
              <FilterGroup title="마감 여부">
                <CheckRow
                  checked={draft.includeClosed}
                  onChange={() => patch({ includeClosed: !draft.includeClosed })}
                  label="마감된 공고 포함"
                />
              </FilterGroup>
            </div>

            {/* 적용 / 초기화 */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-800"
              >
                조건 적용
              </button>
            </div>
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
