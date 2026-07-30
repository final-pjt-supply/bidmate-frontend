import Link from "next/link";

// 출시 직후 사용자 의견을 받는 구글 폼. 서비스 안에 폼을 만들지 않은 이유는
// 응답이 몇 건일지 모르는 단계에서 입력·저장·조회 화면을 만드는 비용이 크기 때문이다.
const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfZ9EJ0JCH3LfsCzW6I_kpKz0Xt8HX0PHxfFMwbMUGq9V35dQ/viewform";

const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: "이용약관", href: "/terms" },
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "고객센터", href: "/support" },
];

export function SiteFooter() {
  return (
    <footer className="w-full bg-slate-800">
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-9 sm:px-6 lg:px-10">
        <span className="text-[15px] font-bold text-indigo-400">BidMate</span>
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11.5px] text-slate-400">
          © 2026 BidMate · 나라장터 공공입찰 공고 추천 서비스
        </span>
        <div className="flex gap-5 text-[11.5px] text-slate-400">
          {FOOTER_LINKS.map(({ label, href }) => (
            <Link key={label} href={href} className="transition-colors hover:text-slate-200">
              {label}
            </Link>
          ))}
          {/*
            외부 링크라 Link가 아니라 a로 둔다. 새 탭으로 열어 작성 중이던 화면을
            잃지 않게 하고, noopener로 열린 탭이 이 페이지를 조작하지 못하게 막는다.
          */}
          <a
            href={FEEDBACK_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-slate-200"
          >
            의견 보내기
          </a>
        </div>
      </div>
    </footer>
  );
}
