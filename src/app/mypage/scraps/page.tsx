"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bookmark, RefreshCw } from "lucide-react";
import type { Bid } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { getIdToken } from "@/lib/cognito";
import { subscribeScraps } from "@/lib/scraps";
import { BidCard } from "@/components/bid-card";
import { MypageShell } from "@/components/mypage-shell";

/**
 * 스크랩한 공고 목록 — 서버(GET /me/scraps)에서 공고 전체 데이터를 받아 렌더한다.
 *
 * 캐시(lib/scraps)는 id만 갖고 있어 공고 상세 정보가 없다. 그래서 여기서는 서버 목록을
 * 직접 부른다. 카드에서 스크랩을 해제하면 캐시가 바뀌므로, 그걸 구독해 목록을 다시
 * 불러 방금 뺀 공고가 사라지게 한다.
 */
export default function ScrapsPage() {
  const { user, ready } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = await getIdToken();
    if (!token) {
      setBids([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/me/scraps", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`GET /me/scraps ${res.status}`);
      const data = (await res.json()) as { items: Bid[] };
      setBids(data.items);
    } catch (err) {
      console.error("스크랩 목록 로드 실패:", err);
      setError("스크랩 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 로그인 준비되면 최초 로드 + 스크랩 변경(해제 등) 시 다시 로드.
  // load()는 토큰을 먼저 await하는 비동기라 setState가 동기 실행되지 않는다(effect
  // 안 setState 경고는 async를 못 꿰뚫어 생긴 오탐).
  useEffect(() => {
    if (!ready) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return subscribeScraps(() => void load());
  }, [ready, user, load]);

  return (
    <MypageShell title="스크랩한 공고" description="북마크한 공고를 모아봤어요.">
      {error && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <div className="flex items-center gap-2 text-sm text-amber-900">
            <AlertTriangle className="size-4 shrink-0 text-amber-600" strokeWidth={2} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-surface px-3 py-1.5 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} strokeWidth={2} />
            {loading ? "불러오는 중" : "다시 시도"}
          </button>
        </div>
      )}

      {loading && bids.length === 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
          ))}
        </div>
      ) : bids.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {bids.map((bid, i) => (
            <BidCard key={bid.bid_id} bid={bid} position={i + 1} list="scraps" />
          ))}
        </div>
      ) : !error ? (
        <div className="flex flex-col items-center gap-3.5 rounded-xl border border-slate-200 bg-surface px-4 py-16 text-center">
          <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
            <Bookmark className="size-[22px] text-indigo-600" strokeWidth={2} />
          </span>
          <p className="text-lg font-bold text-gray-900">아직 스크랩한 공고가 없어요</p>
          <p className="max-w-md text-sm text-gray-500">
            공고 카드나 상세 페이지에서 북마크를 누르면 관심 공고를 여기에 모아볼 수 있어요.
          </p>
          <Link
            href="/search"
            className="mt-1 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
          >
            공고 검색하러 가기
          </Link>
        </div>
      ) : null}
    </MypageShell>
  );
}
