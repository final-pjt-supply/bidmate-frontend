"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, User, Bookmark, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BIDBOT_ENABLED } from "@/lib/features";

// 비드봇은 미완성이라 스위치가 꺼져 있으면 내비게이션에서 아예 빼둔다(#140).
// 눌러도 안 되는 항목이나 "구현 중입니다" 안내를 남기지 않는다 — 업무 도구에서
// 동작하지 않는 메뉴는 "미완성 서비스"로 읽힌다.
const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "공고 검색", href: "/search" },
  { label: "맞춤 추천", href: "/recommend" },
  { label: "AI 추천", href: "/ai-recommend" },
  ...(BIDBOT_ENABLED ? [{ label: "비드봇", href: "/bidbot" }] : []),
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
          <Link href="/mypage/scraps" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <Bookmark className="size-4 text-slate-500" strokeWidth={2} />
            스크랩한 공고
          </Link>
          {/* 마이페이지 사이드바가 max-md:hidden이라 모바일에선 여기가 계정 설정의
              유일한 진입 경로다. */}
          <Link href="/mypage/account" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <Settings className="size-4 text-slate-500" strokeWidth={2} />
            계정 설정
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
      {/* 좁은 화면에서는 내비게이션을 두 번째 줄로 내린다(#143).
          md 이상에서만 절대 위치로 중앙 정렬한다 — 절대 위치는 left만 주면 쓸 수 있는
          폭이 컨테이너 절반으로 제한돼, 375px에서 항목 4개가 밀려들어가며 글자가 한 글자씩
          쪼개졌다. flex 흐름에서 빠져 있어 로고·프로필을 밀어내지도 못해 그대로 겹쳤다.
          order로 줄을 가르고 마크업은 하나만 둔다 — 복제하면 링크가 두 개씩 잡혀 테스트와
          스크린리더가 모두 어긋난다. */}
      <div className="relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-y-2 px-4 py-4 sm:px-6 lg:px-10">
        {/* 브랜드 */}
        <Link href="/" className="order-1 flex items-center">
          <span className="text-xl font-bold text-indigo-700 sm:text-2xl">비드프렌드</span>
        </Link>

        {/* 내비게이션 */}
        <nav className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 md:order-none md:absolute md:left-1/2 md:mx-0 md:w-auto md:-translate-x-1/2 md:gap-2 md:overflow-visible md:px-0">
          {NAV_ITEMS.map(({ label, href }) => {
            const active =
              href !== "#" && (pathname === href || pathname.startsWith(`${href}/`));
            return (
              <Link
                key={label}
                href={href}
                // 폭이 부족하면 줄바꿈이 아니라 스크롤로 처리한다 — 글자 단위 줄바꿈은
                // 메뉴를 읽을 수 없게 만든다.
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors md:px-4 ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-slate-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* 우측 액션: 로그인 상태에 따라 분기 */}
        <div className="order-2 flex items-center gap-3.5">
          {ready && user ? (
            <UserMenu company={user.company} onLogout={logout} />
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
