"use client";

import { useEffect } from "react";

/**
 * 되돌릴 수 없는 동작 앞에 세우는 확인 모달.
 *
 * 회원 탈퇴처럼 화면 안에 펼쳐 확인받는 자리(mypage/account)와 달리, 사이드바
 * 항목처럼 폭이 좁은 곳에서 물어봐야 할 때 쓴다. 스타일·닫기 규칙(Escape·배경
 * 클릭)은 terms-modal.tsx와 맞췄다.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "삭제",
  pending = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Escape로 닫기. 처리 중에는 닫지 않는다 — 요청은 이미 나갔다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={() => !pending && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-[400px] flex-col gap-2 rounded-2xl bg-surface px-6 pb-5 pt-6 shadow-[0px_16px_40px_0px_var(--shadow-30)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
        <p className="text-[13px] leading-[1.55] text-slate-600">{description}</p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-slate-200 bg-surface px-3.5 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-md bg-danger px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-danger-hover disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {pending ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
