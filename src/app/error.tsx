"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { Topbar } from "@/components/topbar";
import { SiteFooter } from "@/components/site-footer";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("페이지 렌더 오류:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="flex w-full max-w-md flex-col items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-16 text-center">
          <span className="flex size-[52px] items-center justify-center rounded-full bg-rose-50">
            <AlertTriangle className="size-[22px] text-rose-500" strokeWidth={2} />
          </span>
          <p className="text-lg font-bold text-gray-900">문제가 생겼어요</p>
          <p className="max-w-sm text-sm text-gray-500">
            일시적인 오류로 화면을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
            >
              다시 시도
            </button>
            <Link
              href="/"
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
            >
              홈으로
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
