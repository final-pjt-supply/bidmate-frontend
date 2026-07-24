// 스크랩(북마크) 공고 저장소 — 계정별 localStorage. 클라이언트에서만 호출.

const scrapKey = (email: string) => `bidmate_scraps:${email.toLowerCase()}`;

export function getScrapIds(email: string): string[] {
  try {
    const raw = localStorage.getItem(scrapKey(email));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function isScrapped(email: string, bidId: string): boolean {
  return getScrapIds(email).includes(bidId);
}

/** 스크랩 토글. 반환값은 토글 후 스크랩 여부. */
export function toggleScrap(email: string, bidId: string): boolean {
  const ids = getScrapIds(email);
  const has = ids.includes(bidId);
  const next = has ? ids.filter((id) => id !== bidId) : [bidId, ...ids];
  localStorage.setItem(scrapKey(email), JSON.stringify(next));
  emit();
  return !has;
}

export function clearScraps(email: string) {
  localStorage.removeItem(scrapKey(email));
  emit();
}

// ── 구독 ──────────────────────────────────────────────────────────
// 한 화면에 같은 공고 카드와 상세 북마크가 함께 떠 있을 수 있다. 저장소가 바뀌면
// 구독 중인 컴포넌트가 전부 다시 읽게 해서 아이콘 상태가 어긋나지 않게 한다.
// (React의 useSyncExternalStore와 짝을 이룬다 — effect에서 setState 하지 않아도 된다.)

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function subscribeScraps(listener: () => void): () => void {
  listeners.add(listener);
  // 다른 탭에서 바뀐 경우도 반영한다(localStorage의 storage 이벤트는 타 탭에서만 발생).
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith("bidmate_scraps:")) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
