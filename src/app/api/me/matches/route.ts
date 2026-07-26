// /me/matches 프록시 — 브라우저는 프라이빗 백엔드에 직접 못 닿는다.
// 브라우저 → (같은 오리진) /api/me/matches → Next 서버 → 백엔드 /me/matches
// 토큰은 그대로 전달만 하고 저장하지 않는다. 회사 귀속은 백엔드가 한다.

import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

/** GET — 내 공고 매칭 목록. 쿼리스트링(sort, page)은 그대로 넘긴다. */
export async function GET(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return NextResponse.json({ detail: "로그인이 필요합니다" }, { status: 401 });
  const qs = new URL(req.url).search;
  try {
    const res = await fetch(`${API_BASE}/me/matches${qs}`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body || null, {
      status: res.status,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch (err) {
    console.error("/me/matches 프록시 실패:", err);
    return NextResponse.json({ detail: "서버에 연결할 수 없어요" }, { status: 502 });
  }
}
