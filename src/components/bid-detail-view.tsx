"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bookmark,
  ChevronRight,
  ExternalLink,
  Lock,
  MessageCircleQuestion,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Bid } from "@/lib/types";
import { categoryLabel, computeDday } from "@/lib/format";
import { BIDBOT_ENABLED } from "@/lib/features";
import { qualificationFields } from "@/lib/qualification-fields";
import { isScrapped, subscribeScraps, toggleScrap } from "@/lib/scraps";
import { logEvent } from "@/lib/analytics/track";
import { getIdToken } from "@/lib/cognito";
import type { Match } from "@/lib/types";
import { BidbotDock, type BotMode } from "@/components/bidbot-dock";
import { MatchAxesTable } from "@/components/match-axes-table";

// D-day 색은 긴급도 한 방향으로만 읽힌다: 경고(따뜻한) 계열은 마감 임박(urgent)에만 쓰고
// 그때가 가장 강하다. 나머지는 중립 채움 한 단계(slate-200)로 통일하고 텍스트 톤으로만
// 구분한다 — 회색 3단계는 흰 카드·연회색 스트립 위에서 구별되지 않고, 문구("상시"/"마감"/
// "마감 미정")가 이미 상태를 말해준다. 특히 이 칩은 bg-slate-50 스트립 위에 놓이므로
// 채움을 slate-200보다 옅게 두면 마감된 공고에서 칩 자체가 사라진다.
const DDAY_STYLE: Record<string, string> = {
  urgent: "bg-rose-100 text-rose-700",
  normal: "bg-slate-200 text-slate-700",
  always: "bg-slate-200 text-slate-600",
  closed: "bg-slate-200 text-slate-600",
  unknown: "bg-slate-200 text-slate-600",
};

