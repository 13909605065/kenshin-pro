"use client";

import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SceneProvider } from "@/components/providers/SceneProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SceneProvider>{children}</SceneProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
