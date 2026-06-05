/**
 * 训练前状态自评 — 运动员每日训练前完成
 *
 * 5维度评估(睡眠/酸痛/疲劳/压力/晨脉) → 准备度分数 → 训练建议
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

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

interface ReadinessResult {
  score: number;
  color: 'green' | 'yellow' | 'orange' | 'red';
  colorCn: string;
  recommendation: string;
  icon: string;
}

const STORAGE_KEY = 'kenshin_daily_checkin';

// ═══════════════════════════════════════════
// 准备度计算
// ═══════════════════════════════════════════

function computeReadinessScore(checkin: { sleepQuality: number; sleepHours: number; muscleSoreness: number; generalFatigue: number; stressLevel: number }): number {
  // 睡眠质量: 5分制 → 0-20
  const sleepScore = (checkin.sleepQuality / 5) * 20;
  // 睡眠时长: 8h=满分
  const sleepHoursScore = Math.min(20, (checkin.sleepHours / 8) * 20);
  // 酸痛: 越低越好
  const sorenessScore = ((6 - checkin.muscleSoreness) / 5) * 20;
  // 疲劳: 越低越好
  const fatigueScore = ((6 - checkin.generalFatigue) / 5) * 20;
  // 压力: 越低越好
  const stressScore = ((6 - checkin.stressLevel) / 5) * 20;

  return Math.round(sleepScore + sleepHoursScore + sorenessScore + fatigueScore + stressScore);
}

function getReadinessResult(score: number): ReadinessResult {
  if (score >= 80) return {
    score, color: 'green', colorCn: '准备就绪',
    recommendation: '全力训练，可按计划进行高强度训练',
    icon: '🟢',
  };
  if (score >= 60) return {
    score, color: 'yellow', colorCn: '轻度疲劳',
    recommendation: '可正常训练，但降低5-10%负荷，注意技术动作质量',
    icon: '🟡',
  };
  if (score >= 40) return {
    score, color: 'orange', colorCn: '明显疲劳',
    recommendation: '建议改为技术课或恢复性训练，降强度30-50%',
    icon: '🟠',
  };
  return {
    score, color: 'red', colorCn: '严重疲劳',
    recommendation: '建议休息日或极轻量恢复活动（泡沫轴+拉伸）',
    icon: '🔴',
  };
}

// ═══════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════

export function useDailyCheckin(athleteId: string = 'default') {
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [todayCheckin, setTodayCheckin] = useState<DailyCheckin | null>(null);

  // 加载
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as DailyCheckin[];
        setCheckins(data);
        const today = new Date().toISOString().slice(0, 10);
        const found = data.find(c => c.date === today && c.athleteId === athleteId);
        setTodayCheckin(found || null);
      }
    } catch { /* ignore */ }
  }, [athleteId]);

  // 保存
  const saveCheckin = useCallback((data: Omit<DailyCheckin, 'readinessScore' | 'date' | 'athleteId'>) => {
    const date = new Date().toISOString().slice(0, 10);
    const readinessScore = computeReadinessScore(data);
    const checkin: DailyCheckin = { ...data, date, athleteId, readinessScore };

    const updated = [...checkins.filter(c => !(c.date === date && c.athleteId === athleteId)), checkin];
    setCheckins(updated);
    setTodayCheckin(checkin);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(-90))); // 保留90天

    return { checkin, result: getReadinessResult(readinessScore) };
  }, [checkins, athleteId]);

  // 获取最近7天趋势
  const get7DayTrend = useCallback(() => {
    const today = new Date();
    const days: DailyCheckin[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = checkins.find(c => c.date === dateStr && c.athleteId === athleteId);
      if (found) days.push(found);
    }
    return days;
  }, [checkins, athleteId]);

  // 获取平均准备度
  const getAverageReadiness = useCallback(() => {
    const trend = get7DayTrend();
    if (trend.length === 0) return 0;
    return Math.round(trend.reduce((s, c) => s + c.readinessScore, 0) / trend.length);
  }, [get7DayTrend]);

  return {
    todayCheckin,
    checkins,
    saveCheckin,
    get7DayTrend,
    getAverageReadiness,
    readinessResult: todayCheckin ? getReadinessResult(todayCheckin.readinessScore) : null,
    computeReadinessScore,
    getReadinessResult,
  };
}

// ═══════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════

interface PreTrainingCheckinProps {
  athleteId?: string;
  onComplete?: (checkin: DailyCheckin, result: ReadinessResult) => void;
  compact?: boolean;
}

