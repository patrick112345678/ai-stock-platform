import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API 代理由 app/api/[...path]/route.ts 處理，正確轉發 Authorization header
};

export default nextConfig;
