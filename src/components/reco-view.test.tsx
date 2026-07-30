import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchListItem } from "@/lib/api/matches";
import { RecoView } from "@/components/reco-view";

const { fetchMatchesMock } = vi.hoisted(() => ({
  fetchMatchesMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    ready: true,
    user: { email: "test@example.com", company: "테스트", companyId: "1" },
  }),
}));

vi.mock("@/lib/company", () => ({
  hasCompanyProfile: () => true,
}));

vi.mock("@/lib/api/matches", () => ({
  fetchMatches: fetchMatchesMock,
}));

vi.mock("@/components/bid-card", () => ({
  BidCard: ({ position }: { position: number }) => <div>카드 순번 {position}</div>,
}));

vi.mock("@/components/sync-indicator", () => ({
  SyncIndicator: () => null,
}));

vi.mock("@/components/verdict-badge", () => ({
  VerdictBadge: () => <span>가능</span>,
  verdictHint: () => "참가 가능",
}));

function itemFor(page: number): MatchListItem {
  return {
    bid: {
      bid_id: `bid-${page}`,
      bid_ntce_nm: `공고 ${page}`,
      dminstt_nm: "수요기관",
      bid_category: "servc",
      sucsfbid_mthd_nm: "적격심사",
      bid_prtcpt_lmt_yn: false,
      presmpt_prce: null,
      bdgt_amt: null,
      bid_ntce_dt: "2026-07-29T00:00:00",
      bid_clse_dt: "2026-08-01T00:00:00",
    },
    match: {
      verdict: "가능",
      required: 1,
      satisfied: 1,
      gate_failed: 0,
      need_review: 0,
      axes: [],
      computed_at: "2026-07-29T00:00:00",
    },
  };
}

describe("RecoView 페이지 크기", () => {
  beforeEach(() => {
    fetchMatchesMock.mockReset();
    fetchMatchesMock.mockImplementation(async ({ page = 1 }: { page?: number }) => ({
      total: 25,
      page,
      page_size: 24,
      items: [itemFor(page)],
    }));
  });

  it("API의 page_size로 페이지 수와 카드 순번을 계산한다", async () => {
    const user = userEvent.setup();
    render(<RecoView />);

    expect(await screen.findByText("카드 순번 1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "2" }));

    expect(await screen.findByText("카드 순번 25")).toBeInTheDocument();
    // 추천순이 기본 정렬이다(#104) — 페이지를 넘겨도 선택된 정렬이 유지된다.
    expect(fetchMatchesMock).toHaveBeenLastCalledWith({ sort: "recommended", page: 2 });
  });
});

describe("RecoView 정렬", () => {
  beforeEach(() => {
    fetchMatchesMock.mockReset();
    fetchMatchesMock.mockImplementation(async () => ({
      total: 1,
      page: 1,
      page_size: 24,
      items: [itemFor(1)],
    }));
  });

  it("맞춤 추천 탭은 추천순을 기본으로 부른다(#104)", async () => {
    render(<RecoView />);

    await screen.findByText("카드 순번 1");
    expect(fetchMatchesMock).toHaveBeenCalledWith({ sort: "recommended", page: 1 });
    expect(screen.getByRole("button", { name: "추천순" })).toHaveClass("text-indigo-700");
  });

  it("정렬을 바꾸면 선택된 버튼과 요청이 함께 바뀐다", async () => {
    const user = userEvent.setup();
    render(<RecoView />);
    await screen.findByText("카드 순번 1");

    await user.click(screen.getByRole("button", { name: "마감 임박순" }));

    expect(fetchMatchesMock).toHaveBeenLastCalledWith({ sort: "deadline", page: 1 });
    expect(screen.getByRole("button", { name: "마감 임박순" })).toHaveClass("text-indigo-700");
    expect(screen.getByRole("button", { name: "추천순" })).not.toHaveClass("text-indigo-700");
  });
});
