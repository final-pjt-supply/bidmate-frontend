"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, MOCK_ACCOUNT } from "@/lib/auth";
import { logEvent } from "@/lib/analytics/track";
import { AuthCardLayout, AuthCard, Field, inputClass } from "@/components/auth-card";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 이미 로그인 상태면 홈으로
  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.ok) {
      logEvent("login_completed");
      router.push("/");
    } else setError(result.error);
  };

  const fillTestAccount = () => {
    setEmail(MOCK_ACCOUNT.email);
    setPassword(MOCK_ACCOUNT.password);
    setError(null);
  };

  const canSubmit = email.trim() !== "" && password !== "";

  return (
    <AuthCardLayout>
      <AuthCard title="로그인">
        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
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
            disabled={!canSubmit || submitting}
            className="rounded-md py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 enabled:bg-indigo-700 enabled:text-white enabled:hover:bg-indigo-800"
          >
            로그인
          </button>
        </form>

        {/* 테스트 계정 힌트 */}
        <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] text-slate-500">
          <span>
            테스트 계정 · {MOCK_ACCOUNT.email} / {MOCK_ACCOUNT.password}
          </span>
          <button
            type="button"
            onClick={fillTestAccount}
            className="shrink-0 rounded-md bg-white px-2 py-1 font-medium text-indigo-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-100"
          >
            자동 입력
          </button>
        </div>

        <p className="text-center text-[13px] text-slate-500">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-indigo-700 hover:underline">
            회원가입
          </Link>
        </p>
      </AuthCard>
    </AuthCardLayout>
  );
}
