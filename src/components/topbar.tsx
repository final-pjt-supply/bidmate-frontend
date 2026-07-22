"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, User, Bookmark, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "공고 검색", href: "/search" },
  { label: "맞춤 추천", href: "/recommend" },
  { label: "비드봇", href: "/bidbot" },
  { label: "이용안내", href: "/guide" },
];

/** 회원 유저 pill + 드롭다운 메뉴 (Figma user-menu 248:1012) */
function UserMenu({ company, onLogout }: { company: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex select-none items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition-colors ${
          open ? "bg-slate-200" : "bg-slate-100 hover:bg-slate-200"
        }`}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-indigo-700 text-xs font-bold text-white">
          {company.replace(/^\(주\)/, "").charAt(0)}
        </span>
        <span className="text-[15px] font-bold text-gray-900">{company}</span>
        <ChevronDown
          className={`size-3.5 text-gray-700 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-[180px] rounded-md border border-slate-100 bg-white p-[5px] shadow-[0px_4px_12px_0px_rgba(0,0,0,0.1)]"
        >
          <Link href="/mypage" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <User className="size-4 text-slate-500" strokeWidth={2} />
            마이페이지
          </Link>
          <Link href="#" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <Bookmark className="size-4 text-slate-500" strokeWidth={2} />
            스크랩한 공고
          </Link>
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className={itemClass}
          >
            <LogOut className="size-4 text-slate-500" strokeWidth={2} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const { user, ready, logout } = useAuth();

  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        {/* 브랜드 */}
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-bold text-indigo-700">비드메이트</span>
        </Link>

        {/* 내비게이션 */}
        <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
          {NAV_ITEMS.map(({ label, href }) => {
            const active = href !== "#" && pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-slate-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* 우측 액션: 로그인 상태에 따라 분기 */}
        <div className="flex items-center gap-3.5">
          {ready && user ? (
            <>
              <button type="button" aria-label="알림" className="relative">
                <Bell className="size-[18px] text-gray-700" strokeWidth={2} />
                <span className="absolute -top-2 left-2.5 flex size-[18px] items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  2
                </span>
              </button>
              <UserMenu company={user.company} onLogout={logout} />
            </>
          ) : ready ? (
            <>
              <Link
                href="/login"
                className="flex h-8 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="flex h-8 items-center rounded-md bg-indigo-700 px-3 text-sm font-medium text-white transition-colors hover:bg-indigo-800"
              >
                회원가입
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
