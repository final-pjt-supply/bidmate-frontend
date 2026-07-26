// 공고 상세의 매칭 판정 표 — 축별 충족/미충족/확인필요/해당없음.
//
// 점수(0~100)가 아니다 — 백엔드가 점수 로직을 없애고 축별 판정(verdict/axes) 구조로
// 확정했다(#57). "확인필요"는 자격 미달이 아니라 공고에서 조건을 못 뽑아낸 것이라
// 미충족과 다른 색으로 구분한다.
//
// 표는 항상 9개 항목(SCORED_AXIS_ORDER)을 전부 보여준다. 백엔드는 요구가 있는 축만
// axes에 담아 보내는데, 그대로 렌더하면 "이 공고는 항목이 하나뿐인가?"로 오해하기
// 쉽다. 없는 축은 "해당없음"으로 명시해, 통과한 항목까지 포함해 전체 그림을 보여준다.

import type { MatchAxis } from "@/lib/types";
import { axisLabel, INFO_AXIS_ORDER, SCORED_AXIS_ORDER } from "@/lib/match-axes";
import { VerdictBadge } from "@/components/verdict-badge";

const STATUS_STYLE: Record<string, string> = {
  충족: "text-emerald-700",
  미충족: "text-rose-600",
  확인필요: "text-slate-400",
  해당없음: "text-slate-300",
};

function rowsFor(order: readonly string[], axes: MatchAxis[]): MatchAxis[] {
  const byKey = new Map(axes.map((a) => [a.axis, a]));
  return order.map(
    (axis) =>
      byKey.get(axis) ?? {
        axis,
        class: "gate",   // 표시에만 쓰고 판정엔 안 쓰므로 값 자체는 의미 없다.
        status: "해당없음",
        detail: "요구 없음",
      }
  );
}

export function MatchAxesTable({
  verdict,
  axes,
}: {
  verdict: string | null;
  axes: MatchAxis[] | null;
}) {
  const scored = rowsFor(SCORED_AXIS_ORDER, axes ?? []);
  const info = rowsFor(INFO_AXIS_ORDER, axes ?? []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <VerdictBadge verdict={verdict} />
        <span className="text-sm text-slate-500">
          {verdict === "확인필요"
            ? "공고에서 일부 조건을 확인할 수 없었어요"
            : "회사 정보 기준으로 자동 판정한 결과예요"}
        </span>
      </div>

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

      {/* 인증(cert)은 매핑률이 낮아 판정에 반영하지 않는다 — 참고용으로만 분리 표시. */}
      <div className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
        <p className="mb-1 font-medium text-slate-600">참고 (판정에는 반영되지 않아요)</p>
        {info.map((a) => (
          <p key={a.axis}>
            {axisLabel(a.axis)}: {a.detail}
          </p>
        ))}
      </div>
    </div>
  );
}
