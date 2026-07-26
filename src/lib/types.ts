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

/** 매칭 판정 축 하나. axis는 9종 카테고리 고정값(license/region/size/direct_prod/
 *  item/personnel/performance/capacity/credit) + 참고용 cert. 마스터 코드가 아니다 —
 *  한글 라벨은 프론트가 AXIS_LABEL로 붙인다. */
export type MatchAxis = {
  axis: string;
  class: "gate" | "supp" | "info";
  // "해당없음"은 서버가 안 보낸다 — 요구 자체가 없는 축을 프론트가 채워 넣을 때만 쓴다.
  status: "충족" | "미충족" | "확인필요" | "해당없음";
  detail: string;
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
  match_score?: number | null;   // 목록 응답: 카드 배지용
  match?: Match | null;          // 상세 응답: 적합도 표용
}

export interface BidListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Bid[];
}
