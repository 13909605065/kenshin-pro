'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTraining } from '@/hooks/useTraining';
import { PhysicalTab } from './tabs/PhysicalTab';
import { WorkoutTimer } from './WorkoutTimer';
import { ExportTable } from './ExportTable';
import AIAssistant from './AIAssistant';
import { ExerciseEditor } from './ExerciseEditor';
import { TrainingLogPanel } from './TrainingLogPanel';
import type { EditableExercise } from './ExerciseEditor';
import type { PlayerFormData, SeasonPhase, TrainingGoal, TrainingModule, Position } from '@/lib/types';
import { PHASE_LABELS } from '@/lib/constants';
import { getPhaseParams, getGoalParams } from '@/lib/periodization';
import { getFitnessProfile, fitnessSummary, strengthAssessment, speedAssessment } from '@/lib/fitness-store';
import { getAtRiskPlayers, calcACWR, getLoadData, type LoadEntry } from '@/lib/acwr';
import { calcRecoveryScore, getRecoveryEmoji, type RecoveryInput } from '@/lib/recovery-score';

// ── helpers ──
const today = new Date();
const fmt = (d: Date, o = 0) => { const w = new Date(d); w.setDate(w.getDate() + o); return w; };
const dateStr = (d: Date) => d.toISOString().slice(0, 10);
const weekLabel = (d: Date, o: number) => fmt(d, o).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
const dayDiff = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000);

// ═══════════════════════════════════════════════
// Chinese weekday helper
// ═══════════════════════════════════════════════
const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const todayWeekday = WEEKDAY_CN[today.getDay()];
const todayDateStr = `${today.getMonth() + 1}月${today.getDate()}日`;

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

// ── goal/scene label lookups ──
const GOAL_LABELS: Record<string, string> = {
  strength: '力量', power: '爆发力', speed: '速度', agility: '灵敏', mas_endurance: '耐力',
};
const SCENE_LABELS: Record<string, string> = { gym: '力量房', pitch: '外场' };

// ── roster types ──
interface RosterPlayer { id: string; name: string; position: string; number: string; age: number | null; height: number | null; weight: number | null; injuryStatus: 'healthy' | 'minor' | 'out'; injuryNote: string; injuryHistory?: string; disabledExercises?: string[]; }
type PlayerStatus = { name: string; status: 'green' | 'yellow' | 'red'; reason: string; disabledExercises?: string[] };
function loadRoster(): RosterPlayer[] { try { const raw = localStorage.getItem('roster_players'); return raw ? JSON.parse(raw) : []; } catch { return []; } }

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

// ── MD recommendation map ──
function getMDRecommendation(mdDay: number): { scene: 'gym' | 'pitch'; goal: string; label: string } {
  if (mdDay >= 4) return { scene: 'gym', goal: 'strength', label: '力量房·力量' };
  if (mdDay === 3) return { scene: 'gym', goal: 'strength', label: '力量房·力量+爆发' };
  if (mdDay === 2) return { scene: 'gym', goal: 'power', label: '力量房·爆发力' };
  if (mdDay === 1) return { scene: 'pitch', goal: 'speed', label: '外场·赛前激活' };
  if (mdDay === 0) return { scene: 'pitch', goal: 'speed', label: '外场·比赛日激活' };
  if (mdDay === -1) return { scene: 'gym', goal: 'mas_endurance', label: '力量房·主动恢复' };
  if (mdDay === -2) return { scene: 'gym', goal: 'strength', label: '力量房·弱链纠正' };
  return { scene: 'gym', goal: 'strength', label: '力量房·正常训练' };
}

// ── edit modal state ──
interface EditState {
  moduleType: string;
  category: string;
  index: number;
  exercise: any;
}

