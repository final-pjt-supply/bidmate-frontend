"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCompanyStatus } from "@/lib/company-api";
import { fetchMatches, type MatchListItem, type MatchSort } from "@/lib/api/matches";
import { BidCard } from "@/components/bid-card";
import { SyncIndicator } from "@/components/sync-indicator";
import { VerdictBadge, verdictHint } from "@/components/verdict-badge";

const DEFAULT_PAGE_SIZE = 20;

// 추천순을 맨 앞·기본값으로 둔다 — "맞춤 추천" 탭의 정체성과 맞고, 백엔드가
// 갓 추가한 정렬이라 눈에 띄어야 한다(#104).
const SORTS: { key: MatchSort; label: string }[] = [
  { key: "recommended", label: "추천순" },
  { key: "deadline", label: "마감 임박순" },
  { key: "recent", label: "최신순" },
];

/** 세션 확인/회사정보 서버 재확인 중 보여줄 중립 스켈레톤 — 로그인 요구 카드나
 *  회사정보 미입력 카드를 먼저 보여주면 안 되는 두 구간(ready 대기, 서버 재확인
 *  대기)에서 같은 모양을 쓴다. */
function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-52 animate-pulse rounded-xl border border-slate-200 bg-surface" />
      ))}
    </div>
  );
}

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

function CenterCard({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-xl border border-slate-200 bg-surface px-4 py-16 text-center">
      <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
        {icon}
      </span>
      <p className="text-lg font-bold text-gray-900">{title}</p>
      <p className="max-w-md text-sm text-gray-500">{body}</p>
      {children}
    </div>
  );
}

/**
 * 맞춤 추천 — 자격 판정(match_results)이 붙은 공고 목록.
 *
 * 백엔드가 '불가'를 기본 제외한다(판정의 65%). 여기서 다시 거르지 않는다 —
 * 프론트에서 걸러내면 페이지당 남는 개수가 들쭉날쭉해져 페이지네이션이 깨진다.
 */
export function RecoView() {
  const { user, ready } = useAuth();
  const isMember = ready && !!user;

  const [items, setItems] = useState<MatchListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<MatchSort>("recommended");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 회원의 회사 정보 입력 여부 — 로컬 우선, 로컬에 없으면 서버로 재확인(#169)
  const companyStatus = useCompanyStatus(user?.email, isMember);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMatches({ sort, page });
      setItems(data.items);
      setTotal(data.total);
      setPageSize(
        Number.isInteger(data.page_size) && data.page_size > 0
          ? data.page_size
          : DEFAULT_PAGE_SIZE
      );
    } catch (err) {
      console.error("매칭 목록 로드 실패:", err);
      setError("추천 공고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [sort, page]);

  // 매칭 목록은 토큰이 있어야 부를 수 있고 토큰은 브라우저에만 있다 — 서버에서 미리
  // 못 받으므로 마운트 후 여기서 로드한다(mypage와 같은 규칙 예외).
  useEffect(() => {
    if (!isMember || companyStatus !== "filled") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [isMember, companyStatus, load]);

  // 세션 확인 중(ready=false)엔 로그인 요구 카드를 먼저 보여주면 안 된다 —
  // 실제로는 로그인된 사용자가 새로고침할 때마다 잠깐 그 카드가 깜빡인다.
  if (!ready) {
    return (
      <PageShell>
        <GridSkeleton />
      </PageShell>
    );
  }

  if (!isMember) {
    return (
      <PageShell>
        <CenterCard
          icon={<Lock className="size-[22px] text-indigo-600" strokeWidth={2} />}
          title="로그인하면 우리 회사 맞춤 공고를 추천해드려요"
          body="회사 정보를 등록하면 우리 회사 조건에 맞는 공고를 모아서 볼 수 있어요."
        >
          <div className="mt-1 flex gap-2">
            <Link
              href="/login"
              className="rounded-md border border-slate-200 bg-surface px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
            >
              회원가입
            </Link>
          </div>
        </CenterCard>
      </PageShell>
    );
  }

  // 로컬엔 없어 서버로 재확인하는 중 — 결과가 나올 때까지는 "미입력" 카드를
  // 먼저 보여주지 않는다(다른 기기·시크릿창에서 실제로 채워져 있으면 오탐이 된다).
  if (companyStatus === "checking") {
    return (
      <PageShell>
        <GridSkeleton />
      </PageShell>
    );
  }

  if (companyStatus === "missing") {
    return (
      <PageShell>
        <CenterCard
          icon={<Building2 className="size-[22px] text-indigo-600" strokeWidth={2} />}
          title="먼저 회사 정보를 입력해 주세요"
          body="등록하신 회사 정보로 공고 적합도를 계산해 맞춤 공고를 추천해드려요. 회사 정보를 입력하면 매칭 결과를 볼 수 있어요."
        >
          <Link
            href="/mypage?edit=1"
            className="mt-1 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
          >
            회사 정보 입력하기
          </Link>
        </CenterCard>
      </PageShell>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageShell>
      {/* 헤더: 건수 + 정렬 + 동기화 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-bold text-gray-900">
          {loading ? "추천 공고 불러오는 중…" : `추천 공고 ${total.toLocaleString()}건`}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setSort(s.key);
                  setPage(1);
                }}
                className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                  sort === s.key
                    ? "font-bold text-indigo-700"
                    : "font-medium text-slate-500 hover:bg-slate-100"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <SyncIndicator />
        </div>
      </div>

      {/* 참가 불가 공고는 서버에서 빠진다는 안내 — 건수가 적어 보이는 이유를 알려준다 */}
      {!loading && !error && (
        <p className="-mt-2 text-xs text-slate-400">
          자격이 맞지 않아 참가할 수 없는 공고는 제외했어요.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {loading ? (
        <GridSkeleton />
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it, i) => (
            <div key={it.bid.bid_id} className="flex flex-col gap-1.5">
              {/* h-full: 카드 높이를 행에 맞춰 판정 배지 줄을 가로로 정렬한다 */}
              <BidCard
                bid={it.bid}
                position={(page - 1) * pageSize + i + 1}
                list="reco"
                className="h-full"
              />
              <div className="flex items-center gap-2 px-1">
                <VerdictBadge verdict={it.match.verdict} />
                <span className="text-xs text-slate-400">{verdictHint(it.match)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-surface py-20 text-center">
          <p className="text-[15px] font-bold text-gray-900">참가 가능한 공고가 아직 없어요</p>
          <p className="text-sm text-slate-500">
            회사 정보를 더 채우면 더 많은 공고와 매칭될 수 있어요.
          </p>
          <Link
            href="/mypage?edit=1"
            className="mt-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
          >
            회사 정보 보완하기
          </Link>
        </div>
      )}

      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-1.5 pt-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
            aria-label="이전 페이지"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
          </button>

          {buildPages(totalPages, page).map((p, i) =>
            p === "ellipsis" ? (
              <span key={`e${i}`} className="px-1 text-xs text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === page ? "page" : undefined}
                className={`flex size-9 items-center justify-center rounded-lg text-sm transition-colors ${
                  p === page
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
            disabled={page === totalPages}
            className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
            aria-label="다음 페이지"
          >
            <ChevronRight className="size-4" strokeWidth={2} />
          </button>
        </div>
      )}
    </PageShell>
  );
}
