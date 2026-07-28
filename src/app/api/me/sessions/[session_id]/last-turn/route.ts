// /me/sessions/{id}/last-turn 프록시 — 마지막 질문·답변 취소.
// 브라우저 → (같은 오리진) /api/me/sessions/{id}/last-turn → 백엔드 같은 경로
//
// 대화방 삭제(소프트)와 달리 이건 메시지를 실제로 지운다. 백엔드가 함께
// session_context를 비우므로, 취소한 내용을 에이전트가 계속 기억하지 않는다.
// 404는 두 경우다 — 세션이 없거나(존재 은닉), 취소할 턴이 없는 빈 대화방.

import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const auth = req.headers.get("Authorization");
  if (!auth) {
    return NextResponse.json({ detail: "로그인이 필요합니다" }, { status: 401 });
  }

  const { session_id } = await params;
  try {
    const res = await fetch(
      `${API_BASE}/me/sessions/${encodeURIComponent(session_id)}/last-turn`,
      { method: "DELETE", headers: { Authorization: auth }, cache: "no-store" }
    );
    const body = await res.text();
    if (!body) return new NextResponse(null, { status: res.status });
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("/me/sessions/{id}/last-turn 프록시 실패:", err);
    return NextResponse.json({ detail: "서버에 연결할 수 없어요" }, { status: 502 });
  }
}
