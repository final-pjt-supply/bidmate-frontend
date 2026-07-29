import { describe, expect, it } from "vitest";
import { toProfile, toUpsertRequest, type ProfileResponse } from "@/lib/company-api";
import { EMPTY_PROFILE, type CompanyProfile, type PersonnelRow } from "@/lib/company";

/** 서버 응답 최소 골격 — personnel 외 섹션은 빈 배열로 둔다. */
function response(personnel: ProfileResponse["personnel"]): ProfileResponse {
  return {
    qualification: null,
    regions: [],
    licenses: [],
    certs: [],
    personnel,
    items: [],
    capacity_evals: [],
    performance_records: [],
  } as unknown as ProfileResponse;
}

function profileWith(personnel: PersonnelRow[]): CompanyProfile {
  return { ...EMPTY_PROFILE, personnel };
}

describe("인력 분야(field_family) 왕복", () => {
  it("서버의 field_family를 화면 값으로 옮긴다", () => {
    const p = toProfile(
      response([
        { qual_code: "KGRADE_MI", qual_name: "중급기술자", headcount: 2, field_family: "CIVIL" },
        { qual_code: "KGRADE_HI", qual_name: "고급기술자", headcount: 1, field_family: null },
      ]),
      EMPTY_PROFILE
    );

    expect(p.personnel).toEqual([
      { code: "KGRADE_MI", name: "중급기술자", headcount: "2", fieldFamily: "CIVIL" },
      { code: "KGRADE_HI", name: "고급기술자", headcount: "1", fieldFamily: null },
    ]);
  });

  it("분야 미지정은 null로 보낸다 — 빈 문자열을 그대로 보내면 서버가 422로 막는다", () => {
    const req = toUpsertRequest(
      profileWith([{ code: "KGRADE_HI", name: "고급기술자", headcount: "3", fieldFamily: null }])
    );

    expect(req.personnel).toEqual([
      { qual_code: "KGRADE_HI", field_family: null, headcount: 3 },
    ]);
  });

  // 서버 중복 검사 키가 (qual_code, field_family)라 같은 자격의 분야별 다중행은 정상이다.
  // 프론트가 code만으로 접거나 거르면 정당한 입력이 사라진다.
  it("같은 자격을 분야별로 나눈 여러 행을 그대로 보낸다", () => {
    const req = toUpsertRequest(
      profileWith([
        { code: "KGRADE_MI", name: "중급기술자", headcount: "2", fieldFamily: "CIVIL" },
        { code: "KGRADE_MI", name: "중급기술자", headcount: "1", fieldFamily: "ARCH" },
      ])
    );

    expect(req.personnel).toHaveLength(2);
    expect(req.personnel.map((x) => x.field_family)).toEqual(["CIVIL", "ARCH"]);
  });

  it("자격 코드가 없거나 인원이 0이면 분야가 있어도 보내지 않는다", () => {
    const req = toUpsertRequest(
      profileWith([
        { code: "", name: "", headcount: "2", fieldFamily: "CIVIL" },
        { code: "KGRADE_HI", name: "고급기술자", headcount: "0", fieldFamily: "FIRE" },
      ])
    );

    expect(req.personnel).toEqual([]);
  });
});
