"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Plus, Trash2, GripVertical, ChevronRight } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import SeasonCalendar, { type PhaseRange, type PhaseType } from "@/components/SeasonCalendar";
import type { SeasonPhase } from "@/lib/types";

// ── Phase prescriptions: auto-generated from season calendar ──
interface PhasePreset {
  phaseType: PhaseType;
  label: string;
  icon: string;
  color: string;
  goal: string;
  stateDescription: string;
  weeklyStrengthDays: number;   // 每周力量房次数
  weeklyPitchDays: number;      // 每周外场次数
  avgDuration: number;          // 建议单次时长
  intensityRange: string;      // 强度范围
  weeklyLoadDesc: string;      // 周负荷描述
}

const PHASE_PRESETS: Record<PhaseType, PhasePreset> = {
  offseason: {
    phaseType: 'offseason',
    label: '休赛期',
    icon: '🧊',
    color: '#374151',
    goal: '身体重塑 · 短板补强',
    stateDescription: '主力轮休放松、伤病球员康复、年轻球员加练。全队保持基础体能，不做高强度对抗。',
    weeklyStrengthDays: 3,
    weeklyPitchDays: 2,
    avgDuration: 75,
    intensityRange: '低~中低',
    weeklyLoadDesc: '力量3次/周（补短板重点）+ 外场2次/周（低强度有氧+个人技术），周总负荷控制在赛季期60-70%',
  },
  preseason_build: {
    phaseType: 'preseason_build',
    label: '季前备战期',
    icon: '🏋️',
    color: '#166534',
    goal: '体能储备 · 战术磨合',
    stateDescription: '全队逐步上量，建立有氧基础→力量储备→爆发力转化。热身赛检验阵容，确定主力框架。',
    weeklyStrengthDays: 2,
    weeklyPitchDays: 4,
    avgDuration: 90,
    intensityRange: '中~高',
    weeklyLoadDesc: '力量2次/周（全身力量储备）+ 外场4次/周（SSG+战术演练+热身赛），周负荷逐周递增，第4-5周达峰值',
  },
  regular_season: {
    phaseType: 'regular_season',
    label: '常规赛季',
    icon: '⚽',
    color: '#450a0a',
    goal: '状态维持 · 以赛代练',
    stateDescription: '一周一赛或双赛节奏。联赛日全力争胜，杯赛日轮换保持竞争力。训练围绕比赛日安排。',
    weeklyStrengthDays: 1,
    weeklyPitchDays: 4,
    avgDuration: 60,
    intensityRange: '中（保状态）',
    weeklyLoadDesc: '力量1-2次/周（维持力量，赛前2天禁止大重量下肢）+ 外场4次/周（MD-3战术→MD-1激活→MD比赛→MD+1恢复），一周双赛时降至最低有效剂量',
  },
  playoffs: {
    phaseType: 'playoffs',
    label: '附加赛',
    icon: '🏆',
    color: '#7f1d1d',
    goal: '巅峰状态 · 生死战',
    stateDescription: '保级或冲甲关键战。全队最高强度备战，心理准备+身体巅峰。每场都是决赛。',
    weeklyStrengthDays: 1,
    weeklyPitchDays: 4,
    avgDuration: 75,
    intensityRange: '高（精准控制）',
    weeklyLoadDesc: '力量1次/周（爆发力维持，赛前3天不做新动作）+ 外场4次/周（针对性战术+强度控制），负荷波动不超过10%，避免过度训练',
  },
};

// ── editable day ──
interface DayPlan {
  id: string;
  day: string;
  focus: string;
  intensity: string;
  duration: number;
  scene: 'gym' | 'pitch';
  goal: string;
  notes: string;
}

interface SavedMicrocycle {
  id: string;
  name: string;
  phase: SeasonPhase;
  totalWeeks: number;
  createdAt: string;
  days: DayPlan[];
}

