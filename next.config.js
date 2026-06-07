/** @type {import('next').NextConfig} */

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,   // ✅ 新 SW 安装完立即激活，不等 tab 关闭
  clientsClaim: true,  // ✅ 新 SW 激活后立即接管所有页面
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    // API proxy (/api/supabase) — Network First
    { urlPattern: /\/api\/supabase\/.*/i, handler: "NetworkFirst", options: { cacheName: "api-supabase-proxy", networkTimeoutSeconds: 10, expiration: { maxEntries: 100, maxAgeSeconds: 60 * 30 } } },
    // API routes — Network First, fallback to cache
    { urlPattern: /\/api\/.*/i, handler: "NetworkFirst", options: { cacheName: "apis", networkTimeoutSeconds: 10, expiration: { maxEntries: 50, maxAgeSeconds: 60 * 10 } } },
    // Supabase direct — Network First
    { urlPattern: /^https:\/\/gqjzrrwcxukpzilkjqke\.supabase\.co\/.*/i, handler: "NetworkFirst", options: { cacheName: "supabase-api", networkTimeoutSeconds: 10, expiration: { maxEntries: 100, maxAgeSeconds: 60 * 30 } } },
    // Static assets (JS/CSS) — StaleWhileRevalidate, 24h (versioned by build hash, safe)
    { urlPattern: /\/_next\/static\/.*/i, handler: "StaleWhileRevalidate", options: { cacheName: "static-assets", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 } } },
    // Next.js data (RSC payloads) — Network First, 5min cache
    { urlPattern: /\/_next\/data\/.*/i, handler: "NetworkFirst", options: { cacheName: "next-data", networkTimeoutSeconds: 5, expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 } } },
    // All app pages — Network First, 1h cache (deploy 后 1 小时内自动刷新)
    { urlPattern: /\/(exercises|planning|roster|settings|tactics|offline|field|gym|warmup|strength|checkin|match|share|load|login|fitness)\/.*/i, handler: "NetworkFirst", options: { cacheName: "app-pages", networkTimeoutSeconds: 3, expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 } } },
    // Images — StaleWhileRevalidate, 7 days
    { urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i, handler: "StaleWhileRevalidate", options: { cacheName: "images", expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 } } },
    // Fonts — StaleWhileRevalidate, 30 days
    { urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i, handler: "StaleWhileRevalidate", options: { cacheName: "fonts", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
    // Google Fonts stylesheets
    { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: "StaleWhileRevalidate", options: { cacheName: "google-fonts-css", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 } } },
    // Google Fonts webfonts
    { urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i, handler: "CacheFirst", options: { cacheName: "google-fonts-webfonts", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
  ],
});

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

module.exports = withPWA(nextConfig);
