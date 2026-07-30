"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, ChevronRight, Lock, RefreshCw } from "lucide-react";
import type { Bid, BidCategory } from "@/lib/types";
import type { MatchListItem } from "@/lib/api/matches";
import { BidCard } from "@/components/bid-card";
import { SyncIndicator } from "@/components/sync-indicator";
import { VerdictBadge, verdictHint } from "@/components/verdict-badge";
import { logEvent } from "@/lib/analytics/track";

/** 섹션 헤더 우측 더보기 링크 (숨겨진 공고가 있을 때만 노출) */
function MoreLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-indigo-700 transition-colors hover:text-indigo-800"
    >
      더보기
      <ChevronRight className="size-4" strokeWidth={2} />
    </Link>
  );
}

/** 비회원 추천 잠금 오버레이 (Figma 150:103) */
function LoginGate() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 rounded-xl bg-slate-50/70 px-4 text-center backdrop-blur-[1px]">
      <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
        <Lock className="size-[22px] text-indigo-600" strokeWidth={2} />
      </span>
      <p className="text-lg font-bold text-gray-900">우리 회사 맞춤 추천이 준비돼 있어요</p>
      <p className="text-sm text-gray-500">무료로 가입하면 회사 조건에 맞는 추천 공고를 볼 수 있어요.</p>
      <Link
        href="/signup"
        className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
      >
        무료로 시작하기
      </Link>
    </div>
  );
}

function SectionError({
  message,
  retrying,
  onRetry,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-10 text-center"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-white text-amber-600">
        <AlertTriangle className="size-5" strokeWidth={2} />
      </span>
      <div>
        <p className="font-bold text-slate-900">공고를 불러오지 못했어요</p>
        <p className="mt-1 text-sm text-slate-600">{message}</p>
      </div>
      <button
        type="button"
        disabled={retrying}
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3.5 py-2 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} strokeWidth={2} />
        {retrying ? "다시 불러오는 중" : "다시 시도"}
      </button>
    </div>
  );
}

/** 회사 정보가 없으면 매칭을 계산할 수 없다 — 빈 목록 대신 입력 경로를 준다(맞춤 추천 화면과 동일 문구). */
function CompanyMissingSection() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-indigo-50">
        <Building2 className="size-5 text-indigo-600" strokeWidth={2} />
      </span>
      <div>
        <p className="font-bold text-slate-900">먼저 회사 정보를 입력해 주세요</p>
        <p className="mt-1 text-sm text-slate-500">
          등록하신 회사 정보로 공고 적합도를 계산해 맞춤 공고를 추천해드려요.
        </p>
      </div>
      <Link
        href="/mypage?edit=1"
        className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
      >
        회사 정보 입력하기
      </Link>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

const FILTERS: { label: string; value: BidCategory | "all" }[] = [
  { label: "전체", value: "all" },
  { label: "공사", value: "cnstwk" },
  { label: "용역", value: "servc" },
  { label: "물품", value: "thng" },
  { label: "외자", value: "frgcpt" },
];

type HomeBodyProps = {
  /** 인증 없는 공용 목록 — 비회원 블러 미리보기 전용 */
  recommendedBids: Bid[];
  recentBids: Bid[];
  recentLoadFailed: boolean;
  /** 비회원: 추천 섹션을 블러 + 로그인 유도 오버레이로 잠금 */
  gated?: boolean;
  /** 회원: 실제 자격 판정이 붙은 맞춤 추천 목록 */
  memberMatches?: MatchListItem[];
  memberMatchesLoading?: boolean;
  memberMatchesFailed?: boolean;
  /** 회원인데 회사 정보가 비어 매칭을 계산할 수 없는 상태 */
  companyMissing?: boolean;
  onRetryMemberMatches?: () => void;
};

