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
import Link from "next/link";
import { Settings2 } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  충족: "text-emerald-700",
  미충족: "text-rose-600",
  확인필요: "text-slate-400",
};

// 모바일 카드의 테두리·배경 — 데스크톱 표의 행 배경색과 같은 신호를 유지한다.
const CARD_STYLE: Record<string, string> = {
  충족: "border-emerald-200 bg-emerald-50/30",
  미충족: "border-rose-200 bg-rose-50/40",
};

/**
 * 요구/보유 칸의 값 — 이 표의 본문.
 *
 * 서버 detail("인증 0/3 · 취득하면 가능: …")을 그대로 읽어주면 행 라벨과 첫 단어가
 * 반복되고 말투도 로그처럼 남는다. 표현은 프론트 소관이다 — 구조화된 재료
 * (required/actual)만 받아 '공고 요구 | 우리 회사' 두 열로 나란히 비교한다.
 *
 * 인력·면허는 300자까지 온다(서버가 그 길이에서 자른다) — 그대로 펼치면 한 행이
 * 표를 삼키므로 세 줄로 접고 전체는 툴팁으로 준다.
 */
function AxisValue({
  value,
  asList = false,
  clamp = true,
}: {
  value: string;
  asList?: boolean;
  // 데스크톱 표에서 세 줄로 접는 건 한 행이 표를 삼키지 않게 하려는 제약이다.
  // 모바일 카드에는 그 제약이 없고, 잘린 값을 보여줄 title 툴팁도 모바일에서는
  // 뜨지 않으므로 접지 않는다.
  clamp?: boolean;
}) {
  // "(없음)"·"(미등록)" 같은 서버 placeholder는 괄호를 벗겨 자연문으로, 톤도 죽인다 —
  // 값 전체가 괄호 하나로 감싸인 경우만이라 "소프트웨어사업자(컴퓨터관련서비스사업)"은
  // 안 건드린다.
  const isPlaceholder = /^\([^()]+\)$/.test(value);
  const text = isPlaceholder ? value.slice(1, -1) : value;
  const items = asList ? text.split(/,\s+/).filter(Boolean) : [];
  return items.length > 1 ? (
    <ul className="space-y-1 leading-relaxed" title={text}>
      {items.map((item) => (
        <li key={item} className="flex gap-1.5">
          <span aria-hidden="true" className="mt-[9px] size-1 shrink-0 rounded-full bg-slate-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  ) : (
    <span
      className={`block leading-relaxed ${clamp ? "line-clamp-3" : ""} ${
        isPlaceholder ? "text-slate-400" : ""
      }`}
      title={text}
    >
      {text}
    </span>
  );
}

/** 요구·보유가 다 있으면 쌍으로 그린다(실측 3만여 축 전부 있음 — 없는 건 방어용). */
function hasPair(a: MatchAxis): a is MatchAxis & { required: string; actual: string } {
  return !!a.required && !!a.actual;
}

/**
 * 서버 detail 문장을 줄 단위로 분해.
 *
 * " · "(공백 있는 가운뎃점)는 서버가 detail을 조립할 때 문장 사이에 넣는 구분자다 —
 * "인증 0/3 · 취득하면 가능: …"처럼 카운트와 안내가 한 문단으로 이어지면 어지럽다.
 * 첫 문장(카운트·요약)은 본문 톤으로, 나머지(안내)는 한 단계 죽여 줄을 갈라 그린다.
 * 값 안의 가운뎃점은 "적합인증·적합등록"처럼 공백 없이 붙어 오므로 쪼개지지 않는다.
 */
function DetailLines({ detail }: { detail: string }) {
  const [head, ...rest] = detail.split(" · ");
  return (
    <>
      <p className="leading-relaxed">{head}</p>
      {rest.map((seg, i) => (
        <p key={i} className="mt-0.5 text-xs leading-relaxed text-slate-500">
          {seg}
        </p>
      ))}
    </>
  );
}

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
 * 경우에 "내가 뭘 해야 하나"를 알 수 없다.
 *
 * 가르는 기준은 MatchInfo.required가 아니라 '화면에 확인필요 행이 있는가'다. required는
 * gate·supp 축만 세는데, 개편 전 계산된 행은 인증·신용이 info로 빠져 required=0이면서도
 * 축은 보인다 — 그때 "확인하지 못했어요"라고 하면 바로 아래 표와 모순된다.
 * 새 판정에서는 required=0 ⇔ 확인필요 행 없음이라 결과가 같고, 옛 데이터에서만 갈린다.
 */
function verdictNote(verdict: string | null, hasReviewRow: boolean): string {
  if (verdict !== "확인필요") return "회사 정보 기준으로 자동 판정한 결과예요";
  return hasReviewRow
    ? "일부 항목을 판정할 수 없었어요 — 아래 확인필요 항목을 봐주세요"
    : // 표에 행이 있는데 "자격요건을 확인하지 못했다"고 하면 바로 아래 표와 모순된다.
      // (개편 전 계산분에서만 나오는 상태 — 추출 전면 실패는 빈 상태 박스가 맡는다)
      "공고에서 일부 조건을 확인하지 못했어요 — 공고 원문을 함께 확인해 주세요";
}

export function MatchAxesTable({
  verdict,
  axes,
}: {
  verdict: string | null;
  axes: MatchAxis[] | null;
}) {
  const scored = rowsFor(SCORED_AXIS_ORDER, axes ?? []);
  const hasReviewRow = scored.some((a) => a.status === "확인필요");

  if (scored.length === 0) {
    // 축이 하나도 없는데 판정이 '확인필요'면 "조건이 없다"가 아니라 "공고에서 조건을
    // 못 뽑아냈다"는 뜻이다(판정 함수가 축 0개를 확인필요로 처리). 정상 빈 상태와
    // 문구를 갈라 사용자를 공고 원문으로 보낸다 — B 인수인계 문서의 required=0 안내가
    // 실제로 놓일 자리는 표 상단이 아니라 여기다(그 경우 표 자체가 안 그려지므로).
    const extractionFailed = verdict === "확인필요";
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-bold text-slate-800">
          {extractionFailed
            ? "공고에서 자격요건을 확인하지 못했어요"
            : "별도로 확인된 자격요건이 없어요"}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {extractionFailed
            ? "자격요건을 자동으로 분석하지 못한 공고예요. 나라장터 원문에서 참가자격을 직접 확인해 주세요."
            : "이 공고에서는 회사 정보와 비교할 별도의 필수 조건이 확인되지 않았어요."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <VerdictBadge verdict={verdict} />
        <span className="text-sm text-slate-500">{verdictNote(verdict, hasReviewRow)}</span>
      </div>

      {/* 모바일(sm 미만): 표를 축별 세로 카드로 그린다.
          표는 열 폭이 고정돼 있어 375px에서 "공고 요구" 칸이 약 64px까지 쥐어짜인다 —
          요구값이 300자까지 오는 칸이라 사실상 못 읽는다. 카드는 폭을 거의 다 쓴다.
          화면 폭을 JS로 재서 분기하지 않고 CSS로 하나만 보이게 한다 — SSR에서
          하이드레이션 불일치와 깜빡임이 생기기 때문이다(#142). */}
      {scored.length > 0 && (
        <ul className="flex flex-col gap-2.5 sm:hidden">
          {scored.map((a) => (
            <li
              key={a.axis}
              className={`rounded-lg border px-3.5 py-3 ${
                CARD_STYLE[a.status] ?? "border-slate-200 bg-surface"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-gray-900">{axisLabel(a.axis)}</span>
                <span
                  className={`shrink-0 text-sm font-bold ${STATUS_STYLE[a.status] ?? ""}`}
                >
                  {a.status}
                </span>
              </div>
              {hasPair(a) ? (
                <dl className="mt-2.5 flex flex-col gap-2 text-sm text-slate-600">
                  <div>
                    <dt className="text-xs text-slate-400">공고 요구</dt>
                    <dd className="mt-0.5">
                      <AxisValue value={a.required} asList={a.axis === "cert"} clamp={false} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">우리 회사</dt>
                    <dd className="mt-0.5">
                      <AxisValue value={a.actual} asList={a.axis === "cert"} clamp={false} />
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="mt-2 text-sm text-slate-600">
                  <DetailLines detail={a.detail} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {scored.length > 0 && (
        // 값 칸이 길어지면 자동 레이아웃이 양옆 칸을 쥐어짜 "인 증"·"미충 족"처럼
        // 세로로 쪼개진다. 항목·결과는 너비를 고정하고 줄바꿈을 막는다.
        //
        // 요구·보유는 줄이 아니라 열로 나눈다 — 세로로 훑으면 "우리 회사가 뭘
        // 갖고 있나"가 한 열로 읽히고, 행마다 반복되던 미니 라벨도 사라진다.
        // 폭은 비대칭: 요구값(최대 300자)이 잔여 전부, 보유값(대부분 "없음"·"A"처럼
        // 짧다)은 28%만 갖는다.
        <table className="hidden w-full table-fixed text-left text-sm sm:table">
          <colgroup>
            {/* 행 배경 띠 안에서 글자가 끝에 붙지 않도록 첫/마지막 칸에 안쪽 여백을 준다.
                table-fixed라 패딩만 더하면 값 칸이 쥐어짜이므로 넣은 만큼(각 12px) col
                너비도 함께 늘렸다 — 값이 쓰는 폭은 이전과 같은 56px·60px 그대로다. */}
            <col className="w-[76px]" />
            <col />
            <col className="w-[28%]" />
            <col className="w-[72px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-400">
              <th className="py-2 pl-3 font-medium">항목</th>
              <th className="py-2 font-medium">공고 요구</th>
              <th className="py-2 font-medium">우리 회사</th>
              <th className="py-2 pr-3 text-right font-medium">결과</th>
            </tr>
          </thead>
          <tbody>
            {scored.map((a) => (
              <tr
                key={a.axis}
                className={`border-b border-slate-100 last:border-0 ${
                  a.status === "미충족"
                    ? "bg-rose-50/40"
                    : a.status === "충족"
                      ? "bg-emerald-50/30"
                      : ""
                }`}
              >
                <td className="py-3.5 pl-3 pr-2 align-top font-medium whitespace-nowrap text-gray-900">
                  {axisLabel(a.axis)}
                </td>
                {/* detail 문장은 재료(required/actual)가 없는 옛 행에서만 — 두 열에 걸쳐 그린다. */}
                {hasPair(a) ? (
                  <>
                    <td className="py-3.5 pr-3 align-top text-slate-600">
                      <AxisValue value={a.required} asList={a.axis === "cert"} />
                    </td>
                    <td className="py-3.5 pr-3 align-top text-slate-600">
                      <AxisValue value={a.actual} asList={a.axis === "cert"} />
                    </td>
                  </>
                ) : (
                  <td colSpan={2} className="py-3.5 pr-3 align-top text-slate-600">
                    <DetailLines detail={a.detail} />
                  </td>
                )}
                <td
                  className={`py-3.5 pr-3 text-right align-top font-bold whitespace-nowrap ${
                    STATUS_STYLE[a.status] ?? ""
                  }`}
                >
                  {a.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 다음 행동은 '이 표를 봐야 의미가 생기는 것'만 남긴다 — 챗봇 질문·원문 보기는
          헤더 카드에 이미 같은 핸들러·같은 링크로 있어 중복이었다.
          이 표는 판정 결과와 무관하게 전부 '우리 회사 정보'와의 비교라, 전 행이 충족이어도
          회사 정보가 낡았으면 결과가 틀린다 — 표가 그려지면 항상 같이 둔다. */}
      <div className="flex flex-wrap items-center gap-2 pt-3">
        <Link
          href="/mypage?edit=1"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-surface px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Settings2 className="size-3.5" strokeWidth={2} />
          회사 정보 수정
        </Link>
      </div>
    </div>
  );
}
