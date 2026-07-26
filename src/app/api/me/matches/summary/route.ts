// /me/matches/summary 프록시 — 홈 대시보드 건수(목록 없이 카운트만).
// 브라우저 → (같은 오리진) /api/me/matches/summary → Next 서버 → 백엔드

import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function GET(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return NextResponse.json({ detail: "로그인이 필요합니다" }, { status: 401 });
  try {
    const res = await fetch(`${API_BASE}/me/matches/summary`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body || null, {
      status: res.status,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch (err) {
    console.error("/me/matches/summary 프록시 실패:", err);
    return NextResponse.json({ detail: "서버에 연결할 수 없어요" }, { status: 502 });
  }
}
