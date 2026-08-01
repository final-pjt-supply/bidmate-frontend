"use client";

// 단일 선택 커스텀 드롭다운 — 네이티브 <select> 대체.
// 상세검색 콤보박스/면허 드롭다운과 동일한 팝오버(rounded-lg·부드러운 그림자·slate-100 hover)로
// 앱 전체 통일. 네이티브와 달리 항상 아래로 열려 방향이 일정하다.

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export type SelectOption = { value: string; label: string };

const triggerClass =
  "flex h-[46px] w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-surface px-3.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400";

export function SelectMenu({
  value,
  onChange,
  options,
  placeholder = "선택하세요",
  disabled = false,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const toggle = () => {
    if (disabled) return;
    setHighlight(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen((o) => !o);
  };
  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open && options[highlight]) choose(options[highlight].value);
      else setOpen(true);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={triggerClass}
      >
        <span className={`truncate ${selected ? "text-gray-900" : "text-slate-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="pointer-events-none size-[18px] shrink-0 text-slate-400" strokeWidth={2} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-surface py-1 shadow-[0px_4px_12px_0px_var(--shadow-10)]"
        >
          {options.length === 0 ? (
            <li className="px-3 py-1.5 text-sm text-slate-400">선택할 항목이 없어요</li>
          ) : (
            options.map((o, i) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => choose(o.value)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                    i === highlight ? "bg-slate-100" : ""
                  } ${o.value === value ? "font-bold text-indigo-700" : "text-slate-600"}`}
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === value && <Check className="size-3.5 shrink-0 text-indigo-600" strokeWidth={2.5} />}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
