const FOOTER_LINKS = ["이용약관", "개인정보처리방침", "고객센터"];

export function SiteFooter() {
  return (
    <footer className="relative flex w-full items-center justify-between bg-slate-800 px-10 py-9">
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
    </footer>
  );
}
