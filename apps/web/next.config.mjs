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
};

export default nextConfig;
