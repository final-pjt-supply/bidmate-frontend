"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown } from "lucide-react";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "공고 검색", href: "#" },
  { label: "맞춤 추천", href: "#" },
  { label: "비드봇", href: "#" },
  { label: "이용안내", href: "/guide" },
];

export function Topbar() {
  const pathname = usePathname();

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

        {/* 알림 + 사용자 */}
        <div className="flex items-center gap-3.5">
          <button type="button" aria-label="알림" className="relative">
            <Bell className="size-[18px] text-gray-700" strokeWidth={2} />
            <span className="absolute -top-2 left-2.5 flex size-[18px] items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              2
            </span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-slate-100 py-1.5 pl-1.5 pr-3"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-indigo-700 text-xs font-bold text-white">
              비
            </span>
            <span className="text-[15px] font-bold text-gray-900">(주)비드메이트</span>
            <ChevronDown className="size-3.5 text-gray-700" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
