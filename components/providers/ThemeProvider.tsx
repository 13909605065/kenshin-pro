"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeColor = "pink" | "green" | "blue" | "purple" | "orange" | "red";

interface ThemeContextType {
  theme: ThemeColor;
  setTheme: (t: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "green",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const COLORS: Record<ThemeColor, string> = {
  pink: "#FF2D55",
  green: "#00FF88",
  blue: "#3B82F6",
  purple: "#A855F7",
  orange: "#F97316",
  red: "#EF4444",
};

export function getThemeColor(t: ThemeColor): string {
  return COLORS[t] || COLORS.pink;
}

export const THEME_LABELS: { value: ThemeColor; label: string; color: string }[] = [
  { value: "pink", label: "黑粉", color: "#FF2D55" },
  { value: "green", label: "霓虹绿", color: "#00FF88" },
  { value: "blue", label: "科技蓝", color: "#3B82F6" },
  { value: "purple", label: "暗夜紫", color: "#A855F7" },
  { value: "orange", label: "活力橙", color: "#F97316" },
  { value: "red", label: "竞技红", color: "#EF4444" },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeColor>("pink");

  useEffect(() => {
    const saved = localStorage.getItem("kenshin_theme") as ThemeColor;
    if (saved && COLORS[saved]) {
      setThemeState(saved);
      document.body.setAttribute("data-theme", saved);
    }
  }, []);

  const setTheme = (t: ThemeColor) => {
    setThemeState(t);
    localStorage.setItem("kenshin_theme", t);
    document.body.setAttribute("data-theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
