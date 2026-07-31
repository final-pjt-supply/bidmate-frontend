"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { hasCompanyProfile } from "@/lib/company";
import {
  fetchRecommendations,
  type RecommendationListItem,
  type RecommendationListResponse,
} from "@/lib/api/recommendations";
import { readRecommendations, writeRecommendations } from "@/lib/reco-cache";
import { BidCard } from "@/components/bid-card";
import { SyncIndicator } from "@/components/sync-indicator";
import { VerdictBadge } from "@/components/verdict-badge";

const RECOMMENDATION_LIMIT = 12;

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
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
    <div className="flex flex-col items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-16 text-center">
      <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
        {icon}
      </span>
      <p className="text-lg font-bold text-gray-900">{title}</p>
      <p className="max-w-md text-sm leading-6 text-gray-500">{body}</p>
      {children}
    </div>
  );
}

/** 카드 우하단 점수 배지. 근거 문구는 싣지 않는다 — 카드가 길어지고 시선이 분산된다. */
function ScoreBadge({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score * 100)));
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-[3px] text-xs font-bold text-indigo-700">
      <Sparkles className="size-3.5" aria-hidden="true" />
      {pct}점
    </span>
  );
}

type ViewData = {
  items: RecommendationListItem[];
  candidateCount: number;
};

const EMPTY_VIEW: ViewData = { items: [], candidateCount: 0 };

function toView(data: RecommendationListResponse): ViewData {
  return {
    items: data.items,
    candidateCount: data.candidate_count,
  };
}

