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
