import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack to force webpack, avoiding CSS processing panics in Next.js 16
  // experimental: {
  //   turbopack: false
  // }
  // Using undefined turbopack disables it without experimental
  turbopack: undefined,
};

export default nextConfig;
