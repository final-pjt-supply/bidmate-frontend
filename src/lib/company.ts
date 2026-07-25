// 회사 프로필(마이페이지 등록 정보) 저장/조회 유틸.
// 마이페이지와 맞춤 추천이 동일 기준을 쓰도록 한곳에 모은다. 클라이언트에서만 호출.

import { DEMO_ACCOUNT_EMAIL } from "@/lib/auth";
import type { MasterRef } from "@/lib/data/masters";

/** 마스터 참조 값 — 저장/매칭은 code, 표시는 name (region_master 등) */
export type RegionRef = { code: string; name: string };

/** 기업규모 — 닫힌 enum(스펙 §3⑧). 공고의 규모 제한 4종을 이 4분류로 전부 판정한다. */
export type CompanySize = "small" | "medium" | "mid_large" | "conglomerate";

/** ⚠️ "중소기업"은 소기업을 포함하는 상위개념이라 medium 라벨로 쓰면 small_only 공고에서 오분류된다.
 *  그래서 라벨을 "중기업(소기업 제외)"로 둔다. */
export const SIZE_OPTIONS: { value: CompanySize; label: string; hint?: string }[] = [
  { value: "small", label: "소기업", hint: "업종별 매출액 기준 소기업에 해당하면 선택" },
  { value: "medium", label: "중기업(소기업 제외)" },
  { value: "mid_large", label: "중견기업" },
  { value: "conglomerate", label: "대기업" },
];

export const SIZE_LABEL: Record<CompanySize, string> = Object.fromEntries(
  SIZE_OPTIONS.map((o) => [o.value, o.label])
) as Record<CompanySize, string>;

/** 신용등급 — 표준 등급 select(스펙 §3⑨). 향후 "등급 하한" 매칭 확장 시 정렬·비교가 쉬워진다. */
export const CREDIT_RATINGS = [
  "AAA", "AA+", "AA", "AA-", "A+", "A", "A-",
  "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-",
  "B+", "B", "B-", "CCC", "CC", "C", "D",
] as const;

/** 인력 한 행 — company_personnel(qual_code, qual_name, headcount)에 1:1 대응.
 *  공고가 "고급기술자 이상 2명"처럼 자격·등급별로 요구하므로 총원 하나로는 판정할 수 없다.
 *  등급 없이 인원만 요구하는 공고("기술자 5명")는 마스터의 ROLE_GEN_ENG
 *  (일반기술자(등급무관))로 담는다 — 별도 필드가 필요 없다.
 *  headcount는 입력 편의상 문자열로 들고, DB 적재 시 smallint로 변환한다. */
export type PersonnelRow = { code: string; name: string; headcount: string };

/** 실적 한 건 — company_performance_records에 1:1 대응.
 *  공고는 "최근 5년 / 특정 분야 / 누계 5억"처럼 요구하고 매칭 시점에 기간·분야로
 *  걸러 합산한다. 요약 숫자엔 기간도 분야도 없어 거를 수 없으므로 건별로 받는다.
 *  amount는 원 단위 정수 문자열(DB가 bigint 원 단위). 억원으로 받으면 소수 실적에서
 *  반올림 오차가 생겨 누계가 틀어진다. field는 license_master 공용(field_code). */
export type PerformanceRow = {
  contractName: string;
  field: MasterRef | null; // 선택 — 비우면 분야 조건 있는 공고 집계에 안 잡힌다
  amount: string; // 원 단위 숫자만
  endDate: string; // "YYYY-MM-DD"
};

/** 인증 한 건 — company_certs(cert_code, cert_name, valid_until)에 1:1 대응.
 *  valid_until은 DB에서 nullable인데, 이유가 있다 — 갱신 개념이 없는 무기한 인증이
 *  섞여 있다. 무조건 날짜를 받으면 사용자가 먼 미래 값을 억지로 넣어 데이터가 오염된다.
 *  그래서 indefinite로 "원래 기한이 없음"과 "몰라서 비움"을 구분하고,
 *  indefinite면 valid_until을 NULL로 적재한다(매칭은 항상 유효로 해석). */
export type CertRow = {
  code: string;
  name: string;
  validUntil: string; // "YYYY-MM-DD" (indefinite면 빈 문자열)
  indefinite: boolean;
};

/** 원 단위 숫자 문자열 → 천단위 콤마 (입력 표시용).
 *  0이 아홉 개 붙는 값을 맨눈으로 세다 틀리는 걸 막는다. */
export function formatWon(v: string): string {
  const d = v.replace(/\D/g, "");
  return d ? Number(d).toLocaleString() : "";
}

