import { Topbar } from "@/components/topbar";
import { SiteFooter } from "@/components/site-footer";

export type LegalSection = {
  heading: string;
  /** 각 문자열이 한 문단(또는 조항 목록의 한 줄) */
  lines: string[];
};

type LegalDocProps = {
  title: string;
  effectiveDate: string;
  sections: LegalSection[];
};

/** 이용약관·개인정보처리방침 등 법적 문서 공용 레이아웃 (Figma doc-wrap) */
export function LegalDoc({ title, effectiveDate, sections }: LegalDocProps) {
  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Topbar />
      <main className="w-full flex-1 bg-white">
        <div className="mx-auto flex w-full max-w-[800px] flex-col px-4 pb-[72px] pt-14 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-3 text-[11.5px] text-gray-500">{effectiveDate}</p>
          {sections.map((s) => (
            <section key={s.heading} className="mt-6 flex flex-col gap-2">
              <h2 className="text-[15px] font-bold text-gray-900">{s.heading}</h2>
              {s.lines.map((line, i) => (
                <p key={i} className="text-sm leading-relaxed text-gray-500">
                  {line}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
