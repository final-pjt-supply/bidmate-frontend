"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Field, inputClass } from "@/components/auth-card";
import {
  type CapacityRow,
  type CertRow,
  type CompanyProfile,
  type CompanySize,
  type ItemRow,
  type PerformanceRow,
  type RegionRef,
  CREDIT_RATINGS,
  EMPTY_PROFILE,
  PERSONNEL_FIELDS,
  SIZE_LABEL,
  SIZE_OPTIONS,
  amountHint,
  formatBizNo,
  formatWon,
  hasCompanyProfile,
  isConstructionCompany,
  isValidBizNo,
  loadProfile,
  normalizeBizNo,
  saveProfile,
} from "@/lib/company";
import { fetchProfile, hasServerContent, putProfile } from "@/lib/company-api";
import { logEvent } from "@/lib/analytics/track";
import { MypageShell } from "@/components/mypage-shell";
import { RegionSelect } from "@/components/region-select";
import { LicenseOneSelect, LicenseSelect } from "@/components/license-select";
import { DateField, isValidDate } from "@/components/date-field";
import { CertSelect } from "@/components/cert-select";
import { ItemSelect } from "@/components/item-select";
import { PersonnelSelect } from "@/components/personnel-select";
import { SelectMenu } from "@/components/select-menu";
import type { MasterRef } from "@/lib/data/masters";

// 자유텍스트(문자열) 필드 키 — 코드/객체 필드는 별도 핸들러로 처리
type StringField = "name" | "licenses" | "certs" | "revenue" | "employees";

// 인력 분야 드롭다운. 맨 앞 ""는 '분야 무관'(서버로는 null) — 기본값이자 유효한 상태다.
const PERSONNEL_FIELD_OPTIONS = [
  { value: "", label: "분야 무관" },
  ...PERSONNEL_FIELDS.map((f) => ({ value: f.code, label: f.name })),
];

