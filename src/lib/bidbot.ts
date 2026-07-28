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

  const reset = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = null;
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
        const token = await getIdToken();
        if (!token) {
          setMessages((m) => [
            ...m,
            { role: "bot", kind: "error", text: errorTextFor(401) },
          ]);
          return;
        }

        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: q,
            session_id: sessionIdRef.current,
            entry_bid_id: entryBidId,
          }),
        });

        if (!res.ok) {
          // 404는 세션이 사라졌다는 뜻 — 들고 있던 session_id를 버려야 다음
          // 질문이 새 세션으로 시작한다. 안 버리면 계속 404가 반복된다.
          if (res.status === 404) sessionIdRef.current = null;
          setMessages((m) => [
            ...m,
            { role: "bot", kind: "error", text: errorTextFor(res.status) },
          ]);
          return;
        }

        const data = (await res.json()) as AgentResponse;
        sessionIdRef.current = data.session_id ?? sessionIdRef.current;
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

  return { messages, pending, send, reset };
}
