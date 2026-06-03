/** @type {import('next').NextConfig} */

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: true, // PWA caching old assets, disable until fixed
  runtimeCaching: [
    { urlPattern: /^https:\/\/gqjzrrwcxukpzilkjqke\.supabase\.co\/.*/i, handler: "NetworkFirst", options: { cacheName: "supabase-api", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 } } },
    { urlPattern: /\/api\/.*/i, handler: "NetworkFirst", options: { cacheName: "apis", expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 } } },
    { urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i, handler: "CacheFirst", options: { cacheName: "images", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
    { urlPattern: /\/_next\/static\/.*/i, handler: "CacheFirst", options: { cacheName: "static", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 } } },
  ],
});

const nextConfig = {
  trailingSlash: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = withPWA(nextConfig);
