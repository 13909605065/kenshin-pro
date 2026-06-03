"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/supabase-client";
import { useTheme, THEME_LABELS } from "@/components/providers/ThemeProvider";
import { ArrowLeft, Save, Camera } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
    <div className="min-h-screen bg-pitch-900">
      <header className="sticky top-0 z-40 bg-pitch-900/90 backdrop-blur border-b border-pitch-700">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">个人设置</h1>
          {message && <span className="text-xs text-neon-pink">{message}</span>}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Avatar */}
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-white font-bold">头像</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-pitch-700 border border-pitch-600 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-6 h-6 text-gray-500" />
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
              <span key={t.value} className="text-xs text-gray-500">{t.label}</span>
            ))}
          </div>
        </section>

        {/* Clear Cache */}
        <section className="glass-card p-4">
          <h2 className="text-white font-bold text-sm mb-2">💾 数据管理</h2>
          <button onClick={()=>{localStorage.clear();alert('已清除所有本地缓存，请刷新页面');window.location.reload()}}
            className="w-full py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition">
            🗑️ 清除本地缓存（解决数据显示异常）
          </button>
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
