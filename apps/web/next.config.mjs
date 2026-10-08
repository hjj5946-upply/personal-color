// 정적 내보내기 호환 (O-8): API Routes, 서버 전용 기능, 이미지 최적화 서버 사용 금지.
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {(phase: string) => import('next').NextConfig} */
export default function nextConfig(phase) {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    output: "export",
    basePath,
    trailingSlash: true,
    images: { unoptimized: true },
    transpilePackages: ["@personal-color/core", "@personal-color/design-tokens"],
    reactStrictMode: true,
    // next dev 가 apps/web 에 AGENTS.md·CLAUDE.md 를 자동 생성하지 않게 한다. 에이전트 규칙은 루트 CLAUDE.md 하나로 관리.
    agentRules: false,
    // 개발용 화면(page.dev.tsx)은 next dev 에서만 페이지가 된다. 배포 빌드에는 포함되지 않는다 (결정 로그 M3-D10).
    pageExtensions: isDevServer ? ["dev.tsx", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
  };
}