const INTENSITIES = ['低', '中低', '中', '中高', '高', '极高'];
const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// ── localStorage ──
const PLANS_KEY = 'kenshin_microcycle_plans_saved';

function loadPlans(): SavedMicrocycle[] {
  try { return JSON.parse(localStorage.getItem(PLANS_KEY) || '[]'); } catch { return []; }
}
function savePlans(plans: SavedMicrocycle[]) {
  try { localStorage.setItem(PLANS_KEY, JSON.stringify(plans)); } catch {}
}

// ── Read phase ranges from SeasonCalendar ──
function loadSeasonPhaseRanges(): PhaseRange[] {
  try {
    const raw = localStorage.getItem('kenshin_season_calendar');
    if (!raw) return [];
    const data = JSON.parse(raw);
    return data.phaseRanges || [];
  } catch { return []; }
}

// ── Generate a week of training based on phase preset ──
function daysFromPreset(preset: PhasePreset, weekIndex: number): DayPlan[] {
  const days: DayPlan[] = [];
  // Monday is day 0, Sunday is day 6

  // Simple distribution pattern
  const pattern: { scene: 'gym' | 'pitch'; goal: string; focus: string; intensity: string }[] = [];

  if (preset.phaseType === 'offseason') {
    // Mon=力量, Tue=外场, Wed=力量, Thu=外场, Fri=力量, Sat=休息, Sun=休息
    pattern.push({ scene:'gym', goal:'strength', focus:'力量训练（全身）', intensity:'中' });
    pattern.push({ scene:'pitch', goal:'mas_endurance', focus:'低强度有氧+个人技术', intensity:'低' });
    pattern.push({ scene:'gym', goal:'strength', focus:'力量训练（弱链纠正）', intensity:'中' });
    pattern.push({ scene:'pitch', goal:'mas_endurance', focus:'有氧跑+小场地游戏', intensity:'中低' });
    pattern.push({ scene:'gym', goal:'power', focus:'爆发力+核心', intensity:'中' });
    pattern.push({ scene:'pitch', goal:'mas_endurance', focus:'主动恢复/休息', intensity:'低' });
    pattern.push({ scene:'gym', goal:'strength', focus:'休息日', intensity:'低' });
  } else if (preset.phaseType === 'preseason_build') {
    pattern.push({ scene:'pitch', goal:'mas_endurance', focus:'有氧基础+SSG', intensity:'中高' });
    pattern.push({ scene:'gym', goal:'strength', focus:'力量储备（下肢重点）', intensity:'高' });
    pattern.push({ scene:'pitch', goal:'speed', focus:'速度+敏捷+战术', intensity:'高' });
    pattern.push({ scene:'pitch', goal:'power', focus:'爆发力+定位球', intensity:'中高' });
    pattern.push({ scene:'gym', goal:'power', focus:'力量转化（上肢+核心）', intensity:'中' });
    pattern.push({ scene:'pitch', goal:'speed', focus:'热身赛/战术演练', intensity:'高' });
    pattern.push({ scene:'pitch', goal:'mas_endurance', focus:'主动恢复', intensity:'低' });
  } else if (preset.phaseType === 'regular_season') {
    pattern.push({ scene:'gym', goal:'strength', focus:'MD-6: 力量维持', intensity:'中' });
    pattern.push({ scene:'pitch', goal:'speed', focus:'MD-5: 速度耐力', intensity:'中高' });
    pattern.push({ scene:'pitch', goal:'power', focus:'MD-4: 战术+爆发', intensity:'中' });
    pattern.push({ scene:'pitch', goal:'speed', focus:'MD-3: 战术演练', intensity:'中高' });
    pattern.push({ scene:'pitch', goal:'speed', focus:'MD-2: 小组配合', intensity:'中' });
    pattern.push({ scene:'pitch', goal:'speed', focus:'MD-1: 赛前激活', intensity:'低' });
    pattern.push({ scene:'pitch', goal:'speed', focus:'⚽ 比赛日', intensity:'极高' });
  } else { // playoffs
    pattern.push({ scene:'gym', goal:'power', focus:'爆发力维持（轻量）', intensity:'中' });
    pattern.push({ scene:'pitch', goal:'power', focus:'针对性战术训练', intensity:'高' });
    pattern.push({ scene:'pitch', goal:'speed', focus:'强度控制+定位球', intensity:'中高' });
    pattern.push({ scene:'pitch', goal:'power', focus:'战术磨合+心理准备', intensity:'中' });
    pattern.push({ scene:'pitch', goal:'speed', focus:'赛前激活+轻技术', intensity:'低' });
    pattern.push({ scene:'pitch', goal:'speed', focus:'⚽ 附加赛日', intensity:'极高' });
    pattern.push({ scene:'pitch', goal:'mas_endurance', focus:'恢复再生', intensity:'低' });
  }

  for (let i = 0; i < 7; i++) {
    const p = pattern[i];
    days.push({
      id: `day_${Date.now()}_${weekIndex}_${i}`,
      day: DAY_LABELS[i],
      focus: p.focus,
      intensity: p.intensity,
      duration: preset.avgDuration,
      scene: p.scene,
      goal: p.goal,
      notes: '',
    });
  }
  return days;
}