/** 조회 모드용 "(토목)" 꼬리표. 분야 무관이면 아무것도 붙이지 않는다. */
function fieldSuffix(code: string | null): string {
  const found = PERSONNEL_FIELDS.find((f) => f.code === code);
  return found ? `(${found.name})` : "";
}

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
  // 서버엔 없고 로컬에만 있던 값을 폼에 이어받은 상태(아직 저장 안 됨)
  const [carriedOver, setCarriedOver] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  // 가입 완료 → "회사 정보 등록하기"로 진입 시 바로 수정 모드
  // window는 서버 렌더 중엔 없으므로 마운트 후(effect)에 읽는 것이 정석 — 규칙 예외 처리
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get("edit") === "1") setEditing(true);
  }, []);

  // 저장된 프로필 로드 — 서버가 정본, localStorage는 서버에 자리가 없는 항목
  // (회사명·사업자번호·레거시 자유텍스트)의 보관처이자 서버 장애 시 폴백이다.
  // localStorage도 서버에는 없어 effect에서 읽어 state에 반영한다 — 규칙 예외 처리
  useEffect(() => {
    if (!user) return;
    const local = loadProfile(user.email, user.company);
    // 서버 응답을 기다리는 동안 화면이 비지 않게 로컬 값을 먼저 보여준다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(local);
    setDraft(local);

    let alive = true;
    (async () => {
      try {
        const { profile: fromServer, serverEmpty } = await fetchProfile(local);
        if (!alive) return;
        // 서버는 비었는데 로컬에만 값이 있다 — 예전에 브라우저에만 저장한 경우다.
        // 값을 폼에 채워만 두고 저장은 사용자가 직접 누르게 한다(자동 업로드 금지:
        // PUT이 전체 교체라 낡은 값이 조용히 올라가면 되돌리기 어렵다).
        if (serverEmpty && hasServerContent(local)) {
          setCarriedOver(true);
          return; // 이미 로컬 값이 draft에 들어가 있다
        }
        setProfile(fromServer);
        setDraft(fromServer);
      } catch (err) {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : "프로필을 불러오지 못했어요");
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const startEdit = () => {
    setDraft(profile);
    setEditing(true);
  };
  const cancelEdit = () => {
    setDraft(profile);
    setEditing(false);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    // 검증 실패 상태면 저장하지 않는다(엔터 제출 등 우회 경로 포함)
    if (bizNoError || perfError || certError || itemError || capError) return;
    const wasFilled = hasCompanyProfile(user.email); // 저장 전 상태로 최초/수정 판별
    // 미선택 상태로 남은 지사 행은 버린다
    const cleaned: CompanyProfile = {
      ...draft,
      branchRegions: draft.branchRegions.filter((b) => b.code !== ""),
      // 자격을 안 고르거나 인원이 비었거나 0명인 행은 버린다(DB는 headcount NOT NULL).
      personnel: draft.personnel.filter((p) => p.code !== "" && Number(p.headcount) > 0),
      // 아무것도 안 넣은 빈 행만 버린다(쓰다 만 행은 위에서 저장을 막았다).
      performances: draft.performances.filter((p) => !perfBlank(p)),
      certRefs: draft.certRefs.filter((c) => !certBlank(c)),
      items: draft.items.filter((i) => !itemBlank(i)),
      // 공사업 면허를 지워 섹션이 닫혔으면 남은 입력을 버린다(숨은 값이 저장되면
      // 나중에 면허를 다시 넣었을 때 유령 데이터가 살아난다).
      capacityEvals: showCapacity ? draft.capacityEvals.filter((c) => !capBlank(c)) : [],
    };
    setSaveError("");
    setSaving(true);
    try {
      // 서버가 정본 — 저장 결과를 그대로 화면에 반영한다(서버가 채운 마스터 이름 포함).
      const saved = await putProfile(cleaned);
      setProfile(saved);
      setDraft(saved);
      // 로컬에도 남긴다: 회사명·사업자번호·레거시 필드는 서버에 자리가 없다.
      saveProfile(user.email, saved);
      setCarriedOver(false);
      setEditing(false);
      logEvent(wasFilled ? "profile_updated" : "company_profile_submitted");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장하지 못했어요");
    } finally {
      setSaving(false);
    }
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

  // 시공능력 — 공사업 면허를 가진 회사에만 노출한다(시공능력평가는 공사업 제도).
  // 면허를 지우면 섹션이 닫히므로, 그때 남은 입력은 저장 시 버린다.
  const showCapacity = isConstructionCompany(draft.licenseRefs);
  const addCapacity = () =>
    setDraft((d) => ({
      ...d,
      capacityEvals: [...d.capacityEvals, { code: "", name: "", evalAmount: "", evalYear: "" }],
    }));
  const setCapacity = (i: number, patch: Partial<CapacityRow>) =>
    setDraft((d) => ({
      ...d,
      capacityEvals: d.capacityEvals.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));
  const removeCapacity = (i: number) =>
    setDraft((d) => ({ ...d, capacityEvals: d.capacityEvals.filter((_, idx) => idx !== i) }));

  const capBlank = (c: CapacityRow) => c.code === "" && !c.evalAmount && !c.evalYear;
  /** 업종과 평가액은 필수(DB NOT NULL), 평가연도는 선택 */
  const capComplete = (c: CapacityRow) => c.code !== "" && Number(c.evalAmount) > 0;
  const capError =
    showCapacity && draft.capacityEvals.some((c) => !capBlank(c) && !capComplete(c));

  // 보유 인증 — 인증 + 유효기간. 만료 판정을 해야 하므로 기한을 받되,
  // 갱신 개념이 없는 인증은 "무기한"으로 표시해 NULL로 남긴다.
  const addCert = () =>
    setDraft((d) => ({
      ...d,
      certRefs: [...d.certRefs, { code: "", name: "", validUntil: "", indefinite: false }],
    }));
  const setCert = (i: number, patch: Partial<CertRow>) =>
    setDraft((d) => ({
      ...d,
      certRefs: d.certRefs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));
  const removeCert = (i: number) =>
    setDraft((d) => ({ ...d, certRefs: d.certRefs.filter((_, idx) => idx !== i) }));

  const certBlank = (c: CertRow) => c.code === "" && !c.validUntil && !c.indefinite;
  /** 인증을 골랐으면 기한도 있어야 한다 — 무기한 체크면 날짜 없이도 완성 */
  const certComplete = (c: CertRow) =>
    c.code !== "" && (c.indefinite || isValidDate(c.validUntil));
  const certError = draft.certRefs.some((c) => !certBlank(c) && !certComplete(c));

  // 취급 품목 — 품목 + 직접생산 여부(+ 직생 유효기간).
  // 직생확인증명서는 갱신 개념이 있는 유한 기한 제도라 인증의 "무기한" 같은 예외가 없다.
  // 직생을 체크했으면 기한을 반드시 받는다(만료된 직생은 매칭에서 빠진다).
  const addItem = () =>
    setDraft((d) => ({
      ...d,
      items: [
        ...d.items,
        { code: "", name: "", hasDirectProduction: false, directProdValidUntil: "" },
      ],
    }));
  const setItem = (i: number, patch: Partial<ItemRow>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    }));
  const removeItem = (i: number) =>
    setDraft((d) => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }));

  const itemBlank = (i: ItemRow) =>
    i.code === "" && !i.hasDirectProduction && !i.directProdValidUntil;
  /** 품목을 골랐으면 완성 — 단 직생을 체크했으면 기한도 있어야 한다 */
  const itemComplete = (i: ItemRow) =>
    i.code !== "" && (!i.hasDirectProduction || isValidDate(i.directProdValidUntil));
  const itemError = draft.items.some((i) => !itemBlank(i) && !itemComplete(i));

  // 오늘(KST 기준 로컬) — 인증 만료 판정에 쓴다
  const todayISO = new Date().toLocaleDateString("en-CA");
  const certExpired = (c: CertRow) =>
    !c.indefinite && isValidDate(c.validUntil) && c.validUntil < todayISO;
  /** 만료된 직생은 매칭에서 빠진다 — 사실이므로 저장은 허용하되 신호만 준다 */
  const itemProdExpired = (i: ItemRow) =>
    i.hasDirectProduction &&
    isValidDate(i.directProdValidUntil) &&
    i.directProdValidUntil < todayISO;

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
  /** 필수 3종(계약명·금액·완료일)이 다 찼는지. 분야는 선택.
   *  완료일은 타이핑 중간값("2024-1")이나 2024-02-31 같은 값도 들어올 수 있어
   *  존재하는 날짜인지까지 본다. */
  const perfComplete = (p: PerformanceRow) =>
    p.contractName.trim() !== "" && Number(p.amount) > 0 && isValidDate(p.endDate);
  // 쓰다 만 행이 하나라도 있으면 저장 차단
  const perfError = draft.performances.some((p) => !perfBlank(p) && !perfComplete(p));

  // 보유 인력 다중 — 자격·등급(마스터 코드) + 분야(D-19) + 인원 수
  const addPersonnel = () =>
    setDraft((d) => ({
      ...d,
      personnel: [...d.personnel, { code: "", name: "", headcount: "", fieldFamily: null }],
    }));
  const setPersonnelField = (i: number, v: string) =>
    setDraft((d) => ({
      ...d,
      // "" = 분야 무관 → null로 저장한다(서버 계약).
      personnel: d.personnel.map((p, idx) =>
        idx === i ? { ...p, fieldFamily: v || null } : p
      ),
    }));
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

  /** 이어받은 로컬 값 안내 — 값만 채워두고 저장은 사용자가 누르게 하므로,
   *  안내가 없으면 이미 저장된 줄 알고 그냥 나간다. (c)안의 핵심. */
  const carriedOverBanner = carriedOver && (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      이전에 이 브라우저에만 저장돼 있던 회사 정보를 불러왔어요.{" "}
      <b>아직 서버에 저장되지 않았어요</b> — 내용을 확인한 뒤 “변경사항 저장”을 눌러 주세요.
    </p>
  );

  return (
    <MypageShell title="회사 정보" description={description}>
      {loadError && (
        <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError} — 이 브라우저에 저장된 값을 보여주고 있어요.
        </p>
      )}
      {editing ? (
        <form
          onSubmit={save}
          className="flex w-full flex-col gap-[18px] rounded-xl border border-slate-200 bg-white p-7"
        >
          {carriedOverBanner}
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
          {/* 보유 인증 — 인증마다 유효기간이 붙어야 해서 칩(다중 선택)으로는 담을 수 없다.
              만료된 인증은 매칭에서 빠지므로 기한을 반드시 알아야 한다. */}
          <Field label="보유 인증">
            <div className="flex flex-col gap-2">
              {draft.certRefs.map((c, i) => {
                const show = !certBlank(c) && !certComplete(c);
                const expired = certExpired(c);
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2"
                  >
                    <CertSelect
                      value={c.code ? { code: c.code, name: c.name } : null}
                      onChange={(v) => setCert(i, { code: v?.code ?? "", name: v?.name ?? "" })}
                      ariaLabel={`인증 ${i + 1}`}
                    />
                    <div>
                      {c.indefinite ? (
                        <div className="flex h-[46px] items-center rounded-lg border border-gray-200 bg-slate-50 px-3.5 text-sm text-slate-400">
                          기한 없음
                        </div>
                      ) : (
                        <DateField
                          value={c.validUntil}
                          onChange={(v) => setCert(i, { validUntil: v })}
                          ariaLabel={`인증 ${i + 1} 유효기간`}
                          invalid={show && !isValidDate(c.validUntil)}
                        />
                      )}
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={c.indefinite}
                          onChange={(e) =>
                            setCert(i, {
                              indefinite: e.target.checked,
                              // 무기한으로 바꾸면 적재 시 NULL이므로 날짜는 비운다
                              validUntil: e.target.checked ? "" : c.validUntil,
                            })
                          }
                          className="size-3.5 accent-indigo-700"
                        />
                        무기한 (갱신 없는 인증)
                        {expired && (
                          <span className="ml-1 rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-500">
                            만료됨
                          </span>
                        )}
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCert(i)}
                      aria-label={`인증 ${i + 1} 삭제`}
                      className="h-[46px] rounded-md border border-slate-200 px-3 text-sm text-slate-500 transition-colors hover:bg-slate-50"
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addCert}
                className="self-start rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                + 인증 추가
              </button>
              {certError && (
                <p className="text-xs text-rose-500">
                  유효기간을 입력하거나 “무기한”을 체크해 주세요. 기한을 모르면 만료 여부를 판정할 수 없어요.
                </p>
              )}
              {draft.certs.trim() && draft.certRefs.length === 0 && (
                <p className="text-xs text-slate-400">
                  이전 입력값: {draft.certs} — 위에서 다시 선택해 주세요.
                </p>
              )}
            </div>
          </Field>
          {/* 취급 품목 — 품목마다 직생 보유/기한이 붙어야 해서 칩으로는 담을 수 없다.
              다른 축과 달리 후보를 서버 API로 검색한다(마스터 35,171행이라 스냅샷 불가).
              서버가 10자리(세부품명)만 내려준다 — 8자리 물품분류로 등록하면 공고와
              코드 층위가 어긋나 매칭에 안 걸린다. */}
          <Field label="취급 품목">
            <div className="flex flex-col gap-2">
              {draft.items.map((it, i) => {
                const show = !itemBlank(it) && !itemComplete(it);
                const expired = itemProdExpired(it);
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2"
                  >
                    <ItemSelect
                      value={it.code ? { code: it.code, name: it.name } : null}
                      onChange={(v) => setItem(i, { code: v?.code ?? "", name: v?.name ?? "" })}
                      ariaLabel={`품목 ${i + 1}`}
                    />
                    <div>
                      {it.hasDirectProduction ? (
                        <DateField
                          value={it.directProdValidUntil}
                          onChange={(v) => setItem(i, { directProdValidUntil: v })}
                          ariaLabel={`품목 ${i + 1} 직접생산 유효기간`}
                          invalid={show && !isValidDate(it.directProdValidUntil)}
                        />
                      ) : (
                        <div className="flex h-[46px] items-center rounded-lg border border-gray-200 bg-slate-50 px-3.5 text-sm text-slate-400">
                          직접생산 미보유
                        </div>
                      )}
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={it.hasDirectProduction}
                          onChange={(e) =>
                            setItem(i, {
                              hasDirectProduction: e.target.checked,
                              // 직생을 해제하면 기한은 의미가 없다 — 유령 값이 남지 않게 비운다
                              directProdValidUntil: e.target.checked
                                ? it.directProdValidUntil
                                : "",
                            })
                          }
                          className="size-3.5 accent-indigo-700"
                        />
                        직접생산확인증명서 보유
                        {expired && (
                          <span className="ml-1 rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-500">
                            만료됨
                          </span>
                        )}
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      aria-label={`품목 ${i + 1} 삭제`}
                      className="h-[46px] rounded-md border border-slate-200 px-3 text-sm text-slate-500 transition-colors hover:bg-slate-50"
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addItem}
                className="self-start rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                + 품목 추가
              </button>
              {itemError && (
                <p className="text-xs text-rose-500">
                  품목을 선택하고, 직접생산을 체크했다면 유효기간도 입력해 주세요. 기한을 모르면 만료 여부를 판정할 수 없어요.
                </p>
              )}
              <p className="text-xs text-slate-400">
                물품 공고는 세부품명 단위로 자격을 요구해요. 만드는 품목을 하나씩 골라 주세요.
              </p>
            </div>
          </Field>
          {/* 실적 — 건별 대장. 공고가 "최근 5년 / 특정 분야 / 누계 N억"으로 요구해
              기간·분야로 걸러 합산하므로, 요약 숫자로는 판정할 수 없다. */}
          <Field label="실적 (건별)">
            <div className="flex flex-col gap-3">
              {draft.performances.map((p, i) => {
                const show = !perfBlank(p) && !perfComplete(p); // 쓰다 만 행만 빨갛게
                const bad = (empty: boolean) => show && empty;
                return (
                  <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    {/* 4칸이 2줄로 앉는다. 두 줄의 칸 폭이 정확히 맞도록 grid로 고정
                        (flex + 눈대중 spacer는 삭제 버튼 폭이 바뀌면 어긋난다) */}
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2">
                      <input
                        value={p.contractName}
                        onChange={(e) => setPerformance(i, { contractName: e.target.value })}
                        placeholder="계약명"
                        aria-label={`실적 ${i + 1} 계약명`}
                        maxLength={200}
                        className={`${inputClass} ${bad(!p.contractName.trim()) ? "border-rose-400" : ""}`}
                      />
                      <LicenseOneSelect
                        value={p.field}
                        onChange={(v) => setPerformance(i, { field: v })}
                        ariaLabel={`실적 ${i + 1} 분야`}
                        placeholder="분야 (선택)"
                      />
                      <button
                        type="button"
                        onClick={() => removePerformance(i)}
                        aria-label={`실적 ${i + 1} 삭제`}
                        className="h-[46px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-500 transition-colors hover:bg-slate-50"
                      >
                        삭제
                      </button>

                      <div>
                        <input
                          value={formatWon(p.amount)}
                          onChange={(e) =>
                            setPerformance(i, { amount: e.target.value.replace(/\D/g, "").slice(0, 15) })
                          }
                          inputMode="numeric"
                          placeholder="계약금액 (원)"
                          aria-label={`실적 ${i + 1} 계약금액(원)`}
                          className={`${inputClass} ${bad(!(Number(p.amount) > 0)) ? "border-rose-400" : ""}`}
                        />
                        <p className="mt-1 h-4 text-xs text-slate-500">{amountHint(p.amount)}</p>
                      </div>
                      <DateField
                        value={p.endDate}
                        onChange={(v) => setPerformance(i, { endDate: v })}
                        ariaLabel={`실적 ${i + 1} 완료일`}
                        invalid={bad(!isValidDate(p.endDate))}
                      />
                      {/* 3열(삭제 버튼) 자리 — grid라 폭이 자동으로 맞는다 */}
                      <div />
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

          {/* 시공능력 — 공사업 면허 보유 회사에만. 비공사업 회사엔 해당 제도가 없어
              빈 칸을 보여줄 이유가 없다(면허를 고르면 이 섹션이 나타난다). */}
          {showCapacity && (
            <Field label="시공능력평가액 (업종별)">
              <div className="flex flex-col gap-2">
                {draft.capacityEvals.map((c, i) => {
                  const show = !capBlank(c) && !capComplete(c);
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_104px_auto] items-start gap-2"
                    >
                      <LicenseOneSelect
                        value={c.code ? { code: c.code, name: c.name } : null}
                        onChange={(v) => setCapacity(i, { code: v?.code ?? "", name: v?.name ?? "" })}
                        ariaLabel={`시공능력 ${i + 1} 업종`}
                        placeholder="업종 검색"
                      />
                      <div>
                        <input
                          value={formatWon(c.evalAmount)}
                          onChange={(e) =>
                            setCapacity(i, { evalAmount: e.target.value.replace(/\D/g, "").slice(0, 15) })
                          }
                          inputMode="numeric"
                          placeholder="평가액 (원)"
                          aria-label={`시공능력 ${i + 1} 평가액(원)`}
                          className={`${inputClass} ${show && !(Number(c.evalAmount) > 0) ? "border-rose-400" : ""}`}
                        />
                        <p className="mt-1 h-4 text-xs text-slate-500">{amountHint(c.evalAmount)}</p>
                      </div>
                      <input
                        value={c.evalYear}
                        onChange={(e) =>
                          setCapacity(i, { evalYear: e.target.value.replace(/\D/g, "").slice(0, 4) })
                        }
                        inputMode="numeric"
                        placeholder="평가연도"
                        aria-label={`시공능력 ${i + 1} 평가연도`}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => removeCapacity(i)}
                        aria-label={`시공능력 ${i + 1} 삭제`}
                        className="h-[46px] rounded-md border border-slate-200 px-3 text-sm text-slate-500 transition-colors hover:bg-slate-50"
                      >
                        삭제
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={addCapacity}
                  className="self-start rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  + 시공능력 추가
                </button>
                {capError && (
                  <p className="text-xs text-rose-500">업종과 평가액은 모두 필요해요.</p>
                )}
                <p className="text-xs text-slate-400">
                  공사업 면허를 보유해 표시되는 항목이에요. 업종별로 평가액을 등록하세요.
                </p>
              </div>
            </Field>
          )}

          {/* 보유 인력 — 자격·등급별 인원. 공고가 "고급기술자 이상 2명"처럼 요구하므로
              총원 하나로는 판정할 수 없다(company_personnel에 1:1 대응). */}
          <Field label="보유 인력 (자격·등급별)">
            <div className="flex flex-col gap-2">
              {draft.personnel.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <PersonnelSelect
                      ariaLabel={`인력 ${i + 1} 자격·등급`}
                      value={p.code ? { code: p.code, name: p.name } : null}
                      onChange={(v) => setPersonnelQual(i, v)}
                    />
                  </div>
                  {/* 분야(D-19) — 미지정(분야 무관)이 기본이고 그대로 둬도 정상 판정된다. */}
                  <div className="w-[124px] shrink-0">
                    <SelectMenu
                      ariaLabel={`인력 ${i + 1} 분야`}
                      value={p.fieldFamily ?? ""}
                      onChange={(v) => setPersonnelField(i, v)}
                      placeholder="분야 무관"
                      options={PERSONNEL_FIELD_OPTIONS}
                    />
                  </div>
                  <div className="w-[88px] shrink-0">
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
              <p className="text-xs text-slate-400">
                분야를 지정하면 분야별 인력 요구 공고의 판정이 정확해집니다. 같은 자격을
                분야별로 나눠 등록할 수 있어요(예: 중급기술자–토목 2명 / 중급기술자–건축 1명).
              </p>
              {draft.employees.trim() && draft.personnel.length === 0 && (
                <p className="text-xs text-slate-400">
                  이전 입력값: 상시근로자 {draft.employees}명 — 자격·등급별로 다시 입력해 주세요.
                </p>
              )}
            </div>
          </Field>
          {saveError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {saveError}
            </p>
          )}
          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving || bizNoError !== "" || perfError || certError || capError}
              className="rounded-[10px] bg-indigo-700 px-7 py-3 text-[15px] font-bold text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "저장 중…" : "변경사항 저장"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex w-full flex-col gap-[18px] rounded-xl border border-slate-200 bg-white p-7">
          {carriedOverBanner}
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
          {/* 시공능력 — 등록된 값이 있을 때만 보인다(비공사업 회사엔 빈 칸도 안 보임) */}
          {profile.capacityEvals.length > 0 && (
            <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
              <span className="text-xs font-medium text-gray-400">시공능력평가액</span>
              <ul className="flex flex-col gap-1">
                {profile.capacityEvals.map((c, i) => (
                  <li key={i} className="text-[15px] font-bold text-gray-900">
                    {c.name}
                    <span className="ml-2 text-sm font-medium text-slate-500">
                      {amountHint(c.evalAmount)}
                      {c.evalYear ? ` · ${c.evalYear}년 평가` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 인증도 건별 유효기간이 붙어 한 줄로 못 줄인다 */}
          <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
            <span className="text-xs font-medium text-gray-400">보유 인증</span>
            {profile.certRefs.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {profile.certRefs.map((c, i) => (
                  <li key={i} className="text-[15px] font-bold text-gray-900">
                    {c.name}
                    <span className="ml-2 text-sm font-medium text-slate-500">
                      {c.indefinite ? "기한 없음" : `${c.validUntil}까지`}
                    </span>
                    {certExpired(c) && (
                      <span className="ml-1.5 rounded bg-rose-50 px-1.5 py-0.5 text-xs font-bold text-rose-500">
                        만료됨
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-[15px] font-bold text-slate-300">
                {profile.certs.trim() ? `${profile.certs} (코드 미매핑)` : "미등록"}
              </span>
            )}
          </div>

          {/* 품목도 건별 직생/기한이 붙어 한 줄로 못 줄인다 */}
          <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
            <span className="text-xs font-medium text-gray-400">취급 품목</span>
            {profile.items.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {profile.items.map((it, i) => (
                  <li key={i} className="text-[15px] font-bold text-gray-900">
                    {it.name}
                    <span className="ml-2 text-sm font-medium text-slate-500">
                      {it.hasDirectProduction
                        ? `직접생산 · ${it.directProdValidUntil}까지`
                        : "직접생산 미보유"}
                    </span>
                    {itemProdExpired(it) && (
                      <span className="ml-1.5 rounded bg-rose-50 px-1.5 py-0.5 text-xs font-bold text-rose-500">
                        만료됨
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-[15px] font-bold text-slate-300">미등록</span>
            )}
          </div>

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
                  ? profile.personnel.map((p) => `${p.name}${fieldSuffix(p.fieldFamily)} ${p.headcount}명`).join(", ")
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
