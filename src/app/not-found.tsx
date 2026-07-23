import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="flex w-full max-w-md flex-col items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-16 text-center">
          <span className="flex size-[52px] items-center justify-center rounded-full bg-indigo-50">
            <FileQuestion className="size-[22px] text-indigo-600" strokeWidth={2} />
          </span>
          <p className="text-lg font-bold text-gray-900">페이지를 찾을 수 없어요</p>
          <p className="max-w-sm text-sm text-gray-500">
            주소가 바뀌었거나 사라진 페이지예요. 아래에서 다시 시작해 보세요.
          </p>
          <div className="mt-1 flex gap-2">
            <Link
              href="/"
              className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-800"
            >
              홈으로
            </Link>
            <Link
              href="/search"
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
            >
              공고 검색
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