// ── Training notes component ──
function TrainingNotes() {
  const today = new Date().toISOString().slice(0, 10);
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kenshin_daily_training_notes') || '{}'); } catch { return {}; }
  });
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(notes[today] || '');

  const save = () => {
    const next = { ...notes, [today]: text };
    setNotes(next);
    localStorage.setItem('kenshin_daily_training_notes', JSON.stringify(next));
    setEditing(false);
  };

  // Read today's context
  const context = useMemo(() => {
    const lines: string[] = [];
    try {
      const wCal = JSON.parse(localStorage.getItem('kenshin_warmup_calendar') || '{}');
      if (wCal[today]?.warmupId) lines.push('热身: 已绑定');
    } catch {}
    try {
      const gCal = JSON.parse(localStorage.getItem('kenshin_gym_calendar') || '[]');
      if (Array.isArray(gCal) && gCal.some((e: any) => e.date === today)) lines.push('力量: 已设计');
    } catch {}
    try {
      const logs = JSON.parse(localStorage.getItem('kenshin_training_logs') || '[]');
      const todayLog = logs.find((l: any) => l.date === today);
      if (todayLog) lines.push(`训练完成: ${todayLog.summary?.completedExercises || 0}/${todayLog.summary?.totalExercises || 0}项 · RPE ${todayLog.summary?.averageRPE || '—'}`);
    } catch {}
    return lines;
  }, []);

  return (
    <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">📝 训练笔记</h3>
        {!editing ? (
          <button onClick={() => { setText(notes[today] || ''); setEditing(true); }} className="text-[10px] text-gray-500 hover:text-white">编辑</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="text-[10px] text-gray-500 hover:text-white">取消</button>
            <button onClick={save} className="text-[10px] bg-[#d92525] hover:bg-[#b71d1d] text-white px-3 py-1 rounded font-bold">保存</button>
          </div>
        )}
      </div>

      {context.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {context.map((c, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] text-gray-300">{c}</span>
          ))}
        </div>
      )}

      {editing ? (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`${today} 训练记录...\n热身: \n主训: \n力量: \n战术: \n备注:`}
          rows={6}
          className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[#d92525]"
        />
      ) : (
        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans min-h-[40px]">
          {notes[today] || <span className="text-gray-600">今天还没有训练笔记，点击「编辑」开始记录</span>}
        </pre>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
export default function PlanningPage() {
  const router = useRouter();
  const [days, setDays] = useState<DayPlan[]>([]);
  const [generating, setGenerating] = useState(false);
  const [activePreset, setActivePreset] = useState<PhasePreset | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [savedPlans, setSavedPlans] = useState<SavedMicrocycle[]>(() => loadPlans());
  const [dragDayId, setDragDayId] = useState<string | null>(null);
  const [matchDayIndex, setMatchDayIndex] = useState(6);

  // ── Read season data and show detected phases ──
  const seasonRanges = useMemo(() => loadSeasonPhaseRanges(), []);
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentPhase = seasonRanges.find(r => todayStr >= r.startDate && todayStr <= r.endDate);

  // ── Generate week from phase preset ──
  const handleGenerateFromPreset = async (preset: PhasePreset) => {
    setGenerating(true);
    setActivePreset(preset);
    await new Promise(r => setTimeout(r, 200));
    const generated = daysFromPreset(preset, 0);
    setDays(generated);
    setPlanName(`${preset.label} · 第1周`);
    setGenerating(false);
  };

  // ── day editing ──
  const updateDay = (dayId: string, field: keyof DayPlan, value: any) => {
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, [field]: value } : d));
  };

  const addDay = () => {
    const newDay: DayPlan = { id: `day_${Date.now()}`, day: DAY_LABELS[days.length % 7], focus: '恢复再生', intensity: '低', duration: 45, scene: 'pitch', goal: 'mas_endurance', notes: '' };
    setDays(prev => [...prev, newDay]);
  };

  const removeDay = (dayId: string) => setDays(prev => prev.filter(d => d.id !== dayId));

  const handleDragStart = (e: React.DragEvent, dayId: string) => { setDragDayId(dayId); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragDayId || dragDayId === targetId) return;
    setDays(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(d => d.id === dragDayId);
      const toIdx = arr.findIndex(d => d.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr.map((d, i) => ({ ...d, day: DAY_LABELS[i % 7] }));
    });
    setDragDayId(null);
  };

  const handleSave = () => {
    if (!activePreset || days.length === 0) return;
    const plan: SavedMicrocycle = { id: `plan_${Date.now()}`, name: planName || '未命名微周期', phase: 'competition', totalWeeks: 1, createdAt: new Date().toISOString(), days: [...days] };
    const updated = [plan, ...savedPlans].slice(0, 20);
    savePlans(updated);
    setSavedPlans(updated);
  };

  const loadSavedPlan = (plan: SavedMicrocycle) => { setDays(plan.days); setPlanName(plan.name); };
  const deleteSavedPlan = (planId: string) => { const u = savedPlans.filter(p => p.id !== planId); savePlans(u); setSavedPlans(u); };

  const pushToWorkbench = (day: DayPlan) => {
    localStorage.setItem('kenshin_workbench_preset', JSON.stringify({ scene: day.scene, goal: day.goal, duration: day.duration, focus: day.focus }));
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#121212] p-4 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-white font-bold text-lg">📅 训练周期编排</h1>
        {currentPhase && <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: PHASE_PRESETS[currentPhase.phase].color, color: '#fff' }}>当前: {PHASE_PRESETS[currentPhase.phase].icon} {PHASE_PRESETS[currentPhase.phase].label}</span>}
      </div>

      {/* ═══ SEASON PHASE STATUS ═══ */}
      {seasonRanges.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          {Object.values(PHASE_PRESETS).map(preset => {
            const range = seasonRanges.find(r => r.phase === preset.phaseType);
            const isActive = range && todayStr >= range.startDate && todayStr <= range.endDate;
            return (
              <button
                key={preset.phaseType}
                onClick={() => handleGenerateFromPreset(preset)}
                disabled={generating}
                className={`p-3 rounded-xl border text-left transition ${isActive ? 'ring-1' : ''}
                  ${activePreset?.phaseType === preset.phaseType ? 'ring-1 ring-white' : ''}
                  hover:border-[#d92525]/50`}
                style={{
                  backgroundColor: '#0d0d0d',
                  borderColor: isActive ? preset.color : '#222',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{preset.icon}</span>
                  <span className="text-xs font-bold text-white">{preset.label}</span>
                  {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded text-white ml-auto" style={{ backgroundColor: preset.color }}>当前</span>}
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed mb-2">{preset.goal}</p>
                <div className="flex gap-2 text-[9px]">
                  <span className="text-gray-500">🏋️ ×{preset.weeklyStrengthDays}</span>
                  <span className="text-gray-500">⚽ ×{preset.weeklyPitchDays}</span>
                  <span className="text-gray-500">{preset.intensityRange}</span>
                </div>
                {range && <p className="text-[8px] text-gray-600 mt-1.5">{range.startDate} → {range.endDate}</p>}
              </button>
            );
          })}
          {generating && <div className="col-span-full text-center py-2"><Loader2 className="w-4 h-4 animate-spin text-[#d92525] mx-auto" /></div>}
        </div>
      )}

      {/* ═══ No season data: show manual period cards ═══ */}
      {seasonRanges.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          {Object.values(PHASE_PRESETS).map(preset => (
            <button key={preset.phaseType} onClick={() => handleGenerateFromPreset(preset)} disabled={generating}
              className="p-3 rounded-xl border border-[#222] bg-[#0d0d0d] hover:border-[#d92525]/50 text-left transition">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{preset.icon}</span>
                <span className="text-xs font-bold text-white">{preset.label}</span>
              </div>
              <p className="text-[10px] text-gray-500 mb-2">{preset.goal}</p>
              <div className="flex gap-2 text-[9px] text-gray-500">
                <span>🏋️×{preset.weeklyStrengthDays}</span>
                <span>⚽×{preset.weeklyPitchDays}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ═══ Phase detail + microcycle editor ═══ */}
      {activePreset && (
        <div className="mb-4 bg-[#0d0d0d] border border-[#222] rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">{activePreset.icon}</span>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-white">{activePreset.label} · {activePreset.goal}</h2>
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{activePreset.stateDescription}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px]">
                <span className="text-gray-500">🏋️ 力量 <span className="text-white">{activePreset.weeklyStrengthDays}次/周</span></span>
                <span className="text-gray-500">⚽ 外场 <span className="text-white">{activePreset.weeklyPitchDays}次/周</span></span>
                <span className="text-gray-500">⏱ <span className="text-white">{activePreset.avgDuration}min/次</span></span>
                <span className="text-gray-500">📊 <span className="text-white">{activePreset.intensityRange}</span></span>
              </div>
              <p className="text-[10px] text-gray-600 mt-1.5 italic">{activePreset.weeklyLoadDesc}</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Microcycle editor ═══ */}
      {days.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden mb-4">
          <div className="flex items-center justify-between p-3 border-b border-[#222] bg-[#0d0d0d]">
            <input value={planName} onChange={e => setPlanName(e.target.value)} className="bg-transparent text-white text-sm font-bold border-none outline-none" placeholder="微周期名称" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">比赛日</span>
              <select value={matchDayIndex} onChange={e => setMatchDayIndex(Number(e.target.value))} className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-white">
                {DAY_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
              </select>
              <button onClick={addDay} className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-400 hover:text-white bg-[#1a1a1a] rounded transition"><Plus className="w-3 h-3" />加天</button>
              <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 text-[10px] bg-[#d92525] hover:bg-[#b71d1d] text-white rounded font-bold transition"><Save className="w-3 h-3" />保存</button>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {days.map((day, idx) => {
              const isMatchDay = idx === matchDayIndex;
              const isEditing = editingDayId === day.id;
              return (
                <div key={day.id} draggable onDragStart={e => handleDragStart(e, day.id)} onDragOver={handleDragOver} onDrop={e => handleDrop(e, day.id)}
                  className={`rounded-lg border transition ${isMatchDay ? 'border-[#d92525]/40 bg-[#d92525]/5' : isEditing ? 'border-[#d92525] bg-[#0d0d0d]' : 'border-[#222] bg-[#0d0d0d] hover:border-[#444]'}`}>
                  <div className="flex items-center gap-3 p-3">
                    <GripVertical className="w-3.5 h-3.5 text-gray-600 cursor-grab shrink-0" />
                    <span className={`text-xs font-bold w-10 shrink-0 ${isMatchDay ? 'text-[#d92525]' : 'text-white'}`}>{isMatchDay ? '⚽MD' : day.day}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{day.focus}</p>
                      <p className="text-[9px] text-gray-500">{day.scene === 'gym' ? '🏋️力量房' : '⚽外场'} · {day.goal} · {day.duration}min</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${day.intensity === '极高' || day.intensity === '高' ? 'bg-[#d92525]/20 text-[#d92525]' : day.intensity === '中' || day.intensity === '中高' || day.intensity === '中低' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-400'}`}>{day.intensity}</span>
                    <button onClick={() => setEditingDayId(isEditing ? null : day.id)} className="p-1 text-gray-600 hover:text-white transition text-[10px]">{isEditing ? '收起' : '编辑'}</button>
                    <button onClick={() => pushToWorkbench(day)} title="推送到工作台" className="p-1 text-gray-600 hover:text-[#d92525] transition"><ChevronRight className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeDay(day.id)} className="p-1 text-gray-600 hover:text-red-500 transition"><Trash2 className="w-3 h-3" /></button>
                  </div>
                  {isEditing && (
                    <div className="border-t border-[#222] p-3 bg-[#0d0d0d] rounded-b-lg">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div><label className="text-[9px] text-gray-500 block mb-1">训练焦点</label><input value={day.focus} onChange={e => updateDay(day.id, 'focus', e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white" /></div>
                        <div><label className="text-[9px] text-gray-500 block mb-1">强度</label><select value={day.intensity} onChange={e => updateDay(day.id, 'intensity', e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white">{INTENSITIES.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
                        <div><label className="text-[9px] text-gray-500 block mb-1">时长(min)</label><input type="number" value={day.duration} onChange={e => updateDay(day.id, 'duration', Number(e.target.value))} min={15} max={120} step={5} className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white" /></div>
                        <div><label className="text-[9px] text-gray-500 block mb-1">场景</label><select value={day.scene} onChange={e => updateDay(day.id, 'scene', e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white"><option value="gym">🏋️力量房</option><option value="pitch">⚽外场</option></select></div>
                        <div className="col-span-2"><label className="text-[9px] text-gray-500 block mb-1">训练目标</label><div className="flex gap-1">{['strength','power','speed','mas_endurance','agility'].map(g => <button key={g} onClick={() => updateDay(day.id, 'goal', g)} className={`px-2 py-1 rounded text-[9px] transition ${day.goal === g ? 'bg-[#d92525] text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>{g}</button>)}</div></div>
                        <div className="col-span-2"><label className="text-[9px] text-gray-500 block mb-1">备注</label><input value={day.notes} onChange={e => updateDay(day.id, 'notes', e.target.value)} placeholder="补充说明..." className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white" /></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Saved plans ═══ */}
      {savedPlans.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">已保存的微周期</h2>
          <div className="flex flex-wrap gap-2">
            {savedPlans.slice(0, 5).map(plan => (
              <div key={plan.id} className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg p-2 border border-[#222] group">
                <button onClick={() => loadSavedPlan(plan)} className="text-left min-w-0"><p className="text-white text-xs font-medium truncate">{plan.name}</p><p className="text-[9px] text-gray-500">{plan.days.length}天 · {new Date(plan.createdAt).toLocaleDateString('zh-CN')}</p></button>
                <button onClick={() => deleteSavedPlan(plan.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-1"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 训练笔记 ═══ */}
      <section className="mb-8">
        <TrainingNotes />
      </section>

      {/* ═══ 赛季全景 ═══ */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">📅 赛季全景</h2>
        <SeasonCalendar />
      </section>

      <MobileNav />
    </div>
  );
}
