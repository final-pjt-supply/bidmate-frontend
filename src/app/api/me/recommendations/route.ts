// /me/recommendations 프록시.
// 브라우저 → 같은 오리진 Route Handler → FastAPI. 토큰은 저장하지 않고 전달만 한다.
import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function GET(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return NextResponse.json({ detail: "로그인이 필요합니다" }, { status: 401 });
  const qs = new URL(req.url).search;
  try {
    const res = await fetch(`${API_BASE}/me/recommendations${qs}`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body || null, {
      status: res.status,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch (err) {
    console.error("/me/recommendations 프록시 실패:", err);
    return NextResponse.json({ detail: "서버에 연결할 수 없어요" }, { status: 502 });
  }
}
