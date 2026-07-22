"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Field, inputClass } from "@/components/auth-card";

/**
 * 로그인 모달 카드. 로그인 성공 시 useAuth 상태가 갱신되어 부모가 모달을 내립니다.
 * onClose: 닫기(X) 시 동작 (예: 홈으로 이동)
 */
export function LoginModal({ onClose }: { onClose: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim() !== "" && password !== "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = login(email, password);
    if (!result.ok) setError(result.error);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="로그인"
      className="w-full max-w-[440px] rounded-2xl border border-slate-200 bg-white p-9 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">로그인</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="text-gray-400 transition-colors hover:text-gray-600"
        >
          <X className="size-[18px]" strokeWidth={2} />
        </button>
      </div>

      <form onSubmit={submit} className="mt-[18px] flex flex-col gap-[18px]">
        <Field label="이메일">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            autoComplete="email"
            className={inputClass}
          />
        </Field>
        <Field label="비밀번호">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
            className={inputClass}
          />
        </Field>

        {error && <p className="text-[13px] text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 enabled:bg-indigo-700 enabled:text-white enabled:hover:bg-indigo-800"
        >
          로그인
        </button>
      </form>

      <p className="mt-[18px] text-center text-[13px] text-slate-500">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-indigo-700 hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
