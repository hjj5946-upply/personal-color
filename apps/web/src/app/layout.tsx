import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@personal-color/design-tokens/tokens.css";
import "./globals.css";
import { SERVICE_NAME } from "@/config/service";

export const metadata: Metadata = {
  title: SERVICE_NAME.ko,
  description: SERVICE_NAME.tagline,
  // 1단계: 검색엔진 색인 차단 (7-5)
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
