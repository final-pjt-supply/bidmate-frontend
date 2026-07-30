import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { BidbotView } from "@/components/bidbot-view";
import { BIDBOT_ENABLED } from "@/lib/features";

export const metadata: Metadata = {
  title: "비드봇 · 비드프렌드",
  description: "나라장터 공고 내용·자격요건·마감 일정을 자연어로 물어보는 AI 챗봇, 비드봇.",
};

// 프리렌더로 두면 빌드 시점 결과가 응답에 굳는다(x-nextjs-prerender: 1). 요청마다
// 스위치를 다시 읽게 한다.
//
// 주의: 이것만으로 상태 코드가 404가 되지는 않는다. 루트 src/app/loading.tsx가 모든
// 페이지를 Suspense로 감싸서, Next가 폴백(스켈레톤)을 먼저 흘려보내며 200으로 헤더를
// 확정한 뒤 404 화면을 스트리밍한다 — 배포에서 관측된 "200 + 스켈레톤"의 실제 원인이다.
// 실측: 루트 loading.tsx를 치우면 같은 코드가 404를 반환한다. 상태 코드까지 고치려면
// loading.tsx의 적용 범위를 좁히거나 middleware에서 이 경로를 막아야 한다(범위 밖).
export const dynamic = "force-dynamic";

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
