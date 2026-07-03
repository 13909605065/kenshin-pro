"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Play, Pause, Square, Plus, Trash2, Download, Save,
  Clock, Users, Activity, Zap, AlertTriangle, CheckCircle2,
  History, FileText, FileSpreadsheet,
  Gauge, Timer, Droplets, Brain, X, RotateCcw,
} from "lucide-react";
import { loadPlayers, type PlayerRecord } from "@/lib/roster-utils";
import { calcTRIMP, estimateZonesFromSession, type HeartRateProfile } from "@/lib/trimp";
import { saveSessionLog } from "@/lib/training-log";
import { notifyChange, useSyncVersion } from '@/lib/data-events';
import { POSITION_LABELS } from "@/lib/constants";
import { loadGPSData, calcGPS_TRIMP, type GPSRecord } from "@/lib/gps-import";
import { parseText } from "@/lib/field-validator";

/* ───────────────────────────────────────────
   GPS 实时监控面板
   ─────────────────────────────────────────── */

function GPSLivePanel() {
  const [gpsData, setGpsData] = useState<GPSRecord[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const all = loadGPSData().filter(r => r.date === today);
    setGpsData(all);
    const timer = setInterval(() => {
      const fresh = loadGPSData().filter(r => r.date === today);
      setGpsData(fresh);
    }, 30000); // refresh every 30s
    return () => clearInterval(timer);
  }, []);

  if (gpsData.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-6">
      <div className="bg-[#0d0d0d] border border-[#992828]/20 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#222] flex items-center justify-between">
          <span className="text-sm font-bold text-[#992828] flex items-center gap-2">
            <Activity className="w-4 h-4" /> GPS 实时负荷
          </span>
          <span className="text-[10px] text-gray-500">{gpsData.length}名球员 · {today}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 p-3">
          {gpsData.map(r => {
            const { trimp, intensity } = calcGPS_TRIMP(r);
            const color = intensity === "very_high" ? "#dc2626" : intensity === "high" ? "#f97316" : intensity === "moderate" ? "#eab308" : "#22c55e";
            const label = intensity === "very_high" ? "停" : intensity === "high" ? "减量" : intensity === "moderate" ? "注意" : "OK";
            return (
              <div key={r.id} className="bg-[#111] rounded-lg p-2.5 border border-[#222]" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white truncate">{r.athlete}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: color + "20", color }}>{label}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                  <span className="text-gray-500">距离</span><span className="text-gray-300 text-right">{r.totalDistance > 0 ? (r.totalDistance/1000).toFixed(1)+"km" : "—"}</span>
                  <span className="text-gray-500">高速跑</span><span className="text-gray-300 text-right">{r.hsrDistance > 0 ? r.hsrDistance+"m" : "—"}</span>
                  <span className="text-gray-500">冲刺</span><span className="text-gray-300 text-right">{r.sprintDistance > 0 ? r.sprintDistance+"m" : "—"}</span>
                  <span className="text-gray-500">TRIMP</span><span className="text-[#992828] text-right font-bold">{trimp}</span>
                </div>
                <div className="mt-1.5 h-1 bg-[#222] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: Math.min(100, (trimp/200)*100) + "%", backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Types
   ─────────────────────────────────────────── */

interface TacticalPhase {
  id: string;
  text: string;           // free-text tactical content
  groupSize: string;      // e.g. "4v4", "8v8", "半场"
  durationMin: number;    // 每组用时
  restSec: number;        // 组间休息
  setsPlanned: number;    // planned sets
  setsCompleted: number;  // actual sets done
  intensityLabel: string; // "低" | "中" | "偏高" | "过高"
  intensityPercent: number; // estimated %HRmax
  trimpCoefficient: number;
  equivalentLoadMin: number;
  phaseTRIMP: number;
  notes: string;
  startedAt: string | null;
  endedAt: string | null;
}

interface PlayerLoad {
  playerId: string;
  name: string;
  position: string;
  cumulativeMin: number;
  dailyLoadPercent: number;
  fatigueWarning: boolean;
  injuryStatus: string;
}

interface FieldSession {
  id: string;
  date: string;
  warmupMin: number;
  phases: TacticalPhase[];
  waterBreakCount: number;
  avgTeamRPE: number;
  totalFieldTimeMin: number;
  totalTRIMP: number;
  playerLoads: PlayerLoad[];
  archived: boolean;
}

interface AIAdvisory {
  level: "low" | "ok" | "high";
  message: string;
}

/* ───────────────────────────────────────────
   Intensity Lookup Table (Routledge Ch.5 Table 5.4)
   ─────────────────────────────────────────── */

interface SSGIntensityRule {
  keywords: string[];
  formatPattern: RegExp;
  fieldSize: "small" | "medium" | "large" | "half" | "setpiece";
  hrMin: number;
  hrMax: number;
  trimpCoeff: number;
  defaultLabel: "低" | "中" | "偏高" | "过高";
}

const SSG_RULES: SSGIntensityRule[] = [
  // 4v4 small-sided games — small pitch
  {
    keywords: ["逼抢", "压迫", "pressing", "反抢", "高位"],
    formatPattern: /(\d)v\1|1v1|2v2|3v3|4v4/,
    fieldSize: "small",
    hrMin: 85, hrMax: 92,
    trimpCoeff: 1.2,
    defaultLabel: "过高",
  },
  // 4v4 technical — small pitch
  {
    keywords: ["传控", "possession", "控球", "传导", "配合"],
    formatPattern: /(\d)v\1|1v1|2v2|3v3|4v4/,
    fieldSize: "small",
    hrMin: 82, hrMax: 88,
    trimpCoeff: 1.15,
    defaultLabel: "偏高",
  },
  // 4v4 default small pitch
  {
    keywords: [],
    formatPattern: /(\d)v\1|1v1|2v2|3v3|4v4/,
    fieldSize: "small",
    hrMin: 85, hrMax: 92,
    trimpCoeff: 1.2,
    defaultLabel: "过高",
  },
  // 5v5-8v8 medium pitch
  {
    keywords: ["逼抢", "压迫", "pressing", "反击", "counter"],
    formatPattern: /5v5|6v6|7v7|8v8/,
    fieldSize: "medium",
    hrMin: 84, hrMax: 90,
    trimpCoeff: 1.05,
    defaultLabel: "偏高",
  },
  {
    keywords: ["传控", "possession", "控球", "传导"],
    formatPattern: /5v5|6v6|7v7|8v8/,
    fieldSize: "medium",
    hrMin: 82, hrMax: 88,
    trimpCoeff: 1.0,
    defaultLabel: "偏高",
  },
  {
    keywords: [],
    formatPattern: /5v5|6v6|7v7|8v8/,
    fieldSize: "medium",
    hrMin: 82, hrMax: 90,
    trimpCoeff: 1.0,
    defaultLabel: "偏高",
  },
  // 9v9-11v11 large pitch
  {
    keywords: ["逼抢", "压迫", "pressing", "反击", "counter"],
    formatPattern: /9v9|10v10|11v11/,
    fieldSize: "large",
    hrMin: 82, hrMax: 88,
    trimpCoeff: 0.9,
    defaultLabel: "偏高",
  },
  {
    keywords: ["传控", "possession", "控球"],
    formatPattern: /9v9|10v10|11v11/,
    fieldSize: "large",
    hrMin: 78, hrMax: 85,
    trimpCoeff: 0.85,
    defaultLabel: "中",
  },
  {
    keywords: [],
    formatPattern: /9v9|10v10|11v11/,
    fieldSize: "large",
    hrMin: 78, hrMax: 88,
    trimpCoeff: 0.85,
    defaultLabel: "中",
  },
  // Half-pitch tactical drill
  {
    keywords: ["半场", "half", "战术", "tactical"],
    formatPattern: /.*/,
    fieldSize: "half",
    hrMin: 75, hrMax: 85,
    trimpCoeff: 0.7,
    defaultLabel: "中",
  },
  // Set pieces
  {
    keywords: ["定位球", "set piece", "角球", "任意球", "点球"],
    formatPattern: /.*/,
    fieldSize: "setpiece",
    hrMin: 65, hrMax: 75,
    trimpCoeff: 0.5,
    defaultLabel: "低",
  },
];

// Keyword-based intensity modifiers
const INTENSITY_KEYWORDS: { words: string[]; boost: number }[] = [
  { words: ["逼抢", "压迫", "pressing", "高位", "就地反抢", "counter-press", "gegenpress"], boost: 5 },
  { words: ["反击", "counter", "快速转换", "transition", "冲刺", "sprint"], boost: 4 },
  { words: ["传控", "possession", "控球", "tiki-taka", "传导"], boost: 0 },
  { words: ["防守", "defend", "回收", "compact", "密集"], boost: -2 },
  { words: ["定位球", "set piece", "角球", "任意球"], boost: -10 },
  { words: ["恢复", "recovery", "低强度", "放松"], boost: -15 },
  { words: ["轮换", "rotation", "换人", "substitution"], boost: -3 },
];

/* ───────────────────────────────────────────
   Intensity Estimation Engine
   ─────────────────────────────────────────── */

function estimateIntensity(text: string, groupSize: string): {
  label: string;
  percent: number;
  coefficient: number;
  fieldSize: string;
} {
  const lowerText = text.toLowerCase();
  const lowerGroup = groupSize.toLowerCase();

  // Find matching SSG rule
  let matchedRule: SSGIntensityRule | null = null;

  for (const rule of SSG_RULES) {
    // Check format match first (groupSize or text)
    const formatMatch = rule.formatPattern.test(lowerGroup) || rule.formatPattern.test(lowerText);
    if (!formatMatch) continue;

    // If rule has keywords, check for keyword match
    if (rule.keywords.length > 0) {
      const hasKeyword = rule.keywords.some(kw => lowerText.includes(kw.toLowerCase()));
      if (hasKeyword) {
        matchedRule = rule;
        break;
      }
      // Continue checking — keyword-less catch-all rules come later
    } else {
      // Catch-all rule — use if no better match found
      if (!matchedRule) {
        matchedRule = rule;
      }
    }
  }

  // Fallback to half-pitch tactical drill
  if (!matchedRule) {
    matchedRule = SSG_RULES.find(r => r.fieldSize === "half")!;
  }

  // Calculate base HR%
  let hrPercent = (matchedRule.hrMin + matchedRule.hrMax) / 2;

  // Apply keyword intensity modifiers
  let keywordBoost = 0;
  for (const kw of INTENSITY_KEYWORDS) {
    if (kw.words.some(w => lowerText.includes(w.toLowerCase()))) {
      keywordBoost += kw.boost;
    }
  }
  hrPercent = Math.max(60, Math.min(95, hrPercent + keywordBoost));

  // Calculate coefficient (with keyword adjustment)
  const coeffAdjust = keywordBoost / 100;
  const coefficient = Math.round((matchedRule.trimpCoeff + coeffAdjust) * 100) / 100;

  // Determine label
  let label: string;
  if (hrPercent >= 88) label = "过高";
  else if (hrPercent >= 82) label = "偏高";
  else if (hrPercent >= 72) label = "中";
  else label = "低";

  return {
    label,
    percent: Math.round(hrPercent),
    coefficient,
    fieldSize: matchedRule.fieldSize,
  };
}

function calcPhaseTRIMP(
  hrPercent: number,
  coefficient: number,
  durationMin: number,
  restingHR: number = 60,
  maxHR: number = 200,
): number {
  const avgHR = restingHR + (maxHR - restingHR) * (hrPercent / 100);
  const profile: HeartRateProfile = { restingHR, maxHR, age: 25 };
  const zones = estimateZonesFromSession(profile, avgHR, durationMin, hrPercent >= 85 ? 4 : hrPercent >= 75 ? 3 : 2);
  const result = calcTRIMP(zones, profile, "male");
  return Math.round(result.banisterTRIMP);
}

/* ───────────────────────────────────────────
   AI Advisory Engine
   ─────────────────────────────────────────── */

function generateAdvisory(phases: TacticalPhase[]): AIAdvisory {
  if (phases.length === 0) {
    return { level: "low", message: "等待添加战术阶段..." };
  }

  const totalMin = phases.reduce((s, p) => s + p.durationMin * p.setsCompleted, 0);
  const avgIntensity = phases.reduce((s, p) => s + p.intensityPercent, 0) / phases.length;
  const avgRest = phases.reduce((s, p) => s + p.restSec, 0) / phases.length;

  if (totalMin < 15 && avgIntensity < 80) {
    return {
      level: "low",
      message: "当前强度偏低，可延长单组时间或增加压迫/反击元素",
    };
  }
  if (avgIntensity > 88 && avgRest < 60) {
    return {
      level: "high",
      message: "强度偏高，建议增加组间休息时长（≥90秒）或降低对抗强度",
    };
  }
  if (totalMin > 45 && avgIntensity > 85) {
    return {
      level: "high",
      message: "总时长偏长+强度偏高，注意疲劳累积，建议缩短单组时间",
    };
  }
  return {
    level: "ok",
    message: "强度合理，按原计划继续。注意观察球员体态和补水",
  };
}

/* ───────────────────────────────────────────
   Export utilities
   ─────────────────────────────────────────── */

function generateCSV(session: FieldSession, players: PlayerRecord[]): string {
  const lines: string[] = [];
  lines.push("KenshinPro 场地战术训练报告");
  lines.push(`日期,${session.date}`);
  lines.push(`热身时长(分钟),${session.warmupMin}`);
  lines.push(`总场地时间(分钟),${session.totalFieldTimeMin}`);
  lines.push(`补水次数,${session.waterBreakCount}`);
  lines.push(`团队平均RPE,${session.avgTeamRPE}`);
  lines.push(`总TRIMP,${session.totalTRIMP}`);
  lines.push("");
  lines.push("战术阶段明细");
  lines.push("阶段内容,分组规格,每组用时(min),组间休息(s),完成组数,强度标签,估计%HRmax,TRIMP系数,等效负荷(min),阶段TRIMP");
  for (const p of session.phases) {
    lines.push(`"${p.text}",${p.groupSize},${p.durationMin},${p.restSec},${p.setsCompleted},${p.intensityLabel},${p.intensityPercent},${p.trimpCoefficient},${p.equivalentLoadMin},${p.phaseTRIMP}`);
  }
  lines.push("");
  lines.push("球员负荷");
  lines.push("球员,位置,累计时间(min),日负荷%,疲劳警告,伤病状态");
  for (const pl of session.playerLoads) {
    lines.push(`${pl.name},${pl.position},${pl.cumulativeMin},${pl.dailyLoadPercent},${pl.fatigueWarning ? "是" : "否"},${pl.injuryStatus}`);
  }
  return lines.join("\n");
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generatePDFPrintableHTML(session: FieldSession, players: PlayerRecord[]): string {
  const phaseRows = session.phases.map(p => `
    <tr>
      <td>${escapeHtml(p.text)}</td>
      <td>${p.groupSize}</td>
      <td>${p.durationMin}</td>
      <td>${p.restSec}</td>
      <td>${p.setsCompleted}</td>
      <td>${p.intensityLabel}</td>
      <td>${p.intensityPercent}%</td>
      <td>${p.trimpCoefficient}</td>
      <td>${p.equivalentLoadMin}</td>
      <td>${p.phaseTRIMP}</td>
    </tr>`).join("");

  const playerRows = session.playerLoads.map(pl => `
    <tr>
      <td>${pl.name}</td>
      <td>${pl.position}</td>
      <td>${pl.cumulativeMin}</td>
      <td>${pl.dailyLoadPercent}%</td>
      <td>${pl.fatigueWarning ? "⚠️ 是" : "✅ 否"}</td>
      <td>${pl.injuryStatus}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>场地战术训练报告</title>
<style>
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 30px; color: #111; }
  h1 { color: #992828; font-size: 20px; margin-bottom: 4px; }
  .date { color: #888; font-size: 13px; margin-bottom: 20px; }
  .summary { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
  .summary-box { background: #f5f5f5; border-radius: 8px; padding: 10px 16px; min-width: 80px; }
  .summary-box .val { font-size: 22px; font-weight: 700; color: #992828; }
  .summary-box .lbl { font-size: 11px; color: #888; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f0f0f0; font-weight: 600; }
  h2 { font-size: 16px; color: #333; margin-top: 24px; margin-bottom: 10px; border-bottom: 2px solid #992828; padding-bottom: 4px; }
</style></head>
<body>
  <h1>KenshinPro 场地战术训练报告</h1>
  <div class="date">${session.date}</div>
  <div class="summary">
    <div class="summary-box"><div class="val">${session.warmupMin}min</div><div class="lbl">热身时长</div></div>
    <div class="summary-box"><div class="val">${session.totalFieldTimeMin}min</div><div class="lbl">总场地时间</div></div>
    <div class="summary-box"><div class="val">${session.waterBreakCount}次</div><div class="lbl">补水</div></div>
    <div class="summary-box"><div class="val">${session.avgTeamRPE}</div><div class="lbl">平均RPE</div></div>
    <div class="summary-box"><div class="val">${session.totalTRIMP}</div><div class="lbl">总TRIMP</div></div>
  </div>
  <h2>战术阶段明细</h2>
  <table><thead><tr><th>战术内容</th><th>分组</th><th>用时(min)</th><th>休息(s)</th><th>组数</th><th>强度</th><th>%HRmax</th><th>系数</th><th>等效负荷(min)</th><th>TRIMP</th></tr></thead><tbody>${phaseRows}</tbody></table>
  <h2>球员负荷</h2>
  <table><thead><tr><th>球员</th><th>位置</th><th>累计时间</th><th>日负荷%</th><th>疲劳警告</th><th>伤病</th></tr></thead><tbody>${playerRows}</tbody></table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ───────────────────────────────────────────
   Constants
   ─────────────────────────────────────────── */

const SESSION_KEY = "kenshin_field_sessions";
const HISTORY_KEY = "kenshin_field_tactical_history";
const MAX_HISTORY = 30;

function loadSessions(): FieldSession[] {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "[]"); } catch { return []; }
}

function saveSessions(sessions: FieldSession[]) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(sessions)); } catch {}
}

function loadTacticalHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

function saveTacticalHistory(texts: string[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(texts.slice(0, MAX_HISTORY))); } catch {}
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ───────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────── */

export default function FieldPage() {
  const syncVersion = useSyncVersion();
  // ── State ──
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [session, setSession] = useState<FieldSession>(() => {
    const saved = loadSessions();
    const active = saved.find(s => !s.archived);
    if (active) return active;
    return {
      id: generateId(),
      date: new Date().toISOString().slice(0, 10),
      warmupMin: 15,
      phases: [],
      waterBreakCount: 0,
      avgTeamRPE: 5,
      totalFieldTimeMin: 0,
      totalTRIMP: 0,
      playerLoads: [],
      archived: false,
    };
  });

  const [tacticalInput, setTacticalInput] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [durationMin, setDurationMin] = useState(10);
  const [restSec, setRestSec] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [tacticalHistory, setTacticalHistory] = useState<string[]>(() => loadTacticalHistory());
  const [exportOpen, setExportOpen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load players from Supabase (source of truth) ──
  useEffect(() => {
    loadPlayers().then(setPlayers);
  }, [syncVersion]);

  // ── Timer ──
  useEffect(() => {
    if (isRunning && activePhaseId) {
      timerRef.current = setInterval(() => {
        setElapsedSec(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, activePhaseId]);

  // ── Compute player loads ──
  const playerLoads = useMemo((): PlayerLoad[] => {
    const totalSessionMin = session.warmupMin +
      session.phases.reduce((s, p) => s + p.durationMin * p.setsCompleted, 0);

    return players.map(p => {
      // Estimate time per player based on participation in all phases
      const cumulativeMin = totalSessionMin;
      const maxDailyLoad = 120; // max minutes per day
      const dailyLoadPercent = Math.round((cumulativeMin / maxDailyLoad) * 100);
      const fatigueWarning = dailyLoadPercent > 80 || p.injuryStatus !== "healthy";

      return {
        playerId: p.id,
        name: p.name,
        position: POSITION_LABELS[p.position as keyof typeof POSITION_LABELS] || p.position || "—",
        cumulativeMin,
        dailyLoadPercent,
        fatigueWarning,
        injuryStatus: p.injuryStatus === "healthy" ? "健康" : p.injuryStatus === "minor" ? "轻伤" : "伤停",
      };
    });
  }, [players, session.warmupMin, session.phases]);

  // ── Compute session totals ──
  const sessionTotals = useMemo(() => {
    const fieldMin = session.phases.reduce((s, p) => s + p.durationMin * p.setsCompleted, 0);
    const totalTRIMP = session.phases.reduce((s, p) => s + p.phaseTRIMP, 0);
    const totalMin = session.warmupMin + fieldMin;
    return { fieldMin, totalTRIMP, totalMin };
  }, [session.phases, session.warmupMin]);

  // ── Advisory ──
  const advisory = useMemo(() => generateAdvisory(session.phases), [session.phases]);

  // ── Actions ──
  const addPhase = useCallback(() => {
    if (!tacticalInput.trim()) return;

    const intensity = estimateIntensity(tacticalInput, groupSize);
    const eqLoadMin = Math.round(durationMin * intensity.coefficient);
    const trimp = calcPhaseTRIMP(intensity.percent, intensity.coefficient, durationMin);

    const phase: TacticalPhase = {
      id: generateId(),
      text: tacticalInput.trim(),
      groupSize: groupSize.trim() || "—",
      durationMin,
      restSec,
      setsPlanned: 1,
      setsCompleted: 0,
      intensityLabel: intensity.label,
      intensityPercent: intensity.percent,
      trimpCoefficient: intensity.coefficient,
      equivalentLoadMin: eqLoadMin,
      phaseTRIMP: trimp,
      notes: "",
      startedAt: null,
      endedAt: null,
    };

    setSession(prev => {
      const updated = { ...prev, phases: [...prev.phases, phase] };
      saveSessions([updated]); notifyChange("field-session-updated"); notifyChange("load-data-changed");
      return updated;
    });

    // Save tactical history
    const history = loadTacticalHistory();
    if (!history.includes(tacticalInput.trim())) {
      history.unshift(tacticalInput.trim());
      saveTacticalHistory(history);
      setTacticalHistory(history);
    }

    setTacticalInput("");
  }, [tacticalInput, groupSize, durationMin, restSec]);

  const removePhase = useCallback((id: string) => {
    setSession(prev => {
      const updated = { ...prev, phases: prev.phases.filter(p => p.id !== id) };
      saveSessions([updated]); notifyChange("field-session-updated"); notifyChange("load-data-changed");
      return updated;
    });
    if (activePhaseId === id) {
      setIsRunning(false);
      setActivePhaseId(null);
    }
  }, [activePhaseId]);

  const startPhase = useCallback((id: string) => {
    setIsRunning(true);
    setActivePhaseId(id);
    setElapsedSec(0);
    setSession(prev => {
      const updated = {
        ...prev,
        phases: prev.phases.map(p =>
          p.id === id ? { ...p, startedAt: p.startedAt || new Date().toISOString() } : p
        ),
      };
      saveSessions([updated]); notifyChange("field-session-updated"); notifyChange("load-data-changed");
      return updated;
    });
  }, []);

  const completeSet = useCallback(() => {
    if (!activePhaseId) return;
    setSession(prev => {
      const updated = {
        ...prev,
        phases: prev.phases.map(p =>
          p.id === activePhaseId
            ? { ...p, setsCompleted: p.setsCompleted + 1, endedAt: new Date().toISOString() }
            : p
        ),
      };
      saveSessions([updated]); notifyChange("field-session-updated"); notifyChange("load-data-changed");
      return updated;
    });
    setElapsedSec(0);
  }, [activePhaseId]);

  const stopPhase = useCallback(() => {
    setIsRunning(false);
    setActivePhaseId(null);
    setElapsedSec(0);
  }, []);

  const updatePhaseField = useCallback((id: string, field: keyof TacticalPhase, value: string | number) => {
    setSession(prev => {
      const updated = {
        ...prev,
        phases: prev.phases.map(p => {
          if (p.id !== id) return p;
          const updatedPhase = { ...p, [field]: value };

          // Recalculate intensity if text or groupSize changed
          if (field === "text" || field === "groupSize") {
            const actualText = field === "text" ? String(value) : p.text;
            const actualGroup = field === "groupSize" ? String(value) : p.groupSize;

            // ── TEXT PARSING: auto-sync structured params from text ──
            if (field === "text") {
              const parsed = parseText(actualText);
              if (parsed.groupSize) updatedPhase.groupSize = parsed.groupSize;
              if (parsed.sets) updatedPhase.setsPlanned = parsed.sets;
              if (parsed.durationMin) updatedPhase.durationMin = parsed.durationMin;
              if (parsed.restSec) updatedPhase.restSec = parsed.restSec;
            }

            const intensity = estimateIntensity(actualText, actualGroup);
            updatedPhase.intensityLabel = intensity.label;
            updatedPhase.intensityPercent = intensity.percent;
            updatedPhase.trimpCoefficient = intensity.coefficient;
            updatedPhase.equivalentLoadMin = Math.round(updatedPhase.durationMin * intensity.coefficient);
            updatedPhase.phaseTRIMP = calcPhaseTRIMP(intensity.percent, intensity.coefficient, updatedPhase.durationMin);
          }

          // Recalculate load if duration changed
          if (field === "durationMin") {
            const newDur = Number(value);
            updatedPhase.equivalentLoadMin = Math.round(newDur * updatedPhase.trimpCoefficient);
            updatedPhase.phaseTRIMP = calcPhaseTRIMP(updatedPhase.intensityPercent, updatedPhase.trimpCoefficient, newDur);
          }

          return updatedPhase;
        }),
      };
      saveSessions([updated]); notifyChange("field-session-updated"); notifyChange("load-data-changed");
      return updated;
    });
  }, []);

  const archiveSession = useCallback(() => {
    setSession(prev => {
      const archived: FieldSession = {
        ...prev,
        archived: true,
        totalFieldTimeMin: sessionTotals.fieldMin,
        totalTRIMP: sessionTotals.totalTRIMP,
        playerLoads,
      };
      const sessions = loadSessions();
      const others = sessions.filter(s => s.id !== prev.id);
      saveSessions([archived, ...others]);

      // Save to training log
      saveSessionLog({
        id: archived.id,
        date: archived.date,
        planId: "field_tactical",
        scene: "场地战术训练",
        goal: `战术训练: ${archived.phases.map(p => p.text).join(" | ")}`,
        duration: archived.totalFieldTimeMin + archived.warmupMin,
        matchDay: "",
        exercises: [],
        summary: {
          totalExercises: archived.phases.length,
          completedExercises: archived.phases.reduce((s, p) => s + p.setsCompleted, 0),
          completionRate: 100,
          averageRPE: archived.avgTeamRPE,
          totalVolumeLoad: archived.totalTRIMP,
          notes: `场地战术训练 | 热身${archived.warmupMin}min | 补水${archived.waterBreakCount}次`,
        },
        createdAt: new Date().toISOString(),
      });

      // Sync load to training calendar
      try {
        const calRaw = localStorage.getItem('kenshin_warmup_calendar');
        if (calRaw) {
          const cal = JSON.parse(calRaw);
          if (!cal[archived.date]) cal[archived.date] = {};
          cal[archived.date].fieldLoad = archived.totalTRIMP;
          cal[archived.date].fieldTime = archived.totalFieldTimeMin;
          cal[archived.date].fieldPhases = archived.phases.length;
          localStorage.setItem('kenshin_warmup_calendar', JSON.stringify(cal));
        }
      } catch {}

      // 通知负荷管理页刷新
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('training-log-updated'));
      }

      return archived;
    });
  }, [sessionTotals, playerLoads]);

  const newSession = useCallback(() => {
    setIsRunning(false);
    setActivePhaseId(null);
    setElapsedSec(0);
    const s: FieldSession = {
      id: generateId(),
      date: new Date().toISOString().slice(0, 10),
      warmupMin: 15,
      phases: [],
      waterBreakCount: 0,
      avgTeamRPE: 5,
      totalFieldTimeMin: 0,
      totalTRIMP: 0,
      playerLoads: [],
      archived: false,
    };
    setSession(s);
    saveSessions([s]);
  }, []);

  const handleExportCSV = useCallback(() => {
    const csv = generateCSV({ ...session, totalFieldTimeMin: sessionTotals.fieldMin, totalTRIMP: sessionTotals.totalTRIMP, playerLoads }, players);
    downloadFile(csv, `field-session-${session.date}.csv`, "text/csv;charset=utf-8");
    setExportOpen(false);
  }, [session, sessionTotals, players, playerLoads]);

  const handleExportPDF = useCallback(() => {
    const html = generatePDFPrintableHTML(
      { ...session, totalFieldTimeMin: sessionTotals.fieldMin, totalTRIMP: sessionTotals.totalTRIMP, playerLoads },
      players,
    );
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) w.onload = () => w.print();
    setExportOpen(false);
  }, [session, sessionTotals, players, playerLoads]);

  const addWaterBreak = useCallback(() => {
    setSession(prev => {
      const updated = { ...prev, waterBreakCount: prev.waterBreakCount + 1 };
      saveSessions([updated]); notifyChange("field-session-updated"); notifyChange("load-data-changed");
      return updated;
    });
  }, []);

  // ── Format elapsed time ──
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── Intensity color ──
  const intensityColor = (label: string) => {
    switch (label) {
      case "过高": return "text-red-400 bg-red-400/10";
      case "偏高": return "text-orange-400 bg-orange-400/10";
      case "中": return "text-yellow-400 bg-yellow-400/10";
      case "低": return "text-green-400 bg-green-400/10";
      default: return "text-gray-400 bg-gray-400/10";
    }
  };

  const advisoryColor = (level: string) => {
    switch (level) {
      case "high": return "border-red-400/30 bg-red-400/5 text-red-300";
      case "low": return "border-yellow-400/30 bg-yellow-400/5 text-yellow-300";
      case "ok": return "border-green-400/30 bg-green-400/5 text-green-300";
      default: return "border-gray-400/30 bg-gray-400/5 text-gray-300";
    }
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-[#121212] text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#121212]/90 backdrop-blur border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-gray-400 hover:text-white transition-colors text-sm touch-target flex items-center gap-1">← 返回</a>
            <a href="/" className="text-[#992828] font-black text-lg">KENSHIN</a>
            <span className="text-gray-500 text-sm">|</span>
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#992828]" />
              场地战术训练监控
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addWaterBreak}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 transition"
              title="记录补水"
            >
              <Droplets className="w-3.5 h-3.5" />
              补水 ({session.waterBreakCount})
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e1e1e] text-gray-300 hover:bg-[#2a2a2a] transition"
            >
              <History className="w-3.5 h-3.5" />
              历史
            </button>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e1e1e] text-gray-300 hover:bg-[#2a2a2a] transition"
            >
              <Download className="w-3.5 h-3.5" />
              导出
            </button>
          </div>
        </div>
      </header>

      {/* Export dropdown */}
      {exportOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setExportOpen(false)}>
          <div className="absolute top-14 right-4 mt-2 w-48 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-xl p-2"
            onClick={e => e.stopPropagation()}>
            <button onClick={handleExportCSV} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-[#2a2a2a] transition">
              <FileSpreadsheet className="w-4 h-4 text-green-400" /> 导出 Excel (CSV)
            </button>
            <button onClick={handleExportPDF} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-[#2a2a2a] transition">
              <FileText className="w-4 h-4 text-[#992828]" /> 导出 PDF (打印)
            </button>
          </div>
        </div>
      )}

      {/* History dropdown */}
      {showHistory && (
        <div className="fixed inset-0 z-50" onClick={() => setShowHistory(false)}>
          <div className="absolute top-14 right-20 mt-2 w-72 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-xl p-3 max-h-80 overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            
            {tacticalHistory.length === 0 && (
              <p className="text-xs text-gray-500 py-4 text-center">暂无历史记录</p>
            )}
            {tacticalHistory.map((text, i) => (
              <button
                key={i}
                onClick={() => { setTacticalInput(text); setShowHistory(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#2a2a2a] transition truncate"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-24">
        {/* ═══════════════════════════════════════
            GLOBAL MONITOR BAR
            ═══════════════════════════════════════ */}
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#992828]/10 flex items-center justify-center shrink-0">
                <Gauge className="w-5 h-5 text-[#992828]" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-white">
                  {sessionTotals.totalMin}<span className="text-sm font-normal text-gray-400 ml-0.5">min</span>
                </p>
              </div>
            </div>

            <div className="flex-1 min-w-[120px] text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">热身</p>
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number"
                  value={session.warmupMin}
                  onChange={e => {
                    const v = Math.max(0, parseInt(e.target.value) || 0);
                    setSession(prev => { const updated = { ...prev, warmupMin: v }; saveSessions([updated]); notifyChange("field-session-updated"); notifyChange("load-data-changed"); return updated; });
                  }}
                  className="w-12 text-center bg-transparent border-b border-[#333] text-sm text-white focus:border-[#992828] outline-none"
                  min={0}
                />
                <span className="text-xs text-gray-500">min</span>
              </div>
            </div>

            <div className="flex-1 min-w-[120px] text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">场地</p>
              <p className="text-lg font-bold text-white">
                {sessionTotals.fieldMin}<span className="text-sm font-normal text-gray-400 ml-0.5">min</span>
              </p>
            </div>

            <div className="flex-1 min-w-[120px] text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">补水</p>
              <p className="text-lg font-bold text-white">
                {session.waterBreakCount}<span className="text-sm font-normal text-gray-400 ml-0.5">次</span>
              </p>
            </div>

            <div className="flex-1 min-w-[120px] text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">团队RPE</p>
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => {
                      setSession(prev => { const updated = { ...prev, avgTeamRPE: n }; saveSessions([updated]); notifyChange("field-session-updated"); notifyChange("load-data-changed"); return updated; });
                    }}
                    className={`w-5 h-5 rounded text-[9px] font-medium transition ${
                      n <= session.avgTeamRPE
                        ? "bg-[#992828] text-white"
                        : "bg-[#222] text-gray-500 hover:bg-[#333]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center">
              
              <p className="text-lg font-bold text-[#992828]">{sessionTotals.totalTRIMP}</p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            TACTICAL INPUT
            ═══════════════════════════════════════ */}
        <div className="glass-card p-4 mb-4">
          <div className="flex flex-col gap-3">
            
            <div className="relative">
              <input
                type="text"
                value={tacticalInput}
                onChange={e => setTacticalInput(e.target.value)}
                placeholder='例如: "半场4v4高位压迫+就地反抢，无限制轮换"'
                className="w-full px-4 py-3 bg-[#121212] border border-[#222] rounded-xl text-white placeholder-gray-600 focus:border-[#992828] focus:outline-none transition text-sm"
              />
              {tacticalInput && (
                <button
                  onClick={() => setTacticalInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Intensity live preview */}
            {tacticalInput.trim() && (
              <div className="flex items-center gap-3 px-3 py-2 bg-[#121212] rounded-lg">
                <Brain className="w-4 h-4 text-purple-400 shrink-0" />
                
                {(() => {
                  const preview = estimateIntensity(tacticalInput, groupSize);
                  return (
                    <>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${intensityColor(preview.label)}`}>
                        {preview.label}
                      </span>
                      <span className="text-xs text-gray-500">{preview.percent}%HRmax</span>
                      <span className="text-xs text-gray-600">系数 {preview.coefficient}</span>
                      <span className="text-xs text-gray-600">场地: {preview.fieldSize}</span>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Parameters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <input
                  type="number"
                  value={durationMin}
                  onChange={e => setDurationMin(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 px-2 py-1.5 bg-[#121212] border border-[#222] rounded-lg text-xs text-white text-center focus:border-[#992828] outline-none"
                  min={1}
                />
                <span className="text-xs text-gray-500">min/组</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-gray-500" />
                <input
                  type="number"
                  value={restSec}
                  onChange={e => setRestSec(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 px-2 py-1.5 bg-[#121212] border border-[#222] rounded-lg text-xs text-white text-center focus:border-[#992828] outline-none"
                  min={0}
                />
                <span className="text-xs text-gray-500">s休息</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={groupSize}
                  onChange={e => setGroupSize(e.target.value)}
                  placeholder='分组 (如 "4v4" "半场")'
                  className="w-32 px-2 py-1.5 bg-[#121212] border border-[#222] rounded-lg text-xs text-white placeholder-gray-600 focus:border-[#992828] outline-none"
                />
              </div>

              <button
                onClick={addPhase}
                disabled={!tacticalInput.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#992828] text-white rounded-lg text-sm font-bold hover:bg-[#c41f1f] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Plus className="w-4 h-4" /> 确认添加
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            ACTIVE PHASE TIMER
            ═══════════════════════════════════════ */}
        {activePhaseId && (
          <div className="glass-card p-4 mb-4 border-[#992828]/30">
            {(() => {
              const active = session.phases.find(p => p.id === activePhaseId);
              if (!active) return null;
              const remainingSec = Math.max(0, active.durationMin * 60 - elapsedSec);
              const isComplete = remainingSec <= 0;
              return (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">正在执行</p>
                    <p className="text-sm font-bold text-white truncate max-w-md">{active.text}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className={`text-3xl font-mono font-bold ${isComplete ? "text-green-400" : "text-[#992828]"}`}>
                        {formatTime(isComplete ? 0 : remainingSec)}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        完成 {active.setsCompleted}/{active.setsPlanned} 组
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <button
                          onClick={completeSet}
                          className="flex items-center gap-1 px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm font-bold hover:bg-green-500/30 transition"
                        >
                          <CheckCircle2 className="w-4 h-4" /> 记录完成
                        </button>
                      ) : (
                        <button
                          onClick={completeSet}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#992828]/10 border border-[#992828]/30 text-[#992828] rounded-lg text-xs font-bold hover:bg-[#992828]/20 transition"
                        >
                          提前结束本组
                        </button>
                      )}
                      <button
                        onClick={stopPhase}
                        className="p-2 text-gray-400 hover:text-white transition"
                      >
                        <Square className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ═══════════════════════════════════════
            PHASE LIST
            ═══════════════════════════════════════ */}
        <div className="glass-card p-4 mb-4">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#992828]" />
            训练阶段 ({session.phases.length})
          </h2>

          {session.phases.length === 0 && (
            <div className="py-8 text-center">
              <Activity className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">暂无战术阶段</p>
              <p className="text-xs text-gray-600 mt-1">在上方输入战术内容并点&quot;确认添加&quot;</p>
            </div>
          )}

          <div className="space-y-2">
            {session.phases.map((phase) => {
              const isActive = activePhaseId === phase.id;
              return (
                <div
                  key={phase.id}
                  className={`p-3 rounded-xl border transition ${
                    isActive
                      ? "border-[#992828]/50 bg-[#992828]/5"
                      : "border-[#222] bg-[#121212] hover:border-[#333]"
                  }`}
                >
                  {/* Top row: text + actions */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={phase.text}
                        onChange={e => updatePhaseField(phase.id, "text", e.target.value)}
                        className="w-full bg-transparent text-sm font-medium text-white outline-none border-b border-transparent hover:border-[#333] focus:border-[#992828] transition"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isActive ? (
                        <button
                          onClick={() => startPhase(phase.id)}
                          className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition"
                          title="开始本阶段"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={stopPhase}
                          className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition"
                          title="停止"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => removePhase(phase.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-[#992828] hover:bg-[#992828]/10 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="flex items-center gap-2 flex-wrap text-[10px]">
                    {/* Group size */}
                    <input
                      type="text"
                      value={phase.groupSize}
                      onChange={e => updatePhaseField(phase.id, "groupSize", e.target.value)}
                      className="w-16 px-1.5 py-0.5 bg-[#1e1e1e] border border-[#222] rounded text-center text-white outline-none focus:border-[#992828]"
                      placeholder="分组"
                    />

                    {/* Duration */}
                    <span className="text-gray-500 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      <input
                        type="number"
                        value={phase.durationMin}
                        onChange={e => updatePhaseField(phase.id, "durationMin", parseInt(e.target.value) || 1)}
                        className="w-10 bg-transparent border-b border-[#333] text-white text-center outline-none focus:border-[#992828]"
                        min={1}
                      />
                      min/组
                    </span>

                    {/* Rest */}
                    <span className="text-gray-500 flex items-center gap-0.5">
                      <Timer className="w-3 h-3" />
                      <input
                        type="number"
                        value={phase.restSec}
                        onChange={e => updatePhaseField(phase.id, "restSec", parseInt(e.target.value) || 0)}
                        className="w-10 bg-transparent border-b border-[#333] text-white text-center outline-none focus:border-[#992828]"
                        min={0}
                      />
                      s休息
                    </span>

                    {/* Sets completed */}
                    <span className="text-gray-500">
                      完成 <span className="text-white font-bold">{phase.setsCompleted}</span> 组
                    </span>

                    {/* Intensity badge */}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${intensityColor(phase.intensityLabel)}`}>
                      {phase.intensityLabel} {phase.intensityPercent}%
                    </span>

                    {/* Coefficient */}
                    <span className="text-gray-600">系数{phase.trimpCoefficient}</span>

                    {/* Equivalent load */}
                    <span className="text-gray-500">
                      等效 <span className="text-white font-bold">{phase.equivalentLoadMin}</span>min
                    </span>

                    {/* TRIMP */}
                    <span className="text-[#992828] font-bold">
                      TRIMP {phase.phaseTRIMP}
                    </span>
                  </div>

                  {/* AI advisory line */}
                  <div className="mt-1.5 pt-1.5 border-t border-[#1a1a1a]">
                    <span className="text-[9px] text-gray-500">AI评估强度：</span>
                    <span className={`text-[9px] font-medium ${phase.trimpCoefficient > 1.1 ? 'text-red-400' : phase.trimpCoefficient > 0.9 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {phase.intensityLabel}
                    </span>
                    <span className="text-[9px] text-gray-600 ml-1">｜系数{phase.trimpCoefficient}</span>
                    <span className="text-[9px] text-gray-500 ml-2">
                      {phase.trimpCoefficient > 1.1 ? '⚠ 强度偏高，建议增加休息' : phase.trimpCoefficient > 0.9 ? '强度合理' : '💡 可适当增加单组时间'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════
            PLAYER LOAD TABLE
            ═══════════════════════════════════════ */}
        <div className="glass-card p-4 mb-4">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#992828]" />
            球员负荷 ({players.length}人)
          </h2>

          {players.length === 0 && (
            <div className="py-8 text-center">
              <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">暂无球员数据</p>
              <p className="text-xs text-gray-600 mt-1">请先在花名册中导入球员</p>
            </div>
          )}

          {players.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#222]">
                    <th className="text-left py-2 text-gray-500 font-medium">球员</th>
                    <th className="text-left py-2 text-gray-500 font-medium">位置</th>
                    <th className="text-right py-2 text-gray-500 font-medium">累计(min)</th>
                    <th className="text-right py-2 text-gray-500 font-medium">日负荷%</th>
                    <th className="text-center py-2 text-gray-500 font-medium">状态</th>
                    <th className="text-center py-2 text-gray-500 font-medium">伤病</th>
                  </tr>
                </thead>
                <tbody>
                  {playerLoads.map(pl => (
                    <tr key={pl.playerId} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition">
                      <td className="py-2 text-white font-medium">{pl.name}</td>
                      <td className="py-2 text-gray-400">{pl.position}</td>
                      <td className="py-2 text-right text-white">{pl.cumulativeMin}</td>
                      <td className="py-2 text-right">
                        <span className={`font-bold ${
                          pl.dailyLoadPercent > 80 ? "text-red-400" :
                          pl.dailyLoadPercent > 60 ? "text-yellow-400" :
                          "text-green-400"
                        }`}>
                          {pl.dailyLoadPercent}%
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        {pl.fatigueWarning ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-400/10 text-red-400 text-[10px]">
                            <AlertTriangle className="w-3 h-3" /> 疲劳警告
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-400/10 text-green-400 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> 正常
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-center text-gray-400">{pl.injuryStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════
            AI ADVISORY
            ═══════════════════════════════════════ */}
        <div className={`glass-card p-4 mb-4 border ${advisoryColor(advisory.level)}`}>
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold mb-0.5">AI 强度建议（仅供参考）</p>
              <p className="text-sm">{advisory.message}</p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            SESSION ACTIONS
            ═══════════════════════════════════════ */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={archiveSession}
            disabled={session.phases.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#992828] text-white rounded-xl text-sm font-bold hover:bg-[#c41f1f] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Save className="w-4 h-4" />
            结束训练并归档
          </button>

          <button
            onClick={newSession}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1e1e1e] text-gray-300 border border-[#222] rounded-xl text-sm font-medium hover:bg-[#2a2a2a] transition"
          >
            <RotateCcw className="w-4 h-4" />
            新训练课
          </button>

          {session.archived && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              已归档 {session.date}
            </span>
          )}
        </div>

        {/* ═══════════════════════════════════════
            ARCHIVED SESSIONS LIST
            ═══════════════════════════════════════ */}
        {(() => {
          const archived = loadSessions().filter(s => s.archived);
          if (archived.length === 0) return null;
          return (
            <div className="mt-8">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" />
                已归档训练 ({archived.length})
              </h2>
              <div className="space-y-2">
                {archived.slice(0, 10).map(s => (
                  <div key={s.id} className="glass-card p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{s.date}</p>
                      <p className="text-xs text-gray-500">
                        热身{s.warmupMin}min | 场地{s.totalFieldTimeMin}min |
                        {s.phases.length}阶段 | TRIMP {s.totalTRIMP} |
                        补水{s.waterBreakCount}次 | RPE {s.avgTeamRPE}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const csv = generateCSV(s, players);
                        downloadFile(csv, `field-session-${s.date}.csv`, "text/csv;charset=utf-8");
                      }}
                      className="text-xs text-gray-400 hover:text-white transition flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      {/* ═══ GPS 实时负荷监控 ═══ */}
      <GPSLivePanel />
      </main>
    </div>
  );
}