export function PreTrainingCheckin({ athleteId = 'default', onComplete, compact = false }: PreTrainingCheckinProps) {
  const { todayCheckin, saveCheckin, readinessResult } = useDailyCheckin(athleteId);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [muscleSoreness, setMuscleSoreness] = useState(3);
  const [generalFatigue, setGeneralFatigue] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [morningHR, setMorningHR] = useState(60);
  const [bodyWeight, setBodyWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ReadinessResult | null>(readinessResult);

  useEffect(() => {
    if (todayCheckin) {
      setSleepQuality(todayCheckin.sleepQuality);
      setSleepHours(todayCheckin.sleepHours);
      setMuscleSoreness(todayCheckin.muscleSoreness);
      setGeneralFatigue(todayCheckin.generalFatigue);
      setStressLevel(todayCheckin.stressLevel);
      setMorningHR(todayCheckin.morningHR);
      if (todayCheckin.bodyWeight) setBodyWeight(String(todayCheckin.bodyWeight));
      if (todayCheckin.notes) setNotes(todayCheckin.notes);
      setSubmitted(true);
    }
  }, [todayCheckin]);

  const handleSubmit = () => {
    const data = {
      sleepQuality: sleepQuality as 1 | 2 | 3 | 4 | 5,
      sleepHours,
      muscleSoreness: muscleSoreness as 1 | 2 | 3 | 4 | 5,
      generalFatigue: generalFatigue as 1 | 2 | 3 | 4 | 5,
      stressLevel: stressLevel as 1 | 2 | 3 | 4 | 5,
      morningHR,
      bodyWeight: bodyWeight ? parseFloat(bodyWeight) : undefined,
      notes: notes || undefined,
    };
    const { result: r } = saveCheckin(data);
    setResult(r);
    setSubmitted(true);
    onComplete?.({
      ...data,
      date: new Date().toISOString().slice(0, 10),
      athleteId,
      readinessScore: r.score,
    } as DailyCheckin, r);
  };

  const handleReset = () => {
    setSubmitted(false);
    setResult(null);
  };

  const sliderClass = (value: number) =>
    `w-full h-2 rounded-full appearance-none cursor-pointer ${
      value <= 2 ? 'bg-green-600' : value <= 3 ? 'bg-yellow-600' : value <= 4 ? 'bg-orange-600' : 'bg-red-600'
    }`;

  if (compact && submitted && result) {
    return (
      <div className={`px-3 py-2 rounded-lg text-xs border ${result.color === 'green' ? 'bg-green-500/10 border-green-500/30' : result.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' : result.color === 'orange' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{result.icon}</span>
          <div>
            <span className="font-semibold text-white">准备度 {result.score}%</span>
            <span className="text-gray-400 ml-1">— {result.recommendation.slice(0, 20)}…</span>
          </div>
          <button onClick={handleReset} className="ml-auto text-[#d92525] text-[10px]">重评</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">🏥 训练前状态自评</h3>
        {submitted && (
          <button onClick={handleReset} className="text-[10px] text-[#d92525] hover:underline">重新评估</button>
        )}
      </div>

      {result && (
        <div className={`p-3 rounded-lg border ${
          result.color === 'green' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
          result.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
          result.color === 'orange' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
          'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{result.icon}</span>
            <div>
              <div className="font-bold text-sm">准备度: {result.score}/100 — {result.colorCn}</div>
              <div className="text-xs opacity-80">{result.recommendation}</div>
            </div>
          </div>
        </div>
      )}

      {!submitted && (
        <>
          {/* 睡眠质量 */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>😴 睡眠质量</span>
              <span>{['很差','较差','一般','不错','极好'][sleepQuality - 1]}</span>
            </div>
            <input type="range" min={1} max={5} value={sleepQuality}
              onChange={e => setSleepQuality(Number(e.target.value))} className={sliderClass(sleepQuality)} />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5 px-1">
              {['😫','😔','😐','😊','😄'].map((e, i) => <span key={i}>{e}</span>)}
            </div>
          </div>

          {/* 睡眠时长 */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>⏰ 睡眠时长</span>
              <span>{sleepHours}小时</span>
            </div>
            <input type="range" min={3} max={12} step={0.5} value={sleepHours}
              onChange={e => setSleepHours(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-700" />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5 px-1">
              <span>3h</span><span>6h</span><span>8h</span><span>10h</span><span>12h</span>
            </div>
          </div>

          {/* 肌肉酸痛 */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>💪 肌肉酸痛</span>
              <span>{['几乎无','轻微','适中','明显','严重'][muscleSoreness - 1]}</span>
            </div>
            <input type="range" min={1} max={5} value={muscleSoreness}
              onChange={e => setMuscleSoreness(Number(e.target.value))} className={sliderClass(muscleSoreness)} />
          </div>

          {/* 整体疲劳 */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>🔋 整体疲劳</span>
              <span>{['精力充沛','轻微疲倦','适中','较累','极度疲劳'][generalFatigue - 1]}</span>
            </div>
            <input type="range" min={1} max={5} value={generalFatigue}
              onChange={e => setGeneralFatigue(Number(e.target.value))} className={sliderClass(generalFatigue)} />
          </div>

          {/* 压力水平 */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>🧘 压力水平</span>
              <span>{['很放松','较放松','适中','紧张','高压'][stressLevel - 1]}</span>
            </div>
            <input type="range" min={1} max={5} value={stressLevel}
              onChange={e => setStressLevel(Number(e.target.value))} className={sliderClass(stressLevel)} />
          </div>

          {/* 晨脉 */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">❤️ 晨脉 (bpm)</label>
            <input type="number" value={morningHR} onChange={e => setMorningHR(Number(e.target.value))}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
              min={35} max={120} />
          </div>

          {/* 体重（可选） */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">⚖️ 体重 kg（可选）</label>
            <input type="number" value={bodyWeight} onChange={e => setBodyWeight(e.target.value)}
              placeholder="如: 72.5"
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
          </div>

          {/* 备注 */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">📝 备注（可选）</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="任何想记录的感受…"
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none"
              rows={2} />
          </div>

          <button onClick={handleSubmit}
            className="w-full py-3 bg-[#d92525] hover:bg-[#b71d1d] text-white rounded-xl text-sm font-bold transition">
            提交自评
          </button>
        </>
      )}
    </div>
  );
}
