"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { BidCategory } from "@/lib/types";
import { logEvent } from "@/lib/analytics/track";

/**
 * 검색 입력창. 제출하면 URL(/search?q=)로 이동해 서버가 다시 렌더한다.
 *
 * 클라이언트 컴포넌트인 이유는 입력 상태와 search_submitted 이벤트 기록 때문이고,
 * 결과 목록 자체는 서버에서 온다(한 페이지 20건 안에서만 필터되는 문제를 피하려면
 * 검색은 반드시 서버가 해야 한다).
 */
export function SearchForm({
  initialQuery,
  category,
  sort,
}: {
  initialQuery: string;
  category?: BidCategory;
  sort: "deadline" | "recent";
}) {
  const [value, setValue] = useState(initialQuery);
  const router = useRouter();

  /** 검색어만 바꾸고 업종·정렬은 유지. 페이지는 1로 되돌린다. */
  const hrefFor = (q: string) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (category) qs.set("cat", category);
    if (sort !== "deadline") qs.set("sort", sort);
    const s = qs.toString();
    return s ? `/search?${s}` : "/search";
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) logEvent("search_submitted", { properties: { query_len: q.length } });
    router.push(hrefFor(q));
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white py-1.5 pl-[18px] pr-1.5"
    >
      <Search className="size-[18px] shrink-0 text-slate-400" strokeWidth={2} />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="공고명 또는 발주기관으로 검색해 보세요"
        aria-label="공고 검색어"
        className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            router.push(hrefFor(""));
          }}
          aria-label="검색어 지우기"
          className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      )}
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-indigo-700 px-6 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-indigo-800"
      >
        검색
      </button>
    </form>
  );
}
