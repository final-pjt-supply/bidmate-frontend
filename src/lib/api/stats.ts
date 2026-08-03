// 공고 통계 API 데이터 계층 (서버 컴포넌트에서 호출).
// 백엔드 계약: GET /stats?category=&tag= — 한 조건(업종 x 품목) 분량만 내려온다.
//
// 집계는 DB의 bid_stats matview에 물질화돼 있고 백엔드는 조회만 한다.
// 이 화면이 쓰는 값은 전부 원본이다 — 1~12월 축 채우기, 금액 포맷, "가장 많아요"
// 문장은 여기(프론트) 담당이다.

import type { BidCategory } from "@/lib/types";

// 폴백은 로컬 개발용. 배포 환경에선 API_BASE_URL을 반드시 주입한다(bids.ts와 동일).
const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

const TIMEOUT_MS = 10_000;

// 집계가 진행 중인 달을 제외하므로 값이 실제로 바뀌는 건 매월 1일이다. 갱신도 일 1회
// (Airflow REFRESH)라 짧게 잡을 이유가 없다. bids의 60초와 다른 건 데이터 성격이 달라서다.
const REVALIDATE_SEC = 3600;

/** 업종 무관 'ALL'을 포함한 통계 화면의 업종 축. 백엔드 StatsCategory와 같은 값. */
export type StatsCategory = BidCategory | "ALL";

export type StatsData = {
  /** 실제로 적용된 조건. 요청과 다를 수 있다 — 무효한 tag는 서버가 전체로 폴백한다. */
  conditions: { category: StatsCategory; tag: string | null };
  period: { from: string; to: string };
  /** matview 갱신 시각. 오래되면 화면이 기준 시점을 밝힐 수 있다. */
  computed_at: string;
  total: number;
  /** false면 예산 분포를 그리면 안 된다(외자는 금액 자체가 안 들어온다). */
  amount_available: boolean;
  /** 선택된 업종의 품목 칩 상위 8개. 선택된 품목과 무관하게 업종 단위다. */
  tags: { tag: string; cnt: number }[];
  /** 관측된 달만. 1~12월 축 채우기는 화면이 한다. */
  monthly: { m: string; cnt: number }[];
  /** total과 다를 수 있다 — 전체 조건에서는 금액 정보가 없는 업종이 여기서만 빠진다. */
  budget: { buckets: { b: number; cnt: number }[]; total: number };
  institutions: { name: string; cnt: number }[];
  excluded_mas: number;
};

/** GET /stats — 조건별 집계. 실패하면 throw(페이지의 error.tsx가 받는다). */
export async function getStats(
  query: { category?: StatsCategory; tag?: string } = {}
): Promise<StatsData> {
  const qs = new URLSearchParams();
  if (query.category) qs.set("category", query.category);
  if (query.tag) qs.set("tag", query.tag);
  const suffix = qs.toString() ? `?${qs}` : "";

  const res = await fetch(`${API_BASE}/stats${suffix}`, {
    next: { revalidate: REVALIDATE_SEC },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // 503은 집계가 아직 만들어지지 않았다는 뜻이다(마이그레이션 직후 등). 빈 화면을
  // 그리지 않고 에러로 올린다 — "공고 0건"과 "아직 계산 전"은 다르다.
  if (!res.ok) throw new Error(`GET /stats 실패: ${res.status}`);
  return res.json() as Promise<StatsData>;
}
