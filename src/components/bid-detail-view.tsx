"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, ChevronRight, ExternalLink, Lock, MessageCircleQuestion } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Bid } from "@/lib/types";
import { categoryLabel, computeDday } from "@/lib/format";
import { isScrapped, subscribeScraps, toggleScrap } from "@/lib/scraps";
import { logEvent } from "@/lib/analytics/track";
import { getIdToken } from "@/lib/cognito";
import type { Match } from "@/lib/types";
import { BidbotDock, type BotMode } from "@/components/bidbot-dock";
import { MatchAxesTable } from "@/components/match-axes-table";

const DDAY_STYLE: Record<string, string> = {
  urgent: "bg-rose-50 text-orange-700",
  normal: "bg-slate-200 text-slate-500",
  always: "bg-orange-100 text-yellow-700",
  closed: "bg-slate-200 text-slate-500",
  unknown: "bg-slate-200 text-slate-500",
};

// 기업규모 제한 — bid_table.company_size_limit 실측 5종(전 23,610건). 상류에서 이 5종
// 외의 값은 나오지 않지만, 새 값이 생겨도 "제한 있음"으로 안전하게 흘리도록 폴백을 둔다.
// (sme_only만 처리하던 탓에 726건이 "제한 없음"으로 잘못 표시됐다 — 참여 못 하는 공고를
//  가능하다고 알려주는 방향의 오류라, 모르는 값은 "제한 없음"으로 흘리지 않는다.)
const SIZE_LIMIT_LABEL: Record<string, string> = {
  sme_only: "중소기업만 참여 가능",
  small_only: "소기업만 참여 가능",
  no_conglomerate: "대기업 참여 불가",
  // TODO(#51 후속): no_large가 중견기업까지 배제하는지 원문(name_raw) 스팟체크로 확정.
  //   확정 전까지 no_conglomerate와 같은 문구로 둔다(211건).
  no_large: "대기업 참여 불가",
  none: "제한 없음",
};

/** 기업규모 제한 라벨. 빈값·null은 제한 없음, 모르는 값은 "제한 있음"으로 폴백. */
function sizeLimitLabel(v: string | null | undefined): string {
  if (!v) return "제한 없음";
  return SIZE_LIMIT_LABEL[v] ?? "제한 있음";
}

/** 금액(원) → "1.21억 원" / "5,660만 원" / "1,200원" */
function formatKRW(v: number | null): string {
  if (v == null) return "미정";
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(2)}억 원`;
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만 원`;
  return `${v.toLocaleString()}원`;
}

