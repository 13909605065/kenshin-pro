"use client";

import { useState, useRef, useEffect } from "react";
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
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  useEffect(() => {
    setPlayers(getPlayers());
  }, []);

  const refreshPlayers = () => { setPlayers(getPlayers()); };
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<PlayerRecord | null>(null);
  const [filter, setFilter] = useState<"all" | "healthy" | "minor" | "out">("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    rawRows: (string | number | null)[][];
    parsed: Omit<PlayerRecord, "id">[];
    fileName: string;
  } | null>(null);

  const filtered = filter === "all" ? players : players.filter((p) => p.injuryStatus === filter);

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as (string | number | null)[][];
      const parsed = parseExcelData(rows);
      if (parsed.length === 0) { alert("未识别到球员数据，请检查 Excel 格式"); return; }
      setPreview({ rawRows: rows, parsed, fileName: file.name });
    } catch { alert("Excel 解析失败，请检查文件格式"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleConfirmImport = () => {
    if (!preview) return;
    const existing = getPlayers();
    const merged = [...existing, ...preview.parsed.map((p) => ({ ...p, id: (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2)) }))];
    savePlayers(merged as PlayerRecord[]);
    setPlayers(merged as PlayerRecord[]);
    alert(`成功导入 ${preview.parsed.length} 名球员`);
    setPreview(null);
  };

  const handleCancelImport = () => {
    setPreview(null);
  };

  const handleAdd = () => {
    addPlayer({
      name: editing?.name || "", position: editing?.position || "", number: editing?.number || "",
      age: editing?.age || null, height: editing?.height || null, weight: editing?.weight || null,
      injuryStatus: editing?.injuryStatus || "healthy", injuryNote: editing?.injuryNote || "", notes: editing?.notes || "",
    });
    refreshPlayers();
    setEditing(null); setShowAdd(false);
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    updatePlayer(id, { [field]: value });
    refreshPlayers();
  };

  const handleDelete = (id: string) => { deletePlayer(id); refreshPlayers(); };

  const statusEmoji = (s: string) => s === "healthy" ? "🟢" : s === "minor" ? "🟡" : "🔴";
  const statusLabel = (s: string) => s === "healthy" ? "健康" : s === "minor" ? "轻伤" : "重伤缺阵";

  return (
    <div className="min-h-screen bg-[#121212] p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-white font-bold text-lg">📋 球队花名册</h1>
        <span className="text-xs text-gray-500">{players.length}名球员</span>
        <div className="flex-1" />
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleExcel} className="hidden" />
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 bg-[#1e1e1e] hover:bg-[#222] rounded-lg transition">
          <Upload className="w-3.5 h-3.5" />导入Excel
        </button>
        <button onClick={() => { setEditing({ id: "", name: "", position: "", number: "", age: null, height: null, weight: null, injuryStatus: "healthy", injuryNote: "", notes: "" }); setShowAdd(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-black bg-[#d92525] hover:bg-[#d92525]/90 rounded-lg transition font-bold">
          <Plus className="w-3.5 h-3.5" />添加球员
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "healthy", "minor", "out"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs transition ${filter === f ? "bg-[#d92525]/20 text-[#d92525] border border-[#d92525]/40" : "bg-[#1e1e1e] text-gray-400 hover:text-white"}`}>
            {f === "all" ? "全部" : `${statusEmoji(f)} ${statusLabel(f)}`}
          </button>
        ))}
      </div>

      {/* Player cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="bg-[#1e1e1e] rounded-xl p-3 border border-[#222]/50 hover:border-[#d92525] transition group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#d92525]/20 flex items-center justify-center text-white font-bold text-sm">{p.name[0] || "?"}</div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{p.name}</p>
                <p className="text-[10px] text-gray-500">{p.position || "未设置"} {p.number && `#${p.number}`}</p>
              </div>
              <button onClick={() => { setEditing(p); setShowAdd(true); }} className="text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3 h-3" /></button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>{p.age ? `${p.age}岁` : ""} {p.height ? `${p.height}cm` : ""} {p.weight ? `${p.weight}kg` : ""}</span>
              <select value={p.injuryStatus} onChange={(e) => handleUpdate(p.id, "injuryStatus", e.target.value)}
                className="bg-[#1e1e1e] rounded px-1 py-0.5 text-[10px] border-none outline-none">
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
                className="bg-[#1e1e1e] border border-[#222] rounded px-2 py-1.5 text-xs text-gray-300">
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
                className="bg-[#1e1e1e] border border-[#222] rounded px-2 py-1.5 text-xs text-gray-300 w-full">
                <option value="healthy">🟢 健康</option>
                <option value="minor">🟡 轻伤</option>
                <option value="out">🔴 重伤缺阵</option>
              </select>
            </div>
            <input value={editing?.injuryNote || ""} onChange={(e) => setEditing((p) => p ? { ...p, injuryNote: e.target.value } : null)} placeholder="伤病备注（如：右脚踝扭伤，预计2周恢复）" className="input-field text-sm" />
            <input value={editing?.notes || ""} onChange={(e) => setEditing((p) => p ? { ...p, notes: e.target.value } : null)} placeholder="备注" className="input-field text-sm" />
            <button onClick={handleAdd}
              className="w-full py-2 bg-[#d92525] text-white font-bold rounded-lg text-sm flex items-center justify-center gap-1">
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
      {/* Preview Import Dialog */}
      {preview && (() => {
        const headers = (preview.rawRows[0] || []).map((h) => String(h || "").trim());
        const headerLower = headers.map((h) => h.toLowerCase());
        const mapping: { field: string; header: string; found: boolean }[] = [
          { field: "姓名", header: headers[headerLower.findIndex((h) => h.includes("姓名") || h.includes("name"))] || "", found: headerLower.some((h) => h.includes("姓名") || h.includes("name")) },
          { field: "位置", header: headers[headerLower.findIndex((h) => h.includes("位置") || h.includes("position"))] || "", found: headerLower.some((h) => h.includes("位置") || h.includes("position")) },
          { field: "号码", header: headers[headerLower.findIndex((h) => h.includes("号码") || h.includes("number") || h.includes("编号"))] || "", found: headerLower.some((h) => h.includes("号码") || h.includes("number") || h.includes("编号")) },
          { field: "年龄", header: headers[headerLower.findIndex((h) => h.includes("年龄") || h.includes("age"))] || "", found: headerLower.some((h) => h.includes("年龄") || h.includes("age")) },
          { field: "身高", header: headers[headerLower.findIndex((h) => h.includes("身高") || h.includes("height"))] || "", found: headerLower.some((h) => h.includes("身高") || h.includes("height")) },
          { field: "体重", header: headers[headerLower.findIndex((h) => h.includes("体重") || h.includes("weight"))] || "", found: headerLower.some((h) => h.includes("体重") || h.includes("weight")) },
          { field: "伤病", header: headers[headerLower.findIndex((h) => h.includes("伤病") || h.includes("injury"))] || "", found: headerLower.some((h) => h.includes("伤病") || h.includes("injury")) },
          { field: "备注", header: headers[headerLower.findIndex((h) => h.includes("备注") || h.includes("notes"))] || "", found: headerLower.some((h) => h.includes("备注") || h.includes("notes")) },
        ];
        const previewRows = preview.parsed.slice(0, 3);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="glass-card p-5 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-sm">预览导入数据</h2>
                <button onClick={handleCancelImport} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <p className="text-xs text-gray-400">文件：<span className="text-gray-200">{preview.fileName}</span>，共 <span className="text-[#d92525] font-bold">{preview.parsed.length}</span> 名球员</p>

              {/* Column mapping */}
              <div>
                <h3 className="text-xs text-gray-400 mb-2">列映射检测</h3>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {mapping.map((m) => (
                    <div key={m.field} className="flex items-center gap-1.5 bg-[#1e1e1e] rounded px-2 py-1">
                      <span className="text-gray-400 w-8">{m.field}</span>
                      <span className="text-gray-500">→</span>
                      <span className={m.found ? "text-green-400" : "text-red-400/60"}>{m.header || "未检测到"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div>
                <h3 className="text-xs text-gray-400 mb-2">前 {previewRows.length} 行预览</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-gray-300 border-collapse">
                    <thead>
                      <tr className="bg-[#1e1e1e] text-gray-400">
                        <th className="py-1.5 px-2 text-left rounded-l">姓名</th>
                        <th className="py-1.5 px-2 text-left">位置</th>
                        <th className="py-1.5 px-2 text-left">号码</th>
                        <th className="py-1.5 px-2 text-left">年龄</th>
                        <th className="py-1.5 px-2 text-left">身高</th>
                        <th className="py-1.5 px-2 text-left">体重</th>
                        <th className="py-1.5 px-2 text-left rounded-r">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((p, i) => (
                        <tr key={i} className="border-t border-[#1e1e1e]/50 hover:bg-[#1e1e1e]/50">
                          <td className="py-1 px-2 text-white font-medium">{p.name}</td>
                          <td className="py-1 px-2">{p.position}</td>
                          <td className="py-1 px-2">{p.number}</td>
                          <td className="py-1 px-2">{p.age ?? ""}</td>
                          <td className="py-1 px-2">{p.height ?? ""}</td>
                          <td className="py-1 px-2">{p.weight ?? ""}</td>
                          <td className="py-1 px-2 text-gray-400 max-w-[100px] truncate">{p.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={handleCancelImport}
                  className="flex-1 py-2 bg-[#1e1e1e] hover:bg-[#222] text-gray-300 rounded-lg text-sm transition">
                  取消
                </button>
                <button onClick={handleConfirmImport}
                  className="flex-1 py-2 bg-[#d92525] hover:bg-[#d92525]/90 text-black font-bold rounded-lg text-sm transition">
                  确认导入 {preview.parsed.length} 名球员
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      <MobileNav />
    </div>
  );
}
