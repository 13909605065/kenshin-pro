"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Zap, Loader2, Save, Plus, Trash2, GripVertical, ChevronRight } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import SeasonCalendar from "@/components/SeasonCalendar";
import TrainingCalendar from "@/components/TrainingCalendar";
import { generateMesocycle, type MesocycleWeek } from "@/lib/periodization";
import type { SeasonPhase } from "@/lib/types";

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
const SCENES = [
  { id: 'gym' as const, label: '🏋️ 力量房' },
  { id: 'pitch' as const, label: '⚽ 外场' },
];
const GOALS_BY_SCENE: Record<string, string[]> = {
  gym: ['strength', 'power', 'agility', 'mas_endurance'],
  pitch: ['strength', 'power', 'speed', 'mas_endurance'],
};

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// ── localStorage ──
const PLANS_KEY = 'kenshin_microcycle_plans_saved';

function loadPlans(): SavedMicrocycle[] {
  try { return JSON.parse(localStorage.getItem(PLANS_KEY) || '[]'); } catch { return []; }
}
function savePlans(plans: SavedMicrocycle[]) {
  try { localStorage.setItem(PLANS_KEY, JSON.stringify(plans)); } catch {}
}

function daysFromMesocycle(weeks: MesocycleWeek[], startDayOffset = 0): DayPlan[] {
  const sceneMap: Record<string, 'gym' | 'pitch'> = {
    strength: 'gym', power: 'gym', agility: 'gym',
    speed: 'pitch', mas_endurance: 'pitch',
  };
  const days: DayPlan[] = [];
  for (let i = 0; i < 7; i++) {
    const w = weeks[i] || weeks[weeks.length - 1];
    days.push({
      id: `day_${Date.now()}_${i}`,
      day: DAY_LABELS[(startDayOffset + i) % 7],
      focus: w.notes?.slice(0, 20) || `${w.goal}训练`,
      intensity: w.intensity[1] > 85 ? '高' : w.intensity[1] > 70 ? '中高' : w.intensity[1] > 55 ? '中' : '低',
      duration: 60,
      scene: sceneMap[w.goal] || 'gym',
      goal: w.goal,
      notes: '',
    });
  }
  return days;
}

// ── Period presets ──
interface PeriodDef {
  id: SeasonPhase;
  name: string;
  icon: string;
  weeks: number;
  model: 'linear' | 'dup' | 'block';
  description: string;
}

const PERIODS: PeriodDef[] = [
  { id: 'offseason', name: '休赛补强', icon: '💪', weeks: 12, model: 'linear', description: '休赛期8-12周，针对短板补强、身体重塑' },
  { id: 'preseason', name: '季前储备', icon: '🏋️', weeks: 4, model: 'block', description: '赛季前4-6周，建立有氧基础与力量储备' },
  { id: 'competition', name: '赛中维持', icon: '⚽', weeks: 2, model: 'dup', description: '赛季进行中，维持竞技状态，围绕比赛日安排' },
  { id: 'recovery', name: '赛后恢复', icon: '🧊', weeks: 2, model: 'linear', description: '密集赛程后，主动恢复、损伤修复' },
];

