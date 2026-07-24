"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Field, inputClass } from "@/components/auth-card";
import {
  type CompanyProfile,
  type CompanySize,
  type RegionRef,
  CREDIT_RATINGS,
  EMPTY_PROFILE,
  SIZE_LABEL,
  SIZE_OPTIONS,
  formatBizNo,
  hasCompanyProfile,
  isValidBizNo,
  loadProfile,
  normalizeBizNo,
  saveProfile,
} from "@/lib/company";
import { logEvent } from "@/lib/analytics/track";
import { MypageShell } from "@/components/mypage-shell";
import { RegionSelect } from "@/components/region-select";
import { LicenseSelect } from "@/components/license-select";

// 자유텍스트(문자열) 필드 키 — 코드/객체 필드는 별도 핸들러로 처리
type StringField = "name" | "licenses" | "certs" | "revenue" | "employees";

/** 셀렉트 공통 스타일 (inputClass와 높이·테두리 맞춤) */
const selectClass =
  "h-[42px] w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-400";

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
    // 검증 실패 상태면 저장하지 않는다(엔터 제출 등 우회 경로 포함)
    if (bizNoError) return;
    const wasFilled = hasCompanyProfile(user.email); // 저장 전 상태로 최초/수정 판별
    // 미선택 상태로 남은 지사 행은 버린다
    const cleaned: CompanyProfile = {
      ...draft,
      branchRegions: draft.branchRegions.filter((b) => b.code !== ""),
    };
    setProfile(cleaned);
    saveProfile(user.email, cleaned);
    setEditing(false);
    logEvent(wasFilled ? "profile_updated" : "company_profile_submitted");
  };
  const setField = (key: StringField, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const setHqRegion = (v: RegionRef | null) => setDraft((d) => ({ ...d, hqRegion: v }));

  // 사업자번호: 화면엔 3-2-5로 보이지만 저장은 숫자 10자리
  const setBizNo = (v: string) => setDraft((d) => ({ ...d, bizNo: normalizeBizNo(v) }));
  const bizNoError =
    draft.bizNo.length > 0 && draft.bizNo.length < 10
      ? "10자리를 모두 입력해 주세요"
      : draft.bizNo.length === 10 && !isValidBizNo(draft.bizNo)
        ? "유효하지 않은 사업자등록번호예요"
        : "";

  // 지사 소재지 다중
  const addBranch = () => setDraft((d) => ({ ...d, branchRegions: [...d.branchRegions, { code: "", name: "" }] }));
  const setBranch = (i: number, v: RegionRef | null) =>
    setDraft((d) => ({
      ...d,
      branchRegions: d.branchRegions.map((b, idx) => (idx === i ? (v ?? { code: "", name: "" }) : b)),
    }));
  const removeBranch = (i: number) =>
    setDraft((d) => ({ ...d, branchRegions: d.branchRegions.filter((_, idx) => idx !== i) }));

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
              <input
                value={formatBizNo(draft.bizNo)}
                onChange={(e) => setBizNo(e.target.value)}
                inputMode="numeric"
                placeholder="000-00-00000"
                aria-invalid={bizNoError !== ""}
                className={`${inputClass} ${bizNoError ? "border-rose-400" : ""}`}
              />
              {bizNoError && <p className="mt-1 text-xs text-rose-500">{bizNoError}</p>}
            </Field>
          </div>

          <div className="flex gap-4">
            <Field label="본점 소재지">
              <RegionSelect value={draft.hqRegion} onChange={setHqRegion} />
            </Field>
            <Field label="기업규모">
              <select
                value={draft.size}
                onChange={(e) => setDraft((d) => ({ ...d, size: e.target.value as CompanySize | "" }))}
                className={selectClass}
              >
                <option value="">선택하세요</option>
                {SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                업종별 매출액 기준 소기업에 해당하면 “소기업”을 선택하세요.
              </p>
            </Field>
          </div>

          {/* 지사 소재지 — 다중(공고의 지역 제한 판정에 사용) */}
          <Field label="지사 소재지 (선택)">
            <div className="flex flex-col gap-2">
              {draft.branchRegions.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1">
                    <RegionSelect value={b.code ? b : null} onChange={(v) => setBranch(i, v)} />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBranch(i)}
                    aria-label={`지사 ${i + 1} 삭제`}
                    className="shrink-0 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-50"
                  >
                    삭제
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addBranch}
                className="self-start rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                + 지사 추가
              </button>
            </div>
          </Field>

          <div className="flex gap-4">
            <Field label="신용등급 (선택)">
              <select
                value={draft.creditRating}
                onChange={(e) => setDraft((d) => ({ ...d, creditRating: e.target.value }))}
                className={selectClass}
              >
                <option value="">선택하세요</option>
                {CREDIT_RATINGS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex-1" />
          </div>
          <Field label="업종·보유 면허">
            <LicenseSelect
              value={draft.licenseRefs}
              onChange={(v) => setDraft((d) => ({ ...d, licenseRefs: v }))}
            />
            {draft.licenses.trim() && draft.licenseRefs.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                이전 입력값: {draft.licenses} — 위에서 다시 선택해 주세요.
              </p>
            )}
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
              disabled={bizNoError !== ""}
              className="rounded-[10px] bg-indigo-700 px-7 py-3 text-[15px] font-bold text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              변경사항 저장
            </button>
          </div>
        </form>
      ) : (
        <div className="flex w-full flex-col gap-[18px] rounded-xl border border-slate-200 bg-white p-7">
          <div className="flex gap-[34px]">
            <ViewField label="회사명" value={profile.name} />
            <ViewField label="사업자등록번호" value={formatBizNo(profile.bizNo)} />
          </div>
          <div className="flex gap-[34px]">
            <ViewField label="본점 소재지" value={profile.hqRegion?.name ?? ""} />
            <ViewField label="기업규모" value={profile.size ? SIZE_LABEL[profile.size] : ""} />
          </div>
          <div className="flex gap-[34px]">
            <ViewField
              label="지사 소재지"
              value={profile.branchRegions.map((b) => b.name).join(", ")}
            />
            <ViewField label="신용등급" value={profile.creditRating} />
          </div>
          <ViewField
            label="업종·보유 면허"
            value={
              profile.licenseRefs.length > 0
                ? profile.licenseRefs.map((l) => l.name).join(", ")
                : profile.licenses
            }
          />
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
