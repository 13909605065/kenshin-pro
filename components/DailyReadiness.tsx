"use client";

import { useState, useEffect } from "react";
import { Moon, Activity, Zap, Heart, Brain, Scale, AlertTriangle, CheckCircle2 } from "lucide-react";

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

const STORAGE_KEY = "kenshin_daily_readiness";

export function DailyReadiness({ athleteId = "self", onReadinessChange }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [submitted, setSubmitted] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState(4);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [muscleSoreness, setMuscleSoreness] = useState(2);
  const [generalFatigue, setGeneralFatigue] = useState(2);
  const [stressLevel, setStressLevel] = useState(2);
  const [morningHR, setMorningHR] = useState(60);
  const [bodyWeight, setBodyWeight] = useState("");
  const [notes, setNotes] = useState("");

  // Load today's checkin if exists
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const todayCheckin = all.find((c: any) => c.date === today && c.athleteId === athleteId);
      if (todayCheckin) {
        setSubmitted(true);
        setLastScore(todayCheckin.readinessScore);
      }
    } catch {}
  }, [today, athleteId]);

  const readinessScore = calcReadiness({
    date: today, athleteId, sleepQuality: sleepQuality as any,
    sleepHours, muscleSoreness: muscleSoreness as any,
    generalFatigue: generalFatigue as any, stressLevel: stressLevel as any,
    morningHR, bodyWeight: bodyWeight ? Number(bodyWeight) : undefined, notes,
  });

  const rec = getRecommendation(readinessScore);

  const handleSubmit = () => {
    const checkin: DailyCheckin = {
      date: today, athleteId,
      sleepQuality: sleepQuality as any, sleepHours,
      muscleSoreness: muscleSoreness as any, generalFatigue: generalFatigue as any,
      stressLevel: stressLevel as any, morningHR,
      bodyWeight: bodyWeight ? Number(bodyWeight) : undefined,
      readinessScore, notes,
    };
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const filtered = all.filter((c: any) => !(c.date === today && c.athleteId === athleteId));
      filtered.push(checkin);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(-90))); // keep 90 days
    } catch {}
    setSubmitted(true);
    setLastScore(readinessScore);
    onReadinessChange?.(readinessScore, rec.advice);
  };

  if (submitted && lastScore !== null) {
    const prevRec = getRecommendation(lastScore);
    return (
      <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-xs font-bold text-green-500">今日已评估</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black" style={{ color: prevRec.color }}>{lastScore}</span>
          <div>
            <p className="text-xs text-white font-medium">{prevRec.label}</p>
            <p className="text-[10px] text-gray-400">{prevRec.advice}</p>
          </div>
        </div>
        <button onClick={() => setSubmitted(false)} className="mt-2 text-[10px] text-gray-500 hover:text-white transition">重新评估</button>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4 space-y-4">
      <h3 className="text-xs font-bold text-white flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-[#992828]" />
        每日状态自评
      </h3>

      {/* Sleep */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Moon className="w-3 h-3 text-gray-500" />
          <span className="text-[10px] text-gray-400">睡眠质量</span>
          <span className="text-[10px] text-gray-600 ml-auto">{sleepQuality}/5</span>
        </div>
        <input type="range" min={1} max={5} value={sleepQuality} onChange={e => setSleepQuality(Number(e.target.value))} className="w-full h-1 accent-[#992828]" />
        <div className="flex justify-between text-[8px] text-gray-600"><span>很差</span><span>极好</span></div>
      </div>

      <div>
        <label className="text-[10px] text-gray-400">睡眠时长 (小时)</label>
        <input type="number" value={sleepHours} onChange={e => setSleepHours(Number(e.target.value))} min={0} max={14} step={0.5} className="w-20 ml-2 bg-[#0d0d0d] border border-[#333] rounded px-2 py-0.5 text-xs text-white" />
      </div>

      {/* Muscle Soreness */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-3 h-3 text-gray-500" />
          <span className="text-[10px] text-gray-400">肌肉酸痛</span>
          <span className="text-[10px] text-gray-600 ml-auto">{muscleSoreness}/5</span>
        </div>
        <input type="range" min={1} max={5} value={muscleSoreness} onChange={e => setMuscleSoreness(Number(e.target.value))} className="w-full h-1 accent-[#992828]" />
        <div className="flex justify-between text-[8px] text-gray-600"><span>无感觉</span><span>很酸痛</span></div>
      </div>

      {/* Fatigue */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-3 h-3 text-gray-500" />
          <span className="text-[10px] text-gray-400">整体疲劳</span>
          <span className="text-[10px] text-gray-600 ml-auto">{generalFatigue}/5</span>
        </div>
        <input type="range" min={1} max={5} value={generalFatigue} onChange={e => setGeneralFatigue(Number(e.target.value))} className="w-full h-1 accent-[#992828]" />
        <div className="flex justify-between text-[8px] text-gray-600"><span>精力充沛</span><span>极度疲劳</span></div>
      </div>

      {/* Stress */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-3 h-3 text-gray-500" />
          <span className="text-[10px] text-gray-400">精神压力</span>
          <span className="text-[10px] text-gray-600 ml-auto">{stressLevel}/5</span>
        </div>
        <input type="range" min={1} max={5} value={stressLevel} onChange={e => setStressLevel(Number(e.target.value))} className="w-full h-1 accent-[#992828]" />
        <div className="flex justify-between text-[8px] text-gray-600"><span>放松</span><span>很紧张</span></div>
      </div>

      {/* Morning HR */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-3 h-3 text-gray-500" />
          <span className="text-[10px] text-gray-400">晨脉 (bpm)</span>
        </div>
        <input type="number" value={morningHR} onChange={e => setMorningHR(Number(e.target.value))} min={35} max={120} className="w-20 bg-[#0d0d0d] border border-[#333] rounded px-2 py-0.5 text-xs text-white" />
        <span className="text-[8px] text-gray-600 ml-2">正常 50-65</span>
      </div>

      {/* Body Weight */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Scale className="w-3 h-3 text-gray-500" />
          <span className="text-[10px] text-gray-400">体重 (kg，选填)</span>
        </div>
        <input type="number" value={bodyWeight} onChange={e => setBodyWeight(e.target.value)} min={30} max={150} step={0.1} placeholder="—" className="w-20 bg-[#0d0d0d] border border-[#333] rounded px-2 py-0.5 text-xs text-white" />
      </div>

      {/* Readiness Score Preview */}
      <div className="bg-[#0d0d0d] rounded-lg p-3 flex items-center gap-3">
        <span className="text-3xl font-black" style={{ color: rec.color }}>{readinessScore}</span>
        <div>
          <p className="text-xs text-white font-bold">{rec.label}</p>
          <p className="text-[10px] text-gray-400">{rec.advice}</p>
        </div>
      </div>

      <button onClick={handleSubmit}
        className="w-full py-2.5 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2">
        <Send className="w-3.5 h-3.5" /> 提交评估
      </button>
    </div>
  );
}
