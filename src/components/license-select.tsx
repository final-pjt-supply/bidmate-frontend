"use client";

// 면허·업종 다중 선택 — 로컬 스냅샷(2,916종)을 지연 로드해 검색.
// ①면허 ⑤실적 분야 ⑦시공능력 업종이 공용으로 재사용.

import { useCallback } from "react";
import { MasterMultiSelect } from "@/components/master-multiselect";
import { loadLicenses, searchMaster, type MasterRef } from "@/lib/data/masters";

export function LicenseSelect({
  value,
  onChange,
  placeholder,
}: {
  value: MasterRef[];
  onChange: (v: MasterRef[]) => void;
  placeholder?: string;
}) {
  // 처음 검색할 때 스냅샷을 지연 로드(캐시됨), 이후는 메모리에서 필터
  const fetcher = useCallback(async (q: string) => {
    const list = await loadLicenses();
    return searchMaster(list, q);
  }, []);

  return (
    <MasterMultiSelect
      value={value}
      onChange={onChange}
      fetcher={fetcher}
      placeholder={placeholder ?? "면허·업종명으로 검색 (예: 정보통신)"}
    />
  );
}
