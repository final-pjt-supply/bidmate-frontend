"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, Info } from "lucide-react";
import { refreshList } from "@/app/actions";

/**
 * 목록 새로고침 버튼 + 데이터 수집·표시 안내 툴팁.
 * 홈(추천 섹션)과 공고 검색 결과 헤더에서 공용으로 사용.
 *
 * 기본 동작: 목록은 서버 컴포넌트가 가져오므로 클라이언트에서 API를 직접 부르지 않는다.
 * 서버 액션으로 현재 경로의 캐시를 버리면, 그 응답에 새로 렌더된 결과가 함께 실려와
 * 페이지 깜빡임 없이 목록만 교체된다. 캐시를 안 버리면 revalidate:60 때문에 60초
 * 안에는 같은 데이터가 돌아온다.
 *
 * onRefresh를 넘기면 그 함수를 대신 호출한다. AI 추천처럼 목록을 클라이언트에서
 * 직접 가져오는 화면은 경로 캐시를 버려도 목록이 바뀌지 않으므로, 재조회 함수를
 * 받아 써야 실제로 갱신된다.
 */
export function SyncIndicator({
  onRefresh,
  pending: externalPending,
}: {
  onRefresh?: () => void;
  pending?: boolean;
} = {}) {
  const [open, setOpen] = useState(false);
  const [actionPending, startTransition] = useTransition();
  const pathname = usePathname();

  const pending = onRefresh ? !!externalPending : actionPending;

  const refresh = () => {
    if (pending) return;
    if (onRefresh) {
      onRefresh();
      return;
    }
    // revalidatePath가 현재 경로를 무효화하면 서버 액션 응답에 새 렌더 결과가 함께
    // 실려온다. router.refresh()를 덧붙이면 같은 데이터를 한 번 더 받아온다(실측 2회).
    startTransition(() => refreshList(pathname));
  };

  return (
    <div className="flex items-center gap-[5px] text-gray-500">
      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        aria-label="목록 새로고침"
        aria-busy={pending}
        title="목록 새로고침"
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] transition-colors hover:bg-slate-100 hover:text-indigo-600 disabled:cursor-progress"
      >
        <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} strokeWidth={2} />
        {pending ? "갱신 중" : "새로고침"}
      </button>
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
          className={`pointer-events-none absolute right-0 top-full z-10 mt-2 w-[340px] rounded-md bg-tooltip px-[13px] py-[7px] text-[12px] font-medium leading-[1.4] text-white shadow-[0px_4px_10px_rgba(30,41,59,0.25)] transition-all duration-150 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
          }`}
        >
          <span
            aria-hidden
            className="absolute -top-1 right-1.5 size-2 rotate-45 rounded-[1px] bg-tooltip"
          />
          나라장터 공고를 5분마다 수집하고, 첨부문서의 자격요건은 AI 분석을 거쳐 제공돼요. 게시 후 표시까지 시간이 걸릴 수 있어요.
        </span>
      </span>
    </div>
  );
}
