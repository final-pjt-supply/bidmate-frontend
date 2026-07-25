// 회사 프로필 서버 연동 — 백엔드 GET/PUT /me/profile 과 CompanyProfile 사이의 변환 계층.
//
// 저장 정본은 서버(company_* 8테이블)다. 다만 8테이블에 대응 컬럼이 없는 항목
// (회사명·사업자번호·레거시 자유텍스트 4종)은 계속 localStorage가 들고 있다 —
// 그 6개는 이 파일이 건드리지 않는다(company.ts 소관).
//
// 서버 DTO 제약(백엔드 PR #46):
//  - 클라는 code만 보낸다. *_name은 서버가 마스터에서 채운다.
//    DTO가 extra=forbid라 name을 실어 보내면 422다.
//  - 숫자는 정수로(폼은 입력 편의상 문자열로 들고 있다).
//  - PUT은 전체 교체(full replace) — 보내지 않은 섹션은 삭제된다. 항상 전부 보낸다.

import { getIdToken } from "@/lib/cognito";
import type {
  CapacityRow,
  CertRow,
  CompanyProfile,
  CompanySize,
  ItemRow,
  PerformanceRow,
  PersonnelRow,
} from "@/lib/company";
import { EMPTY_PROFILE } from "@/lib/company";

/* ── 서버 응답 형태 (GET /me/profile) ───────────────────────────── */

type QualificationOut = { company_size: string | null; credit_rating: string | null };
type RegionOut = { region_code: string; region_name: string | null; region_type: string | null };
type LicenseOut = { license_code: string; license_name: string | null };
type CertOut = { cert_code: string; cert_name: string | null; valid_until: string | null };
type PersonnelOut = { qual_code: string; qual_name: string | null; headcount: number | null };
type ItemOut = {
  item_code: string;
  item_name: string | null;
  has_direct_production: boolean | null;
  direct_prod_valid_until: string | null;
};
type CapacityEvalOut = {
  license_code: string;
  license_name: string | null;
  eval_amount: number | null;
  eval_year: number | null;
};
type PerformanceRecordOut = {
  record_id: number;
  contract_name: string | null;
  field_code: string | null;
  field_name: string | null;
  contract_amt: number | null;
  end_date: string | null;
};

export type ProfileResponse = {
  company_id: string;
  qualification: QualificationOut | null;
  regions: RegionOut[];
  licenses: LicenseOut[];
  items: ItemOut[];
  certs: CertOut[];
  personnel: PersonnelOut[];
  capacity_evals: CapacityEvalOut[];
  performance_records: PerformanceRecordOut[];
};

/** 서버에 프로필이 하나라도 들어 있는지 — (c)안에서 "서버가 비었나" 판정에 쓴다. */
export function isServerProfileEmpty(r: ProfileResponse): boolean {
  return (
    r.qualification == null &&
    r.regions.length === 0 &&
    r.licenses.length === 0 &&
    r.items.length === 0 &&
    r.certs.length === 0 &&
    r.personnel.length === 0 &&
    r.capacity_evals.length === 0 &&
    r.performance_records.length === 0
  );
}

/* ── 서버 → 폼 ─────────────────────────────────────────────────── */

const SIZES: CompanySize[] = ["small", "medium", "mid_large", "conglomerate"];
const isSize = (v: string | null): v is CompanySize =>
  v != null && (SIZES as string[]).includes(v);

/** 서버 응답을 폼 모델로. 서버에 없는 6개 필드는 base(로컬 값)에서 그대로 가져온다. */
export function toProfile(r: ProfileResponse, base: CompanyProfile): CompanyProfile {
  const hq = r.regions.find((x) => x.region_type === "hq") ?? null;
  const branches = r.regions.filter((x) => x.region_type !== "hq");

  return {
    // 서버에 자리가 없는 항목 — 로컬 값 유지
    name: base.name,
    bizNo: base.bizNo,
    licenses: base.licenses,
    certs: base.certs,
    revenue: base.revenue,
    employees: base.employees,

    // 서버가 정본인 항목
    hqRegion: hq ? { code: hq.region_code, name: hq.region_name ?? "" } : null,
    branchRegions: branches.map((b) => ({ code: b.region_code, name: b.region_name ?? "" })),
    size: isSize(r.qualification?.company_size ?? null)
      ? (r.qualification!.company_size as CompanySize)
      : "",
    creditRating: r.qualification?.credit_rating ?? "",
    licenseRefs: r.licenses.map((l) => ({ code: l.license_code, name: l.license_name ?? "" })),
    certRefs: r.certs.map<CertRow>((c) => ({
      code: c.cert_code,
      name: c.cert_name ?? "",
      // 서버의 valid_until=NULL은 "기한 없는 인증"이라는 뜻이다(폼의 indefinite와 대응).
      validUntil: c.valid_until ?? "",
      indefinite: c.valid_until == null,
    })),
    items: r.items.map<ItemRow>((i) => ({
      code: i.item_code,
      name: i.item_name ?? "",
      hasDirectProduction: i.has_direct_production === true,
      directProdValidUntil: i.direct_prod_valid_until ?? "",
    })),
    personnel: r.personnel.map<PersonnelRow>((p) => ({
      code: p.qual_code,
      name: p.qual_name ?? "",
      headcount: p.headcount != null ? String(p.headcount) : "",
    })),
    performances: r.performance_records.map<PerformanceRow>((p) => ({
      contractName: p.contract_name ?? "",
      field: p.field_code ? { code: p.field_code, name: p.field_name ?? "" } : null,
      amount: p.contract_amt != null ? String(p.contract_amt) : "",
      endDate: p.end_date ?? "",
    })),
    capacityEvals: r.capacity_evals.map<CapacityRow>((c) => ({
      code: c.license_code,
      name: c.license_name ?? "",
      evalAmount: c.eval_amount != null ? String(c.eval_amount) : "",
      evalYear: c.eval_year != null ? String(c.eval_year) : "",
    })),
  };
}

