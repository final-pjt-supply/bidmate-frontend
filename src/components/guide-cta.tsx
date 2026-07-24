"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

/**
 * 이용안내 하단 가입 유도 버튼 — 비회원에게만 보인다.
 *
 * 이 부분만 클라이언트인 이유: 안내 페이지는 서버 렌더인데 로그인 여부는 브라우저에서
 * 판별된다(Cognito 세션). 페이지 전체를 클라이언트로 돌리지 않고 버튼만 분리한다.
 */
export function GuideCta() {
  const { user, ready } = useAuth();

  // 세션 확인 전에는 그리지 않는다. 회원에게 "무료로 시작하기"가 잠깐 스쳤다 사라지면
  // 이미 가입한 사용자에게 혼란스럽다.
  if (!ready || user) return null;

  return (
    <section className="flex flex-col items-center pb-16 pt-2">
      <Link
        href="/signup"
        className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-800"
      >
        무료로 시작하기
      </Link>
    </section>
  );
}
