// 공고 데이터 타입 — 서빙 API 응답 계약과 동일 (snake_case 유지)
// GET /bids (목록) 및 GET /bids/{bid_id} (상세) 응답의 단위 객체.

export type BidCategory = "cnstwk" | "servc" | "thng" | "frgcpt";
// cnstwk=공사, servc=용역, thng=물품, frgcpt=외자

// v0.2 자격요건 (LLM 추출) — merged 공고엔 채워지고, 일부 필드는 null일 수 있음
export interface Qualification {
  company_size_limit: string | null;        // sme_only 등 enum
  region_limit_type: string | null;         // hq_location / none
  region_limit_names: string[] | null;
  required_licenses:
    | { code: string | null; name_raw: string; or_group: number }[]
    | null;
  performance_reqs:
    | { category: string; basis: string; value: number | null; unit: string | null; scope_raw: string }[]
    | null;
  required_certs: string[] | null;
  personnel_reqs:
    | { field: string; grade: string; count: number }[]
    | null;
  direct_production_req: boolean | null;
  credit_rating_req: boolean | null;
  joint_venture_allowed: boolean | null;
  subcontract_allowed: boolean | null;
  tech_weight: number | null;               // 협상 계열에만 있음(≈37%)
  price_weight: number | null;
  award_cutline_type: string | null;        // score / rate / lowest_price
  award_cutline_value: number | null;
}

/** 매칭 판정 축 하나. axis는 10종 카테고리 고정값(license/region/size/item/
 *  direct_prod/personnel/performance/capacity/cert/credit). 마스터 코드가 아니다 —
 *  한글 라벨은 프론트가 AXIS_LABEL로 붙인다. */
export type MatchAxis = {
  axis: string;
  // 2026-07-29 개편으로 신규 판정은 gate/supp만 쓴다. "info"는 그 전에 계산돼
  // 아직 남아 있는 행 때문에 유지한다(야간 전체 재계산으로 사라진다).
  class: "gate" | "supp" | "info";
  // "해당없음"은 서버가 안 보낸다 — 요구 자체가 없는 축을 프론트가 채워 넣을 때만 쓴다.
  status: "충족" | "미충족" | "확인필요" | "해당없음";
  detail: string;
  // 공고 요구값 / 회사 보유값. 실측 30,293개 축 전부 채워져 오지만, 계약상 보장이
  // 아니라 선택으로 둔다. 서버가 300자에서 자르고, 보유값 없음도 서버 문구로 온다
  // ("(없음)"·"(회사 품목 미등록)" 등) — 프론트가 따로 변환하지 않는다.
  required?: string;
  actual?: string;
};

// 매칭 판정 — 점수가 아니라 축별 충족/미충족/확인필요 구조(백엔드 #57 확정).
export interface Match {
  verdict: string | null;   // 가능/불가/보완가능/확인필요
  required: number | null;
  satisfied: number | null;
  gate_failed: number | null;
  need_review: number | null;
  axes: MatchAxis[] | null;
  computed_at: string | null;
}

// 목록 응답의 카드용 최소 필드 (상세는 Bid 전체)
export interface Bid {
  bid_id: string;
  bid_ntce_nm: string;
  dminstt_nm: string;
  ntce_instt_nm?: string;
  bid_category: BidCategory;
  sucsfbid_mthd_nm: string;
  cntrct_cncls_mthd_nm?: string;
  bid_methd_nm?: string;
  bid_prtcpt_lmt_yn: boolean | null;
  presmpt_prce: number | null;
  bdgt_amt: number | null;
  bid_ntce_dt: string;          // ISO
  bid_clse_dt: string | null;   // ISO, null 가능(비경쟁)
  bid_qlfct_rgst_dt?: string | null;
  openg_dt?: string | null;
  bid_ntce_dtl_url?: string;
  qualification?: Qualification; // 상세 응답에만
  /**
   * 품목 태그. 업종(bid_category)의 하위 분류다 — 물품 → "토목·건설자재",
   * 용역 → "IT시스템"처럼 무엇에 관한 공고인지 한 단계 좁혀준다.
   *
   * 분류 신뢰도가 낮으면 서버가 null로 내려준다(약 7.9%). 프론트가 "미분류"
   * 같은 문구를 대신 그리면 안 된다 — 그건 공고 정보가 아니라 분류기의 한계라
   * 담당자 판단에 도움이 안 되면서 자리만 차지한다.
   */
  item_tag?: string | null;
  match_score?: number | null;   // 목록 응답: 카드 배지용
  match?: Match | null;          // 상세 응답: 적합도 표용
}

export interface BidListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Bid[];
}
