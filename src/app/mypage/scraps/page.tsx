"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import bidsData from "@/lib/data/bids.json";
import type { Bid } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { getScrapIds } from "@/lib/scraps";
import { BidCard } from "@/components/bid-card";
import { MypageShell } from "@/components/mypage-shell";

const bids = (bidsData as { bids: Bid[] }).bids;

export default function ScrapsPage() {
  const { user } = useAuth();

  // 스크랩 id → 공고. SSR·비로그인 시 user 없음으로 localStorage 미접근.
  const scrapped = useMemo(() => {
    if (!user) return [];
    const ids = getScrapIds(user.email);
    return bids.filter((b) => ids.includes(b.bid_id));
  }, [user]);

  return (
    <MypageShell title="스크랩한 공고" description="공고 상세에서 북마크한 공고를 모아봤어요.">
      {scrapped.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {scrapped.map((bid, i) => (
            <BidCard key={bid.bid_id} bid={bid} position={i + 1} list="scraps" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-16 text-center">
          <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
            <Bookmark className="size-[22px] text-indigo-600" strokeWidth={2} />
          </span>
          <p className="text-lg font-bold text-gray-900">아직 스크랩한 공고가 없어요</p>
          <p className="max-w-md text-sm text-gray-500">
            공고 상세 페이지에서 북마크(🔖)를 누르면 관심 공고를 여기에 모아볼 수 있어요.
          </p>
          <Link
            href="/search"
            className="mt-1 rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
          >
            공고 검색하러 가기
          </Link>
        </div>
      )}
    </MypageShell>
  );
}
