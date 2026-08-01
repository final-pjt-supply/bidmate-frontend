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
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** 연도 그리드 12칸의 시작 연도 (2024 → 2016, 즉 2016~2027) */
const yearBaseOf = (y: number) => Math.floor(y / 12) * 12;

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

  // 날짜 → 월 → 연 순으로 좁혀 고른다. 헤더의 "2024년 11월"을 누르면 월 선택,
  // 거기서 "2024년"을 누르면 연 선택. 몇 년 전 완료일을 화살표로만 찾으면 한참 걸린다.
  const [mode, setMode] = useState<"day" | "month" | "year">("day");
  const [yearBase, setYearBase] = useState(() => yearBaseOf(view.y));

  /** 열 때마다 선택값의 달로 맞춰 준다(딴 달 보다가 닫았어도 다시 열면 제자리).
   *  effect가 아니라 여는 시점에 처리한다 — 파생 상태를 effect로 동기화하면
   *  렌더가 한 번 더 돈다. */
  const toggle = () => {
    if (open) return setOpen(false);
    if (selected) {
      const [y, m] = selected.split("-").map(Number);
      setView({ y, m });
    }
    setMode("day"); // 항상 날짜 보기로 열린다
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
        placeholder="연도-월-일 (예: 1999-10-21)"
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
        <div className="absolute z-30 mt-1 w-[280px] rounded-xl border border-slate-200 bg-surface p-3 shadow-[0px_8px_24px_0px_var(--shadow-12)]">
          {/* 헤더 — 가운데 라벨을 누르면 한 단계 넓게(날짜→월→연) 고를 수 있다 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-0.5">
              {mode === "day" && (
                <NavBtn onClick={() => moveMonth(-12)} label="이전 해">
                  <ChevronsLeft className="size-4" />
                </NavBtn>
              )}
              <NavBtn
                label={mode === "day" ? "이전 달" : mode === "month" ? "이전 해" : "이전 12년"}
                onClick={() => {
                  if (mode === "day") moveMonth(-1);
                  else if (mode === "month") setView((v) => ({ ...v, y: v.y - 1 }));
                  else setYearBase((b) => b - 12);
                }}
              >
                <ChevronLeft className="size-4" />
              </NavBtn>
            </div>

            <button
              type="button"
              onClick={() => {
                if (mode === "day") setMode("month");
                else if (mode === "month") {
                  setYearBase(yearBaseOf(view.y));
                  setMode("year");
                }
              }}
              disabled={mode === "year"}
              aria-label={mode === "day" ? "월 선택" : mode === "month" ? "연도 선택" : undefined}
              className="rounded-md px-2 py-1 text-sm font-bold text-gray-900 transition-colors enabled:hover:bg-slate-100"
            >
              {mode === "day"
                ? `${view.y}년 ${view.m}월`
                : mode === "month"
                  ? `${view.y}년`
                  : `${yearBase} – ${yearBase + 11}`}
            </button>

            <div className="flex gap-0.5">
              <NavBtn
                label={mode === "day" ? "다음 달" : mode === "month" ? "다음 해" : "다음 12년"}
                onClick={() => {
                  if (mode === "day") moveMonth(1);
                  else if (mode === "month") setView((v) => ({ ...v, y: v.y + 1 }));
                  else setYearBase((b) => b + 12);
                }}
              >
                <ChevronRight className="size-4" />
              </NavBtn>
              {mode === "day" && (
                <NavBtn onClick={() => moveMonth(12)} label="다음 해">
                  <ChevronsRight className="size-4" />
                </NavBtn>
              )}
            </div>
          </div>

          {mode === "day" && (
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
                        ? "bg-brand font-bold text-white"
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
          )}

          {mode === "month" && (
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              {MONTHS.map((m) => {
                const isSel = selected.startsWith(`${view.y}-${pad(m)}`);
                const isNow = view.y === today.getFullYear() && m === today.getMonth() + 1;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setView((v) => ({ ...v, m }));
                      setMode("day");
                    }}
                    className={`flex h-10 items-center justify-center rounded-md text-sm transition-colors ${
                      isSel
                        ? "bg-brand font-bold text-white"
                        : isNow
                          ? "font-bold text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
                          : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {m}월
                  </button>
                );
              })}
            </div>
          )}

          {mode === "year" && (
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => yearBase + i).map((y) => {
                const isSel = selected.startsWith(`${y}-`);
                const isNow = y === today.getFullYear();
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setView((v) => ({ ...v, y }));
                      setMode("month");
                    }}
                    className={`flex h-10 items-center justify-center rounded-md text-sm transition-colors ${
                      isSel
                        ? "bg-brand font-bold text-white"
                        : isNow
                          ? "font-bold text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
                          : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

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
