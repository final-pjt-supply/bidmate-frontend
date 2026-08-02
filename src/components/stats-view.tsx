import Link from "next/link";
import type { BidCategory } from "@/lib/types";
import { categoryLabel } from "@/lib/format";

/**
 * 공고 통계 화면 (목업 단계).
 *
 * 차트 라이브러리를 쓰지 않고 div 막대로 그린다. 필요한 건 가로/세로 막대
 * 두 종류뿐이라 recharts(~100KB)를 들일 이유가 없고, 축 눈금·툴팁 커스터마이징에
 * 드는 시간이 직접 그리는 것보다 크다. 축이 늘거나 꺾은선·산점도가 필요해지면
 * 그때 다시 판단한다.
 *
 * 화면 상태(업종·품목·기관 정렬 기준)는 전부 URL 쿼리스트링에 둔다. 이 레포의
 * 관례이고(search-params.ts) 새로고침·공유·뒤로가기가 그냥 된다. 그래서 이 파일은
 * 클라이언트 컴포넌트가 아니고, 컨트롤은 버튼이 아니라 링크다.
 *
 * 섹션 순서는 행동에 가까운 것부터다 — 조건 → 예산 규모(참여 가능 여부를 가른다)
 * → 수요기관(누구를 볼지) → 월별 추세(참고). 추세는 7개월치라 단독으로 결정을
 * 바꾸지 못해 폭을 1/3만 준다.
 */

const CATEGORIES: BidCategory[] = ["cnstwk", "servc", "thng", "frgcpt"];
const ALL = "ALL";
const DEFAULT_CATEGORY: BidCategory = "thng";

// 예산 구간. 참여 가능 규모를 가르는 경계로 잡았다 — 소액수의(5천만),
// 적격심사 하한(2억), 종합심사 영역(10억)이 실무에서 쓰는 구분선이다.
// 라벨이 전부 받침으로 끝나서 아래 결론 문장의 조사는 항상 '이'다.
const BUDGET_LABELS = [
  "5천만 미만",
  "5천만~2억",
  "2억~10억",
  "10억~50억",
  "50억 이상",
];

export type StatsMetric = "cnt" | "eok";

type InstRow = { c: string; tag: string; name: string; cnt: number; eok: number };

export type StatsData = {
  /** 업종별 총 공고 수. 화면이 분모를 밝히는 근거다. */
  totals: Record<string, number>;
  tagTotals: Record<string, Record<string, number>>;
  /** 업종별 상위 8개 품목 태그. 이게 물량의 71~91%를 덮는다. */
  tags: Record<string, { tag: string; cnt: number }[]>;
  /** 금액 정보 자체가 없는 업종(외자). "금액이 0"과 구분해야 한다. */
  amountUnavailable: string[];
  monthly: { m: string; c: string; tag: string; cnt: number }[];
  /** 건수용·금액용을 따로 뽑는다. 건수 top-8을 금액으로 재정렬하면 순위가 틀린다. */
  institutions: { byCount: InstRow[]; byAmount: InstRow[] };
  /** 기관 순위에서 뺀 단가계약('각 수요기관') 건수. 각주로 밝힌다. */
  excludedMas: Record<string, number>;
  budget: { c: string; tag: string; b: number; cnt: number }[];
  period: { from: string; to: string };
};

export type StatsConditions = {
  category: BidCategory;
  /** URL에서 온 값이라 신뢰하지 않는다. 칩으로 고를 수 있는 태그만 인정한다. */
  tag?: string;
  metric: StatsMetric;
};

/** 조건 일부를 바꾼 통계 URL. 기본값은 쿼리에서 빼 URL을 짧게 둔다. */
function statsHref(
  current: Required<StatsConditions>,
  changes: Partial<StatsConditions>
): string {
  const next = { ...current, ...changes };
  const qs = new URLSearchParams();
  if (next.category !== DEFAULT_CATEGORY) qs.set("cat", next.category);
  if (next.tag && next.tag !== ALL) qs.set("tag", next.tag);
  if (next.metric !== "cnt") qs.set("by", next.metric);
  const s = qs.toString();
  return s ? `/stats?${s}` : "/stats";
}

