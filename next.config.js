/** @type {import('next').NextConfig} */

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: false,
  disable: process.env.NODE_ENV === "development", // enable in production only
  runtimeCaching: [
    // API proxy (/api/supabase) — Network First, critical for offline data access
    { urlPattern: /\/api\/supabase\/.*/i, handler: "NetworkFirst", options: { cacheName: "api-supabase-proxy", networkTimeoutSeconds: 10, expiration: { maxEntries: 100, maxAgeSeconds: 60 * 30 } } },
    // API routes — Network First, fallback to cache
    { urlPattern: /\/api\/.*/i, handler: "NetworkFirst", options: { cacheName: "apis", networkTimeoutSeconds: 10, expiration: { maxEntries: 50, maxAgeSeconds: 60 * 10 } } },
    // Supabase direct — Network First, short cache
    { urlPattern: /^https:\/\/gqjzrrwcxukpzilkjqke\.supabase\.co\/.*/i, handler: "NetworkFirst", options: { cacheName: "supabase-api", networkTimeoutSeconds: 10, expiration: { maxEntries: 100, maxAgeSeconds: 60 * 30 } } },
    // Static assets (JS/CSS) — Cache First, versioned by build hash
    { urlPattern: /\/_next\/static\/.*/i, handler: "CacheFirst", options: { cacheName: "static-assets", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
    // Next.js data (RSC payloads, _next/data) — Network First for fresh data
    { urlPattern: /\/_next\/data\/.*/i, handler: "NetworkFirst", options: { cacheName: "next-data", networkTimeoutSeconds: 5, expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 } } },
    // Key app pages (exercises, planning, roster, settings, tactics, offline) — Network First
    { urlPattern: /\/(exercises|planning|roster|settings|tactics|offline)\/.*/i, handler: "NetworkFirst", options: { cacheName: "app-pages", networkTimeoutSeconds: 5, expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 } } },
    // Images — Cache First, long expiry
    { urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i, handler: "CacheFirst", options: { cacheName: "images", expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 } } },
    // Fonts — Cache First
    { urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i, handler: "CacheFirst", options: { cacheName: "fonts", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
    // Root page (Dashboard) — Network First
    { urlPattern: /\/$/i, handler: "NetworkFirst", options: { cacheName: "pages", networkTimeoutSeconds: 5, expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 } } },
    // Google Fonts stylesheets — Stale While Revalidate
    { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: "StaleWhileRevalidate", options: { cacheName: "google-fonts-css", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
    // Google Fonts webfonts — Cache First
    { urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i, handler: "CacheFirst", options: { cacheName: "google-fonts-webfonts", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
  ],
});

const nextConfig = {
  trailingSlash: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
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
