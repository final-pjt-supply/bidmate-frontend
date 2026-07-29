import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MatchAxesTable } from "@/components/match-axes-table";
import type { MatchAxis } from "@/lib/types";

const axis = (over: Partial<MatchAxis> = {}): MatchAxis => ({
  axis: "license",
  class: "gate",
  status: "충족",
  detail: "정보통신공사업",
  ...over,
});

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
    render(<MatchAxesTable verdict="가능" axes={[axis()]} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("정보통신공사업")).toBeInTheDocument();
    expect(screen.getByText("충족")).toBeInTheDocument();
  });

  // 2026-07-29 개편: 인증이 참고용(info)에서 판정 대상(supp)으로 격상됐다.
  // 참고 박스에 남겨두면 '보완가능' 사유가 "판정에 반영되지 않아요" 안에 놓인다.
  it("인증도 본표에 넣고 '판정에 반영되지 않아요' 안내는 더 이상 하지 않는다", () => {
    render(
      <MatchAxesTable
        verdict="보완가능"
        axes={[axis(), axis({ axis: "cert", class: "supp", status: "미충족", detail: "인증 0/1" })]}
      />
    );

    const table = screen.getByRole("table");
    expect(table).toHaveTextContent("인증");
    expect(table).toHaveTextContent("인증 0/1");
    expect(screen.queryByText(/판정에는 반영되지 않아요/)).not.toBeInTheDocument();
  });

  // 낡은 계산 결과에는 class='info'인 cert가 아직 섞여 온다(야간 전체 재계산 전까지).
  // 표는 class가 아니라 axis 이름으로 행을 찾으므로 그대로 본표에 그려져야 한다.
  it("class가 info인 옛 데이터의 인증도 본표에 그린다", () => {
    render(
      <MatchAxesTable
        verdict="가능"
        axes={[axis({ axis: "cert", class: "info", status: "충족", detail: "인증 1/1" })]}
      />
    );

    expect(screen.getByRole("table")).toHaveTextContent("인증 1/1");
  });

  describe("확인필요 사유", () => {
    it("required=0이면 공고에서 요건을 못 뽑은 것으로 안내한다", () => {
      render(<MatchAxesTable verdict="확인필요" axes={[axis({ status: "확인필요" })]} required={0} />);

      expect(screen.getByText(/공고에서 자격요건을 확인하지 못했어요/)).toBeInTheDocument();
    });

    it("required>0이면 판정 정보가 부족한 것으로 안내한다", () => {
      render(<MatchAxesTable verdict="확인필요" axes={[axis({ status: "확인필요" })]} required={2} />);

      expect(screen.getByText(/일부 항목을 판정할 수 없었어요/)).toBeInTheDocument();
    });

    it("확인필요가 아니면 자동 판정 안내를 유지한다", () => {
      render(<MatchAxesTable verdict="가능" axes={[axis()]} required={3} />);

      expect(screen.getByText("회사 정보 기준으로 자동 판정한 결과예요")).toBeInTheDocument();
    });
  });
});
