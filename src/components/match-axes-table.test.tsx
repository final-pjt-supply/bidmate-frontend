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
      screen.getByText("이 공고에서는 회사 정보와 비교할 별도의 필수 조건이 확인되지 않았어요.")
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

  // 서버 detail은 " · "로 문장을 잇는다("인증 0/3 · 취득하면 가능: …"). 한 문단으로
  // 흐르면 카운트와 안내가 뒤섞여 어지러우므로 줄을 갈라 그린다.
  it("detail의 ' · ' 구분 문장은 줄을 갈라 그린다", () => {
    render(
      <MatchAxesTable
        verdict="불가"
        axes={[
          axis({
            axis: "cert",
            status: "미충족",
            detail:
              "인증 0/3 · 취득하면 가능: 방송통신기자재 적합성평가(적합인증·적합등록), KC인증(국가통합인증마크)",
          }),
        ]}
      />
    );

    // 별도 요소로 갈라졌고, 값 안의 가운뎃점(공백 없음)은 쪼개지지 않았다.
    expect(screen.getByText("인증 0/3")).toBeInTheDocument();
    expect(
      screen.getByText("취득하면 가능: 방송통신기자재 적합성평가(적합인증·적합등록), KC인증(국가통합인증마크)")
    ).toBeInTheDocument();
  });

  describe("요구값 vs 보유값", () => {
    // 표의 본문은 '공고 요구 | 우리 회사' 두 열의 비교다. 서버 detail 요약("1/2 그룹
    // 충족")은 그리지 않는다 — 행 라벨과 첫 단어가 반복되고("인증  인증 0/3") 말투도
    // 로그처럼 남기 때문.
    it("요구·보유가 있으면 두 열로 비교하고 detail 요약은 그리지 않는다", () => {
      render(
        <MatchAxesTable
          verdict="보완가능"
          axes={[
            axis({
              status: "미충족",
              detail: "1/2 그룹 충족",
              required: "정보통신공사업, 소프트웨어사업자(컴퓨터관련서비스사업)",
              actual: "정보통신공사업",
            }),
          ]}
        />
      );

      expect(screen.getByText("공고 요구")).toBeInTheDocument();
      expect(screen.getByText("우리 회사")).toBeInTheDocument();
      expect(
        screen.getByText("정보통신공사업, 소프트웨어사업자(컴퓨터관련서비스사업)")
      ).toBeInTheDocument();
      expect(screen.getByText("정보통신공사업")).toBeInTheDocument();
      expect(screen.queryByText("1/2 그룹 충족")).not.toBeInTheDocument();
    });

    it("같은 표 안에서 전 행이 같은 꼴로 그려진다 — 인증·신용도 두 열 비교", () => {
      render(
        <MatchAxesTable
          verdict="불가"
          axes={[
            axis({
              axis: "cert",
              status: "미충족",
              detail: "인증 0/1 · 취득하면 가능: KC인증(국가통합인증마크)",
              required: "KC인증(국가통합인증마크)",
              actual: "(없음)",
            }),
            axis({
              axis: "credit",
              status: "충족",
              detail: "신용평가 보유(A)",
              required: "신용평가등급 보유",
              actual: "A",
            }),
          ]}
        />
      );

      // 두 행 모두 요구·보유 값이 각자 칸에 나온다
      expect(screen.getByText("KC인증(국가통합인증마크)")).toBeInTheDocument();
      expect(screen.getByText("없음")).toBeInTheDocument();
      expect(screen.getByText("신용평가등급 보유")).toBeInTheDocument();
      expect(screen.getByText("A")).toBeInTheDocument();
      // 로그투의 detail 문장은 어디에도 없다
      expect(screen.queryByText(/취득하면 가능/)).not.toBeInTheDocument();
      expect(screen.queryByText("신용평가 보유(A)")).not.toBeInTheDocument();
    });

    it("서버 placeholder '(없음)'은 괄호를 벗겨 자연문으로 보여준다", () => {
      render(
        <MatchAxesTable
          verdict="불가"
          axes={[axis({ axis: "item", status: "미충족", required: "전자교환기", actual: "(없음)" })]}
        />
      );

      expect(screen.getByText("없음")).toBeInTheDocument();
      // 값 안의 괄호는 벗기지 않는다 — 전체가 괄호 하나로 감싸인 placeholder만
      expect(screen.getByText("전자교환기")).toBeInTheDocument();
    });

    // 개편 전 계산된 행에는 required/actual이 없을 수 있다 — 그때만 detail 문장이
    // 두 열에 걸쳐 대신 나온다(방어 경로. 실측 3만여 축 전부 재료가 있다).
    it("요구·보유가 없으면 detail 문장을 두 열에 걸쳐 보여준다", () => {
      render(<MatchAxesTable verdict="가능" axes={[axis({ detail: "정보통신공사업 보유" })]} />);

      const cell = screen.getByText("정보통신공사업 보유").closest("td");
      expect(cell).toHaveAttribute("colspan", "2");
    });

    it("긴 값은 잘리지 않고 전체가 툴팁으로 남는다", () => {
      const long = Array.from({ length: 12 }, () => "중급기술자(기계) 계 1명").join(", ");
      render(
        <MatchAxesTable
          verdict="보완가능"
          axes={[
            axis({
              axis: "personnel",
              detail: "인력 요건 13/14",
              required: long,
              actual: "특급기술자(토목) 계 1명",
            }),
          ]}
        />
      );

      expect(screen.getByText(long)).toHaveAttribute("title", long);
    });
  });

  describe("확인필요 사유", () => {
    it("확인필요 행이 있으면 그 항목을 보라고 안내한다", () => {
      render(<MatchAxesTable verdict="확인필요" axes={[axis({ status: "확인필요" })]} />);

      expect(screen.getByText(/일부 항목을 판정할 수 없었어요/)).toBeInTheDocument();
    });

    // 개편 전 계산된 행은 인증·신용이 info라 required=0인데도 축은 보인다. "자격요건을
    // 확인하지 못했다"고 단정하면 바로 아래에 판정된 축을 나열하는 모순이 생기므로,
    // 행이 있을 때는 "일부 조건"으로 톤을 낮춘다.
    it("확인필요인데 확인필요 행이 없으면(옛 데이터) 일부 조건 안내로 톤을 낮춘다", () => {
      render(
        <MatchAxesTable
          verdict="확인필요"
          axes={[axis({ axis: "cert", class: "info", status: "미충족", detail: "인증 0/3" })]}
        />
      );

      expect(screen.getByText(/공고에서 일부 조건을 확인하지 못했어요/)).toBeInTheDocument();
    });

    // 추출 전면 실패(축 0개)는 표가 아예 안 그려진다 — required=0 안내가 실제로 놓일
    // 자리는 빈 상태 박스다. "조건이 없는 정상 상태"와 문구를 갈라 원문으로 보낸다.
    it("축이 없고 확인필요면 빈 상태에서 공고 원문 확인을 안내한다", () => {
      render(<MatchAxesTable verdict="확인필요" axes={[]} />);

      expect(screen.getByText("공고에서 자격요건을 확인하지 못했어요")).toBeInTheDocument();
      expect(screen.getByText(/나라장터 원문에서 참가자격을 직접 확인/)).toBeInTheDocument();
      expect(screen.queryByText("별도로 확인된 자격요건이 없어요")).not.toBeInTheDocument();
    });

    it("확인필요가 아니면 자동 판정 안내를 유지한다", () => {
      render(<MatchAxesTable verdict="가능" axes={[axis()]} />);

      expect(screen.getByText("회사 정보 기준으로 자동 판정한 결과예요")).toBeInTheDocument();
    });
  });
});
