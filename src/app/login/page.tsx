"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { logEvent } from "@/lib/analytics/track";
import { AuthCardLayout, AuthCard, Field, inputClass } from "@/components/auth-card";

// 아이디 저장은 그 브라우저에서만 의미 있는 편의 기능이라 서버에 보내지 않는다.
// 저장하는 건 이메일뿐이다 — 비밀번호를 저장하는 자동 로그인과는 다른 기능이다.
const SAVED_EMAIL_KEY = "bidmate_saved_email";

// 시크릿 모드·저장소 차단 환경에선 localStorage 접근 자체가 예외를 던진다
// (analytics/track.ts와 같은 방어). 저장 실패는 편의 기능 손실일 뿐이라 삼킨다.
function readSavedEmail(): string | null {
  try {
    return localStorage.getItem(SAVED_EMAIL_KEY);
  } catch {
    return null;
  }
}

function writeSavedEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(SAVED_EMAIL_KEY, email);
    else localStorage.removeItem(SAVED_EMAIL_KEY);
  } catch {
    // 무시
  }
}

// 다른 탭의 변경까지 따라갈 필요가 없어 구독은 비워둔다. 모듈 상수로 둬서
// 렌더마다 재구독되지 않게 한다.
const NEVER_CHANGES = () => () => {};
// 서버에는 localStorage가 없다 — SSR 스냅샷을 null로 고정해 하이드레이션을 일치시킨다.
const NO_SERVER_VALUE = () => null;

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 이미 로그인 상태면 홈으로
  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  // 저장된 이메일은 state로 복사하지 않고 파생 값으로 쓴다. useEffect + setState로
  // 채우면 렌더가 두 번 돌고(react-hooks/set-state-in-effect), useState 초기값에서
  // localStorage를 읽으면 서버 렌더와 어긋난다. 외부 저장소를 읽는 정식 훅을 쓴다.
  const savedEmail = useSyncExternalStore(NEVER_CHANGES, readSavedEmail, NO_SERVER_VALUE);

  // null = 사용자가 아직 손대지 않음 → 저장된 값을 그대로 보여준다.
  const [emailInput, setEmailInput] = useState<string | null>(null);
  const [rememberInput, setRememberInput] = useState<boolean | null>(null);
  const email = emailInput ?? savedEmail ?? "";
  const remember = rememberInput ?? savedEmail !== null;

  const [submitting, setSubmitting] = useState(false);

  // 저장은 로그인 성공 후(오타 이메일이 남지 않게), 삭제는 체크를 끄는 즉시 한다.
  // 삭제까지 로그인 성공을 기다리면, 공용 PC에서 체크만 끄고 로그인 없이 떠났을 때
  // 이메일이 그대로 남아 "지운 줄 알았는데 남아 있는" 상태가 된다.
  const handleRememberChange = (checked: boolean) => {
    setRememberInput(checked);
    if (!checked) writeSavedEmail(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.ok) {
      if (remember) writeSavedEmail(email.trim());
      logEvent("login_completed");
      router.push("/");
    } else setError(result.error);
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
              onChange={(e) => setEmailInput(e.target.value)}
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

          {/* 아이디 저장과 비밀번호 찾기를 한 줄에 둔다 — 링크가 따로 한 줄을
              차지하고 있어서, 체크박스를 더하면서 줄 수는 그대로 유지한다. */}
          <div className="flex items-center justify-between text-[13px]">
            <label className="flex cursor-pointer items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => handleRememberChange(e.target.checked)}
                className="size-4 cursor-pointer rounded border-slate-300 accent-brand"
              />
              아이디 저장
            </label>
            <Link href="/forgot-password" className="font-medium text-indigo-700 hover:underline">
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-md py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-disabled disabled:text-slate-400 enabled:bg-brand enabled:text-white enabled:hover:bg-brand-hover"
          >
            로그인
          </button>
        </form>

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
