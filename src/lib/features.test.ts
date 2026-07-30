import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 스위치의 안전 규칙을 고정하는 테스트 (#140).
 *
 * 가장 중요한 건 "값이 없으면 꺼진다"다 — 배포 설정에 깜빡 넣지 않아도 미완성
 * 기능이 노출되지 않아야 한다. 모듈 최상위에서 한 번 평가되는 상수라
 * resetModules 후 다시 import해서 각 경우를 확인한다.
 */
const KEYS = ["NEXT_PUBLIC_BIDBOT_ENABLED", "NEXT_PUBLIC_SHOW_ALL_VERDICTS"] as const;

const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) original[key] = process.env[key];
  vi.resetModules();
});

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

async function loadFlags() {
  return import("@/lib/features");
}

describe("features 스위치", () => {
  it("값이 없으면 꺼진다 — 배포에 넣지 않아도 안전하다", async () => {
    for (const key of KEYS) delete process.env[key];

    const { BIDBOT_ENABLED, SHOW_ALL_VERDICTS } = await loadFlags();

    expect(BIDBOT_ENABLED).toBe(false);
    expect(SHOW_ALL_VERDICTS).toBe(false);
  });

  it('"true"일 때만 켜진다', async () => {
    process.env.NEXT_PUBLIC_BIDBOT_ENABLED = "true";
    process.env.NEXT_PUBLIC_SHOW_ALL_VERDICTS = "true";

    const { BIDBOT_ENABLED, SHOW_ALL_VERDICTS } = await loadFlags();

    expect(BIDBOT_ENABLED).toBe(true);
    expect(SHOW_ALL_VERDICTS).toBe(true);
  });

  it.each(["1", "TRUE", "yes", "false", ""])(
    '"%s"처럼 애매한 값은 켜지 않는다',
    async (value) => {
      process.env.NEXT_PUBLIC_BIDBOT_ENABLED = value;

      const { BIDBOT_ENABLED } = await loadFlags();

      expect(BIDBOT_ENABLED).toBe(false);
    }
  );
});
