"use client";

// 인증 단일 선택 — 로컬 스냅샷(45종)을 지연 로드해 검색.
// 45종 중 ISO만 8개(9001/13485/14001/22000/22301/27001/45001/50001)라 이름이
// 길어 잘리면 구분이 어렵다. 후보 오른쪽에 분류를 hint로 붙여 골라내게 한다.

import { useCallback } from "react";
import { MasterSearchSelect } from "@/components/master-search-select";
import { loadCerts, searchMaster, type MasterRef } from "@/lib/data/masters";

/** cert_master.category → 화면 라벨 */
const CATEGORY_LABEL: Record<string, string> = {
  infosec: "정보보안",
  quality: "품질",
  environment: "환경",
  company: "기업",
  innovation: "혁신",
  procurement: "조달",
  foreign: "해외",
  food: "식품",
  safety: "안전",
  product: "제품",
  building: "건축",
  software: "소프트웨어",
  telecom: "방송통신",
  recycle: "재활용",
  standard: "표준",
};

export function CertSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: MasterRef | null;
  onChange: (v: MasterRef | null) => void;
  ariaLabel?: string;
}) {
  const fetcher = useCallback(async (q: string) => {
    const list = await loadCerts();
    return searchMaster(list, q, 45).map((c) => ({
      code: c.code,
      name: c.name,
      hint: CATEGORY_LABEL[c.category] ?? c.category,
    }));
  }, []);

  return (
    <MasterSearchSelect
      value={value}
      onChange={onChange}
      fetcher={fetcher}
      ariaLabel={ariaLabel}
      placeholder="인증명으로 검색 (예: GS, ISO)"
    />
  );
}
