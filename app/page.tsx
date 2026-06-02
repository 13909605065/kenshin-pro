"use client";

import { TrainingApp } from "@/components/TrainingApp";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { useState, useEffect, Component } from "react";
import { createClient } from "@/lib/supabase-client";
import { useLang } from "@/lib/i18n/LanguageContext";
import { LogOut, History, Settings, Dumbbell } from "lucide-react";
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
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">Kenshinpro</h1>
            <span className="text-xs text-gray-500 hidden sm:inline">
              {t("app.subtitle")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex bg-pitch-800 rounded-lg p-0.5">
              {LANGS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLang(l.value)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition ${
                    lang === l.value
                      ? "bg-neon-pink text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-400 hidden sm:inline">
              {userEmail}
            </span>
            <button
              onClick={() => router.push("/strength")}
              className="p-2 text-gray-400 hover:text-neon-pink transition"
              title="力量训练"
            >
              <Dumbbell className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="p-2 text-gray-400 hover:text-white transition"
              title="设置"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="p-2 text-gray-400 hover:text-white transition"
              title="历史记录"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-neon-red transition"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {clientError && (
          <div className="mb-6 p-4 bg-neon-red/20 border border-neon-red rounded-xl">
            <p className="text-neon-red font-bold text-sm mb-1">客户端错误:</p>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">{clientError}</pre>
          </div>
        )}
        <ErrorBoundary>
          <TrainingApp />
        </ErrorBoundary>
      </main>

      {/* History Drawer */}
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-pitch-700 mt-16 py-6 text-center text-gray-600 text-xs">
        <p>Kenshinpro · AI 足球训练方案生成器</p>
        <p className="mt-1">
          <a href="#" className="hover:text-gray-400 transition">隐私政策</a>
          {" · "}
          <a href="#" className="hover:text-gray-400 transition">服务条款</a>
        </p>
      </footer>
    </div>
  );
}
