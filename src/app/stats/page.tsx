import type { Metadata } from "next";
import { Topbar } from "@/components/topbar";
import { SiteFooter } from "@/components/site-footer";
import { StatsView } from "@/components/stats-view";
import mock from "@/lib/data/stats-mock.json";
import type { StatsCategory, StatsData } from "@/components/stats-view";

const CATEGORIES: StatsCategory[] = ["ALL", "cnstwk", "servc", "thng", "frgcpt"];
// 기본은 업종 무관 전체. 시장 규모를 먼저 보여주고 업종은 화면에서 좁힌다.
const toCategory = (v?: string): StatsCategory =>
  v && (CATEGORIES as string[]).includes(v) ? (v as StatsCategory) : "ALL";

export const metadata: Metadata = {
  title: "공고 통계 · 비드프렌드",
  description:
    "업종·품목별 예산 규모 분포, 자주 발주하는 수요기관, 월별 공고 추세를 확인하세요.",
};

/**
 * ⚠ 목업 단계다. 화면 느낌을 먼저 보려고 실제 DB 수치를 JSON으로 떠서 붙였다
 * (2026-08-03 기준, 2026-01~07). 집계 테이블과 API가 준비되면 이 import를
 * 서버 fetch로 바꾸고 stats-mock.json은 지운다.
 *
 * 가짜 숫자가 아니라 실제 수치를 쓴 이유는, 축 범위나 이름 길이가 실제와
 * 다르면 레이아웃 판단이 빗나가기 때문이다(기관명이 "기후에너지환경부
 * 국립환경과학원"처럼 길다).
 *
 * 화면 상태는 쿼리스트링이 정본이다(cat·tag). 검색 화면과 같은 관례다.
 * 태그 유효성은 업종별 목록을 알아야 판단할 수 있어 StatsView에서 거른다.
 */
export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; tag?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="flex flex-1 flex-col">
        <StatsView
          data={mock as StatsData}
          conditions={{ category: toCategory(sp.cat), tag: sp.tag }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
