'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTraining } from '@/hooks/useTraining';
import { PhysicalTab } from './tabs/PhysicalTab';
import { WorkoutTimer } from './WorkoutTimer';
import { ExportTable } from './ExportTable';
import AIAssistant from './AIAssistant';
import { ExerciseEditor } from './ExerciseEditor';
import type { EditableExercise } from './ExerciseEditor';
import type { PlayerFormData, SeasonPhase, TrainingGoal, TrainingModule, Position } from '@/lib/types';
import { PHASE_LABELS } from '@/lib/constants';
import { getPhaseParams, getGoalParams } from '@/lib/periodization';
import { getAtRiskPlayers } from '@/lib/acwr';

// ── helpers ──
const today = new Date();
const fmt = (d: Date, o = 0) => { const w = new Date(d); w.setDate(w.getDate() + o); return w; };
const dateStr = (d: Date) => d.toISOString().slice(0, 10);
const weekLabel = (d: Date, o: number) => fmt(d, o).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
const dayDiff = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000);

// ── microcycle plan persistence ──
const MC_KEY = 'kenshin_microcycle_plans';

interface MicrocyclePlan {
  modules: TrainingModule[];
  formData: PlayerFormData;
  scene: string;
  duration: number;
  goal: string;
  phase: string;
  savedAt: string;
}

function loadMicrocyclePlans(): Record<string, MicrocyclePlan> {
  try { return JSON.parse(localStorage.getItem(MC_KEY) || '{}'); } catch { return {}; }
}

function saveMicrocyclePlan(matchDate: string, dayOffset: number, plan: MicrocyclePlan) {
  const all = loadMicrocyclePlans();
  all[`${matchDate}_${dayOffset}`] = plan;
  // keep only plans for this match week
  const prefix = `${matchDate}_`;
  const cleaned: Record<string, MicrocyclePlan> = {};
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith(prefix) || Object.keys(cleaned).length < 1) cleaned[k] = v;
  }
  try { localStorage.setItem(MC_KEY, JSON.stringify(cleaned)); } catch {}
}

function getMicrocyclePlan(matchDate: string, dayOffset: number): MicrocyclePlan | null {
  const all = loadMicrocyclePlans();
  return all[`${matchDate}_${dayOffset}`] || null;
}

// ── scene config ──
const SCENES = [
  { id: 'gym' as const, label: '力量房', icon: '🏋️', desc: '抗阻力量 · 爆发力 · 协调灵敏 · 肌耐力', hint: '全无球热身 · FIFA 11+' },
  { id: 'pitch' as const, label: '外场', icon: '⚽', desc: '自重力量 · 场地爆发力 · 直线速度 · 专项耐力', hint: '无球/有球热身二选一' },
];

const SCENE_GOALS: Record<string, { id: string; label: string }[]> = {
  gym: [
    { id: 'strength', label: '基础抗阻力量' }, { id: 'power', label: 'SSC爆发力' },
    { id: 'agility', label: '神经协调灵敏' }, { id: 'mas_endurance', label: '局部肌肉耐力' },
  ],
  pitch: [
    { id: 'strength', label: '自重基础力量' }, { id: 'power', label: '场地爆发力' },
    { id: 'speed', label: '直线加速速度' }, { id: 'mas_endurance', label: '专项间歇耐力' },
  ],
};

const DURATIONS = [30, 45, 60, 75, 90];

// ── roster types ──
interface RosterPlayer { id: string; name: string; position: string; number: string; age: number | null; height: number | null; weight: number | null; injuryStatus: 'healthy' | 'minor' | 'out'; injuryNote: string; injuryHistory?: string; disabledExercises?: string[]; }
type PlayerStatus = { name: string; status: 'green' | 'yellow' | 'red'; reason: string; disabledExercises?: string[] };
function loadRoster(): RosterPlayer[] { try { const raw = localStorage.getItem('roster_players'); return raw ? JSON.parse(raw) : []; } catch { return []; } }

