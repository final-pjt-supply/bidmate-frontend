"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Topbar } from "@/components/topbar";
import { SiteFooter } from "@/components/site-footer";

const MENU = [
  { label: "회사 정보", href: "/mypage" },
  { label: "스크랩한 공고", href: "/mypage/scraps" },
  { label: "계정 설정", href: "/mypage/account" },
];

/**
 * 마이페이지 공용 레이아웃: 페이지 제목 + [사이드바 | 콘텐츠].
 * 사이드바 카드와 콘텐츠 박스의 상단이 정렬되도록 제목은 두 열 위에 배치.
 */
export function MypageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // 회원 전용 가드
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) return null;

  const initial = user.company.replace(/^\(주\)/, "").charAt(0);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>

        <div className="flex flex-1 items-start gap-6">
          {/* 사이드바 */}
          <aside className="flex h-fit w-60 shrink-0 flex-col gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-[18px] max-md:hidden">
            <div className="flex items-center gap-2.5 px-2 pb-3.5 pt-1.5">
              <span className="flex size-10 items-center justify-center rounded-full bg-indigo-50 text-[15px] font-bold text-indigo-800">
                {initial}
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-bold text-gray-900">{user.company}</span>
                <span className="truncate text-[11.5px] text-slate-400">{user.email}</span>
              </div>
            </div>
            <div className="h-px w-full bg-slate-200" />
            {MENU.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`w-full rounded-lg px-3 py-[11px] text-left transition-colors ${
                    active
                      ? "bg-indigo-50 text-[15px] font-bold text-indigo-700"
                      : "text-sm font-medium text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </aside>

          {/* 콘텐츠 */}
          <section className="flex min-w-0 flex-1 flex-col gap-4">{children}</section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
