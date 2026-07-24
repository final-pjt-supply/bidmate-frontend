// 마스터 스냅샷 로더 — 콤보/셀렉트가 "쓸 때" 지연 로드(await import)해서 첫 화면 번들에 안 얹는다.
// 저장/매칭은 code, 표시는 name. 원본은 DB에서 뜬 스냅샷(src/lib/data/*-master.json).

export type RegionNode = {
  code: string;
  name: string;
  level: "sido" | "sigungu";
  sido: string; // 소속 시·도 코드(시군구), 시도 자신은 자기 코드
};

/** 소재지 마스터(시도 + 시군구) 로드 */
export async function loadRegions(): Promise<RegionNode[]> {
  return (await import("./region-master.json")).default as RegionNode[];
}

/** 마스터 참조 값 — 저장/매칭은 code, 표시는 name */
export type MasterRef = { code: string; name: string };

/** 면허·업종 마스터(2,916종) — 지연 로드.
 *  ①면허 ⑤실적 분야 ⑦시공능력 업종이 공용으로 쓴다.
 *  (규모가 커지는 품목/item은 스냅샷 대신 서버 API로 가야 함 — 여기 두지 않는다) */
let _licenses: MasterRef[] | null = null;
export async function loadLicenses(): Promise<MasterRef[]> {
  if (!_licenses) {
    _licenses = (await import("./license-master.json")).default as MasterRef[];
  }
  return _licenses;
}

/** 마스터에서 질의어로 검색 — 자동완성 공용.
 *  나중에 품목(item)처럼 서버 API로 가는 축은 이 함수 시그니처만 맞춰 교체하면 된다. */
export function searchMaster(list: MasterRef[], q: string, limit = 30): MasterRef[] {
  const t = q.trim().toLowerCase();
  if (!t) return list.slice(0, limit);
  const starts: MasterRef[] = [];
  const includes: MasterRef[] = [];
  for (const m of list) {
    const name = m.name.toLowerCase();
    if (name.startsWith(t) || m.code.startsWith(t)) starts.push(m);
    else if (name.includes(t)) includes.push(m);
    if (starts.length >= limit) break;
  }
  return [...starts, ...includes].slice(0, limit);
}
