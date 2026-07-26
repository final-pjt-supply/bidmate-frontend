// /bids/{bid_id} 프록시 — 매칭(match)만 클라이언트에서 인증 붙여 다시 받기 위함.
//
// 상세 페이지 본문(공고 정보)은 서버 컴포넌트가 비로그인 상태로 직접 백엔드를 불러
// 캐시한다(SEO·성능, src/lib/api/bids.ts의 getBid). 그 요청엔 브라우저의 Cognito
// 토큰을 실을 수 없어 매칭 결과가 항상 null로 온다.
//
// 그래서 매칭만 이 프록시로 한 번 더 받는다 — 캐시하면 안 된다(회사마다 다른 값이라
// 캐시하면 다른 사용자에게 새어나간다). cache: "no-store"로 항상 새로 받는다.

import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ bid_id: string }> }
) {
  const auth = req.headers.get("Authorization");
  if (!auth) return NextResponse.json({ detail: "로그인이 필요합니다" }, { status: 401 });
  const { bid_id } = await params;
  try {
    const res = await fetch(`${API_BASE}/bids/${encodeURIComponent(bid_id)}`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body || null, {
      status: res.status,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch (err) {
    console.error("/bids/{bid_id} 프록시 실패:", err);
    return NextResponse.json({ detail: "서버에 연결할 수 없어요" }, { status: 502 });
  }
}
