import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { ErrorCatcher } from "@/components/ErrorCatcher";
import { OfflineBanner } from "@/components/OfflineBanner";
import { UpdateBanner } from "@/components/UpdateBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "KenshinPro - 足球训练助手",
  description: "职业级 AI 足球训练方案生成器 · 战术诊断 · 智能备课 · 战术板",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "KenshinPro",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#111217" },
    { media: "(prefers-color-scheme: light)", color: "#111217" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen">
        <OfflineBanner />
        <UpdateBanner />
        <ErrorCatcher>
          <Providers>{children}</Providers>
        </ErrorCatcher>
      </body>
    </html>
  );
}
