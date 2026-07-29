// 공고 상세의 매칭 판정 표 — 축별 충족/미충족/확인필요/해당없음.
//
// 점수(0~100)가 아니다 — 백엔드가 점수 로직을 없애고 축별 판정(verdict/axes) 구조로
// 확정했다(#57). "확인필요"는 자격 미달이 아니라 판정을 못 내린 것이라 미충족과 다른
// 색으로 구분한다(사유 두 갈래는 아래 verdictNote 참고).
//
// 백엔드는 실제 요구가 있는 축만 axes에 담아 보낸다. 요구가 없는 축은 표에 채워 넣지
// 않고, 표시할 축이 하나도 없으면 별도의 비교 조건이 없다는 정상 빈 상태를 보여준다.

import type { MatchAxis } from "@/lib/types";
import { axisLabel, SCORED_AXIS_ORDER } from "@/lib/match-axes";
import { VerdictBadge } from "@/components/verdict-badge";

const STATUS_STYLE: Record<string, string> = {
  충족: "text-emerald-700",
  미충족: "text-rose-600",
  확인필요: "text-slate-400",
};

function rowsFor(order: readonly string[], axes: MatchAxis[]): MatchAxis[] {
  const byKey = new Map(axes.map((a) => [a.axis, a]));
  return order.flatMap((axis) => {
    const row = byKey.get(axis);
    return row ? [row] : [];
  });
}

/**
 * 판정 배지 옆 한 줄 설명.
 *
 * "확인필요"는 두 갈래이고 사용자가 할 일이 서로 다르다 — 하나로 뭉뚱그리면 두 번째
 * 경우에 "내가 뭘 해야 하나"를 알 수 없다. required(공고에서 뽑아낸 요구 조건 수)로 가른다.
 */
function verdictNote(verdict: string | null, required: number | null): string {
  if (verdict !== "확인필요") return "회사 정보 기준으로 자동 판정한 결과예요";
  return required === 0
    ? "공고에서 자격요건을 확인하지 못했어요 — 공고 원문을 확인해 주세요"
    : "일부 항목을 판정할 수 없었어요 — 아래 확인필요 항목을 봐주세요";
}

export function MatchAxesTable({
  verdict,
  axes,
  required = null,
}: {
  verdict: string | null;
  axes: MatchAxis[] | null;
  /** 공고에서 뽑아낸 요구 조건 수. 확인필요 사유를 가르는 데만 쓴다. */
  required?: number | null;
}) {
  const scored = rowsFor(SCORED_AXIS_ORDER, axes ?? []);

  if (scored.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-bold text-slate-800">별도로 확인된 자격요건이 없어요</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          이 공고에서는 회사 정보와 비교할 별도의 필수 조건이 확인되지 않았습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <VerdictBadge verdict={verdict} />
        <span className="text-sm text-slate-500">{verdictNote(verdict, required)}</span>
      </div>

      {scored.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-400">
              <th className="py-2 font-medium">항목</th>
              <th className="py-2 font-medium">내용</th>
              <th className="py-2 text-right font-medium">결과</th>
            </tr>
          </thead>
          <tbody>
            {scored.map((a) => (
              <tr key={a.axis} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 font-medium text-gray-900">{axisLabel(a.axis)}</td>
                <td className="py-2.5 text-slate-600">{a.detail}</td>
                <td className={`py-2.5 text-right font-bold ${STATUS_STYLE[a.status] ?? ""}`}>
                  {a.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
