"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { clearProfile } from "@/lib/company";
import { clearScraps } from "@/lib/scraps";
import { MypageShell } from "@/components/mypage-shell";

export default function AccountPage() {
  const { user, logout, deleteAccount } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    clearScraps(user.email);
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
      <div className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-7">
        <h2 className="text-[15px] font-bold text-gray-900">계정 정보</h2>
        <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
          <span className="text-xs font-medium text-gray-400">이메일</span>
          <span className="text-[15px] font-bold text-gray-900">{user?.email}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-400">비밀번호</span>
          <span className="text-sm text-slate-400">비밀번호 변경 기능은 준비 중이에요.</span>
        </div>
      </div>

      {/* 로그아웃 / 탈퇴 */}
      <div className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-7">
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
                className="h-[42px] w-full max-w-[320px] rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            {error && <p className="text-[13px] text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={withdraw}
                disabled={password === "" || submitting}
                className="rounded-md px-3.5 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 enabled:bg-red-600 enabled:text-white enabled:hover:bg-red-700"
              >
                {submitting ? "처리 중…" : "탈퇴하기"}
              </button>
              <button
                type="button"
                onClick={cancelWithdraw}
                className="rounded-md border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
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
