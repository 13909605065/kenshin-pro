"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Brain, Layout, Ellipsis, Users, History, Settings, Calendar, Dumbbell, X } from "lucide-react";
import { useLang } from "@/components/providers/LanguageProvider";

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, t } = useLang();
  const [moreOpen, setMoreOpen] = useState(false);

  const TABS = [
    { id: "home", label: t("nav.home"), icon: Home, path: "/" },
    { id: "diagnosis", label: "战术诊断", icon: Brain, path: "/tactical-diagnosis" },
    { id: "tactics", label: "战术板", icon: Layout, path: "/tactics" },
  ];

  const MORE_TABS = [
    { id: "exercises", label: "动作库", icon: Dumbbell, path: "/exercises" },
    { id: "schedule", label: "赛程", icon: Calendar, path: "/schedule" },
    { id: "roster", label: "花名册", icon: Users, path: "/roster" },
    { id: "history", label: "历史", icon: History, path: "/history" },
    { id: "settings", label: "设置", icon: Settings, path: "/settings" },
  ];

  const LANGS: { value: typeof lang; label: string }[] = [
    { value: "zh", label: "中" },
    { value: "en", label: "EN" },
    { value: "ja", label: "日" },
  ];

  const isActive = (path: string) =>
    pathname === path || (path !== "/" && pathname.startsWith(path));

  return (
    <>
      {/* More popup */}
      {moreOpen && (
        <div className="fixed inset-0 z-[55] lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-[#121212] border-t border-[#1e1e1e] rounded-t-2xl shadow-2xl p-4 pb-8"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">更多</span>
              <button onClick={() => setMoreOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MORE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { router.push(tab.path); setMoreOpen(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition ${
                    isActive(tab.path)
                      ? "bg-[#d92525]/10 text-[#d92525]"
                      : "bg-[#1e1e1e] text-gray-400 hover:bg-[#1e1e1e]"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
            {/* Language switcher in more menu */}
            <div className="mt-3 flex items-center justify-center gap-1">
              {LANGS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLang(l.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    lang === l.value ? "bg-[#d92525] text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212]/95 backdrop-blur border-t border-[#1e1e1e] lg:hidden">
        <div className="flex items-center justify-around h-14 px-1 pb-safe">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition ${
                isActive(tab.path) ? "text-[#d92525]" : "text-gray-400"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition ${
              MORE_TABS.some((t) => isActive(t.path)) ? "text-[#d92525]" : "text-gray-400"
            }`}
          >
            <Ellipsis className="w-5 h-5" />
            <span className="text-[10px] font-medium">更多</span>
          </button>
        </div>
      </nav>
    </>
  );
}
