import type { NextConfig } from "next";

const R2_PUBLIC_ORIGIN =
  process.env.BFT_R2_PUBLIC_ORIGIN ||
  "https://pub-bee1ccae8444499fb2a74842fcf63f2b.r2.dev";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/media/:path*",
          has: [{ type: "host", value: "assets.businessfuture.today" }],
          destination: `${R2_PUBLIC_ORIGIN}/media/:path*`,
        },
        {
          source: "/articles/:path*",
          has: [{ type: "host", value: "assets.businessfuture.today" }],
          destination: `${R2_PUBLIC_ORIGIN}/articles/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
