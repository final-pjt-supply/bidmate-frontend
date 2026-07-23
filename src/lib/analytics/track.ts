// 사용자 행동 이벤트 수집 모듈 (클라이언트 전용).
// 설계 문서: 노션 "이벤트 로그 스키마 v0.1" / "이벤트 목록 v1" / "트리거 매핑 v1".
// 지금은 우리 /api/events(같은 오리진)로 fire-and-forget 전송 → 백엔드 /events 준비되면 라우트에서 포워딩.

const ANON_KEY = "bidmate_anon_id"; // 영구(로그인 전/후 여정 연결)
const VISIT_KEY = "bidmate_visit"; // 방문 세션 {id, last} — 30분 무활동 시 재발급
const VISIT_TTL_MS = 30 * 60 * 1000;

/** 확정된 이벤트 이름(v1) — 오타 방지용 타입 */
export type EventName =
  | "home_viewed"
  | "mypage_viewed"
  | "login_completed"
  | "bid_list_filtered"
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
  if (isClient() && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

    // 페이지 이탈 중이어도 유실 없이 보내도록 sendBeacon 우선, 실패 시 fetch(keepalive)
    const url = "/api/events";
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      if (ok) return;
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 로깅 실패는 무시 (UX 우선)
  }
}
