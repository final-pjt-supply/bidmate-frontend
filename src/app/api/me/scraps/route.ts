// /me/scraps 프록시 — 브라우저는 프라이빗 백엔드에 직접 못 닿는다.
// 브라우저 → (같은 오리진) /api/me/scraps → Next 서버 → 백엔드 /me/scraps
// 토큰은 그대로 전달만 하고 저장하지 않는다. 검증·회사 귀속은 백엔드가 한다.

import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

/** 인증 헤더를 붙여 백엔드로 그대로 넘기고 응답을 되돌린다. */
async function forward(url: string, init: RequestInit, auth: string | null) {
  if (!auth) return NextResponse.json({ detail: "로그인이 필요합니다" }, { status: 401 });
  try {
    const res = await fetch(url, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: auth },
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body || null, {
      status: res.status,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch (err) {
    console.error("/me/scraps 프록시 실패:", err);
    return NextResponse.json({ detail: "서버에 연결할 수 없어요" }, { status: 502 });
  }
}

/** GET — 내 스크랩 목록. 쿼리스트링(page)은 그대로 넘긴다. */
export async function GET(req: Request) {
  const qs = new URL(req.url).search;
  return forward(`${API_BASE}/me/scraps${qs}`, { method: "GET" }, req.headers.get("Authorization"));
}

/** POST — 담기. { bid_id } 본문을 그대로 전달. */
export async function POST(req: Request) {
  const body = await req.text();
  return forward(
    `${API_BASE}/me/scraps`,
    { method: "POST", body, headers: { "Content-Type": "application/json" } },
    req.headers.get("Authorization")
  );
}
