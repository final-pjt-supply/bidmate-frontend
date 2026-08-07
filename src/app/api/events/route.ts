// 이벤트 접수 seam (Backend For Frontend).
// 브라우저 → (같은 오리진) /api/events → 백엔드 /events 로 포워딩.
// 같은 오리진 경유라 CORS·혼합콘텐츠 문제 없음. IP 등 개인정보는 저장/기록하지 않는다.

import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";
const isDev = process.env.NODE_ENV !== "production";

// 입력 상한 — 이벤트 하나는 보통 수백 바이트라 정상 배치(≤20건)는 넉넉히 든다.
// 무제한이면 요청 한 번으로 백엔드 인메모리 버퍼·S3 비용을 밀어붙일 수 있다.
const MAX_BODY_BYTES = 64 * 1024; // 64KB
const MAX_EVENTS = 20; // 한 요청당 이벤트 개수 상한

export async function POST(req: Request) {
  try {
    const raw = await req.text();

    // 본문 크기 상한 — 파싱 전에 막아 거대한 본문을 처리하지 않는다.
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 413 }); // Payload Too Large
    }

    let parsed: unknown;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      return new NextResponse(null, { status: 400 }); // 잘못된 JSON
    }

    const authorization = req.headers.get("Authorization");
    // 단건 또는 배치({events:[]}) 모두 허용
    const batch = Array.isArray(parsed)
      ? parsed
      : (parsed as { events?: unknown[] } | null)?.events ?? [parsed];
    const events = batch.filter(Boolean);

    // 개수 상한 — 한 요청으로 백엔드에 대량 전송하는 것을 막는다.
    if (events.length > MAX_EVENTS) {
      return new NextResponse(null, { status: 422 }); // 너무 많은 이벤트
    }

    // 각 이벤트를 백엔드로 단건 전송하고, 로그인 토큰은 본문이 아닌 헤더로 전달한다.
    const results = await Promise.all(
      events.map(async (e: unknown) => {
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
