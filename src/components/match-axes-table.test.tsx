import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MatchAxesTable } from "@/components/match-axes-table";

describe("MatchAxesTable", () => {
  it("표시할 축이 없으면 정상 결과 대신 나라장터 원문 확인을 안내한다", () => {
    render(<MatchAxesTable verdict={null} axes={null} />);

    expect(
      screen.getByText(/공고에서 확인된 자격요건이 없습니다/)
    ).toBeInTheDocument();
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
