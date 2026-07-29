// 스크랩(북마크) — 서버 저장(company_bid_scraps). 브라우저는 백엔드에 직접 못 닿아
// Next 중계(/api/me/scraps)를 거친다.
//
// 카드 24개가 각자 "담았나?"를 묻는 N+1을 피하려고, 로그인 시 내 스크랩 id 목록을
// 한 번에 받아 메모리에 캐시한다. 카드는 캐시를 보고 즉시 아이콘을 그린다.
// 토글은 낙관적 업데이트 — 화면을 먼저 바꾸고, 서버 호출이 실패하면 되돌린다.
//
// useSyncExternalStore와 짝을 이룬다(구독 구조). getIdToken은 인증 토큰 획득용.

import { getIdToken } from "@/lib/cognito";
import { clearRecommendations } from "@/lib/reco-cache";

// 현재 로그인 사용자의 스크랩 id 집합(메모리 캐시). 비로그인/미로딩이면 빈 집합.
let cache = new Set<string>();
let loaded = false;

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

/** 컴포넌트 구독(useSyncExternalStore용). */
export function subscribeScraps(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 캐시 기반 즉답 — 서버 왕복 없음. */
export function isScrapped(bidId: string): boolean {
  return cache.has(bidId);
}

/** 캐시된 전체 스크랩 id(마이페이지 등에서 사용). */
export function getScrapIds(): string[] {
  return [...cache];
}

async function authHeader(): Promise<Record<string, string> | null> {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

/** 로그인 후 호출 — 내 스크랩 id 목록을 서버에서 받아 캐시를 채운다. */
export async function loadScraps(): Promise<void> {
  const headers = await authHeader();
  if (!headers) return;
  try {
    // page_size가 20이라 한 페이지로 부족할 수 있어 전체를 훑는다.
    // 스크랩이 수백 개를 넘기 전엔 몇 번의 요청으로 끝난다.
    const ids = new Set<string>();
    for (let page = 1; page <= 50; page++) {
      const res = await fetch(`/api/me/scraps?page=${page}`, { headers, cache: "no-store" });
      if (!res.ok) break;
      const data = (await res.json()) as { items: { bid_id: string }[]; total: number };
      data.items.forEach((b) => ids.add(b.bid_id));
      if (ids.size >= data.total || data.items.length === 0) break;
    }
    cache = ids;
    loaded = true;
    emit();
  } catch (err) {
    console.error("스크랩 목록 로드 실패:", err);
  }
}

/** 로그아웃 시 캐시 비우기. */
export function clearScraps(): void {
  cache = new Set();
  loaded = false;
  emit();
}

export function scrapsLoaded(): boolean {
  return loaded;
}

/**
 * 스크랩 토글(낙관적). 화면을 먼저 바꾸고 서버에 반영, 실패하면 되돌린다.
 * 반환값은 토글 직후(낙관적) 스크랩 여부.
 */
export function toggleScrap(bidId: string): boolean {
  const had = cache.has(bidId);
  // 1) 낙관적 반영 — 즉시 화면 갱신
  if (had) cache.delete(bidId);
  else cache.add(bidId);
  emit();

  // 스크랩은 AI 추천 결과를 바꾼다 — 서버가 스크랩한 공고를 추천 후보에서 빼고,
  // 스크랩 제목을 1순위 관심 신호로 쓰기 때문에 순위 자체가 달라진다. 추천 캐시를
  // 그대로 두면 방금 담은 공고가 TTL이 끝날 때까지 목록에 남는다.
  //
  // 보고 있는 화면을 지금 바꾸지는 않는다(카드가 발밑에서 사라지면 더 당황스럽다).
  // 다음에 추천 화면에 들어올 때 새로 받게 하는 것이 목적이다.
  //
  // 서버 반영이 실패해 아래에서 되돌리더라도 캐시는 비워둔 채로 둔다. 한 번 더
  // 받아오는 손해가, 틀린 목록을 보여주는 것보다 낫다.
  clearRecommendations();

  // 2) 서버 반영(백그라운드). 실패하면 캐시를 원복하고 다시 알린다.
  void (async () => {
    const headers = await authHeader();
    if (!headers) {
      rollback(bidId, had);
      return;
    }
    try {
      const res = had
        ? await fetch(`/api/me/scraps/${encodeURIComponent(bidId)}`, { method: "DELETE", headers })
        : await fetch(`/api/me/scraps`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ bid_id: bidId }),
          });
      if (!res.ok) rollback(bidId, had);
    } catch {
      rollback(bidId, had);
    }
  })();

  return !had;
}

/** 서버 실패 시 낙관적 변경을 되돌린다(원래 상태 wasScrapped로 복구). */
function rollback(bidId: string, wasScrapped: boolean) {
  if (wasScrapped) cache.add(bidId);
  else cache.delete(bidId);
  emit();
}
