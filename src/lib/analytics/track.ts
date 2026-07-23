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

/** 방문 세션 id — 30분 무활동이면 새로 발급, 활동 시각 갱신 */
function getVisitId(): string {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(VISIT_KEY);
    let visit = raw ? (JSON.parse(raw) as { id: string; last: number }) : null;
    if (!visit || now - visit.last > VISIT_TTL_MS) {
      visit = { id: `v_${uuid()}`, last: now };
    } else {
      visit.last = now;
    }
    localStorage.setItem(VISIT_KEY, JSON.stringify(visit));
    return visit.id;
  } catch {
    return "v_unknown";
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
    const body = JSON.stringify({
      event,
      ts: new Date().toISOString(),
      anonymous_id: getAnonymousId(),
      visit_id: getVisitId(),
      path: window.location.pathname,
      bid_id: payload.bid_id,
      page: payload.page,
      properties: payload.properties ?? {},
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
