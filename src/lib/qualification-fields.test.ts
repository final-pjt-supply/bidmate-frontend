import { describe, expect, it } from "vitest";
import type { Qualification } from "@/lib/types";
import { qualificationFields } from "@/lib/qualification-fields";

const emptyQualification: Qualification = {
  company_size_limit: null,
  region_limit_type: null,
  region_limit_names: null,
  required_licenses: null,
  performance_reqs: null,
  required_certs: null,
  personnel_reqs: null,
  direct_production_req: null,
  credit_rating_req: null,
  joint_venture_allowed: null,
  subcontract_allowed: null,
  tech_weight: null,
  price_weight: null,
  award_cutline_type: null,
  award_cutline_value: null,
};

describe("qualificationFields", () => {
  it("자격요건 객체가 없거나 모든 값이 null이면 표시 항목을 만들지 않는다", () => {
    expect(qualificationFields(undefined)).toEqual([]);
    expect(qualificationFields(emptyQualification)).toEqual([]);
  });

  it("명시적인 제한 없음과 false는 실제 정보로 표시한다", () => {
    const fields = qualificationFields({
      ...emptyQualification,
      company_size_limit: "none",
      region_limit_type: "none",
      direct_production_req: false,
      credit_rating_req: false,
      joint_venture_allowed: false,
      subcontract_allowed: false,
    });

    expect(fields).toEqual([
      { label: "기업규모 제한", value: "제한 없음" },
      { label: "지역제한", value: "제한 없음" },
      { label: "직접생산 확인", value: "요구 없음" },
      { label: "신용등급 제출", value: "요구 없음" },
      { label: "공동수급", value: "불가" },
      { label: "하도급", value: "불가" },
    ]);
  });

  it("빈 문자열은 버리고 실제 인력·실적 요건은 유지한다", () => {
    const fields = qualificationFields({
      ...emptyQualification,
      required_certs: ["", " ISO 27001 "],
      performance_reqs: [
        { category: "용역", basis: "단일", value: null, unit: null, scope_raw: "유사 용역 3억" },
      ],
      personnel_reqs: [{ field: "정보통신", grade: "고급", count: 2 }],
    });

    expect(fields).toEqual([
      { label: "필수 인증", value: "ISO 27001" },
      { label: "실적요건", value: "유사 용역 3억" },
      { label: "필수 인력", value: "정보통신 고급 2명" },
    ]);
  });
});
