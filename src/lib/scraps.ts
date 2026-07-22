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
  return !has;
}

export function clearScraps(email: string) {
  localStorage.removeItem(scrapKey(email));
}
