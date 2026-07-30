"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { hasCompanyProfile } from "@/lib/company";
import { logEvent } from "@/lib/analytics/track";
import {
  fetchMatches,
  fetchMatchSummary,
  fetchScrapCount,
  type MatchListItem,
} from "@/lib/api/matches";
import { HomeHero, type HeroStat } from "@/components/home-hero";
import { HomeBody } from "@/components/home-body";
import type { Bid } from "@/lib/types";

type HomeViewProps = {
  /** 인증 없는 공용 목록 — 비회원 블러 미리보기 전용 */
  recommendedBids: Bid[];
  recentBids: Bid[];
  recentLoadFailed: boolean;
};

/** 로그인 사용자 대시보드 건수. 로드 전엔 null — "0건"을 먼저 보여주면 오해를 준다. */
type Counts = { total: number; scraps: number } | null;

const fmt = (n: number | undefined) => (n == null ? "—" : `${n.toLocaleString()}건`);

export function HomeView({
  recommendedBids,
  recentBids,
  recentLoadFailed,
}: HomeViewProps) {
  const { user, ready } = useAuth();
  const isMember = ready && !!user;
  const [counts, setCounts] = useState<Counts>(null);

  // "내 조건 맞춤 추천" 섹션은 회원일 때 실제 매칭 결과(match_results)를 보여준다.
  // 서버가 준 recommendedBids는 인증 없는 공용 목록이라 회원 조건과 무관하다 —
  // 비회원 블러 미리보기 용도로만 남긴다.
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesFailed, setMatchesFailed] = useState(false);

  useEffect(() => {
    logEvent("home_viewed", { page: "home" });
  }, []);

  // 회원의 회사 정보 입력 여부 (SSR·비회원 시 isMember=false로 localStorage 미접근)
  const companyMissing = useMemo(
    () => isMember && !!user && !hasCompanyProfile(user.email),
    [isMember, user]
  );

  // 재시도 중에도 실패 상태를 유지한다 — 여기서 먼저 지우면 오류 카드가 스켈레톤으로
  // 바뀌었다 다시 오류로 돌아와 깜빡이고, "다시 시도" 버튼의 진행 표시도 사라진다.
  const loadMatches = useCallback(async () => {
    setMatchesLoading(true);
    try {
      const data = await fetchMatches({ sort: "recommended", page: 1 });
      setMatches(data.items);
      setMatchesFailed(false);
    } catch (err) {
      console.error("맞춤 추천 로드 실패:", err);
      setMatchesFailed(true);
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  // 매칭 목록은 토큰이 있어야 부를 수 있고 토큰은 브라우저에만 있다 — 서버에서 미리
  // 못 받으므로 마운트 후 여기서 로드한다(맞춤 추천 페이지와 같은 규칙).
  useEffect(() => {
    if (!isMember || companyMissing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMatches();
  }, [isMember, companyMissing, loadMatches]);

  // 건수는 로그인 토큰이 있어야 부를 수 있어 서버에서 미리 못 받는다.
  // 하나가 실패해도 나머지는 살린다(allSettled) — 타일 하나 때문에 전부 "—"가 되면 안 된다.
  useEffect(() => {
    if (!isMember) return;
    let alive = true;
    (async () => {
      const [summary, scraps] = await Promise.allSettled([
        fetchMatchSummary(),
        fetchScrapCount(),
      ]);
      if (!alive) return;
      if (summary.status === "rejected") console.error("매칭 요약 실패:", summary.reason);
      if (scraps.status === "rejected") console.error("스크랩 건수 실패:", scraps.reason);
      setCounts({
        total: summary.status === "fulfilled" ? summary.value.total : NaN,
        scraps: scraps.status === "fulfilled" ? scraps.value : NaN,
      });
    })();
    return () => {
      alive = false;
    };
  }, [isMember]);

  if (isMember) {
    const safe = (n: number | undefined) => (n == null || Number.isNaN(n) ? undefined : n);
    // 건수를 누르면 그 목록으로 바로 간다.
    const stats: HeroStat[] = [
      { value: fmt(safe(counts?.total)), label: "내 맞춤 공고", href: "/recommend" },
      { value: fmt(safe(counts?.scraps)), label: "스크랩", href: "/mypage/scraps" },
    ];
    const total = safe(counts?.total);
    return (
      <>
        {/* 회사 정보가 없으면 맞춤 공고 건수 자체가 성립하지 않는다 — 아래 섹션이
            "회사 정보를 입력해 주세요"라고 말하는데 위에서 대시보드를 흉내내면 모순이다. */}
        <HomeHero
          badge="MY · 맞춤 공고 대시보드"
          title={
            companyMissing
              ? `${user.company}님, 반가워요`
              : `${user.company}님, 오늘의 맞춤 공고예요`
          }
          subtitle={
            companyMissing
              ? "회사 정보를 입력하면 우리 회사 조건에 맞는 공고를 추천해드려요."
              : total == null
                ? "회사 조건에 맞는 공고를 확인하고 있어요."
                : `회사 조건으로 참가할 수 있는 공고가 ${total.toLocaleString()}건 있어요.`
          }
          stats={companyMissing ? undefined : stats}
        />
        <HomeBody
          recommendedBids={recommendedBids}
          recentBids={recentBids}
          recentLoadFailed={recentLoadFailed}
          memberMatches={matches}
          memberMatchesLoading={matchesLoading}
          memberMatchesFailed={matchesFailed}
          companyMissing={companyMissing}
          onRetryMemberMatches={() => void loadMatches()}
        />
      </>
    );
  }

  // 비회원(또는 로딩 중): 마케팅 히어로 + 추천 잠금
  return (
    <>
      <HomeHero
        badge="나라장터 연동 · 자동 공고 업데이트"
        title="우리 회사에 맞는 공공입찰 공고를 찾아드립니다"
        subtitle="조달청 나라장터의 수천 건 공고를 분석해 기업 역량에 맞는 공고만 골라드려요"
      />
      <HomeBody
        recommendedBids={recommendedBids}
        recentBids={recentBids}
        recentLoadFailed={recentLoadFailed}
        gated
      />
    </>
  );
}
