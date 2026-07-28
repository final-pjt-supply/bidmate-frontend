"use client";

import { useCallback, useRef, useState } from "react";
import type { BidCategory } from "@/lib/types";
import { logEvent } from "@/lib/analytics/track";
import { getIdToken } from "@/lib/cognito";

/** 백엔드 AgentChatResponse의 근거 인용. */
export type Citation = {
  bid_id: string;
  file_id: string;
  chunk_idx: number;
  text: string;
};

/**
 * 에이전트는 세 가지로 답한다.
 *  - answer   : 답변 + 근거 인용
 *  - clarify  : 되묻기(조건이 모호할 때)
 *  - redirect : "이건 목록으로 보여줄 질문" — answer가 비어 있으므로 별도 UI가 필요하다
 */
type AgentAction = "answer" | "redirect" | "clarify";

type AgentResponse = {
  session_id: string;
  action: AgentAction;
  answer?: string | null;
  clarify_message?: string | null;
  redirect_filters?: {
    region?: string | null;
    category?: string | null;
    deadline_within_days?: number | null;
    budget_min?: number | null;
    budget_max?: number | null;
    bid_ids?: string[] | null;
  } | null;
  citations?: Citation[];
};

export type ChatMessage = {
  role: "user" | "bot";
  text: string;
  /** 봇 메시지 종류 — 목록 이동 버튼·에러 표시를 구분한다. */
  kind?: "answer" | "clarify" | "redirect" | "error";
  /** kind가 redirect일 때 이동할 검색 URL. */
  href?: string;
  citations?: Citation[];
};

