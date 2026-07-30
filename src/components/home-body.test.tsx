import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bid } from "@/lib/types";
import type { MatchListItem } from "@/lib/api/matches";
import { HomeBody } from "@/components/home-body";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
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

function bidOf(id: string, name: string, category: Bid["bid_category"] = "servc"): Bid {
  return {
    bid_id: id,
    bid_ntce_nm: name,
    dminstt_nm: "수요기관",
    bid_category: category,
    sucsfbid_mthd_nm: "적격심사",
    bid_prtcpt_lmt_yn: false,
    presmpt_prce: null,
    bdgt_amt: null,
    bid_ntce_dt: "2026-07-29T00:00:00",
    bid_clse_dt: "2026-08-01T00:00:00",
  };
}

function matchOf(id: string, name: string, category?: Bid["bid_category"]): MatchListItem {
  return {
    bid: bidOf(id, name, category),
    match: {
      verdict: "가능",
      required: 3,
      satisfied: 2,
      gate_failed: 0,
      need_review: 1,
      axes: [],
      computed_at: "2026-07-29T00:00:00",
    },
  };
}

describe("HomeBody 상태 표시", () => {
  beforeEach(() => {
    refreshMock.mockReset();
  });

  it("조회 실패를 실제 빈 결과로 표시하지 않고 재시도할 수 있다", async () => {
    const user = userEvent.setup();
    const retryMatches = vi.fn();
    render(
      <HomeBody
        recommendedBids={[]}
        recentBids={[]}
        recentLoadFailed
        memberMatchesFailed
        onRetryMemberMatches={retryMatches}
      />
    );

    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.queryByText("참가 가능한 공고가 아직 없어요.")).not.toBeInTheDocument();
    expect(screen.queryByText("표시할 최신 공고가 아직 없어요.")).not.toBeInTheDocument();

    const [recommendedRetry, latestRetry] = screen.getAllByRole("button", { name: "다시 시도" });
    // 맞춤 추천은 클라이언트에서 부르므로 서버 새로고침이 아니라 매칭 재요청으로 복구한다.
    await user.click(recommendedRetry);
    expect(retryMatches).toHaveBeenCalledOnce();
    expect(refreshMock).not.toHaveBeenCalled();

    await user.click(latestRetry);
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("맞춤 추천 재요청 중에는 그 버튼이 진행 상태로 잠긴다", () => {
    render(
      <HomeBody
        recommendedBids={[]}
        recentBids={[]}
        recentLoadFailed={false}
        memberMatchesFailed
        memberMatchesLoading
        onRetryMemberMatches={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "다시 불러오는 중" })).toBeDisabled();
  });

  it("요청이 성공하고 결과가 0건일 때만 빈 결과 안내를 표시한다", () => {
    render(
      <HomeBody
        recommendedBids={[]}
        recentBids={[]}
        recentLoadFailed={false}
      />
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("참가 가능한 공고가 아직 없어요.")).toBeInTheDocument();
    expect(screen.getByText("표시할 최신 공고가 아직 없어요.")).toBeInTheDocument();
  });
});

describe("HomeBody 회원 맞춤 추천", () => {
  it("매칭을 불러오는 동안 스켈레톤을 보여준다", () => {
    const { container } = render(
      <HomeBody
        recommendedBids={[bidOf("public-1", "공용 공고")]}
        recentBids={[]}
        recentLoadFailed={false}
        memberMatchesLoading
      />
    );

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(6);
    // 인증 없는 공용 목록을 "내 조건 맞춤 추천"으로 대신 보여주지 않는다.
    expect(screen.queryByText("공고 카드 공용 공고")).not.toBeInTheDocument();
    expect(screen.queryByText("참가 가능한 공고가 아직 없어요.")).not.toBeInTheDocument();
  });

  it("회사 정보가 없으면 빈 목록 대신 입력 경로를 안내한다", () => {
    render(
      <HomeBody
        recommendedBids={[]}
        recentBids={[]}
        recentLoadFailed={false}
        companyMissing
      />
    );

    expect(screen.getByText("먼저 회사 정보를 입력해 주세요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "회사 정보 입력하기" })).toHaveAttribute(
      "href",
      "/mypage?edit=1"
    );
    expect(screen.queryByText("참가 가능한 공고가 아직 없어요.")).not.toBeInTheDocument();
  });

  it("매칭 결과를 판정 배지와 함께 최대 6건까지 보여준다", () => {
    const items = Array.from({ length: 8 }, (_, i) => matchOf(`m-${i}`, `매칭 공고 ${i}`));
    render(
      <HomeBody
        recommendedBids={[bidOf("public-1", "공용 공고")]}
        recentBids={[]}
        recentLoadFailed={false}
        memberMatches={items}
      />
    );

    expect(screen.getByText("공고 카드 매칭 공고 0")).toBeInTheDocument();
    expect(screen.getByText("공고 카드 매칭 공고 5")).toBeInTheDocument();
    expect(screen.queryByText("공고 카드 매칭 공고 6")).not.toBeInTheDocument();
    expect(screen.queryByText("공고 카드 공용 공고")).not.toBeInTheDocument();
    expect(screen.getAllByText("가능")).toHaveLength(6);
    expect(screen.getAllByText("조건 3개 중 2개 충족")).toHaveLength(6);
    expect(screen.getByRole("link", { name: /더보기/ })).toHaveAttribute("href", "/recommend");
  });

  it("업종 필터는 매칭 결과의 공고 업종으로 동작한다", async () => {
    const user = userEvent.setup();
    render(
      <HomeBody
        recommendedBids={[]}
        recentBids={[]}
        recentLoadFailed={false}
        memberMatches={[matchOf("m-1", "용역 공고", "servc"), matchOf("m-2", "공사 공고", "cnstwk")]}
      />
    );

    await user.click(screen.getByRole("button", { name: "공사" }));

    expect(screen.getByText("공고 카드 공사 공고")).toBeInTheDocument();
    expect(screen.queryByText("공고 카드 용역 공고")).not.toBeInTheDocument();
  });

  it("필터 때문에 0건이면 전체가 없다고 단정하지 않고 더보기를 남긴다", async () => {
    const user = userEvent.setup();
    render(
      <HomeBody
        recommendedBids={[]}
        recentBids={[]}
        recentLoadFailed={false}
        memberMatches={[matchOf("m-1", "용역 공고", "servc")]}
      />
    );

    await user.click(screen.getByRole("button", { name: "물품" }));

    expect(screen.getByText("이 업종에 맞는 공고가 아직 없어요.")).toBeInTheDocument();
    expect(screen.queryByText("참가 가능한 공고가 아직 없어요.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /더보기/ })).toHaveAttribute("href", "/recommend");
  });

  it("비회원은 매칭 없이 공용 목록 블러 미리보기와 로그인 유도를 그대로 본다", () => {
    render(
      <HomeBody
        recommendedBids={[bidOf("public-1", "공용 공고")]}
        recentBids={[]}
        recentLoadFailed={false}
        gated
      />
    );

    expect(screen.getByText("공고 카드 공용 공고")).toBeInTheDocument();
    expect(screen.getByText("우리 회사 맞춤 추천이 준비돼 있어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "무료로 시작하기" })).toHaveAttribute("href", "/signup");
    expect(screen.queryByText("참가 가능한 공고가 아직 없어요.")).not.toBeInTheDocument();
  });
});
