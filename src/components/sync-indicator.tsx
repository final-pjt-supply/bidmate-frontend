"use client";

import { useState } from "react";
import { RefreshCw, Info } from "lucide-react";

/**
 * 목록 동기화 표시 + 데이터 수집·표시 안내 툴팁.
 * 홈(추천 섹션)과 공고 검색 결과 헤더에서 공용으로 사용.
 */
export function SyncIndicator({ label = "목록 동기화 3분 전" }: { label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-[5px] text-gray-500">
      <RefreshCw className="size-3.5" strokeWidth={2} />
      <span className="text-[11.5px]">{label}</span>
      <span
        className="relative flex items-center"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          aria-label="데이터 수집·표시 안내"
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className={`flex cursor-pointer items-center rounded-full p-1 transition-colors ${
            open ? "bg-slate-200 text-indigo-600" : "text-gray-400 hover:bg-slate-100 hover:text-indigo-600"
          }`}
        >
          <Info className="size-[13px]" strokeWidth={2} />
        </button>
        <span
          role="tooltip"
          className={`pointer-events-none absolute right-0 top-full z-10 mt-2 w-[340px] rounded-md bg-slate-400 px-[13px] py-[7px] text-[12px] font-medium leading-[1.4] text-white shadow-[0px_4px_10px_rgba(30,41,59,0.25)] transition-all duration-150 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
          }`}
        >
          <span
            aria-hidden
            className="absolute -top-1 right-1.5 size-2 rotate-45 rounded-[1px] bg-slate-400"
          />
          나라장터 공고를 5분마다 수집하고, 첨부문서의 자격요건은 AI 분석을 거쳐 제공돼요. 게시 후 표시까지 시간이 걸릴 수 있어요.
        </span>
      </span>
    </div>
  );
}
