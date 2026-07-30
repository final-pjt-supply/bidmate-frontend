// /sitemap.xml — Google Search Console 등록용 (App Router 메타데이터 라우트).
//
// 포함: 비로그인으로도 내용이 보이는 페이지만.
//   정적 — 홈·공고 검색·이용안내·고객센터·이용약관·개인정보처리방침
//   동적 — 공고 상세(/bids/{id}). 비회원에게도 공고 정보·자격요건이 공개된다.
// 제외: 로그인·회원가입·비밀번호 재설정(인증), 마이페이지(개인),
//   맞춤 추천·AI 추천(회원별 결과), 비드봇(미완성 #140), /api(데이터 경로).
//
// 공고 목록은 백엔드에서 페이지 단위로 모은다. 규모는 현재 약 1,300건이라
// 사이트맵 1개 한도(5만 URL) 안에 넉넉하지만, 백엔드 이상으로 total이 폭주해도
// 안전하도록 페이지 수에 상한을 둔다. 빌드 시점(CI)에는 백엔드에 닿지 못하므로
// 실패하면 정적 페이지만 담고, 런타임 재검증(revalidate)이 공고를 채운다.

import type { MetadataRoute } from "next";
import { getBids } from "@/lib/api/bids";
import type { Bid } from "@/lib/types";

const BASE = "https://bidfriend.ai.kr";

// 1시간마다 재생성 — 공고는 하루 단위로 갱신되므로 충분히 신선하다.
export const revalidate = 3600;

// 상한 150페이지(20건/페이지 = 3,000 URL). 사이트맵 규격(5만 URL)보다 훨씬
// 아래로 잡아, total이 비정상적으로 커져도 렌더 한 번이 무거워지지 않게 한다.
const MAX_PAGES = 150;
const FETCH_CHUNK = 10; // 백엔드에 한 번에 보내는 동시 요청 수

async function fetchAllBids(): Promise<Bid[]> {
  const first = await getBids({ page: 1 });
  const pageSize = first.page_size > 0 ? first.page_size : 20;
  const totalPages = Math.min(Math.ceil(first.total / pageSize), MAX_PAGES);

  const bids = [...first.items];
  for (let start = 2; start <= totalPages; start += FETCH_CHUNK) {
    const pages = Array.from(
      { length: Math.min(FETCH_CHUNK, totalPages - start + 1) },
      (_, i) => start + i
    );
    const results = await Promise.allSettled(pages.map((page) => getBids({ page })));
    for (const r of results) {
      if (r.status === "fulfilled") bids.push(...r.value.items);
    }
  }
  return bids;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/guide`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/support`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];

  // 빌드 시점(CI)이나 백엔드 장애 시에는 정적 페이지만 반환한다 —
  // 사이트맵이 500으로 죽는 것보다 부분 사이트맵이 낫다.
  let bidEntries: MetadataRoute.Sitemap = [];
  try {
    const bids = await fetchAllBids();
    bidEntries = bids.map((bid) => ({
      url: `${BASE}/bids/${encodeURIComponent(bid.bid_id)}`,
      lastModified: bid.bid_ntce_dt ? new Date(bid.bid_ntce_dt) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (err) {
    console.error("sitemap: 공고 목록을 가져오지 못해 정적 페이지만 포함:", err);
  }

  return [...staticEntries, ...bidEntries];
}
