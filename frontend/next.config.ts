import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use webpack instead of Turbopack to avoid CSS processing panics in Next.js 16
  turbopack: undefined,
};

export default nextConfig;
