import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { ErrorCatcher } from "@/components/ErrorCatcher";
import { OfflineBanner } from "@/components/OfflineBanner";
import { UpdateBanner } from "@/components/UpdateBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "KenshinPro S&C — 职业足球体能训练系统",
  description: "AI足球体能教练工作台。四大板块：周期计划定制、场地训练、体能房训练、伤病防控。为足球教练和运动员提供职业级体能方案。",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "KenshinPro S&C — 职业足球体能训练系统",
    description: "AI足球体能教练工作台。四大板块：周期计划定制、场地训练、体能房训练、伤病防控。为足球教练和运动员提供职业级体能方案。",
    type: "website",
    locale: "zh_CN",
    siteName: "KenshinPro S&C",
  },
  appleWebApp: {
    capable: true,
    title: "KenshinPro S&C",
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
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
    { media: "(prefers-color-scheme: light)", color: "#121212" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <meta name="apple-mobile-web-app-title" content="Kenshin体能" />
        <meta name="format-detection" content="telephone=no" />
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
