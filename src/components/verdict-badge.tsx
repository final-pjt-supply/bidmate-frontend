// 매칭 판정 배지 — 백엔드가 한글 원본(가능/보완가능/확인필요/불가)을 준다.
//
// 색은 "지원해도 되나"의 신호다:
//   가능     초록 — 자격 충족
//   보완가능  노랑 — 필수는 통과, 부가조건이 빈다
//   확인필요  회색 — 공고에서 조건을 못 뽑아냈다(우리가 모르는 것이지 미달이 아니다)
//   불가     빨강 — 자격 미달 (목록엔 기본 제외되나, 상세 등에서 쓸 수 있어 남긴다)

const STYLES: Record<string, string> = {
  가능: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  보완가능: "bg-amber-50 text-amber-700 ring-amber-200",
  확인필요: "bg-slate-100 text-slate-600 ring-slate-200",
  불가: "bg-rose-50 text-rose-700 ring-rose-200",
};

/** 판정 근거 요약 — "3개 중 2개 충족"처럼 카드에서 한 줄로 보여줄 때 쓴다. */
export function verdictHint(m: {
  required: number | null;
  satisfied: number | null;
}): string | null {
  if (!m.required) return null;
  return `조건 ${m.required}개 중 ${m.satisfied ?? 0}개 충족`;
}

export function VerdictBadge({
  verdict,
  className = "",
}: {
  verdict: string | null;
  className?: string;
}) {
  if (!verdict) return null;
  const style = STYLES[verdict] ?? STYLES["확인필요"];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${style} ${className}`}
    >
      {verdict}
    </span>
  );
}
