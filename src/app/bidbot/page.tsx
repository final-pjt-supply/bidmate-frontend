import type { Metadata } from "next";
import { Topbar } from "@/components/topbar";
import { BidbotView } from "@/components/bidbot-view";

export const metadata: Metadata = {
  title: "비드봇 · 비드메이트",
  description: "나라장터 공고 내용·자격요건·마감 일정을 자연어로 물어보는 AI 챗봇, 비드봇.",
};

export default function BidbotPage() {
  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Topbar />
      <BidbotView />
    </div>
  );
}
