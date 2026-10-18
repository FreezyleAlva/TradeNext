// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  typedRoutes: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  turbopack: { root: __dirname },
};

export default nextConfig;
