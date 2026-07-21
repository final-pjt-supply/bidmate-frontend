import type { Metadata } from "next";
import { LegalDoc, type LegalSection } from "@/components/legal-doc";

export const metadata: Metadata = {
  title: "개인정보처리방침 · 비드메이트",
  description: "비드메이트가 수집·이용하는 개인정보 항목과 처리 방침을 안내합니다.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "1. 수집하는 개인정보 항목",
    lines: [
      "회사는 회원가입 및 서비스 제공을 위해 다음 정보를 수집합니다.",
      "· 필수: 이메일 주소, 비밀번호, 회사명",
      "· 선택(맞춤 추천용): 사업자 업종, 보유 면허·인증, 소재 지역, 기업 규모, 유사 실적 정보",
    ],
  },
  {
    heading: "2. 개인정보의 수집·이용 목적",
    lines: [
      "· 회원 식별 및 서비스 이용계약의 이행",
      "· 회사 정보 기반 맞춤 공고 추천 및 적합도 계산",
      "· 스크랩 등 개인화 기능 제공",
      "· 서비스 관련 공지 및 문의 대응",
    ],
  },
  {
    heading: "3. 보유 및 이용 기간",
    lines: [
      "개인정보는 회원 탈퇴 시 지체 없이 파기합니다. 다만 관계 법령에 따라 보존이 필요한 경우 해당 법령에서 정한 기간 동안 보관합니다.",
    ],
  },
  {
    heading: "4. 개인정보의 제3자 제공",
    lines: [
      "회사는 회원의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 근거한 수사기관의 적법한 요청이 있는 경우는 예외로 합니다.",
    ],
  },
  {
    heading: "5. 이용자의 권리",
    lines: [
      "회원은 언제든지 자신의 개인정보를 조회·수정하거나 삭제(탈퇴)를 요청할 수 있습니다. 마이페이지에서 직접 처리하거나 고객센터를 통해 요청할 수 있습니다.",
    ],
  },
  {
    heading: "6. 개인정보 보호책임자 및 문의처",
    lines: [
      "개인정보 보호책임자: 비드메이트 개인정보보호팀",
      "문의: privacy@bidmate.co.kr",
    ],
  },
];

export default function PrivacyPage() {
  return <LegalDoc title="개인정보처리방침" effectiveDate="시행일 2026년 7월 1일" sections={SECTIONS} />;
}
