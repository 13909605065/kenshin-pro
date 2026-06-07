"use client";

import { useState, useEffect, useMemo } from "react";
import { Activity, Users, Upload, Save, ChevronDown } from "lucide-react";
import { getPlayers, type PlayerRecord } from "@/lib/roster-utils";

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
  // Each metric contributes up to 20 points → total max 100
  let score = 0;

  // Sleep quality (5 → 20, 1 → 4)
  score += checkin.sleepQuality * 4;

  // Muscle soreness (1=no soreness → 20, 5=very sore → 4)
  score += (6 - checkin.muscleSoreness) * 4;

  // General fatigue (1=fresh → 20, 5=exhausted → 4)
  score += (6 - checkin.generalFatigue) * 4;

  // Stress (1=calm → 20, 5=very stressed → 4)
  score += (6 - checkin.stressLevel) * 4;

  // Morning HR: below baseline +5 bonus, above baseline -5 penalty
  // Assume baseline ~60 bpm
  const hrDiff = checkin.morningHR - 60;
  if (hrDiff <= 0) score += 5;
  else if (hrDiff <= 5) score += 0;
  else if (hrDiff <= 10) score -= 5;
  else score -= 10;

  return Math.max(0, Math.min(100, score));
}

function getRecommendation(score: number): { label: string; color: string; advice: string; intensityMod: string } {
  if (score >= 85) return {
    label: "状态极佳",
    color: "#22c55e",
    advice: "全力训练。可以冲击个人纪录或增加训练量。",
    intensityMod: "+10%"
  };
  if (score >= 70) return {
    label: "状态良好",
    color: "#3B82F6", 
    advice: "正常训练。按原计划执行，保持质量。",
    intensityMod: "原计划"
  };
  if (score >= 55) return {
    label: "略有疲劳",
    color: "#eab308",
    advice: "降低训练量10-20%，避免新动作或极限重量。优先技术练习。",
    intensityMod: "-15%"
  };
  if (score >= 40) return {
    label: "明显疲劳",
    color: "#f97316",
    advice: "大幅减量。仅做低强度技术维持+主动恢复。取消高强度对抗。",
    intensityMod: "-30%"
  };
  return {
    label: "需要休息",
    color: "#992828",
    advice: "建议全天休息或仅做拉伸/泡沫轴。监测晨脉，明日再评。",
    intensityMod: "-50%或休息"
  };
}

const STORAGE_KEY = "kenshin_team_readiness";

export function DailyReadiness({ onReadinessChange }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const players = useMemo(() => getPlayers(), []);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Load today's existing scores
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const all = JSON.parse(raw);
      const todayData = all[today];
      if (todayData && typeof todayData === 'object') {
        setScores(todayData);
        setSaved(true);
      }
    } catch {}
  }, [today]);

  const quickSet = (playerId: string, score: number) => {
    setScores(prev => ({ ...prev, [playerId]: score }));
    setSaved(false);
  };

  const getLabel = (score: number) => {
    if (score >= 85) return { text: '极佳', color: 'text-green-400' };
    if (score >= 70) return { text: '良好', color: 'text-blue-400' };
    if (score >= 55) return { text: '疲劳', color: 'text-yellow-400' };
    if (score >= 40) return { text: '很累', color: 'text-orange-400' };
    return { text: '休息', color: 'text-[#992828]' };
  };

  const handleSave = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[today] = scores;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      setSaved(true);
      onReadinessChange?.(Object.values(scores).reduce((a,b)=>a+b,0) / Math.max(1,Object.keys(scores).length), '');
    } catch {}
  };

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

  const enteredCount = Object.keys(scores).length;
  const avgScore = enteredCount > 0 ? Math.round(Object.values(scores).reduce((a,b)=>a+b,0) / enteredCount) : null;

  if (players.length === 0) return null;

  return (
    <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#992828]" />
          全队状态录入
        </h3>
        <div className="flex items-center gap-2">
          {avgScore !== null && <span className={`text-xs font-bold ${getLabel(avgScore).color}`}>均分 {avgScore}</span>}
          <span className="text-[10px] text-gray-500">{enteredCount}/{players.length}人</span>
          <label className="flex items-center gap-1 px-2 py-1 bg-[#0d0d0d] border border-[#333] rounded text-[10px] text-gray-400 hover:text-white cursor-pointer transition">
            <Upload className="w-3 h-3" /> 导入CSV
            <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* Quick-set summary bar */}
      {avgScore !== null && (
        <div className="flex items-center gap-2 bg-[#0d0d0d] rounded-lg p-2">
          <span className={`text-lg font-black ${getLabel(avgScore).color}`}>{avgScore}</span>
          <div className="text-[10px] text-gray-400">
            全队均分 · {getLabel(avgScore).text}
            {avgScore < 55 && <span className="text-[#992828] ml-1">⚠️ 建议降强度</span>}
          </div>
        </div>
      )}

      {/* Player list */}
      <div className={`space-y-1 ${expanded ? '' : 'max-h-[240px] overflow-y-auto'}`}>
        {players.map(p => {
          const s = scores[p.id];
          const label = s ? getLabel(s) : null;
          return (
            <div key={p.id} className="flex items-center gap-2 bg-[#0d0d0d] rounded-lg p-2 group">
              <span className="text-[10px] text-white w-20 truncate font-medium">{p.name}</span>
              <span className="text-[9px] text-gray-500 w-8">{p.position?.slice(0,2)||'—'}</span>
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

      {players.length > 8 && (
        <button onClick={() => setExpanded(!expanded)} className="w-full text-[10px] text-gray-500 hover:text-white flex items-center justify-center gap-1">
          <ChevronDown className={`w-3 h-3 transition ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? '收起' : `展开全部 ${players.length} 人`}
        </button>
      )}

      <button onClick={handleSave}
        className={`w-full py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
          saved ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[#992828] hover:bg-[#7a1e1e] text-white'
        }`}
      >
        <Save className="w-3.5 h-3.5" />
        {saved ? '✓ 已保存' : `保存全队状态 (${enteredCount}人)`}
      </button>
    </div>
  );
}
