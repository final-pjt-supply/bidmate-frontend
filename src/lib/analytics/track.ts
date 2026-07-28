// 사용자 행동 이벤트 수집 모듈 (클라이언트 전용).
// 설계 문서: 노션 "이벤트 로그 스키마 v0.1" / "이벤트 목록 v1" / "트리거 매핑 v1".
// 지금은 우리 /api/events(같은 오리진)로 fire-and-forget 전송 → 백엔드 /events 준비되면 라우트에서 포워딩.

import { getIdToken } from "@/lib/cognito";

const ANON_KEY = "bidmate_anon_id"; // 영구(로그인 전/후 여정 연결)
const VISIT_KEY = "bidmate_visit"; // 방문 세션 {id, last} — 30분 무활동 시 재발급
const VISIT_TTL_MS = 30 * 60 * 1000;

/** 확정된 이벤트 이름(v1) — 오타 방지용 타입 */
export type EventName =
  | "home_viewed"
  | "mypage_viewed"
  | "login_completed"
  | "bid_list_filtered"
  | "bid_impression"
  | "bid_card_clicked"
  | "bid_detail_viewed"
  | "bid_question_clicked"
  | "bid_external_link_clicked"
  | "bid_bookmarked"
  | "search_submitted"
  | "chatbot_opened"
  | "chatbot_message_sent"
  | "signup_completed"
  | "profile_updated"
  | "company_profile_submitted";

type EventPayload = {
  bid_id?: string;
  page?: string;
  properties?: Record<string, unknown>;
};

const isClient = () => typeof window !== "undefined";

function uuid(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();

  // randomUUID는 보안 컨텍스트(HTTPS/localhost)에서만 제공될 수 있다.
  // 공인 IP의 HTTP 환경에서도 백엔드가 요구하는 RFC 4122 UUID v4를 만든다.
  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

/** 새 id 발급 (예: chat_session_id). */
export function newId(prefix = ""): string {
  return `${prefix}${uuid()}`;
}

/** 영구 익명 id — 없으면 발급해 저장 */
function getAnonymousId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = `a_${uuid()}`;
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "a_unknown";
  }
}

/** UUID 형식인지(백엔드 visit_id는 format:uuid 요구) */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 방문 세션 id — 30분 무활동이면 새로 발급, 활동 시각 갱신.
 *  백엔드 스키마가 UUID를 요구하므로 접두사 없는 순수 UUID로 저장한다. */
function getVisitId(): string {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(VISIT_KEY);
    let visit = raw ? (JSON.parse(raw) as { id: string; last: number }) : null;
    // 만료됐거나, 예전 형식(v_ 접두사 등 비UUID)이면 재발급
    if (!visit || now - visit.last > VISIT_TTL_MS || !UUID_RE.test(visit.id)) {
      visit = { id: uuid(), last: now };
    } else {
      visit.last = now;
    }
    localStorage.setItem(VISIT_KEY, JSON.stringify(visit));
    return visit.id;
  } catch {
    return "00000000-0000-4000-8000-000000000000";
  }
}

/** 경로 → 짧은 page 키(백엔드 page ≤40). bid_id는 별도 필드로 나가므로 상세는 패턴키로. */
function pageKey(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/bids/")) return "bid_detail";
  if (pathname.startsWith("/mypage/scraps")) return "scraps";
  if (pathname.startsWith("/mypage/account")) return "account";
  if (pathname.startsWith("/mypage")) return "mypage";
  const known = [
    "search",
    "recommend",
    "bidbot",
    "login",
    "signup",
    "guide",
    "support",
    "privacy",
    "terms",
  ];
  const seg = pathname.split("/")[1] ?? "";
  if (known.includes(seg)) return seg;
  return pathname.slice(0, 40);
}

/** 대략적 디바이스 구분(백엔드 device_type ≤20) */
function deviceType(): string {
  try {
    return window.innerWidth < 768 ? "mobile" : "desktop";
  } catch {
    return "unknown";
  }
}

/** 로그인 사용자 이메일(있으면) — 서버가 company_id로 치환하기 전 임시 참조는 하지 않음.
 *  스키마상 이메일은 보내지 않으므로 여기서는 사용하지 않는다. */

/**
 * 이벤트 전송. fire-and-forget — 실패해도 화면 동작을 막지 않는다.
 * company_id/created_at/id 는 서버가 채우므로 보내지 않는다.
 */
export function logEvent(event: EventName, payload: EventPayload = {}): void {
  if (!isClient()) return;
  try {
    // 백엔드 EventIn 스키마에 맞춘 봉투(additionalProperties:false → 정의된 필드만).
    // 시각(created_at)·id·company_id 는 서버가 채운다.
    const body = JSON.stringify({
      event_name: event,
      anonymous_id: getAnonymousId(),
      visit_id: getVisitId(),
      page: payload.page ?? pageKey(window.location.pathname),
      bid_id: payload.bid_id,
      properties: payload.properties ?? {},
      device_type: deviceType(),
    });

    // sendBeacon은 Authorization 헤더를 지원하지 않는다. 호출부는 기다리지 않되,
    // 로그인 토큰을 붙인 keepalive 요청으로 페이지 이탈 중 전송도 최대한 보장한다.
    void sendEvent(body);
  } catch {
    // 로깅 실패는 무시 (UX 우선)
  }
}

async function sendEvent(body: string): Promise<void> {
  try {
    const token = await getIdToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    await fetch("/api/events", {
      method: "POST",
      headers,
      body,
      keepalive: true,
    });
  } catch {
    // 이벤트 수집 실패가 사용자 동작을 막지 않도록 best-effort로 처리한다.
  }
}
