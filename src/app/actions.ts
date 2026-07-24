"use server";

import { revalidatePath } from "next/cache";

/**
 * 목록 캐시 무효화 — 새로고침 버튼이 호출한다.
 *
 * 목록 fetch에 `revalidate: 60`이 걸려 있어, router.refresh()만으로는 60초 안에
 * 같은(캐시된) 응답이 돌아온다. 사용자가 새로고침을 눌렀다는 건 "지금 최신을 보고
 * 싶다"는 뜻이므로 해당 경로의 캐시를 먼저 버린다.
 *
 * 경로를 인자로 받는 이유: 같은 버튼이 홈(/)과 공고 검색(/search)에서 함께 쓰인다.
 * 임의 경로 무효화를 막기 위해 허용 목록으로 제한한다.
 */
const ALLOWED = new Set(["/", "/search", "/recommend"]);

export async function refreshList(path: string) {
  revalidatePath(ALLOWED.has(path) ? path : "/");
}
