// 매칭 판정 축 한글 라벨 — match_results.axes[].axis는 마스터 코드가 아니라
// 고정된 10종 카테고리 이름(영문)이다. 코드→이름은 이미 DB에 있지만(license_master 등),
// 이 축 이름 자체는 그것과 무관해서 별도로 한글을 붙여야 한다.
export const AXIS_LABEL: Record<string, string> = {
  license: "면허",
  region: "지역",
  size: "기업규모",
  direct_prod: "직접생산",
  item: "품목",
  personnel: "인력",
  performance: "실적",
  capacity: "시공능력",
  credit: "신용",
  cert: "인증",
};

export function axisLabel(axis: string): string {
  return AXIS_LABEL[axis] ?? axis;
}

/** 판정에 반영되는 축의 고정 순서 — 판정 함수의 정렬과 같다(gate → supp, 그 안은 axis 이름순).
 *
 *  2026-07-29 매칭 개편으로 인증(cert)이 참고용에서 판정 대상(supp)으로 격상돼 여기 합류했다.
 *  낡은 계산 결과에는 아직 class='info'인 cert·credit이 섞여 오는데, 표는 class가 아니라
 *  axis 이름으로 행을 찾으므로(rowsFor) 그대로 본표에 그려진다 — 야간 전체 재계산으로 통일된다. */
export const SCORED_AXIS_ORDER = [
  // gate — 하나라도 미충족이면 '불가'
  "license", "region", "size", "item",
  // supp — 미충족이면 '보완가능'
  "direct_prod", "personnel", "performance", "capacity", "cert", "credit",
] as const;
