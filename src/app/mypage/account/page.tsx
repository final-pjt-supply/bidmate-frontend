"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { authErrorMessage, changePassword } from "@/lib/cognito";
import { clearProfile } from "@/lib/company";
import { MypageShell } from "@/components/mypage-shell";

export default function AccountPage() {
  const { user, logout, deleteAccount } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 비밀번호 변경(로그인 상태) — 재설정(/forgot-password)과 다른 경로다.
  // 현재 비밀번호를 아는 사용자가 바꾸는 것이라 이메일 인증이 필요 없다.
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwNext !== pwConfirm) {
      setPwError("새 비밀번호가 서로 달라요.");
      return;
    }
    setPwError(null);
    setPwSubmitting(true);
    try {
      await changePassword(pwCurrent, pwNext);
      setPwDone(true);
      setPwOpen(false);
      setPwCurrent("");
      setPwNext("");
      setPwConfirm("");
    } catch (err) {
      setPwError(authErrorMessage(err));
    } finally {
      setPwSubmitting(false);
    }
  };

  const doLogout = () => {
    logout();
    router.push("/");
  };

  const withdraw = async () => {
    if (!user) return;
    setError(null);
    setSubmitting(true);
    // 서버 정리 → Cognito 삭제 순서로 진행된다(auth.tsx). 전부 성공해야 로컬도 지운다.
    const result = await deleteAccount(password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    clearProfile(user.email);
    router.push("/");
  };

  const cancelWithdraw = () => {
    setConfirming(false);
    setPassword("");
    setError(null);
  };

  return (
    <MypageShell title="계정 설정" description="로그인한 계정 정보와 로그아웃·탈퇴를 관리해요.">
      {/* 계정 정보 */}
      <div className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-surface p-7">
        <h2 className="text-[15px] font-bold text-gray-900">계정 정보</h2>
        <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
          <span className="text-xs font-medium text-gray-400">이메일</span>
          <span className="text-[15px] font-bold text-gray-900">{user?.email}</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-400">비밀번호</span>
              <span className="text-[15px] font-bold text-gray-900">••••••••</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPwOpen((v) => !v);
                setPwError(null);
                setPwDone(false);
              }}
              className="shrink-0 rounded-md border border-slate-200 bg-surface px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {pwOpen ? "취소" : "변경"}
            </button>
          </div>

          {pwDone && <p className="text-[13px] text-indigo-700">비밀번호가 변경됐어요.</p>}

          {pwOpen && (
            <form onSubmit={submitPassword} className="flex flex-col gap-2.5 pt-1">
              <input
                type="password"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                placeholder="현재 비밀번호"
                autoComplete="current-password"
                required
                className="h-[42px] w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-900 outline-none focus:border-indigo-500"
              />
              <input
                type="password"
                value={pwNext}
                onChange={(e) => setPwNext(e.target.value)}
                placeholder="새 비밀번호"
                autoComplete="new-password"
                required
                className="h-[42px] w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-900 outline-none focus:border-indigo-500"
              />
              <input
                type="password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                placeholder="새 비밀번호 확인"
                autoComplete="new-password"
                required
                className="h-[42px] w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-900 outline-none focus:border-indigo-500"
              />
              <p className="text-[12px] text-slate-400">
                대문자·소문자·숫자·특수문자를 포함해 8자 이상이어야 해요.
              </p>
              {pwError && <p className="text-[13px] text-rose-600">{pwError}</p>}
              <button
                type="submit"
                disabled={pwSubmitting || !pwCurrent || !pwNext}
                className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-disabled disabled:text-slate-400"
              >
                {pwSubmitting ? "변경 중…" : "비밀번호 변경"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 로그아웃 / 탈퇴 */}
      <div className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-surface p-7">
        <h2 className="text-[15px] font-bold text-gray-900">로그인 · 탈퇴</h2>

        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900">로그아웃</span>
            <span className="text-[13px] text-slate-500">이 기기에서 로그아웃합니다.</span>
          </div>
          <button
            type="button"
            onClick={doLogout}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
          >
            <LogOut className="size-4 text-slate-500" strokeWidth={2} />
            로그아웃
          </button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900">회원 탈퇴</span>
            <span className="text-[13px] text-slate-500">
              계정과 등록한 회사 정보·스크랩을 더 이상 이용할 수 없어요.
            </span>
          </div>
          {!confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="shrink-0 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              회원 탈퇴
            </button>
          )}
        </div>

        {/* 되돌릴 수 없는 작업이라 삭제 대상을 명시하고 비밀번호로 본인 확인을 받는다 */}
        {confirming && (
          <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/60 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-red-700">정말 탈퇴하시겠어요?</span>
              <span className="text-[13px] text-slate-600">
                탈퇴하면 <strong className="font-bold">회사 정보와 스크랩한 공고</strong>를 더 이상
                이용할 수 없어요. 데이터는 30일간 보관된 뒤 완전히 삭제되며, 복구가 필요하면
                고객센터로 문의해 주세요.
              </span>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">
                본인 확인을 위해 비밀번호를 입력해 주세요
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                autoComplete="current-password"
                className="h-[42px] w-full max-w-[320px] rounded-lg border border-gray-300 bg-surface px-3.5 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            {error && <p className="text-[13px] text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={withdraw}
                disabled={password === "" || submitting}
                className="rounded-md px-3.5 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-disabled disabled:text-slate-400 enabled:bg-danger enabled:text-white enabled:hover:bg-danger-hover"
              >
                {submitting ? "처리 중…" : "탈퇴하기"}
              </button>
              <button
                type="button"
                onClick={cancelWithdraw}
                className="rounded-md border border-slate-200 bg-surface px-3.5 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </MypageShell>
  );
}
