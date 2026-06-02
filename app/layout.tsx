import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { ErrorCatcher } from "@/components/ErrorCatcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kenshinpro - 足球训练助手",
  description: "职业级 AI 足球训练方案生成器",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <ErrorCatcher>
          <Providers>{children}</Providers>
        </ErrorCatcher>
      </body>
    </html>
  );
}
