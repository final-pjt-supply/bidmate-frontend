import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 비드봇 스위치가 내비게이션에 반영되는지 확인한다 (#140).
 *
 * NAV_ITEMS는 모듈 최상위에서 한 번 만들어지므로, 스위치 상태를 바꿔 확인하려면
 * 모듈 캐시를 비우고 컴포넌트를 다시 import해야 한다.
 */
async function renderTopbar(bidbotEnabled: boolean) {
  vi.resetModules();
  vi.doMock("@/lib/features", () => ({
    BIDBOT_ENABLED: bidbotEnabled,
    SHOW_ALL_VERDICTS: false,
  }));
  vi.doMock("@/lib/auth", () => ({
    useAuth: () => ({ ready: true, user: null, logout: vi.fn() }),
  }));
  vi.doMock("next/navigation", () => ({ usePathname: () => "/" }));

  const { Topbar } = await import("@/components/topbar");
  render(<Topbar />);
}

describe("Topbar 내비게이션", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("비드봇 스위치가 꺼져 있으면 비드봇 메뉴를 그리지 않는다", async () => {
    await renderTopbar(false);

    expect(screen.queryByRole("link", { name: "비드봇" })).not.toBeInTheDocument();
    // 나머지 메뉴는 그대로 있어야 한다 — 스위치가 다른 항목까지 지우면 안 된다.
    expect(screen.getByRole("link", { name: "공고 검색" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "맞춤 추천" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "이용안내" })).toBeInTheDocument();
  });

  it("스위치가 켜져 있으면 비드봇 메뉴가 나온다", async () => {
    await renderTopbar(true);

    expect(screen.getByRole("link", { name: "비드봇" })).toBeInTheDocument();
  });
});
