"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Topbar } from "@/components/topbar";
import { SiteFooter } from "@/components/site-footer";
import { Field, inputClass } from "@/components/auth-card";
import { type CompanyProfile, EMPTY_PROFILE, loadProfile, saveProfile } from "@/lib/company";

const SIDE_MENU = ["회사 정보", "스크랩한 공고", "맞춤 알림 설정", "계정 설정"];

/** 조회 모드 한 칸 (라벨 + 값 + 밑줄). 값이 비면 미등록 표시 */
function ViewField({ label, value }: { label: string; value: string }) {
  const empty = value.trim() === "";
  return (
    <div className="flex flex-1 flex-col gap-1 border-b border-slate-200 pb-3">
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <span className={`text-[15px] font-bold ${empty ? "text-slate-300" : "text-gray-900"}`}>
        {empty ? "미등록" : value}
      </span>
    </div>
  );
}

export default function MyPage() {
  const router = useRouter();
  const { user, ready, logout } = useAuth();

  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY_PROFILE);
  const [draft, setDraft] = useState<CompanyProfile>(EMPTY_PROFILE);

  // 회원 전용 가드
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  // 가입 완료 → "회사 정보 등록하기"로 진입 시 바로 수정 모드
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("edit") === "1") setEditing(true);
  }, []);

  // 저장된 프로필 로드 (공용 loadProfile 사용)
  useEffect(() => {
    if (!user) return;
    const loaded = loadProfile(user.email, user.company);
    setProfile(loaded);
    setDraft(loaded);
  }, [user]);

  if (!ready || !user) return null;

  const startEdit = () => {
    setDraft(profile);
    setEditing(true);
  };
  const cancelEdit = () => {
    setDraft(profile);
    setEditing(false);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(draft);
    saveProfile(user.email, draft);
    setEditing(false);
  };
  const setField = (key: keyof CompanyProfile, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Topbar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
        {/* 사이드바 */}
        <aside className="flex h-fit w-60 shrink-0 flex-col gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-[18px] max-md:hidden">
          <div className="flex items-center gap-2.5 px-2 pb-3.5 pt-1.5">
            <span className="flex size-10 items-center justify-center rounded-full bg-indigo-50 text-[15px] font-bold text-indigo-800">
              {profile.name.replace(/^\(주\)/, "").charAt(0)}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-bold text-gray-900">{profile.name}</span>
              <span className="truncate text-[11.5px] text-slate-400">{user.email}</span>
            </div>
          </div>
          <div className="h-px w-full bg-slate-200" />
          {SIDE_MENU.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`w-full rounded-lg px-3 py-[11px] text-left transition-colors ${
                i === 0
                  ? "bg-indigo-50 text-[15px] font-bold text-indigo-700"
                  : "text-sm font-medium text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="w-full rounded-lg px-3 py-[11px] text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            로그아웃
          </button>
        </aside>

        {/* 콘텐츠 */}
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <h1 className="text-2xl font-bold text-gray-900">회사 정보</h1>
          <p className="text-sm text-slate-500">
            {editing
              ? "회사 정보를 수정한 뒤 저장하세요. 이 정보로 공고 적합도를 계산해요."
              : "등록된 회사 정보예요. 값을 바꾸려면 오른쪽 “수정하기”를 누르세요."}
          </p>

          {editing ? (
            <form
              onSubmit={save}
              className="flex w-full flex-col gap-[18px] rounded-xl border border-slate-200 bg-white p-7"
            >
              <div className="flex gap-4">
                <Field label="회사명">
                  <input value={draft.name} onChange={(e) => setField("name", e.target.value)} className={inputClass} />
                </Field>
                <Field label="사업자등록번호">
                  <input value={draft.bizNo} onChange={(e) => setField("bizNo", e.target.value)} className={inputClass} />
                </Field>
              </div>
              <div className="flex gap-4">
                <Field label="소재지 (지역)">
                  <input value={draft.region} onChange={(e) => setField("region", e.target.value)} className={inputClass} />
                </Field>
                <Field label="기업규모">
                  <input value={draft.size} onChange={(e) => setField("size", e.target.value)} className={inputClass} />
                </Field>
              </div>
              <Field label="업종·보유 면허">
                <input value={draft.licenses} onChange={(e) => setField("licenses", e.target.value)} className={inputClass} />
              </Field>
              <Field label="보유 인증">
                <input value={draft.certs} onChange={(e) => setField("certs", e.target.value)} className={inputClass} />
              </Field>
              <div className="flex gap-4">
                <Field label="최근 3년 실적 (억원)">
                  <input value={draft.revenue} onChange={(e) => setField("revenue", e.target.value)} className={inputClass} />
                </Field>
                <Field label="상시근로자 수">
                  <input value={draft.employees} onChange={(e) => setField("employees", e.target.value)} className={inputClass} />
                </Field>
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-[10px] bg-indigo-700 px-7 py-3 text-[15px] font-bold text-white transition-colors hover:bg-indigo-800"
                >
                  변경사항 저장
                </button>
              </div>
            </form>
          ) : (
            <div className="flex w-full flex-col gap-[18px] rounded-xl border border-slate-200 bg-white p-7">
              <div className="flex gap-[34px]">
                <ViewField label="회사명" value={profile.name} />
                <ViewField label="사업자등록번호" value={profile.bizNo} />
              </div>
              <div className="flex gap-[34px]">
                <ViewField label="소재지 (지역)" value={profile.region} />
                <ViewField label="기업규모" value={profile.size} />
              </div>
              <ViewField label="업종·보유 면허" value={profile.licenses} />
              <ViewField label="보유 인증" value={profile.certs} />
              <div className="flex gap-[34px]">
                <ViewField label="최근 3년 실적" value={profile.revenue.trim() ? `${profile.revenue}억` : ""} />
                <ViewField label="상시근로자 수" value={profile.employees.trim() ? `${profile.employees}명` : ""} />
              </div>
              <div className="flex justify-end pt-1.5">
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                >
                  수정하기
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
