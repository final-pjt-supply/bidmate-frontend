// /me/sessions/{id} 프록시 — GET=세션 상세(메시지 전체, 시간순), DELETE=대화방 삭제.
// 브라우저 → (같은 오리진) /api/me/sessions/{id} → Next 서버 → 백엔드 /me/sessions/{id}
//
// 없는 세션과 남의 회사 세션 모두 백엔드가 404로 통일해 돌려준다(존재 은닉).
// 여기서는 상태코드를 그대로 중계해 클라가 "대화를 찾을 수 없다"로 안내하게 한다.
// 삭제는 소프트 삭제(백엔드가 deleted_at만 기록)라 204에 본문이 없다.

import { NextResponse } from "next/server";
import { BIDBOT_ENABLED } from "@/lib/features";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

async function proxy(
  req: Request,
  params: Promise<{ session_id: string }>,
  method: "GET" | "DELETE"
) {
  // 비드봇이 꺼져 있으면 이 경로는 없는 것으로 응답한다 — 화면에서 버튼만 숨기면
  // URL을 아는 사람은 그대로 호출할 수 있다(#140). 인증 확인보다 먼저 막는다.
  if (!BIDBOT_ENABLED) return NextResponse.json({ detail: "Not Found" }, { status: 404 });

  const auth = req.headers.get("Authorization");
  if (!auth) {
    return NextResponse.json({ detail: "로그인이 필요합니다" }, { status: 401 });
  }

  const { session_id } = await params;
  try {
    const res = await fetch(
      `${API_BASE}/me/sessions/${encodeURIComponent(session_id)}`,
      { method, headers: { Authorization: auth }, cache: "no-store" }
    );
    const body = await res.text();
    // 삭제 성공은 204(본문 없음) — 빈 본문에 Content-Type을 붙이지 않는다(/api/me와 동일).
    if (!body) return new NextResponse(null, { status: res.status });
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`/me/sessions/{id}(${method}) 프록시 실패:`, err);
    return NextResponse.json({ detail: "서버에 연결할 수 없어요" }, { status: 502 });
  }
}

export const GET = (req: Request, ctx: { params: Promise<{ session_id: string }> }) =>
  proxy(req, ctx.params, "GET");

export const DELETE = (req: Request, ctx: { params: Promise<{ session_id: string }> }) =>
  proxy(req, ctx.params, "DELETE");
