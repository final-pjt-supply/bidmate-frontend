// 로딩 스켈레톤 — 기존 BidCard/상세 레이아웃 톤에 맞춘 회색 뼈대.
import { Topbar } from "@/components/topbar";
import { SiteFooter } from "@/components/site-footer";

/** 공고 카드 스켈레톤 (BidCard와 동일한 골격) */
export function BidCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
      <div className="h-6 w-14 rounded-md bg-slate-100" />
      <div className="min-h-[46px] space-y-2 pt-1">
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-2/3 rounded bg-slate-100" />
      </div>
      <div className="h-4 w-1/2 rounded bg-slate-100" />
      <div className="flex gap-1.5">
        <div className="h-5 w-12 rounded-md bg-slate-100" />
        <div className="h-5 w-16 rounded-md bg-slate-100" />
      </div>
    </div>
  );
}

/** 목록형 페이지(홈·검색·추천) 로딩 화면 */
export function ListPageSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
        <div className="mb-6 h-7 w-40 rounded bg-slate-100" />
        <div className="grid animate-pulse grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <BidCardSkeleton key={i} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** 공고 상세 로딩 화면 */
export function DetailPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-4xl animate-pulse flex-col gap-4 px-4 pb-16 pt-6 sm:px-6 lg:px-10">
          {/* 헤더 카드 */}
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
            <div className="h-5 w-24 rounded-md bg-slate-100" />
            <div className="h-7 w-3/4 rounded bg-slate-100" />
            <div className="h-4 w-1/2 rounded bg-slate-100" />
            <div className="flex gap-2 pt-1">
              <div className="h-9 w-40 rounded-md bg-slate-100" />
              <div className="h-9 w-36 rounded-md bg-slate-100" />
            </div>
          </div>
          {/* 섹션 카드 2개 */}
          {[0, 1].map((s) => (
            <div key={s} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
              <div className="h-5 w-32 rounded bg-slate-100" />
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-16 rounded bg-slate-100" />
                    <div className="h-4 w-32 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
