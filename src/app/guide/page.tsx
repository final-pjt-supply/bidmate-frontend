import type { Metadata } from "next";
import { DownloadCloud, FileSearch, Target } from "lucide-react";
import { GuideCta } from "@/components/guide-cta";
import { Topbar } from "@/components/topbar";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "이용안내 · 비드프렌드",
  description: "비드프렌드가 나라장터 공고를 수집·분석해 회사 맞춤 공고를 추천하는 방식과 자주 묻는 질문을 안내합니다.",
};

const STEPS = [
  {
    icon: DownloadCloud,
    title: "1. 나라장터 자동 수집",
    desc: "새로 올라오는 입찰공고를 5분 주기로 수집해요. 공고 본문은 물론 첨부문서까지 모두 가져와요.",
  },
  {
    icon: FileSearch,
    title: "2. AI 자격요건 분석",
    desc: "AI가 첨부문서를 읽고 면허·인증·실적 같은 자격요건을 구조화해요. 분석에는 시간이 조금 걸려요.",
  },
  {
    icon: Target,
    title: "3. 회사 맞춤 매칭",
    desc: "등록하신 회사 정보와 비교해 참여 가능한 공고를 골라내고, 항목별 적합도를 점수로 보여드려요.",
  },
];

const USE_STEPS = ["① 무료 회원가입", "② 회사 정보 등록", "③ 맞춤 공고·적합도 확인", "④ 챗봇 질문·스크랩"];

const FAQS = [
  {
    q: "Q. 공고가 실시간으로 올라오나요?",
    a: "나라장터 공고를 5분마다 수집하고, 첨부문서의 자격요건은 AI 분석을 거쳐 제공돼요. 게시 후 표시까지 시간이 걸릴 수 있어요.",
  },
  {
    q: "Q. 적합도는 어떻게 계산되나요?",
    a: "공고에서 추출한 자격요건(업종·지역·실적·인증·규모)을 등록하신 회사 정보와 항목별로 비교해 점수를 매겨요.",
  },
  {
    q: "Q. 분석 결과를 그대로 믿고 입찰해도 되나요?",
    a: "AI 분석은 참고용이에요. 입찰 참여 전에는 반드시 나라장터 원문 공고를 확인해 주세요. 모든 공고 상세에 원문 링크를 제공해요.",
  },
  {
    q: "Q. 이용 요금이 있나요?",
    a: "회원가입과 맞춤 추천, 적합도 확인, 챗봇까지 모두 무료로 이용할 수 있어요.",
  },
];

export default function GuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center px-4 sm:px-6 lg:px-10">
        {/* hero */}
        <section className="flex flex-col items-center gap-2.5 pb-6 pt-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900">비드프렌드 이용안내</h1>
          <p className="text-sm text-gray-500">
            나라장터의 방대한 공고 속에서, 우리 회사가 참여할 수 있는 공고만 골라 보여드려요.
          </p>
        </section>

        {/* 일하는 방식 */}
        <section className="flex w-full flex-col items-center gap-5 pb-6 pt-8">
          <h2 className="text-lg font-bold text-gray-900">비드프렌드가 일하는 방식</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {STEPS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex w-[360px] max-w-full flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-indigo-50">
                  <Icon className="size-5 text-indigo-600" strokeWidth={2} />
                </span>
                <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 이렇게 이용하세요 */}
        <section className="flex w-full flex-col items-center gap-5 py-8">
          <h2 className="text-lg font-bold text-gray-900">이렇게 이용하세요</h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {USE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-4">
                {i > 0 && <span className="text-xs text-gray-500">→</span>}
                <span className="rounded-full border border-slate-200 bg-white px-[18px] py-2.5 text-sm font-bold text-gray-900">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="flex w-full flex-col items-center gap-5 pb-10 pt-6">
          <h2 className="text-lg font-bold text-gray-900">자주 묻는 질문</h2>
          <div className="flex w-full max-w-[880px] flex-col gap-3">
            {FAQS.map(({ q, a }) => (
              <div
                key={q}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-6 py-[18px]"
              >
                <p className="text-[15px] font-bold text-gray-900">{q}</p>
                <p className="text-sm leading-relaxed text-gray-500">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA — 비회원에게만 노출(GuideCta 내부에서 판별) */}
        <GuideCta />
      </main>
      <SiteFooter />
    </div>
  );
}