/** Map Chinese position name from roster to Position enum */
function mapPosition(cn: string): Position {
  const map: Record<string, Position> = {
    '门将': 'goalkeeper',
    '中后卫': 'defender', '左后卫': 'wingback', '右后卫': 'wingback',
    '后腰': 'midfielder', '中前卫': 'midfielder', '前腰': 'midfielder',
    '中锋': 'center_forward', '影锋': 'forward', '边锋': 'winger',
    '左边翼卫': 'wingback', '右边翼卫': 'wingback',
  };
  return map[cn] || 'midfielder';
}

// ── edit modal state ──
interface EditState {
  moduleType: string;
  category: string;
  index: number;
  exercise: any;
}

export default function CoachWorkbench() {
  const { modules, planId, generate, loadModules } = useTraining();
  const [scene, setScene] = useState<'gym' | 'pitch'>('gym');
  const [goal, setGoal] = useState('strength');
  const [duration, setDuration] = useState(60);
  const [phase, setPhase] = useState<SeasonPhase>('competition');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [matchDate, setMatchDate] = useState<string>(() => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return dateStr(d); });
  const [planMode, setPlanMode] = useState<'team' | 'individual'>('team');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  // ── coach profile ──
  const [coachCert, setCoachCert] = useState('b');
  const [coachRole, setCoachRole] = useState('semi_pro');
  const [leagueTag, setLeagueTag] = useState('china_league_two');
  const [playerCount, setPlayerCount] = useState(20);

  // ── exercise editor ──
  const [editState, setEditState] = useState<EditState | null>(null);

  // ── MD calculation from match date ──
  const mdDay = useMemo(() => {
    const match = new Date(matchDate + 'T00:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return dayDiff(now, match);
  }, [matchDate]);

  const mdLabel = useMemo(() => {
    if (mdDay === 0) return '比赛日';
    if (mdDay > 0) return `MD-${mdDay}`;
    return `MD+${Math.abs(mdDay)}`;
  }, [mdDay]);

  // ── current day offset for saving ──
  const [activeDayOffset, setActiveDayOffset] = useState(mdDay);

  // ── player status from roster + ACWR ──
  const [players, setPlayers] = useState<PlayerStatus[]>([]);
  useEffect(() => {
    const roster = loadRoster();
    const atRisk = getAtRiskPlayers();
    const results: PlayerStatus[] = roster.map(p => {
      if (p.injuryStatus !== 'healthy') return { name: p.name, status: 'red' as const, reason: p.injuryNote || '伤病 · 动作已屏蔽', disabledExercises: p.disabledExercises };
      const risk = atRisk.find(r => r.name === p.name);
      if (risk && risk.result.status === 'danger') return { name: p.name, status: 'yellow' as const, reason: risk.result.message };
      if (risk && risk.result.status === 'warning') return { name: p.name, status: 'yellow' as const, reason: risk.result.message };
      return { name: p.name, status: 'green' as const, reason: '正常训练' };
    });
    setPlayers(results.length > 0 ? results : []);
  }, []);

  // ── pick up preset from planning page ──
  useEffect(() => {
    try {
      const preset = localStorage.getItem('kenshin_workbench_preset');
      if (preset) {
        const { scene: s, goal: g, duration: d } = JSON.parse(preset);
        if (s) setScene(s);
        if (g) setGoal(g);
        if (d) setDuration(d);
        localStorage.removeItem('kenshin_workbench_preset');
      }
    } catch {}
  }, []);

  const { greens, yellows, reds } = useMemo(() => ({
    greens: players.filter(p => p.status === 'green').length,
    yellows: players.filter(p => p.status === 'yellow').length,
    reds: players.filter(p => p.status === 'red').length,
  }), [players]);
  const atRiskReasons = useMemo(() => players.filter(p => p.status !== 'green'), [players]);

  // ── batch player selection ──
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const togglePlayerSelect = (name: string) => {
    setSelectedPlayers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const selectAllHealthy = () => {
    setSelectedPlayers(new Set(players.filter(p => p.status === 'green').map(p => p.name)));
  };

  // ── load recommendation based on MD ──
  useEffect(() => {
    if (mdDay >= 4) { setScene('gym'); setGoal('strength'); }          // MD-4+: heavy strength
    else if (mdDay === 3) { setScene('gym'); setGoal('strength'); }    // MD-3: strength+power
    else if (mdDay === 2) { setScene('gym'); setGoal('power'); }       // MD-2: power+speed维持
    else if (mdDay === 1) { setScene('pitch'); setGoal('speed'); }     // MD-1: 赛前激活
    else if (mdDay === 0) { setScene('pitch'); setGoal('speed'); }     // MD: light activation
    else if (mdDay === -1) { setScene('gym'); setGoal('mas_endurance'); } // MD+1: active recovery gym
    else if (mdDay === -2) { setScene('gym'); setGoal('strength'); }   // MD+2: 弱链纠正
    else { setScene('gym'); setGoal('strength'); }                      // MD+3+: normal training
  }, [mdDay]);

  // ── build form data helper ──
  const buildFormData = useCallback((): PlayerFormData => {
    // ── Individual mode: build form for specific player ──
    if (planMode === 'individual' && selectedPlayerId) {
      const roster = loadRoster();
      const player = roster.find(p => p.id === selectedPlayerId);
      if (player) {
        return {
          role: 'coach', name: player.name, gender: 'male',
          position: mapPosition(player.position),
          age: player.age, height: player.height, weight: player.weight, years: null,
          injuryHistory: player.injuryHistory || player.injuryNote || '',
          goal: goal as TrainingGoal, phase,
          injurySites: [],
          weakness: player.disabledExercises?.join(',') || '',
          coachCert: coachCert as any, coachRole: coachRole as any, leagueTag: leagueTag as any,
          tacticalThemes: [], equipmentAvailable: [],
          trainingDuration: duration, playerCount: 1,
        };
      }
    }

    // ── Team mode ──
    const relevantPlayers = selectedPlayers.size > 0
      ? players.filter(p => selectedPlayers.has(p.name))
      : players;
    const injuredPlayers = relevantPlayers.filter(p => p.status === 'red');
    const injuryList = injuredPlayers.map(p => p.name);
    const acwrWarnings = relevantPlayers.filter(p => p.status === 'yellow').map(p => p.reason);
    const allDisabled = Array.from(new Set(relevantPlayers.flatMap(p => p.disabledExercises || [])));
    const playerLabel = selectedPlayers.size > 0 ? `已选${selectedPlayers.size}人` : `全队${players.length}人`;
    return {
      role: 'coach', name: '', gender: 'male', position: null,
      age: null, height: null, weight: null, years: null,
      injuryHistory: `${playerLabel}: ${injuryList.join('、')} | 禁用动作: ${allDisabled.join(',')} | ACWR预警: ${acwrWarnings.join('; ')}`,
      goal: goal as TrainingGoal, phase,
      injurySites: [], weakness: '',
      coachCert: coachCert as any, coachRole: coachRole as any, leagueTag: leagueTag as any,
      tacticalThemes: [], equipmentAvailable: [],
      trainingDuration: duration, playerCount,
    };
  }, [players, goal, phase, coachCert, coachRole, leagueTag, duration, playerCount, selectedPlayers, planMode, selectedPlayerId]);

  // ── generate ──
  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    setShowPlan(true);
    setActiveDayOffset(mdDay);

    const fd = buildFormData();

    try { await generate(fd, undefined, scene); }
    catch (e: any) {
      setGenError(e?.message || 'AI生成失败，请重试');
      console.error('Generate failed:', e);
    }
    setGenerating(false);
  };

  // ── auto-save plan after generation completes ──
  const prevModulesLen = useRef(0);
  const modulesRef = useRef(modules);
  modulesRef.current = modules;
  useEffect(() => {
    if (!generating && modules.length > 0 && modules.length !== prevModulesLen.current) {
      prevModulesLen.current = modules.length;
      // Auto-save to microcycle plan store
      const fd = buildFormData();
      saveMicrocyclePlan(matchDate, activeDayOffset, {
        modules: [...modules],
        formData: fd,
        scene,
        duration,
        goal,
        phase,
        savedAt: new Date().toISOString(),
      });
    }
  }, [generating, modules.length]);

  // ── load plan for a microcycle day ──
  const loadPlanForDay = useCallback((dayOffset: number) => {
    const plan = getMicrocyclePlan(matchDate, dayOffset);
    if (plan) {
      loadModules(plan.modules, plan.formData);
      setScene(plan.scene as 'gym' | 'pitch');
      setGoal(plan.goal);
      setDuration(plan.duration);
      setPhase(plan.phase as SeasonPhase);
      setShowPlan(true);
      setActiveDayOffset(dayOffset);
    } else {
      // No saved plan — set scene/goal recommendation for this day
      if (dayOffset >= 4) { setScene('gym'); setGoal('strength'); }
      else if (dayOffset === 3) { setScene('gym'); setGoal('strength'); }
      else if (dayOffset === 2) { setScene('gym'); setGoal('power'); }
      else if (dayOffset === 1) { setScene('pitch'); setGoal('speed'); }
      else if (dayOffset === 0) { setScene('pitch'); setGoal('speed'); }
      else if (dayOffset === -1) { setScene('gym'); setGoal('mas_endurance'); }
      else if (dayOffset === -2) { setScene('gym'); setGoal('strength'); }
      else { setScene('gym'); setGoal('strength'); }
      setActiveDayOffset(dayOffset);
      setShowPlan(false);
    }
  }, [matchDate, loadModules]);

  // ── exercise editing ──
  const handleEditExercise = useCallback((moduleType: string, category: string, index: number, exercise: any) => {
    setEditState({ moduleType, category, index, exercise });
  }, []);

  const handleSaveExercise = useCallback((updated: EditableExercise) => {
    if (!editState) return;
    // Update modules in useTraining state
    const newModules = modulesRef.current.map(m => {
      if (m.module !== editState.moduleType) return m;

      if (m.module === 'position_training') {
        const pm = { ...m };
        if (editState.category === 'upper_limb') {
          pm.upper_limb = [...pm.upper_limb];
          pm.upper_limb[editState.index] = { ...pm.upper_limb[editState.index], ...updated };
        } else if (editState.category === 'lower_limb') {
          pm.lower_limb = [...pm.lower_limb];
          pm.lower_limb[editState.index] = { ...pm.lower_limb[editState.index], ...updated };
        } else if (editState.category === 'core') {
          pm.core = [...pm.core];
          pm.core[editState.index] = { ...pm.core[editState.index], ...updated };
        } else if (editState.category === 'exercises') {
          // ability_training exercises live in a separate module
          return m;
        }
        return pm;
      }

      if (m.module === 'ability_training' && editState.category === 'exercises') {
        const am = { ...m };
        am.exercises = [...am.exercises];
        am.exercises[editState.index] = { ...am.exercises[editState.index], ...updated };
        return am;
      }

      return m;
    });

    // Load updated modules
    loadModules(newModules);

    // Re-save to microcycle plan store
    const fd = buildFormData();
    saveMicrocyclePlan(matchDate, activeDayOffset, {
      modules: newModules,
      formData: fd,
      scene,
      duration,
      goal,
      phase,
      savedAt: new Date().toISOString(),
    });

    setEditState(null);
  }, [editState, loadModules, buildFormData, matchDate, activeDayOffset, scene, duration, goal, phase]);

  const isLoading = generating;

  // ── check if current day has a plan ──
  const hasPlanForToday = useMemo(() => {
    return !!getMicrocyclePlan(matchDate, mdDay);
  }, [matchDate, mdDay, modules]);

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">
            {PHASE_LABELS[phase]} · <span className="text-[#d92525]">{mdLabel}</span>
          </h2>
          <p className="text-[10px] text-gray-600">{weekLabel(today, 0)}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-500">比赛日</label>
          <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-xs text-white" />
          <select value={phase} onChange={e => setPhase(e.target.value as SeasonPhase)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-xs text-white">
            <option value="preseason">季前备战</option>
            <option value="competition">联赛期</option>
            <option value="recovery">赛后恢复</option>
            <option value="offseason">休赛补强</option>
          </select>
        </div>
      </div>

      {/* ═══ PLAN MODE TOGGLE ═══ */}
      <div className="flex gap-1 bg-[#0d0d0d] border border-[#222] rounded-xl p-1">
        <button onClick={() => setPlanMode('team')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
            planMode === 'team' ? 'bg-[#d92525] text-white' : 'text-gray-500 hover:text-white'
          }`}>👥 全队方案</button>
        <button onClick={() => setPlanMode('individual')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
            planMode === 'individual' ? 'bg-[#d92525] text-white' : 'text-gray-500 hover:text-white'
          }`}>🧑 个体方案</button>
      </div>

      {/* Individual player selector */}
      {planMode === 'individual' && (() => {
        const roster = loadRoster();
        return (
          <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3">
            <label className="text-[10px] text-gray-500 block mb-2">选择球员</label>
            {roster.length === 0 ? (
              <p className="text-[10px] text-gray-600">暂无花名册 · <a href="/roster" className="text-[#d92525] underline">去录入球员</a></p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                {roster.map(p => (
                  <button key={p.id} onClick={() => setSelectedPlayerId(p.id)}
                    className={`text-[10px] px-2 py-1 rounded transition whitespace-nowrap ${
                      selectedPlayerId === p.id
                        ? 'bg-[#d92525] text-white'
                        : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                    }`}>
                    {p.name} · {p.position || '?'}
                    {p.injuryStatus !== 'healthy' && (p.injuryStatus === 'out' ? ' 🔴' : ' 🟡')}
                  </button>
                ))}
              </div>
            )}
            {selectedPlayerId && (() => {
              const p = roster.find(r => r.id === selectedPlayerId);
              if (!p) return null;
              return (
                <div className="mt-2 p-2 bg-[#1a1a1a] rounded-lg text-[10px] text-gray-400">
                  {p.age && <span>{p.age}岁 · </span>}
                  {p.height && <span>{p.height}cm · </span>}
                  {p.weight && <span>{p.weight}kg · </span>}
                  <span className={p.injuryStatus === 'healthy' ? 'text-green-400' : p.injuryStatus === 'minor' ? 'text-yellow-400' : 'text-red-400'}>
                    {p.injuryStatus === 'healthy' ? '健康' : p.injuryStatus === 'minor' ? '轻伤' : '缺阵'}
                  </span>
                  {p.injuryNote && <span className="ml-1">— {p.injuryNote}</span>}
                  {p.injuryHistory && <span className="block text-[9px] text-gray-600 mt-0.5">📋 {p.injuryHistory}</span>}
                  {(p.disabledExercises?.length ?? 0) > 0 && <span className="block text-[9px] text-orange-500/70 mt-0.5">🚫 禁用: {(p.disabledExercises || []).join('、')}</span>}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ═══ SCENE + GOAL ═══ */}
      <div className="grid grid-cols-2 gap-3">
        {SCENES.map(s => (
          <button key={s.id} onClick={() => { setScene(s.id); setGoal(SCENE_GOALS[s.id][0].id); }}
            className={`p-4 rounded-xl border text-left transition ${
              scene === s.id ? 'border-[#d92525] bg-[#d92525]/5' : 'border-[#222] bg-[#0d0d0d] hover:border-[#444]'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{s.icon}</span>
              <span className={`text-sm font-bold ${scene === s.id ? 'text-[#d92525]' : 'text-white'}`}>{s.label}</span>
            </div>
            <p className="text-[10px] text-gray-500">{s.desc}</p>
            <p className="text-[9px] text-gray-600 mt-1">{s.hint}</p>
          </button>
        ))}
      </div>

      {/* Goal sub-select + Duration */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-gray-500">目标</span>
        <div className="flex gap-1">
          {(SCENE_GOALS[scene] || []).map(g => (
            <button key={g.id} onClick={() => setGoal(g.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition ${
                goal === g.id ? 'bg-[#d92525] text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
              }`}>{g.label}</button>
          ))}
        </div>
        <span className="text-[10px] text-gray-500 ml-3">时长</span>
        <div className="flex gap-1">
          {DURATIONS.map(d => (
            <button key={d} onClick={() => setDuration(d)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition ${duration === d ? 'bg-[#d92525] text-white' : 'bg-[#1a1a1a] text-gray-400'}`}>{d}min</button>
          ))}
        </div>
      </div>

      {/* ═══ PERIODIZATION LIVE PARAMS ═══ */}
      {(() => {
        const pp = getPhaseParams(phase);
        const gp = getGoalParams(goal);
        return (
          <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 text-[10px]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-400">
              <span className="text-gray-500">📐 周期化参考</span>
              <span><b className="text-white">{pp.labelCn}</b>: {pp.intensityPercent[0]}-{pp.intensityPercent[1]}%1RM · {pp.repsRange[0]}-{pp.repsRange[1]}次 · {pp.setsRange[0]}-{pp.setsRange[1]}组 · 间歇{pp.restBetweenSets[0]}-{pp.restBetweenSets[1]}s</span>
              {gp && (
                <span className="text-[#d92525]">🎯 {gp.labelCn}: {gp.percent1RM[0]}-{gp.percent1RM[1]}%1RM · {gp.setsReps} · 间歇{gp.rest} · 节奏{gp.tempo}</span>
              )}
              <span className="text-gray-600">每周{pp.weeklyFrequency}次 · {pp.volumeTrend === 'increasing' ? '↑增量' : pp.volumeTrend === 'tapering' ? '↓减量' : '→维持'}</span>
            </div>
          </div>
        );
      })()}

      {/* ═══ PLAYER STATUS ═══ */}
      {planMode === 'team' && (
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-300 font-semibold">全队 {players.length || '?'} 人</span>
          <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-green-500" /> {greens}</span>
          <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-yellow-500" /> {yellows}</span>
          <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-red-500" /> {reds}</span>
          {players.length > 0 && (
            <>
              <span className="text-gray-600 mx-1">|</span>
              <button onClick={selectAllHealthy} className="text-[10px] text-gray-500 hover:text-white transition">全选健康</button>
              <button onClick={() => setSelectedPlayers(new Set())} className="text-[10px] text-gray-500 hover:text-white transition">清空</button>
              {selectedPlayers.size > 0 && <span className="text-[10px] text-[#d92525]">已选{selectedPlayers.size}人</span>}
            </>
          )}
        </div>
        {players.length === 0 ? (
          <p className="text-[10px] text-gray-600">暂无花名册数据 · <a href="/roster" className="text-[#d92525] underline">去录入球员</a></p>
        ) : atRiskReasons.length === 0 ? (
          <div>
            <p className="text-[10px] text-green-400 mb-2">全队状态良好</p>
            <div className="flex flex-wrap gap-1">
              {players.map(p => (
                <button key={p.name} onClick={() => togglePlayerSelect(p.name)}
                  className={`text-[10px] px-2 py-1 rounded transition ${
                    selectedPlayers.has(p.name) ? 'bg-[#d92525]/20 text-[#d92525] ring-1 ring-[#d92525]' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {atRiskReasons.map(p => (
              <button key={p.name} onClick={() => togglePlayerSelect(p.name)}
                className={`flex items-center gap-2 text-[10px] p-2 rounded-lg mb-1 w-full text-left transition cursor-pointer ${
                  selectedPlayers.has(p.name) ? 'ring-1 ring-[#d92525]' : ''
                } ${
                  p.status === 'red' ? 'bg-red-500/10 border border-red-500/20' : 'bg-yellow-500/5 border border-yellow-500/20'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'red' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                <span className="text-white font-medium">{p.name}</span>
                <span className="text-gray-500">{p.reason}</span>
                {selectedPlayers.has(p.name) && <span className="ml-auto text-[#d92525] text-[9px]">✓</span>}
              </button>
            ))}
            {/* Also show healthy players for selection */}
            {players.filter(p => p.status === 'green').length > 0 && (
              <details className="mt-2">
                <summary className="text-[10px] text-gray-600 cursor-pointer hover:text-gray-400">健康球员 · 点击选择</summary>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {players.filter(p => p.status === 'green').map(p => (
                    <button key={p.name} onClick={() => togglePlayerSelect(p.name)}
                      className={`text-[10px] px-2 py-1 rounded transition ${
                        selectedPlayers.has(p.name) ? 'bg-[#d92525]/20 text-[#d92525] ring-1 ring-[#d92525]' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                      }`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
      )}

      {/* ═══ COACH SETTINGS (collapsible) ═══ */}
      <details className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 text-[10px] text-gray-500">
        <summary className="cursor-pointer text-gray-400">⚙️ 教练档案 · 队员{playerCount}人 · {leagueTag}</summary>
        <div className="flex flex-wrap gap-2 mt-2">
          <select value={coachCert} onChange={e => setCoachCert(e.target.value)} className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white">
            <option value="pro">PRO职业级</option><option value="a">A级</option><option value="b">B级</option><option value="c">C级</option><option value="d">D级</option><option value="none">无证</option>
          </select>
          <select value={coachRole} onChange={e => setCoachRole(e.target.value)} className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white">
            <option value="pro">职业教练</option><option value="semi_pro">半职业</option><option value="amateur">业余</option><option value="youth">青训</option><option value="campus">校园</option>
          </select>
          <select value={leagueTag} onChange={e => setLeagueTag(e.target.value)} className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white">
            <option value="chinese_super_league">中超</option><option value="china_league_one">中甲</option><option value="china_league_two">中乙</option><option value="amateur_team">业余队</option>
          </select>
          <input type="number" value={playerCount} onChange={e => setPlayerCount(Number(e.target.value))} min={8} max={35}
            className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white w-16" placeholder="人数" />
        </div>
      </details>

      {/* ═══ GENERATE ═══ */}
      <button onClick={handleGenerate} disabled={isLoading}
        className="w-full py-4 bg-[#d92525] hover:bg-[#b71d1d] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
        {isLoading ? <><span className="animate-spin">⏳</span> 生成中…</> : hasPlanForToday ? '📋 已有方案 · 重新生成' : planMode === 'individual' && selectedPlayerId ? `⚡ 生成${mdLabel}个体方案` : `⚡ 生成${mdLabel}训练方案`}
      </button>

      {/* Error display */}
      {genError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
          <span className="text-red-400 shrink-0 mt-0.5">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-red-400 text-xs font-medium">{genError}</p>
            <button onClick={() => { setGenError(null); handleGenerate(); }} className="text-[10px] text-red-400 underline hover:text-red-300 mt-1">点击重试</button>
          </div>
          <button onClick={() => setGenError(null)} className="text-gray-500 hover:text-white shrink-0 text-xs">✕</button>
        </div>
      )}

      {/* ═══ PLAN OUTPUT ═══ */}
      {showPlan && modules.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#222] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#222]">
            <h3 className="text-sm font-bold text-white">
              {planMode === 'individual' && selectedPlayerId ? `🧑 ${loadRoster().find(p => p.id === selectedPlayerId)?.name || '个体'} · ` : ''}
              {scene === 'gym' ? '🏋️ 力量房' : '⚽ 外场'} · {duration}min · {activeDayOffset === 0 ? '比赛日' : activeDayOffset > 0 ? `MD-${activeDayOffset}` : `MD+${Math.abs(activeDayOffset)}`} · 职业三段式
            </h3>
            <div className="flex items-center gap-2">
              <ExportTable modules={modules} formData={buildFormData()} />
              <WorkoutTimer modules={modules} planId={planId ?? undefined} onClose={() => {}} />
              <button onClick={() => setShowPlan(false)} className="text-[10px] text-gray-500 hover:text-white">收起</button>
            </div>
          </div>
          <div className="p-4">
            <PhysicalTab modules={modules} position={null} onUpdateExercise={handleEditExercise} />
          </div>
        </div>
      )}

      {/* ═══ MICROCYCLE ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-3">📅 比赛周微周期</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const dayOffset = mdDay - 3 + i;
            const label = dayOffset === 0 ? 'MD' : dayOffset > 0 ? `MD-${dayOffset}` : `MD+${Math.abs(dayOffset)}`;
            const isToday = dayOffset === mdDay;
            const isMatch = dayOffset === 0;
            const isPast = dayOffset > mdDay;
            const hasPlan = !!getMicrocyclePlan(matchDate, dayOffset);
            const isSelected = selectedDay === i;
            return (
              <button key={i} onClick={() => {
                setSelectedDay(isSelected ? null : i);
                if (!isSelected) loadPlanForDay(dayOffset);
              }}
                className={`rounded-lg p-2 text-center border transition cursor-pointer relative ${
                  isSelected ? 'ring-1 ring-[#d92525]' : ''
                } ${
                  isMatch ? 'border-[#d92525]/40 bg-[#d92525]/5' :
                  isToday ? 'border-white/20 bg-white/5' :
                  isPast ? 'border-green-500/20 bg-green-500/5 opacity-60' :
                  'border-[#222] bg-[#111] hover:border-[#444]'
                }`}>
                <div className={`text-[9px] font-bold ${isMatch ? 'text-[#d92525]' : isToday ? 'text-white' : 'text-gray-500'}`}>{label}</div>
                <div className="text-[8px] text-gray-600 mt-0.5">{isMatch ? '⚽比赛' : isPast ? '✓完成' : isToday ? '←今天' : weekLabel(fmt(new Date(matchDate), dayOffset), 0).slice(-2)}</div>
                <div className="text-[7px] text-gray-500 mt-1 leading-tight">
                  {hasPlan ? '📋 已有方案' : isMatch ? '⚽比赛日' : dayOffset >= 4 ? '🏋️力量' : dayOffset === 3 ? '🏋️力量+爆发' : dayOffset === 2 ? '🏋️爆发力' : dayOffset === 1 ? '⚡赛前激活' : dayOffset === -1 ? '🧊主动恢复' : dayOffset === -2 ? '🔧弱链纠正' : '🏋️正常训练'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <AIAssistant />

      {/* ═══ EXERCISE EDITOR MODAL ═══ */}
      {editState && (
        <ExerciseEditor
          exercise={{
            name: editState.exercise?.name || '',
            sets: typeof editState.exercise?.sets === 'number' ? editState.exercise.sets : Array.isArray(editState.exercise?.sets) ? editState.exercise.sets[0] : 3,
            reps: typeof editState.exercise?.reps === 'number' ? editState.exercise.reps : Array.isArray(editState.exercise?.reps) ? editState.exercise.reps[0] : 10,
            load: editState.exercise?.load || 'BW',
            rest: editState.exercise?.rest || 90,
            rpe: editState.exercise?.rpe || 7,
          }}
          onSave={handleSaveExercise}
          onCancel={() => setEditState(null)}
        />
      )}
    </div>
  );
}
