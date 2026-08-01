"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { logEvent } from "@/lib/analytics/track";
import { AuthCardLayout, AuthCard, Field, inputClass } from "@/components/auth-card";
import { TermsModal } from "@/components/terms-modal";

// Cognito 유저풀 비밀번호 정책과 동일하게 맞춘다(느슨하면 가입 단계에서 거부당한다).
// 정책: 8자 이상 + 대문자 + 소문자 + 숫자 + 특수문자 전부 필수.
const PW_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PW_HINT = "대문자·소문자·숫자·특수문자를 포함해 8자 이상 입력하세요.";
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailStatus = "idle" | "invalid" | "available" | "taken";

export default function SignupPage() {
  const router = useRouter();
  const { user, ready, signup, confirmSignup, resendCode } = useAuth();
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  // form → confirm(이메일 코드 입력) → done
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const pwValid = PW_RULE.test(password);

  // Cognito는 계정 존재 여부를 미리 알려주는 API가 없다(이메일 열거 공격 방지).
  // 그래서 여기선 형식만 검사하고, 실제 중복은 가입 시도 시 응답으로 안내한다.
  const checkEmail = () => {
    setEmailStatus(EMAIL_RULE.test(email.trim()) ? "available" : "invalid");
  };

  // 이미 로그인 상태면 홈으로 (단, 가입 진행 중 화면은 예외)
  useEffect(() => {
    if (ready && user && step === "form") router.replace("/");
  }, [ready, user, router, step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !email.trim() || !password) {
      setError("모든 필드를 입력해 주세요.");
      return;
    }
    if (emailStatus !== "available") {
      setError("이메일 형식을 확인해 주세요.");
      return;
    }
    if (!pwValid) {
      setError(`비밀번호는 ${PW_HINT}`);
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }
    if (!agree) {
      setError("이용약관 및 개인정보 수집·이용에 동의해 주세요.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await signup(company, email, password);
    setSubmitting(false);
    if (result.ok) {
      logEvent("signup_completed");
      setStep("confirm"); // 메일로 온 인증코드 확인이 남았다
    } else {
      setError(result.error);
      if (result.error.includes("이미 가입")) setEmailStatus("taken");
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await confirmSignup(email, code);
    setSubmitting(false);
    if (result.ok) setStep("done");
    else setError(result.error);
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const result = await resendCode(email);
    setSubmitting(false);
    if (result.ok) setNotice("인증코드를 다시 보냈어요. 메일함을 확인해 주세요.");
    else setError(result.error);
  };

  const canSubmit =
    company.trim() !== "" &&
    emailStatus === "available" &&
    pwValid &&
    confirm !== "" &&
    password === confirm &&
    agree;

  // 이메일 인증코드 입력 — Cognito가 가입 시 보낸 코드를 확인해야 계정이 활성화된다
  if (step === "confirm") {
    return (
      <AuthCardLayout>
        <AuthCard title="이메일 인증">
          <form onSubmit={handleConfirm} className="flex flex-col gap-[18px]">
            <p className="text-sm leading-relaxed text-slate-500">
              <span className="font-medium text-gray-900">{email}</span> 로 인증코드를 보냈어요.
              메일함을 확인하고 코드를 입력해 주세요.
            </p>
            <Field label="인증코드">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6자리 코드"
                inputMode="numeric"
                autoComplete="one-time-code"
                className={inputClass}
              />
            </Field>

            {notice && <p className="text-[13px] text-emerald-600">{notice}</p>}
            {error && <p className="text-[13px] text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={code.trim() === "" || submitting}
              className="rounded-[10px] py-3 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:bg-disabled disabled:text-slate-400 enabled:bg-brand enabled:text-white enabled:hover:bg-brand-hover"
            >
              {submitting ? "확인 중…" : "인증 완료"}
            </button>
          </form>

          <p className="text-center text-[13px] text-slate-500">
            코드를 못 받으셨나요?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={submitting}
              className="font-medium text-indigo-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            >
              다시 보내기
            </button>
          </p>
        </AuthCard>
      </AuthCardLayout>
    );
  }

  // 가입 완료 화면 (Figma 137:2)
  if (step === "done") {
    return (
      <AuthCardLayout>
        <div className="flex w-full max-w-[520px] flex-col items-center gap-3.5 rounded-2xl border border-slate-200 bg-surface p-11 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand">
            <Check className="size-[26px] text-white" strokeWidth={3} />
          </span>
          <h1 className="text-2xl font-bold text-gray-900">가입이 완료됐어요!</h1>
          <p className="text-sm leading-relaxed text-slate-500">
            이제 로그인할 수 있어요. 맞춤 공고 추천을 받으려면 회사 정보를 등록하세요.
            업종·지역·자격요건을 입력하면 우리 회사에 맞는 공고를 자동으로 찾아드려요.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full rounded-[10px] bg-brand py-3 text-[15px] font-bold text-white transition-colors hover:bg-brand-hover"
          >
            로그인하러 가기
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-[13px] text-slate-400 transition-colors hover:text-slate-600"
          >
            나중에 할게요
          </button>
        </div>
      </AuthCardLayout>
    );
  }

  return (
    <>
      <AuthCardLayout>
        <AuthCard title="회원가입">
          <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
            <Field label="회사명">
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="(주)비드프렌드"
                className={inputClass}
              />
            </Field>
            <div className="flex w-full flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">이메일</span>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailStatus("idle");
                  }}
                  placeholder="kim@bidfriend.ai.kr"
                  autoComplete="email"
                  className={`${inputClass} flex-1`}
                />
                <button
                  type="button"
                  onClick={checkEmail}
                  className="h-[46px] shrink-0 rounded-lg border border-gray-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  중복확인
                </button>
              </div>
              {emailStatus === "invalid" && (
                <p className="text-[12px] text-red-600">올바른 이메일 형식이 아니에요.</p>
              )}
              {emailStatus === "taken" && (
                <p className="text-[12px] text-red-600">이미 가입된 이메일이에요.</p>
              )}
              {emailStatus === "available" && (
                <p className="text-[12px] text-emerald-600">사용 가능한 이메일이에요.</p>
              )}
            </div>
            <Field label="비밀번호">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="new-password"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
              <p className={`text-[11.5px] ${password && !pwValid ? "text-red-600" : "text-slate-400"}`}>
                {PW_HINT}
              </p>
            </Field>
            <Field label="비밀번호 확인">
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  autoComplete="new-password"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "비밀번호 숨기기" : "비밀번호 표시"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
            </Field>

            {/* 약관 동의 — 체크는 '보기'로 약관 확인 후에만, 해제는 체크박스 클릭으로 직접 */}
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={() => (agree ? setAgree(false) : setTermsOpen(true))}
                aria-pressed={agree}
                className="flex items-center gap-2"
              >
                <span
                  aria-hidden
                  className={`flex size-[18px] items-center justify-center rounded-[5px] border ${
                    agree ? "border-brand bg-brand" : "border-gray-300 bg-surface"
                  }`}
                >
                  {agree && <Check className="size-3 text-white" strokeWidth={3} />}
                </span>
                <span className="text-[13px] text-slate-600">
                  (필수) 이용약관 · 개인정보 수집·이용 동의
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="flex shrink-0 items-center gap-0.5 text-[13px] text-slate-400 transition-colors hover:text-slate-600"
              >
                보기
                <ChevronRight className="size-3.5" strokeWidth={2} />
              </button>
            </div>

            {error && <p className="text-[13px] text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="rounded-[10px] py-3 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:bg-disabled disabled:text-slate-400 enabled:bg-brand enabled:text-white enabled:hover:bg-brand-hover"
            >
              {submitting ? "가입 중…" : "회원가입"}
            </button>
          </form>

          <p className="text-center text-[13px] text-slate-500">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-medium text-indigo-700 hover:underline">
              로그인
            </Link>
          </p>
        </AuthCard>
      </AuthCardLayout>

      {termsOpen && (
        <TermsModal
          onClose={() => setTermsOpen(false)}
          onAgree={() => {
            setAgree(true);
            setTermsOpen(false);
          }}
        />
      )}
    </>
  );
}
