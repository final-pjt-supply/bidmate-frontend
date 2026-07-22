"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { removeAccount, useAuth } from "@/lib/auth";
import { clearProfile } from "@/lib/company";
import { clearScraps } from "@/lib/scraps";
import { MypageShell } from "@/components/mypage-shell";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const doLogout = () => {
    logout();
    router.push("/");
  };

  const withdraw = () => {
    if (!user) return;
    removeAccount(user.email);
    clearProfile(user.email);
    clearScraps(user.email);
    logout();
    router.push("/");
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

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900">회원 탈퇴</span>
            <span className="text-[13px] text-slate-500">
              계정과 등록한 회사 정보·스크랩이 모두 삭제되며 되돌릴 수 없어요.
            </span>
          </div>
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-slate-600">정말 탈퇴할까요?</span>
              <button
                type="button"
                onClick={withdraw}
                className="rounded-md bg-red-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
              >
                탈퇴
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              회원 탈퇴
            </button>
          )}
        </div>
      </div>
    </MypageShell>
  );
}