/** GET /me/sessions 의 목록 항목. title은 첫 질문으로 백엔드가 자동 생성한다. */
export type ChatSession = {
  session_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

/** GET /me/sessions/{id} 의 메시지. assistant는 response_meta에 부가정보가 온다. */
type StoredMessage = {
  role: "user" | "assistant";
  content: string | null;
  response_meta?: {
    action?: AgentAction;
    citations?: Citation[];
    redirect_filters?: AgentResponse["redirect_filters"];
  } | null;
  created_at: string;
};

const CATEGORIES: BidCategory[] = ["cnstwk", "servc", "thng", "frgcpt"];

/**
 * 에이전트가 준 필터를 검색 URL로 옮긴다.
 *
 * 에이전트는 지역·예산·마감기한·특정 공고 목록까지 돌려주지만 검색 화면이 받는 건
 * 업무구분뿐이다. 나머지는 상세검색에 해당 필터가 붙는 대로 연결한다(#68).
 */
function toSearchHref(filters: AgentResponse["redirect_filters"]): string {
  const cat = filters?.category;
  return cat && (CATEGORIES as string[]).includes(cat) ? `/search?cat=${cat}` : "/search";
}

/**
 * 실패 상태코드 → 사용자 안내 문구.
 *
 * 백엔드가 상황별로 코드를 나눠주므로(#69, ADR-22) 전부 "실패했어요"로 뭉뚱그리지
 * 않는다 — 409는 기다리면 되고, 401은 다시 로그인해야 하는 서로 다른 상황이다.
 */
function errorTextFor(status: number): string {
  switch (status) {
    case 401:
      return "로그인이 만료됐어요. 다시 로그인해 주세요.";
    case 409:
      // 세션당 1턴 — 앞 질문의 답변이 아직 생성 중이다.
      return "앞선 질문에 답하는 중이에요. 잠시 후 다시 보내주세요.";
    case 404:
      // 세션이 없거나 다른 회사 소유(존재 은닉). 이어붙일 대화가 없으니 새로 시작한다.
      return "대화를 이어가지 못했어요. 새 대화로 다시 물어봐 주세요.";
    default:
      return "답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
}

/** 인증 헤더. 토큰이 없으면(비로그인·만료) null. */
async function authHeader(): Promise<Record<string, string> | null> {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

/**
 * 저장된 메시지 → 화면 메시지.
 *
 * 저장 형식과 화면 형식이 다르다. 백엔드는 role을 assistant로, 답변 종류를
 * response_meta.action으로 남기는데 화면은 role=bot / kind를 쓴다. redirect는
 * content가 비어 오므로(에이전트가 답변 대신 필터를 준다) 안내 문구를 여기서
 * 다시 만든다 — toBotMessage와 같은 규칙이다.
 */
function toChatMessage(m: StoredMessage): ChatMessage {
  if (m.role === "user") return { role: "user", text: m.content ?? "" };

  const action = m.response_meta?.action ?? "answer";
  if (action === "redirect") {
    return {
      role: "bot",
      kind: "redirect",
      text: m.content || "조건에 맞는 공고를 목록에서 보여드릴게요.",
      href: toSearchHref(m.response_meta?.redirect_filters ?? null),
    };
  }
  return {
    role: "bot",
    kind: action === "clarify" ? "clarify" : "answer",
    text: m.content ?? "",
    citations: m.response_meta?.citations,
  };
}

/** 응답 → 화면에 그릴 봇 메시지. */
function toBotMessage(res: AgentResponse): ChatMessage {
  if (res.action === "redirect") {
    return {
      role: "bot",
      kind: "redirect",
      text: "조건에 맞는 공고를 목록에서 보여드릴게요.",
      href: toSearchHref(res.redirect_filters),
    };
  }
  if (res.action === "clarify") {
    return {
      role: "bot",
      kind: "clarify",
      text: res.clarify_message || "조금 더 자세히 알려주시겠어요?",
    };
  }
  return {
    role: "bot",
    kind: "answer",
    text: res.answer || "답변을 만들지 못했어요. 질문을 조금 바꿔서 다시 물어봐 주세요.",
    citations: res.citations,
  };
}

/**
 * 비드봇 대화 상태 — 전용 페이지와 공고 상세 플로팅이 함께 쓴다.
 *
 * 두 화면에 같은 로직을 복사해 두면 한쪽만 고치는 사고가 난다(검색 조건 유실 #66이
 * 그 사례였다). 전송·세션·로딩을 여기 한 곳에 둔다.
 */
export function useBidbotChat({
  entryBidId,
}: {
  /** 공고 상세에서 열었을 때 그 공고를 문맥으로 넘긴다. */
  entryBidId?: string;
} = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  // 백엔드가 돌려주는 세션. 다음 질문에 실어야 멀티턴 대화가 이어진다.
  const sessionIdRef = useRef<string | null>(null);
  // 사이드바에서 어떤 대화를 보고 있는지 표시하려면 상태로도 알아야 한다(ref는 리렌더를 못 시킨다).
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = null;
    setActiveSessionId(null);
  }, []);

  /**
   * 지난 대화를 불러와 화면에 되살린다.
   *
   * session_id까지 이어받으므로 불러온 대화에 그대로 이어서 질문할 수 있다.
   * 404(없거나 남의 세션)면 목록이 낡은 것이므로 새 대화 상태로 되돌린다.
   */
  const loadSession = useCallback(async (sessionId: string) => {
    const headers = await authHeader();
    if (!headers) return;

    setPending(true);
    try {
      const res = await fetch(`/api/me/sessions/${encodeURIComponent(sessionId)}`, {
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        setMessages([
          { role: "bot", kind: "error", text: errorTextFor(res.status) },
        ]);
        sessionIdRef.current = null;
        setActiveSessionId(null);
        return;
      }
      const data = (await res.json()) as { session_id: string; messages: StoredMessage[] };
      setMessages(data.messages.map(toChatMessage));
      sessionIdRef.current = data.session_id;
      setActiveSessionId(data.session_id);
    } catch (err) {
      console.error("대화 불러오기 실패:", err);
      setMessages([{ role: "bot", kind: "error", text: errorTextFor(0) }]);
    } finally {
      setPending(false);
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || pending) return;

      setMessages((m) => [...m, { role: "user", text: q }]);
      setPending(true);
      logEvent("chatbot_message_sent", {
        bid_id: entryBidId,
        properties: { query_len: q.length },
      });

      try {
        // 회사 식별은 토큰이 한다 — company_id를 본문에 담지 않는다(#69, ADR-22).
        // 클라가 정할 수 있으면 남의 회사 세션을 열람할 수 있기 때문이다.
        const headers = await authHeader();
        if (!headers) {
          setMessages((m) => [
            ...m,
            { role: "bot", kind: "error", text: errorTextFor(401) },
          ]);
          return;
        }

        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            query: q,
            session_id: sessionIdRef.current,
            entry_bid_id: entryBidId,
          }),
        });

        if (!res.ok) {
          // 404는 세션이 사라졌다는 뜻 — 들고 있던 session_id를 버려야 다음
          // 질문이 새 세션으로 시작한다. 안 버리면 계속 404가 반복된다.
          if (res.status === 404) {
            sessionIdRef.current = null;
            setActiveSessionId(null);
          }
          setMessages((m) => [
            ...m,
            { role: "bot", kind: "error", text: errorTextFor(res.status) },
          ]);
          return;
        }

        const data = (await res.json()) as AgentResponse;
        sessionIdRef.current = data.session_id ?? sessionIdRef.current;
        // 첫 질문이면 여기서 세션이 생긴다 — 사이드바 목록을 새로 받아야 보인다.
        setActiveSessionId(sessionIdRef.current);
        setMessages((m) => [...m, toBotMessage(data)]);
      } catch (err) {
        // 네트워크 단절 등 응답 자체를 못 받은 경우.
        console.error("비드봇 응답 실패:", err);
        setMessages((m) => [
          ...m,
          { role: "bot", kind: "error", text: errorTextFor(0) },
        ]);
      } finally {
        setPending(false);
      }
    },
    [entryBidId, pending]
  );

  return { messages, pending, send, reset, loadSession, activeSessionId };
}

/**
 * 내 대화 목록 — 전용 페이지 사이드바용.
 *
 * 대화 상태(useBidbotChat)와 분리한 이유: 공고 상세의 플로팅 도크는 목록이
 * 필요 없는데 같이 묶으면 열 때마다 불필요한 요청이 나간다.
 *
 * 첫 페이지(20건)만 가져온다 — 사이드바는 최근 대화를 훑는 용도이고,
 * 더 필요해지면 그때 페이징을 붙인다(백엔드는 page 파라미터를 지원한다).
 */
export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const headers = await authHeader();
    if (!headers) {
      setSessions([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/me/sessions?page=1", { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`sessions ${res.status}`);
      const data = (await res.json()) as { items: ChatSession[] };
      setSessions(data.items ?? []);
    } catch (err) {
      // 목록을 못 받아도 대화 자체는 가능하다 — 빈 목록으로 두고 조용히 넘어간다.
      console.error("대화 목록 조회 실패:", err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { sessions, loading, refresh };
}