/** ISO → "2026-07-16" 또는 "2026-07-16 11:00" (KST 기준) */
function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "미정";
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  if (!withTime) return date;
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${date} ${time}`;
}

/** 섹션 카드 래퍼 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

/** 라벨 + 값 셀 */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}

export function BidDetailView({ bid }: { bid: Bid }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const isMember = ready && !!user;
  const [botMode, setBotMode] = useState<BotMode>("closed");

  // 매칭(bid.match)은 서버 컴포넌트가 비로그인 상태로 받아온 값이라 항상 null이다
  // (Cognito 토큰이 브라우저에만 있어 SSR 요청엔 못 싣는다). 로그인 회원이면 마운트 후
  // 인증을 실어 한 번 더 받는다 — 공개 정보(SSR, 캐시)와 개인화 정보(CSR, 무캐시)를
  // 분리해서, 매칭 데이터가 다른 사용자의 캐시로 새어나가는 일을 막는다.
  const [match, setMatch] = useState<Match | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
    if (!isMember) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatchLoading(true);
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`/api/bids/${encodeURIComponent(bid.bid_id)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { match: Match | null };
        if (alive) setMatch(data.match);
      } catch (err) {
        console.error("매칭 결과 로드 실패:", err);
      } finally {
        if (alive) setMatchLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isMember, bid.bid_id]);

  // 상세 조회 + 체류시간(dwell): 진입 시점이 아니라 "이탈 시점"에 한 번 발사해
  // 얼마나 오래 봤는지(properties.dwell_ms)를 함께 기록한다. 관심도 강신호.
  useEffect(() => {
    const start = performance.now();
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      const dwell_ms = Math.round(performance.now() - start);
      logEvent("bid_detail_viewed", { bid_id: bid.bid_id, properties: { dwell_ms } });
    };
    // 탭 닫힘/새로고침(pagehide) + SPA 이동/언마운트(cleanup) 모두 커버, 중복 방지
    window.addEventListener("pagehide", fire);
    return () => {
      window.removeEventListener("pagehide", fire);
      fire();
    };
  }, [bid.bid_id]);

  const askBidbot = () => {
    logEvent("bid_question_clicked", { bid_id: bid.bid_id });
    if (isMember) {
      logEvent("chatbot_opened", { properties: { referrer_page: "bid_detail" } });
      setBotMode("popover");
    } else {
      router.push("/login");
    }
  };

  // 스크랩(북마크) — 서버 저장분(메모리 캐시)을 구독한다. 목록 카드와 같은 캐시라
  // 한쪽에서 바꾸면 다른 쪽도 즉시 따라온다.
  const scrapped = useSyncExternalStore(
    subscribeScraps,
    useCallback(() => isScrapped(bid.bid_id), [bid.bid_id]),
    () => false
  );
  const toggleBookmark = () => {
    if (!isMember || !user) {
      router.push("/login");
      return;
    }
    const next = toggleScrap(bid.bid_id);   // 낙관적 — 즉시 반영, 실패 시 자동 되돌림
    logEvent("bid_bookmarked", { bid_id: bid.bid_id, properties: { on: next } });
  };

  const dday = computeDday(bid.bid_clse_dt);
  const q = bid.qualification;

  // 자격요건 항목 라벨 매핑
  const licenses =
    q?.required_licenses && q.required_licenses.length > 0
      ? q.required_licenses.map((l) => l.name_raw).join(", ")
      : "제한 없음";
  const certs =
    q?.required_certs && q.required_certs.length > 0 ? q.required_certs.join(", ") : "요구 없음";
  const perf =
    q?.performance_reqs && q.performance_reqs.length > 0
      ? q.performance_reqs.map((p) => p.scope_raw).join(", ")
      : "요구 없음";

  const qualFields: { label: string; value: string }[] = q
    ? [
        { label: "기업규모 제한", value: sizeLimitLabel(q.company_size_limit) },
        { label: "지역제한", value: q.region_limit_type ? (q.region_limit_names?.join(", ") ?? "제한 있음") : "제한 없음" },
        { label: "필수 면허·등록", value: licenses },
        { label: "필수 인증", value: certs },
        { label: "직접생산 확인", value: q.direct_production_req ? "필요" : "요구 없음" },
        { label: "실적요건", value: perf },
        { label: "공동수급", value: q.joint_venture_allowed ? "허용" : "불가" },
        { label: "하도급", value: q.subcontract_allowed ? "허용" : "불가" },
      ]
    : [];

  const techWeight = q?.tech_weight ?? null;
  const priceWeight = q?.price_weight ?? null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 pb-16 pt-6 sm:px-6 lg:px-10">
      {/* breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-slate-400">
        <Link href="/search" className="transition-colors hover:text-slate-600">
          공고
        </Link>
        <ChevronRight className="size-3 shrink-0" strokeWidth={2} />
        <span className="max-w-[420px] truncate text-slate-600" title={bid.bid_ntce_nm}>
          {bid.bid_ntce_nm}
        </span>
      </nav>

      {/* 헤더 카드 */}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-1.5">
            <span className="rounded-md bg-indigo-50 px-[9px] py-[3px] text-xs font-bold text-indigo-800">
              {categoryLabel(bid.bid_category)}
            </span>
            {bid.cntrct_cncls_mthd_nm && (
              <span className="rounded-md bg-slate-100 px-[9px] py-[3px] text-xs font-bold text-slate-600">
                {bid.cntrct_cncls_mthd_nm}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleBookmark}
            aria-label={scrapped ? "스크랩 해제" : "스크랩"}
            aria-pressed={scrapped}
            className={`transition-colors ${
              scrapped ? "text-indigo-600" : "text-slate-300 hover:text-indigo-600"
            }`}
          >
            <Bookmark className={`size-5 ${scrapped ? "fill-current" : ""}`} strokeWidth={2} />
          </button>
        </div>

        <h1 className="text-2xl font-bold leading-snug text-gray-900">{bid.bid_ntce_nm}</h1>
        <p className="text-sm text-gray-500">
          {bid.dminstt_nm}
          {bid.ntce_instt_nm ? ` · 공고기관 ${bid.ntce_instt_nm}` : ""}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`rounded-md px-2.5 py-1 text-sm font-bold ${DDAY_STYLE[dday.kind]}`}>
            {dday.kind === "urgent" || dday.kind === "normal" ? "입찰 마감 " : ""}
            {dday.text}
          </span>
          {/* 매칭 점수 표시는 제거했다 — 백엔드는 점수가 아니라 판정(verdict) 구조다.
              적합도 안내는 아래 적합도 블록이 담당한다. */}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={askBidbot}
            className="flex items-center gap-1.5 rounded-md bg-indigo-700 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
          >
            <MessageCircleQuestion className="size-4" strokeWidth={2} />이 공고에 대해 질문하기
          </button>
          {bid.bid_ntce_dtl_url && (
            <a
              href={bid.bid_ntce_dtl_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => logEvent("bid_external_link_clicked", { bid_id: bid.bid_id })}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
            >
              <ExternalLink className="size-4" strokeWidth={2} />
              나라장터 원문 보기
            </a>
          )}
        </div>
        <p className="text-xs text-slate-400">로그인하면 이 공고에 대해 챗봇에 질문할 수 있어요.</p>
      </section>

      {/* 적합도: 비회원 잠금 / 회원 로딩 / 회원 표 또는 미계산 안내 */}
      {isMember && matchLoading ? (
        <section className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-8">
          <div className="h-24 w-full max-w-sm animate-pulse rounded-lg bg-slate-100" />
        </section>
      ) : isMember && match ? (
        <Section title="우리 회사 적합도">
          <MatchAxesTable verdict={match.verdict} axes={match.axes} />
        </Section>
      ) : (
        <section className="flex flex-col items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-8 text-center">
          <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
            <Lock className="size-[22px] text-indigo-600" strokeWidth={2} />
          </span>
          {isMember ? (
            <>
              <p className="text-lg font-bold text-gray-900">아직 적합도가 계산되지 않았어요</p>
              <p className="text-sm text-gray-500">
                회사 정보를 등록하면 이 공고가 우리 회사와 맞는지 항목별로 확인할 수 있어요.
              </p>
              <Link
                href="/mypage?edit=1"
                className="mt-1 rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
              >
                회사 정보 입력하기
              </Link>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-gray-900">로그인하면 우리 회사 적합도를 확인할 수 있어요</p>
              <p className="text-sm text-gray-500">
                회사 정보를 등록하면 이 공고가 우리 회사와 얼마나 맞는지 항목별로 보여드려요.
              </p>
              <div className="mt-1 flex gap-2">
                <Link
                  href="/login"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
                >
                  회원가입
                </Link>
              </div>
            </>
          )}
        </section>
      )}

      {/* 공고 핵심 정보 */}
      <Section title="공고 핵심 정보">
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Field label="추정가격" value={formatKRW(bid.presmpt_prce)} />
          <Field label="배정예산" value={formatKRW(bid.bdgt_amt)} />
          <Field label="계약방법" value={bid.cntrct_cncls_mthd_nm ?? "-"} />
          <Field label="낙찰방법" value={bid.sucsfbid_mthd_nm?.split("-")[0] ?? "-"} />
          <Field label="입찰방식" value={bid.bid_methd_nm ?? "-"} />
          <Field
            label="참가제한"
            value={bid.bid_prtcpt_lmt_yn == null ? "-" : bid.bid_prtcpt_lmt_yn ? "있음" : "없음"}
          />
        </div>
      </Section>

      {/* 공고 자격요건 */}
      {q && (
        <Section title="공고 자격요건">
          <p className="-mt-1 text-xs text-slate-400">
            공고문·첨부문서에서 추출한 요건이에요. 나라장터 &ldquo;공고서 원문&rdquo;을 함께 확인해 주세요.
          </p>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            {qualFields.map((f) => (
              <Field key={f.label} label={f.label} value={f.value} />
            ))}
          </div>
        </Section>
      )}

      {/* 평가 기준 */}
      {techWeight != null && priceWeight != null && (
        <Section title="이 공고의 평가 기준">
          <p className="-mt-1 text-xs text-slate-400">발주기관이 정한 낙찰자 심사 기준이에요.</p>
          <div className="flex h-9 w-full overflow-hidden rounded-md">
            <div
              className="flex items-center justify-center bg-indigo-600 text-xs font-bold text-white"
              style={{ width: `${techWeight}%` }}
            >
              기술 {techWeight}점
            </div>
            <div
              className="flex items-center justify-center bg-slate-200 text-xs font-bold text-slate-600"
              style={{ width: `${priceWeight}%` }}
            >
              {priceWeight}
            </div>
          </div>
          {q?.award_cutline_value != null && (
            <p className="text-sm text-gray-700">
              <span className="font-bold text-indigo-700">낙찰 커트라인</span> 점수제 · 종합{" "}
              {q.award_cutline_value}점 이상 시 협상 적격
            </p>
          )}
        </Section>
      )}

      {/* 일정 */}
      <Section title="일정">
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Field label="공고일시" value={formatDate(bid.bid_ntce_dt)} />
          <Field label="자격등록 마감" value={formatDate(bid.bid_qlfct_rgst_dt, true)} />
          <Field label="투찰 마감" value={formatDate(bid.bid_clse_dt, true)} />
          <Field label="개찰일시" value={formatDate(bid.openg_dt, true)} />
        </div>
      </Section>

      {/* 플로팅 비드봇 (회원) */}
      <BidbotDock bidName={bid.bid_ntce_nm} bidId={bid.bid_id} mode={botMode} onMode={setBotMode} />
    </div>
  );
}
