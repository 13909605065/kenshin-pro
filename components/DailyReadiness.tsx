"use client";

import { useState, useEffect, useMemo } from "react";
import { Activity, Save, ChevronDown, Download, Upload, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { getPlayers } from "@/lib/roster-utils";
import {
  getCoachScores, saveCoachScores,
  getPlayerSelfReports, importSelfReportsForToday,
  checkCoachPlayerDiscrepancy,
} from "@/lib/player-status";
import { notifyChange } from "@/lib/data-events";
import { addLoadEntry } from "@/lib/acwr";
import * as XLSX from "xlsx";

// ── Types ──

export interface DailyCheckin {
  date: string;
  athleteId: string;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  sleepHours: number;
  muscleSoreness: 1 | 2 | 3 | 4 | 5;
  generalFatigue: 1 | 2 | 3 | 4 | 5;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  morningHR: number;
  bodyWeight?: number;
  readinessScore: number;
  notes?: string;
}

interface Props {
  athleteId?: string;
  onReadinessChange?: (score: number, recommendation: string) => void;
}

// ── Calculate readiness score ──

function calcReadiness(checkin: Omit<DailyCheckin, "readinessScore">): number {
  let score = 0;
  score += checkin.sleepQuality * 4;
  score += (6 - checkin.muscleSoreness) * 4;
  score += (6 - checkin.generalFatigue) * 4;
  score += (6 - checkin.stressLevel) * 4;
  const hrDiff = checkin.morningHR - 60;
  if (hrDiff <= 0) score += 5;
  else if (hrDiff <= 5) score += 0;
  else if (hrDiff <= 10) score -= 5;
  else score -= 10;
  return Math.max(0, Math.min(100, score));
}

function getRecommendation(score: number): { label: string; color: string; advice: string; intensityMod: string } {
  if (score >= 85) return {
    label: "状态极佳", color: "#22c55e",
    advice: "全力训练。可以冲击个人纪录或增加训练量。", intensityMod: "+10%"
  };
  if (score >= 70) return {
    label: "状态良好", color: "#3B82F6",
    advice: "正常训练。按原计划执行，保持质量。", intensityMod: "原计划"
  };
  if (score >= 55) return {
    label: "略有疲劳", color: "#eab308",
    advice: "降低训练量10-20%，避免新动作或极限重量。优先技术练习。", intensityMod: "-15%"
  };
  if (score >= 40) return {
    label: "明显疲劳", color: "#f97316",
    advice: "大幅减量。仅做低强度技术维持+主动恢复。取消高强度对抗。", intensityMod: "-30%"
  };
  return {
    label: "需要休息", color: "#992828",
    advice: "建议全天休息或仅做拉伸/泡沫轴。监测晨脉，明日再评。", intensityMod: "-50%或休息"
  };
}

// ═══════════════════════════════════════════════

export function DailyReadiness({ onReadinessChange }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const players = useMemo(() => getPlayers(), []);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [selfReports, setSelfReports] = useState<ReturnType<typeof getPlayerSelfReports>>([]);
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'coach' | 'compare'>('coach');

  // Load today's existing scores + self-reports
  useEffect(() => {
    setScores(getCoachScores(today));
    setSelfReports(getPlayerSelfReports(today));
    const raw = localStorage.getItem("kenshin_team_readiness");
    if (raw) {
      try {
        const all = JSON.parse(raw);
        if (all[today] && typeof all[today] === 'object' && Object.keys(all[today]).length > 0) {
          setSaved(true);
        }
      } catch {}
    }
  }, [today]);

  const quickSet = (playerId: string, score: number) => {
    setScores(prev => {
      // 点同一个分数 → 取消选择
      if (prev[playerId] === score) {
        const next = { ...prev };
        delete next[playerId];
        return next;
      }
      return { ...prev, [playerId]: score };
    });
    setSaved(false);
  };

  const getLabel = (score: number) => {
    if (score >= 85) return { text: '极佳', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' };
    if (score >= 70) return { text: '良好', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' };
    if (score >= 55) return { text: '疲劳', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' };
    if (score >= 40) return { text: '很累', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' };
    return { text: '休息', color: 'text-[#992828]', bg: 'bg-[#992828]/20 border-[#992828]/30' };
  };

  // Self-report status badge
  const selfReportBadge = (rpe: number, fatigue: number, soreness: number) => {
    const avg = (fatigue + soreness) / 2 + (rpe > 7 ? 1 : rpe > 5 ? 0.5 : 0);
    if (avg <= 2) return { text: '良好', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
    if (avg <= 3.5) return { text: '注意', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
    return { text: '疲劳', color: 'text-[#992828]', bg: 'bg-[#992828]/10 border-[#992828]/20' };
  };

  const handleSave = () => {
    try {
      saveCoachScores(scores, today);
      setSaved(true);
      const avgScore = Object.keys(scores).length > 0
        ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length)
        : null;
      onReadinessChange?.(avgScore || 50, '');
      notifyChange("load-data-changed");
    } catch {}
  };

  // ── CSV Import (coach scores) ──

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = (ev.target?.result as string).trim().split('\n');
        const newScores: Record<string, number> = {};
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          const name = cols[0]; const score = parseInt(cols[1]);
          if (!name || isNaN(score)) continue;
          const player = players.find(p => p.name === name);
          if (player) newScores[player.id] = score;
        }
        setScores(prev => ({ ...prev, ...newScores }));
        setSaved(false);
      } catch {}
    };
    reader.readAsText(file);
  };

  // ── Excel Import (player self-reports) ──

  const handleSelfReportImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    if (rows.length < 2) {
      setImportMsg({ type: 'error', text: '文件为空或只有表头' });
      setTimeout(() => setImportMsg(null), 4000);
      return;
    }

    const imported: Array<{ name: string; rpe: number; fatigue: number; soreness: number; note: string; date: string }> = [];
    const warns: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const name = String(r[0] || "").trim();
      if (!name) { warns.push(`第${i + 1}行缺少姓名，已跳过`); continue; }

      const rpe = Number(r[1]);
      const fatigue = Number(r[2]);
      const soreness = Number(r[3]);

      if (isNaN(rpe) || rpe < 1 || rpe > 10) warns.push(`${name}: RPE 应为 1-10`);
      if (isNaN(fatigue) || fatigue < 1 || fatigue > 5) warns.push(`${name}: 疲劳度应为 1-5`);
      if (isNaN(soreness) || soreness < 1 || soreness > 5) warns.push(`${name}: 酸痛应为 1-5`);

      imported.push({
        name,
        rpe: (rpe >= 1 && rpe <= 10) ? rpe : 0,
        fatigue: (fatigue >= 1 && fatigue <= 5) ? fatigue : 0,
        soreness: (soreness >= 1 && soreness <= 5) ? soreness : 0,
        note: String(r[4] || "").trim(),
        date: today,
      });
    }

    if (imported.length === 0) {
      setImportMsg({ type: 'error', text: warns[0] || '未识别到有效数据' });
      setTimeout(() => setImportMsg(null), 4000);
      return;
    }

    importSelfReportsForToday(imported);
    setSelfReports(getPlayerSelfReports(today));

    // 闭环：自评 RPE → ACWR 负荷追踪（Foster sRPE 方法）
    for (const r of imported) {
      if (r.rpe > 0) {
        addLoadEntry(r.name, { date: today, sRPE: r.rpe, duration: 90 });
      }
    }

    notifyChange("self-report-updated");
    notifyChange("load-data-changed");
    setImportMsg({ type: 'success', text: `导入 ${imported.length} 人${warns.length > 0 ? `，${warns.length} 条警告` : ''}` });
    setTimeout(() => setImportMsg(null), warns.length > 0 ? 6000 : 3000);
    e.target.value = "";
  };

  // ── Download template ──

  const handleExportTemplate = async () => {
    const XLSXLIB = await import("xlsx");
    const data = [
      ["姓名", "RPE(1-10)", "疲劳度(1-5)", "肌肉酸痛(1-5)", "备注"],
      ["张三", 7, 3, 2, ""],
      ["李四", 4, 5, 4, "抽筋"],
      ["王五", 2, 1, 1, "感觉良好"],
    ];
    const ws = XLSXLIB.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 20 }];
    const wb = XLSXLIB.utils.book_new();
    XLSXLIB.utils.book_append_sheet(wb, ws, "球员自评");
    XLSXLIB.writeFile(wb, "球员自评模板.xlsx");
  };

  const enteredCount = Object.keys(scores).length;
  const avgScore = enteredCount > 0 ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / enteredCount) : null;

  // Count players with self-reports today
  const selfReportCount = selfReports.length;
  const selfReportAvgRPE = selfReportCount > 0
    ? Math.round(selfReports.reduce((a, r) => a + r.rpe, 0) / selfReportCount * 10) / 10
    : null;

  // Count discrepancies
  const discrepancyCount = useMemo(() => {
    let count = 0;
    for (const p of players) {
      const s = scores[p.id];
      const sr = selfReports.find(r => r.name === p.name);
      if (s !== undefined && sr) {
        const disc = checkCoachPlayerDiscrepancy(s, sr.fatigue, sr.soreness);
        if (disc.level !== 'none') count++;
      }
    }
    return count;
  }, [players, scores, selfReports]);

  if (players.length === 0) return null;

  return (
    <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4 space-y-3">
      {/* ── Header bar (click to collapse) ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between group"
      >
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#992828]" />
          全队状态录入
          {/* Self-report count badge */}
          {selfReportCount > 0 && (
            <span className="px-1.5 py-0 rounded text-[9px] bg-blue-500/20 text-blue-400 font-normal">
              {selfReportCount}人自评
            </span>
          )}
          {/* Discrepancy warning */}
          {discrepancyCount > 0 && (
            <span className="px-1.5 py-0 rounded text-[9px] bg-yellow-500/20 text-yellow-400 font-normal flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />
              {discrepancyCount}人偏差
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {collapsed && avgScore !== null && (
            <span className={`text-xs font-bold ${getLabel(avgScore).color}`}>教练均分 {avgScore}</span>
          )}
          {collapsed && selfReportAvgRPE !== null && (
            <span className="text-[10px] text-blue-400">RPE {selfReportAvgRPE}</span>
          )}
          {collapsed && <span className="text-[10px] text-gray-500">{enteredCount}/{players.length}人</span>}
          <ChevronDown className={`w-4 h-4 text-gray-500 group-hover:text-white transition ${collapsed ? '' : 'rotate-180'}`} />
        </div>
      </button>

      {!collapsed && (
        <>
          {/* ── Quick-set summary bar ── */}
          <div className="flex items-center gap-2 flex-wrap">
            {avgScore !== null && (
              <div className="flex items-center gap-2 bg-[#0d0d0d] rounded-lg px-3 py-2 flex-1 min-w-[140px]">
                <span className={`text-lg font-black ${getLabel(avgScore).color}`}>{avgScore}</span>
                <div className="text-[10px] text-gray-400">
                  教练均分 · {getLabel(avgScore).text}
                  {avgScore < 55 && <span className="text-[#992828] ml-1">⚠️ 建议降强度</span>}
                </div>
              </div>
            )}
            {selfReportAvgRPE !== null && (
              <div className="flex items-center gap-2 bg-[#0d0d0d] rounded-lg px-3 py-2 flex-1 min-w-[140px]">
                <span className="text-lg font-black text-blue-400">{selfReportAvgRPE}</span>
                <div className="text-[10px] text-gray-400">
                  球员自评均RPE · {selfReportCount}人
                  {selfReportAvgRPE >= 7 && <span className="text-[#992828] ml-1">⚠️ 负荷偏高</span>}
                </div>
              </div>
            )}
          </div>

          {/* ── Tab toggle: 教练评分 | 球员自评 ── */}
          <div className="flex gap-1 bg-[#0d0d0d] rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('coach')}
              className={`flex-1 py-1.5 rounded text-[10px] font-medium transition ${
                activeTab === 'coach' ? 'bg-[#1a1a1a] text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              教练评分 ({enteredCount}/{players.length})
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`flex-1 py-1.5 rounded text-[10px] font-medium transition ${
                activeTab === 'compare' ? 'bg-[#1a1a1a] text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              球员自评 ({selfReportCount}/{players.length})
            </button>
          </div>

          {/* ── Coach scoring view ── */}
          {activeTab === 'coach' && (
            <div className={`space-y-1 ${expanded ? '' : 'max-h-[240px] overflow-y-auto'}`}>
              {players.map(p => {
                const s = scores[p.id];
                const label = s ? getLabel(s) : null;
                const sr = selfReports.find(r => r.name === p.name);
                const disc = s !== undefined && sr
                  ? checkCoachPlayerDiscrepancy(s, sr.fatigue, sr.soreness)
                  : null;

                return (
                  <div key={p.id} className="flex items-center gap-2 bg-[#0d0d0d] rounded-lg p-2 group">
                    <span className="text-[10px] text-white w-20 truncate font-medium">{p.name}</span>
                    <span className="text-[9px] text-gray-500 w-8">{p.position?.slice(0, 2) || '—'}</span>

                    {/* Self-report mini badge */}
                    {sr && (
                      <span className={`text-[8px] px-1 py-0 rounded ${selfReportBadge(sr.rpe, sr.fatigue, sr.soreness).bg} ${selfReportBadge(sr.rpe, sr.fatigue, sr.soreness).color}`}>
                        RPE{sr.rpe}
                      </span>
                    )}

                    {/* Discrepancy flag */}
                    {disc && disc.level !== 'none' && (
                      <span title={disc.detail}><AlertTriangle className={`w-3 h-3 ${disc.level === 'significant' ? 'text-yellow-400' : 'text-yellow-500/60'}`} /></span>
                    )}

                    <div className="flex items-center gap-1 flex-1 justify-end">
                      {[85, 70, 55, 40, 25].map(score => (
                        <button
                          key={score}
                          onClick={() => quickSet(p.id, score)}
                          className={`w-7 h-6 rounded text-[9px] font-medium transition ${
                            s === score
                              ? 'bg-[#992828] text-white'
                              : 'bg-[#1a1a1a] text-gray-500 hover:bg-[#333] hover:text-white'
                          }`}
                          title={getLabel(score).text}
                        >{score}</button>
                      ))}
                      {s !== undefined && <span className={`text-[10px] font-bold ml-1 ${label?.color}`}>{s}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Player self-report comparison view ── */}
          {activeTab === 'compare' && (
            <div className={`space-y-1 ${expanded ? '' : 'max-h-[240px] overflow-y-auto'}`}>
              {players.map(p => {
                const s = scores[p.id];
                const coachLabel = s ? getLabel(s) : null;
                const sr = selfReports.find(r => r.name === p.name);

                return (
                  <div key={p.id} className="flex items-center gap-2 bg-[#0d0d0d] rounded-lg p-2">
                    <span className="text-[10px] text-white w-20 truncate font-medium">{p.name}</span>
                    <span className="text-[9px] text-gray-500 w-8">{p.position?.slice(0, 2) || '—'}</span>

                    {sr ? (
                      <div className="flex items-center gap-1.5 flex-1 justify-end text-[9px]">
                        <span className="text-gray-400">RPE <span className="text-white font-medium">{sr.rpe}</span></span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-400">疲劳 <span className={sr.fatigue >= 4 ? 'text-[#992828] font-medium' : 'text-white font-medium'}>{sr.fatigue}</span></span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-400">酸痛 <span className={sr.soreness >= 4 ? 'text-[#992828] font-medium' : 'text-white font-medium'}>{sr.soreness}</span></span>
                        <span className={`px-1 py-0 rounded text-[8px] border ml-1 ${selfReportBadge(sr.rpe, sr.fatigue, sr.soreness).bg} ${selfReportBadge(sr.rpe, sr.fatigue, sr.soreness).color}`}>
                          {selfReportBadge(sr.rpe, sr.fatigue, sr.soreness).text}
                        </span>
                        {sr.note && <span className="text-gray-600 truncate max-w-[80px]" title={sr.note}>{sr.note}</span>}

                        {/* Coach score for comparison */}
                        {coachLabel && (
                          <>
                            <span className="text-gray-600">vs</span>
                            <span className={`text-[9px] ${coachLabel.color}`}>教练{coachLabel.text}</span>
                          </>
                        )}

                        {/* Discrepancy */}
                        {(() => {
                          const disc = s !== undefined ? checkCoachPlayerDiscrepancy(s, sr.fatigue, sr.soreness) : null;
                          return disc && disc.level !== 'none' ? (
                            <span title={disc.detail}><AlertTriangle className="w-3 h-3 text-yellow-400" /></span>
                          ) : null;
                        })()}
                      </div>
                    ) : (
                      <div className="flex-1 text-right">
                        <span className="text-[9px] text-gray-600">暂无自评</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Expand/collapse player list ── */}
          {players.length > 8 && (
            <button onClick={() => setExpanded(!expanded)} className="w-full text-[10px] text-gray-500 hover:text-white flex items-center justify-center gap-1">
              <ChevronDown className={`w-3 h-3 transition ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? '收起' : `展开全部 ${players.length} 人`}
            </button>
          )}

          {/* ── Import message ── */}
          {importMsg && (
            <div className={`px-3 py-1.5 rounded text-[10px] ${importMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-[#992828]/10 border border-[#992828]/20 text-[#992828]'}`}>
              {importMsg.text}
            </div>
          )}

          {/* ── Action bar ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleSave}
              className={`flex-1 min-w-[120px] py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                saved ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[#992828] hover:bg-[#7a1e1e] text-white'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? '✓ 已保存' : `保存教练评分 (${enteredCount}人)`}
            </button>

            {/* CSV import (coach scores) */}
            <label className="flex items-center gap-1 px-2.5 py-2 bg-[#0d0d0d] border border-[#333] rounded-lg text-[10px] text-gray-400 hover:text-white cursor-pointer transition">
              <Upload className="w-3 h-3" /> CSV评分
              <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
            </label>

            {/* Excel import (player self-reports) */}
            <label className="flex items-center gap-1 px-2.5 py-2 bg-[#0d0d0d] border border-[#333] rounded-lg text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer transition">
              <FileSpreadsheet className="w-3 h-3" /> 导入自评
              <input type="file" accept=".xlsx,.xls" onChange={handleSelfReportImport} className="hidden" />
            </label>

            {/* Download template */}
            <button onClick={handleExportTemplate}
              className="flex items-center gap-1 px-2.5 py-2 bg-[#0d0d0d] border border-[#333] rounded-lg text-[10px] text-gray-400 hover:text-white transition">
              <Download className="w-3 h-3" /> 模板
            </button>
          </div>
        </>
      )}
    </div>
  );
}
