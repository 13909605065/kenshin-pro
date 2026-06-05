"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/supabase-client";
import { useTheme, THEME_LABELS } from "@/components/providers/ThemeProvider";
import { ArrowLeft, Save, Camera, Download, AlertTriangle } from "lucide-react";
import { exportAsJSON, exportAsCSV, exportAllData, DataStats } from "@/lib/data-export";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<DataStats | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        setNickname(data.display_name || "");
        setAvatarUrl(data.avatar_url || "");
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setStats(exportAllData().stats);
    }
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: nickname, avatar_url: avatarUrl });
    if (error) setMessage("保存失败");
    else setMessage("已保存 ✅");
    setSaving(false);
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <header className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur border-b border-[#1e1e1e]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">个人设置</h1>
          {message && <span className="text-xs text-[#d92525]">{message}</span>}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Avatar */}
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-white font-bold">头像</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#1e1e1e] border border-[#222] flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="输入头像图片 URL"
              className="input-field flex-1 text-sm"
            />
          </div>
        </section>

        {/* Nickname */}
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-white font-bold">昵称</h2>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="设置你的昵称"
            className="input-field text-sm"
            maxLength={30}
          />
        </section>

        {/* Theme */}
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-white font-bold">主题色彩</h2>
          <div className="flex gap-3 flex-wrap">
            {THEME_LABELS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`w-12 h-12 rounded-full border-2 transition-all ${
                  theme === t.value ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: t.color }}
                title={t.label}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {THEME_LABELS.map((t) => (
              <span key={t.value} className="text-xs text-gray-400">{t.label}</span>
            ))}
          </div>
        </section>

        {/* Data Export */}
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Download className="w-4 h-4" />
            数据导出
          </h2>

          {/* Stats Summary */}
          {stats && (
            <div className="text-xs text-gray-400 bg-[#1a1a1a] rounded-lg p-3 leading-relaxed">
              训练方案{stats.trainingPlans}份 · 训练日志{stats.trainingLogs}条 · 热身设计{stats.warmupDesigns}套 · 力量设计{stats.gymDesigns}套 · 比赛{stats.matchRecords}场 · 体能档案{stats.fitnessProfiles}人
              <br />
              总计约 {stats.totalSizeKB} KB
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { exportAsJSON(); setMessage("JSON 备份已下载"); setTimeout(() => setMessage(""), 2000); }}
              className="flex-1 py-2 bg-[#1e1e1e] border border-[#333] text-gray-200 rounded-lg text-sm hover:bg-[#252525] transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出全部数据 (JSON)
            </button>
            <button
              onClick={() => { exportAsCSV(); setMessage("CSV 已下载"); setTimeout(() => setMessage(""), 2000); }}
              className="flex-1 py-2 bg-[#1e1e1e] border border-[#333] text-gray-200 rounded-lg text-sm hover:bg-[#252525] transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出训练日志 (CSV)
            </button>
          </div>
        </section>

        {/* Clear All Data */}
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-white font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            数据管理
          </h2>
          <p className="text-xs text-gray-500">
            清除所有本地存储的训练数据。建议先导出备份。
          </p>

          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition"
            >
              清除全部数据
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-red-400 bg-red-500/10 rounded p-2">
                确认清除？此操作不可撤销，所有本地数据将被永久删除。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    localStorage.clear();
                    setMessage("已清除所有本地数据，即将刷新页面");
                    setShowClearConfirm(false);
                    setTimeout(() => window.location.reload(), 800);
                  }}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition"
                >
                  确认清除
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2 bg-[#1e1e1e] border border-[#333] text-gray-300 rounded-lg text-sm hover:bg-[#252525] transition"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Save */}
        <button onClick={save} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? "保存中..." : "保存设置"}
        </button>
      </main>
    </div>
  );
}