export function HomeBody({
  recommendedBids,
  recentBids,
  recentLoadFailed,
  gated = false,
  memberMatches = [],
  memberMatchesLoading = false,
  memberMatchesFailed = false,
  companyMissing = false,
  onRetryMemberMatches,
}: HomeBodyProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<BidCategory | "all">("all");
  const [retrying, startRetry] = useTransition();

  const retry = () => {
    startRetry(() => router.refresh());
  };

  const MAX_CARDS = 6;
  const byFilter = (bid: Bid) => filter === "all" || bid.bid_category === filter;
  const recentAll = recentBids.filter(byFilter);
  // 비회원 미리보기(블러)용 공용 목록
  const preview = recommendedBids.filter(byFilter).slice(0, MAX_CARDS);
  const recent = recentAll.slice(0, MAX_CARDS);
  // 회원 맞춤 추천 — 업종 필터는 공고 정보(bid) 기준으로 동일하게 적용
  const filtered = filter !== "all";
  const matchesAll = memberMatches.filter((it) => byFilter(it.bid));
  const matches = matchesAll.slice(0, MAX_CARDS);
  // 더보기는 홈에서 못 본 매칭이 남아 있을 때 준다. 필터 때문에 0건이 된 경우도
  // 포함한다 — 맞춤 추천 화면에는 그 공고들이 그대로 있다.
  const showMoreMatches =
    !companyMissing &&
    !memberMatchesFailed &&
    !memberMatchesLoading &&
    (matchesAll.length > MAX_CARDS || (filtered && matchesAll.length === 0 && memberMatches.length > 0));

  // 내 조건 맞춤 추천 섹션 (비회원은 블러 + 로그인 유도)
  const recommendedSection = (
    <div className="flex flex-col gap-6" key="recommended">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-gray-900">내 조건 맞춤 추천</h2>
          <p className="text-sm text-slate-500">
            {gated ? "로그인하면 회사 조건에 맞는 공고를 볼 수 있어요." : "회사 조건에 맞는 공고를 모아드려요."}
          </p>
        </div>
        {!gated && <SyncIndicator />}
      </div>

      {gated ? (
        <div className="relative min-h-64">
          <div className="pointer-events-none grid select-none grid-cols-1 gap-5 blur-[6px] md:grid-cols-2 xl:grid-cols-3">
            {preview.map((bid) => (
              <BidCard key={bid.bid_id} bid={bid} />
            ))}
          </div>
          <LoginGate />
        </div>
      ) : (
        <>
          {companyMissing ? (
            <CompanyMissingSection />
          ) : memberMatchesFailed ? (
            // 이 섹션의 재시도는 라우터 새로고침이 아니라 매칭 재요청이다 —
            // 진행 표시도 그 요청의 로딩 상태를 따라야 한다.
            <SectionError
              message="잠시 후 다시 시도해 주세요."
              retrying={memberMatchesLoading}
              onRetry={onRetryMemberMatches ?? retry}
            />
          ) : memberMatchesLoading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: MAX_CARDS }, (_, i) => (
                <div
                  key={i}
                  className="h-52 animate-pulse rounded-xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : matches.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {matches.map((it, i) => (
                <div key={it.bid.bid_id} className="flex flex-col gap-1.5">
                  {/* h-full: 카드 높이를 행에 맞춰 판정 배지 줄을 가로로 정렬한다 */}
                  <BidCard bid={it.bid} position={i + 1} list="reco" className="h-full" />
                  <div className="flex items-center gap-2 px-1">
                    <VerdictBadge verdict={it.match.verdict} />
                    <span className="text-xs text-slate-400">{verdictHint(it.match)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // 필터를 걸어 0건이면 "참가 가능한 공고가 없다"고 단정하면 안 된다 —
            // 다른 업종에는 있을 수 있다. 안내 범위를 지금 보고 있는 업종으로 좁힌다.
            <EmptySection
              message={
                filtered
                  ? "이 업종에 맞는 공고가 아직 없어요."
                  : "참가 가능한 공고가 아직 없어요."
              }
            />
          )}
          {showMoreMatches && (
            <div className="flex justify-end">
              <MoreLink href="/recommend" />
            </div>
          )}
        </>
      )}
    </div>
  );

  // 최신 공고 섹션 (회원·비회원 모두 공개)
  const latestSection = (
    <div className="flex flex-col gap-6" key="latest">
      {/* 새로고침은 여기에도 둔다 — 추천 섹션 헤더에만 있으면 그 섹션이 잠긴 비회원은
          홈에서 갱신할 방법이 없다. 비회원이 실제로 보는 목록이 이 섹션이다. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-bold text-gray-900">최신 공고</h2>
          <p className="text-[13px] text-slate-400">최근 자동 수집된 공고예요.</p>
        </div>
        {gated && <SyncIndicator />}
      </div>
      {recentLoadFailed ? (
        <SectionError
          message="최신 공고 목록을 가져오지 못했습니다."
          retrying={retrying}
          onRetry={retry}
        />
      ) : recent.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {recent.map((bid, i) => (
            <BidCard key={bid.bid_id} bid={bid} position={i + 1} sort="recent" list="latest" />
          ))}
        </div>
      ) : (
        <EmptySection message="표시할 최신 공고가 아직 없어요." />
      )}
      {!recentLoadFailed && recentAll.length > MAX_CARDS && (
        <div className="flex justify-end">
          <MoreLink href="/search" />
        </div>
      )}
    </div>
  );

  // 비회원은 최신 공고를 위로, 추천을 아래로
  const sections = gated ? [latestSection, recommendedSection] : [recommendedSection, latestSection];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
      {/* 업종 필터 */}
      <div className="flex gap-2.5">
        {FILTERS.map(({ label, value }) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value);
                logEvent("bid_list_filtered", { page: "home", properties: { category: value } });
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

      {sections}
    </div>
  );
}
