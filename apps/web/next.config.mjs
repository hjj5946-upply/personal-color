// 정적 내보내기 호환 (O-8): API Routes, 서버 전용 기능, 이미지 최적화 서버 사용 금지.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@personal-color/core", "@personal-color/design-tokens"],
  reactStrictMode: true,
  // next dev 가 apps/web 에 AGENTS.md·CLAUDE.md 를 자동 생성하지 않게 한다. 에이전트 규칙은 루트 CLAUDE.md 하나로 관리.
  agentRules: false,
};

export default nextConfig;
