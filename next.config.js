/** @type {import('next').NextConfig} */

// PWA 暂时关闭 — 缓存导致部署后用户看不到更新
// const withPWA = require("next-pwa")({ ... });
// module.exports = nextConfig;

const nextConfig = {
  trailingSlash: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  env: {
    NEXT_PUBLIC_BUILD_TIME: String(Date.now()),
  },
  async rewrites() {
    return [
      {
        source: '/api/supabase/:path*',
        destination: 'https://gqjzrrwcxukpzilkjqke.supabase.co/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
