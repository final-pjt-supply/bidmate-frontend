"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Field, inputClass } from "@/components/auth-card";
import {
  type CompanyProfile,
  type RegionRef,
  EMPTY_PROFILE,
  hasCompanyProfile,
  loadProfile,
  saveProfile,
} from "@/lib/company";
import { logEvent } from "@/lib/analytics/track";
import { MypageShell } from "@/components/mypage-shell";
import { RegionSelect } from "@/components/region-select";

// 자유텍스트(문자열) 필드 키 — hqRegion(객체)은 별도 핸들러로 처리
type StringField = "name" | "bizNo" | "size" | "licenses" | "certs" | "revenue" | "employees";

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
  const { user } = useAuth();

  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY_PROFILE);
  const [draft, setDraft] = useState<CompanyProfile>(EMPTY_PROFILE);

  // 가입 완료 → "회사 정보 등록하기"로 진입 시 바로 수정 모드
  // window는 서버 렌더 중엔 없으므로 마운트 후(effect)에 읽는 것이 정석 — 규칙 예외 처리
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get("edit") === "1") setEditing(true);
  }, []);

  // 저장된 프로필 로드
  // localStorage도 서버에는 없어 effect에서 읽어 state에 반영한다 — 규칙 예외 처리
  useEffect(() => {
    if (!user) return;
    const loaded = loadProfile(user.email, user.company);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loaded);
    setDraft(loaded);
  }, [user]);

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
    if (!user) return;
    const wasFilled = hasCompanyProfile(user.email); // 저장 전 상태로 최초/수정 판별
    setProfile(draft);
    saveProfile(user.email, draft);
    setEditing(false);
    logEvent(wasFilled ? "profile_updated" : "company_profile_submitted");
  };
  const setField = (key: StringField, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const setHqRegion = (v: RegionRef | null) => setDraft((d) => ({ ...d, hqRegion: v }));

  const description = editing
    ? "회사 정보를 수정한 뒤 저장하세요. 이 정보로 공고 적합도를 계산해요."
    : "등록된 회사 정보예요. 값을 바꾸려면 “수정하기”를 누르세요.";

  return (
    <MypageShell title="회사 정보" description={description}>
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
              <RegionSelect value={draft.hqRegion} onChange={setHqRegion} />
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
            <ViewField label="소재지 (지역)" value={profile.hqRegion?.name ?? ""} />
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
    </MypageShell>
  );
}