/** 원 단위 → "30억 원" / "4,850만 원" / "1,200원" (콤마 밑에 붙는 보조 표시) */
export function amountHint(v: string): string {
  const d = v.replace(/\D/g, "");
  if (!d) return "";
  const n = Number(d);
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    // 30억은 "30억", 4.8억은 "4.8억" — 불필요한 소수점 0은 떼고 최대 2자리
    return `${Number(eok.toFixed(2))}억 원`;
  }
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만 원`;
  return `${n.toLocaleString()}원`;
}

export type CompanyProfile = {
  name: string;
  bizNo: string; // 하이픈 없는 숫자 10자리로 저장(표시할 때만 3-2-5)
  hqRegion: RegionRef | null; // 본점 소재지 (region_master 코드 저장)
  branchRegions: RegionRef[]; // 지사 소재지 다중 (region_type=branch)
  size: CompanySize | ""; // 닫힌 enum
  creditRating: string; // 신용등급(선택)
  licenseRefs: MasterRef[]; // 면허·업종 (license_master 코드) — 매칭 정본
  licenses: string; // (레거시) 구 자유텍스트 면허. licenseRefs 이전 값 보존용
  certRefs: CertRow[]; // 보유 인증 + 유효기간 (company_certs)
  certs: string; // (레거시) 구 자유텍스트 인증. certRefs 이전 값 보존용
  performances: PerformanceRow[]; // 실적 대장 (company_performance_records)
  revenue: string; // (레거시) 구 "최근 3년 실적" 억원 단일값. performances 이전 값 보존용
  personnel: PersonnelRow[]; // 자격·등급별 인원 (company_personnel)
  employees: string; // (레거시) 구 상시근로자 총원. personnel 이전 값 보존용
};

/** 구 자유텍스트 소재지 → region_code 마이그레이션용 시도 매핑(완전일치만) */
const SIDO_BY_NAME: Record<string, string> = {
  서울특별시: "11",
  부산광역시: "26",
  대구광역시: "27",
  인천광역시: "28",
  대전광역시: "30",
  울산광역시: "31",
  세종특별자치시: "36",
  경기도: "41",
  충청북도: "43",
  충청남도: "44",
  경상북도: "47",
  경상남도: "48",
  제주특별자치도: "50",
  강원특별자치도: "51",
  전북특별자치도: "52",
};

/* ── 사업자등록번호: 숫자 10자리 저장, 하이픈은 표시용 ───────────── */

/** 숫자만 남긴 10자리 (저장 형태) */
export function normalizeBizNo(v: string): string {
  return v.replace(/\D/g, "").slice(0, 10);
}

/** 표시용 3-2-5 하이픈 (입력 중 부분 입력도 자연스럽게) */
export function formatBizNo(v: string): string {
  const d = normalizeBizNo(v);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** 국세청 사업자등록번호 체크섬 검증 (가중치 1,3,7,1,3,7,1,3,5) */
export function isValidBizNo(v: string): boolean {
  const d = normalizeBizNo(v);
  if (d.length !== 10) return false;
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * weights[i];
  sum += Math.floor((Number(d[8]) * 5) / 10);
  return (10 - (sum % 10)) % 10 === Number(d[9]);
}

const PROFILE_KEY = "bidmate_company";
/** 프로필은 계정별로 분리 저장 (전역 공유 방지) */
export const profileKey = (email: string) => `${PROFILE_KEY}:${email.toLowerCase()}`;

/** 신규 가입자의 기본값 — 아무것도 등록되지 않은 빈 프로필 */
export const EMPTY_PROFILE: CompanyProfile = {
  name: "",
  bizNo: "",
  hqRegion: null,
  branchRegions: [],
  size: "",
  creditRating: "",
  licenseRefs: [],
  licenses: "",
  certRefs: [],
  certs: "",
  performances: [],
  revenue: "",
  personnel: [],
  employees: "",
};

/** 데모/테스트 계정에서만 보여줄 예시 회사 정보 */
export const DEMO_PROFILE: CompanyProfile = {
  name: "(주)비드메이트",
  bizNo: "1234567891", // 체크섬 유효값 (표시는 123-45-67891)
  hqRegion: { code: "11", name: "서울특별시" },
  branchRegions: [{ code: "26", name: "부산광역시" }],
  size: "medium",
  creditRating: "A",
  licenseRefs: [
    { code: "0036", name: "정보통신공사업" },
    { code: "1468", name: "소프트웨어사업자(컴퓨터관련서비스사업)" },
  ],
  licenses: "",
  certRefs: [
    { code: "GS", name: "GS인증(Good Software 품질인증)", validUntil: "2027-07-24", indefinite: false },
    { code: "ISO_27001", name: "ISO/IEC 27001 정보보안경영시스템", validUntil: "2026-03-01", indefinite: false },
    { code: "VENTURE", name: "벤처기업 확인", validUntil: "", indefinite: true },
  ],
  certs: "CC인증, ISO 27001, GS인증",
  performances: [
    {
      contractName: "○○청 정보시스템 구축",
      field: { code: "1468", name: "소프트웨어사업자(컴퓨터관련서비스사업)" },
      amount: "480000000",
      endDate: "2024-11-30",
    },
    {
      contractName: "△△시 통신망 유지보수",
      field: { code: "0036", name: "정보통신공사업" },
      amount: "120000000",
      endDate: "2023-06-15",
    },
  ],
  revenue: "5.0",
  personnel: [
    { code: "KGRADE_SP", name: "특급기술자", headcount: "2" },
    { code: "KGRADE_HI", name: "고급기술자", headcount: "5" },
    { code: "ROLE_GEN_ENG", name: "일반기술자(등급무관)", headcount: "35" },
  ],
  employees: "42",
};

/**
 * 저장된 프로필을 불러온다.
 *  - 저장값 있으면 그대로
 *  - 데모/테스트 계정은 예시 프로필
 *  - 그 외 신규 가입자는 빈 프로필(회사명만 가입값)
 */
export function loadProfile(email: string, company = ""): CompanyProfile {
  try {
    const raw = localStorage.getItem(profileKey(email));
    if (raw) {
      const parsed = JSON.parse(raw) as StoredProfile;
      return { ...EMPTY_PROFILE, ...migrate(parsed) };
    }
  } catch {
    // ignore
  }
  if (email.toLowerCase() === DEMO_ACCOUNT_EMAIL) return DEMO_PROFILE;
  return { ...EMPTY_PROFILE, name: company };
}

/** 저장소에 남아있을 수 있는 구 스키마까지 포용하는 타입 */
type StoredProfile = Omit<Partial<CompanyProfile>, "size"> & {
  region?: string; // 구: 자유텍스트 소재지
  size?: string; // 구: 자유텍스트 기업규모
};

/** 구 자유텍스트 기업규모 → enum.
 *  "중소기업"은 소기업을 포함하는 상위개념이라 어느 쪽인지 확정할 수 없다.
 *  잘못 넣으면 매칭이 틀리므로, 모호한 값은 비워서 사용자가 다시 고르게 한다. */
const SIZE_BY_LEGACY: Record<string, CompanySize> = {
  소기업: "small",
  중기업: "medium",
  중견기업: "mid_large",
  대기업: "conglomerate",
};

function migrateSize(v: string | undefined): CompanySize | "" {
  if (!v) return "";
  const t = v.trim();
  if (SIZE_OPTIONS.some((o) => o.value === t)) return t as CompanySize; // 이미 enum
  return SIZE_BY_LEGACY[t] ?? ""; // "중소기업" 등 모호값 → 재선택 유도
}

/** 구 스키마 → 현재 스키마 이관 (소재지·기업규모·사업자번호) */
function migrate(p: StoredProfile): Partial<CompanyProfile> {
  const { region, size, ...rest } = p;

  // 소재지: 구 자유텍스트 → 시도 코드(완전일치만), 나머지는 미등록
  let hqRegion = rest.hqRegion;
  if (hqRegion === undefined && typeof region === "string") {
    const name = region.trim();
    const code = SIDO_BY_NAME[name];
    hqRegion = code ? { code, name } : null;
  }

  return {
    ...rest,
    hqRegion: hqRegion ?? null,
    branchRegions: rest.branchRegions ?? [],
    licenseRefs: rest.licenseRefs ?? [],
    // 구 employees(총원)·revenue(억원 단일값)는 자격·등급이나 계약명·완료일을 알 수 없어
    // 자동 이관이 불가하다. 레거시 값은 보존하고 폼에서 다시 입력받는다
    // (licenses→licenseRefs와 동일 방식).
    personnel: rest.personnel ?? [],
    performances: rest.performances ?? [],
    certRefs: rest.certRefs ?? [],
    size: migrateSize(size),
    // 하이픈 포함 저장분 → 숫자 10자리로 정규화
    bizNo: rest.bizNo != null ? normalizeBizNo(rest.bizNo) : "",
  };
}

export function saveProfile(email: string, profile: CompanyProfile) {
  localStorage.setItem(profileKey(email), JSON.stringify(profile));
}

export function clearProfile(email: string) {
  localStorage.removeItem(profileKey(email));
}

/** 회사 정보가 입력돼 있는지 — 회사명 외 핵심 항목이 하나라도 채워졌는지로 판정 */
export function hasCompanyProfile(email: string): boolean {
  const p = loadProfile(email);
  const filledText = [
    p.bizNo,
    p.size,
    p.creditRating,
    p.licenses,
    p.certs,
    p.revenue,
    p.employees,
  ].some((v) => v.trim() !== "");
  return (
    filledText ||
    p.hqRegion != null ||
    p.branchRegions.length > 0 ||
    p.licenseRefs.length > 0 ||
    p.personnel.length > 0 ||
    p.performances.length > 0 ||
    p.certRefs.length > 0
  );
}