/** 자격 가능한 공고를 관심사·자격·역량·규모·일정의 가중 합산으로 정렬한 목록. */
export function AIRecoView() {
  const { user, ready } = useAuth();
  const isMember = ready && !!user;
  const companyId = user?.companyId ?? null;
  // 마운트 시점에 캐시가 있으면 그 값으로 시작한다. 이펙트에서 채우면 스켈레톤이
  // 한 프레임 스쳐 지나가는데, 재진입 때 그걸 없애는 게 이 캐시의 목적이다.
  const [view, setView] = useState<ViewData>(() => {
    const hit = companyId ? readRecommendations(companyId) : null;
    return hit ? toView(hit.data) : EMPTY_VIEW;
  });
  const [loading, setLoading] = useState(
    () => !(companyId && readRecommendations(companyId))
  );
  const [error, setError] = useState("");
  const { items, candidateCount } = view;

  const companyMissing = useMemo(
    () => isMember && !!user && !hasCompanyProfile(user.email),
    [isMember, user]
  );

  /** background=true면 이미 그려둔 캐시를 건드리지 않고 조용히 갱신만 한다. */
  const load = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      if (!companyId) return;
      if (!background) setLoading(true);
      setError("");
      try {
        const data = await fetchRecommendations(RECOMMENDATION_LIMIT);
        setView(toView(data));
        writeRecommendations(companyId, data);
      } catch (err) {
        console.error("AI 추천 목록 로드 실패:", err);
        // 백그라운드 갱신 실패는 화면을 비우지 않는다. 이미 보고 있는 캐시가
        // 조금 낡았을 뿐인데 에러 화면으로 바꾸면 오히려 후퇴다.
        if (!background) {
          setError(err instanceof Error ? err.message : "추천 공고를 불러오지 못했어요.");
          setView(EMPTY_VIEW);
        }
      } finally {
        if (!background) setLoading(false);
      }
    },
    [companyId]
  );

  useEffect(() => {
    if (!isMember || companyMissing || !companyId) return;
    const hit = readRecommendations(companyId);
    if (!hit) {
      // 캐시가 없을 때만 스켈레톤을 보여주며 받아온다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
      return;
    }
    setView(toView(hit.data));
    setLoading(false);
    if (hit.stale) void load({ background: true });
  }, [isMember, companyMissing, companyId, load]);

  // 세션 확인 중(ready=false)엔 로그인 요구 카드를 먼저 보여주면 안 된다 —
  // 실제로는 로그인된 사용자가 새로고침할 때마다 잠깐 그 카드가 깜빡인다.
  if (!ready) {
    return (
      <PageShell>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (!isMember) {
    return (
      <PageShell>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 추천</h1>
          <p className="mt-1 text-sm text-slate-500">
            회사 관심사와 유사한 공고를 참가 가능한 후보 안에서 찾아드려요.
          </p>
        </div>
        <CenterCard
          icon={<Lock className="size-[22px] text-indigo-600" strokeWidth={2} />}
          title="로그인하면 우리 회사 맞춤 공고를 추천해드려요"
          body="회사 실적과 관심 공고를 바탕으로, 참가 가능한 공고 중 가장 관련 있는 공고를 먼저 보여드려요."
        >
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
        </CenterCard>
      </PageShell>
    );
  }

  if (companyMissing) {
    return (
      <PageShell>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 추천</h1>
          <p className="mt-1 text-sm text-slate-500">
            회사 관심사와 유사한 공고를 참가 가능한 후보 안에서 찾아드려요.
          </p>
        </div>
        <CenterCard
          icon={<Building2 className="size-[22px] text-indigo-600" strokeWidth={2} />}
          title="먼저 회사 정보를 입력해 주세요"
          body="실적, 취급 품목, 보유 면허를 입력하면 참가 가능한 공고를 회사 관심도 순으로 추천해드려요."
        >
          <Link
            href="/mypage?edit=1"
            className="mt-1 rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
          >
            회사 정보 입력하기
          </Link>
        </CenterCard>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 추천</h1>
          <p className="mt-1 text-sm text-slate-500">
            자격 판정을 통과한 공고 중 회사 관심사와 가까운 공고를 먼저 보여드려요.
          </p>
        </div>
        <SyncIndicator onRefresh={() => void load()} pending={loading} />
      </div>

      {!loading && !error && candidateCount > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-bold text-indigo-700">
            <Sparkles className="size-4" aria-hidden="true" />
            추천 기준
          </span>
          {/*
            추천은 다섯 축(관심사·자격·역량·규모·일정)의 가중합이다. 예전처럼 관심
            신호 출처 하나만 "추천 기준"으로 내걸면, 자격이나 면허로 올라온 공고까지
            "스크랩 공고 기준"으로 뽑힌 것처럼 보인다.
          */}
          <span className="text-slate-600">
            관심사 · 자격 · 역량 · 규모 · 일정
          </span>
        </div>
      )}

      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-bold text-gray-900">추천 공고</h2>
        <span className="text-sm text-slate-400">
          {loading ? "분석 중…" : `총 ${items.length}건`}
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="mt-2 font-bold underline">
            다시 시도
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {/*
            자격 판정과 점수를 카드 안으로 넣는다. 예전에는 카드 아래에 별도 줄로
            뒀는데, 공고 정보와 떨어져 있어 무엇에 대한 판정인지 흐렸고 카드 높이도
            들쭉날쭉했다. 근거 문구는 싣지 않는다 — 카드가 길어지고 시선이 분산된다.
          */}
          {items.map((item, index) => (
            <BidCard
              key={item.bid.bid_id}
              bid={item.bid}
              position={index + 1}
              list="ai_reco"
              tagSlot={<VerdictBadge verdict={item.match.verdict} />}
              cornerSlot={<ScoreBadge score={item.recommendation.score} />}
            />
          ))}
        </div>
      ) : !error ? (
        <CenterCard
          icon={<Sparkles className="size-[22px] text-indigo-600" strokeWidth={2} />}
          title="분석할 수 있는 추천 공고가 아직 없어요"
          body={
            candidateCount === 0
              ? "현재 참가 가능한 미마감 공고가 없습니다."
              : "회사 관심 정보는 준비됐지만 아직 제목 벡터가 적재되지 않았습니다. 데이터가 추가되면 자동으로 추천됩니다."
          }
        />
      ) : null}

      <p className="text-xs leading-5 text-slate-400">
        AI 추천 점수는 관심사·자격·역량·규모·일정을 함께 반영한 베타 지표예요.
        실제 참여 전에는 자격 판정과 공고 원문을 확인해 주세요.
      </p>
    </PageShell>
  );
}
