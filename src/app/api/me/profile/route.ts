// /me/profile 프록시 — 브라우저는 프라이빗 백엔드에 직접 못 닿는다.
// 브라우저 → (같은 오리진) /api/me/profile → Next 서버 → 백엔드 /me/profile
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
    console.error("/me/profile 프록시 실패:", err);
    return NextResponse.json({ detail: "서버에 연결할 수 없어요" }, { status: 502 });
  }
}

/** GET — 내 자격요건 프로필(8개 섹션). 미입력이면 빈 섹션으로 200. */
export async function GET(req: Request) {
  return forward(`${API_BASE}/me/profile`, { method: "GET" }, req.headers.get("Authorization"));
}

/** PUT — 프로필 전체 저장(full replace). 본문을 그대로 전달한다. */
export async function PUT(req: Request) {
  const body = await req.text();
  return forward(
    `${API_BASE}/me/profile`,
    { method: "PUT", body, headers: { "Content-Type": "application/json" } },
    req.headers.get("Authorization")
  );
}
