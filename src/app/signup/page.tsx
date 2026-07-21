"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthCardLayout, AuthCard, Field, inputClass } from "@/components/auth-card";

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

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !email.trim() || !password) {
      setError("모든 필드를 입력해 주세요.");
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
    if (result.ok) router.push("/");
    else setError(result.error);
  };

  return (
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
          <Field label="이메일">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kim@bidmate.co.kr"
              autoComplete="email"
              className={inputClass}
            />
          </Field>
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
            <Link href="/terms" className="shrink-0 text-[13px] text-slate-400 hover:underline">
              보기
            </Link>
          </div>

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          <button
            type="submit"
            className="rounded-[10px] bg-indigo-700 py-3 text-[15px] font-bold text-white transition-colors hover:bg-indigo-800"
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
  );
}
