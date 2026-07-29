"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { logEvent } from "@/lib/analytics/track";
import { fetchMatchSummary, fetchScrapCount } from "@/lib/api/matches";
import { HomeHero, type HeroStat } from "@/components/home-hero";
import { HomeBody } from "@/components/home-body";
import type { Bid } from "@/lib/types";

type HomeViewProps = {
  recommendedBids: Bid[];
  recentBids: Bid[];
  recommendedLoadFailed: boolean;
  recentLoadFailed: boolean;
};

/** 로그인 사용자 대시보드 건수. 로드 전엔 null — "0건"을 먼저 보여주면 오해를 준다. */
type Counts = { total: number; scraps: number } | null;

const fmt = (n: number | undefined) => (n == null ? "—" : `${n.toLocaleString()}건`);

export function HomeView({
  recommendedBids,
  recentBids,
  recommendedLoadFailed,
  recentLoadFailed,
}: HomeViewProps) {
  const { user, ready } = useAuth();
  const isMember = ready && !!user;
  const [counts, setCounts] = useState<Counts>(null);

  useEffect(() => {
    logEvent("home_viewed", { page: "home" });
  }, []);

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
        <HomeHero
          badge="MY · 맞춤 공고 대시보드"
          title={`${user.company}님, 오늘의 맞춤 공고예요`}
          subtitle={
            total == null
              ? "회사 조건에 맞는 공고를 확인하고 있어요."
              : `회사 조건으로 참가할 수 있는 공고가 ${total.toLocaleString()}건 있어요.`
          }
          stats={stats}
        />
        <HomeBody
          recommendedBids={recommendedBids}
          recentBids={recentBids}
          recommendedLoadFailed={recommendedLoadFailed}
          recentLoadFailed={recentLoadFailed}
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
        recommendedLoadFailed={recommendedLoadFailed}
        recentLoadFailed={recentLoadFailed}
        gated
      />
    </>
  );
}
