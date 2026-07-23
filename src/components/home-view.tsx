"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { logEvent } from "@/lib/analytics/track";
import { HomeHero, type HeroStat } from "@/components/home-hero";
import { HomeBody } from "@/components/home-body";
import type { Bid } from "@/lib/types";

type HomeViewProps = {
  recommendedBids: Bid[];
  recentBids: Bid[];
  urgentCount: number;
  totalCount: number;
};

export function HomeView({ recommendedBids, recentBids, urgentCount, totalCount }: HomeViewProps) {
  const { user, ready } = useAuth();
  const isMember = ready && !!user;

  useEffect(() => {
    logEvent("home_viewed", { page: "home" });
  }, []);

  if (isMember) {
    const stats: HeroStat[] = [
      { value: `${totalCount}건`, label: "내 맞춤 공고" },
      { value: `${urgentCount}건`, label: "마감 임박" },
      { value: "0건", label: "스크랩" },
    ];
    return (
      <>
        <HomeHero
          badge="MY · 맞춤 공고 대시보드"
          title={`${user.company}님, 오늘의 맞춤 공고예요`}
          subtitle={`회사 조건에 맞는 새 공고 ${totalCount}건이 등록됐어요.`}
          stats={stats}
        />
        <HomeBody recommendedBids={recommendedBids} recentBids={recentBids} />
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
      <HomeBody recommendedBids={recommendedBids} recentBids={recentBids} gated />
    </>
  );
}
