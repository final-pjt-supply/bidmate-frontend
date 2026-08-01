"use client";

// 마스터 단일 선택 자동완성(공용).
// MasterMultiSelect의 단일 선택판 — 후보가 수백~수천이라 SelectMenu(평문 select)로는
// 못 쓰는 축에 쓴다(인력 1,255종 등). fetcher만 갈아끼우면 로컬 스냅샷이든 서버 API든 동일.
// 저장은 code(정본), 표시는 name. hint는 동명이의 구분용 보조 텍스트(예: 고급기술자 →
// "역량등급" vs 고급감리원 → "감리원").

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { MasterRef } from "@/lib/data/masters";

/** 후보 한 줄 — hint는 오른쪽에 옅게 붙는 구분 라벨(선택) */
export type MasterOption = MasterRef & { hint?: string };

// auth-card의 inputClass와 동일(형제 폼 필드와 통일)
const searchInputClass =
  "h-[46px] w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export function MasterSearchSelect({
  value,
  onChange,
  fetcher,
  placeholder = "검색해서 선택하세요",
  ariaLabel,
}: {
  value: MasterRef | null;
  onChange: (v: MasterRef | null) => void;
  /** 질의어 → 후보 목록 (로컬 필터든 서버 호출이든) */
  fetcher: (q: string) => Promise<MasterOption[]>;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<MasterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // 검색: 150ms 디바운스. open일 때만 조회.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const t = setTimeout(() => {
      if (alive) setLoading(true);
      fetcher(query)
        .then((list) => {
          if (alive) {
            setResults(list);
            setHighlight(0);
          }
        })
        .finally(() => alive && setLoading(false));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, open, fetcher]);

  // 바깥 클릭 시 닫기 (검색어는 버리고 선택값 표시로 되돌아간다)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (m: MasterOption) => {
    onChange({ code: m.code, name: m.name });
    setOpen(false);
    setQuery("");
  };

  const clear = () => {
    onChange(null);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      // 폼 안에 있으므로 Enter가 제출로 새지 않게 항상 막는다
      e.preventDefault();
      if (open && results[highlight]) pick(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  // 검색 중이면 질의어, 아니면 선택된 이름을 보여준다
  const shown = open ? query : (value?.name ?? "");

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        value={shown}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`${searchInputClass} ${value && !open ? "pr-9 font-medium" : ""}`}
      />

      {/* 선택 해제 — 값이 있고 검색 중이 아닐 때만 */}
      {value && !open && (
        <button
          type="button"
          onClick={clear}
          aria-label={`${value.name} 선택 해제`}
          className="absolute right-2.5 top-1/2 flex size-[18px] -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-3.5" strokeWidth={2.5} />
        </button>
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-surface py-1 shadow-[0px_4px_12px_0px_var(--shadow-10)]"
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
                  aria-selected={m.code === value?.code}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(m)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-slate-600 transition-colors ${
                    i === highlight ? "bg-slate-100" : ""
                  }`}
                >
                  <span className="flex-1 truncate">{m.name}</span>
                  {m.hint && <span className="shrink-0 text-xs text-slate-400">{m.hint}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
