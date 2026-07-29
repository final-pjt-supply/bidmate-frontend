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
    expect(fetchMatchesMock).toHaveBeenLastCalledWith({ sort: "deadline", page: 2 });
  });
});
