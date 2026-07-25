// /masters/items 프록시 — 브라우저는 프라이빗 백엔드에 직접 못 닿는다.
// 브라우저 → (같은 오리진) /api/masters/items → Next 서버 → 백엔드 /masters/items
// 토큰은 그대로 전달만 하고 저장하지 않는다. 검증은 백엔드가 한다.
//
// 품목만 API로 온다 — 마스터가 35,171행이라 다른 축처럼 스냅샷을 둘 수 없다.

import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

/** GET — 품목 자동완성. 쿼리스트링(q, limit)은 그대로 넘긴다. */
export async function GET(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return NextResponse.json({ detail: "로그인이 필요합니다" }, { status: 401 });
  const qs = new URL(req.url).search;
  try {
    const res = await fetch(`${API_BASE}/masters/items${qs}`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body || null, {
      status: res.status,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch (err) {
    console.error("/masters/items 프록시 실패:", err);
    return NextResponse.json({ detail: "서버에 연결할 수 없어요" }, { status: 502 });
  }
}
