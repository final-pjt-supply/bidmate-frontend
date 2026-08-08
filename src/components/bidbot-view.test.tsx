import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BotBubble, groupCitations } from "@/components/bidbot-view";

describe("groupCitations", () => {
  it("groups multiple retrieved chunks from the same bid into one source", () => {
    const sources = groupCitations([
      { bid_id: "B-1", file_id: "file-a", chunk_idx: 0, text: "first excerpt" },
      { bid_id: "B-1", file_id: "file-a", chunk_idx: 1, text: "second excerpt" },
      { bid_id: "B-2", file_id: "file-b", chunk_idx: 0, text: "another excerpt" },
    ]);

    expect(sources).toHaveLength(2);
    expect(sources[0]).toMatchObject({ bid_id: "B-1", text: "first excerpt" });
    expect(sources[0].citations).toHaveLength(2);
    expect(sources[1].bid_id).toBe("B-2");
  });
});

describe("BotBubble sources", () => {
  it("shows readable, deduplicated source cards instead of numbered evidence buttons", () => {
    render(
      <BotBubble
        message={{
          role: "bot",
          text: "답변입니다.",
          citations: [
            { bid_id: "B-1", file_id: "file-a", chunk_idx: 0, text: "첫 번째 원문입니다." },
            { bid_id: "B-1", file_id: "file-a", chunk_idx: 1, text: "같은 공고의 다른 문단입니다." },
            { bid_id: "B-2", file_id: "file-b", chunk_idx: 0, text: "두 번째 공고 원문입니다." },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByText("참고한 공고문 2건"));

    expect(screen.getByText("공고번호 B-1")).toBeInTheDocument();
    expect(screen.getByText("공고번호 B-2")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "상세 보기" })).toHaveLength(2);
    expect(screen.queryByText(/^근거 1$/)).not.toBeInTheDocument();
  });
});
