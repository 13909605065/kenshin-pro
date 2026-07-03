"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, AlertTriangle, ChevronDown } from "lucide-react";
import { loadPlayers, type PlayerRecord } from "@/lib/roster-utils";
import { useSyncVersion, notifyChange } from "@/lib/data-events";
import { MobileNav } from "@/components/MobileNav";

// ═══════════════════════════════════════════════
// Types — matching 山西 02_每日监控.xlsx
// ═══════════════════════════════════════════════

interface DailyEntry {
  id: string;
  date: string;
  player: string;
  position: string;
  sleep: number;    // 1-5
  fatigue: number;   // 1-5
  soreness: number;  // 1-5
  stress: number;    // 1-5
  mood: number;      // 1-5
  sessionType: "训练" | "比赛" | "";
  rpe: number;       // 0-10, only if sessionType != ""
  duration: number;  // min
  cmj: number;       // cm, optional
  recovery: string;  // recovery intervention
  notes: string;
  createdAt: string;
}

const STORAGE_KEY = "kenshin_daily_monitoring";

function loadEntries(): DailyEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveEntries(entries: DailyEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function healthTotal(e: Pick<DailyEntry, "sleep"|"fatigue"|"soreness"|"stress"|"mood">) {
  return e.sleep + e.fatigue + e.soreness + e.stress + e.mood;
}
function srpeCalc(rpe: number, duration: number) {
  return Math.round(rpe * duration);
}

// ═══════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════

export default function StatusPage() {
  const router = useRouter();
  const syncVersion = useSyncVersion();
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  useEffect(() => { loadPlayers().then(setPlayers); }, [syncVersion]);
  const today = new Date().toISOString().slice(0, 10);

  // ── State ──
  const [date, setDate] = useState(today);
  const [player, setPlayer] = useState("");
  const [sleep, setSleep] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(3);
  const [mood, setMood] = useState(3);
  const [sessionType, setSessionType] = useState<"训练" | "比赛" | "">("");
  const [rpe, setRpe] = useState(0);
  const [duration, setDuration] = useState(0);
  const [cmj, setCmj] = useState(0);
  const [recovery, setRecovery] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [playerFilter, setPlayerFilter] = useState("");
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);

  // ── Load baseline CMJ ──
  const baselineCmj = useMemo(() => {
    try {
      const raw = localStorage.getItem("kenshin_fitness_tests");
      if (!raw) return null;
      const tests = JSON.parse(raw);
      const p = players.find(p => p.name === player);
      const cmjTests = tests.filter((t: any) => t.playerName === player && t.testId === "cmj");
      if (cmjTests.length === 0) return null;
      const earliest = cmjTests.reduce((a: any, b: any) => a.date < b.date ? a : b);
      return earliest.value;
    } catch { return null; }
  }, [player, players]);

  const cmjChange = baselineCmj && cmj > 0 ? ((cmj - baselineCmj) / baselineCmj * 100) : null;

  // ── History ──
  const entries = useMemo(() => loadEntries(), [syncVersion]);
  const filteredEntries = useMemo(() => {
    let e = entries;
    if (playerFilter) e = e.filter(x => x.player === playerFilter);
    return e.slice(0, 50);
  }, [entries, playerFilter, syncVersion]);

  // ── Submit ──
  const handleSubmit = useCallback(() => {
    if (!player) return;
    const pos = players.find(p => p.name === player)?.position || "";
    const entry: DailyEntry = {
      id: "dm_" + Date.now().toString(36),
      date, player, position: pos,
      sleep, fatigue, soreness, stress, mood,
      sessionType, rpe: sessionType ? rpe : 0,
      duration: sessionType ? duration : 0,
      cmj, recovery, notes,
      createdAt: new Date().toISOString(),
    };
    const all = loadEntries();
    all.unshift(entry);
    saveEntries(all);
    notifyChange("load-data-changed");

    // Reset for next entry
    setPlayer(""); setSessionType(""); setRpe(0); setDuration(0); setCmj(0); setRecovery(""); setNotes("");
    setSleep(3); setFatigue(3); setSoreness(3); setStress(3); setMood(3);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [date, player, sleep, fatigue, soreness, stress, mood, sessionType, rpe, duration, cmj, recovery, notes, players]);

  const handleDelete = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    saveEntries(updated);
    notifyChange("load-data-changed");
  };

  const hTotal = healthTotal({ sleep, fatigue, soreness, stress, mood });
  const hWarning = hTotal > 15;

  // ═══════════════════════════════════════════════
  // UI helpers
  // ═══════════════════════════════════════════════
  const labelClass = "text-[10px] text-gray-500 font-medium mb-1 block";
  const scoreBtn = (val: number, current: number, setter: (v: number) => void) => (
    <button
      onClick={() => setter(val)}
      className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
        current === val ? "bg-[#992828] text-white" : "bg-[#1a1a1a] text-gray-400 border border-[#333] hover:border-[#555]"
      }`}
    >{val}</button>
  );

  return (
    <div className="min-h-screen bg-[#121212] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur border-b border-[#222]">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-3">
          <button onClick={() => router.push("/")} className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-white">状态录入</h1>
          <span className="text-[10px] text-gray-600 hidden sm:inline">晨间健康 + sRPE + CMJ</span>
          <div className="flex-1" />
          <button onClick={() => setShowHistory(!showHistory)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition ${showHistory ? "bg-[#992828] text-white" : "text-gray-400 hover:text-white"}`}>
            {showHistory ? "返回录入" : "历史记录"}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4">

        {saved && (
          <div className="mb-3 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400">
            ✅ 已保存
          </div>
        )}

        {showHistory ? (
          /* ═════════════════════════════════════════
             HISTORY VIEW
             ═════════════════════════════════════════ */
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <select value={playerFilter} onChange={e => setPlayerFilter(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-gray-300">
                <option value="">全部球员</option>
                {players.map(p => <option key={p.id||p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            {filteredEntries.length === 0 ? (
              <p className="text-xs text-gray-600 py-8 text-center">暂无记录</p>
            ) : (
              filteredEntries.map(e => (
                <div key={e.id} className="p-3 rounded-lg bg-[#0d0d0d] border border-[#222] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{e.player}</span>
                    <span className="text-gray-500">{e.date}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-gray-400">
                    <span>😴{e.sleep}</span><span>😫{e.fatigue}</span><span>💪{e.soreness}</span><span>😰{e.stress}</span><span>😊{e.mood}</span>
                    <span className="text-gray-600">|</span>
                    <span className={healthTotal(e) > 15 ? "text-[#992828] font-bold" : "text-gray-400"}>
                      总分{healthTotal(e)}
                    </span>
                    {e.sessionType && (
                      <>
                        <span className="text-gray-600">|</span>
                        <span>{e.sessionType} RPE{e.rpe} {e.duration}min sRPE{srpeCalc(e.rpe, e.duration)}</span>
                      </>
                    )}
                    {e.cmj > 0 && <span className="text-gray-500">| CMJ{e.cmj}cm</span>}
                  </div>
                  {e.recovery && <p className="text-[10px] text-blue-400 mt-1">🩹 {e.recovery}</p>}
                  {e.notes && <p className="text-[10px] text-gray-500 mt-1">{e.notes}</p>}
                  <button onClick={() => handleDelete(e.id)} className="mt-1 text-[9px] text-red-400/60 hover:text-red-400">删除</button>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ═════════════════════════════════════════
             INPUT FORM
             ═════════════════════════════════════════ */
          <div className="space-y-4">
            {/* Date + Player */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>日期</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              </div>
              <div className="relative">
                <label className={labelClass}>球员</label>
                <button onClick={() => setShowPlayerPicker(!showPlayerPicker)}
                  className="w-full flex items-center justify-between bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white">
                  {player || <span className="text-gray-500">选择球员</span>}
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </button>
                {showPlayerPicker && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[#1a1a1a] border border-[#333] rounded-lg max-h-40 overflow-y-auto">
                    {players.map(p => (
                      <button key={p.id||p.name} onClick={() => { setPlayer(p.name); setShowPlayerPicker(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#252525]">
                        {p.name} <span className="text-gray-500">{p.position}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ═══ 晨间健康 5维度 ═══ */}
            <div className="p-3 rounded-lg bg-[#0d0d0d] border border-[#222]">
              <p className="text-[10px] text-gray-500 mb-2">🌅 晨间健康问卷（1=很差 5=很好）</p>
              {[
                { label: "😴 睡眠质量", val: sleep, set: setSleep },
                { label: "😫 疲劳感", val: fatigue, set: setFatigue },
                { label: "💪 肌肉酸痛", val: soreness, set: setSoreness },
                { label: "😰 心理压力", val: stress, set: setStress },
                { label: "😊 情绪状态", val: mood, set: setMood },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between mb-2 last:mb-0">
                  <span className="text-xs text-gray-400 w-24">{item.label}</span>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(v => scoreBtn(v, item.val, item.set))}
                  </div>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-[#222] flex items-center gap-2">
                <span className="text-[10px] text-gray-500">健康总分</span>
                <span className={`text-sm font-bold ${hWarning ? "text-[#992828]" : "text-green-400"}`}>{hTotal}/25</span>
                {hWarning && <AlertTriangle className="w-3.5 h-3.5 text-[#992828]" />}
                {hWarning && <span className="text-[10px] text-[#992828]">恢复不足，建议降低负荷</span>}
              </div>
            </div>

            {/* ═══ sRPE ═══ */}
            <div className="p-3 rounded-lg bg-[#0d0d0d] border border-[#222]">
              <p className="text-[10px] text-gray-500 mb-2">📊 训练/比赛负荷</p>
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setSessionType("训练")}
                  className={`px-3 py-1 rounded text-[10px] font-medium ${sessionType === "训练" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-[#1a1a1a] text-gray-400 border border-[#333]"}`}>训练</button>
                <button onClick={() => setSessionType("比赛")}
                  className={`px-3 py-1 rounded text-[10px] font-medium ${sessionType === "比赛" ? "bg-[#992828]/20 text-[#992828] border border-[#992828]/30" : "bg-[#1a1a1a] text-gray-400 border border-[#333]"}`}>比赛</button>
                {sessionType && <button onClick={() => setSessionType("")} className="text-[10px] text-gray-500 hover:text-white">清除</button>}
              </div>
              {sessionType && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>RPE (0-10)</label>
                    <div className="flex gap-1 flex-wrap">
                      {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
                        <button key={v} onClick={() => setRpe(v)}
                          className={`w-7 h-7 rounded text-[10px] font-bold ${rpe === v ? "bg-[#992828] text-white" : "bg-[#1a1a1a] text-gray-400 border border-[#333]"}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>时长 (min)</label>
                    <input type="number" value={duration || ""} onChange={e => setDuration(Number(e.target.value))}
                      placeholder="分钟" min={0} max={180}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
                  </div>
                  {rpe > 0 && duration > 0 && (
                    <div className="col-span-2 text-xs">
                      <span className="text-gray-500">sRPE负荷 = </span>
                      <span className="text-white font-bold">{srpeCalc(rpe, duration)}</span>
                      <span className="text-[10px] text-gray-600"> ({rpe} × {duration}min)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═══ CMJ ═══ */}
            <div className="p-3 rounded-lg bg-[#0d0d0d] border border-[#222]">
              <p className="text-[10px] text-gray-500 mb-2">🦘 CMJ 反向纵跳 <span className="text-gray-600">（每周1次 · 比赛日和比赛+1禁测）</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>CMJ (cm)</label>
                  <input type="number" value={cmj || ""} onChange={e => setCmj(Number(e.target.value))}
                    placeholder="留空=未测" min={0} max={80}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div className="text-xs text-gray-400">
                  {baselineCmj ? (
                    <>
                      <span className="text-gray-500">基线 {baselineCmj}cm</span>
                      {cmjChange !== null && (
                        <span className={`ml-2 font-bold ${cmjChange >= 0 ? "text-green-400" : "text-[#992828]"}`}>
                          {cmjChange >= 0 ? "+" : ""}{cmjChange.toFixed(1)}%
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-600">无基线数据</span>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ Recovery / Notes ═══ */}
            <div className="p-3 rounded-lg bg-[#0d0d0d] border border-[#222]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>🩹 恢复干预（有则填）</label>
                  <input type="text" value={recovery} onChange={e => setRecovery(e.target.value)}
                    placeholder="冰敷/按摩/泡沫轴..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className={labelClass}>备注</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="其他信息..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>
            </div>

            {/* ═══ 采集节奏提示 ═══ */}
            <div className="p-2 rounded-lg bg-[#111] border border-[#333] text-[9px] text-gray-600">
              📋 采集节奏：晨间问卷仅训练日/比赛日填 · sRPE仅训练/赛后填 · CMJ每周仅1次(比赛-3训练前) · 比赛日和比赛+1禁测CMJ · 休息日不打扰球员
            </div>

            {/* Save */}
            <button onClick={handleSubmit} disabled={!player}
              className="w-full py-2.5 bg-[#992828] text-white text-sm font-bold rounded-lg hover:bg-[#b91c1c] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
              <Save className="w-4 h-4" /> 保存
            </button>
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
