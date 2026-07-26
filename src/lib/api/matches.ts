// 매칭 공고 조회 — GET /me/matches (중계 라우트 경유).
//
// 공고 목록(/bids)과 달리 로그인 토큰이 필요해 서버 컴포넌트에서 못 부른다.
// 토큰이 브라우저에만 있어서다 — 그래서 클라이언트에서 부른다(스크랩과 같은 구조).
//
// 백엔드가 '불가'를 기본 제외한다(판정의 65%). 전체가 필요하면 includeInfeasible.

import { getIdToken } from "@/lib/cognito";
import type { Bid } from "@/lib/types";

/** 배치가 사전계산한 판정. axes는 축별 근거 원본. */
export type MatchInfo = {
  verdict: string | null;          // 가능 / 보완가능 / 확인필요 / 불가
  required: number | null;
  satisfied: number | null;
  gate_failed: number | null;
  need_review: number | null;
  axes: { axis: string; class: string; status: string; detail: string }[] | null;
  computed_at: string | null;
};

export type MatchListItem = { bid: Bid; match: MatchInfo };

export type MatchListResponse = {
  total: number;
  page: number;
  page_size: number;
  items: MatchListItem[];
};

export type MatchSort = "deadline" | "recent";

/** 홈 대시보드용 건수 요약 — 목록을 받지 않으므로 가볍다. */
export type MatchSummary = { total: number };

export async function fetchMatchSummary(): Promise<MatchSummary> {
  const token = await getIdToken();
  if (!token) throw new Error("로그인이 필요합니다");
  const res = await fetch("/api/me/matches/summary", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET /me/matches/summary 실패: ${res.status}`);
  return (await res.json()) as MatchSummary;
}

/** 스크랩 건수 — 목록의 total만 쓴다(홈 타일용). */
export async function fetchScrapCount(): Promise<number> {
  const token = await getIdToken();
  if (!token) throw new Error("로그인이 필요합니다");
  const res = await fetch("/api/me/scraps", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET /me/scraps 실패: ${res.status}`);
  const data = (await res.json()) as { total: number };
  return data.total;
}

export async function fetchMatches(opts: {
  sort?: MatchSort;
  page?: number;
  includeInfeasible?: boolean;
}): Promise<MatchListResponse> {
  const token = await getIdToken();
  if (!token) throw new Error("로그인이 필요합니다");

  const qs = new URLSearchParams();
  if (opts.sort) qs.set("sort", opts.sort);
  if (opts.page && opts.page > 1) qs.set("page", String(opts.page));
  if (opts.includeInfeasible) qs.set("include_infeasible", "true");
  const suffix = qs.toString() ? `?${qs}` : "";

  const res = await fetch(`/api/me/matches${suffix}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET /me/matches 실패: ${res.status}`);
  return (await res.json()) as MatchListResponse;
}
