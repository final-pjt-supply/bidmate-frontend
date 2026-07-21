"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "공고 검색", href: "#" },
  { label: "맞춤 추천", href: "#" },
  { label: "비드봇", href: "#" },
  { label: "이용안내", href: "/guide" },
];

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
          {/* ready 전에는 깜빡임을 막기 위해 아무것도 렌더하지 않음 */}
          {ready && user ? (
            <>
              <button type="button" aria-label="알림" className="relative">
                <Bell className="size-[18px] text-gray-700" strokeWidth={2} />
                <span className="absolute -top-2 left-2.5 flex size-[18px] items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  2
                </span>
              </button>
              <button
                type="button"
                onClick={logout}
                title="클릭하면 로그아웃"
                className="flex items-center gap-2 rounded-full bg-slate-100 py-1.5 pl-1.5 pr-3 transition-colors hover:bg-slate-200"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-indigo-700 text-xs font-bold text-white">
                  {user.company.replace(/^\(주\)/, "").charAt(0)}
                </span>
                <span className="text-[15px] font-bold text-gray-900">{user.company}</span>
                <ChevronDown className="size-3.5 text-gray-700" strokeWidth={2} />
              </button>
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
