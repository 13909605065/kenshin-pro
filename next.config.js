/** @type {import('next').NextConfig} */

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: false,
  disable: process.env.NODE_ENV === "development", // enable in production only
  runtimeCaching: [
    // API routes — Network First, fallback to cache
    { urlPattern: /\/api\/.*/i, handler: "NetworkFirst", options: { cacheName: "apis", networkTimeoutSeconds: 10, expiration: { maxEntries: 50, maxAgeSeconds: 60 * 10 } } },
    // Supabase — Network First, short cache
    { urlPattern: /^https:\/\/gqjzrrwcxukpzilkjqke\.supabase\.co\/.*/i, handler: "NetworkFirst", options: { cacheName: "supabase-api", networkTimeoutSeconds: 10, expiration: { maxEntries: 100, maxAgeSeconds: 60 * 30 } } },
    // Static assets (JS/CSS) — Cache First, versioned by build
    { urlPattern: /\/_next\/static\/.*/i, handler: "CacheFirst", options: { cacheName: "static-assets", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
    // Images — Cache First, long expiry
    { urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i, handler: "CacheFirst", options: { cacheName: "images", expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 } } },
    // Fonts — Cache First
    { urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i, handler: "CacheFirst", options: { cacheName: "fonts", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
    // Page navigations — Network First
    { urlPattern: /\/$/i, handler: "NetworkFirst", options: { cacheName: "pages", networkTimeoutSeconds: 5, expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 } } },
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
