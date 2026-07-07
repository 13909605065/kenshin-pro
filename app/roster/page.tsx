"use client";

import { useState, useRef, useEffect } from "react";
import {
  getPlayers,
  savePlayers,
  addPlayer,
  updatePlayer,
  deletePlayer,
  parseExcelData,
  type ParseResult,
  type PlayerRecord,
  getTeams,
  getActiveTeamId,
} from "@/lib/roster-utils";
import { notifyChange } from "@/lib/data-events";
import {
  setActiveTeamId,
  addTeam,
  renameTeam,
  deleteTeam,
  type Team,
} from "@/lib/roster-utils";
import {
  getFitnessProfile,
  updateFitnessProfile,
  strengthAssessment,
  speedAssessment,
  enduranceAssessment,
  positionBenchmark,
  type FitnessProfile,
} from "@/lib/fitness-store";
import { Upload, Plus, X, Save, Trash2, Activity, Zap, RefreshCw, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { MobileNav } from "@/components/MobileNav";
import { ArrowLeft } from "lucide-react";
import { calcSupplementLoad, type SupplementResult } from "@/lib/supplement-load";

const POSITION_OPTIONS = [
  "门将", "中后卫", "左后卫", "右后卫", "后腰", "中前卫", "前腰",
  "左边翼卫", "右边翼卫", "中锋", "影锋", "边锋",
];

/* ---- Fitness baselines — now using centralized lib/fitness-store.ts ---- */

/* ---- Supplement load: per-player match minutes stored locally ---- */
interface PlayerMatchEntry {
  playerId: string;
  minutes: number;
  position: string;
  date: string;
}
const SUPP_KEY = "roster_player_matches";

function getPlayerMatches(): PlayerMatchEntry[] {
  try { return JSON.parse(localStorage.getItem(SUPP_KEY) || "[]"); } catch { return []; }
}

function getLatestMatchForPlayer(playerId: string): PlayerMatchEntry | null {
  const matches = getPlayerMatches().filter((m) => m.playerId === playerId);
  if (matches.length === 0) return null;
  matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return matches[0];
}

/** Map Chinese position to English key for supplement-load */
function posToEngKey(pos: string): string {
  const m: Record<string, string> = {
    "门将": "goalkeeper", "中后卫": "defender", "左后卫": "wingback",
    "右后卫": "wingback", "后腰": "midfielder", "中前卫": "midfielder",
    "前腰": "midfielder", "左边翼卫": "wingback", "右边翼卫": "wingback",
    "中锋": "forward", "影锋": "forward", "边锋": "forward",
  };
  return m[pos] || "midfielder";
}

export default function RosterPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  useEffect(() => {
    setPlayers(getPlayers());
  }, []);

  const refreshPlayers = () => { setPlayers(getPlayers()); };
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<PlayerRecord | null>(null);
  const [filter, setFilter] = useState<"all" | "healthy" | "minor" | "out" | "u21" | "gk">("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    rawRows: (string | number | null)[][];
    parsed: ParseResult;
    fileName: string;
  } | null>(null);

  const [importToast, setImportToast] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [syncOk, setSyncOk] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Team management (lazy init to avoid SSR localStorage access)
  const [teams, setTeams] = useState<Team[]>(() => {
    if (typeof window === 'undefined') return [];
    return getTeams();
  });
  const [activeTeamId, setActiveTeam] = useState<string>(() => {
    if (typeof window === 'undefined') return '_ssr_';
    return getActiveTeamId();
  });
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [renamingTeam, setRenamingTeam] = useState<{id: string; name: string} | null>(null);

  const switchTeam = (teamId: string) => {
    setActiveTeamId(teamId);
    setActiveTeam(teamId);
    refreshPlayers();
  };

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    const team = addTeam(newTeamName.trim());
    setTeams(getTeams());
    setNewTeamName("");
    switchTeam(team.id);
  };

  const handleRenameTeam = () => {
    if (!renamingTeam || !renamingTeam.name.trim()) return;
    renameTeam(renamingTeam.id, renamingTeam.name.trim());
    setTeams(getTeams());
    setRenamingTeam(null);
  };

  const handleDeleteTeam = (teamId: string) => {
    const t = getTeams();
    if (t.length <= 1) return; // Must keep at least one team
    deleteTeam(teamId);
    setTeams(getTeams());
    if (activeTeamId === teamId) {
      const remaining = getTeams();
      const newActiveId = remaining[0]?.id || getActiveTeamId();
      setActiveTeamId(newActiveId);
      setActiveTeam(newActiveId);
    }
    refreshPlayers();
  };

  const filtered = (() => {
          if (filter === "all") return players;
          if (filter === "u21") return players.filter(p => p.age != null && p.age <= 21);
          if (filter === "gk") return players.filter(p => p.position === '门将');
          return players.filter((p) => p.injuryStatus === filter);
        })();

  // Fitness panel state — which player's fitness panel is open
  const [fitnessPanelPlayerId, setFitnessPanelPlayerId] = useState<string | null>(null);
  const [fitnessEdit, setFitnessEdit] = useState<FitnessProfile>({});

  // Supp load dialog
  const [suppDialogPlayer, setSuppDialogPlayer] = useState<PlayerRecord | null>(null);
  const [suppMinutes, setSuppMinutes] = useState<number>(0);
  const [suppResult, setSuppResult] = useState<SupplementResult | null>(null);

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as (string | number | null)[][];

      if (rows.length < 2) {
        setImportToast({type:'error',msg:`文件只有 ${rows.length} 行（需要至少表头+1行数据），请检查文件内容`});
        setTimeout(()=>setImportToast(null),6000);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      const parsed = parseExcelData(rows);

      // ALWAYS show preview so user can see what happened
      setPreview({ rawRows: rows, parsed, fileName: file.name });

      if (parsed.players.length === 0) {
        const detail = parsed.warnings.length > 0
          ? parsed.warnings.slice(0, 3).join("；")
          : `检测到 ${rows.length - 1} 行数据但无法识别球员姓名列`;
        setImportToast({type:'error',msg: `未识别到球员：${detail}`});
        setTimeout(()=>setImportToast(null),6000);
      }
    } catch (err) {
      console.error("Excel 解析异常:", err);
      setImportToast({type:'error',msg:`Excel 解析失败: ${err instanceof Error ? err.message : '未知错误'}`});
      setTimeout(()=>setImportToast(null),6000);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleConfirmImport = () => {
    if (!preview) return;
    const existing = getPlayers();
    const merged = [...existing, ...preview.parsed.players.map((p) => ({ ...p, id: (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2)) }))];
    savePlayers(merged as PlayerRecord[]);
    setPlayers(merged as PlayerRecord[]);
    setImportToast({type:'success',msg:`成功导入 ${preview.parsed.players.length} 名球员`}); setTimeout(()=>setImportToast(null),3000);
    setPreview(null);
  };

  const handleCancelImport = () => {
    setPreview(null);
  };

  const handleAdd = () => {
    addPlayer({
      name: editing?.name || "", position: editing?.position || "", number: editing?.number || "",
      age: editing?.age || null, height: editing?.height || null, weight: editing?.weight || null,
      injuryStatus: editing?.injuryStatus || "healthy", injuryNote: editing?.injuryNote || "",
      injuryHistory: editing?.injuryHistory || "", disabledExercises: editing?.disabledExercises || [],
      notes: editing?.notes || "",
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

  // Open fitness panel for a player
  const openFitnessPanel = (playerId: string) => {
    const current = getFitnessProfile(playerId);
    setFitnessEdit(current);
    setFitnessPanelPlayerId(playerId);
  };

  const saveFitness = () => {
    if (!fitnessPanelPlayerId) return;
    updateFitnessProfile(fitnessPanelPlayerId, fitnessEdit);
    setFitnessPanelPlayerId(null);
  };

  // Open supp load dialog
  const openSuppDialog = (player: PlayerRecord) => {
    const latest = getLatestMatchForPlayer(player.id);
    setSuppDialogPlayer(player);
    setSuppMinutes(latest?.minutes ?? 0);
    setSuppResult(null);
  };

  const calcSupp = () => {
    if (!suppDialogPlayer) return;
    const engPos = posToEngKey(suppDialogPlayer.position);
    const res = calcSupplementLoad({
      playerName: suppDialogPlayer.name,
      minutes: suppMinutes,
      position: engPos,
      date: new Date().toISOString().slice(0, 10),
    });
    setSuppResult(res);
    // Store the match entry
    const entries = getPlayerMatches();
    entries.push({
      playerId: suppDialogPlayer.id,
      minutes: suppMinutes,
      position: engPos,
      date: new Date().toISOString().slice(0, 10),
    });
    localStorage.setItem(SUPP_KEY, JSON.stringify(entries));
  };

  // Quick supplement indicator per player
  const getSuppIndicator = (player: PlayerRecord): { show: boolean; need: boolean; label: string } => {
    const latest = getLatestMatchForPlayer(player.id);
    if (!latest) return { show: false, need: false, label: "" };
    const engPos = posToEngKey(player.position);
    const res = calcSupplementLoad({
      playerName: player.name,
      minutes: latest.minutes,
      position: engPos,
      date: latest.date,
    });
    if (!res.needSupplement) return { show: true, need: false, label: "充足" };
    return { show: true, need: true, label: `补${res.runDistance}m` };
  };

  return (
    <div className="min-h-screen bg-[#121212] pb-20">
      <header className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-4">
          <button onClick={() => router.push("/")} className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-bold text-sm">球队花名册</span>
          <span className="text-[10px] text-gray-500">{players.length}名球员 · U21 {players.filter(p => p.age != null && p.age <= 21).length}人 · GK {players.filter(p => p.position === '门将').length}人</span>
        </div>
      </header>
      {/* Import toast */}
      {importToast && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm ${importToast.type==='success'?'bg-[#30D158]/10 border border-[#30D158]/30 text-[#30D158]':'bg-[#992828]/10 border border-[#992828]/30 text-[#992828]'}`}>
          {importToast.msg}
        </div>
      )}
      <div className="flex items-center gap-3 mb-6 px-4 max-w-5xl mx-auto mt-4">

        {/* Team selector */}
        <div className="relative">
          <select
            value={activeTeamId}
            onChange={(e) => switchTeam(e.target.value)}
            className="bg-[#1e1e1e] border border-[#333] rounded-lg px-2.5 py-1.5 text-sm text-white appearance-none cursor-pointer pr-7 focus:outline-none focus:border-[#992828]/50"
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
        </div>

        <button
          onClick={() => setShowTeamManager(true)}
          className="text-[10px] text-gray-500 hover:text-gray-300 transition"
        >
          管理
        </button>

        <span className="text-xs text-gray-400">{players.length}名球员</span>
        <button
          onClick={() => { notifyChange("roster-updated"); setSyncOk(true); setTimeout(() => setSyncOk(false), 2000); }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition border border-green-500/20"
        >
          <RefreshCw className="w-3 h-3" /> {syncOk ? '已同步 ✓' : '同步'}
        </button>
        <button
          onClick={() => {
            const rosterNames = new Set(players.map(p => p.name));
            const keys = [
              'kenshin_field_sessions', 'kenshin_fitness_tests',
              'kenshin_daily_monitoring', 'kenshin_season_calendar',
              'kenshin_warmup_calendar', 'kenshin_gym_calendar',
              'kenshin_training_logs', 'kenshin_daily_training_notes',
            ];
            let cleaned = 0;
            for (const key of keys) {
              try {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const data = JSON.parse(raw);
                if (key === 'kenshin_field_sessions') {
                  for (const s of data) {
                    if (s.playerLoads) {
                      const before = s.playerLoads.length;
                      s.playerLoads = s.playerLoads.filter((pl: any) => rosterNames.has(pl.name));
                      cleaned += before - s.playerLoads.length;
                    }
                  }
                  localStorage.setItem(key, JSON.stringify(data));
                } else if (key === 'kenshin_fitness_tests' || key === 'kenshin_daily_monitoring') {
                  const before = data.length;
                  const filtered = data.filter((d: any) => rosterNames.has(d.player || d.name));
                  cleaned += before - filtered.length;
                  localStorage.setItem(key, JSON.stringify(filtered));
                }
              } catch {}
            }
            notifyChange("roster-updated");
            setSyncOk(true); setTimeout(() => setSyncOk(false), 2000);
            setImportToast({type:'success',msg:`已清除 ${cleaned} 条孤立数据`});
            setTimeout(()=>setImportToast(null),3000);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg transition border border-orange-500/20"
        >
          <Trash2 className="w-3 h-3" /> 清脏数据
        </button>
        {selected.size > 0 && (
          <button
            onClick={() => {
              if (!confirm(`删除选中的 ${selected.size} 名球员？`)) return;
              selected.forEach(id => deletePlayer(id));
              setSelected(new Set());
              refreshPlayers();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition border border-red-500/20"
          >
            <Trash2 className="w-3 h-3" /> 删除({selected.size})
          </button>
        )}
        <button
          onClick={() => {
            const allIds = new Set(filtered.map(p => p.id));
            if (selected.size === allIds.size) setSelected(new Set());
            else setSelected(allIds);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 bg-[#1e1e1e] hover:bg-[#222] rounded-lg transition"
        >
          {selected.size === filtered.length && filtered.length > 0 ? '取消全选' : '全选'}
        </button>
        <button
          onClick={() => {
            const filteredIds = new Set(filtered.map(p => p.id));
            const next = new Set<string>();
            filteredIds.forEach(id => {
              if (!selected.has(id)) next.add(id);
            });
            setSelected(next);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 bg-[#1e1e1e] hover:bg-[#222] rounded-lg transition"
        >
          反选
        </button>
        <div className="flex-1" />
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcel} className="hidden" />
        <a href="/花名册模板.xlsx" download="花名册模板.xlsx"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 bg-[#1e1e1e] hover:bg-[#222] rounded-lg transition">
          下载模板
        </a>
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 bg-[#1e1e1e] hover:bg-[#222] rounded-lg transition">
          <Upload className="w-3.5 h-3.5" />导入Excel
        </button>
        <button onClick={async () => {
          const { utils, writeFileXLSX } = await import("xlsx");
          const data = players.map(p => ({
            "姓名": p.name, "位置": p.position, "号码": p.number,
            "年龄": p.age ?? "", "身高(cm)": p.height ?? "", "体重(kg)": p.weight ?? "",
            "伤病状态": p.injuryStatus === "healthy" ? "健康" : p.injuryStatus === "minor" ? "轻伤" : "缺阵",
            "伤病备注": p.injuryNote, "伤病史": p.injuryHistory
          }));
          const wb = utils.book_new();
          const ws = utils.json_to_sheet(data);
          utils.book_append_sheet(wb, ws, "花名册");
          writeFileXLSX(wb, `花名册_${new Date().toISOString().slice(0,10)}.xlsx`);
        }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 bg-[#1e1e1e] hover:bg-[#222] rounded-lg transition">
          <Download className="w-3.5 h-3.5" />导出Excel
        </button>
        <button onClick={() => { setEditing({ id: "", name: "", position: "", number: "", age: null, height: null, weight: null, injuryStatus: "healthy", injuryNote: "", injuryHistory: "", disabledExercises: [], notes: "" }); setShowAdd(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-black bg-[#992828] hover:bg-[#992828]/90 rounded-lg transition font-bold">
          <Plus className="w-3.5 h-3.5" />添加球员
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "healthy", "minor", "out"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs transition ${filter === f ? "bg-[#992828]/20 text-[#992828] border border-[#992828]/40" : "bg-[#1e1e1e] text-gray-400 hover:text-white"}`}>
            {f === "all" ? "全部" : `${statusEmoji(f)} ${statusLabel(f)}`}
          </button>
        ))}
        <span className="text-gray-600 mx-1">|</span>
        <button onClick={() => setFilter(filter === "u21" ? "all" : "u21" as any)}
          className={`px-3 py-1 rounded-lg text-xs transition ${filter === "u21" ? "bg-purple-500/20 text-purple-400 border border-purple-500/40" : "bg-[#1e1e1e] text-gray-400 hover:text-white"}`}>
          🌱 U21 ({players.filter(p => p.age != null && p.age <= 21).length})
        </button>
        <button onClick={() => setFilter(filter === "gk" ? "all" : "gk" as any)}
          className={`px-3 py-1 rounded-lg text-xs transition ${filter === "gk" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40" : "bg-[#1e1e1e] text-gray-400 hover:text-white"}`}>
          🧤 门将 ({players.filter(p => p.position === '门将').length})
        </button>
      </div>

      {/* Player cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map((p) => {
          const supp = getSuppIndicator(p);
          const fit = getFitnessProfile(p.id);
          const hasFitData = fit.sprint30m != null || fit.squat1RM != null || fit.verticalJump != null || fit.yoYoIR1 != null;
          return (
            <div key={p.id} className="bg-[#1e1e1e] rounded-xl border border-[#222]/50 hover:border-[#992828] transition group relative">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => {
                  const next = new Set(selected);
                  next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                  setSelected(next);
                }}
                className="absolute top-3 left-3 w-4 h-4 accent-[#992828] z-10"
              />
              {/* Top section: name + position + number */}
              <div className="p-3 pb-2 pl-8">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#992828]/20 flex items-center justify-center text-white font-bold text-sm">{p.name[0] || "?"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.position || "未设置"} {p.number && `#${p.number}`}</p>
                  </div>
                  <button onClick={() => { if (confirm(`删除 ${p.name}？`)) { deletePlayer(p.id); setSelected(s => { const n = new Set(s); n.delete(p.id); return n; }); refreshPlayers(); } }} className="text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3 h-3" /></button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>{p.age ? `${p.age}岁` : ""} {p.height ? `${p.height}cm` : ""} {p.weight ? `${p.weight}kg` : ""}</span>
                  <select value={p.injuryStatus} onChange={(e) => handleUpdate(p.id, "injuryStatus", e.target.value)}
                    className="bg-[#1e1e1e] rounded px-1 py-0.5 text-[10px] border-none outline-none">
                    <option value="healthy">🟢 健康</option>
                    <option value="minor">🟡 轻伤</option>
                    <option value="out">🔴 缺阵</option>
                  </select>
                </div>
                {p.injuryNote && <p className="text-[10px] text-yellow-500/70 mt-1 truncate">{p.injuryNote}</p>}
                {p.injuryHistory && <p className="text-[9px] text-red-500/50 mt-0.5 truncate" title={p.injuryHistory}>📋 {p.injuryHistory.slice(0, 30)}{p.injuryHistory.length > 30 ? '…' : ''}</p>}
                {p.disabledExercises?.length > 0 && <p className="text-[9px] text-orange-500/60 mt-0.5">🚫 {p.disabledExercises.slice(0, 3).join('、')}{p.disabledExercises.length > 3 ? ` +${p.disabledExercises.length - 3}` : ''}</p>}
              </div>

              {/* Action row: fitness profile + supplement load */}
              <div className="border-t border-[#222]/50 px-3 py-2 flex items-center gap-2">
                {/* 体能档案 quick-link */}
                <button
                  onClick={() => openFitnessPanel(p.id)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition ${
                    hasFitData
                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      : "bg-[#121212] text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  体能
                  {hasFitData && <span className="text-green-400">✓</span>}
                </button>

                {/* 补负荷 indicator */}
                <button
                  onClick={() => openSuppDialog(p)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition ${
                    supp.need
                      ? "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                      : supp.show
                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      : "bg-[#121212] text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  {supp.show ? supp.label : "补负荷"}
                </button>
              </div>

              {/* Fitness panel (inline expand) */}
              {fitnessPanelPlayerId === p.id && (
                <div className="border-t border-[#222]/50 px-3 py-3 bg-[#121212]/50 rounded-b-xl">
                  <p className="text-xs text-white font-medium mb-2">体能档案 {fitnessEdit.date && <span className="text-gray-500 font-normal">· {fitnessEdit.date}</span>}</p>

                  {/* Strength */}
                  <p className="text-[9px] text-gray-600 mb-1.5 mt-2">💪 力量</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: "squat1RM" as const, label: "深蹲1RM", unit: "kg" },
                      { key: "bench1RM" as const, label: "卧推1RM", unit: "kg" },
                      { key: "deadlift1RM" as const, label: "硬拉1RM", unit: "kg" },
                      { key: "powerClean1RM" as const, label: "高翻1RM", unit: "kg" },
                    ].map((m) => (
                      <div key={m.key} className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-500 w-14">{m.label}</span>
                        <input type="number" value={fitnessEdit[m.key] ?? ""}
                          onChange={(e) => setFitnessEdit(p => ({...p, [m.key]: e.target.value ? Number(e.target.value) : undefined}))}
                          placeholder="—" className="bg-[#1e1e1e] border border-[#222] rounded px-1.5 py-1 text-[10px] text-gray-300 w-14 text-center" />
                        <span className="text-[8px] text-gray-600">{m.unit}</span>
                      </div>
                    ))}
                  </div>
                  {p.weight && fitnessEdit.squat1RM && (
                    <p className="text-[9px] text-gray-500 mt-1">{strengthAssessment(fitnessEdit, p.weight)}</p>
                  )}

                  {/* Speed */}
                  <p className="text-[9px] text-gray-600 mb-1.5 mt-2">⚡ 速度</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: "sprint10m" as const, label: "10m冲刺", unit: "s" },
                      { key: "sprint30m" as const, label: "30m冲刺", unit: "s" },
                    ].map((m) => (
                      <div key={m.key} className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-500 w-14">{m.label}</span>
                        <input type="number" step="0.01" value={fitnessEdit[m.key] ?? ""}
                          onChange={(e) => setFitnessEdit(p => ({...p, [m.key]: e.target.value ? Number(e.target.value) : undefined}))}
                          placeholder="—" className="bg-[#1e1e1e] border border-[#222] rounded px-1.5 py-1 text-[10px] text-gray-300 w-14 text-center" />
                        <span className="text-[8px] text-gray-600">{m.unit}</span>
                      </div>
                    ))}
                  </div>
                  {fitnessEdit.sprint30m && <p className="text-[9px] text-gray-500 mt-1">{speedAssessment(fitnessEdit)}</p>}

                  {/* Power + Agility */}
                  <p className="text-[9px] text-gray-600 mb-1.5 mt-2">🦘 爆发/敏捷</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: "verticalJump" as const, label: "CMJ", unit: "cm" },
                      { key: "broadJump" as const, label: "立定跳远", unit: "cm" },
                      { key: "proAgility" as const, label: "5-10-5", unit: "s" },
                      { key: "nordicCurlReps" as const, label: "北欧弯举", unit: "次" },
                    ].map((m) => (
                      <div key={m.key} className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-500 w-14">{m.label}</span>
                        <input type="number" step="0.01" value={fitnessEdit[m.key] ?? ""}
                          onChange={(e) => setFitnessEdit(p => ({...p, [m.key]: e.target.value ? Number(e.target.value) : undefined}))}
                          placeholder="—" className="bg-[#1e1e1e] border border-[#222] rounded px-1.5 py-1 text-[10px] text-gray-300 w-14 text-center" />
                        <span className="text-[8px] text-gray-600">{m.unit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Endurance */}
                  <p className="text-[9px] text-gray-600 mb-1.5 mt-2">🫁 耐力</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: "yoYoIR1" as const, label: "Yo-Yo IR1", unit: "m" },
                      { key: "thirtyFifteenIFT" as const, label: "30-15IFT", unit: "km/h" },
                      { key: "bodyFat" as const, label: "体脂率", unit: "%" },
                    ].map((m) => (
                      <div key={m.key} className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-500 w-14">{m.label}</span>
                        <input type="number" step={m.key === 'bodyFat' ? 0.1 : 1} value={fitnessEdit[m.key] ?? ""}
                          onChange={(e) => setFitnessEdit(p => ({...p, [m.key]: e.target.value ? Number(e.target.value) : undefined}))}
                          placeholder="—" className="bg-[#1e1e1e] border border-[#222] rounded px-1.5 py-1 text-[10px] text-gray-300 w-14 text-center" />
                        <span className="text-[8px] text-gray-600">{m.unit}</span>
                      </div>
                    ))}
                  </div>
                  {fitnessEdit.yoYoIR1 && <p className="text-[9px] text-gray-500 mt-1">{enduranceAssessment(fitnessEdit)}</p>}

                  {/* Position benchmark */}
                  <p className="text-[8px] text-gray-600 mt-2">{positionBenchmark(p.position)}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={saveFitness}
                      className="flex-1 py-1.5 bg-[#992828] text-white rounded text-[10px] font-bold"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setFitnessPanelPlayerId(null)}
                      className="flex-1 py-1.5 bg-[#1e1e1e] text-gray-400 rounded text-[10px]"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              )}

              {/* Delete button */}
              <button onClick={() => handleDelete(p.id)}
                className="w-full py-1 text-[10px] text-red-500/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition rounded hover:bg-red-500/10">
                删除
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm col-span-full text-center py-12">暂无球员，点击「导入Excel」或「添加球员」</p>
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
              <label className="text-[10px] text-gray-400 mb-1 block">伤病状态</label>
              <select value={editing?.injuryStatus || "healthy"} onChange={(e) => setEditing((p) => p ? { ...p, injuryStatus: e.target.value as any } : null)}
                className="bg-[#1e1e1e] border border-[#222] rounded px-2 py-1.5 text-xs text-gray-300 w-full">
                <option value="healthy">🟢 健康</option>
                <option value="minor">🟡 轻伤</option>
                <option value="out">🔴 重伤缺阵</option>
              </select>
            </div>
            <input value={editing?.injuryNote || ""} onChange={(e) => setEditing((p) => p ? { ...p, injuryNote: e.target.value } : null)} placeholder="伤病备注（如：右脚踝扭伤，预计2周恢复）" className="input-field text-sm" />
            <input value={editing?.injuryHistory || ""} onChange={(e) => setEditing((p) => p ? { ...p, injuryHistory: e.target.value } : null)} placeholder="伤病史（如：2024-03 ACL重建右膝；2025-01 腹股沟拉伤）" className="input-field text-sm" />
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">禁用动作（逗号分隔，如：深蹲,硬拉,高翻）</label>
              <input
                value={editing?.disabledExercises?.join(',') || ""}
                onChange={(e) => setEditing((p) => p ? { ...p, disabledExercises: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : null)}
                placeholder="深蹲,硬拉"
                className="input-field text-sm"
              />
            </div>
            <input value={editing?.notes || ""} onChange={(e) => setEditing((p) => p ? { ...p, notes: e.target.value } : null)} placeholder="备注" className="input-field text-sm" />
            <button onClick={handleAdd}
              className="w-full py-2 bg-[#992828] text-white font-bold rounded-lg text-sm flex items-center justify-center gap-1">
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

      {/* Supplement Load Dialog */}
      {suppDialogPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-5 w-full max-w-sm space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-sm">补负荷计算 — {suppDialogPlayer.name}</h2>
              <button onClick={() => { setSuppDialogPlayer(null); setSuppResult(null); }} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-400">输入该球员最近比赛的出场时间，系统自动计算需补充的跑动负荷。</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">出场时间</span>
              <input
                type="number"
                min={0}
                max={90}
                value={suppMinutes}
                onChange={(e) => setSuppMinutes(Number(e.target.value))}
                className="bg-[#121212] border border-[#222] rounded px-2 py-1.5 text-sm text-gray-300 w-20 text-center"
              />
              <span className="text-xs text-gray-400">分钟</span>
            </div>
            <button
              onClick={calcSupp}
              className="w-full py-2 bg-[#992828] text-white font-bold rounded-lg text-sm flex items-center justify-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />计算补负荷
            </button>
            {suppResult && (
              <div className={`p-3 rounded-lg text-xs ${suppResult.needSupplement ? "bg-orange-500/10 border border-orange-500/20 text-orange-400" : "bg-green-500/10 border border-green-500/20 text-green-400"}`}>
                <p className="font-bold mb-1">{suppResult.needSupplement ? `⚠️ 需要补充 ${suppResult.runDistance}m 跑量` : "✅ 负荷充足，正常训练"}</p>
                <p className="text-gray-400">{suppResult.strategy}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Import Dialog */}
      {preview && (() => {
        // Auto-detect real header row (skip title rows like "花名册模板")
        const KW = {
          name: ["姓名","名字","球员","name","player","athlete"],
          position: ["位置","position","pos"],
          number: ["号码","编号","背号","number","jersey","num"],
          age: ["年龄","age"],
          height: ["身高","高度","height"],
          weight: ["体重","重量","weight"],
          injury: ["伤病","伤情","受伤","injury","status"],
          notes: ["备注","说明","notes","remark"],
        };
        function rowScore(r: (string|number|null)[]): number {
          let s = 0;
          for (const c of r) {
            const t = String(c||"").trim().toLowerCase();
            for (const ks of Object.values(KW)) if (ks.some(k => t.includes(k))) { s++; break; }
          }
          return s;
        }
        let hIdx = 0; let hBest = rowScore(preview.rawRows[0]||[]);
        // Also check if row 0 has only 1-2 cells filled (title row pattern)
        const row0Filled = (preview.rawRows[0]||[]).filter(c => c!=null && String(c).trim()!=='');
        const isTitleRow = row0Filled.length <= 2;
        for (let i = 1; i < Math.min(preview.rawRows.length, 5); i++) {
          const s = rowScore(preview.rawRows[i]||[]);
          if (s > hBest) { hIdx = i; hBest = s; if (s >= 3) break; }
        }

        const headers = (preview.rawRows[hIdx] || []).map((h) => String(h || "").trim());
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
        const previewRows = preview.parsed.players.slice(0, 3);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="glass-card p-5 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-sm">预览导入数据</h2>
                <button onClick={handleCancelImport} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-400">文件：<span className="text-gray-200">{preview.fileName}</span></p>
                <p className="text-xs text-gray-400">
                  {preview.rawRows.length - 1} 行数据 →
                  <span className={preview.parsed.players.length > 0 ? "text-[#30D158] font-bold ml-1" : "text-[#992828] font-bold ml-1"}>
                    {preview.parsed.players.length} 名球员
                  </span>
                </p>
              </div>

              {/* Zero players error */}
              {preview.parsed.players.length === 0 && (
                <div className="bg-[#992828]/10 border border-[#992828]/30 rounded-lg p-3">
                  <p className="text-[10px] text-[#992828] font-medium mb-1">未识别到球员数据</p>
                  <p className="text-[9px] text-gray-400 mb-2">请检查：①列名是否匹配 ②数据是否从第2行开始 ③姓名列是否有内容</p>
                  {/* Show first data row raw */}
                  {preview.rawRows.length > hIdx + 1 && (
                    <div className="bg-[#121212] rounded p-2 border border-[#222]">
                      <p className="text-[8px] text-gray-500 mb-1">第{hIdx + 2}行原始数据（共{headers.length}列）：</p>
                      <div className="flex flex-wrap gap-0.5">
                        {(preview.rawRows[hIdx + 1] || []).map((c, i) => (
                          <span key={i} className="px-1 py-0.5 bg-[#1e1e1e] rounded text-[9px] text-gray-300">
                            [{i}] {c != null && String(c).trim() !== "" ? String(c).slice(0, 12) : "(空)"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Warnings */}
              {preview.parsed.warnings.length > 0 && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-[10px] text-yellow-400 font-medium mb-1.5">⚠ 解析警告（{preview.parsed.warnings.length}条）</p>
                  <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                    {preview.parsed.warnings.slice(0, 10).map((w, i) => (
                      <li key={i} className="text-[9px] text-yellow-500/70">{w}</li>
                    ))}
                    {preview.parsed.warnings.length > 10 && (
                      <li className="text-[9px] text-gray-500">...还有 {preview.parsed.warnings.length - 10} 条警告</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Column mapping */}
              <div>
                <h3 className="text-xs text-gray-400 mb-2">列映射检测</h3>

                {/* Raw headers for comparison */}
                <div className="bg-[#121212] rounded-lg p-2.5 mb-2 border border-[#222]">
                  <p className="text-[9px] text-gray-500 mb-1.5">
                    检测到表头（第{hIdx + 1}行）
                    {isTitleRow && hIdx > 0 ? <span className="text-yellow-500 ml-1">· 已跳过标题行</span> : null}
                    ：
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {headers.map((h, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-[#1e1e1e] rounded text-[10px] text-gray-300 border border-[#333]">
                        [{i}] {h || "(空)"}
                      </span>
                    ))}
                  </div>
                  <p className="text-[8px] text-gray-600 mt-1.5">预期表头：姓名 / 位置 / 号码 / 年龄 / 身高 / 体重 / 伤病 / 备注</p>
                </div>

                <div className="grid grid-cols-2 gap-1 text-xs">
                  {mapping.map((m) => (
                    <div key={m.field} className="flex items-center gap-1.5 bg-[#1e1e1e] rounded px-2 py-1">
                      <span className="text-gray-400 w-8">{m.field}</span>
                      <span className="text-gray-400">→</span>
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
                <button
                  onClick={handleConfirmImport}
                  disabled={preview.parsed.players.length === 0}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
                    preview.parsed.players.length === 0
                      ? "bg-[#333] text-gray-500 cursor-not-allowed"
                      : "bg-[#992828] hover:bg-[#992828]/90 text-black"
                  }`}>
                  确认导入 {preview.parsed.players.length} 名球员
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Team Management Modal */}
      {showTeamManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowTeamManager(false)}>
          <div className="glass-card p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-sm">管理球队</h2>
              <button onClick={() => { setShowTeamManager(false); setRenamingTeam(null); }} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            {/* Add team */}
            <div className="flex gap-2">
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
                placeholder="新球队名称"
                className="flex-1 bg-[#121212] border border-[#222] rounded px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-600"
              />
              <button onClick={handleAddTeam} disabled={!newTeamName.trim()}
                className="px-3 py-1.5 bg-[#992828] text-white rounded text-xs font-bold disabled:opacity-40">
                新建
              </button>
            </div>

            {/* Team list */}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {teams.map(t => (
                <div key={t.id} className="flex items-center gap-2 bg-[#121212] rounded-lg px-3 py-2 border border-[#222]">
                  {renamingTeam?.id === t.id ? (
                    <>
                      <input
                        value={renamingTeam.name}
                        onChange={(e) => setRenamingTeam({ id: t.id, name: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameTeam(); if (e.key === 'Escape') setRenamingTeam(null); }}
                        className="flex-1 bg-[#1e1e1e] border border-[#333] rounded px-2 py-1 text-xs text-gray-300"
                        autoFocus
                      />
                      <button onClick={handleRenameTeam} className="text-[10px] text-[#30D158] px-1">保存</button>
                      <button onClick={() => setRenamingTeam(null)} className="text-[10px] text-gray-500 px-1">取消</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-xs text-gray-300 truncate">{t.name}</span>
                      {t.id === activeTeamId && <span className="text-[9px] text-[#992828]">当前</span>}
                      <button onClick={() => setRenamingTeam({ id: t.id, name: t.name })} className="text-[10px] text-gray-500 hover:text-gray-300">改名</button>
                      <button
                        onClick={() => handleDeleteTeam(t.id)}
                        disabled={teams.length <= 1}
                        className="text-[10px] text-red-500/60 hover:text-red-400 disabled:opacity-30"
                      >
                        删除
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
}
