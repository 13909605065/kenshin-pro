"use client";

import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SceneProvider } from "@/components/providers/SceneProvider";
import { TeamProvider } from "@/lib/team-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SceneProvider>
          <TeamProvider>{children}</TeamProvider>
        </SceneProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
