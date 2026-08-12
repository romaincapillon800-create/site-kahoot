import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // ✅ SECURITY: Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // ✅ SECURITY: CORS configuration
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/socket",
          destination: "/api/socket",
        },
      ],
    };
  },

  // ✅ SECURITY: Limit server actions
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: process.env.NEXT_PUBLIC_APP_URL 
        ? [process.env.NEXT_PUBLIC_APP_URL]
        : undefined,
    },
  },

  // ✅ SECURITY: Disable powered-by header
  poweredByHeader: false,

  // ✅ SECURITY: Compress responses
  compress: true,

  // ✅ SECURITY: Generate ETags
  generateEtags: true,

  // ✅ SECURITY: Production optimizations
  productionBrowserSourceMaps: false, // Don't expose source maps in production
};

export default nextConfig;
