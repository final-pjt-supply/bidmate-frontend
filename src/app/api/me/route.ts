// /me 프록시 — 브라우저는 백엔드에 직접 못 닿는다(프라이빗 서브넷).
// 브라우저 → (같은 오리진) /api/me → Next 서버 → 백엔드 /me
// 토큰은 그대로 전달만 하고 저장하지 않는다. 검증은 백엔드가 한다.

import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://54.180.233.72:8000";

export async function GET(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) {
    return NextResponse.json({ detail: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("/me 프록시 실패:", err);
    return NextResponse.json({ detail: "서버에 연결할 수 없습니다" }, { status: 502 });
  }
}
