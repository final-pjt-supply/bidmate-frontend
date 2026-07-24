"use client";

// 마스터 다중 선택 자동완성(공용).
// - 위: 검색 전용 입력 + 후보 드롭다운
// - 아래: 선택된 항목을 배지(태그)로 분리 표시, X로 제거
// - fetcher만 갈아끼우면 로컬 스냅샷(면허)이든 서버 API(품목)든 동일하게 동작
// - 저장은 code(정본), 표시는 name
// 스타일은 앱 기존 방식에 통일: 폼 inputClass(h-46/rounded-lg/gray-300) +
// 상세검색 콤보박스 드롭다운(rounded-lg/부드러운 그림자/slate-100 hover).

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { MasterRef } from "@/lib/data/masters";

// auth-card의 inputClass와 동일(형제 폼 필드와 통일)
const searchInputClass =
  "h-[46px] w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

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
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedCodes = useMemo(() => new Set(value.map((v) => v.code)), [value]);

  // 검색: 150ms 디바운스. open일 때만 조회.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const t = setTimeout(() => {
      if (alive) setLoading(true);
      fetcher(query)
        .then((list) => {
          if (alive) {
            setResults(list.filter((m) => !selectedCodes.has(m.code)));
            setHighlight(0);
          }
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
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && results[highlight]) add(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef}>
      {/* 검색 입력 + 후보 드롭다운 */}
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={searchInputClass}
        />

        {open && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.1)]"
          >
            {loading ? (
              <li className="px-3 py-1.5 text-sm text-slate-400">불러오는 중…</li>
            ) : results.length === 0 ? (
              <li className="px-3 py-1.5 text-sm text-slate-400">
                {query.trim() ? "결과 없음" : "검색어를 입력하세요"}
              </li>
            ) : (
              results.map((m, i) => (
                <li key={m.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => add(m)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-slate-600 transition-colors ${
                      i === highlight ? "bg-slate-100" : ""
                    }`}
                  >
                    <span className="flex-1 truncate">{m.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{m.code}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* 선택된 항목 — 입력창 아래 배지로 분리 (앱 카테고리 칩과 동일 톤) */}
      {value.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {value.map((m) => (
            <span
              key={m.code}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 py-[5px] pl-2.5 pr-1.5 text-xs font-bold text-indigo-800"
            >
              {m.name}
              <button
                type="button"
                onClick={() => remove(m.code)}
                aria-label={`${m.name} 제거`}
                className="flex size-[15px] items-center justify-center rounded-full text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-700"
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
