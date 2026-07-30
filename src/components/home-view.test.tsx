import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bid } from "@/lib/types";
import { HomeView } from "@/components/home-view";

const {
  authState,
  fetchMatchesMock,
  hasCompanyProfileMock,
  fetchMatchSummaryMock,
  fetchScrapCountMock,
} = vi.hoisted(() => ({
  authState: {
    ready: true,
    user: null as { email: string; company: string } | null,
  },
  fetchMatchesMock: vi.fn(),
  hasCompanyProfileMock: vi.fn(),
  fetchMatchSummaryMock: vi.fn(),
  fetchScrapCountMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/company", () => ({
  hasCompanyProfile: hasCompanyProfileMock,
}));

vi.mock("@/lib/api/matches", () => ({
  fetchMatches: fetchMatchesMock,
  fetchMatchSummary: fetchMatchSummaryMock,
  fetchScrapCount: fetchScrapCountMock,
}));

vi.mock("@/components/bid-card", () => ({
  BidCard: ({ bid }: { bid: Bid }) => <div>공고 카드 {bid.bid_ntce_nm}</div>,
}));

vi.mock("@/components/sync-indicator", () => ({
  SyncIndicator: () => null,
}));

vi.mock("@/lib/analytics/track", () => ({
  logEvent: vi.fn(),
}));

const publicBid: Bid = {
  bid_id: "public-1",
  bid_ntce_nm: "공용 공고",
  dminstt_nm: "수요기관",
  bid_category: "servc",
  sucsfbid_mthd_nm: "적격심사",
  bid_prtcpt_lmt_yn: false,
  presmpt_prce: null,
  bdgt_amt: null,
  bid_ntce_dt: "2026-07-29T00:00:00",
  bid_clse_dt: "2026-08-01T00:00:00",
};

function renderHome() {
  return render(
    <HomeView
      recommendedBids={[publicBid]}
      recentBids={[]}
      recentLoadFailed={false}
    />
  );
}

describe("HomeView 맞춤 추천 섹션", () => {
  beforeEach(() => {
    authState.user = null;
    fetchMatchesMock.mockReset();
    hasCompanyProfileMock.mockReset();
    fetchMatchSummaryMock.mockReset();
    fetchScrapCountMock.mockReset();
    fetchMatchSummaryMock.mockResolvedValue({ total: 3 });
    fetchScrapCountMock.mockResolvedValue(1);
    hasCompanyProfileMock.mockReturnValue(true);
    fetchMatchesMock.mockResolvedValue({
      total: 1,
      page: 1,
      page_size: 20,
      items: [
        {
          bid: { ...publicBid, bid_id: "m-1", bid_ntce_nm: "매칭 공고" },
          match: {
            verdict: "가능",
            required: 3,
            satisfied: 3,
            gate_failed: 0,
            need_review: 0,
            axes: [],
            computed_at: "2026-07-29T00:00:00",
          },
        },
      ],
    });
  });

  it("회원에게는 공용 목록이 아니라 실제 매칭 결과를 판정과 함께 보여준다", async () => {
    authState.user = { email: "member@example.com", company: "테스트" };
    renderHome();

    expect(await screen.findByText("공고 카드 매칭 공고")).toBeInTheDocument();
    expect(fetchMatchesMock).toHaveBeenCalledWith({ sort: "recommended", page: 1 });
    expect(screen.getByText("가능")).toBeInTheDocument();
    expect(screen.getByText("조건 3개 중 3개 충족")).toBeInTheDocument();
    expect(screen.queryByText("공고 카드 공용 공고")).not.toBeInTheDocument();
  });

  it("회사 정보가 없으면 매칭을 부르지 않고 입력을 안내한다", async () => {
    authState.user = { email: "member@example.com", company: "테스트" };
    hasCompanyProfileMock.mockReturnValue(false);
    renderHome();

    expect(await screen.findByText("먼저 회사 정보를 입력해 주세요")).toBeInTheDocument();
    expect(fetchMatchesMock).not.toHaveBeenCalled();
    // 히어로가 "오늘의 맞춤 공고"라고 하면 바로 아래 안내와 모순된다 — 건수 타일도 숨긴다.
    expect(screen.queryByText("테스트님, 오늘의 맞춤 공고예요")).not.toBeInTheDocument();
    expect(
      screen.getByText("회사 정보를 입력하면 우리 회사 조건에 맞는 공고를 추천해드려요.")
    ).toBeInTheDocument();
    expect(screen.queryByText("내 맞춤 공고")).not.toBeInTheDocument();
  });

  it("회사 정보가 있으면 히어로는 맞춤 공고 건수를 그대로 보여준다", async () => {
    authState.user = { email: "member@example.com", company: "테스트" };
    renderHome();

    expect(await screen.findByText("테스트님, 오늘의 맞춤 공고예요")).toBeInTheDocument();
    expect(screen.getByText("내 맞춤 공고")).toBeInTheDocument();
  });

  it("매칭 조회가 실패하면 빈 결과가 아니라 오류로 알린다", async () => {
    authState.user = { email: "member@example.com", company: "테스트" };
    fetchMatchesMock.mockRejectedValue(new Error("500"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderHome();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("참가 가능한 공고가 아직 없어요.")).not.toBeInTheDocument();
  });

  it("비회원은 매칭을 부르지 않고 공용 목록 블러 미리보기를 그대로 본다", () => {
    renderHome();

    expect(screen.getByText("공고 카드 공용 공고")).toBeInTheDocument();
    expect(screen.getByText("우리 회사 맞춤 추천이 준비돼 있어요")).toBeInTheDocument();
    expect(fetchMatchesMock).not.toHaveBeenCalled();
    expect(hasCompanyProfileMock).not.toHaveBeenCalled();
  });
});
