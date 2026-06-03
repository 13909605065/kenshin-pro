"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, Layout, Users, History, Settings } from "lucide-react";
import { useLang } from "@/lib/i18n/LanguageContext";

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, t } = useLang();

  const TABS = [
    { id: "home", label: t("nav.home"), icon: Home, path: "/" },
    { id: "tactics", label: t("nav.tactics"), icon: Layout, path: "/tactics" },
    { id: "roster", label: t("nav.roster"), icon: Users, path: "/roster" },
    { id: "history", label: t("nav.history"), icon: History, path: "/history" },
    { id: "settings", label: t("nav.settings"), icon: Settings, path: "/settings" },
  ];

  const LANGS: { value: typeof lang; label: string }[] = [
    { value: "zh", label: "中" },
    { value: "en", label: "EN" },
    { value: "ja", label: "日" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-pitch-900/95 backdrop-blur border-t border-pitch-700 lg:hidden">
      {/* Language switcher row — mobile only */}
      <div className="flex items-center justify-center gap-1 py-1.5 border-b border-pitch-800">
        <div className="flex bg-pitch-800 rounded-lg p-0.5">
          {LANGS.map((l) => (
            <button
              key={l.value}
              onClick={() => setLang(l.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                lang === l.value ? "bg-neon-pink text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-around h-14 px-1 pb-safe">
        {TABS.map((tab) => {
          const active = pathname === tab.path || (tab.path !== "/" && pathname.startsWith(tab.path));
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition ${
                active ? "text-neon-pink" : "text-gray-500"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
