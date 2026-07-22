import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "고객센터 · 비드메이트",
  description: "비드메이트 고객센터는 준비 중입니다. 급한 문의는 bidmatefinal@gmail.com 로 보내주세요.",
};

export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="flex w-full flex-1 flex-col items-center gap-3.5 bg-white px-4 pb-40 pt-36 text-center sm:px-6">
        <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
          <Wrench className="size-[22px] text-indigo-600" strokeWidth={2} />
        </span>
        <h1 className="text-lg font-bold text-gray-900">고객센터는 아직 구현 중입니다</h1>
        <p className="text-sm leading-relaxed text-gray-500">
          더 나은 문의 경험을 준비하고 있어요. 급한 문의는{" "}
          <a
            href="mailto:bidmatefinal@gmail.com"
            className="font-medium text-indigo-700 transition-colors hover:text-indigo-800"
          >
            bidmatefinal@gmail.com
          </a>{" "}
          로 보내주세요.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
