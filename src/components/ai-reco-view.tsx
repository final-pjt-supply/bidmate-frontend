"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Lock, RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { hasCompanyProfile } from "@/lib/company";
import {
  fetchRecommendations,
  type RecommendationListItem,
} from "@/lib/api/recommendations";
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

function RecommendationReason({ item }: { item: RecommendationListItem }) {
  const score = Math.max(0, Math.min(100, Math.round(item.recommendation.score * 100)));
  return (
    <div className="rounded-b-xl border border-t-0 border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/70 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700">
          <Sparkles className="size-3.5" aria-hidden="true" />
          AI 추천 점수 {score}
        </span>
        <VerdictBadge verdict={item.match.verdict} />
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600">
        <span className="font-semibold text-slate-700">{item.recommendation.signal_source}</span>
        {" · "}
        {item.recommendation.matched_text}
      </p>
    </div>
  );
}

/** 자격 가능한 공고만 대상으로 회사 관심 텍스트와 제목 벡터 유사도를 계산한 목록. */
export function AIRecoView() {
  const { user, ready } = useAuth();
  const isMember = ready && !!user;
  const [items, setItems] = useState<RecommendationListItem[]>([]);
  const [candidateCount, setCandidateCount] = useState(0);
  const [querySource, setQuerySource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const companyMissing = useMemo(
    () => isMember && !!user && !hasCompanyProfile(user.email),
    [isMember, user]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchRecommendations(RECOMMENDATION_LIMIT);
      setItems(data.items);
      setCandidateCount(data.candidate_count);
      setQuerySource(data.query_source);
    } catch (err) {
      console.error("AI 추천 목록 로드 실패:", err);
      setError(err instanceof Error ? err.message : "추천 공고를 불러오지 못했어요.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isMember || companyMissing) return;
    // 인증 상태가 준비된 뒤 최초 1회 서버 추천 목록과 동기화한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [isMember, companyMissing, load]);

  if (!isMember) {
    return (
      <PageShell>
        <h1 className="text-2xl font-bold text-gray-900">AI 맞춤 추천</h1>
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
        <h1 className="text-2xl font-bold text-gray-900">AI 맞춤 추천</h1>
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
      <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-800 px-6 py-7 text-white shadow-sm sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-indigo-100 ring-1 ring-white/15">
              <Sparkles className="size-3.5" aria-hidden="true" />
              AI PERSONALIZED
            </span>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">우리 회사 AI 맞춤 추천</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
              자격 판정을 통과한 공고 중 회사의 {querySource ?? "실적과 관심사"}와 가까운
              공고를 제목 의미 유사도 순으로 골랐어요.
            </p>
          </div>
          <div className="flex items-center gap-3 text-right">
            {!loading && (
              <div>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-xs text-indigo-200">상위 추천</p>
              </div>
            )}
            <div className="h-8 w-px bg-white/20" />
            <SyncIndicator />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-bold text-gray-900">
            {loading ? "추천 공고를 분석하고 있어요…" : `AI 추천 공고 ${items.length}건`}
          </p>
          {!loading && candidateCount > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              자격 후보 {candidateCount.toLocaleString()}건 중 참가 불가·마감·스크랩 공고를
              제외하고 분석했어요.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          다시 분석
        </button>
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
            <div key={i} className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <div key={item.bid.bid_id} className="flex flex-col">
              <div className="relative">
                <span className="absolute -left-2 -top-2 z-10 flex size-7 items-center justify-center rounded-full bg-indigo-700 text-xs font-bold text-white shadow">
                  {index + 1}
                </span>
                <BidCard
                  bid={item.bid}
                  position={index + 1}
                  list="ai_reco"
                  className="rounded-b-none border-indigo-100"
                />
              </div>
              <RecommendationReason item={item} />
            </div>
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

      <p className="text-center text-xs leading-5 text-slate-400">
        AI 추천 점수는 베타 지표이며, 실제 입찰 참여 전 자격 판정과 공고 원문을 확인해 주세요.
      </p>
    </PageShell>
  );
}
