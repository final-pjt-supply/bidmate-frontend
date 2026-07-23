// 이벤트 접수 seam (Backend For Frontend).
// 브라우저 → (같은 오리진) /api/events → [지금] 서버 콘솔 로그 / [이후] 백엔드 /events 로 포워딩.
// 같은 오리진이라 CORS·혼합콘텐츠 문제 없음. IP 등 개인정보는 저장/기록하지 않는다.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const parsed = raw ? JSON.parse(raw) : null;
    // 단건 또는 배치({events:[]}) 모두 허용
    const events = Array.isArray(parsed) ? parsed : parsed?.events ?? [parsed];

    for (const e of events) {
      if (!e) continue;
      // 구조화 로그 (IP 등은 기록하지 않음). 백엔드 준비되면 이 자리를 forward로 교체.
      console.log("[event]", JSON.stringify(e));
    }

    // TODO: 백엔드 /events 준비되면 아래 포워딩 활성화
    // await fetch(`${process.env.API_BASE_URL}/events`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: raw,
    // }).catch(() => {});
  } catch {
    // 파싱 실패 등은 무시 — 로깅이 앱 동작을 막지 않게
  }

  return new NextResponse(null, { status: 204 });
}
