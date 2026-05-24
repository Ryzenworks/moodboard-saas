import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Strip font preload headers from all extension API routes
        // Prevents Next.js Link preload hints from leaking into extension popup context
        source: '/api/extension/:path*',
        headers: [
          { key: 'Link', value: '' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ];
  },
};

export default nextConfig;
