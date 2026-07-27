// 이벤트 접수 seam (Backend For Frontend).
// 브라우저 → (같은 오리진) /api/events → 백엔드 /events 로 포워딩.
// 같은 오리진 경유라 CORS·혼합콘텐츠 문제 없음. IP 등 개인정보는 저장/기록하지 않는다.

import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://54.180.233.72:8000";
const isDev = process.env.NODE_ENV !== "production";

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const parsed = raw ? JSON.parse(raw) : null;
    const authorization = req.headers.get("Authorization");
    // 단건 또는 배치({events:[]}) 모두 허용
    const events = Array.isArray(parsed) ? parsed : parsed?.events ?? [parsed];

    // 각 이벤트를 백엔드로 단건 전송하고, 로그인 토큰은 본문이 아닌 헤더로 전달한다.
    const results = await Promise.all(
      events.filter(Boolean).map(async (e: unknown) => {
        const name = (e as { event_name?: string })?.event_name ?? "?";
        try {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (authorization) headers.Authorization = authorization;

          const res = await fetch(`${API_BASE}/events`, {
            method: "POST",
            headers,
            body: JSON.stringify(e),
          });

          if (res.ok) {
            if (isDev) console.log(`[event→backend] ${name} ${res.status}`);
            return { ok: true, status: res.status };
          }

          // 운영에서는 토큰·이벤트 본문을 남기지 않고 상태와 이벤트명만 기록한다.
          console.warn(`[event→backend] ${name} rejected with ${res.status}`);
          if (isDev) {
            const detail = await res.text().catch(() => "");
            console.warn(`[event→backend] response: ${detail.slice(0, 300)}`);
          }
          return { ok: false, status: res.status };
        } catch (err) {
          console.warn(`[event→backend] ${name} forward failed`);
          if (isDev) console.warn(err);
          return { ok: false, status: 502 };
        }
      })
    );

    const failure = results.find((result) => !result.ok);
    if (failure) {
      return new NextResponse(null, { status: failure.status });
    }
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  return new NextResponse(null, { status: 204 });
}
