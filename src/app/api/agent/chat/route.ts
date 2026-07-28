// /agent/chat 프록시 — 브라우저는 백엔드에 직접 못 닿는다(프라이빗 서브넷).
// 브라우저 → (같은 오리진) /api/agent/chat → Next 서버 → 백엔드 /agent/chat
//
// /api/me·/api/me/scraps와 같은 패턴 — 토큰은 그대로 전달만 하고 저장하지 않는다.
//
// 2026-07-28 백엔드 #69(ADR-22) 이후 이 경로는 인증이 필수다. 회사 식별이
// 요청 본문의 company_id에서 인증 토큰으로 옮겨갔다 — 클라가 company_id를
// 정할 수 있으면 남의 회사 세션을 열람·하이재킹할 수 있기 때문이다.
// 그전까지 이 라우트만 Authorization을 넘기지 않아 401이 나고 있었다.

import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

// 에이전트는 Bedrock 동기 호출이라 수 초 걸린다(실측 2~9초). 기본 타임아웃에
// 걸려 끊기지 않게 넉넉히 두되, 무한정 매달리지는 않는다.
const TIMEOUT_MS = 60_000;

export async function POST(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) {
    return NextResponse.json({ detail: "로그인이 필요합니다" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ detail: "잘못된 요청입니다" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.text();
    // 상태코드를 그대로 넘긴다 — 401(만료), 409(세션 처리 중), 404(없는 세션),
    // 502(에이전트 실패)를 클라이언트가 각각 다르게 안내해야 한다.
    return new NextResponse(body || null, {
      status: res.status,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch (err) {
    // 백엔드가 502로 규약화한 에이전트 실패(Bedrock 장애·키 누락 등)와
    // 연결 자체 실패를 프론트에서 같은 방식으로 안내한다.
    console.error("/agent/chat 프록시 실패:", err);
    return NextResponse.json(
      { detail: "비드봇에 연결할 수 없어요. 잠시 후 다시 시도해 주세요." },
      { status: 502 }
    );
  }
}
