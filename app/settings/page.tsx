"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/supabase-client";
import { useTheme, THEME_LABELS } from "@/components/providers/ThemeProvider";
import { ArrowLeft, Save, Camera, Download, AlertTriangle, Upload, Shield } from "lucide-react";
import { exportAsJSON, exportAsCSV, exportAllData, DataStats, previewImport, executeImport, type ImportPreview } from "@/lib/data-export";

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

  // ── Import state ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importJson, setImportJson] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

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

  // ── Import handlers ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const preview = previewImport(text);
        setImportJson(text);
        setImportPreview(preview);
        setShowImportConfirm(true);
      } catch {
        setMessage("文件格式错误，无法解析");
        setTimeout(() => setMessage(""), 3000);
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = () => {
    setImporting(true);
    try {
      const count = executeImport(importJson);
      setMessage(`已恢复 ${count} 项数据 ✅`);
      setShowImportConfirm(false);
      setImportPreview(null);
      setImportJson("");
      // Refresh stats
      if (typeof window !== "undefined") {
        setStats(exportAllData().stats);
      }
    } catch {
      setMessage("恢复失败，请检查文件");
    }
    setImporting(false);
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <header className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur border-b border-[#1e1e1e]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">个人设置</h1>
          {message && <span className={`text-xs ${message.includes('✅') ? 'text-green-400' : 'text-[#992828]'}`}>{message}</span>}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* ── Backup Reminder Banner ── */}
        <section className="bg-[#992828]/10 border border-[#992828]/20 rounded-xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#992828] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white font-bold">建议每次训练后导出数据备份</p>
            <p className="text-xs text-gray-400 mt-1">
              训练记录是教练最重要的资产。定期导出备份，防止数据丢失。
              <button
                onClick={() => document.getElementById("data-management")?.scrollIntoView({ behavior: "smooth" })}
                className="text-[#992828] underline ml-1 hover:text-[#ff4444] transition"
              >
                前往数据管理
              </button>
            </p>
          </div>
        </section>

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

        {/* ── Data Management (id for scroll anchor) ── */}
        <section id="data-management" className="glass-card p-6 space-y-4">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#992828]" />
            数据管理
          </h2>
          <p className="text-xs text-gray-500">
            导出训练数据备份或从备份文件恢复。建议每次训练后导出。
          </p>

          {/* Stats Summary */}
          {stats && (
            <div className="text-xs text-gray-400 bg-[#1a1a1a] rounded-lg p-3 leading-relaxed">
              训练方案{stats.trainingPlans}份 · 训练日志{stats.trainingLogs}条 · 热身设计{stats.warmupDesigns}套 · 力量设计{stats.gymDesigns}套 · 比赛{stats.matchRecords}场 · 体能档案{stats.fitnessProfiles}人
              <br />
              总计约 {stats.totalSizeKB} KB
            </div>
          )}

          {/* Export buttons */}
          <div className="space-y-3">
            <p className="text-[10px] text-gray-500 font-medium">导出备份</p>
            <div className="flex gap-3">
              <button
                onClick={() => { exportAsJSON(); setMessage("JSON 备份已下载 ✅"); setTimeout(() => setMessage(""), 2000); }}
                className="flex-1 py-3 bg-[#1e1e1e] border border-[#333] text-gray-200 rounded-lg text-sm hover:bg-[#252525] transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出全部数据 (JSON)
              </button>
              <button
                onClick={() => { exportAsCSV(); setMessage("CSV 已下载 ✅"); setTimeout(() => setMessage(""), 2000); }}
                className="flex-1 py-3 bg-[#1e1e1e] border border-[#333] text-gray-200 rounded-lg text-sm hover:bg-[#252525] transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出训练日志 (CSV)
              </button>
            </div>
          </div>

          {/* Import / Restore */}
          <div className="border-t border-[#222] pt-4 space-y-3">
            <p className="text-[10px] text-gray-500 font-medium">导入恢复</p>
            <p className="text-[9px] text-gray-600">
              上传之前导出的 JSON 备份文件，预览后确认恢复。恢复将覆盖当前数据。
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-[#1e1e1e] border border-[#333] text-gray-200 rounded-lg text-sm hover:bg-[#252525] transition flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              选择备份文件恢复数据
            </button>
          </div>
        </section>

        {/* ── Import Confirm Modal ── */}
        {showImportConfirm && importPreview && (
          <section className="glass-card p-6 space-y-4 border-[#992828]/50">
            <h2 className="text-white font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#992828]" />
              确认数据恢复
            </h2>

            <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">备份日期</span>
                <span className="text-white">{importPreview.exportedAt.slice(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">包含数据类型</span>
                <span className="text-white">{importPreview.keyCount} 项</span>
              </div>
              <div className="border-t border-[#222] pt-2 mt-2 max-h-[180px] overflow-y-auto space-y-1">
                {importPreview.keys.map((k) => (
                  <div key={k.key} className="flex justify-between text-[10px]">
                    <span className="text-gray-500 truncate max-w-[60%]">{k.key}</span>
                    <span className="text-gray-600">{k.type} · {k.size}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-red-400 bg-red-500/10 rounded p-2">
              确认恢复将覆盖当前所有同名数据。建议先导出当前数据备份。
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="flex-1 py-3 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {importing ? "恢复中..." : "确认恢复，将覆盖当前数据"}
              </button>
              <button
                onClick={() => { setShowImportConfirm(false); setImportPreview(null); setImportJson(""); }}
                className="flex-1 py-3 bg-[#1e1e1e] border border-[#333] text-gray-300 rounded-lg text-sm hover:bg-[#252525] transition"
              >
                取消
              </button>
            </div>
          </section>
        )}

        {/* Clear All Data */}
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-white font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            清除全部数据
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
