import Link from "next/link";
import { X } from "lucide-react";
import { Topbar } from "@/components/topbar";

/** 로그인·회원가입 공용 레이아웃 (Topbar + 가운데 카드) */
export function AuthCardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Topbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">{children}</main>
    </div>
  );
}

/** 카드 컨테이너 (제목 + 닫기 버튼) */
export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-[440px] flex-col gap-[18px] rounded-2xl border border-slate-200 bg-white p-9 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <Link href="/" aria-label="닫기" className="text-gray-400 transition-colors hover:text-gray-600">
          <X className="size-[18px]" strokeWidth={2} />
        </Link>
      </div>
      {children}
    </div>
  );
}

/** 라벨 + 입력 필드 공용 */
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-[46px] w-full rounded-lg border border-gray-300 px-3.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
