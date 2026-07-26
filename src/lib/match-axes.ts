// 매칭 판정 축 한글 라벨 — match_results.axes[].axis는 마스터 코드가 아니라
// 고정된 9종 카테고리 이름(영문)이다. 코드→이름은 이미 DB에 있지만(license_master 등),
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
  cert: "인증",   // class=info — 판정엔 반영 안 됨(매핑률 낮아 참고용)
};

export function axisLabel(axis: string): string {
  return AXIS_LABEL[axis] ?? axis;
}
