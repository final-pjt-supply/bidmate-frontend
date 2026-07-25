"use client";

// 날짜 입력(공용) — 직접 타이핑 + 캘린더 선택 둘 다 지원.
// 브라우저 기본 <input type="date">를 쓰지 않는 이유:
//  - OS/브라우저마다 생김새와 폭이 달라 옆 칸과 높이·정렬이 어긋난다
//  - 기본 캘린더 팝업을 앱 톤에 맞출 수 없다
//  - placeholder를 못 넣어 빈 칸에 "yyyy-mm-dd"가 검은 글씨로 박힌다
// value는 타이핑 중간값("2024-1")도 그대로 들고 있고, 완성·유효 판정은
// isValidDate로 호출부가 한다(사업자등록번호를 다루는 방식과 동일).

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
/** 그 달의 마지막 날 (다음 달 0일 = 이번 달 말일) */
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

/** 숫자만 남겨 "YYYY-MM-DD" 꼴로 정리 (입력 중 부분값도 자연스럽게) */
export function formatDateInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

/** 완성된 실제 날짜인지 (2024-02-31 같은 값은 false) */
export function isValidDate(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12) return false;
  if (y < 1900 || y > 2200) return false;
  return d >= 1 && d <= daysInMonth(y, mo);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function DateField({
  value,
  onChange,
  ariaLabel,
  className = "",
  invalid = false,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
  className?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const selected = isValidDate(value) ? value : "";

  // 캘린더가 펼쳐 보여줄 달 — 선택값이 있으면 그 달, 없으면 이번 달
  const [view, setView] = useState(() => {
    if (isValidDate(value)) {
      const [y, m] = value.split("-").map(Number);
      return { y, m };
    }
    return { y: today.getFullYear(), m: today.getMonth() + 1 };
  });

  /** 열 때마다 선택값의 달로 맞춰 준다(딴 달 보다가 닫았어도 다시 열면 제자리).
   *  effect가 아니라 여는 시점에 처리한다 — 파생 상태를 effect로 동기화하면
   *  렌더가 한 번 더 돈다. */
  const toggle = () => {
    if (open) return setOpen(false);
    if (selected) {
      const [y, m] = selected.split("-").map(Number);
      setView({ y, m });
    }
    setOpen(true);
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const moveMonth = (delta: number) => {
    setView((v) => {
      const m0 = v.m - 1 + delta;
      return { y: v.y + Math.floor(m0 / 12), m: ((m0 % 12) + 12) % 12 + 1 };
    });
  };

  const pick = (d: number) => {
    onChange(iso(view.y, view.m, d));
    setOpen(false);
  };

  // 1일이 무슨 요일인지만큼 앞을 비운다
  const lead = new Date(view.y, view.m - 1, 1).getDay();
  const total = daysInMonth(view.y, view.m);
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  const todayISO = iso(today.getFullYear(), today.getMonth() + 1, today.getDate());

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(formatDateInput(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          // 폼 안이라 Enter가 제출로 새지 않게 막고 캘린더만 닫는다
          if (e.key === "Enter" && open) {
            e.preventDefault();
            setOpen(false);
          }
        }}
        inputMode="numeric"
        placeholder="연도-월-일"
        aria-label={ariaLabel}
        aria-invalid={invalid}
        className={`h-[46px] w-full rounded-lg border px-3.5 pr-10 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${
          invalid ? "border-rose-400" : "border-gray-300"
        }`}
      />

      <button
        type="button"
        onClick={toggle}
        aria-label="캘린더 열기"
        aria-expanded={open}
        className={`absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors hover:bg-slate-100 ${
          open ? "bg-slate-100 text-indigo-600" : "text-slate-400"
        }`}
      >
        <Calendar className="size-4" strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]">
          {/* 헤더 — 연/월 이동. 완료일은 몇 년 전인 경우가 많아 연 이동도 둔다 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-0.5">
              <NavBtn onClick={() => moveMonth(-12)} label="이전 해">
                <ChevronsLeft className="size-4" />
              </NavBtn>
              <NavBtn onClick={() => moveMonth(-1)} label="이전 달">
                <ChevronLeft className="size-4" />
              </NavBtn>
            </div>
            <span className="text-sm font-bold text-gray-900">
              {view.y}년 {view.m}월
            </span>
            <div className="flex gap-0.5">
              <NavBtn onClick={() => moveMonth(1)} label="다음 달">
                <ChevronRight className="size-4" />
              </NavBtn>
              <NavBtn onClick={() => moveMonth(12)} label="다음 해">
                <ChevronsRight className="size-4" />
              </NavBtn>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-7 gap-y-1">
            {WEEKDAYS.map((w, i) => (
              <span
                key={w}
                className={`flex h-7 items-center justify-center text-xs font-medium ${
                  i === 0 ? "text-rose-400" : i === 6 ? "text-sky-500" : "text-slate-400"
                }`}
              >
                {w}
              </span>
            ))}

            {cells.map((d, i) => {
              if (d === null) return <span key={`b${i}`} />;
              const cur = iso(view.y, view.m, d);
              const isSel = cur === selected;
              const isToday = cur === todayISO;
              const dow = i % 7;
              return (
                <button
                  key={cur}
                  type="button"
                  onClick={() => pick(d)}
                  aria-label={`${view.y}년 ${view.m}월 ${d}일`}
                  aria-current={isToday ? "date" : undefined}
                  className={`mx-auto flex size-8 items-center justify-center rounded-md text-sm transition-colors ${
                    isSel
                      ? "bg-indigo-700 font-bold text-white"
                      : isToday
                        ? "font-bold text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
                        : `hover:bg-slate-100 ${
                            dow === 0 ? "text-rose-400" : dow === 6 ? "text-sky-500" : "text-slate-700"
                          }`
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 flex justify-between border-t border-slate-100 pt-2.5">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100"
            >
              지우기
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(todayISO);
                setOpen(false);
              }}
              className="rounded-md px-2 py-1 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-50"
            >
              오늘
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
    >
      {children}
    </button>
  );
}
