"use client";

import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import zh from "@/lib/i18n/locales/zh.json";
import en from "@/lib/i18n/locales/en.json";
import ja from "@/lib/i18n/locales/ja.json";

export type Language = "zh" | "en" | "ja";

interface ContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<ContextType>({
  lang: "zh",
  setLang: () => {},
  t: (k) => k,
});

export function useLang() {
  return useContext(LanguageContext);
}

function flatten(obj: Record<string, any>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      result[fullKey] = v;
    } else if (typeof v === "object" && v !== null) {
      Object.assign(result, flatten(v, fullKey));
    }
  }
  return result;
}

const FLAT: Record<Language, Record<string, string>> = {
  zh: flatten(zh),
  en: flatten(en),
  ja: flatten(ja),
};

const STORAGE_KEY = "kenshin_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("zh");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language;
      if (saved && ["zh", "en", "ja"].includes(saved)) {
        setLangState(saved);
      }
    } catch {}
  }, []);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = l === "ja" ? "ja" : l === "en" ? "en" : "zh-CN";
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      return FLAT[lang]?.[key] || FLAT.zh[key] || key;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
