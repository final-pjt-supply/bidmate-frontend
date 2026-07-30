import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { BidbotView } from "@/components/bidbot-view";
import { BIDBOT_ENABLED } from "@/lib/features";

export const metadata: Metadata = {
  title: "비드봇 · 비드메이트",
  description: "나라장터 공고 내용·자격요건·마감 일정을 자연어로 물어보는 AI 챗봇, 비드봇.",
};

export default function BidbotPage() {
  // 내비게이션에서 링크를 빼도 URL을 직접 입력하면 들어올 수 있다 — 스위치가
  // 꺼져 있으면 페이지 자체가 없는 것으로 응답한다(#140).
  if (!BIDBOT_ENABLED) notFound();

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Topbar />
      <BidbotView />
    </div>
  );
}
