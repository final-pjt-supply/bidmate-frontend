// @vitest-environment node
//
// 비드봇 스위치가 꺼져 있을 때 챗봇 API가 실제로 막히는지 확인한다 (#140).
//
// 화면에서 버튼을 숨기는 것만으로는 부족하다 — URL을 아는 사람은 그대로 호출할 수
// 있고, /agent/chat 은 Bedrock 동기 호출로 이어져 과금이 발생한다. 그래서 가드가
// 인증 확인보다 먼저 걸리는지, 백엔드로 fetch가 나가지 않는지까지 본다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.resetModules();
  fetchSpy.mockReset();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFlags(bidbotEnabled: boolean) {
  vi.doMock("@/lib/features", () => ({
    BIDBOT_ENABLED: bidbotEnabled,
    SHOW_ALL_VERDICTS: false,
  }));
}

/** 인증 헤더까지 붙여서 보낸다 — 401이 아니라 404로 막히는지 봐야 한다. */
function req(url: string, method: string) {
  return new Request(url, {
    method,
    headers: { Authorization: "Bearer test-token" },
    ...(method === "POST" ? { body: JSON.stringify({ message: "안녕" }) } : {}),
  });
}

const params = Promise.resolve({ session_id: "s1" });

describe("스위치 off — 챗봇 API가 없는 경로로 응답한다", () => {
  it("POST /api/agent/chat", async () => {
    mockFlags(false);
    const { POST } = await import("@/app/api/agent/chat/route");

    const res = await POST(req("http://localhost/api/agent/chat", "POST"));

    expect(res.status).toBe(404);
    // 과금 경로로 요청이 새어나가지 않아야 한다.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("GET /api/me/sessions", async () => {
    mockFlags(false);
    const { GET } = await import("@/app/api/me/sessions/route");

    const res = await GET(req("http://localhost/api/me/sessions", "GET"));

    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("GET·DELETE /api/me/sessions/[session_id]", async () => {
    mockFlags(false);
    const { GET, DELETE } = await import("@/app/api/me/sessions/[session_id]/route");

    const got = await GET(req("http://localhost/api/me/sessions/s1", "GET"), { params });
    const deleted = await DELETE(req("http://localhost/api/me/sessions/s1", "DELETE"), {
      params,
    });

    expect(got.status).toBe(404);
    expect(deleted.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("DELETE /api/me/sessions/[session_id]/last-turn", async () => {
    mockFlags(false);
    const { DELETE } = await import("@/app/api/me/sessions/[session_id]/last-turn/route");

    const res = await DELETE(req("http://localhost/api/me/sessions/s1/last-turn", "DELETE"), {
      params,
    });

    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("스위치 on — 기존 동작이 그대로다", () => {
  it("인증이 없으면 404가 아니라 401로 막는다", async () => {
    mockFlags(true);
    const { POST } = await import("@/app/api/agent/chat/route");

    const res = await POST(
      new Request("http://localhost/api/agent/chat", {
        method: "POST",
        body: JSON.stringify({ message: "안녕" }),
      })
    );

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