/* ── 폼 → 서버 ─────────────────────────────────────────────────── */

/** 숫자 문자열 → 정수. 빈 값/비숫자는 null. */
function toInt(v: string): number | null {
  const d = v.replace(/\D/g, "");
  if (d === "") return null;
  const n = Number(d);
  return Number.isSafeInteger(n) ? n : null;
}

type ProfileUpsertRequest = {
  qualification: { company_size: CompanySize; credit_rating: string | null } | null;
  regions: { region_code: string; region_type: "hq" | "branch" }[];
  licenses: { license_code: string }[];
  items: {
    item_code: string;
    has_direct_production: boolean;
    direct_prod_valid_until: string | null;
  }[];
  certs: { cert_code: string; valid_until: string | null }[];
  personnel: { qual_code: string; headcount: number }[];
  capacity_evals: { license_code: string; eval_amount: number; eval_year: number | null }[];
  performance_records: {
    contract_name: string;
    contract_amt: number;
    end_date: string;
    field_code: string | null;
  }[];
};

/** 폼 → 서버 요청 본문. 서버 NOT NULL을 못 채우는 행은 조용히 빠진다
 *  (폼이 이미 저장 전에 막지만, 우회 경로로 들어와도 422를 내지 않게 한다). */
export function toUpsertRequest(p: CompanyProfile): ProfileUpsertRequest {
  const regions: ProfileUpsertRequest["regions"] = [];
  if (p.hqRegion?.code) regions.push({ region_code: p.hqRegion.code, region_type: "hq" });
  for (const b of p.branchRegions) {
    if (b.code) regions.push({ region_code: b.code, region_type: "branch" });
  }

  return {
    // company_size가 NOT NULL이라 미선택이면 섹션 자체를 보내지 않는다.
    qualification: p.size
      ? { company_size: p.size, credit_rating: p.creditRating || null }
      : null,
    regions,
    licenses: p.licenseRefs.filter((l) => l.code).map((l) => ({ license_code: l.code })),
    items: p.items
      .filter((i) => i.code)
      .map((i) => ({
        item_code: i.code,
        has_direct_production: i.hasDirectProduction,
        // 직생을 안 갖고 있으면 기한 자체가 의미 없다 — 남은 입력을 흘리지 않는다.
        direct_prod_valid_until: i.hasDirectProduction
          ? i.directProdValidUntil || null
          : null,
      })),
    certs: p.certRefs
      .filter((c) => c.code)
      .map((c) => ({
        cert_code: c.code,
        valid_until: c.indefinite ? null : c.validUntil || null,
      })),
    personnel: p.personnel
      .filter((x) => x.code && (toInt(x.headcount) ?? 0) > 0)
      .map((x) => ({ qual_code: x.code, headcount: toInt(x.headcount)! })),
    capacity_evals: p.capacityEvals
      .filter((c) => c.code && toInt(c.evalAmount) != null)
      .map((c) => ({
        license_code: c.code,
        eval_amount: toInt(c.evalAmount)!,
        eval_year: toInt(c.evalYear),
      })),
    performance_records: p.performances
      .filter((x) => x.contractName.trim() && toInt(x.amount) != null && x.endDate)
      .map((x) => ({
        contract_name: x.contractName.trim(),
        contract_amt: toInt(x.amount)!,
        end_date: x.endDate,
        field_code: x.field?.code || null,
      })),
  };
}

/** 서버로 보낼 내용이 하나라도 있는지 — 로컬 값을 이어받을지 판단할 때 쓴다.
 *  회사명·사업자번호처럼 서버에 안 보내는 항목만 있으면 false다(이어받을 게 없다). */
export function hasServerContent(p: CompanyProfile): boolean {
  const r = toUpsertRequest(p);
  return (
    r.qualification != null ||
    r.regions.length > 0 ||
    r.licenses.length > 0 ||
    r.items.length > 0 ||
    r.certs.length > 0 ||
    r.personnel.length > 0 ||
    r.capacity_evals.length > 0 ||
    r.performance_records.length > 0
  );
}

/* ── 호출 ──────────────────────────────────────────────────────── */

async function authHeader(): Promise<Record<string, string>> {
  const token = await getIdToken();
  if (!token) throw new Error("로그인이 필요합니다");
  return { Authorization: `Bearer ${token}` };
}

/** 서버에서 프로필을 읽어 폼 모델로 돌려준다. base는 서버에 없는 6개 필드의 출처. */
export async function fetchProfile(
  base: CompanyProfile = EMPTY_PROFILE
): Promise<{ profile: CompanyProfile; serverEmpty: boolean }> {
  const res = await fetch("/api/me/profile", {
    headers: await authHeader(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`프로필을 불러오지 못했어요 (${res.status})`);
  const data = (await res.json()) as ProfileResponse;
  return { profile: toProfile(data, base), serverEmpty: isServerProfileEmpty(data) };
}

/** 프로필 전체를 서버에 저장한다(full replace). 저장된 결과를 폼 모델로 돌려준다. */
export async function putProfile(p: CompanyProfile): Promise<CompanyProfile> {
  const res = await fetch("/api/me/profile", {
    method: "PUT",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify(toUpsertRequest(p)),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      res.status === 422
        ? "입력값을 서버가 받아들이지 못했어요. 코드/값을 확인해 주세요."
        : `저장하지 못했어요 (${res.status}) ${detail.slice(0, 200)}`
    );
  }
  const data = (await res.json()) as ProfileResponse;
  return toProfile(data, p);
}