export default function CoachWorkbench() {
  const { modules, planId, generate, loadModules, isOffline } = useTraining();
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── coach profile ──
  const [coachCert, setCoachCert] = useState('b');
  const [coachRole, setCoachRole] = useState('semi_pro');
  const [leagueTag, setLeagueTag] = useState('china_league_two');
  const [playerCount, setPlayerCount] = useState(20);

  // ── exercise editor + training log ──
  const [editState, setEditState] = useState<EditState | null>(null);
  const [showLog, setShowLog] = useState(false);

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

  const mdRecommendation = useMemo(() => getMDRecommendation(mdDay), [mdDay]);

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

  // ── Team ACWR calculation ──
  const teamACWR = useMemo(() => {
    const allLoads = getLoadData();
    const allEntries: LoadEntry[] = [];
    for (const entries of Object.values(allLoads)) {
      allEntries.push(...entries);
    }
    if (allEntries.length === 0) return null;
    // sort descending by date
    allEntries.sort((a, b) => b.date.localeCompare(a.date));
    return calcACWR(allEntries.slice(0, 28));
  }, []);

  // ── Team recovery score ──
  const recoveryScore = useMemo(() => {
    const input: RecoveryInput = {
      lastSessionRPE: null,
      lastSessionDate: null,
      sleepHours: null,
      sleepQuality: null,
      morningHR: null,
      restingHR: null,
      muscleSoreness: null,
      stressLevel: null,
      acwr: teamACWR?.acwr ?? null,
      hoursSinceLastSession: null,
    };
    return calcRecoveryScore(input);
  }, [teamACWR]);

  // ── load recommendation based on MD ──
  useEffect(() => {
    const rec = getMDRecommendation(mdDay);
    setScene(rec.scene);
    setGoal(rec.goal);
  }, [mdDay]);

  // ── build form data helper ──
  const buildFormData = useCallback((): PlayerFormData => {
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
          weakness: [
            player.disabledExercises?.join(',') || '',
            fitnessSummary(getFitnessProfile(selectedPlayerId)),
            player.weight ? strengthAssessment(getFitnessProfile(selectedPlayerId), player.weight) : '',
            speedAssessment(getFitnessProfile(selectedPlayerId)),
          ].filter(Boolean).join(' | '),
          coachCert: coachCert as any, coachRole: coachRole as any, leagueTag: leagueTag as any,
          tacticalThemes: [], equipmentAvailable: [],
          trainingDuration: duration, playerCount: 1,
        };
      }
    }

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

  // ── auto-save plan after generation ──
  const prevModulesLen = useRef(0);
  const modulesRef = useRef(modules);
  modulesRef.current = modules;
  useEffect(() => {
    if (!generating && modules.length > 0 && modules.length !== prevModulesLen.current) {
      prevModulesLen.current = modules.length;
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
      const rec = getMDRecommendation(dayOffset);
      setScene(rec.scene);
      setGoal(rec.goal);
      setActiveDayOffset(dayOffset);
      setShowPlan(false);
    }
  }, [matchDate, loadModules]);

  // ── Quick actions ──
  const reuseLastWeek = useCallback(() => {
    const lastWeekMatchDate = dateStr(fmt(new Date(matchDate), -7));
    const plan = getMicrocyclePlan(lastWeekMatchDate, mdDay);
    if (plan) {
      loadModules(plan.modules, plan.formData);
      setScene(plan.scene as 'gym' | 'pitch');
      setGoal(plan.goal);
      setDuration(plan.duration);
      setPhase(plan.phase as SeasonPhase);
      setShowPlan(true);
      setActiveDayOffset(mdDay);
    }
  }, [matchDate, mdDay, loadModules]);

  const loadFromPlanning = useCallback(() => {
    try {
      const preset = localStorage.getItem('kenshin_periodization_preset');
      if (preset) {
        const { scene: s, goal: g, duration: d, phase: ph } = JSON.parse(preset);
        if (s) setScene(s);
        if (g) setGoal(g);
        if (d) setDuration(d);
        if (ph) setPhase(ph);
      }
    } catch {}
  }, []);

  // ── exercise editing ──
  const handleEditExercise = useCallback((moduleType: string, category: string, index: number, exercise: any) => {
    setEditState({ moduleType, category, index, exercise });
  }, []);

  const handleSaveExercise = useCallback((updated: EditableExercise) => {
    if (!editState) return;
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

    loadModules(newModules);

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

  // ── check if last week has a plan for same MD ──
  const hasLastWeekPlan = useMemo(() => {
    const lastWeekMatchDate = dateStr(fmt(new Date(matchDate), -7));
    return !!getMicrocyclePlan(lastWeekMatchDate, mdDay);
  }, [matchDate, mdDay, modules]);

  // ── determine recovery level display ──
  const recoveryEmoji = getRecoveryEmoji(recoveryScore.level);
  const acwrDisplay = teamACWR ? `${teamACWR.acwr.toFixed(1)} (${teamACWR.status === 'safe' ? '安全' : teamACWR.status === 'warning' ? '关注' : '危险'})` : '--';

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-10">

      {/* ═══════════════════════════════════════════════
          DASHBOARD HEADER — overview at a glance
          ═══════════════════════════════════════════════ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-5 space-y-4">

        {/* Row 1: Date + MD + Scene recommendation */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">
                {todayDateStr} {todayWeekday}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                mdDay === 0 ? 'bg-[#d92525] text-white' :
                mdDay > 0 ? 'bg-[#d92525]/20 text-[#d92525]' :
                'bg-green-500/20 text-green-400'
              }`}>
                {mdLabel}
              </span>
              <span className="text-xs text-gray-500">
                · {mdRecommendation.label}
              </span>
            </div>
            <p className="text-[10px] text-gray-600 mt-0.5">{PHASE_LABELS[phase]} · 比赛日 {matchDate}</p>
          </div>

          {/* Phase quick toggle */}
          <select value={phase} onChange={e => setPhase(e.target.value as SeasonPhase)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-xs text-white">
            <option value="preseason">季前备战</option>
            <option value="competition">联赛期</option>
            <option value="recovery">赛后恢复</option>
            <option value="offseason">休赛补强</option>
          </select>
        </div>

        {/* Row 2: Player status bar + ACWR + Recovery */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Player count */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-300 font-semibold">全队 {players.length || '?'}人</span>
            {players.length > 0 ? (
              <>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-green-500" /> {greens}</span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-yellow-500" /> {yellows}</span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-red-500" /> {reds}</span>
              </>
            ) : (
              <span className="text-[10px] text-gray-600">无花名册</span>
            )}
          </div>

          {/* ACWR */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">ACWR:</span>
            <span className={`text-[10px] font-mono font-medium ${
              teamACWR?.status === 'safe' ? 'text-green-400' :
              teamACWR?.status === 'warning' ? 'text-yellow-400' :
              teamACWR?.status === 'danger' ? 'text-red-400' :
              'text-gray-500'
            }`}>
              {acwrDisplay}
            </span>
          </div>

          {/* Recovery Score */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">恢复:</span>
            <span className="text-[10px] font-medium">
              {recoveryEmoji} {recoveryScore.level === 'green' ? '正常训练' : recoveryScore.level === 'yellow' ? '降低负荷' : '主动恢复'}
            </span>
            <span className="text-[9px] text-gray-600">({recoveryScore.score}分)</span>
          </div>
        </div>

        {/* Row 3: Recommendation */}
        <div className="flex items-center gap-2 p-2.5 bg-[#1a1a1a] rounded-lg">
          <span className="text-[10px] text-gray-500">推荐:</span>
          <span className="text-xs font-bold text-white">
            {SCENE_LABELS[mdRecommendation.scene]} · {GOAL_LABELS[mdRecommendation.goal] || mdRecommendation.goal} · {duration}min
          </span>
          {recoveryScore.adjustments.length > 0 && (
            <span className="text-[9px] text-yellow-400/80 truncate max-w-[240px]">
              ⚠ {recoveryScore.adjustments[0]}
            </span>
          )}
        </div>

        {/* Row 4: Plan mode toggle */}
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
                const fit = getFitnessProfile(selectedPlayerId);
                const hasFit = fit.squat1RM || fit.sprint30m || fit.yoYoIR1 || fit.verticalJump;
                return (
                  <div className="mt-2 p-2 bg-[#1a1a1a] rounded-lg text-[10px] text-gray-400 space-y-1">
                    <div>
                      {p.age && <span>{p.age}岁 · </span>}
                      {p.height && <span>{p.height}cm · </span>}
                      {p.weight && <span>{p.weight}kg · </span>}
                      <span className={p.injuryStatus === 'healthy' ? 'text-green-400' : p.injuryStatus === 'minor' ? 'text-yellow-400' : 'text-red-400'}>
                        {p.injuryStatus === 'healthy' ? '健康' : p.injuryStatus === 'minor' ? '轻伤' : '缺阵'}
                      </span>
                      {p.injuryNote && <span className="ml-1">— {p.injuryNote}</span>}
                    </div>
                    {p.injuryHistory && <div className="text-[9px] text-gray-600">📋 {p.injuryHistory}</div>}
                    {(p.disabledExercises?.length ?? 0) > 0 && <div className="text-[9px] text-orange-500/70">🚫 禁用: {(p.disabledExercises || []).join('、')}</div>}
                    {hasFit && (
                      <div className="border-t border-[#333] pt-1.5 mt-1">
                        <span className="text-green-400 font-medium">📊 体能数据</span>
                        <span className="text-gray-500 ml-1">{fitnessSummary(fit)}</span>
                        {p.weight && fit.squat1RM && <div className="text-[9px] text-gray-500 mt-0.5">{strengthAssessment(fit, p.weight)}</div>}
                        {fit.sprint30m && <div className="text-[9px] text-gray-500">{speedAssessment(fit)}</div>}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ══ MAIN CTA — one-button generate ══ */}
        <button onClick={handleGenerate} disabled={isLoading}
          className="w-full py-4 bg-[#d92525] hover:bg-[#b71d1d] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
          {isLoading ? <><span className="animate-spin">⏳</span> 生成中…</> :
           hasPlanForToday ? `📋 ${mdLabel}方案已存在 · 重新生成` :
           planMode === 'individual' && selectedPlayerId ? `⚡ 生成${mdLabel}个体方案` :
           `⚡ 生成${mdLabel}训练方案`}
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

        {/* ══ QUICK ACTIONS ROW ══ */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600">快速操作:</span>
          {hasLastWeekPlan ? (
            <button onClick={reuseLastWeek}
              className="px-3 py-1.5 bg-[#1a1a1a] border border-[#333] hover:border-[#555] rounded-lg text-[10px] text-gray-300 hover:text-white transition flex items-center gap-1">
              📋 复用上周方案
            </button>
          ) : (
            <button disabled
              className="px-3 py-1.5 bg-[#1a1a1a] border border-[#222] rounded-lg text-[10px] text-gray-600 cursor-not-allowed flex items-center gap-1">
              📋 上周无方案
            </button>
          )}
          <button onClick={loadFromPlanning}
            className="px-3 py-1.5 bg-[#1a1a1a] border border-[#333] hover:border-[#555] rounded-lg text-[10px] text-gray-300 hover:text-white transition flex items-center gap-1">
            🗓 从周期方案加载
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ATTENTION ALERTS — at-risk players
          ═══════════════════════════════════════════════ */}
      {planMode === 'team' && atRiskReasons.length > 0 && (
        <div className="bg-[#0d0d0d] border border-yellow-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-yellow-400 font-semibold">⚠️ 关注球员</span>
            <span className="text-[9px] text-gray-500">{atRiskReasons.length}人需要关注</span>
          </div>
          <div className="space-y-1">
            {atRiskReasons.slice(0, 5).map(p => (
              <button key={p.name} onClick={() => togglePlayerSelect(p.name)}
                className={`flex items-center gap-2 text-[10px] p-2 rounded-lg w-full text-left transition cursor-pointer ${
                  selectedPlayers.has(p.name) ? 'ring-1 ring-[#d92525]' : ''
                } ${
                  p.status === 'red' ? 'bg-red-500/10 border border-red-500/20' : 'bg-yellow-500/5 border border-yellow-500/20'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.status === 'red' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                <span className="text-white font-medium shrink-0">{p.name}</span>
                <span className="text-gray-500 truncate">{p.reason}</span>
                {selectedPlayers.has(p.name) && <span className="ml-auto text-[#d92525] text-[9px] shrink-0">✓</span>}
              </button>
            ))}
            {atRiskReasons.length > 5 && (
              <p className="text-[9px] text-gray-600 pl-5">还有 {atRiskReasons.length - 5} 人...</p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          ADVANCED SETTINGS (collapsible)
          ═══════════════════════════════════════════════ */}
      <details className="bg-[#0d0d0d] border border-[#222] rounded-xl" open={showAdvanced}
        onToggle={e => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer text-[10px] text-gray-500 p-3 hover:text-gray-300 select-none">
          高级设置: {SCENE_LABELS[scene]} · {GOAL_LABELS[goal] || goal} · {duration}min · {PHASE_LABELS[phase]}
        </summary>
        <div className="px-3 pb-3 space-y-3">

          {/* Scene + Goal selectors */}
          <div>
            <div className="grid grid-cols-2 gap-3 mb-3">
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
          </div>

          {/* Match date */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-gray-500">比赛日</label>
            <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-xs text-white" />
          </div>

          {/* Periodization live params */}
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

          {/* Player status details (team mode) */}
          {planMode === 'team' && (
          <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-300 font-semibold">球员状态管理</span>
              {players.length > 0 && (
                <>
                  <button onClick={selectAllHealthy} className="text-[10px] text-gray-500 hover:text-white transition">全选健康</button>
                  <button onClick={() => setSelectedPlayers(new Set())} className="text-[10px] text-gray-500 hover:text-white transition">清空</button>
                  {selectedPlayers.size > 0 && <span className="text-[10px] text-[#d92525]">已选{selectedPlayers.size}人</span>}
                </>
              )}
            </div>
            {players.length === 0 ? (
              <p className="text-[10px] text-gray-600">暂无花名册数据 · <a href="/roster" className="text-[#d92525] underline">去录入球员</a></p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {players.map(p => (
                  <button key={p.name} onClick={() => togglePlayerSelect(p.name)}
                    className={`text-[10px] px-2 py-1 rounded transition ${
                      selectedPlayers.has(p.name) ? 'bg-[#d92525]/20 text-[#d92525] ring-1 ring-[#d92525]' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                    }`}>
                    {p.name} {p.status !== 'green' && (p.status === 'red' ? '🔴' : '🟡')}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Coach settings */}
          <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 text-[10px]">
            <div className="text-gray-400 mb-2">教练档案 · 队员{playerCount}人 · {leagueTag}</div>
            <div className="flex flex-wrap gap-2">
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
          </div>

        </div>
      </details>

      {/* ═══════════════════════════════════════════════
          PLAN OUTPUT AREA
          ═══════════════════════════════════════════════ */}
      {showPlan && modules.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#222] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#222]">
            <h3 className="text-sm font-bold text-white">
              {planMode === 'individual' && selectedPlayerId ? `🧑 ${loadRoster().find(p => p.id === selectedPlayerId)?.name || '个体'} · ` : ''}
              {scene === 'gym' ? '🏋️ 力量房' : '⚽ 外场'} · {duration}min · {activeDayOffset === 0 ? '比赛日' : activeDayOffset > 0 ? `MD-${activeDayOffset}` : `MD+${Math.abs(activeDayOffset)}`} · 职业三段式
              {isOffline && <span className="ml-2 text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">📡 离线模式</span>}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowLog(!showLog)} className={`text-[10px] transition ${showLog ? 'text-[#d92525]' : 'text-gray-500 hover:text-white'}`}>📝 日志</button>
              <ExportTable modules={modules} formData={buildFormData()} />
              <WorkoutTimer modules={modules} planId={planId ?? undefined} onClose={() => {}} />
              <button onClick={() => setShowPlan(false)} className="text-[10px] text-gray-500 hover:text-white">收起</button>
            </div>
          </div>
          <div className="p-4">
            <PhysicalTab modules={modules} position={null} onUpdateExercise={handleEditExercise} />
          </div>

          {showLog && (
            <TrainingLogPanel
              modules={modules}
              planId={planId}
              scene={scene}
              goal={goal}
              duration={duration}
              matchDay={activeDayOffset === 0 ? '比赛日' : activeDayOffset > 0 ? `MD-${activeDayOffset}` : `MD+${Math.abs(activeDayOffset)}`}
              playerName={planMode === 'individual' && selectedPlayerId ? loadRoster().find(p => p.id === selectedPlayerId)?.name : undefined}
              onClose={() => setShowLog(false)}
            />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          MICROCYCLE — bottom
          ═══════════════════════════════════════════════ */}
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
            const dayRecommendation = getMDRecommendation(dayOffset);
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
                  {hasPlan ? '📋 已有方案' : dayRecommendation.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <AIAssistant />

      {/* ══ EXERCISE EDITOR MODAL ══ */}
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
