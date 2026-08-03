import Link from "next/link";
import type { StatsCategory, StatsData } from "@/lib/api/stats";
import { categoryLabel } from "@/lib/format";

/**
 * 공고 통계 화면.
 *
 * 데이터는 GET /stats에서 한 조건(업종 x 품목) 분량만 내려온다 — 이 컴포넌트는
 * 거르지 않고 받은 대로 그린다. 집계는 DB의 bid_stats matview에 있다.
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
 * 섹션 순서는 조건 → 월별 추세 → 수요기관 → 예산 규모다. 월별 추세를 맨 위에 크게
 * 두는 건 조건을 바꿀 때 형태가 가장 눈에 띄게 달라지는 그래프여서다. 나머지 둘은
 * 순위·분포라 목록에 가깝고, 좁은 폭에서도 읽힌다.
 */

/** 업종 무관 집계. 백엔드 StatsCategory / matview의 category 값과 같은 문자열. */
const ALL = "ALL";

const CATEGORIES: StatsCategory[] = [ALL, "cnstwk", "servc", "thng", "frgcpt"];
// 통계 화면의 첫 인상은 시장 전체 규모다. 업종은 그다음에 좁힌다.
const DEFAULT_CATEGORY: StatsCategory = ALL;

const catLabelOf = (c: StatsCategory) => (c === ALL ? "전체" : categoryLabel(c));

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

type Conditions = { category: StatsCategory; tag: string };

/** 조건 일부를 바꾼 통계 URL. 기본값은 쿼리에서 빼 URL을 짧게 둔다. */
function statsHref(current: Conditions, changes: Partial<Conditions>): string {
  const next = { ...current, ...changes };
  const qs = new URLSearchParams();
  if (next.category !== DEFAULT_CATEGORY) qs.set("cat", next.category);
  if (next.tag && next.tag !== ALL) qs.set("tag", next.tag);
  const s = qs.toString();
  return s ? `/stats?${s}` : "/stats";
}

/** 공고 검색으로 넘기는 링크. '전체'는 업종 조건 없이 보낸다(검색의 cat은 업종 코드만 받는다). */
function searchHref(category: StatsCategory, q?: string): string {
  const qs = new URLSearchParams();
  if (category !== ALL) qs.set("cat", category);
  if (q) qs.set("q", q);
  const s = qs.toString();
  return s ? `/search?${s}` : "/search";
}

/** "2026-01"~"2026-07" → "2026.01~07" (해가 넘어가면 양쪽 다 표기) */
function periodLabel({ from, to }: { from: string; to: string }): string {
  const [fy, fm] = from.split("-");
  const [ty, tm] = to.split("-");
  return fy === ty ? `${fy}.${fm}~${tm}` : `${fy}.${fm}~${ty}.${tm}`;
}

/** 기간은 헤더에 이미 적혀 있으므로 축에는 월만 둔다(좁은 칼럼에 연도까지 안 들어간다). */
const monthLabel = (m: string) => `${Number(m.slice(5))}월`;

