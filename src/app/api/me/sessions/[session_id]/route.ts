// /me/sessions/{id} 프록시 — 세션 상세(메시지 전체, 시간순).
// 브라우저 → (같은 오리진) /api/me/sessions/{id} → Next 서버 → 백엔드 /me/sessions/{id}
//
// 없는 세션과 남의 회사 세션 모두 백엔드가 404로 통일해 돌려준다(존재 은닉).
// 여기서는 상태코드를 그대로 중계해 클라가 "대화를 찾을 수 없다"로 안내하게 한다.

import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function GET(
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
      `${API_BASE}/me/sessions/${encodeURIComponent(session_id)}`,
      { headers: { Authorization: auth }, cache: "no-store" }
    );
    const body = await res.text();
    return new NextResponse(body || null, {
      status: res.status,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch (err) {
    console.error("/me/sessions/{id} 프록시 실패:", err);
    return NextResponse.json({ detail: "서버에 연결할 수 없어요" }, { status: 502 });
  }
}