export default function PlanningPage() {
  const router = useRouter();
  const [days, setDays] = useState<DayPlan[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<SeasonPhase | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [savedPlans, setSavedPlans] = useState<SavedMicrocycle[]>(() => loadPlans());
  const [dragDayId, setDragDayId] = useState<string | null>(null);
  const [matchDayIndex, setMatchDayIndex] = useState(6); // default Sunday match

  // ── generate microcycle from periodization library ──
  const handleGenerate = async (period: PeriodDef) => {
    setGenerating(true);
    setSelectedPeriod(period.id);

    // Use the real periodization library
    await new Promise(r => setTimeout(r, 300)); // small delay for UX
    const meso = generateMesocycle(period.id, period.weeks, period.model);
    const generated = daysFromMesocycle(meso.weeks, 0);
    setDays(generated);
    setPlanName(`${period.name} · 第1周`);
    setGenerating(false);
  };

  // ── day editing ──
  const updateDay = (dayId: string, field: keyof DayPlan, value: any) => {
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, [field]: value } : d));
  };

  const addDay = () => {
    const newDay: DayPlan = {
      id: `day_${Date.now()}`,
      day: DAY_LABELS[days.length % 7],
      focus: '恢复再生',
      intensity: '低',
      duration: 45,
      scene: 'pitch',
      goal: 'mas_endurance',
      notes: '',
    };
    setDays(prev => [...prev, newDay]);
  };

  const removeDay = (dayId: string) => {
    setDays(prev => prev.filter(d => d.id !== dayId));
  };

  // ── drag and drop ──
  const handleDragStart = (e: React.DragEvent, dayId: string) => {
    setDragDayId(dayId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

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
      // Re-label days
      return arr.map((d, i) => ({ ...d, day: DAY_LABELS[i % 7] }));
    });
    setDragDayId(null);
  };

  // ── save ──
  const handleSave = () => {
    if (!selectedPeriod || days.length === 0) return;
    const plan: SavedMicrocycle = {
      id: `plan_${Date.now()}`,
      name: planName || '未命名微周期',
      phase: selectedPeriod,
      totalWeeks: 1,
      createdAt: new Date().toISOString(),
      days: [...days],
    };
    const updated = [plan, ...savedPlans].slice(0, 20);
    savePlans(updated);
    setSavedPlans(updated);
  };

  const loadSavedPlan = (plan: SavedMicrocycle) => {
    setDays(plan.days);
    setSelectedPeriod(plan.phase);
    setPlanName(plan.name);
  };

  const deleteSavedPlan = (planId: string) => {
    const updated = savedPlans.filter(p => p.id !== planId);
    savePlans(updated);
    setSavedPlans(updated);
  };

  // ── push to CoachWorkbench ──
  const pushToWorkbench = (day: DayPlan) => {
    // Store the selected day config so CoachWorkbench can pick it up
    localStorage.setItem('kenshin_workbench_preset', JSON.stringify({
      scene: day.scene,
      goal: day.goal,
      duration: day.duration,
      focus: day.focus,
    }));
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#121212] p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">📅 训练周期编排</h1>
        <span className="text-xs text-gray-400">拖拽式微周期编辑器</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Period Selection + Saved Plans */}
        <div className="space-y-4">
          {/* Period Cards */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">周期模板</h2>
            {PERIODS.map(period => (
              <button
                key={period.id}
                onClick={() => handleGenerate(period)}
                disabled={generating}
                className={`w-full p-3 rounded-xl border text-left transition ${
                  selectedPeriod === period.id
                    ? 'border-[#d92525] bg-[#d92525]/5'
                    : 'border-[#222] bg-[#1a1a1a] hover:border-[#444]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{period.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold">{period.name}</p>
                    <p className="text-[10px] text-gray-500">{period.description}</p>
                  </div>
                  {generating && selectedPeriod === period.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#d92525]" />
                  ) : (
                    <Zap className="w-4 h-4 text-gray-600" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Saved Plans */}
          {savedPlans.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">已保存的微周期</h2>
              {savedPlans.slice(0, 5).map(plan => (
                <div key={plan.id} className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg p-2 border border-[#222] group">
                  <button onClick={() => loadSavedPlan(plan)} className="flex-1 text-left min-w-0">
                    <p className="text-white text-xs font-medium truncate">{plan.name}</p>
                    <p className="text-[9px] text-gray-500">{plan.days.length}天 · {new Date(plan.createdAt).toLocaleDateString('zh-CN')}</p>
                  </button>
                  <button onClick={() => deleteSavedPlan(plan.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Microcycle Editor */}
        <div className="lg:col-span-2">
          {days.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-12 text-center">
              <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">选择一个周期模板开始编排</p>
              <p className="text-gray-600 text-xs mt-1">点击左侧周期模板，自动生成基于 NSCA-CSCS 周期化理论的微周期</p>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between p-3 border-b border-[#222] bg-[#0d0d0d]">
                <input
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                  className="bg-transparent text-white text-sm font-bold border-none outline-none"
                  placeholder="微周期名称"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">比赛日</span>
                  <select value={matchDayIndex} onChange={e => setMatchDayIndex(Number(e.target.value))}
                    className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-white">
                    {DAY_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
                  </select>
                  <button onClick={addDay} className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-400 hover:text-white bg-[#1a1a1a] rounded transition">
                    <Plus className="w-3 h-3" />加天
                  </button>
                  <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 text-[10px] bg-[#d92525] hover:bg-[#b71d1d] text-white rounded font-bold transition">
                    <Save className="w-3 h-3" />保存
                  </button>
                </div>
              </div>

              {/* Day cards */}
              <div className="p-3 space-y-2">
                {days.map((day, idx) => {
                  const isMatchDay = idx === matchDayIndex;
                  const isEditing = editingDayId === day.id;
                  return (
                    <div
                      key={day.id}
                      draggable
                      onDragStart={e => handleDragStart(e, day.id)}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, day.id)}
                      className={`rounded-lg border transition ${
                        isMatchDay ? 'border-[#d92525]/40 bg-[#d92525]/5' :
                        isEditing ? 'border-[#d92525] bg-[#0d0d0d]' :
                        'border-[#222] bg-[#0d0d0d] hover:border-[#444]'
                      }`}
                    >
                      {/* Summary row */}
                      <div className="flex items-center gap-3 p-3">
                        <GripVertical className="w-3.5 h-3.5 text-gray-600 cursor-grab shrink-0" />
                        <span className={`text-xs font-bold w-10 shrink-0 ${isMatchDay ? 'text-[#d92525]' : 'text-white'}`}>
                          {isMatchDay ? '⚽MD' : day.day}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{day.focus}</p>
                          <p className="text-[9px] text-gray-500">{day.scene === 'gym' ? '🏋️力量房' : '⚽外场'} · {day.goal} · {day.duration}min</p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                          day.intensity === '极高' || day.intensity === '高' ? 'bg-[#d92525]/20 text-[#d92525]' :
                          day.intensity === '中' || day.intensity === '中高' || day.intensity === '中低' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-green-500/10 text-green-400'
                        }`}>{day.intensity}</span>
                        <button onClick={() => setEditingDayId(isEditing ? null : day.id)}
                          className="p-1 text-gray-600 hover:text-white transition text-[10px]">
                          {isEditing ? '收起' : '编辑'}
                        </button>
                        <button onClick={() => pushToWorkbench(day)} title="推送到工作台"
                          className="p-1 text-gray-600 hover:text-[#d92525] transition">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeDay(day.id)}
                          className="p-1 text-gray-600 hover:text-red-500 transition">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Edit panel */}
                      {isEditing && (
                        <div className="border-t border-[#222] p-3 bg-[#0d0d0d] rounded-b-lg">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">训练焦点</label>
                              <input value={day.focus} onChange={e => updateDay(day.id, 'focus', e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white" />
                            </div>
                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">强度</label>
                              <select value={day.intensity} onChange={e => updateDay(day.id, 'intensity', e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white">
                                {INTENSITIES.map(i => <option key={i} value={i}>{i}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">时长(min)</label>
                              <input type="number" value={day.duration} onChange={e => updateDay(day.id, 'duration', Number(e.target.value))}
                                min={15} max={120} step={5}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white" />
                            </div>
                            <div>
                              <label className="text-[9px] text-gray-500 block mb-1">场景</label>
                              <select value={day.scene} onChange={e => { updateDay(day.id, 'scene', e.target.value); updateDay(day.id, 'goal', GOALS_BY_SCENE[e.target.value][0]); }}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white">
                                {SCENES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="text-[9px] text-gray-500 block mb-1">训练目标</label>
                              <div className="flex gap-1">
                                {GOALS_BY_SCENE[day.scene].map(g => (
                                  <button key={g} onClick={() => updateDay(day.id, 'goal', g)}
                                    className={`px-2 py-1 rounded text-[9px] transition ${
                                      day.goal === g ? 'bg-[#d92525] text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                                    }`}>{g}</button>
                                ))}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <label className="text-[9px] text-gray-500 block mb-1">备注</label>
                              <input value={day.notes} onChange={e => updateDay(day.id, 'notes', e.target.value)}
                                placeholder="补充说明..."
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          SEASON CALENDAR — full season timeline Aug→May
          ═══════════════════════════════════════════════ */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">📅 赛季全景</h2>
        <SeasonCalendar />
      </section>

      {/* ═══════════════════════════════════════════════
          TRAINING CALENDAR — daily notes + warmup linking
          ═══════════════════════════════════════════════ */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">📋 训练日历</h2>
        <TrainingCalendar
          matchDate={(() => {
            try { return localStorage.getItem('kenshin_coach_matchDate') || new Date().toISOString().slice(0, 10); }
            catch { return new Date().toISOString().slice(0, 10); }
          })()}
          mdDay={(() => {
            try {
              const saved = localStorage.getItem('kenshin_coach_matchDate');
              const match = new Date((saved || new Date().toISOString().slice(0, 10)) + 'T00:00:00');
              const now = new Date();
              return Math.ceil((match.getTime() - now.getTime()) / 86400000);
            } catch { return 7; }
          })()}
        />
      </section>

      <MobileNav />
    </div>
  );
}
