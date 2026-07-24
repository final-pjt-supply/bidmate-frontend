"use client";

// 마스터 다중 선택 자동완성(공용).
// - 위: 검색 전용 입력 + 후보 드롭다운
// - 아래: 선택된 항목을 배지(태그)로 분리 표시, X로 제거
// - fetcher만 갈아끼우면 로컬 스냅샷(면허)이든 서버 API(품목)든 동일하게 동작
// - 저장은 code(정본), 표시는 name

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { MasterRef } from "@/lib/data/masters";

const inputClass =
  "h-[42px] w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export function MasterMultiSelect({
  value,
  onChange,
  fetcher,
  placeholder = "검색해서 선택하세요",
}: {
  value: MasterRef[];
  onChange: (v: MasterRef[]) => void;
  /** 질의어 → 후보 목록 (로컬 필터든 서버 호출이든) */
  fetcher: (q: string) => Promise<MasterRef[]>;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<MasterRef[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const selectedCodes = useMemo(() => new Set(value.map((v) => v.code)), [value]);

  // 검색: 150ms 디바운스. open일 때만 조회.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const t = setTimeout(() => {
      if (alive) setLoading(true);
      fetcher(query)
        .then((list) => {
          if (alive) setResults(list.filter((m) => !selectedCodes.has(m.code)));
        })
        .finally(() => alive && setLoading(false));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, open, fetcher, selectedCodes]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const add = (m: MasterRef) => {
    if (selectedCodes.has(m.code)) return;
    onChange([...value, m]);
    setQuery("");
  };
  const remove = (code: string) => onChange(value.filter((v) => v.code !== code));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (results[0]) add(results[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef}>
      {/* 검색 입력 + 후보 드롭다운 */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={inputClass}
        />

        {open && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            {loading ? (
              <li className="px-3 py-2 text-sm text-slate-400">불러오는 중…</li>
            ) : results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">
                {query.trim() ? "검색 결과가 없어요" : "검색어를 입력하세요"}
              </li>
            ) : (
              results.map((m) => (
                <li key={m.code}>
                  <button
                    type="button"
                    onClick={() => add(m)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-indigo-50"
                  >
                    <span className="flex-1">{m.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{m.code}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* 선택된 항목 — 입력창 아래 배지로 분리 */}
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((m) => (
            <span
              key={m.code}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-indigo-700"
            >
              {m.name}
              <button
                type="button"
                onClick={() => remove(m.code)}
                aria-label={`${m.name} 제거`}
                className="flex size-4 items-center justify-center rounded-sm text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-700"
              >
                <X className="size-3" strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
