import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
});

const SITE_TITLE = "비드프렌드 — 나라장터 공공입찰 공고 추천";
const SITE_DESCRIPTION = "회사 조건에 맞는 나라장터 공공입찰 공고를 추천해 드립니다.";

export const metadata: Metadata = {
  metadataBase: new URL("https://bidfriend.ai.kr"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // SNS 공유 시 미리보기 카드. 이미지는 app/opengraph-image.tsx가 자동으로 붙는다.
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "비드프렌드",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
