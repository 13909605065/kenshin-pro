"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileNav } from "@/components/MobileNav";
import { Upload, Plus, X, Trash2, ChevronRight, Zap } from "lucide-react";
import {
  getMatches, saveMatches, addMatch, updateMatch, deleteMatch,
  importMatches, getNextMatch, type MatchRecord,
} from "@/lib/match-store";
import { daysUntilNextMatch, matchDayTrainingHint, opponentHint } from "@/lib/match-types";
import * as XLSX from "xlsx";

export default function SchedulePage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<MatchRecord | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "played">("upcoming");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMatches(getMatches()); }, []);

  const nextMatch = getNextMatch();
  const days = daysUntilNextMatch(matches);

  const filtered = filter === "all"
    ? matches
    : matches.filter(m => m.status === filter);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as Record<string, string>[];
        const created = importMatches(data);
        setMatches(getMatches());
        alert(`成功导入 ${created.length} 场比赛`);
      } catch { alert("导入失败，请检查文件格式（需包含：日期、对手、主/客 列）"); }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#333] px-4 h-14 flex items-center justify-between">
        <h1 className="text-white font-bold text-lg">赛程日历</h1>
        <button onClick={() => router.push("/")} className="text-sm text-gray-400 hover:text-white">返回</button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Next match card */}
        {nextMatch && days !== null && (
          <div className="bg-neon-pink/10 border border-neon-pink/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-neon-pink font-bold uppercase">下一场比赛</span>
              <span className="text-[10px] text-neon-pink">{matchDayTrainingHint(days)}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{days}</p>
                <p className="text-[10px] text-gray-400">天后</p>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-lg">
                  {nextMatch.location === "home" ? "主场" : "客场"} vs {nextMatch.opponent}
                </p>
                <p className="text-xs text-gray-400">{nextMatch.date} {nextMatch.time || ""} {nextMatch.venue ? "· " + nextMatch.venue : ""}</p>
                {nextMatch.opponentStyle && <p className="text-[11px] text-gray-500 mt-1">对手特点: {nextMatch.opponentStyle}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditing(null); setShowAdd(true); }}
            className="flex items-center gap-1 px-3 py-2 bg-neon-pink text-black text-xs font-bold rounded-lg">
            <Plus className="w-3.5 h-3.5" /> 添加比赛
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 px-3 py-2 bg-[#222] border border-[#444] text-gray-300 text-xs rounded-lg hover:bg-[#333]">
            <Upload className="w-3.5 h-3.5" /> 导入Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          <div className="ml-auto flex rounded-lg bg-[#111] p-0.5">
            {(["upcoming", "played", "all"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={"px-2 py-1 rounded text-[10px] font-medium " + (filter === f ? "bg-neon-pink text-black" : "text-gray-500")}>
                {f === "upcoming" ? "未赛" : f === "played" ? "已赛" : "全部"}
              </button>
            ))}
          </div>
        </div>

        {/* Match list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-gray-600 text-center py-12 text-sm">
              暂无比赛记录<br/>
              <span className="text-[10px]">导入Excel赛程表或手动添加</span>
            </p>
          ) : (
            filtered.map(m => (
              <div key={m.id}
                onClick={() => { setEditing(m); setShowAdd(true); }}
                className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4 hover:bg-[#222] transition cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={"w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold " +
                      (m.status === "played" ? "bg-gray-700 text-gray-400" : "bg-neon-pink/20 text-neon-pink")}>
                      {m.location === "home" ? "主" : "客"}
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">{m.opponent}</p>
                      <p className="text-[10px] text-gray-500">{m.date} {m.time || ""} {m.venue ? "· " + m.venue : ""} {m.league ? "· " + m.league : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.status === "upcoming" && (
                      <button onClick={(e) => { e.stopPropagation(); router.push("/?matchOpponent=" + encodeURIComponent(m.opponent) + "&matchDate=" + m.date); }}
                        className="flex items-center gap-1 px-2 py-1 bg-neon-pink/20 hover:bg-neon-pink/30 border border-neon-pink/30 rounded text-[10px] text-neon-pink transition">
                        <Zap className="w-3 h-3" /> 生成训练
                      </button>
                    )}
                    {m.status === "played" && m.result && <span className="text-[11px] text-neon-pink font-bold">{m.result}</span>}
                    {m.status === "upcoming" && !m.result && <span className="text-[10px] text-green-400">未赛</span>}
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
                {(m.opponentStyle || m.opponentWeakness) && (
                  <div className="mt-2 flex gap-2 text-[10px]">
                    {m.opponentStyle && <span className="bg-[#111] text-gray-400 px-2 py-0.5 rounded">{m.opponentStyle}</span>}
                    {m.opponentWeakness && <span className="bg-[#111] text-yellow-400 px-2 py-0.5 rounded">弱点: {m.opponentWeakness}</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      {showAdd && <MatchModal
        match={editing}
        onSave={(data) => {
          if (editing) updateMatch(editing.id, data);
          else addMatch(data as any);
          setMatches(getMatches());
          setShowAdd(false);
          setEditing(null);
        }}
        onDelete={editing ? () => { deleteMatch(editing.id); setMatches(getMatches()); setShowAdd(false); setEditing(null); } : undefined}
        onClose={() => { setShowAdd(false); setEditing(null); }}
      />}

      <MobileNav />
    </div>
  );
}

/* Modal */
function MatchModal({ match, onSave, onDelete, onClose }: {
  match: MatchRecord | null;
  onSave: (data: Partial<MatchRecord>) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    date: match?.date || "",
    time: match?.time || "",
    opponent: match?.opponent || "",
    location: match?.location || "home" as const,
    venue: match?.venue || "",
    league: match?.league || "",
    opponentStyle: match?.opponentStyle || "",
    opponentWeakness: match?.opponentWeakness || "",
    ourIssues: match?.ourIssues || "",
    notes: match?.notes || "",
    result: match?.result || "",
    status: match?.status || "upcoming" as const,
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold">{match ? "编辑比赛" : "添加比赛"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <input value={form.date} onChange={e => set("date", e.target.value)} placeholder="日期 (YYYY-MM-DD)" className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white" />
        <div className="grid grid-cols-2 gap-2">
          <input value={form.time} onChange={e => set("time", e.target.value)} placeholder="时间 (HH:MM)" className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white" />
          <select value={form.location} onChange={e => set("location", e.target.value)} className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white">
            <option value="home">主场</option>
            <option value="away">客场</option>
          </select>
        </div>
        <input value={form.opponent} onChange={e => set("opponent", e.target.value)} placeholder="对手队名" className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white" />
        <div className="grid grid-cols-2 gap-2">
          <input value={form.venue} onChange={e => set("venue", e.target.value)} placeholder="场地" className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white" />
          <input value={form.league} onChange={e => set("league", e.target.value)} placeholder="联赛/杯赛" className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white" />
        </div>

        <div className="border-t border-[#333] pt-2">
          <p className="text-[10px] text-gray-500 mb-2">对手分析（可选，帮助AI生成针对性训练）</p>
          <textarea value={form.opponentStyle} onChange={e => set("opponentStyle", e.target.value)} placeholder="对手特点（如：边路速度快、中场控球强）" rows={2} className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white resize-none" />
          <textarea value={form.opponentWeakness} onChange={e => set("opponentWeakness", e.target.value)} placeholder="对手弱点（如：定位球防守差、反击回不来）" rows={2} className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white resize-none mt-2" />
          <textarea value={form.ourIssues} onChange={e => set("ourIssues", e.target.value)} placeholder="我方需注意（如：最近体能下降、中场衔接问题）" rows={2} className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white resize-none mt-2" />
        </div>

        {match?.status === "played" && (
          <input value={form.result} onChange={e => set("result", e.target.value)} placeholder="比分 (如 2:1)" className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white" />
        )}

        <div className="flex items-center gap-2 pt-2">
          <button onClick={() => onSave(form)} className="flex-1 bg-neon-pink text-black font-bold py-2 rounded-lg text-sm">保存</button>
          {onDelete && (
            <button onClick={onDelete} className="px-3 py-2 bg-red-900/30 border border-red-700/50 text-red-400 rounded-lg text-sm"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      </div>
    </div>
  );
}
