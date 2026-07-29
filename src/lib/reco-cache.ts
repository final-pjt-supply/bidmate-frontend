// AI 추천 목록 클라이언트 캐시 — 페이지 재진입 때 스켈레톤을 다시 보지 않게 한다.
//
// 추천 목록은 컴포넌트의 useState에만 있어서, 페이지를 벗어나면 언마운트와 함께
// 사라졌다. 다시 들어올 때마다 인증 워터폴(getIdToken → /api/me) 뒤에 다시 조회가
// 시작돼, 서버가 캐시 적중으로 0.2초에 응답해도 매번 빈 화면부터 봐야 했다.
//
// 스크랩 캐시(@/lib/scraps)와 같은 방식으로 메모리에만 둔다. sessionStorage를 쓰면
// 새로고침 후에도 남지만, 회사별 추천 목록을 브라우저 저장소에 남기지 않는 편이
// 낫다고 보고 프로세스 메모리로 제한했다. 새로고침은 원래대로 새로 받는다.

import type { RecommendationListResponse } from "@/lib/api/recommendations";

/** 이 시간이 지나면 화면엔 캐시를 그대로 쓰되 뒤에서 새로 받아 교체한다. */
const TTL_MS = 5 * 60 * 1000;

type Entry = {
  /** 다른 회사로 로그인했을 때 이전 회사 추천이 새지 않게 하는 키. */
  companyId: string;
  data: RecommendationListResponse;
  storedAt: number;
};

// 로그인 사용자는 한 번에 한 명이라 항목 하나면 충분하다.
let entry: Entry | null = null;

/**
 * 캐시된 추천 목록. 없으면 null.
 *
 * stale이 true면 "보여주기엔 충분하지만 갱신이 필요하다"는 뜻이다. 호출부는 화면을
 * 먼저 그리고 백그라운드로 다시 받는다(stale-while-revalidate).
 */
export function readRecommendations(
  companyId: string
): { data: RecommendationListResponse; stale: boolean } | null {
  if (!entry || entry.companyId !== companyId) return null;
  return { data: entry.data, stale: Date.now() - entry.storedAt >= TTL_MS };
}

export function writeRecommendations(
  companyId: string,
  data: RecommendationListResponse
): void {
  entry = { companyId, data, storedAt: Date.now() };
}

/** 로그아웃·탈퇴 시 호출 — 다음 사용자에게 이전 추천이 새지 않게 비운다. */
export function clearRecommendations(): void {
  entry = null;
}
