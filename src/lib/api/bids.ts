// 공고 조회 API 데이터 계층 (서버 컴포넌트에서 호출).
// 백엔드 계약: GET /bids (목록·페이징), GET /bids/{id} (상세).
// base URL은 API_BASE_URL 환경변수로 override 가능(없으면 개발 서버 기본값).

import type { Bid, BidCategory, BidListResponse } from "@/lib/types";

// 폴백은 로컬 개발용. 배포 환경에선 API_BASE_URL을 반드시 주입한다
// (배포 워크플로의 env.API_BASE_URL → docker run -e). 예전 폴백은 삭제된 EC2 주소라
// 환경변수 누락이 '설정 실수'가 아니라 '타임아웃'으로 나타나 원인 파악을 늦췄다.
const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

export type BidsQuery = {
  page?: number;
  category?: BidCategory;
  sort?: "deadline" | "score";
  today?: boolean;
};

/** GET /bids — 공고 목록(페이징). 마감 지난 공고는 서버에서 제외. */
export async function getBids(query: BidsQuery = {}): Promise<BidListResponse> {
  const qs = new URLSearchParams();
  if (query.page) qs.set("page", String(query.page));
  if (query.category) qs.set("category", query.category);
  if (query.sort) qs.set("sort", query.sort);
  if (query.today) qs.set("today", "true");
  const suffix = qs.toString() ? `?${qs}` : "";

  const res = await fetch(`${API_BASE}/bids${suffix}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`GET /bids 실패: ${res.status}`);
  return res.json() as Promise<BidListResponse>;
}

/** GET /bids/{id} — 공고 상세. 없으면 null. */
export async function getBid(bidId: string): Promise<Bid | null> {
  const res = await fetch(`${API_BASE}/bids/${encodeURIComponent(bidId)}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /bids/${bidId} 실패: ${res.status}`);
  return res.json() as Promise<Bid>;
}
