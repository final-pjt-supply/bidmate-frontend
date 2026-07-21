const HERO_CHIPS = ["IT 유지보수", "건설 공사", "환경 용역", "물품 구매"];

type HomeHeroProps = {
  companyName: string;
  newCount: number;
  urgentCount: number;
  scrapCount: number;
};

export function HomeHero({ companyName, newCount, urgentCount, scrapCount }: HomeHeroProps) {
  const stats = [
    { value: `${newCount}건`, label: "내 맞춤 공고" },
    { value: `${urgentCount}건`, label: "마감 임박" },
    { value: `${scrapCount}건`, label: "스크랩" },
  ];

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
      <span className="relative rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-bold text-indigo-100">
        MY · 맞춤 공고 대시보드
      </span>

      <div className="relative flex w-full flex-col items-center gap-3 text-center">
        <h1 className="text-[40px] font-bold leading-[1.3] text-white">
          {companyName}님, 오늘의 맞춤 공고예요
        </h1>
        <p className="text-[17px] text-indigo-200">
          회사 조건에 맞는 새 공고 {newCount}건이 등록됐어요.
        </p>
      </div>

      <div className="relative flex w-full flex-col items-center gap-3.5">
        <form className="flex w-full max-w-[800px] items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-4 pr-1.5">
          <input
            type="text"
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
          {HERO_CHIPS.map((label) => (
            <button
              key={label}
              type="button"
              className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-medium text-indigo-100 transition-colors hover:bg-white/20"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        {stats.map((stat, i) => (
          <div key={stat.label} className="flex items-center">
            {i > 0 && <div className="h-12 w-px bg-white/20" />}
            <div className="flex flex-col items-center gap-1 px-10 py-4">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className="text-[13px] text-indigo-300">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
