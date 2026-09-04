import type { NextConfig } from "next";

const R2_PUBLIC_ORIGIN =
  process.env.BFT_R2_PUBLIC_ORIGIN ||
  "https://pub-bee1ccae8444499fb2a74842fcf63f2b.r2.dev";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  assetPrefix: process.env.VERCEL === "1" ? undefined : "https://api.businessfuture.today",
  async headers() {
    return [{
      source: "/_next/static/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },
        { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
      ],
    }];
  },
  async rewrites() {
    return {
      beforeFiles: [
        ...(process.env.VERCEL === "1" ? [
          { source: "/api/:path*", destination: `${process.env.BFT_API_ORIGIN || "https://api.businessfuture.today"}/api/:path*` },
          { source: "/preview/:path*", destination: `${process.env.BFT_API_ORIGIN || "https://api.businessfuture.today"}/preview/:path*` },
          { source: "/preview-source/:path*", destination: `${process.env.BFT_API_ORIGIN || "https://api.businessfuture.today"}/preview-source/:path*` },
          { source: "/social-review/:path*", destination: `${process.env.BFT_API_ORIGIN || "https://api.businessfuture.today"}/social-review/:path*` },
          { source: "/social-review-assets/:path*", destination: `${process.env.BFT_API_ORIGIN || "https://api.businessfuture.today"}/social-review-assets/:path*` },
          { source: "/social-publish-assets/:path*", destination: `${process.env.BFT_API_ORIGIN || "https://api.businessfuture.today"}/social-publish-assets/:path*` },
          { source: "/media/:path*", destination: `https://assets.businessfuture.today/media/:path*` },
        ] : []),
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
