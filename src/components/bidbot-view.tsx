"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bot, Lock, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";

export type ChatMessage = { role: "user" | "bot"; text: string };

/** 봇 응답은 백엔드/에이전트 연결 전이라 안내용 목업으로 처리 */
export const BOT_PLACEHOLDER =
  "비드봇 답변 기능은 곧 제공될 예정이에요. 지금은 미리보기 화면이라 실제 답변은 아직 연결되어 있지 않아요.";

export const BOT_DISCLAIMER =
  "비드봇의 답변은 AI 분석 기반 참고용이에요. 입찰 전 나라장터 원문에서 꼭 확인해 주세요.";

const HISTORY = [
  { title: "야생동물검역시스템 공고 자격요건", date: "방금 전" },
  { title: "전광판 제작설치 마감 일정", date: "어제" },
  { title: "ISMS 인증 준비 방법", date: "7월 18일" },
  { title: "적합도 점수 기준이 궁금해요", date: "7월 15일" },
];

const SUGGESTIONS = [
  "이 공고 참여 자격이 뭐야?",
  "마감 임박한 맞춤 공고 알려줘",
  "적합도 82점의 의미는?",
];

/** 봇 아바타 */
function BotAvatar({ className = "size-7" }: { className?: string }) {
  return (
    <span className={`flex ${className} shrink-0 items-center justify-center rounded-lg bg-indigo-50`}>
      <Bot className="size-4 text-indigo-600" strokeWidth={2} />
    </span>
  );
}

/** 사용자/봇 말풍선 목록 + disclaimer */
function MessageList({ messages }: { messages: ChatMessage[] }) {
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
            <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-gray-800">
              {m.text}
            </p>
          </div>
        )
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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMessages((m) => [...m, { role: "user", text: t }, { role: "bot", text: BOT_PLACEHOLDER }]);
    setInput("");
    // 다음 페인트에서 하단으로 스크롤
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  return (
    <div className="flex min-h-0 flex-1">
      {/* 대화 내역 사이드바 (회원만) */}
      {isMember && (
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 md:flex">
        <button
          type="button"
          onClick={() => setMessages([])}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50"
        >
          <Plus className="size-4" strokeWidth={2} />새 대화
        </button>
        <p className="px-2 pb-1 pt-4 text-xs text-slate-400">대화 내역</p>
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {HISTORY.map((h) => (
            <button
              key={h.title}
              type="button"
              className="flex flex-col rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50"
            >
              <span className="truncate text-sm text-slate-700">{h.title}</span>
              <span className="text-[11px] text-slate-400">{h.date}</span>
            </button>
          ))}
          </div>
        </aside>
      )}

      {/* 채팅 영역 */}
      <div className="flex min-h-0 flex-1 flex-col">
        {isMember ? (
          <>
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <EmptyState onPick={send} />
              ) : (
                <MessageList messages={messages} />
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
                  disabled={input.trim() === ""}
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
    </div>
  );
}
