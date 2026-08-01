"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard, AuthCardLayout, Field, inputClass } from "@/components/auth-card";
import { authErrorMessage, confirmPassword, forgotPassword } from "@/lib/cognito";

/**
 * 비밀번호 재설정 — 이메일로 코드를 받아 새 비밀번호를 설정한다.
 *
 * 백엔드를 거치지 않는다. 로그인·회원가입과 동일하게 브라우저가 Cognito를 직접 호출한다.
 * 아이디가 곧 이메일이라(풀 설정 UsernameAttributes=email) '이메일 찾기'는 두지 않는다 —
 * 사업자번호 등으로 남의 회사 이메일을 캐내는 통로가 된다.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setStep("confirm");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("비밀번호가 서로 달라요.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await confirmPassword(email, code, password);
      setStep("done");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <AuthCardLayout>
        <AuthCard title="비밀번호가 변경됐어요">
          <p className="text-sm text-slate-600">새 비밀번호로 로그인해 주세요.</p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="rounded-md bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
          >
            로그인하러 가기
          </button>
        </AuthCard>
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout>
      <AuthCard title="비밀번호 재설정">
        {step === "request" ? (
          <form onSubmit={sendCode} className="flex flex-col gap-[18px]">
            <p className="text-[13px] text-slate-500">
              가입하신 이메일로 인증코드를 보내드려요.
            </p>
            <Field label="이메일">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                required
                className={inputClass}
              />
            </Field>
            {error && <p className="text-[13px] text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={email.trim() === "" || submitting}
              className="rounded-md py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-disabled disabled:text-slate-400 enabled:bg-brand enabled:text-white enabled:hover:bg-brand-hover"
            >
              {submitting ? "보내는 중…" : "인증코드 받기"}
            </button>
          </form>
        ) : (
          <form onSubmit={reset} className="flex flex-col gap-[18px]">
            <p className="text-[13px] text-slate-500">
              <span className="font-medium text-slate-700">{email}</span> 로 보낸 6자리 코드와 새
              비밀번호를 입력해 주세요.
            </p>
            <Field label="인증코드">
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6자리 코드"
                required
                className={inputClass}
              />
            </Field>
            <Field label="새 비밀번호">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoComplete="new-password"
                required
                className={inputClass}
              />
            </Field>
            <Field label="새 비밀번호 확인">
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                autoComplete="new-password"
                required
                className={inputClass}
              />
            </Field>
            <p className="text-[12px] text-slate-400">
              대문자·소문자·숫자·특수문자를 포함해 8자 이상이어야 해요.
            </p>
            {error && <p className="text-[13px] text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={code.trim() === "" || password === "" || submitting}
              className="rounded-md py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-disabled disabled:text-slate-400 enabled:bg-brand enabled:text-white enabled:hover:bg-brand-hover"
            >
              {submitting ? "변경 중…" : "비밀번호 변경"}
            </button>
          </form>
        )}

        <p className="text-center text-[13px] text-slate-500">
          <Link href="/login" className="font-medium text-indigo-700 hover:underline">
            로그인으로 돌아가기
          </Link>
        </p>
      </AuthCard>
    </AuthCardLayout>
  );
}
