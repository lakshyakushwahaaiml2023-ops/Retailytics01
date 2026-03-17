import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  async headers() {
    return [
      {
        source: "/api/voice/:path*",
        headers: [
          { key: "ngrok-skip-browser-warning", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
