"use client";

// 품목 단일 선택 — 다른 축과 달리 로컬 스냅샷이 아니라 서버 API로 검색한다.
// item_code_master가 35,171행이라 스냅샷을 둘 수 없고, 공고 참조분만 거르면
// "회사가 만드는 품목"이 아니라 "공고가 요구한 적 있는 품목"이 기준이 되어 어긋난다.
//
// 서버가 10자리(세부품명)만 돌려준다 — 8자리는 상위 물품분류라 그걸로 등록하면
// 10자리를 요구하는 공고와 코드가 어긋난다(백엔드 #54 참조).

import { useCallback } from "react";
import { MasterSearchSelect } from "@/components/master-search-select";
import { getIdToken } from "@/lib/cognito";
import type { MasterRef } from "@/lib/data/masters";

type ItemSearchResponse = { items: { item_code: string; item_name: string | null }[] };

export function ItemSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: MasterRef | null;
  onChange: (v: MasterRef | null) => void;
  ariaLabel?: string;
}) {
  const fetcher = useCallback(async (q: string) => {
    // 서버가 빈 검색어에 빈 목록을 주지만, 왕복 자체를 아낀다.
    if (!q.trim()) return [];
    const token = await getIdToken();
    if (!token) return [];
    const res = await fetch(`/api/masters/items?q=${encodeURIComponent(q)}&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ItemSearchResponse;
    return data.items.map((i) => ({ code: i.item_code, name: i.item_name ?? "" }));
  }, []);

  return (
    <MasterSearchSelect
      value={value}
      onChange={onChange}
      fetcher={fetcher}
      ariaLabel={ariaLabel}
      placeholder="품명으로 검색 (예: 노트북, 합판)"
    />
  );
}
