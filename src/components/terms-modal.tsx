"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const TERMS = [
  { heading: "이용약관", body: null },
  {
    heading: null,
    body: '제1조 (목적)  본 약관은 비드프렌드(이하 "회사")가 제공하는 공공입찰 공고 추천 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.',
  },
  {
    heading: null,
    body: "제2조 (서비스의 내용)  회사는 조달청 나라장터 등 공개된 공공입찰 공고를 수집·가공하여 회원의 회사 조건에 맞는 공고를 검색·추천하는 서비스를 제공합니다. 공고 정보의 정확성 및 최신성은 원본(나라장터)을 기준으로 하며, 회사는 수집·가공 과정의 지연이나 오류로 인한 정보 불일치를 보증하지 않습니다.",
  },
  {
    heading: null,
    body: "제3조 (회원의 의무)  회원은 타인의 정보를 도용하거나 허위 정보를 등록해서는 안 되며, 서비스를 통해 얻은 공고 정보를 부정한 목적으로 이용해서는 안 됩니다.",
  },
  {
    heading: null,
    body: "제4조 (면책)  회사는 공고 원본의 오류, 마감일 변경, 공고 취소 등으로 회원에게 발생한 손해에 대하여 책임을 지지 않으며, 회원은 입찰 참여 전 반드시 나라장터 원문을 확인해야 합니다.",
  },
  { heading: "개인정보 수집·이용 동의", body: null },
  {
    heading: null,
    body: "1. 수집 항목  (필수) 이메일, 비밀번호, 회사명 / (서비스 이용 시) 사업자등록번호, 업종·보유 면허, 소재지, 기업규모, 보유 인증, 실적",
  },
  {
    heading: null,
    body: "2. 이용 목적  회원 식별 및 관리, 공고 적합도 계산 및 맞춤 공고 추천, 서비스 이용 문의 응대",
  },
  {
    heading: null,
    body: "3. 보유·이용 기간  회원 탈퇴 시까지 보유·이용하며 탈퇴 시 지체 없이 파기합니다. 다만 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.",
  },
  {
    heading: null,
    body: "4. 동의 거부 권리  귀하는 필수 항목의 수집·이용 동의를 거부할 권리가 있습니다. 다만 거부 시 회원가입 및 서비스 이용이 제한됩니다.",
  },
];

export function TermsModal({ onClose, onAgree }: { onClose: () => void; onAgree: () => void }) {
  const [reachedBottom, setReachedBottom] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Escape로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 스크롤이 짧아 스크롤이 필요 없는 경우 바로 활성화
  useEffect(() => {
    const el = bodyRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 4) setReachedBottom(true);
  }, []);

  const onScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReachedBottom(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="이용약관 및 개인정보 처리 동의"
        className="flex max-h-full w-full max-w-[540px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0px_16px_40px_0px_rgba(0,0,0,0.3)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* head */}
        <div className="flex items-center justify-between border-b border-slate-200 py-5 pl-6 pr-5">
          <h2 className="text-[15px] font-bold text-gray-900">이용약관 및 개인정보 처리 동의</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="size-[18px]" strokeWidth={2} />
          </button>
        </div>

        {/* body (스크롤) */}
        <div ref={bodyRef} onScroll={onScroll} className="h-[360px] overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-[11px]">
            {TERMS.map((t, i) =>
              t.heading ? (
                <p key={i} className="text-[15px] font-bold text-gray-900">
                  {t.heading}
                </p>
              ) : (
                <p key={i} className="whitespace-pre-wrap text-[13px] leading-[1.55] text-slate-600">
                  {t.body}
                </p>
              )
            )}
          </div>
        </div>

        {/* footer */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 pb-5 pt-4">
          <p className="text-[13px] text-slate-400">
            {reachedBottom ? "약관을 모두 확인했어요. 동의하고 계속하세요." : "약관을 끝까지 확인하시면 동의할 수 있어요."}
          </p>
          <button
            type="button"
            disabled={!reachedBottom}
            onClick={onAgree}
            className="w-full rounded-md py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:bg-indigo-700/50 disabled:text-white enabled:bg-indigo-700 enabled:text-white enabled:hover:bg-indigo-800"
          >
            동의하고 계속하기
          </button>
        </div>
      </div>
    </div>
  );
}
