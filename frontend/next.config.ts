import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  compress: true,
  poweredByHeader: false,
  allowedDevOrigins: ["passport-crane-evade.ngrok-free.dev"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
