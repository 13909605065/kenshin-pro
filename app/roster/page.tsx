"use client";

import { useState, useRef } from "react";
import {
  getPlayers,
  savePlayers,
  addPlayer,
  updatePlayer,
  deletePlayer,
  parseExcelData,
  type PlayerRecord,
} from "@/lib/roster-utils";
import { ArrowLeft, Upload, Plus, X, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { MobileNav } from "@/components/MobileNav";

const POSITION_OPTIONS = [
  "门将", "中后卫", "左后卫", "右后卫", "后腰", "中前卫", "前腰",
  "左边翼卫", "右边翼卫", "中锋", "影锋", "边锋",
];

export default function RosterPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerRecord[]>(() => getPlayers());
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<PlayerRecord | null>(null);
  const [filter, setFilter] = useState<"all" | "healthy" | "minor" | "out">("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = filter === "all" ? players : players.filter((p) => p.injuryStatus === filter);

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Dynamic import xlsx
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as (string | number | null)[][];
      const parsed = parseExcelData(rows);
      if (parsed.length === 0) { alert("未识别到球员数据，请检查 Excel 格式"); return; }
      const existing = getPlayers();
      const merged = [...existing, ...parsed.map((p) => ({ ...p, id: Date.now().toString() + Math.random().toString(36).slice(2) }))];
      savePlayers(merged as PlayerRecord[]);
      setPlayers(merged as PlayerRecord[]);
      alert(`成功导入 ${parsed.length} 名球员`);
    } catch { alert("Excel 解析失败，请检查文件格式"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAdd = () => {
    const p = addPlayer({
      name: editing?.name || "", position: editing?.position || "", number: editing?.number || "",
      age: editing?.age || null, height: editing?.height || null, weight: editing?.weight || null,
      injuryStatus: editing?.injuryStatus || "healthy", injuryNote: editing?.injuryNote || "", notes: editing?.notes || "",
    });
    setPlayers(getPlayers());
    setEditing(null); setShowAdd(false);
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    updatePlayer(id, { [field]: value });
    setPlayers(getPlayers());
  };

  const handleDelete = (id: string) => { deletePlayer(id); setPlayers(getPlayers()); };

  const statusEmoji = (s: string) => s === "healthy" ? "🟢" : s === "minor" ? "🟡" : "🔴";
  const statusLabel = (s: string) => s === "healthy" ? "健康" : s === "minor" ? "轻伤" : "重伤缺阵";

  return (
    <div className="min-h-screen bg-pitch-900 p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-white font-bold text-lg">📋 球队花名册</h1>
        <span className="text-xs text-gray-500">{players.length}名球员</span>
        <div className="flex-1" />
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleExcel} className="hidden" />
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 bg-pitch-700 hover:bg-pitch-600 rounded-lg transition">
          <Upload className="w-3.5 h-3.5" />导入Excel
        </button>
        <button onClick={() => { setEditing({ id: "", name: "", position: "", number: "", age: null, height: null, weight: null, injuryStatus: "healthy", injuryNote: "", notes: "" }); setShowAdd(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-black bg-neon-pink hover:bg-neon-pink/90 rounded-lg transition font-bold">
          <Plus className="w-3.5 h-3.5" />添加球员
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "healthy", "minor", "out"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs transition ${filter === f ? "bg-neon-pink/20 text-neon-pink border border-neon-pink/40" : "bg-pitch-700 text-gray-400 hover:text-white"}`}>
            {f === "all" ? "全部" : `${statusEmoji(f)} ${statusLabel(f)}`}
          </button>
        ))}
      </div>

      {/* Player cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="bg-pitch-800 rounded-xl p-3 border border-pitch-600/50 hover:border-pitch-500 transition group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-neon-pink/20 flex items-center justify-center text-white font-bold text-sm">{p.name[0] || "?"}</div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{p.name}</p>
                <p className="text-[10px] text-gray-500">{p.position || "未设置"} {p.number && `#${p.number}`}</p>
              </div>
              <button onClick={() => { setEditing(p); setShowAdd(true); }} className="text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3 h-3" /></button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>{p.age ? `${p.age}岁` : ""} {p.height ? `${p.height}cm` : ""} {p.weight ? `${p.weight}kg` : ""}</span>
              <select value={p.injuryStatus} onChange={(e) => handleUpdate(p.id, "injuryStatus", e.target.value)}
                className="bg-pitch-700 rounded px-1 py-0.5 text-[10px] border-none outline-none">
                <option value="healthy">🟢 健康</option>
                <option value="minor">🟡 轻伤</option>
                <option value="out">🔴 缺阵</option>
              </select>
            </div>
            {p.injuryNote && <p className="text-[10px] text-yellow-500/70 mt-1 truncate">{p.injuryNote}</p>}
            <button onClick={() => handleDelete(p.id)}
              className="mt-2 w-full py-1 text-[10px] text-red-500/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition rounded hover:bg-red-500/10">
              删除
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-500 text-sm col-span-full text-center py-12">暂无球员，点击「导入Excel」或「添加球员」</p>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-card p-5 w-full max-w-sm space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-sm">{editing?.id ? "编辑球员" : "添加球员"}</h2>
              <button onClick={() => { setShowAdd(false); setEditing(null); }} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <input value={editing?.name || ""} onChange={(e) => setEditing((p) => p ? { ...p, name: e.target.value } : null)} placeholder="姓名" className="input-field text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={editing?.position || ""} onChange={(e) => setEditing((p) => p ? { ...p, position: e.target.value } : null)}
                className="bg-pitch-700 border border-pitch-600 rounded px-2 py-1.5 text-xs text-gray-300">
                <option value="">位置</option>
                {POSITION_OPTIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
              </select>
              <input value={editing?.number || ""} onChange={(e) => setEditing((p) => p ? { ...p, number: e.target.value } : null)} placeholder="号码" className="input-field text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={editing?.age || ""} onChange={(e) => setEditing((p) => p ? { ...p, age: Number(e.target.value) || null } : null)} placeholder="年龄" className="input-field text-sm" />
              <input type="number" value={editing?.height || ""} onChange={(e) => setEditing((p) => p ? { ...p, height: Number(e.target.value) || null } : null)} placeholder="身高cm" className="input-field text-sm" />
              <input type="number" value={editing?.weight || ""} onChange={(e) => setEditing((p) => p ? { ...p, weight: Number(e.target.value) || null } : null)} placeholder="体重kg" className="input-field text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">伤病状态</label>
              <select value={editing?.injuryStatus || "healthy"} onChange={(e) => setEditing((p) => p ? { ...p, injuryStatus: e.target.value as any } : null)}
                className="bg-pitch-700 border border-pitch-600 rounded px-2 py-1.5 text-xs text-gray-300 w-full">
                <option value="healthy">🟢 健康</option>
                <option value="minor">🟡 轻伤</option>
                <option value="out">🔴 重伤缺阵</option>
              </select>
            </div>
            <input value={editing?.injuryNote || ""} onChange={(e) => setEditing((p) => p ? { ...p, injuryNote: e.target.value } : null)} placeholder="伤病备注（如：右脚踝扭伤，预计2周恢复）" className="input-field text-sm" />
            <input value={editing?.notes || ""} onChange={(e) => setEditing((p) => p ? { ...p, notes: e.target.value } : null)} placeholder="备注" className="input-field text-sm" />
            <button onClick={handleAdd}
              className="w-full py-2 bg-neon-pink text-black font-bold rounded-lg text-sm flex items-center justify-center gap-1">
              <Save className="w-3.5 h-3.5" />{editing?.id ? "保存" : "添加"}
            </button>
            {editing?.id && (
              <button onClick={() => { handleDelete(editing.id); setShowAdd(false); setEditing(null); }}
                className="w-full py-2 bg-red-500/10 text-red-400 rounded-lg text-sm flex items-center justify-center gap-1">
                <Trash2 className="w-3.5 h-3.5" />删除球员
              </button>
            )}
          </div>
        </div>
      )}
      <MobileNav />
    </div>
  );
}
