"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { buildSearchHref, type SearchConditions } from "@/lib/search-params";
import { logEvent } from "@/lib/analytics/track";

/** 패널이 관리하는 조건 — 검색어·업무구분·정렬은 패널 밖에서 즉시 적용된다. */
type Draft = Pick<SearchConditions, "includeClosed">;

const EMPTY: Draft = { includeClosed: false };

/** 체크박스 한 줄. */
function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={onChange} className="flex w-fit items-center gap-2 text-left">
      <span
        className={`flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
          checked ? "border-indigo-700 bg-indigo-700" : "border-slate-200 bg-white"
        }`}
      >
        {checked && <Check className="size-3 text-white" strokeWidth={3} />}
      </span>
      <span className="text-sm text-slate-600">{label}</span>
    </button>
  );
}

/**
 * 상세 검색 패널 — 고른 조건을 임시로 들고 있다가 "조건 적용"에서 한 번에 반영한다.
 *
 * 즉시 적용(링크)으로 두지 않은 이유: 조건이 늘면 하나 바꿀 때마다 페이지가 새로
 * 로드되고, 추정금액 범위처럼 입력값이 있는 필터는 타이핑 중간마다 이동할 수 없다.
 *
 * 패널에는 **서버가 지원하는 조건만** 넣는다. 백엔드에 필터가 생길 때 Draft와
 * 컨트롤을 하나씩 늘린다(동작하지 않는 컨트롤은 두지 않는다).
 */
export function AdvancedSearchPanel({ conditions }: { conditions: SearchConditions }) {
  const applied: Draft = { includeClosed: conditions.includeClosed };
  const [draft, setDraft] = useState<Draft>(applied);
  const router = useRouter();

  const dirty = draft.includeClosed !== applied.includeClosed;
  const hasApplied = applied.includeClosed;

  const apply = () => {
    logEvent("bid_list_filtered", { page: "search", properties: { include_closed: draft.includeClosed } });
    router.push(buildSearchHref(conditions, draft));
  };

  const reset = () => {
    setDraft(EMPTY);
    // 적용된 조건이 없으면 이동할 이유가 없다(이미 초기 상태).
    if (hasApplied) router.push(buildSearchHref(conditions, EMPTY));
  };

  return (
    <details className="group" open={hasApplied}>
      <summary className="flex h-8 w-fit cursor-pointer list-none items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50">
        상세 검색
        {hasApplied && <span className="size-1.5 rounded-full bg-indigo-600" aria-label="적용된 조건 있음" />}
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" strokeWidth={2} />
      </summary>

      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p className="shrink-0 text-xs font-bold text-gray-900 sm:w-[68px]">기타</p>
          <CheckRow
            checked={draft.includeClosed}
            onChange={() => setDraft((d) => ({ ...d, includeClosed: !d.includeClosed }))}
            label="마감된 공고 포함"
          />
        </div>

        <p className="text-[12px] text-slate-400">지역·추정금액·낙찰방법 조건은 준비 중이에요.</p>

        <div className="flex items-center justify-end gap-2">
          {dirty && <span className="mr-auto text-[12px] text-indigo-700">적용하지 않은 변경이 있어요</span>}
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!dirty}
            className="rounded-md bg-indigo-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            조건 적용
          </button>
        </div>
      </div>
    </details>
  );
}
