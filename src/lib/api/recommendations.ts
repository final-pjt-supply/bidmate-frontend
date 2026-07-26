import { getIdToken } from "@/lib/cognito";
import type { Bid } from "@/lib/types";
import type { MatchInfo } from "@/lib/api/matches";

export type RecommendationInfo = {
  score: number;
  reason: string;
  signal_source: string;
  matched_text: string;
};

export type RecommendationListItem = {
  bid: Bid;
  match: MatchInfo;
  recommendation: RecommendationInfo;
};

export type RecommendationListResponse = {
  total: number;
  candidate_count: number;
  query_source: string | null;
  items: RecommendationListItem[];
};

export async function fetchRecommendations(limit = 12): Promise<RecommendationListResponse> {
  const token = await getIdToken();
  if (!token) throw new Error("로그인이 필요합니다");
  const res = await fetch(`/api/me/recommendations?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `추천 조회 실패: ${res.status}`);
  }
  return (await res.json()) as RecommendationListResponse;
}
