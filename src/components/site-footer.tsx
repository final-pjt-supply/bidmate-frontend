const FOOTER_LINKS = ["이용약관", "개인정보처리방침", "고객센터"];

export function SiteFooter() {
  return (
    <footer className="w-full bg-slate-800">
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-9 sm:px-6 lg:px-10">
        <span className="text-[15px] font-bold text-indigo-400">BidMate</span>
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11.5px] text-slate-400">
          © 2026 BidMate · 나라장터 공공입찰 공고 추천 서비스
        </span>
        <div className="flex gap-5 text-[11.5px] text-slate-400">
          {FOOTER_LINKS.map((label) => (
            <a key={label} href="#" className="transition-colors hover:text-slate-200">
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
