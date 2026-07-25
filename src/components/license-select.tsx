"use client";

// 면허·업종 다중 선택 — 로컬 스냅샷(2,916종)을 지연 로드해 검색.
// ①면허 ⑤실적 분야 ⑦시공능력 업종이 공용으로 재사용.

import { useCallback } from "react";
import { MasterMultiSelect } from "@/components/master-multiselect";
import { MasterSearchSelect } from "@/components/master-search-select";
import { loadLicenses, searchMaster, type MasterRef } from "@/lib/data/masters";

/** 처음 검색할 때 스냅샷을 지연 로드(캐시됨), 이후는 메모리에서 필터 */
function useLicenseFetcher() {
  return useCallback(async (q: string) => {
    const list = await loadLicenses();
    return searchMaster(list, q);
  }, []);
}

export function LicenseSelect({
  value,
  onChange,
  placeholder,
}: {
  value: MasterRef[];
  onChange: (v: MasterRef[]) => void;
  placeholder?: string;
}) {
  const fetcher = useLicenseFetcher();

  return (
    <MasterMultiSelect
      value={value}
      onChange={onChange}
      fetcher={fetcher}
      placeholder={placeholder ?? "면허·업종명으로 검색 (예: 정보통신)"}
    />
  );
}

/** 면허·업종 단일 선택 — ⑤실적의 "분야", ⑦시공능력의 "업종"이 공용으로 쓴다.
 *  둘 다 한 건에 하나의 업종만 붙으므로 다중이 아니라 단일이다. */
export function LicenseOneSelect({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: MasterRef | null;
  onChange: (v: MasterRef | null) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const fetcher = useLicenseFetcher();

  return (
    <MasterSearchSelect
      value={value}
      onChange={onChange}
      fetcher={fetcher}
      ariaLabel={ariaLabel}
      placeholder={placeholder ?? "업종 검색 (예: 정보통신)"}
    />
  );
}
