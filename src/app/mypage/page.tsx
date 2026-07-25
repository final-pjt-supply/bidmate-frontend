"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Field, inputClass } from "@/components/auth-card";
import {
  type CompanyProfile,
  type CompanySize,
  type PerformanceRow,
  type RegionRef,
  CREDIT_RATINGS,
  EMPTY_PROFILE,
  SIZE_LABEL,
  SIZE_OPTIONS,
  amountHint,
  formatBizNo,
  formatWon,
  hasCompanyProfile,
  isValidBizNo,
  loadProfile,
  normalizeBizNo,
  saveProfile,
} from "@/lib/company";
import { logEvent } from "@/lib/analytics/track";
import { MypageShell } from "@/components/mypage-shell";
import { RegionSelect } from "@/components/region-select";
import { LicenseOneSelect, LicenseSelect } from "@/components/license-select";
import { PersonnelSelect } from "@/components/personnel-select";
import { SelectMenu } from "@/components/select-menu";
import type { MasterRef } from "@/lib/data/masters";

// 자유텍스트(문자열) 필드 키 — 코드/객체 필드는 별도 핸들러로 처리
type StringField = "name" | "licenses" | "certs" | "revenue" | "employees";

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
    if (bizNoError || perfError) return;
    const wasFilled = hasCompanyProfile(user.email); // 저장 전 상태로 최초/수정 판별
    // 미선택 상태로 남은 지사 행은 버린다
    const cleaned: CompanyProfile = {
      ...draft,
      branchRegions: draft.branchRegions.filter((b) => b.code !== ""),
      // 자격을 안 고르거나 인원이 비었거나 0명인 행은 버린다(DB는 headcount NOT NULL).
      personnel: draft.personnel.filter((p) => p.code !== "" && Number(p.headcount) > 0),
      // 아무것도 안 넣은 빈 행만 버린다(쓰다 만 행은 위에서 저장을 막았다).
      performances: draft.performances.filter((p) => !perfBlank(p)),
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

  // 실적 대장 — 건별(계약명·분야·금액·완료일). DB는 계약명/금액/완료일이 NOT NULL이라
  // 일부만 채운 행은 저장을 막는다(지사·인력처럼 조용히 버리면 입력 손실로 느껴진다).
  const addPerformance = () =>
    setDraft((d) => ({
      ...d,
      performances: [...d.performances, { contractName: "", field: null, amount: "", endDate: "" }],
    }));
  const setPerformance = (i: number, patch: Partial<PerformanceRow>) =>
    setDraft((d) => ({
      ...d,
      performances: d.performances.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    }));
  const removePerformance = (i: number) =>
    setDraft((d) => ({ ...d, performances: d.performances.filter((_, idx) => idx !== i) }));

  /** 아무것도 안 넣은 빈 행 — 저장 시 조용히 버린다 */
  const perfBlank = (p: PerformanceRow) =>
    !p.contractName.trim() && !p.field && !p.amount && !p.endDate;
  /** 필수 3종(계약명·금액·완료일)이 다 찼는지. 분야는 선택 */
  const perfComplete = (p: PerformanceRow) =>
    p.contractName.trim() !== "" && Number(p.amount) > 0 && p.endDate !== "";
  // 쓰다 만 행이 하나라도 있으면 저장 차단
  const perfError = draft.performances.some((p) => !perfBlank(p) && !perfComplete(p));

  // 보유 인력 다중 — 자격·등급(마스터 코드) + 인원 수
  const addPersonnel = () =>
    setDraft((d) => ({ ...d, personnel: [...d.personnel, { code: "", name: "", headcount: "" }] }));
  const setPersonnelQual = (i: number, v: MasterRef | null) =>
    setDraft((d) => ({
      ...d,
      personnel: d.personnel.map((p, idx) =>
        idx === i ? { ...p, code: v?.code ?? "", name: v?.name ?? "" } : p
      ),
    }));
  const setPersonnelCount = (i: number, v: string) =>
    setDraft((d) => ({
      ...d,
      // 숫자만 허용(headcount는 DB에서 smallint). 3자리면 999명까지.
      personnel: d.personnel.map((p, idx) =>
        idx === i ? { ...p, headcount: v.replace(/\D/g, "").slice(0, 3) } : p
      ),
    }));
  const removePersonnel = (i: number) =>
    setDraft((d) => ({ ...d, personnel: d.personnel.filter((_, idx) => idx !== i) }));

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
              <SelectMenu
                ariaLabel="기업규모"
                value={draft.size}
                onChange={(v) => setDraft((d) => ({ ...d, size: v as CompanySize | "" }))}
                options={SIZE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
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
              <SelectMenu
                ariaLabel="신용등급"
                value={draft.creditRating}
                onChange={(v) => setDraft((d) => ({ ...d, creditRating: v }))}
                options={CREDIT_RATINGS.map((g) => ({ value: g, label: g }))}
              />
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
          {/* 실적 — 건별 대장. 공고가 "최근 5년 / 특정 분야 / 누계 N억"으로 요구해
              기간·분야로 걸러 합산하므로, 요약 숫자로는 판정할 수 없다. */}
          <Field label="실적 (건별)">
            <div className="flex flex-col gap-3">
              {draft.performances.map((p, i) => {
                const show = !perfBlank(p) && !perfComplete(p); // 쓰다 만 행만 빨갛게
                const bad = (empty: boolean) => (show && empty ? "border-rose-400" : "");
                return (
                  <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-[2]">
                        <input
                          value={p.contractName}
                          onChange={(e) => setPerformance(i, { contractName: e.target.value })}
                          placeholder="계약명"
                          aria-label={`실적 ${i + 1} 계약명`}
                          maxLength={200}
                          className={`${inputClass} ${bad(!p.contractName.trim())}`}
                        />
                      </div>
                      <div className="flex-[2]">
                        <LicenseOneSelect
                          value={p.field}
                          onChange={(v) => setPerformance(i, { field: v })}
                          ariaLabel={`실적 ${i + 1} 분야`}
                          placeholder="분야 (선택)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePerformance(i)}
                        aria-label={`실적 ${i + 1} 삭제`}
                        className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-[11px] text-sm text-slate-500 transition-colors hover:bg-slate-50"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="mt-2 flex items-start gap-2">
                      <div className="flex-[2]">
                        <input
                          value={formatWon(p.amount)}
                          onChange={(e) =>
                            setPerformance(i, { amount: e.target.value.replace(/\D/g, "").slice(0, 15) })
                          }
                          inputMode="numeric"
                          placeholder="계약금액 (원)"
                          aria-label={`실적 ${i + 1} 계약금액(원)`}
                          className={`${inputClass} ${bad(!(Number(p.amount) > 0))}`}
                        />
                        <p className="mt-1 h-4 text-xs text-slate-500">{amountHint(p.amount)}</p>
                      </div>
                      <div className="flex-[2]">
                        <input
                          type="date"
                          value={p.endDate}
                          onChange={(e) => setPerformance(i, { endDate: e.target.value })}
                          aria-label={`실적 ${i + 1} 완료일`}
                          className={`${inputClass} ${bad(!p.endDate)}`}
                        />
                      </div>
                      {/* 삭제 버튼 자리만큼 폭 맞춤 */}
                      <div className="w-[57px] shrink-0" />
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addPerformance}
                className="self-start rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                + 실적 추가
              </button>
              {perfError && (
                <p className="text-xs text-rose-500">
                  계약명·계약금액·완료일은 모두 필요해요. 빨간 칸을 채우거나 그 행을 삭제해 주세요.
                </p>
              )}
              <p className="text-xs text-slate-400">
                분야를 비우면 분야 조건이 붙은 공고에서는 이 실적이 집계되지 않아요.
              </p>
              {draft.revenue.trim() && draft.performances.length === 0 && (
                <p className="text-xs text-slate-400">
                  이전 입력값: 최근 3년 실적 {draft.revenue}억 — 계약 건별로 다시 입력해 주세요.
                </p>
              )}
            </div>
          </Field>

          {/* 보유 인력 — 자격·등급별 인원. 공고가 "고급기술자 이상 2명"처럼 요구하므로
              총원 하나로는 판정할 수 없다(company_personnel에 1:1 대응). */}
          <Field label="보유 인력 (자격·등급별)">
            <div className="flex flex-col gap-2">
              {draft.personnel.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1">
                    <PersonnelSelect
                      ariaLabel={`인력 ${i + 1} 자격·등급`}
                      value={p.code ? { code: p.code, name: p.name } : null}
                      onChange={(v) => setPersonnelQual(i, v)}
                    />
                  </div>
                  <div className="w-[104px] shrink-0">
                    <input
                      value={p.headcount}
                      onChange={(e) => setPersonnelCount(i, e.target.value)}
                      inputMode="numeric"
                      placeholder="인원"
                      aria-label={`인력 ${i + 1} 인원 수`}
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePersonnel(i)}
                    aria-label={`인력 ${i + 1} 삭제`}
                    className="shrink-0 rounded-md border border-slate-200 px-3 py-[11px] text-sm text-slate-500 transition-colors hover:bg-slate-50"
                  >
                    삭제
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addPersonnel}
                className="self-start rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                + 인력 추가
              </button>
              <p className="text-xs text-slate-400">
                등급 없이 인원만 요구하는 공고에는 “일반기술자(등급무관)”로 담으세요.
              </p>
              {draft.employees.trim() && draft.personnel.length === 0 && (
                <p className="text-xs text-slate-400">
                  이전 입력값: 상시근로자 {draft.employees}명 — 자격·등급별로 다시 입력해 주세요.
                </p>
              )}
            </div>
          </Field>
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
              disabled={bizNoError !== "" || perfError}
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

          {/* 실적은 건별이라 한 줄로 못 줄인다 — 목록으로 표시 */}
          <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
            <span className="text-xs font-medium text-gray-400">실적</span>
            {profile.performances.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {profile.performances.map((p, i) => (
                  <li key={i} className="text-[15px] font-bold text-gray-900">
                    {p.contractName}
                    <span className="ml-2 text-sm font-medium text-slate-500">
                      {p.field ? `${p.field.name} · ` : ""}
                      {amountHint(p.amount)} · {p.endDate} 완료
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-[15px] font-bold text-slate-300">
                {profile.revenue.trim() ? `최근 3년 ${profile.revenue}억 (건별 미입력)` : "미등록"}
              </span>
            )}
          </div>

          <div className="flex gap-[34px]">
            <ViewField
              label="보유 인력"
              value={
                profile.personnel.length > 0
                  ? profile.personnel.map((p) => `${p.name} ${p.headcount}명`).join(", ")
                  : profile.employees.trim()
                    ? `상시근로자 ${profile.employees}명 (자격·등급 미입력)`
                    : ""
              }
            />
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
