"use client";

// 본점 소재지 선택 — 시·도 → 시·군·구 종속(cascade) 2단 셀렉트.
// - 시·도를 고르면 그 시·도의 시·군·구만 옵션으로 뜬다
// - 시·도만 골라도 저장 허용(시·군·구는 "전체")
// - 저장은 고른 것 중 가장 구체적인 코드({ code, name }). 매칭 조인은 code, 표시는 name.
// region_master는 시군구 이름이 접두어 없이 "중구"라 저장 name엔 "서울특별시 중구"로 합쳐 넣는다.

import { useEffect, useMemo, useState } from "react";
import type { RegionRef } from "@/lib/company";
import { loadRegions, type RegionNode } from "@/lib/data/masters";

// 시군구 코드(5자리)의 앞 2자리가 소속 시도 코드. 시도 코드(2자리)는 그대로.
const sidoOf = (code: string) => (code.length > 2 ? code.slice(0, 2) : code);

const selectClass =
  "h-[46px] w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400";

export function RegionSelect({
  value,
  onChange,
}: {
  value: RegionRef | null;
  onChange: (v: RegionRef | null) => void;
}) {
  const [regions, setRegions] = useState<RegionNode[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadRegions().then((r) => {
      if (alive) setRegions(r);
    });
    return () => {
      alive = false;
    };
  }, []);

  const sidoCode = value ? sidoOf(value.code) : "";
  const sigunguCode = value && value.code.length > 2 ? value.code : "";

  const sidos = useMemo(() => regions?.filter((r) => r.level === "sido") ?? [], [regions]);
  const sidoName = useMemo(() => new Map(sidos.map((s) => [s.code, s.name])), [sidos]);
  const sigungus = useMemo(
    () => regions?.filter((r) => r.level === "sigungu" && r.sido === sidoCode) ?? [],
    [regions, sidoCode]
  );

  const onSido = (code: string) => {
    if (!code) return onChange(null);
    onChange({ code, name: sidoName.get(code) ?? "" }); // 시도만 선택 → 시도 저장
  };

  const onSigungu = (code: string) => {
    if (!code) {
      // 시군구 해제 → 시도만 유지
      if (sidoCode) onChange({ code: sidoCode, name: sidoName.get(sidoCode) ?? "" });
      return;
    }
    const sg = sigungus.find((s) => s.code === code);
    if (!sg) return;
    onChange({ code, name: `${sidoName.get(sidoCode) ?? ""} ${sg.name}`.trim() });
  };

  const loading = !regions;

  return (
    <div className="flex gap-2">
      <select
        aria-label="시·도"
        className={selectClass}
        value={sidoCode}
        disabled={loading}
        onChange={(e) => onSido(e.target.value)}
      >
        <option value="">시·도 선택</option>
        {sidos.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        aria-label="시·군·구"
        className={selectClass}
        value={sigunguCode}
        disabled={loading || !sidoCode || sigungus.length === 0}
        onChange={(e) => onSigungu(e.target.value)}
      >
        <option value="">{sigungus.length ? "시·군·구 (전체)" : "해당 없음"}</option>
        {sigungus.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