/** "2026-01"~"2026-07" → "2026.01~07" (해가 넘어가면 양쪽 다 표기) */
function periodLabel({ from, to }: { from: string; to: string }): string {
  const [fy, fm] = from.split("-");
  const [ty, tm] = to.split("-");
  return fy === ty ? `${fy}.${fm}~${tm}` : `${fy}.${fm}~${ty}.${tm}`;
}

/** 기간은 헤더에 이미 적혀 있으므로 축에는 월만 둔다(좁은 칼럼에 연도까지 안 들어간다). */
const monthLabel = (m: string) => `${Number(m.slice(5))}월`;

/**
 * eok는 presmpt_prce(추정가격) 합계다. bdgt_amt가 아니므로 format.ts의 관례대로
 * 출처를 접두어로 밝힌다. 조 단위로 바꾸지 않는 건 한 목록에서 단위가 섞이면
 * 순위 비교가 어려워지기 때문이다.
 */
const formatEok = (eok: number) => `추정 ${eok.toLocaleString()}억`;

export function StatsView({
  data,
  conditions,
}: {
  data: StatsData;
  conditions: StatsConditions;
}) {
  const { category } = conditions;
  const tagOptions = data.tags[category] ?? [];
  const tag = tagOptions.some((t) => t.tag === conditions.tag) ? conditions.tag! : ALL;

  // 금액 정보가 없는 업종에서는 금액 순위가 성립하지 않는다. URL에 by=eok가 남아
  // 있어도(업종만 바꾼 경우) 건수로 되돌린다.
  const amountAvailable = !data.amountUnavailable.includes(category);
  const metric: StatsMetric = amountAvailable ? conditions.metric : "cnt";
  const current = { category, tag, metric };

  const catLabel = categoryLabel(category);
  const conditionLabel = tag === ALL ? catLabel : `${catLabel} ‘${tag}’`;
  const total = (tag === ALL ? data.totals[category] : data.tagTotals[category]?.[tag]) ?? 0;

  const trend = data.monthly
    .filter((r) => r.c === category && r.tag === tag)
    .sort((a, b) => a.m.localeCompare(b.m))
    .map((r) => ({ label: monthLabel(r.m), value: r.cnt }));

  const institutions = (metric === "cnt" ? data.institutions.byCount : data.institutions.byAmount)
    .filter((r) => r.c === category && r.tag === tag)
    .sort((a, b) => b[metric] - a[metric]);

  // 모든 공고가 다섯 구간 중 하나에 들어가므로 구간 합 = 모집단(total)이다.
  // 그래서 %의 분모를 헤더에 적힌 총계와 같은 값으로 쓸 수 있다.
  const budget = BUDGET_LABELS.map((label, i) => {
    const cnt = data.budget.find((r) => r.c === category && r.tag === tag && r.b === i)?.cnt ?? 0;
    return { label, cnt, pct: total ? (cnt / total) * 100 : 0 };
  });

  // hint는 "읽는 법"이 아니라 데이터에서 계산한 결론 한 줄이다. 7개월치로는
  // 근거가 없으므로 예측·추천은 쓰지 않는다(사실만).
  const topBudget = budget.reduce((a, b) => (b.cnt > a.cnt ? b : a));
  const budgetHint =
    total > 0
      ? `${topBudget.label}이 ${topBudget.cnt.toLocaleString()}건(${topBudget.pct.toFixed(1)}%)으로 가장 많아요`
      : "";

  const topInst = institutions[0];
  const instHint = !topInst
    ? ""
    : metric === "cnt"
      ? `가장 많이 발주한 곳은 ${topInst.name}(${topInst.cnt.toLocaleString()}건)이에요`
      : `추정가격 합계가 가장 큰 곳은 ${topInst.name}(${formatEok(topInst.eok)})이에요`;

  const peak = trend.length ? trend.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const trendHint = peak
    ? `${peak.label}이 ${peak.value.toLocaleString()}건으로 가장 많았어요 · 월평균 ${Math.round(
        trend.reduce((s, r) => s + r.value, 0) / trend.length
      ).toLocaleString()}건`
    : "";

  const excludedMas = data.excludedMas[category] ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-16 pt-7 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900">공고 통계</h1>
        <p className="text-sm text-slate-500">
          <span className="text-base font-bold text-gray-900">
            {conditionLabel} {total.toLocaleString()}건
          </span>
          {" · "}
          {periodLabel(data.period)} 나라장터 공고 기준 · 진행 중인 달은 뺐어요
        </p>
      </header>

      {/* 업종 → 품목 2단계 선택. 태그가 73종이라 한 번에 나열할 수 없다.
          한 번 고르고 마는 컨트롤이라 solid 채움은 쓰지 않는다(화면의 solid는 CTA 하나). */}
      <section
        aria-label="집계 조건 선택"
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-surface p-4"
      >
        <div className="flex flex-wrap gap-2.5">
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <Link
                key={c}
                // 업종이 바뀌면 품목 목록 자체가 달라진다
                href={statsHref(current, { category: c, tag: ALL })}
                aria-current={active ? "true" : undefined}
                className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {categoryLabel(c)}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-slate-200 pt-3">
          <TagChip
            href={statsHref(current, { tag: ALL })}
            active={tag === ALL}
            label="전체"
            count={data.totals[category] ?? 0}
          />
          {tagOptions.map((t) => (
            <TagChip
              key={t.tag}
              href={statsHref(current, { tag: t.tag })}
              active={tag === t.tag}
              label={t.tag}
              count={t.cnt}
            />
          ))}
        </div>
      </section>

      {/* 이 화면에서 가장 강조하는 섹션. "우리가 들어갈 수 있는 규모인가"가
          참여 여부를 가장 먼저 가른다. */}
      <Section title="예산 규모 분포" hint={amountAvailable ? budgetHint : ""} strong>
        {!amountAvailable ? (
          // 외자는 presmpt_prce가 전부 0이다. "금액이 0"이 아니라 "값을 못 받았다"는
          // 뜻이라 0을 사실로 그리면 "전부 5천만 미만 100%"라는 거짓이 뜬다.
          // (bid-detail-view의 null 처리와 같은 원칙)
          <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            {catLabel} 공고는 금액 정보가 제공되지 않아요. 규모 분포 대신 건수 기준으로만 볼 수 있어요.
          </p>
        ) : total === 0 ? (
          <Empty conditionLabel={conditionLabel} />
        ) : (
          <>
            <RankList
              strong
              rows={budget.map((b) => ({
                key: b.label,
                label: b.label,
                text: `${b.cnt.toLocaleString()}건`,
                note: `${b.pct.toFixed(1)}%`,
                weight: b.cnt,
              }))}
            />
            <p className="text-xs text-slate-500">
              추정가격 기준 · {conditionLabel} {total.toLocaleString()}건이 분모예요
            </p>
          </>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section
            title="자주 발주하는 수요기관"
            hint={instHint}
            action={
              <MetricToggle
                current={current}
                amountAvailable={amountAvailable}
                catLabel={catLabel}
              />
            }
          >
            {institutions.length === 0 ? (
              <Empty conditionLabel={conditionLabel} />
            ) : (
              <RankList
                rows={institutions.map((r) => ({
                  key: r.name,
                  label: r.name,
                  text: metric === "cnt" ? `${r.cnt.toLocaleString()}건` : formatEok(r.eok),
                  weight: r[metric],
                  // 검색 q는 공고명·수요기관·공고기관 부분일치라 기관명을 그대로 넘긴다.
                  href: `/search?cat=${category}&q=${encodeURIComponent(r.name)}`,
                }))}
              />
            )}
            {excludedMas > 0 && (
              <p className="text-xs text-slate-500">
                ‘각 수요기관’(다수공급자·제3자단가계약)은 특정 기관이 아니라서 순위에서 뺐어요 —{" "}
                {catLabel} 전체 {excludedMas.toLocaleString()}건.
              </p>
            )}
          </Section>
        </div>

        <Section title="월별 공고 추세" hint={trendHint}>
          {trend.length === 0 ? <Empty conditionLabel={conditionLabel} /> : <BarChart rows={trend} />}
        </Section>
      </div>

      {/* 화면의 주요 CTA는 하나. 섹션마다 달면 버튼이 13개가 된다(기관 행은 링크로 대신).
          검색 API에 품목 필터가 없어 넘어가는 건 업종뿐이라, 버튼 문구에 업종만 적고
          품목을 고른 경우엔 아래에 한 줄로 밝힌다. */}
      <div className="flex flex-col items-center gap-2 pt-1">
        <Link
          href={`/search?cat=${category}`}
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
        >
          {catLabel} 공고 보러 가기
        </Link>
        {tag !== ALL && (
          <p className="text-xs text-slate-500">
            공고 검색은 업종 단위라 ‘{tag}’ 품목 조건은 함께 넘어가지 않아요.
          </p>
        )}
      </div>
    </div>
  );
}

function TagChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-md border px-2.5 py-1 text-xs font-bold transition-colors ${
        active
          ? "border-indigo-300 bg-indigo-50 text-indigo-800"
          : "border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-700"
      }`}
    >
      {label}
      <span className={`ml-1 font-normal ${active ? "text-indigo-700" : "text-slate-500"}`}>
        {count.toLocaleString()}
      </span>
    </Link>
  );
}

/** 건수/금액 전환. 금액 정보가 없는 업종에서는 금액 쪽을 비활성으로 둔다. */
function MetricToggle({
  current,
  amountAvailable,
  catLabel,
}: {
  current: Required<StatsConditions>;
  amountAvailable: boolean;
  catLabel: string;
}) {
  const cls = (active: boolean) =>
    `rounded px-2.5 py-1 text-xs font-bold transition-colors ${
      active ? "bg-surface text-indigo-700 shadow-sm" : "text-slate-500"
    }`;
  return (
    <div className="flex shrink-0 gap-0.5 rounded-md bg-slate-100 p-0.5">
      <Link
        href={statsHref(current, { metric: "cnt" })}
        aria-current={current.metric === "cnt" ? "true" : undefined}
        className={cls(current.metric === "cnt")}
      >
        건수
      </Link>
      {amountAvailable ? (
        <Link
          href={statsHref(current, { metric: "eok" })}
          aria-current={current.metric === "eok" ? "true" : undefined}
          className={cls(current.metric === "eok")}
        >
          금액
        </Link>
      ) : (
        <span
          aria-disabled="true"
          title={`${catLabel} 공고는 금액 정보가 제공되지 않아요`}
          className="cursor-not-allowed rounded px-2.5 py-1 text-xs font-bold text-slate-500 opacity-60"
        >
          금액
        </span>
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  action,
  strong,
  children,
}: {
  title: string;
  hint: string;
  action?: React.ReactNode;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col gap-4 rounded-xl border border-slate-200 bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className={`font-bold text-gray-900 ${strong ? "text-lg" : "text-base"}`}>{title}</h2>
          {hint && <p className="text-sm text-slate-600">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** 세로 막대. 값 자체보다 "언제 몰리는가"를 보는 용도라 눈금선은 두지 않는다. */
function BarChart({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex h-[150px] items-end gap-1">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-bold text-slate-600">{r.value.toLocaleString()}</span>
          <div
            aria-hidden="true"
            className="w-full rounded-t bg-indigo-500"
            style={{ height: `${Math.max(2, (r.value / max) * 96)}px` }}
          />
          <span className="text-xs whitespace-nowrap text-slate-500">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

type RankRow = {
  key: string;
  label: string;
  /** 단위까지 붙인 표시 문자열. 화면 전체를 toLocaleString으로 통일한다. */
  text: string;
  note?: string;
  weight: number;
  href?: string;
};

/** 가로 막대 + 라벨. 기관명이 길어 세로 막대로는 축 글자가 안 들어간다. */
function RankList({ rows, strong }: { rows: RankRow[]; strong?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.weight));
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-slate-700" title={r.label}>
                {r.label}
              </span>
              <span
                className={`shrink-0 font-bold whitespace-nowrap text-gray-900 ${
                  strong ? "text-base" : "text-sm"
                }`}
              >
                {r.text}
                {r.note && <span className="ml-1.5 text-xs font-normal text-slate-500">{r.note}</span>}
              </span>
            </div>
            {/* 값이 옆에 텍스트로 있으므로 막대는 장식이다 */}
            <div aria-hidden="true" className="h-1.5 w-full rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.max(1, (r.weight / max) * 100)}%` }}
              />
            </div>
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <Link
                href={r.href}
                className="-mx-2 flex flex-col gap-1 rounded-md px-2 py-1 transition-colors hover:bg-slate-50"
              >
                {body}
              </Link>
            ) : (
              <div className="flex flex-col gap-1">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Empty({ conditionLabel }: { conditionLabel: string }) {
  return (
    <p className="py-8 text-center text-sm text-slate-500">
      {conditionLabel} 조건에는 집계할 공고가 없어요.
    </p>
  );
}
