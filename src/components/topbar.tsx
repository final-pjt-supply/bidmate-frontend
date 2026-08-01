"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, User, Bookmark, Settings, LogOut, X } from "lucide-react";
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

/** 모바일 전용 내비게이션 — 가로 스크롤 대신 햄버거로 연다.
 *  가로 스크롤엔 스크롤 가능 표시가 없어 "화면에 안 보이는 메뉴"로 오인되고,
 *  사이드바가 없는 페이지(마이페이지 등)에서는 그게 유일한 이동 경로라 막힌 것처럼
 *  느껴졌다(사용자 리포트). md 이상에서는 기존 가운데 정렬 내비게이션을 그대로 쓴다. */
function MobileNav({ items, active }: { items: typeof NAV_ITEMS; active: (href: string) => boolean }) {
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

  return (
    <div className="relative md:hidden" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="메뉴 열기"
        className="flex size-9 items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-slate-100"
      >
        {open ? <X className="size-5" strokeWidth={2} /> : <Menu className="size-5" strokeWidth={2} />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-2 w-[200px] rounded-md border border-slate-100 bg-surface p-[5px] shadow-[0px_4px_12px_0px_var(--shadow-10)]"
        >
          {items.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`flex w-full items-center rounded-[4px] px-3 py-2 text-sm transition-colors ${
                active(href)
                  ? "bg-indigo-50 font-bold text-indigo-700"
                  : "font-medium text-slate-700 hover:bg-slate-100"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
        <span className="flex size-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
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
          className="absolute right-0 top-full z-20 mt-2 w-[180px] rounded-md border border-slate-100 bg-surface p-[5px] shadow-[0px_4px_12px_0px_var(--shadow-10)]"
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
  const isActive = (href: string) =>
    href !== "#" && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <header className="w-full border-b border-slate-200 bg-surface">
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        {/* 브랜드 + 모바일 메뉴 버튼 */}
        <div className="flex items-center gap-1">
          {/* 좁은 화면엔 가로 스크롤 대신 햄버거로 연다 — 스크롤은 이동 가능 표시가
              없어 "메뉴가 이게 다인 줄" 오인되고, 사이드바가 없는 페이지(마이페이지 등)
              에서는 그게 유일한 이동 경로라 막힌 것처럼 느껴졌다. */}
          <MobileNav items={NAV_ITEMS} active={isActive} />
          <Link href="/" className="flex items-center">
            {/* 워드마크는 영문, 서술 문장은 한글(페이지 타이틀·약관 등). 푸터도 영문이라
                헤더/푸터 워드마크가 이걸로 통일된다. */}
            <span className="text-xl font-bold text-indigo-700 sm:text-2xl">BidFriend</span>
          </Link>
        </div>

        {/* 내비게이션 — md 이상에서만, 가운데 절대 정렬 */}
        <nav className="hidden items-center gap-2 md:absolute md:left-1/2 md:flex md:-translate-x-1/2">
          {NAV_ITEMS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={`shrink-0 whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive(href) ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-slate-100"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* 우측 액션: 로그인 상태에 따라 분기 */}
        <div className="flex items-center gap-3.5">
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
                className="flex h-8 items-center rounded-md bg-brand px-3 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
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
