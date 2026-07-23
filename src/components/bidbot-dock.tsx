"use client";

import { useRef, useState } from "react";
import { Bot, Maximize2, Minimize2, Minus, X } from "lucide-react";
import { logEvent, newId } from "@/lib/analytics/track";
import { type ChatMessage, BOT_DISCLAIMER, BOT_PLACEHOLDER } from "@/components/bidbot-view";

export type BotMode = "closed" | "min" | "popover" | "expanded";

const DOCK_SUGGESTIONS = ["참여 자격이 뭐야?", "마감 일정이 어떻게 돼?"];

export function BidbotDock({
  bidName,
  mode,
  onMode,
}: {
  bidName: string;
  mode: BotMode;
  onMode: (m: BotMode) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatSessionId] = useState(() => newId("c_"));
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMessages((m) => [...m, { role: "user", text: t }, { role: "bot", text: BOT_PLACEHOLDER }]);
    setInput("");
    logEvent("chatbot_message_sent", { properties: { chat_session_id: chatSessionId } });
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  if (mode === "closed") return null;

  // 최소화: 우하단 플로팅 버튼
  if (mode === "min") {
    return (
      <button
        type="button"
        onClick={() => onMode("popover")}
        aria-label="비드봇 열기"
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-indigo-700 text-white shadow-[0px_8px_24px_rgba(67,56,202,0.4)] transition-colors hover:bg-indigo-800"
      >
        <Bot className="size-6" strokeWidth={2} />
      </button>
    );
  }

  const expanded = mode === "expanded";

  return (
    <div
      role="dialog"
      aria-label="비드봇"
      className={`fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0px_16px_40px_rgba(0,0,0,0.2)] ${
        expanded ? "h-[70vh] w-[560px]" : "h-[480px] w-[360px]"
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50">
            <Bot className="size-4 text-indigo-600" strokeWidth={2} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-gray-900">비드봇</p>
            <p className="text-[11px] text-slate-400">이 공고에 대해 답변해요</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onMode("min")}
            aria-label="최소화"
            className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <Minus className="size-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => onMode(expanded ? "popover" : "expanded")}
            aria-label={expanded ? "축소" : "확대"}
            className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            {expanded ? (
              <Minimize2 className="size-[15px]" strokeWidth={2} />
            ) : (
              <Maximize2 className="size-[15px]" strokeWidth={2} />
            )}
          </button>
          <button
            type="button"
            onClick={() => onMode("closed")}
            aria-label="닫기"
            className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-4">
        {/* 인사말 */}
        <div className="flex items-start gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-indigo-50">
            <Bot className="size-3.5 text-indigo-600" strokeWidth={2} />
          </span>
          <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-2 text-[13px] leading-relaxed text-gray-800">
            안녕하세요! “{bidName}” 공고에 대해 무엇이든 물어보세요.
          </p>
        </div>

        {/* 추천 질문 (대화 전) */}
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-1.5 pl-8">
            {DOCK_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* 메시지 */}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-indigo-600 px-3.5 py-2 text-[13px] leading-relaxed text-white">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-indigo-50">
                <Bot className="size-3.5 text-indigo-600" strokeWidth={2} />
              </span>
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-2 text-[13px] leading-relaxed text-gray-800">
                {m.text}
              </p>
            </div>
          )
        )}

        {messages.length > 0 && (
          <p className="pl-8 text-[11px] text-slate-400">{BOT_DISCLAIMER}</p>
        )}
      </div>

      {/* 입력 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex shrink-0 items-center gap-2 border-t border-slate-100 px-3 py-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문 입력…"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={input.trim() === ""}
          className="shrink-0 rounded-lg bg-indigo-700 px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          전송
        </button>
      </form>
    </div>
  );
}
