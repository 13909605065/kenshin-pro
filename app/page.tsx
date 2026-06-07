"use client";

import CoachWorkbench from "@/components/CoachWorkbench";
import dynamic from "next/dynamic";
import { MobileNav } from "@/components/MobileNav";

const DailyReadiness = dynamic(() => import("@/components/DailyReadiness").then(m => ({ default: m.DailyReadiness })), { ssr: false });
const PlayerSelfReport = dynamic(() => import("@/components/PlayerSelfReport").then(m => ({ default: m.PlayerSelfReport })), { ssr: false });
const ReportGenerator = dynamic(() => import("@/components/ReportGenerator").then(m => ({ default: m.ReportGenerator })), { ssr: false });
import { useState, useEffect, Component } from "react";
import { createClient } from "@/lib/supabase/supabase-client";
import { useLang } from "@/components/providers/LanguageProvider";
import { LogOut } from "lucide-react";
import { loadProfileFromSupabase, SupabaseProfile } from "@/hooks/useSupabaseSync";


class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center p-8">
          <div className="glass-card p-6 max-w-lg w-full">
            <p className="text-[#992828] font-bold text-lg mb-2">渲染错误</p>
            <p className="text-sm text-gray-300 mb-1">{this.state.error.message}</p>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap overflow-auto max-h-64">
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [supabaseProfile, setSupabaseProfile] = useState<SupabaseProfile | null>(null);
  const supabase = createClient();
  const { lang, setLang } = useLang();

  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      e.preventDefault();
      setClientError(`${e.message}\n${e.filename}:${e.lineno}`);
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email || data.user.phone || "User");
        setUserId(data.user.id);
        // Load profile from Supabase for auto-fill
        try {
          const profile = await loadProfileFromSupabase(data.user.id);
          if (profile) {
            setSupabaseProfile(profile);
          }
        } catch { /* fallback to localStorage */ }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const LANGS: { value: typeof lang; label: string }[] = [
    { value: "zh", label: "中" },
    { value: "en", label: "EN" },
    { value: "ja", label: "日" },
  ];

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Header — desktop only, mobile uses MobileNav */}
      <header className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur border-b border-[#222] hidden lg:block">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="select-none" title="KenshinPro 体能教练工作台">
              <span className="text-[#992828] font-black text-lg" style={{letterSpacing:"-0.5px"}}>KENSHIN</span>
              <span className="text-[#d1d1d1] font-light text-lg ml-0.5">PRO S&C</span>
              <span className="text-[#888] text-[10px] ml-2 font-medium">体能教练工作台 v2</span>
            </a>
            <nav className="flex items-center gap-0.5 overflow-hidden flex-nowrap">
              <a href="/" className="px-2 py-1.5 text-xs text-[#992828] font-semibold relative transition whitespace-nowrap">
                体能训练
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#992828] rounded-full" />
              </a>
              <a href="/match" className="px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-[#1e1e1e] transition whitespace-nowrap">比赛</a>
              <a href="/warmup" className="px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-[#1e1e1e] transition whitespace-nowrap">热身</a>
              <a href="/exercises" className="px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-[#1e1e1e] transition whitespace-nowrap">动作库</a>
              <a href="/roster" className="px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-[#1e1e1e] transition whitespace-nowrap">花名册</a>
              <a href="/fitness" className="px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-[#1e1e1e] transition whitespace-nowrap">体测</a>
              <a href="/load" className="px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-[#1e1e1e] transition whitespace-nowrap">负荷</a>
              <a href="/planning" className="px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-[#1e1e1e] transition whitespace-nowrap">周期</a>
              <a href="/settings" className="px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-[#1e1e1e] transition whitespace-nowrap">设置</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-[#1e1e1e] rounded-lg p-0.5">
              {LANGS.map((l) => (
                <button key={l.value} onClick={() => setLang(l.value)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition ${lang === l.value ? "bg-[#992828] text-white" : "text-gray-400 hover:text-white"}`}>{l.label}</button>
              ))}
            </div>
            <span className="text-xs text-gray-400 px-1.5 py-1.5">{userEmail}</span>
            <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-[#992828] transition rounded-md" title="退出"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <MobileNav />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-20 lg:pb-6">
        {clientError && (
          <div className="mb-6 p-4 bg-[#992828]/20 border border-[#992828] rounded-xl">
            <p className="text-[#992828] font-bold text-sm mb-1">客户端错误:</p>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">{clientError}</pre>
          </div>
        )}
        <ErrorBoundary>
          <CoachWorkbench />
          <div className="mt-6 flex items-start gap-4 flex-wrap lg:flex-nowrap border-t border-[#222] pt-6">
            <div className="max-w-md flex-1 min-w-64">
              <DailyReadiness onReadinessChange={(score) => {
                sessionStorage.setItem('kenshin_today_readiness', JSON.stringify({score, date: new Date().toISOString().slice(0,10)}));
                if (score < 55) sessionStorage.setItem('kenshin_readiness_warning', '1');
                else sessionStorage.removeItem('kenshin_readiness_warning');
              }} />
            </div>
            <div className="flex flex-col gap-2 ml-auto items-end">
              <ReportGenerator />
              <PlayerSelfReport />
            </div>
          </div>
        </ErrorBoundary>
      </main>

    </div>
  );
}
