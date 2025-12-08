import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure Turbopack resolves the correct workspace root (avoid picking parent dir)
    root: __dirname,
  },
};

export default nextConfig;
