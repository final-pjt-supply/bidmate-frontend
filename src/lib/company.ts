// 회사 프로필(마이페이지 등록 정보) 저장/조회 유틸.
// 마이페이지와 맞춤 추천이 동일 기준을 쓰도록 한곳에 모은다. 클라이언트에서만 호출.

import { MOCK_ACCOUNT } from "@/lib/auth";

export type CompanyProfile = {
  name: string;
  bizNo: string;
  region: string;
  size: string;
  licenses: string;
  certs: string;
  revenue: string; // 억원
  employees: string;
};

const PROFILE_KEY = "bidmate_company";
/** 프로필은 계정별로 분리 저장 (전역 공유 방지) */
export const profileKey = (email: string) => `${PROFILE_KEY}:${email.toLowerCase()}`;

/** 신규 가입자의 기본값 — 아무것도 등록되지 않은 빈 프로필 */
export const EMPTY_PROFILE: CompanyProfile = {
  name: "",
  bizNo: "",
  region: "",
  size: "",
  licenses: "",
  certs: "",
  revenue: "",
  employees: "",
};

/** 데모/테스트 계정에서만 보여줄 예시 회사 정보 */
export const DEMO_PROFILE: CompanyProfile = {
  name: "(주)비드메이트",
  bizNo: "123-45-67890",
  region: "서울특별시",
  size: "중소기업",
  licenses: "소프트웨어사업자, 정보통신공사업",
  certs: "CC인증, ISO 27001, GS인증",
  revenue: "5.0",
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
    if (raw) return { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Partial<CompanyProfile>) };
  } catch {
    // ignore
  }
  if (email.toLowerCase() === MOCK_ACCOUNT.email) return DEMO_PROFILE;
  return { ...EMPTY_PROFILE, name: company };
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
  return [p.bizNo, p.region, p.size, p.licenses, p.certs, p.revenue, p.employees].some(
    (v) => v.trim() !== ""
  );
}