/** 금액(원) → "1.21억 원" / "5,660만 원" / "1,200원" */
function formatKRW(v: number | null): string {
  if (v == null || v === 0) return "정보 없음";
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
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-surface p-6">
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

function displayValue(value: string | null | undefined): string {
  return value?.trim() || "정보 없음";
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
  const [matchError, setMatchError] = useState("");
  const [matchReloadKey, setMatchReloadKey] = useState(0);

  useEffect(() => {
    if (!isMember) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatchLoading(true);
    setMatchError("");
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) throw new Error("인증 토큰이 없습니다.");
        const res = await fetch(`/api/bids/${encodeURIComponent(bid.bid_id)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`GET /bids/${bid.bid_id} ${res.status}`);
        const data = (await res.json()) as { match: Match | null };
        if (alive) setMatch(data.match);
      } catch (err) {
        console.error("매칭 결과 로드 실패:", err);
        // 상태 한 문장만 담는다 — 뒤에 붙일 안내는 문맥마다 다르다(배너는 "이전 결과를
        // 보여준다", 카드는 "나머지 정보는 아래에 있다"). 여기서 "다시 시도해 주세요"까지
        // 넣으면 제목이 같은 말을 한 오류 카드에서 문장이 두 번 반복됐다.
        if (alive) setMatchError("적합도 결과를 불러오지 못했어요.");
      } finally {
        if (alive) setMatchLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isMember, bid.bid_id, matchReloadKey]);

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
  const qualFields = qualificationFields(q);

  const techWeight = q?.tech_weight ?? null;
  const priceWeight = q?.price_weight ?? null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 pb-16 pt-6 sm:px-6 lg:px-10">
      {/* breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-slate-400">
        {/* 목적지가 /search이므로 상단 내비게이션과 같은 이름으로 부른다(topbar: "공고 검색").
            "공고"라고만 쓰면 공고 목록이 따로 있는 것처럼 읽힌다. */}
        <Link href="/search" className="transition-colors hover:text-slate-600">
          공고 검색
        </Link>
        <ChevronRight className="size-3 shrink-0" strokeWidth={2} />
        <span className="max-w-[420px] truncate text-slate-600" title={bid.bid_ntce_nm}>
          {bid.bid_ntce_nm}
        </span>
      </nav>

      {/* 헤더 카드 */}
      <section className="flex flex-col gap-3.5 rounded-xl border border-slate-200 bg-surface p-5">
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
            className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-slate-100 ${
              scrapped ? "text-indigo-700" : "text-slate-400 hover:text-indigo-700"
            }`}
          >
            {/* 상태는 아이콘 색·채움으로만 말한다 — 접근성 이름은 aria-label이 유일하다. */}
            <Bookmark className={`size-5 ${scrapped ? "fill-current" : ""}`} strokeWidth={2} />
          </button>
        </div>

        <h1 className="text-2xl font-bold leading-snug text-gray-900">{bid.bid_ntce_nm}</h1>
        <p className="text-sm text-gray-500">
          {bid.dminstt_nm}
          {bid.ntce_instt_nm ? ` · 공고기관 ${bid.ntce_instt_nm}` : ""}
        </p>

        <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50 px-1 py-3">
          <div className="px-3">
            <p className="text-xs text-slate-400">투찰 마감</p>
            <p className="mt-1 text-sm font-bold text-gray-900">
              {formatDate(bid.bid_clse_dt, true)}
            </p>
          </div>
          <div className="px-3">
            <p className="text-xs text-slate-400">남은 기간</p>
            <p className="mt-1">
              <span className={`rounded-md px-2 py-1 text-sm font-bold ${DDAY_STYLE[dday.kind]}`}>
                {dday.text}
              </span>
            </p>
          </div>
          <div className="px-3">
            <p className="text-xs text-slate-400">추정가격</p>
            <p className="mt-1 text-sm font-bold text-gray-900">{formatKRW(bid.presmpt_prce)}</p>
          </div>
        </div>

        {/* 비드봇이 꺼져 있으면 질문하기 버튼이 사라지고 이 영역의 주요 CTA가 비어버린다 —
            그동안은 "나라장터 원문 보기"가 주요 행동이므로 강조를 넘겨준다(#140).
            한 영역의 주요 CTA는 하나만 둔다는 규칙을 양쪽 상태에서 모두 지킨다. */}
        <div className="flex flex-wrap gap-2">
          {BIDBOT_ENABLED && (
            <button
              type="button"
              onClick={askBidbot}
              className="flex h-8 items-center gap-1.5 rounded-md bg-brand px-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
            >
              <MessageCircleQuestion className="size-3.5" strokeWidth={2} />이 공고에 대해 질문하기
            </button>
          )}
          {bid.bid_ntce_dtl_url && (
            <a
              href={bid.bid_ntce_dtl_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => logEvent("bid_external_link_clicked", { bid_id: bid.bid_id })}
              className={
                BIDBOT_ENABLED
                  ? "flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-surface px-2.5 text-xs font-medium text-slate-900 transition-colors hover:bg-slate-50"
                  : "flex h-8 items-center gap-1.5 rounded-md bg-brand px-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
              }
            >
              <ExternalLink className="size-3.5" strokeWidth={2} />
              나라장터 원문 보기
            </a>
          )}
        </div>
      </section>

      {/* 적합도: 인증 확인 중 스켈레톤 / 비회원 잠금 / 회원 로딩 / 회원 표 또는 미계산 안내
          !ready인 짧은 순간엔 isMember가 무조건 false라, 로그인한 사용자에게도 "로그인하면
          확인할 수 있어요" 잠금 화면이 한 프레임 반짝인다(useAuth의 세션 확인이 비동기라
          첫 렌더에선 로그인 여부를 아직 모른다). 그 순간엔 아무 쪽으로도 단정하지 않고
          중립 스켈레톤만 보여준다. */}
      {!ready ? (
        <section className="flex items-center justify-center rounded-xl border border-slate-200 bg-surface px-4 py-8">
          <div className="h-24 w-full max-w-sm animate-pulse rounded-lg bg-slate-100" />
        </section>
      ) : isMember && matchLoading && !match ? (
        <section className="flex items-center justify-center rounded-xl border border-slate-200 bg-surface px-4 py-8">
          <div className="h-24 w-full max-w-sm animate-pulse rounded-lg bg-slate-100" />
        </section>
      ) : isMember && match ? (
        <Section title="우리 회사 적합도">
          {matchError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3"
            >
              <p className="text-sm text-amber-900">
                {matchError} 먼저 불러온 결과를 보여드리고 있어요.
              </p>
              <button
                type="button"
                disabled={matchLoading}
                onClick={() => setMatchReloadKey((key) => key + 1)}
                className="rounded-md border border-amber-300 bg-surface px-3 py-1.5 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {matchLoading ? "불러오는 중" : "다시 시도"}
              </button>
            </div>
          )}
          <MatchAxesTable verdict={match.verdict} axes={match.axes} />
        </Section>
      ) : isMember && matchError ? (
        <section
          role="alert"
          className="flex flex-col items-center gap-3.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center"
        >
          <span className="flex size-[52px] items-center justify-center rounded-full bg-surface">
            <AlertTriangle className="size-[22px] text-amber-600" strokeWidth={2} />
          </span>
          {/* 본문에 matchError를 그대로 두면 제목과 같은 문장이 두 번 나온다 — 제목은 상태,
              본문은 '그래서 지금 무엇을 할 수 있는가'를 말한다. 적합도만 실패했고 아래
              공고 정보·자격요건 섹션은 그대로 그려지므로 그 사실이 실제로 도움이 된다. */}
          <p className="text-lg font-bold text-gray-900">적합도 결과를 불러오지 못했어요</p>
          <p className="text-sm text-gray-600">
            공고 정보와 자격요건은 아래에서 그대로 확인할 수 있어요.
          </p>
          <button
            type="button"
            disabled={matchLoading}
            onClick={() => setMatchReloadKey((key) => key + 1)}
            className="mt-1 rounded-md bg-warn px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-warn-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {matchLoading ? "다시 불러오는 중" : "다시 시도"}
          </button>
        </section>
      ) : (
        <section className="flex flex-col items-center gap-3.5 rounded-xl border border-slate-200 bg-surface px-4 py-8 text-center">
          <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
            <Lock className="size-[22px] text-indigo-600" strokeWidth={2} />
          </span>
          {isMember ? (
            <>
              {/* 제목이 상태, 본문이 얻는 것 — 두 상태(비회원/미계산)의 본문은 같은 값을
                  약속하므로 문구를 맞추고, 다른 점은 제목과 버튼으로만 말한다. */}
              <p className="text-lg font-bold text-gray-900">아직 적합도가 계산되지 않았어요</p>
              <p className="text-sm text-gray-500">
                회사 정보를 등록하면 이 공고의 자격요건과 항목별로 비교해 드려요.
              </p>
              <Link
                href="/mypage?edit=1"
                className="mt-1 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
              >
                회사 정보 입력하기
              </Link>
            </>
          ) : (
            <>
              {/* 제목이 "확인할 수 있어요", 본문이 "보여드려요"로 같은 말을 두 번 하고
                  있었다. 본문은 로그인 다음에 무엇이 더 필요한지(회사 정보 등록)를 말한다. */}
              <p className="text-lg font-bold text-gray-900">
                로그인하면 우리 회사 적합도를 볼 수 있어요
              </p>
              <p className="text-sm text-gray-500">
                회사 정보를 등록하면 이 공고의 자격요건과 항목별로 비교해 드려요.
              </p>
              <div className="mt-1 flex gap-2">
                <Link
                  href="/login"
                  className="rounded-md border border-slate-200 bg-surface px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
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
          {/* 추정가격은 상단 스트립, 계약방법은 헤더 배지에 이미 있다 — 여기서 반복하지 않는다. */}
          <Field label="배정예산" value={formatKRW(bid.bdgt_amt)} />
          <Field label="낙찰방법" value={displayValue(bid.sucsfbid_mthd_nm?.split("-")[0])} />
          <Field label="입찰방식" value={displayValue(bid.bid_methd_nm)} />
          {/* "있음"의 짝은 "없음"이다 — 한쪽만 "제한 없음"이면 두 값이 같은 축으로 읽히지
              않는다. null은 '제한이 없다'가 아니라 '공고에서 값을 못 받았다'는 뜻이라
              "없음"과 반드시 구분해 둔다. */}
          <Field
            label="참가제한"
            value={
              bid.bid_prtcpt_lmt_yn == null ? "정보 없음" : bid.bid_prtcpt_lmt_yn ? "있음" : "없음"
            }
          />
        </div>
      </Section>

      {/* 공고 자격요건 */}
      <Section title="공고 자격요건">
        <p className="-mt-1 text-xs text-slate-400">
          공고문·첨부문서를 분석해 정리한 자격요건이에요.
        </p>
        {qualFields.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            {qualFields.map((f) => (
              <Field key={f.label} label={f.label} value={f.value} />
            ))}
          </div>
        ) : (
          // 이 섹션은 공고문에서 뽑아낸 요건을 그대로 보여주는 곳이다 — 회사 정보와
          // 비교하는 건 위쪽 적합도 표의 일이라, 여기서 "회사 정보와 비교할 조건"을
          // 말하면 비회원·회사정보 미입력 사용자에게 틀린 안내가 된다.
          // 값이 비었다는 건 요건이 없다는 뜻이 아니라 못 뽑았을 수도 있다는 뜻이므로
          // (qualificationFields가 null을 "요구 없음"으로 단정하지 않는다) 원문으로 보낸다.
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-bold text-slate-800">자격요건을 확인하지 못했어요</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              공고문·첨부문서에서 참가자격 조건을 찾지 못했어요. 나라장터 원문에서 직접 확인해
              주세요.
            </p>
          </div>
        )}
      </Section>

      {/* 평가 기준 */}
      {techWeight != null && priceWeight != null && (
        <Section title="이 공고의 평가 기준">
          <p className="-mt-1 text-xs text-slate-400">발주기관이 정한 낙찰자 심사 기준이에요.</p>
          {/* 가격 쪽도 기술 쪽과 같은 형식으로 읽혀야 한다 — 숫자만 두면 "기술 90점 / 10"이
              되어 10이 무엇인지 알 수 없었다.
              라벨이 길어진 만큼 좁은 쪽(보통 가격 10~20%)에서 칸이 글자에 밀려 비율이
              틀어질 수 있으므로 min-w-0으로 줄어들 수 있게 하고 넘치면 잘라낸다 —
              막대의 몫 자체가 정보라 비율이 글자보다 우선한다. */}
          <div className="flex h-9 w-full overflow-hidden rounded-md">
            <div
              className="flex min-w-0 items-center justify-center overflow-hidden whitespace-nowrap bg-brand-accent text-xs font-bold text-white"
              style={{ width: `${techWeight}%` }}
            >
              기술 {techWeight}점
            </div>
            <div
              className="flex min-w-0 items-center justify-center overflow-hidden whitespace-nowrap bg-slate-200 text-xs font-bold text-slate-600"
              style={{ width: `${priceWeight}%` }}
            >
              가격 {priceWeight}점
            </div>
          </div>
          {/* "점수제"를 문구에 박아두고 있었지만 종류는 award_cutline_type(score/rate/
              lowest_price)에 따로 온다 — rate 공고(실측 있음, 값이 84.245처럼 점수가 아닌
              비율)에도 "84.245점"이라고 쓰게 되어 있었다. 단위를 단정할 수 있는 score만
              문장으로 쓰고, 나머지 종류는 의미를 백엔드와 확인한 뒤 붙인다. */}
          {q?.award_cutline_type === "score" && q.award_cutline_value != null && (
            <p className="text-sm text-gray-700">
              <span className="font-bold text-indigo-700">낙찰 커트라인</span> 종합{" "}
              {q.award_cutline_value}점 이상이면 협상 대상이 돼요
            </p>
          )}
        </Section>
      )}

      {/* 일정 */}
      <Section title="일정">
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {/* 상단 스트립은 마감 하나만 보는 3초 요약이고, 여기는 순서를 읽는 곳이다 —
              자격등록 마감이 투찰 마감보다 앞서는지 비교하려면 투찰 마감이 같은 줄에 있어야 한다. */}
          <Field label="공고일시" value={formatDate(bid.bid_ntce_dt)} />
          <Field label="자격등록 마감" value={formatDate(bid.bid_qlfct_rgst_dt, true)} />
          <Field label="투찰 마감" value={formatDate(bid.bid_clse_dt, true)} />
          <Field label="개찰일시" value={formatDate(bid.openg_dt, true)} />
        </div>
      </Section>

      {/* 플로팅 비드봇 (회원) — 스위치가 꺼져 있으면 플로팅 버튼도 띄우지 않는다(#140) */}
      {BIDBOT_ENABLED && (
        <BidbotDock bidName={bid.bid_ntce_nm} bidId={bid.bid_id} mode={botMode} onMode={setBotMode} />
      )}
    </div>
  );
}
