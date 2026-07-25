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

/** 인력 자격·등급 마스터(personnel_grade_master, 1,255종) 한 항목.
 *  rank는 grade_rank — 같은 field(family) 안에서만 비교가 유효하다.
 *  (역량등급·감리원·숙련기술자·학위 4개 family만 rank를 갖는다. 자격수준
 *   "기사 이상"은 중의성이 커서 rank를 비워 뒀다 — 매칭 v2 과제.) */
export type PersonnelNode = MasterRef & {
  qualType: "license" | "role" | "grade" | "degree";
  field?: string;
  rank?: number;
};

/** 인력 자격·등급 마스터 — 지연 로드.
 *  등급 있는 항목(학위·감리원·역량등급·숙련기술자) → 역할 → 자격수준 → 개별 자격 순으로
 *  정렬돼 있어, 검색어 없이 열었을 때 실제로 많이 쓰는 항목이 먼저 보인다. */
let _personnel: PersonnelNode[] | null = null;
export async function loadPersonnel(): Promise<PersonnelNode[]> {
  if (!_personnel) {
    _personnel = (await import("./personnel-master.json")).default as PersonnelNode[];
  }
  return _personnel;
}

/** 마스터에서 질의어로 검색 — 자동완성 공용.
 *  나중에 품목(item)처럼 서버 API로 가는 축은 이 함수 시그니처만 맞춰 교체하면 된다. */
export function searchMaster<T extends MasterRef>(list: T[], q: string, limit = 30): T[] {
  const t = q.trim().toLowerCase();
  if (!t) return list.slice(0, limit);
  const starts: T[] = [];
  const includes: T[] = [];
  for (const m of list) {
    const name = m.name.toLowerCase();
    if (name.startsWith(t) || m.code.startsWith(t)) starts.push(m);
    else if (name.includes(t)) includes.push(m);
    if (starts.length >= limit) break;
  }
  return [...starts, ...includes].slice(0, limit);
}
