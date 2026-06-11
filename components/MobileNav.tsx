"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Ellipsis, Dumbbell, Users, X, Zap, Activity, BarChart3, Gauge, Trophy, Settings } from "lucide-react";
import { useLang } from "@/components/providers/LanguageProvider";

// ═══════════════════════════════════════════════
// Desktop nav items — shared with mobile
// ═══════════════════════════════════════════════

export const MAIN_TABS = [
  { id: "home", label: "首页", icon: Home, path: "/" },
  { id: "gym", label: "力量房", icon: Dumbbell, path: "/gym" },
  { id: "exercises", label: "动作库", icon: Dumbbell, path: "/exercises" },
  { id: "planning", label: "周期方案", icon: Dumbbell, path: "/planning" },
];

export const MORE_TABS = [
  { id: "field",    label: "场地训练", icon: Activity,   path: "/field" },
  { id: "warmup",   label: "热身设计", icon: Zap,        path: "/warmup" },
  { id: "load",     label: "负荷管理", icon: BarChart3,  path: "/load" },
  { id: "fitness",  label: "体测",     icon: Gauge,      path: "/fitness" },
  { id: "roster",   label: "花名册",   icon: Users,      path: "/roster" },
  { id: "status",   label: "状态录入", icon: Activity,   path: "/status" },
  { id: "match",    label: "比赛",     icon: Trophy,     path: "/match" },
  { id: "settings", label: "设置",     icon: Settings,   path: "/settings" },
];

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, t } = useLang();
  const [moreOpen, setMoreOpen] = useState(false);

  const TABS = MAIN_TABS.map(tab =>
    tab.id === "home" ? { ...tab, label: t("nav.home") } : tab
  );

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
                      ? "bg-[#992828]/10 text-[#992828]"
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
                    lang === l.value ? "bg-[#992828] text-white" : "text-gray-400 hover:text-white"
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
                isActive(tab.path) ? "text-[#992828]" : "text-gray-400"
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
              MORE_TABS.some((t) => isActive(t.path)) ? "text-[#992828]" : "text-gray-400"
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
