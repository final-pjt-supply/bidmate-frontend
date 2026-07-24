import type { BidCategory } from "@/lib/types";

/**
 * 공고 검색 화면의 조건 — URL 쿼리스트링이 정본이다(서버 컴포넌트가 읽어 조회).
 *
 * 필터가 계속 추가되는 자리라, 조건 → URL 변환을 여기 한 곳에만 둔다.
 * 검색 폼과 목록(업종 칩·정렬 탭·페이지네이션)이 각자 링크를 만들다가
 * 검색 시 `closed`가 통째로 사라지는 버그가 났다(#66).
 */
export type SearchSort = "deadline" | "recent";

export type SearchConditions = {
  query: string;
  category?: BidCategory;
  sort: SearchSort;
  includeClosed: boolean;
  page: number;
};

/**
 * 조건 일부를 바꾼 검색 URL을 만든다. 넘기지 않은 조건은 현재 값을 유지한다.
 *
 * 기본값(정렬 deadline · 마감 제외 · 1페이지)은 쿼리에서 생략해 URL을 짧게 둔다.
 * `page`를 명시하지 않으면 1로 되돌린다 — 조건이 바뀌면 3페이지에 머무를 이유가 없고,
 * 결과가 줄었을 때 빈 페이지를 보여주게 된다.
 */
export function buildSearchHref(
  current: SearchConditions,
  changes: Partial<SearchConditions> = {}
): string {
  const next = { ...current, page: 1, ...changes };
  const qs = new URLSearchParams();
  if (next.query) qs.set("q", next.query);
  if (next.category) qs.set("cat", next.category);
  if (next.sort !== "deadline") qs.set("sort", next.sort);
  if (next.includeClosed) qs.set("closed", "1");
  if (next.page > 1) qs.set("page", String(next.page));
  const s = qs.toString();
  return s ? `/search?${s}` : "/search";
}
