import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeBody } from "@/components/home-body";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/components/bid-card", () => ({
  BidCard: () => <div>공고 카드</div>,
}));

vi.mock("@/components/sync-indicator", () => ({
  SyncIndicator: () => null,
}));

vi.mock("@/lib/analytics/track", () => ({
  logEvent: vi.fn(),
}));

describe("HomeBody 상태 표시", () => {
  beforeEach(() => {
    refreshMock.mockReset();
  });

  it("조회 실패를 실제 빈 결과로 표시하지 않고 재시도할 수 있다", async () => {
    const user = userEvent.setup();
    render(
      <HomeBody
        recommendedBids={[]}
        recentBids={[]}
        recommendedLoadFailed
        recentLoadFailed
      />
    );

    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.queryByText("현재 조건에 맞는 추천 공고가 없어요.")).not.toBeInTheDocument();
    expect(screen.queryByText("표시할 최신 공고가 아직 없어요.")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "다시 시도" })[0]);
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("요청이 성공하고 결과가 0건일 때만 빈 결과 안내를 표시한다", () => {
    render(
      <HomeBody
        recommendedBids={[]}
        recentBids={[]}
        recommendedLoadFailed={false}
        recentLoadFailed={false}
      />
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("현재 조건에 맞는 추천 공고가 없어요.")).toBeInTheDocument();
    expect(screen.getByText("표시할 최신 공고가 아직 없어요.")).toBeInTheDocument();
  });
});
