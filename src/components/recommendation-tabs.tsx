import Link from "next/link";
import { Sparkles } from "lucide-react";

export function RecommendationTabs({ active }: { active: "match" | "ai" }) {
  return (
    <div
      className="flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      role="tablist"
      aria-label="추천 공고 종류"
    >
      <Link
        href="/recommend"
        role="tab"
        aria-selected={active === "match"}
        className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
          active === "match"
            ? "bg-indigo-700 text-white"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        }`}
      >
        맞춤 공고
      </Link>
      <Link
        href="/recommend/ai"
        role="tab"
        aria-selected={active === "ai"}
        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
          active === "ai"
            ? "bg-indigo-700 text-white"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        }`}
      >
        <Sparkles className="size-3.5" aria-hidden="true" />
        AI 추천 공고
      </Link>
    </div>
  );
}
