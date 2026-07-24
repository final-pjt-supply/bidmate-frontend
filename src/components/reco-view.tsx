"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import type { Bid } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { hasCompanyProfile } from "@/lib/company";
import { BidCard } from "@/components/bid-card";
import { SyncIndicator } from "@/components/sync-indicator";

/** 페이지네이션에 노출할 페이지 번호(많으면 말줄임) */
function buildPages(total: number, current: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3)
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-bold text-gray-900">맞춤 추천</h1>
        {children}
      </div>
    </main>
  );
}

export function RecoView({
  items,
  total,
  page,
  pageSize,
}: {
  items: Bid[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const { user, ready } = useAuth();
  const isMember = ready && !!user;

  // 회원의 회사 정보 입력 여부 (SSR·비회원 시 isMember=false로 localStorage 미접근)
  const companyMissing = useMemo(
    () => isMember && !!user && !hasCompanyProfile(user.email),
    [isMember, user]
  );

  // 비회원(또는 로딩 중): 로그인 안내 카드
  if (!isMember) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-16 text-center">
          <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
            <Lock className="size-[22px] text-indigo-600" strokeWidth={2} />
          </span>
          <p className="text-lg font-bold text-gray-900">로그인하면 우리 회사 맞춤 공고를 추천해드려요</p>
          <p className="max-w-md text-sm text-gray-500">
            회사 정보를 등록하면 우리 회사 조건에 맞는 공고를 모아서 볼 수 있어요.
          </p>
          <div className="mt-1 flex gap-2">
            <Link
              href="/login"
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
            >
              회원가입
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  // 회원이지만 회사 정보가 없으면 매칭 대신 회사 정보 입력을 먼저 안내
  if (companyMissing) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-16 text-center">
          <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
            <Building2 className="size-[22px] text-indigo-600" strokeWidth={2} />
          </span>
          <p className="text-lg font-bold text-gray-900">먼저 회사 정보를 입력해 주세요</p>
          <p className="max-w-md text-sm text-gray-500">
            등록하신 회사 정보로 공고 적합도를 계산해 맞춤 공고를 추천해드려요. 회사 정보를 입력하면 매칭
            결과를 볼 수 있어요.
          </p>
          <Link
            href="/mypage?edit=1"
            className="mt-1 rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
          >
            회사 정보 입력하기
          </Link>
        </div>
      </PageShell>
    );
  }

  // 회원 + 회사 정보 있음: 추천 리스트 (서버 페이징)
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hrefFor = (p: number) => (p > 1 ? `/recommend?page=${p}` : "/recommend");

  return (
    <PageShell>
      {/* 헤더: 건수 + 동기화.
          정렬 탭(매칭 점수순/마감 임박순)은 제거했다 — 백엔드 match_results가 점수가 아닌
          판정(verdict) 구조라 점수순이 성립하지 않고, sort=score는 마감순으로 폴백되어
          눌러도 순서가 바뀌지 않는 죽은 UI였다. 판정 연동 시 그에 맞는 이름으로 새로 만든다. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-bold text-gray-900">추천 공고 {total}건</p>
        <SyncIndicator />
      </div>

      {/* 카드 그리드 */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((bid, i) => (
            <BidCard
              key={bid.bid_id}
              bid={bid}
              position={(page - 1) * pageSize + i + 1}
              list="reco"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white py-20 text-center">
          <p className="text-[15px] font-bold text-gray-900">표시할 공고가 없어요</p>
          <p className="text-sm text-slate-500">잠시 후 다시 시도해 주세요.</p>
        </div>
      )}

      {/* 페이지네이션 (서버) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-3">
          <Link
            href={hrefFor(Math.max(1, page - 1))}
            aria-disabled={page === 1}
            className={`flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 ${
              page === 1 ? "pointer-events-none opacity-40" : ""
            }`}
            aria-label="이전 페이지"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
          </Link>

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
                    ? "font-bold text-indigo-700"
                    : "font-medium text-slate-500 hover:bg-slate-100"
                }`}
              >
                {p}
              </Link>
            )
          )}

          <Link
            href={hrefFor(Math.min(totalPages, page + 1))}
            aria-disabled={page === totalPages}
            className={`flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 ${
              page === totalPages ? "pointer-events-none opacity-40" : ""
            }`}
            aria-label="다음 페이지"
          >
            <ChevronRight className="size-4" strokeWidth={2} />
          </Link>
        </div>
      )}
    </PageShell>
  );
}
