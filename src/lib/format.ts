// 표시용 전처리 함수 모음.
// 원칙: 원본 데이터는 그대로 두고, 화면에 보여줄 때만 가공한다.

import type { Bid, BidCategory } from "./types";

const CATEGORY_KO: Record<BidCategory, string> = {
  cnstwk: "공사",
  servc: "용역",
  thng: "물품",
  frgcpt: "외자",
};

// 업종 코드 → 한글
export function categoryLabel(cat: BidCategory): string {
  return CATEGORY_KO[cat] ?? cat;
}

// 긴 낙찰방법 → 앞부분만 (카드 태그용). 상세에선 원본 전체를 쓸 것.
// 예: "적격심사제-추정가격이 30억원 미만..." → "적격심사제"
export function shortMethod(sucsfbid_mthd_nm: string | null): string {
  if (!sucsfbid_mthd_nm) return "";
  return sucsfbid_mthd_nm.split("-")[0];
}

// 금액 포맷. 배정예산 없으면 추정가격으로 대체하고 라벨을 구분.
export function formatAmount(bid: Pick<Bid, "bdgt_amt" | "presmpt_prce">): string {
  const v = bid.bdgt_amt ?? bid.presmpt_prce;
  if (v == null) return "";
  const label = bid.bdgt_amt != null ? "예산" : "추정";
  if (v >= 100_000_000) return `${label} ${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${label} ${Math.round(v / 10_000).toLocaleString()}만`;
  return `${label} ${v.toLocaleString()}원`;
}

export type DdayResult = {
  kind: "urgent" | "normal" | "always" | "closed" | "unknown";
  text: string;
};

// D-day 계산. 마감일 null → "마감 미정", 1년 초과(상시공고) → "상시".
// now는 테스트/목업 편의를 위해 주입 가능(기본 현재 시각).
export function computeDday(bid_clse_dt: string | null, now: Date = new Date()): DdayResult {
  if (!bid_clse_dt) return { kind: "unknown", text: "마감 미정" };
  const clse = new Date(bid_clse_dt);
  const days = Math.ceil((clse.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days > 365) return { kind: "always", text: "상시" };
  if (days < 0) return { kind: "closed", text: "마감" };
  return { kind: days <= 3 ? "urgent" : "normal", text: `D-${days}` };
}
