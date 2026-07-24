"use client";

// 루트 레이아웃까지 깨지는 최상위 렌더 에러 처리 + Sentry 전송.
// (일반 페이지 에러는 error.tsx가 담당)
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          textAlign: "center",
          padding: "16px",
        }}
      >
        <p style={{ fontSize: "18px", fontWeight: 700 }}>문제가 생겼어요</p>
        <p style={{ fontSize: "14px", color: "#64748b" }}>
          일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.
        </p>
        {/* 최상위 렌더 에러 화면이라 라우터가 깨져 있을 수 있음 →
            next/link 대신 <a>로 하드 리로드해 확실히 복구시킨다 */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{
            marginTop: "4px",
            borderRadius: "6px",
            background: "#4338ca",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: 700,
            color: "#fff",
            textDecoration: "none",
          }}
        >
          홈으로
        </a>
      </body>
    </html>
  );
}
