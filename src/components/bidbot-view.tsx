"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Lock, Plus, Trash2, Undo2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { logEvent } from "@/lib/analytics/track";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useBidbotChat, useChatSessions, type ChatMessage } from "@/lib/bidbot";

export type { ChatMessage };

export const BOT_DISCLAIMER =
  "비드봇의 답변은 AI 분석 기반 참고용이에요. 입찰 전 나라장터 원문에서 꼭 확인해 주세요.";

/** 사이드바 목록의 시각 표기 — 오늘은 시각, 올해는 월/일, 그 밖은 연도까지. */
function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  }
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

const SUGGESTIONS = [
  "이 공고 참여 자격이 뭐야?",
  "마감 임박한 맞춤 공고 알려줘",
  "적합도 점수는 어떻게 매겨지나요?",
];

/** 봇 아바타 */
function BotAvatar({ className = "size-7" }: { className?: string }) {
  return (
    <span className={`flex ${className} shrink-0 items-center justify-center rounded-lg bg-indigo-50`}>
      <Bot className="size-4 text-indigo-600" strokeWidth={2} />
    </span>
  );
}

/** 봇 말풍선 — 답변/되묻기/목록이동/에러를 종류에 맞게 그린다. */
export function BotBubble({ message, compact = false }: { message: ChatMessage; compact?: boolean }) {
  const isError = message.kind === "error";
  const size = compact ? "px-3.5 py-2 text-[13px]" : "px-4 py-2.5 text-sm";
  return (
    <div className="flex max-w-[85%] flex-col gap-1.5">
      <p
        className={`whitespace-pre-wrap rounded-2xl rounded-tl-sm leading-relaxed ${size} ${
          isError ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-gray-800"
        }`}
      >
        {message.text}
      </p>

      {/* 목록 이동 — 에이전트가 "목록으로 보여줄 질문"이라고 판단한 경우.
          이때 answer는 비어 오므로 말풍선만 그리면 빈 칸이 된다. */}
      {message.kind === "redirect" && message.href && (
        <Link
          href={message.href}
          className="flex w-fit items-center gap-1 rounded-md bg-indigo-700 px-3 py-1.5 text-[13px] font-bold text-white transition-colors hover:bg-indigo-800"
        >
          목록에서 보기
          <ArrowRight className="size-3.5" strokeWidth={2} />
        </Link>
      )}

      {/* 근거 인용 — 답변의 출처 공고로 이동 */}
      {message.citations && message.citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {message.citations.slice(0, 3).map((c, i) => (
            <Link
              key={`${c.bid_id}-${c.chunk_idx}-${i}`}
              href={`/bids/${c.bid_id}`}
              title={c.text}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11.5px] text-slate-500 transition-colors hover:bg-slate-50"
            >
              근거 {i + 1}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** 답변 대기 표시 — 에이전트 응답은 수 초 걸린다(실측 2~9초). */
export function PendingBubble({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className={`w-fit rounded-2xl rounded-tl-sm bg-slate-100 text-slate-400 ${
        compact ? "px-3.5 py-2 text-[13px]" : "px-4 py-2.5 text-sm"
      }`}
      aria-live="polite"
    >
      비드봇이 답변을 찾고 있어요…
    </p>
  );
}

/** 사용자/봇 말풍선 목록 + disclaimer */
function MessageList({ messages, pending }: { messages: ChatMessage[]; pending: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      {messages.map((m, i) =>
        m.role === "user" ? (
          <div key={i} className="flex justify-end">
            <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm leading-relaxed text-white">
              {m.text}
            </p>
          </div>
        ) : (
          <div key={i} className="flex items-start gap-2.5">
            <BotAvatar />
            <BotBubble message={m} />
          </div>
        )
      )}
      {pending && (
        <div className="flex items-start gap-2.5">
          <BotAvatar />
          <PendingBubble />
        </div>
      )}
      <p className="pl-9 text-[11.5px] text-slate-400">{BOT_DISCLAIMER}</p>
    </div>
  );
}

/** 빈 상태: 안내 + 추천 질문 칩 */
function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3.5 px-4 text-center">
      <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
        <Bot className="size-[24px] text-indigo-600" strokeWidth={2} />
      </span>
      <p className="text-xl font-bold text-gray-900">비드봇에게 무엇이든 물어보세요</p>
      <p className="text-sm text-slate-500">
        공고 내용, 자격요건, 마감 일정까지 — 나라장터 공고에 대해 자연어로 질문할 수 있어요.
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 비회원 로그인 안내(인라인 카드) */
function GuestGate() {
  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-16 text-center">
        <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
          <Lock className="size-[22px] text-indigo-600" strokeWidth={2} />
        </span>
        <p className="text-lg font-bold text-gray-900">로그인하면 비드봇에게 물어볼 수 있어요</p>
        <p className="max-w-sm text-sm text-gray-500">
          로그인 후 공고 내용·자격요건·마감 일정을 비드봇에게 자연어로 질문해 보세요.
        </p>
        <div className="mt-1 flex gap-2">
          <Link
            href="/login"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
          >
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}

export function BidbotView() {
  const { user, ready } = useAuth();
  const isMember = ready && !!user;

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    pending,
    send: ask,
    reset,
    loadSession,
    deleteLastTurn,
    activeSessionId,
  } = useBidbotChat();
  const {
    sessions,
    loading: sessionsLoading,
    refresh: refreshSessions,
    remove: removeSession,
  } = useChatSessions();

  /** 삭제 확인 대상 — 대화방 통째(session)인지 마지막 턴(lastTurn)인지. */
  const [confirm, setConfirm] = useState<
    { kind: "session"; sessionId: string; title: string } | { kind: "lastTurn" } | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const titleOf = (sessionId: string) =>
    sessions.find((s) => s.session_id === sessionId)?.title || "제목 없는 대화";

  useEffect(() => {
    logEvent("chatbot_opened", { properties: { referrer_page: "bidbot_page" } });
  }, []);

  // 로그인 확인이 끝난 뒤에 목록을 받는다 — 비회원 상태로 부르면 401만 돌아온다.
  useEffect(() => {
    if (isMember) void refreshSessions();
  }, [isMember, refreshSessions]);

  const newChat = () => {
    reset();
    logEvent("chatbot_opened", { properties: { referrer_page: "new_chat" } });
  };

  const send = (text: string) => {
    if (!text.trim() || pending) return;
    const isFirstTurn = messages.length === 0;
    setInput("");
    void ask(text).then(() => {
      // 첫 질문이면 세션이 새로 생기므로 목록을 다시 받아야 사이드바에 나타난다.
      if (isFirstTurn) void refreshSessions();
    });
    // 다음 페인트에서 하단으로 스크롤
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const openSession = (sessionId: string) => {
    if (pending || sessionId === activeSessionId) return;
    void loadSession(sessionId);
  };

  /** 확인 모달의 '삭제' — 대상에 따라 대화방 또는 마지막 턴을 지운다. */
  const runDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.kind === "session") {
        const ok = await removeSession(confirm.sessionId);
        // 보고 있던 대화를 지웠으면 화면도 새 대화로. 안 그러면 사라진 session_id로
        // 계속 질문하게 되고 매번 404가 돌아온다.
        if (ok && confirm.sessionId === activeSessionId) reset();
      } else {
        await deleteLastTurn();
        // 마지막 턴을 지우면 updated_at이 바뀐다 — 목록의 시각·정렬을 다시 받는다.
        void refreshSessions();
      }
    } finally {
      setDeleting(false);
      setConfirm(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      {/* 대화 내역 사이드바 (회원만) */}
      {isMember && (
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 md:flex">
        <button
          type="button"
          onClick={newChat}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50"
        >
          <Plus className="size-4" strokeWidth={2} />새 대화
        </button>
        <p className="px-2 pb-1 pt-4 text-xs text-slate-400">대화 내역</p>
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {sessionsLoading ? (
            <p className="px-2 py-2 text-[12.5px] text-slate-400">불러오는 중…</p>
          ) : sessions.length === 0 ? (
            <p className="px-2 py-2 text-[12.5px] leading-relaxed text-slate-400">
              아직 저장된 대화가 없어요.
            </p>
          ) : (
            sessions.map((s) => {
              const active = s.session_id === activeSessionId;
              const title = s.title || "제목 없는 대화";
              return (
                // 삭제 버튼을 항목 안에 넣어야 하는데 버튼 안에 버튼은 못 넣는다
                // → 행을 div로 감싸고 열기/삭제를 형제 버튼으로 나눈다.
                <div
                  key={s.session_id}
                  className={`group flex items-center rounded-lg pr-1 transition-colors ${
                    active ? "bg-indigo-50" : "hover:bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openSession(s.session_id)}
                    aria-current={active ? "true" : undefined}
                    className="flex min-w-0 flex-1 flex-col px-2 py-2 text-left"
                  >
                    <span
                      className={`truncate text-sm ${
                        active ? "font-bold text-indigo-700" : "text-slate-700"
                      }`}
                    >
                      {/* 제목은 첫 질문으로 백엔드가 자동 생성한다. 아직 없으면 대체 문구. */}
                      {title}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatSessionDate(s.updated_at)}
                    </span>
                  </button>
                  {/* 평소엔 숨기고 hover·포커스·열려있는 대화에서만 보인다(목록이 시끄러워지지 않게) */}
                  <button
                    type="button"
                    onClick={() =>
                      setConfirm({ kind: "session", sessionId: s.session_id, title })
                    }
                    aria-label={`${title} 삭제`}
                    title="대화 삭제"
                    className={`shrink-0 rounded-md p-1.5 text-slate-400 opacity-0 transition-colors hover:bg-white hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 ${
                      active ? "opacity-100" : ""
                    }`}
                  >
                    <Trash2 className="size-3.5" strokeWidth={2} />
                  </button>
                </div>
              );
            })
          )}
          </div>
        </aside>
      )}

      {/* 채팅 영역 */}
      <div className="flex min-h-0 flex-1 flex-col">
        {isMember ? (
          <>
            {/* 저장된 대화를 보고 있을 때만 — 아직 첫 답변 전인 새 대화는 지울 것이 없다.
                사이드바는 md 미만에서 숨겨지므로 모바일의 유일한 삭제 경로이기도 하다. */}
            {activeSessionId && messages.length > 0 && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
                <p className="truncate text-[13px] font-medium text-slate-600">
                  {titleOf(activeSessionId)}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setConfirm({ kind: "lastTurn" })}
                    disabled={pending}
                    className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    <Undo2 className="size-3.5" strokeWidth={2} />
                    마지막 질문 지우기
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirm({
                        kind: "session",
                        sessionId: activeSessionId,
                        title: titleOf(activeSessionId),
                      })
                    }
                    className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" strokeWidth={2} />
                    대화 삭제
                  </button>
                </div>
              </div>
            )}
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <EmptyState onPick={send} />
              ) : (
                <MessageList messages={messages} pending={pending} />
              )}
            </div>
            <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="mx-auto flex w-full max-w-3xl items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="비드봇에게 질문하기…"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={input.trim() === "" || pending}
                  className="shrink-0 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  전송
                </button>
              </form>
            </div>
          </>
        ) : (
          <GuestGate />
        )}
      </div>

      {/* 삭제 확인 — 둘 다 되돌릴 수 없어 무엇이 사라지는지 명시한다. */}
      {confirm && (
        <ConfirmDialog
          title={
            confirm.kind === "session"
              ? "이 대화를 삭제할까요?"
              : "마지막 질문과 답변을 지울까요?"
          }
          description={
            confirm.kind === "session"
              ? `'${confirm.title}' 대화가 목록에서 사라져요. 삭제한 대화는 복구할 수 없어요.`
              : "방금 주고받은 질문과 답변이 지워져요. 비드봇이 기억하던 앞선 대화 맥락도 함께 초기화돼요."
          }
          confirmLabel={confirm.kind === "session" ? "삭제" : "지우기"}
          pending={deleting}
          onConfirm={() => void runDelete()}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
