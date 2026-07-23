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
    // 단건 또는 배치({events:[]}) 모두 허용
    const events = Array.isArray(parsed) ? parsed : parsed?.events ?? [parsed];

    // fire-and-forget: 실패해도 사용자 동작을 막지 않는다. 각 이벤트를 백엔드로 단건 전송.
    await Promise.all(
      events.filter(Boolean).map(async (e: unknown) => {
        try {
          const res = await fetch(`${API_BASE}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(e),
          });
          if (isDev) {
            const name = (e as { event_name?: string })?.event_name ?? "?";
            if (res.ok) {
              console.log(`[event→backend] ${name} ${res.status}`);
            } else {
              // 스키마 불일치(422) 등은 개발 중에만 본문까지 찍어 디버깅
              const detail = await res.text().catch(() => "");
              console.warn(`[event→backend] ${name} ${res.status} ${detail.slice(0, 300)}`);
            }
          }
        } catch (err) {
          if (isDev) console.warn("[event→backend] forward failed:", err);
        }
      })
    );
  } catch {
    // 파싱 실패 등은 무시 — 로깅이 앱 동작을 막지 않게
  }

  return new NextResponse(null, { status: 204 });
}
