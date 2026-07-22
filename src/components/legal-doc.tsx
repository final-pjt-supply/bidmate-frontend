import { Topbar } from "@/components/topbar";
import { SiteFooter } from "@/components/site-footer";

export type LegalTable = {
  headers: string[];
  rows: string[][];
};

export type LegalSection = {
  heading: string;
  /** 각 문자열이 한 문단(또는 조항 목록의 한 줄). 표 앞에 표시 */
  lines?: string[];
  /** 조항 내 표 (있으면 lines 다음에 표시) */
  table?: LegalTable;
  /** 표 뒤에 이어지는 문단 */
  linesAfter?: string[];
};

type LegalDocProps = {
  title: string;
  effectiveDate: string;
  /** 제목 아래 도입 문단(선택) */
  intro?: string;
  sections: LegalSection[];
};

function Paragraphs({ lines }: { lines?: string[] }) {
  if (!lines) return null;
  return (
    <>
      {lines.map((line, i) => (
        <p key={i} className="text-sm leading-relaxed text-gray-500">
          {line}
        </p>
      ))}
    </>
  );
}

/** 이용약관·개인정보처리방침 등 법적 문서 공용 레이아웃 (Figma doc-wrap) */
export function LegalDoc({ title, effectiveDate, intro, sections }: LegalDocProps) {
  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Topbar />
      <main className="w-full flex-1 bg-white">
        <div className="mx-auto flex w-full max-w-[800px] flex-col px-4 pb-[72px] pt-14 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-3 text-[11.5px] text-gray-500">{effectiveDate}</p>
          {intro && <p className="mt-4 text-sm leading-relaxed text-gray-500">{intro}</p>}
          {sections.map((s) => (
            <section key={s.heading} className="mt-6 flex flex-col gap-2">
              <h2 className="text-[15px] font-bold text-gray-900">{s.heading}</h2>
              <Paragraphs lines={s.lines} />
              {s.table && (
                <div className="mt-1 overflow-x-auto">
                  <table className="w-full border-collapse text-sm text-gray-600">
                    <thead>
                      <tr>
                        {s.table.headers.map((h) => (
                          <th
                            key={h}
                            className="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[13px] font-bold text-gray-900"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className="border border-slate-200 px-3 py-2 align-top leading-relaxed"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Paragraphs lines={s.linesAfter} />
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
