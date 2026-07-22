"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Bid } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { hasCompanyProfile } from "@/lib/company";
import { BidCard } from "@/components/bid-card";
import { SyncIndicator } from "@/components/sync-indicator";
import { LoginModal } from "@/components/login-modal";

type SortKey = "match" | "deadline" | "recent";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "match", label: "매칭 점수순" },
  { key: "deadline", label: "마감 임박순" },
  { key: "recent", label: "최신 등록순" },
];

const PAGE_SIZE = 6;

const deadlineValue = (b: Bid) =>
  b.bid_clse_dt ? new Date(b.bid_clse_dt).getTime() : Number.POSITIVE_INFINITY;

export function RecoView({ bids }: { bids: Bid[] }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const isMember = ready && !!user;

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("match");
  const [page, setPage] = useState(1);

  // 회원의 회사 정보 입력 여부 (SSR·비회원 시 isMember=false로 localStorage 미접근)
  const companyMissing = useMemo(
    () => isMember && !!user && !hasCompanyProfile(user.email),
    [isMember, user]
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = bids.filter(
      (b) => !q || b.bid_ntce_nm.toLowerCase().includes(q) || b.dminstt_nm.toLowerCase().includes(q)
    );
    return [...filtered].sort((a, b) => {
      if (sort === "match") return (b.match_score ?? -1) - (a.match_score ?? -1);
      if (sort === "deadline") return deadlineValue(a) - deadlineValue(b);
      return new Date(b.bid_ntce_dt).getTime() - new Date(a.bid_ntce_dt).getTime();
    });
  }, [bids, query, sort]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 비회원(또는 로딩 중)은 상위 공고 미리보기를 블러 처리해 배경으로만 노출
  const displayItems = isMember ? pageItems : bids.slice(0, PAGE_SIZE);
  const displayCount = isMember ? list.length : bids.length;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(queryInput);
    setPage(1);
  };

  // 회원이지만 회사 정보가 없으면 매칭 대신 회사 정보 입력을 먼저 안내
  if (isMember && companyMissing) {
    return (
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
          <h1 className="text-2xl font-bold text-gray-900">맞춤 추천</h1>
          <div className="flex flex-col items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-16 text-center">
            <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
              <Building2 className="size-[22px] text-indigo-600" strokeWidth={2} />
            </span>
            <p className="text-lg font-bold text-gray-900">먼저 회사 정보를 입력해 주세요</p>
            <p className="max-w-md text-sm text-gray-500">
              등록하신 회사 정보로 공고 적합도를 계산해 맞춤 공고를 추천해드려요. 회사 정보를 입력하면
              매칭 결과를 볼 수 있어요.
            </p>
            <Link
              href="/mypage?edit=1"
              className="mt-1 rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
            >
              회사 정보 입력하기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex-1">
      <div
        className={`mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-16 pt-8 sm:px-6 lg:px-10 ${
          isMember ? "" : "pointer-events-none select-none blur-[2px]"
        }`}
        aria-hidden={!isMember}
      >
        <h1 className="text-2xl font-bold text-gray-900">맞춤 추천</h1>

        {/* 검색바 */}
        <form
          onSubmit={submitSearch}
          className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white py-1.5 pl-[18px] pr-1.5"
        >
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="맞춤 공고에서 검색"
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-indigo-700 px-6 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-indigo-800"
          >
            검색
          </button>
        </form>

        {/* 헤더: 매칭 공고 N건 + 동기화 + 정렬 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] font-bold text-gray-900">매칭 공고 {displayCount}건</p>
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

        {/* 카드 그리드 (매칭 배지 표시) */}
        {displayItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {displayItems.map((bid) => (
              <BidCard key={bid.bid_id} bid={bid} showMatch />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white py-20 text-center">
            <p className="text-[15px] font-bold text-gray-900">조건에 맞는 공고가 없어요</p>
            <p className="text-sm text-slate-500">다른 검색어로 다시 찾아보세요.</p>
          </div>
        )}

        {/* 페이지네이션 (회원 전용) */}
        {isMember && list.length > PAGE_SIZE && (
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
            ))}
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

      {/* 비회원 로그인 게이트: 스크림 + 로그인 모달 */}
      {!isMember && (
        <>
          <div className="absolute inset-0 bg-black/50" aria-hidden />
          <div className="absolute inset-0 flex items-start justify-center px-4 pt-20">
            <LoginModal onClose={() => router.push("/")} />
          </div>
        </>
      )}
    </main>
  );
}
