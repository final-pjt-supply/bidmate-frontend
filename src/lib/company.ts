// 회사 프로필(마이페이지 등록 정보) 저장/조회 유틸.
// 마이페이지와 맞춤 추천이 동일 기준을 쓰도록 한곳에 모은다. 클라이언트에서만 호출.

import { MOCK_ACCOUNT } from "@/lib/auth";

/** 마스터 참조 값 — 저장/매칭은 code, 표시는 name (region_master 등) */
export type RegionRef = { code: string; name: string };

export type CompanyProfile = {
  name: string;
  bizNo: string;
  hqRegion: RegionRef | null; // 본점 소재지 (region_master 코드 저장)
  size: string;
  licenses: string;
  certs: string;
  revenue: string; // 억원
  employees: string;
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

const PROFILE_KEY = "bidmate_company";
/** 프로필은 계정별로 분리 저장 (전역 공유 방지) */
export const profileKey = (email: string) => `${PROFILE_KEY}:${email.toLowerCase()}`;

/** 신규 가입자의 기본값 — 아무것도 등록되지 않은 빈 프로필 */
export const EMPTY_PROFILE: CompanyProfile = {
  name: "",
  bizNo: "",
  hqRegion: null,
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
  hqRegion: { code: "11", name: "서울특별시" },
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
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CompanyProfile> & { region?: string };
      return { ...EMPTY_PROFILE, ...migrateRegion(parsed) };
    }
  } catch {
    // ignore
  }
  if (email.toLowerCase() === MOCK_ACCOUNT.email) return DEMO_PROFILE;
  return { ...EMPTY_PROFILE, name: company };
}

/** 구 평면 프로필의 자유텍스트 region → hqRegion(코드) 변환. 시도 완전일치만 매핑, 나머지는 미등록. */
function migrateRegion(
  p: Partial<CompanyProfile> & { region?: string }
): Partial<CompanyProfile> {
  if (p.hqRegion !== undefined || typeof p.region !== "string") return p;
  const name = p.region.trim();
  const code = SIDO_BY_NAME[name];
  const { region: _drop, ...rest } = p;
  return { ...rest, hqRegion: code ? { code, name } : null };
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
  const filledText = [p.bizNo, p.size, p.licenses, p.certs, p.revenue, p.employees].some(
    (v) => v.trim() !== ""
  );
  return filledText || p.hqRegion != null;
}
