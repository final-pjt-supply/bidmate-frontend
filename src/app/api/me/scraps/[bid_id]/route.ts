// /me/scraps/{bid_id} 프록시 — 스크랩 빼기(DELETE).
// 브라우저 → /api/me/scraps/{bid_id} → Next 서버 → 백엔드 /me/scraps/{bid_id}

import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ bid_id: string }> }
) {
  const auth = req.headers.get("Authorization");
  if (!auth) return NextResponse.json({ detail: "로그인이 필요합니다" }, { status: 401 });

  const { bid_id } = await params;
  try {
    const res = await fetch(`${API_BASE}/me/scraps/${encodeURIComponent(bid_id)}`, {
      method: "DELETE",
      headers: { Authorization: auth },
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body || null, {
      status: res.status,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch (err) {
    console.error("/me/scraps/{id} 프록시 실패:", err);
    return NextResponse.json({ detail: "서버에 연결할 수 없어요" }, { status: 502 });
  }
}
