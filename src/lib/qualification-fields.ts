import type { Qualification } from "@/lib/types";

// 기업규모 제한 — bid_table.company_size_limit 실측 5종. 모르는 값은 참가 가능으로
// 오인하지 않도록 "제한 있음"으로 안전하게 표시한다.
const SIZE_LIMIT_LABEL: Record<string, string> = {
  sme_only: "중소기업만 참여 가능",
  small_only: "소기업만 참여 가능",
  no_conglomerate: "대기업 참여 불가",
  no_large: "대기업 참여 불가",
  none: "제한 없음",
};

export type QualificationField = { label: string; value: string };

function sizeLimitLabel(value: string): string {
  return SIZE_LIMIT_LABEL[value] ?? "제한 있음";
}

function joinNonEmpty(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(", ");
}

/** null(미추출/확인 불가)을 "요구 없음"으로 단정하지 않고 실제 값이 있는 요건만 만든다. */
export function qualificationFields(
  qualification: Qualification | undefined
): QualificationField[] {
  if (!qualification) return [];

  const fields: QualificationField[] = [];

  if (qualification.company_size_limit != null) {
    fields.push({
      label: "기업규모 제한",
      value: sizeLimitLabel(qualification.company_size_limit),
    });
  }

  if (qualification.region_limit_type != null) {
    const regionNames = joinNonEmpty(qualification.region_limit_names ?? []);
    fields.push({
      label: "지역제한",
      value:
        qualification.region_limit_type === "none"
          ? "제한 없음"
          : regionNames || "제한 있음 · 나라장터 원문 확인",
    });
  }

  const licenses = joinNonEmpty(
    qualification.required_licenses?.map((license) => license.name_raw) ?? []
  );
  if (licenses) fields.push({ label: "필수 면허·등록", value: licenses });

  const certs = joinNonEmpty(qualification.required_certs ?? []);
  if (certs) fields.push({ label: "필수 인증", value: certs });

  if (qualification.direct_production_req != null) {
    fields.push({
      label: "직접생산 확인",
      value: qualification.direct_production_req ? "필요" : "요구 없음",
    });
  }

  const performance = joinNonEmpty(
    qualification.performance_reqs?.map((requirement) => requirement.scope_raw) ?? []
  );
  if (performance) fields.push({ label: "실적요건", value: performance });

  const personnel = joinNonEmpty(
    qualification.personnel_reqs?.map(
      (requirement) => `${requirement.field} ${requirement.grade} ${requirement.count}명`
    ) ?? []
  );
  if (personnel) fields.push({ label: "필수 인력", value: personnel });

  if (qualification.credit_rating_req != null) {
    fields.push({
      label: "신용등급 제출",
      value: qualification.credit_rating_req ? "필요" : "요구 없음",
    });
  }

  if (qualification.joint_venture_allowed != null) {
    fields.push({
      label: "공동수급",
      value: qualification.joint_venture_allowed ? "허용" : "불가",
    });
  }

  if (qualification.subcontract_allowed != null) {
    fields.push({
      label: "하도급",
      value: qualification.subcontract_allowed ? "허용" : "불가",
    });
  }

  return fields;
}