export function StatsView({
  data,
  categoryTotal,
}: {
  data: StatsData;
  /** '전체' 칩에 붙는 업종 총계. 응답의 total은 조건 단위라 품목을 고르면 달라진다. */
  categoryTotal: number;
}) {
  // 조건은 서버가 확정해 돌려준 값을 쓴다. tag 유효성(상위 8개 안인지)은 화면이
  // 판단할 수 없다 — 고를 수 있는 목록이 이 응답 안에 들어 있기 때문이다.
  const category = data.conditions.category;
  const tag = data.conditions.tag ?? ALL;
  const tagOptions = data.tags;

  // 예산 분포를 그릴 수 있는 업종인지. 외자는 금액 자체가 안 들어온다.
  const amountAvailable = data.amount_available;
  const current = { category, tag };

  const catLabel = catLabelOf(category);
  const conditionLabel = tag === ALL ? catLabel : `${catLabel} ‘${tag}’`;
  const total = data.total;

  // 축은 1~12월 열두 칸 고정이다. 관측된 달만 그리면 칸이 넓어져 막대가 기둥처럼
  // 보이고, 무엇보다 7칸짜리 축은 "한 해가 7개월"인 것처럼 읽힌다.
  // 아직 안 온 달은 0이 아니라 null이다 — 0으로 그리면 "그 달 발주가 없었다"는
  // 거짓이 된다(집계가 진행 중인 달을 빼는 것과 같은 이유).
  // 기간이 해를 넘기면 열두 칸에 안 들어가므로 관측된 달만 그대로 쓴다.
  const observed = [...data.monthly].sort((a, b) => a.m.localeCompare(b.m));
  const [fromYear, toYear] = [data.period.from.slice(0, 4), data.period.to.slice(0, 4)];
  const trend =
    fromYear === toYear
      ? Array.from({ length: 12 }, (_, i) => {
          const m = `${toYear}-${String(i + 1).padStart(2, "0")}`;
          return { label: `${i + 1}월`, value: observed.find((r) => r.m === m)?.cnt ?? null };
        })
      : observed.map((r) => ({ label: monthLabel(r.m), value: r.cnt as number | null }));

  const institutions = data.institutions;

  // %의 분모는 헤더 총계가 아니라 구간 합이다. 업종을 하나 고르면 둘이 같지만,
  // '전체'에서는 금액 정보가 없는 외자가 예산 집계에서만 빠져 총계보다 작다.
  // 총계로 나누면 %가 100에 못 미친다(실제로 97.7%가 된다).
  const budgetTotal = data.budget.total;
  const budget = BUDGET_LABELS.map((label, i) => {
    // 0건인 구간은 응답에 행이 없다. 다섯 칸은 항상 그려야 분포가 읽힌다.
    const cnt = data.budget.buckets.find((r) => r.b === i)?.cnt ?? 0;
    return { label, cnt, pct: budgetTotal ? (cnt / budgetTotal) * 100 : 0 };
  });

  // hint는 "읽는 법"이 아니라 데이터에서 계산한 결론 한 줄이다. 7개월치로는
  // 근거가 없으므로 예측·추천은 쓰지 않는다(사실만).
  const topBudget = budget.reduce((a, b) => (b.cnt > a.cnt ? b : a));
  const budgetHint =
    total > 0
      ? `${topBudget.label}이 ${topBudget.cnt.toLocaleString()}건(${topBudget.pct.toFixed(1)}%)으로 가장 많아요`
      : "";

  const topInst = institutions[0];
  const instHint = topInst
    ? `가장 많이 발주한 곳은 ${topInst.name}(${topInst.cnt.toLocaleString()}건)이에요`
    : "";

  // 아직 안 온 달은 평균에서도 빼야 한다. 열두 칸으로 나누면 없는 5개월이
  // 0건으로 취급돼 월평균이 실제의 7/12로 내려간다.
  const filled = trend.filter((r): r is { label: string; value: number } => r.value !== null);
  const peak = filled.length ? filled.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const trendHint = peak
    ? `${peak.label}이 ${peak.value.toLocaleString()}건으로 가장 많았어요 · 월평균 ${Math.round(
        filled.reduce((s, r) => s + r.value, 0) / filled.length
      ).toLocaleString()}건`
    : "";

  const excludedMas = data.excluded_mas;

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
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-surface p-4 shadow-[0_1px_2px_0_var(--shadow-10)]"
      >
        <div className="flex flex-wrap gap-2.5">
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <Link
                key={c}
                // 업종이 바뀌면 품목 목록 자체가 달라진다
                href={statsHref(current, { category: c, tag: ALL })}
                // 같은 화면의 조건만 바꾸는 링크다. 기본값(맨 위로 스크롤)을 두면
                // 아래쪽 섹션을 보다가 조건을 바꿀 때마다 화면이 튄다.
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {catLabelOf(c)}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-slate-200 pt-3">
          <TagChip
            href={statsHref(current, { tag: ALL })}
            active={tag === ALL}
            label="전체"
            count={categoryTotal}
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

      {/* 이 화면의 메인 그래프. 조건을 바꿀 때마다 형태가 가장 크게 달라지는 것이
          월별 추세라, 폭을 다 주고 맨 위에 둔다. */}
      <Section title="월별 공고 추세" hint={trendHint} strong>
        {trend.length === 0 ? (
          <Empty conditionLabel={conditionLabel} />
        ) : (
          <BarChart rows={trend} />
        )}
      </Section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="자주 발주하는 수요기관" hint={instHint}>
            {institutions.length === 0 ? (
              <Empty conditionLabel={conditionLabel} />
            ) : (
              <RankList
                rows={institutions.map((r) => ({
                  key: r.name,
                  label: r.name,
                  text: `${r.cnt.toLocaleString()}건`,
                  weight: r.cnt,
                  // 검색 q는 공고명·수요기관·공고기관 부분일치라 기관명을 그대로 넘긴다.
                  href: searchHref(category, r.name),
                }))}
              />
            )}
            {excludedMas > 0 && (
              <p className="text-xs text-slate-500">
                ‘각 수요기관’(다수공급자·제3자단가계약)은 특정 기관이 아니라서 순위에서 뺐어요 —{" "}
                {catLabel} 공고 {excludedMas.toLocaleString()}건.
              </p>
            )}
          </Section>
        </div>

        <Section title="예산 규모 분포" hint={amountAvailable ? budgetHint : ""}>
          {!amountAvailable ? (
            // 외자는 presmpt_prce가 전부 0이다. "금액이 0"이 아니라 "값을 못 받았다"는
            // 뜻이라 0을 사실로 그리면 "전부 5천만 미만 100%"라는 거짓이 뜬다.
            // (bid-detail-view의 null 처리와 같은 원칙)
            <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              {catLabel} 공고는 금액 정보가 제공되지 않아요. 규모 분포 대신 건수 기준으로만 볼 수
              있어요.
            </p>
          ) : total === 0 ? (
            <Empty conditionLabel={conditionLabel} />
          ) : (
            <>
              <RankList
                rows={budget.map((b) => ({
                  key: b.label,
                  label: b.label,
                  text: `${b.cnt.toLocaleString()}건`,
                  note: `${b.pct.toFixed(1)}%`,
                  weight: b.cnt,
                }))}
              />
              <p className="text-xs text-slate-500">
                추정가격 기준 · {budgetTotal.toLocaleString()}건이 분모예요
                {budgetTotal < total &&
                  ` — ${(total - budgetTotal).toLocaleString()}건은 금액 정보가 없어 뺐어요`}
              </p>
            </>
          )}
        </Section>
      </div>

      {/* 화면의 주요 CTA는 하나. 섹션마다 달면 버튼이 13개가 된다(기관 행은 링크로 대신).
          검색 API에 품목 필터가 없어 넘어가는 건 업종뿐이라, 버튼 문구에 업종만 적고
          품목을 고른 경우엔 아래에 한 줄로 밝힌다. */}
      <div className="flex flex-col items-center gap-2 pt-1">
        <Link
          href={searchHref(category)}
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
      scroll={false}
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

function Section({
  title,
  hint,
  strong,
  children,
}: {
  title: string;
  hint: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    // 라이트에서 페이지 배경(slate-50)과 카드(흰색)의 ΔL*가 1.9뿐이라 테두리만으로는
    // 카드가 뜨지 않는다. 배경을 더 내리면 다크에서 오히려 대비가 줄어(#10161f→#161d27)
    // 반대 결과가 나오므로, 배경 대신 그림자로 띄운다. 값은 bid-card의 hover 그림자와
    // 같은 토큰을 쓰되 한 단계 약하게 — 카드가 13개라 강하면 화면이 시끄럽다.
    <section className="flex h-full flex-col gap-4 rounded-xl border border-slate-200 bg-surface p-5 shadow-[0_1px_2px_0_var(--shadow-10)]">
      <div className="flex flex-col gap-1">
        <h2 className={`font-bold text-gray-900 ${strong ? "text-lg" : "text-base"}`}>{title}</h2>
        {hint && <p className="text-sm text-slate-600">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * 세로 막대. 값 자체보다 "언제 몰리는가"를 보는 용도라 눈금선은 두지 않는다.
 * value가 null인 칸은 아직 집계되지 않은 달이다. 0높이 막대로 그리지 않고 칸만
 * 비운다 — 바닥에 붙은 막대는 "발주 0건"으로 읽히는데 그건 사실이 아니다.
 */
function BarChart({ rows }: { rows: { label: string; value: number | null }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <div className="flex h-[320px] items-end gap-1.5 sm:gap-2">
      {rows.map((r) => {
        const top = r.value !== null && r.value === max;
        const value = r.value === null ? "집계 전" : `${r.value.toLocaleString()}건`;
        return (
          <div key={r.label} className="group relative flex flex-1 flex-col items-center gap-2">
            {/* 값은 hover·focus 때만 띄운다. 막대마다 숫자를 상시 노출하면 차트가
                숫자판이 되어 정작 형태(언제 몰리는가)가 안 읽힌다. 마우스가 없는
                환경을 위해 포커스에도 같이 열고, 막대 자체에 aria-label을 달아
                스크린리더는 tooltip 없이도 값을 읽게 한다.
                크기·그림자는 sync-indicator의 툴팁을 따르되 배경은 bg-tooltip(라이트에서
                slate-400)을 쓰지 않는다 — 흰 글자 대비가 2.6:1이라 값을 읽는 용도로는 못 쓴다.
                slate-700은 두 모드 모두 흰 글자 9.6:1이고, 라이트에선 카드보다 어둡고
                다크에선 표면보다 밝아 양쪽에서 떠 보인다. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded-md bg-slate-700 px-[13px] py-[7px] text-[12px] leading-[1.4] font-medium whitespace-nowrap text-white opacity-0 shadow-[0px_4px_10px_rgba(30,41,59,0.25)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              {r.label} {value}
            </span>
            <div
              role="img"
              aria-label={`${r.label} ${value}`}
              tabIndex={0}
              className={`w-full cursor-default rounded-t transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                r.value === null
                  ? "bg-slate-100"
                  : top
                    ? "bg-indigo-500 hover:bg-indigo-600"
                    : "bg-indigo-200 hover:bg-indigo-300"
              }`}
              // 집계 전 칸은 축에 자리만 남긴다(2px). 값이 있는 칸의 최소 높이(4px)보다
              // 낮게 둬야 "아주 적은 달"과 구분된다.
              style={{ height: r.value === null ? "2px" : `${Math.max(4, (r.value / max) * 270)}px` }}
            />
            <span
              className={`text-xs whitespace-nowrap ${
                r.value === null
                  ? "text-slate-300"
                  : top
                    ? "font-bold text-indigo-700"
                    : "text-slate-500"
              }`}
            >
              {r.label}
            </span>
          </div>
        );
      })}
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
    <ul className="flex flex-col gap-3.5">
      {rows.map((r) => {
        const top = r.weight === max;
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
              </span>
            </div>
            {/* 막대가 이 섹션의 본문이다. 얇게 깔면 라벨의 밑줄로 읽혀 눈이 숫자만
                보고 지나간다. 비율(note)은 막대 아래로 내려 "그림 → 수치" 순서로 읽히게 했다.
                hint 문장이 짚는 1위만 채도를 살린다 — 전부 같은 색이면 "가장 많아요"라고
                써 있어도 눈이 그 막대를 못 찾는다. */}
            <div
              aria-hidden="true"
              className={`w-full rounded-full bg-slate-100 ${strong ? "h-3.5" : "h-2.5"}`}
            >
              <div
                className={`h-full rounded-full transition-colors ${
                  top ? "bg-indigo-500" : "bg-indigo-200 group-hover/row:bg-indigo-300"
                }`}
                style={{ width: `${Math.max(1, (r.weight / max) * 100)}%` }}
              />
            </div>
            {r.note && (
              <span className={`text-xs ${top ? "font-bold text-indigo-700" : "text-slate-500"}`}>
                {r.note}
              </span>
            )}
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <Link
                href={r.href}
                className="group/row -mx-2 flex flex-col gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-50"
              >
                {body}
              </Link>
            ) : (
              <div className="group/row flex flex-col gap-1.5">{body}</div>
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
