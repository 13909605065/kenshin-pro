"use client";

import { Dashboard } from "@/components/Dashboard";
import { MobileNav } from "@/components/MobileNav";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { useState, useEffect, Component } from "react";
import { createClient } from "@/lib/supabase/supabase-client";
import { useLang } from "@/components/providers/LanguageProvider";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

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
        <div className="min-h-screen bg-pitch-900 flex items-center justify-center p-8">
          <div className="glass-card p-6 max-w-lg w-full">
            <p className="text-neon-red font-bold text-lg mb-2">渲染错误</p>
            <p className="text-sm text-gray-300 mb-1">{this.state.error.message}</p>
            <pre className="text-xs text-gray-500 whitespace-pre-wrap overflow-auto max-h-64">
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
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const supabase = createClient();
  const { lang, setLang, t } = useLang();

  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      e.preventDefault();
      setClientError(`${e.message}\n${e.filename}:${e.lineno}`);
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email || data.user.phone || "User");
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
    <div className="min-h-screen bg-pitch-900">
      {/* Header — desktop only, mobile uses MobileNav */}
      <header className="sticky top-0 z-40 bg-pitch-900/90 backdrop-blur border-b border-pitch-700 hidden lg:block">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-white">Kenshinpro</h1>
            <nav className="flex items-center gap-1">
              <a href="/" className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-pitch-700 transition">首页</a>
              <a href="/tactical-diagnosis" className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-pitch-700 transition">Kenshin AI</a>
              <a href="/tactics" className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-pitch-700 transition">战术板</a>
              <a href="/exercises" className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-pitch-700 transition">动作库</a>
              <a href="/roster" className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-pitch-700 transition">花名册</a>
              <a href="/history" className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-pitch-700 transition">历史</a>
              <a href="/settings" className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-pitch-700 transition">设置</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-pitch-800 rounded-lg p-0.5">
              {LANGS.map((l) => (
                <button key={l.value} onClick={() => setLang(l.value)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition ${lang === l.value ? "bg-neon-pink text-black" : "text-gray-400 hover:text-white"}`}>{l.label}</button>
              ))}
            </div>
            <span className="text-xs text-gray-500">{userEmail}</span>
            <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-neon-red transition" title="退出"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <MobileNav />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-20 lg:pb-6">
        {clientError && (
          <div className="mb-6 p-4 bg-neon-red/20 border border-neon-red rounded-xl">
            <p className="text-neon-red font-bold text-sm mb-1">客户端错误:</p>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">{clientError}</pre>
          </div>
        )}
        <ErrorBoundary>
          <Dashboard />
        </ErrorBoundary>
      </main>

      {/* History Drawer */}
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

    </div>
  );
}
