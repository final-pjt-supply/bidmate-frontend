import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MatchAxesTable } from "@/components/match-axes-table";

describe("MatchAxesTable", () => {
  it("표시할 축이 없으면 별도의 비교 조건이 없는 정상 빈 상태를 안내한다", () => {
    render(<MatchAxesTable verdict={null} axes={null} />);

    expect(screen.getByText("별도로 확인된 자격요건이 없어요")).toBeInTheDocument();
    expect(
      screen.getByText("이 공고에서는 회사 정보와 비교할 별도의 필수 조건이 확인되지 않았습니다.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/나라장터 원문/)).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("실제 요구 축이 있으면 해당 축만 표에 표시한다", () => {
    render(
      <MatchAxesTable
        verdict="가능"
        axes={[
          {
            axis: "license",
            class: "gate",
            status: "충족",
            detail: "정보통신공사업",
          },
        ]}
      />
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("정보통신공사업")).toBeInTheDocument();
    expect(screen.getByText("충족")).toBeInTheDocument();
  });
});
