"use client";

import { Dashboard } from "@/components/Dashboard";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { useState, useEffect, Component } from "react";
import { createClient } from "@/lib/supabase-client";
import { useLang } from "@/lib/i18n/LanguageContext";
import { LogOut, History, Settings, Dumbbell, Layout } from "lucide-react";
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
      {/* Header */}
      <header className="sticky top-0 z-40 bg-pitch-900/90 backdrop-blur border-b border-pitch-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">Kenshinpro</h1>
            <span className="text-xs text-gray-500 hidden sm:inline">
              {t("app.subtitle")}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex bg-pitch-800 rounded-lg p-0.5 flex-shrink-0">
              {LANGS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLang(l.value)}
                  className={`px-1.5 sm:px-2 py-1 rounded-md text-xs font-medium transition ${
                    lang === l.value
                      ? "bg-neon-pink text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500 hidden lg:inline max-w-[120px] truncate">
              {userEmail}
            </span>
            <button
              onClick={() => router.push("/exercises")}
              className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs text-gray-400 hover:text-white hover:bg-pitch-700 transition flex-shrink-0"
              title="训练动作库"
            >
              <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>动作库</span>
            </button>
            <button
              onClick={() => router.push("/tactics")}
              className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs text-gray-400 hover:text-white hover:bg-pitch-700 transition flex-shrink-0"
              title="在线战术板"
            >
              <Layout className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>战术</span>
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs text-gray-400 hover:text-white hover:bg-pitch-700 transition flex-shrink-0"
              title="设置"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">设置</span>
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs text-gray-400 hover:text-white hover:bg-pitch-700 transition flex-shrink-0"
              title="训练历史"
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">历史</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-neon-red transition flex-shrink-0"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
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
