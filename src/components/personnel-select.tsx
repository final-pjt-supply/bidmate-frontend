"use client";

// 인력 자격·등급 단일 선택 — 로컬 스냅샷(1,255종)을 지연 로드해 검색.
// "고급기술자"(역량등급)와 "고급감리원"(감리원)처럼 이름이 비슷한 항목이 많아,
// 후보 오른쪽에 family(field)를 hint로 붙여 구분할 수 있게 한다.

import { useCallback } from "react";
import { MasterSearchSelect } from "@/components/master-search-select";
import { loadPersonnel, searchMaster, type MasterRef, type PersonnelNode } from "@/lib/data/masters";

/** 후보 구분 라벨 — 등급 있는 축은 family, 없으면 종류로 */
function hintOf(p: PersonnelNode): string {
  if (p.field && p.field !== "등급총칭" && p.field !== "역할") return p.field;
  if (p.field === "등급총칭") return "자격수준";
  if (p.qualType === "role") return "역할";
  return "자격·면허";
}

export function PersonnelSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: MasterRef | null;
  onChange: (v: MasterRef | null) => void;
  ariaLabel?: string;
}) {
  const fetcher = useCallback(async (q: string) => {
    const list = await loadPersonnel();
    return searchMaster(list, q).map((p) => ({ code: p.code, name: p.name, hint: hintOf(p) }));
  }, []);

  return (
    <MasterSearchSelect
      value={value}
      onChange={onChange}
      fetcher={fetcher}
      ariaLabel={ariaLabel}
      placeholder="자격·등급으로 검색 (예: 고급기술자, 정보통신기사)"
    />
  );
}
