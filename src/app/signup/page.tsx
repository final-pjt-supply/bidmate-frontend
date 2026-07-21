"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check } from "lucide-react";
import { useAuth, isEmailTaken } from "@/lib/auth";
import { AuthCardLayout, AuthCard, Field, inputClass } from "@/components/auth-card";
import { TermsModal } from "@/components/terms-modal";

// 영어 + 숫자 포함 8자 이상
const PW_RULE = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailStatus = "idle" | "invalid" | "available" | "taken";

export default function SignupPage() {
  const router = useRouter();
  const { user, ready, signup } = useAuth();
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");

  const pwValid = PW_RULE.test(password);

  const checkEmail = () => {
    const e = email.trim();
    if (!EMAIL_RULE.test(e)) {
      setEmailStatus("invalid");
      return;
    }
    setEmailStatus(isEmailTaken(e) ? "taken" : "available");
  };

  // 이미 로그인 상태면 홈으로 (단, 방금 가입 완료 화면은 예외)
  useEffect(() => {
    if (ready && user && !done) router.replace("/");
  }, [ready, user, router, done]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !email.trim() || !password) {
      setError("모든 필드를 입력해 주세요.");
      return;
    }
    if (emailStatus !== "available") {
      setError("이메일 중복확인을 해주세요.");
      return;
    }
    if (!pwValid) {
      setError("비밀번호는 영어와 숫자를 포함해 8자 이상이어야 해요.");
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
    const result = signup(company, email, password);
    if (result.ok) setDone(true);
    else setError(result.error);
  };

  const canSubmit =
    company.trim() !== "" &&
    emailStatus === "available" &&
    pwValid &&
    confirm !== "" &&
    password === confirm &&
    agree;

  // 가입 완료 화면 (Figma 137:2)
  if (done) {
    return (
      <AuthCardLayout>
        <div className="flex w-full max-w-[520px] flex-col items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-11 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-indigo-700">
            <Check className="size-[26px] text-white" strokeWidth={3} />
          </span>
          <h1 className="text-2xl font-bold text-gray-900">가입이 완료됐어요!</h1>
          <p className="text-sm leading-relaxed text-slate-500">
            맞춤 공고 추천을 받으려면 회사 정보를 등록하세요. 업종·지역·자격요건을 입력하면 우리 회사에 맞는 공고를 자동으로 찾아드려요.
          </p>
          <button
            type="button"
            onClick={() => router.push("/mypage?edit=1")}
            className="w-full rounded-[10px] bg-indigo-700 py-3 text-[15px] font-bold text-white transition-colors hover:bg-indigo-800"
          >
            회사 정보 등록하기
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
                placeholder="(주)비드메이트"
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
                  placeholder="kim@bidmate.co.kr"
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
                영어와 숫자를 포함해 8자 이상 입력하세요.
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

            {/* 약관 동의 */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="flex size-[18px] items-center justify-center rounded-[5px] border border-gray-300 bg-white peer-checked:border-indigo-700 peer-checked:bg-indigo-700">
                  {agree && <Check className="size-3 text-white" strokeWidth={3} />}
                </span>
                <span className="text-[13px] text-slate-600">
                  (필수) 이용약관 · 개인정보 수집·이용 동의
                </span>
              </label>
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="shrink-0 text-[13px] text-slate-400 hover:underline"
              >
                보기
              </button>
            </div>

            {error && <p className="text-[13px] text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-[10px] py-3 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 enabled:bg-indigo-700 enabled:text-white enabled:hover:bg-indigo-800"
            >
              회원가입
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
