"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logEvent } from "@/lib/analytics/track";

/** href를 주면 타일이 링크가 된다 — 건수를 보고 바로 그 목록으로 가게. */
export type HeroStat = { value: string; label: string; href?: string };

// 업종 바로가기 칩 — 클릭 시 상세 검색이 열린 검색 결과로 이동
const HERO_CHIPS: { label: string; cat: string }[] = [
  { label: "공사", cat: "cnstwk" },
  { label: "용역", cat: "servc" },
  { label: "물품", cat: "thng" },
  { label: "외자", cat: "frgcpt" },
];

type HomeHeroProps = {
  badge: string;
  title: string;
  subtitle: string;
  /** 있으면 하단 통계 행 노출(회원 홈). 없으면 미노출(비회원 홈) */
  stats?: HeroStat[];
};

export function HomeHero({ badge, title, subtitle, stats }: HomeHeroProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) logEvent("search_submitted", { properties: { query_len: q.length } });
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-r from-indigo-800 via-indigo-600 to-violet-700 px-4 py-[72px] sm:px-6 lg:px-10">
      {/* 40px 그리드 오버레이 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, rgba(255,255,255,0.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(to bottom, rgba(255,255,255,0.05) 0 1px, transparent 1px 40px)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-8">
        <span className="rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-bold text-indigo-100">
          {badge}
        </span>

        <div className="flex w-full flex-col items-center gap-3 text-center">
          <h1 className="text-[40px] font-bold leading-[1.3] text-white">{title}</h1>
          <p className="text-[17px] text-indigo-200">{subtitle}</p>
        </div>

        <div className="flex w-full flex-col items-center gap-3.5">
          <form
            onSubmit={submit}
            className="flex w-full max-w-[800px] items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-4 pr-1.5"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="공고명을 입력하세요"
              className="min-w-0 flex-1 text-[17px] text-gray-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-800"
            >
              공고 검색
            </button>
          </form>
          <div className="flex items-center gap-2">
            {HERO_CHIPS.map(({ label, cat }) => (
              <Link
                key={cat}
                href={`/search?cat=${cat}`}
                className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-medium text-indigo-100 transition-colors hover:bg-white/20"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {stats && stats.length > 0 && (
          <div className="flex items-center justify-center">
            {stats.map((stat, i) => {
              const inner = (
                <>
                  <span className="text-2xl font-bold text-white">{stat.value}</span>
                  <span className="text-[13px] text-indigo-300">{stat.label}</span>
                </>
              );
              return (
                <div key={stat.label} className="flex items-center">
                  {i > 0 && <div className="h-12 w-px bg-white/20" />}
                  {stat.href ? (
                    <Link
                      href={stat.href}
                      className="flex flex-col items-center gap-1 rounded-lg px-10 py-4 transition-colors hover:bg-white/10"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex flex-col items-center gap-1 px-10 py-4">{inner}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
