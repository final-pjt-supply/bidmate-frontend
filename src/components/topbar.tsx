import { Bell, ChevronDown } from "lucide-react";

const NAV_ITEMS = ["공고 검색", "맞춤 추천", "비드봇", "이용안내"];

export function Topbar() {
  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
      {/* 브랜드 */}
      <div className="flex items-center">
        <span className="text-2xl font-bold text-indigo-700">비드메이트</span>
      </div>

      {/* 내비게이션 */}
      <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
        {NAV_ITEMS.map((label) => (
          <a
            key={label}
            href="#"
            className="rounded-md px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-slate-100"
          >
            {label}
          </a>
        ))}
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
