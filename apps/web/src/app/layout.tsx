import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@personal-color/design-tokens/tokens.css";
import "./globals.css";
import { SERVICE_NAME } from "@/config/service";
import { CONTENT_SECURITY_POLICY } from "@/lib/security/csp";

export const metadata: Metadata = {
  title: SERVICE_NAME.ko,
  description: SERVICE_NAME.tagline,
  // 1단계: 검색엔진 색인 차단 (7-5)
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 1단계 라이트 모드 고정 (06). CSS 로드 전에도 브라우저가 밝게 그리도록 meta 로도 알린다.
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 보안 설정(CSP): 외부로 나가는 연결 차단 (결정 로그 M3-D1). GitHub Pages 는 헤더를 못 넣어 meta 로 지정 */}
        <meta httpEquiv="Content-Security-Policy" content={CONTENT_SECURITY_POLICY} />
      </head>
      <body>{children}</body>
    </html>
  );
}
