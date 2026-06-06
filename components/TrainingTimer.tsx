'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  extractExercisesFromModules,
  calcSummary,
  saveSessionLog,
  type ExerciseLogEntry,
  type TrainingSessionLog,
} from '@/lib/training-log';

// ── Timer-specific exercise (richer than ExerciseLogEntry, has rest + phase) ──
interface TimerExercise {
  name: string;
  sets: number;
  reps: number;
  load: string;
  /** rest between sets, seconds */
  rest: number;
  phase: string;
}

type TimerSubPhase = 'active' | 'rest' | 'rpe';

/** Which screen the timer is showing */
type TimerScreen = 'exercising' | 'phaseComplete' | 'summary';

interface Props {
  modules: any[];
  planId: string | null;
  scene: string;
  goal: string;
  duration: number;
  matchDay: string;
  playerName?: string;
  onClose: () => void;
}

// ── Phase group definition ──
interface PhaseGroup {
  key: string;
  label: string;
  icon: string;
  storageField: string; // field name in kenshin_structured_notes
  exercisePhases: string[]; // which exercise.phase values belong to this group
}

const PHASE_GROUPS: PhaseGroup[] = [
  { key: 'warmup', label: '热身', icon: '🏃', storageField: 'warmup', exercisePhases: ['warmup'] },
  { key: 'main', label: '主训', icon: '⚽', storageField: 'tactical', exercisePhases: ['upper', 'lower', 'core', 'drill'] },
  { key: 'cooldown', label: '放松', icon: '🧊', storageField: 'cooldown', exercisePhases: ['cooldown'] },
];

interface PhaseGroupWithExercises extends PhaseGroup {
  exercises: TimerExercise[];
}

// ── Extract exercises from position_training modules with full fields ──
function extractTimerExercises(modules: any[], scene: string): TimerExercise[] {
  const exercises: TimerExercise[] = [];
  const isPitch = scene === 'pitch';
  for (const m of modules) {
    if (m.module !== 'position_training') continue;
    // Pitch: only warmup, drills, cooldown (no strength exercises)
    // Gym: warmup, upper/lower/core, cooldown
    // Strict separation: pitch=no gym, gym=no pitch drills
    const allEx = [
      ...(m.warmup || []).map((e: any) => ({ ...e, phase: 'warmup' })),
      ...(isPitch
          ? [...(m.drills || []).map((e: any) => ({ ...e, phase: 'drill' }))]
          : [...(m.upper_limb || []).map((e: any) => ({ ...e, phase: 'upper' })),
             ...(m.lower_limb || []).map((e: any) => ({ ...e, phase: 'lower' })),
             ...(m.core || []).map((e: any) => ({ ...e, phase: 'core' }))]),
      ...(m.cooldown || []).map((e: any) => ({ ...e, phase: 'cooldown' })),
    ];
    for (const ex of allEx) {
      exercises.push({
        name: ex.name || '—',
        sets: typeof ex.sets === 'number' ? ex.sets : Array.isArray(ex.sets) ? ex.sets[0] : 3,
        reps: typeof ex.reps === 'number' ? ex.reps : Array.isArray(ex.reps) ? ex.reps[0] : 10,
        load: ex.load || ex.load_default || 'BW',
        rest: typeof ex.rest === 'number' ? ex.rest : 90,
        phase: ex.phase,
      });
    }
  }
  return exercises;
}

// ── Phase labels for individual exercises ──
const PHASE_LABELS: Record<string, string> = {
  warmup: '热身',
  upper: '上肢',
  lower: '下肢',
  core: '核心',
  drill: '场地训练',
  cooldown: '冷身',
};

const PHASE_COLORS: Record<string, string> = {
  warmup: 'text-orange-400',
  upper: 'text-[#992828]',
  lower: 'text-[#992828]',
  core: 'text-[#992828]',
  drill: 'text-blue-400',
  cooldown: 'text-green-400',
};

// ── Format seconds to m:ss ──
const fmtTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export default function TrainingTimer({
  modules,
  planId,
  scene,
  goal,
  duration,
  matchDay,
  playerName,
  onClose,
}: Props) {
  // ── Extracted exercises ──
  const allExercises = useMemo(() => extractTimerExercises(modules, scene), [modules, scene]);

  // ── Group exercises into phases ──
  const phaseGroups: PhaseGroupWithExercises[] = useMemo(() => {
    return PHASE_GROUPS.map(pg => ({
      ...pg,
      exercises: allExercises.filter(ex => pg.exercisePhases.includes(ex.phase)),
    })).filter(pg => pg.exercises.length > 0); // skip empty phases
  }, [allExercises]);

  // ── Core state ──
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [subPhase, setSubPhase] = useState<TimerSubPhase>('active');
  const [restRemaining, setRestRemaining] = useState(0);
  const [restDuration, setRestDuration] = useState(90);
  const [rpeValues, setRpeValues] = useState<Map<string, number>>(new Map());
  const [elapsed, setElapsed] = useState(0);
  const [screen, setScreen] = useState<TimerScreen>('exercising');
  const [startedAt] = useState(() => Date.now());

  // ── Refs ──
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);
  const phaseStartElapsedRef = useRef(0); // elapsed time at phase start, for per-phase timing
  const router = useRouter();

  // ═══ LOAD MONITORING: real-time TRIMP vs daily cap ═══
  const { currentTRIMP, dayCap, loadPct, loadWarning } = useMemo(() => {
    const rate = scene === 'gym' ? 2.0 : 2.5;
    const nowTRIMP = Math.round((elapsed / 60) * rate);
    // Read today's already-used TRIMP from load page logic
    let usedToday = 0;
    try {
      const logs = JSON.parse(localStorage.getItem('kenshin_daily_training_log') || '[]');
      const today = new Date().toISOString().slice(0, 10);
      const todayLogs = logs.filter((l: any) => l.date === today && l.timeSlot !== 'rest');
      usedToday = todayLogs.reduce((s: number, l: any) => s + Math.round((l.duration || 0) * (l.trainType === 'pitch' ? 2.5 : 2.0)), 0);
    } catch {}
    const total = usedToday + nowTRIMP;
    // Phase-aware daily cap
    let cap = 300;
    try {
      const raw = localStorage.getItem('kenshin_season_calendar');
      if (raw) {
        const ranges = JSON.parse(raw).phaseRanges || [];
        const todayStr = new Date().toISOString().slice(0, 10);
        const phase = ranges.find((r: any) => todayStr >= r.startDate && todayStr <= r.endDate);
        const caps: Record<string, number> = { offseason: 180, preseason_build: 300, regular_season: 280, playoffs: 220 };
        if (phase) cap = caps[phase.phase] || 300;
      }
    } catch {}
    const pct = Math.min(100, Math.round((total / cap) * 100));
    const warning = pct >= 100 ? 'danger' : pct >= 80 ? 'warn' : null;
    return { currentTRIMP: nowTRIMP, dayCap: cap, loadPct: pct, loadWarning: warning };
  }, [elapsed, scene]);

  const currentPhase = phaseGroups[currentPhaseIdx] as PhaseGroupWithExercises | undefined;
  const ex = currentPhase?.exercises[exerciseIdx] as TimerExercise | undefined;
  const totalPhases = phaseGroups.length;
  const totalExercises = allExercises.length;

  // Global progress across all phases
  const globalProgress = totalExercises > 0
    ? (() => {
        let completedBefore = 0;
        for (let i = 0; i < currentPhaseIdx; i++) {
          completedBefore += phaseGroups[i]?.exercises.length || 0;
        }
        return Math.round(((completedBefore + exerciseIdx) / totalExercises) * 100);
      })()
    : 0;

  // ═══ WAKE LOCK — keep screen on ═══
  useEffect(() => {
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock
        .request('screen')
        .then((wl: any) => { wakeLockRef.current = wl; })
        .catch(() => {});
    }
    return () => {
      wakeLockRef.current?.release?.();
    };
  }, []);

  // ═══ TRACK PHASE START TIME ═══
  useEffect(() => {
    phaseStartElapsedRef.current = elapsed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhaseIdx]);

  // ═══ MAIN TICK — elapsed counter ═══
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(e => e + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ═══ REST COUNTDOWN ═══
  useEffect(() => {
    if (subPhase !== 'rest') return;
    if (restRemaining <= 0) return;

    const id = setInterval(() => {
      setRestRemaining(t => {
        const next = t - 1;
        if (next <= 0) {
          try { navigator.vibrate?.([200, 100, 200]); } catch {}
          clearInterval(id);
          setCurrentSet(s => s + 1);
          setSubPhase('active');
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [subPhase, restRemaining]);

  // ═══ WRITE PHASE COMPLETION TO LOCALSTORAGE ═══
  const writePhaseCompletion = useCallback((phaseGroup: PhaseGroupWithExercises) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const elapsedMin = Math.round(elapsed / 60);
    const exerciseNames = phaseGroup.exercises.map(e => e.name).join('、');

    try {
      const all = JSON.parse(localStorage.getItem('kenshin_structured_notes') || '{}');
      const today = all[todayStr] || {};

      if (phaseGroup.key === 'warmup') {
        today.warmup = `已完成：${exerciseNames}，时长 ${elapsedMin}min`;
      } else if (phaseGroup.key === 'main') {
        today.tactical = `已完成：${exerciseNames}`;
        // Also write strength if scene is gym
        if (scene === 'gym') {
          today.strength = `已完成：${exerciseNames}`;
        }
      } else if (phaseGroup.key === 'cooldown') {
        today.cooldown = `已完成：${exerciseNames}`;
      }

      all[todayStr] = today;
      localStorage.setItem('kenshin_structured_notes', JSON.stringify(all));
    } catch {}
  }, [elapsed, scene]);

  // ═══ WRITE SUMMARY TO LOCALSTORAGE ═══
  const writeTrainingSummary = useCallback(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const totalMin = Math.round(elapsed / 60);

    try {
      const all = JSON.parse(localStorage.getItem('kenshin_structured_notes') || '{}');
      const today = all[todayStr] || {};
      today.notes = `总时长 ${totalMin}min · 热身+主训+放松全部完成`;
      all[todayStr] = today;
      localStorage.setItem('kenshin_structured_notes', JSON.stringify(all));
    } catch {}
  }, [elapsed]);

  // ═══ ACTIONS ═══

  /** User taps "✓ 完成组" — advance set or show RPE */
  const handleCompleteSet = useCallback(() => {
    if (!ex) return;

    if (currentSet < ex.sets) {
      setRestDuration(ex.rest);
      setRestRemaining(ex.rest);
      setSubPhase('rest');
    } else {
      setSubPhase('rpe');
    }
  }, [ex, currentSet]);

  /** User taps an RPE value */
  const handleSelectRPE = useCallback((rpe: number) => {
    if (!currentPhase || !ex) return;

    const rpeKey = `${currentPhase.key}_${exerciseIdx}`;
    setRpeValues(prev => {
      const next = new Map(prev);
      next.set(rpeKey, rpe);
      return next;
    });

    // Check if more exercises in current phase
    if (exerciseIdx + 1 < currentPhase.exercises.length) {
      setExerciseIdx(i => i + 1);
      setCurrentSet(1);
      setSubPhase('active');
    } else {
      // All exercises in this phase done → show phase completion
      setScreen('phaseComplete');
    }
  }, [currentPhase, exerciseIdx]);

  /** User confirms phase completion */
  const handleConfirmPhase = useCallback(() => {
    if (!currentPhase) return;

    // Write phase completion to localStorage
    writePhaseCompletion(currentPhase);

    // Advance to next phase or summary
    if (currentPhaseIdx + 1 < totalPhases) {
      setCurrentPhaseIdx(i => i + 1);
      setExerciseIdx(0);
      setCurrentSet(1);
      setSubPhase('active');
      setScreen('exercising');
    } else {
      // All phases done → summary
      writeTrainingSummary();
      setScreen('summary');
    }
  }, [currentPhase, currentPhaseIdx, totalPhases, writePhaseCompletion, writeTrainingSummary]);

  /** Skip remaining rest */
  const handleSkipRest = useCallback(() => {
    if (!ex) return;

    if (currentSet < ex.sets) {
      setCurrentSet(s => s + 1);
      setRestRemaining(0);
      setSubPhase('active');
    }
  }, [ex, currentSet]);

  /** Adjust rest duration by ±15s (only during rest phase) */
  const adjustRest = useCallback((delta: number) => {
    setRestDuration(d => {
      const next = Math.max(15, d + delta);
      return next;
    });
    setRestRemaining(r => {
      const next = Math.max(0, r + delta);
      return next;
    });
  }, []);

  /** Add 30s to current rest */
  const addThirty = useCallback(() => adjustRest(30), [adjustRest]);

  /** Record hydration time to structured notes */
  const handleHydration = useCallback(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const timestamp = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    try {
      const all = JSON.parse(localStorage.getItem('kenshin_structured_notes') || '{}');
      const today = all[todayStr] || {};
      today.notes = (today.notes || '') + `\n💧 补水 ${timestamp}`;
      // Also write to match field for hydration tracking
      today.match = (today.match || '') + `\n💧 补水 ${timestamp}`;
      all[todayStr] = today;
      localStorage.setItem('kenshin_structured_notes', JSON.stringify(all));
    } catch {}
  }, []);

  // ═══ SAVE SESSION LOG ═══
  const handleSaveLog = useCallback(() => {
    const entries: ExerciseLogEntry[] = extractExercisesFromModules(modules);
    const enriched = entries.map((e, i) => ({
      ...e,
      completed: true,
      actualSets: allExercises[i]?.sets ?? e.plannedSets,
      actualReps: allExercises[i]?.reps ?? e.plannedReps,
      actualLoad: allExercises[i]?.load ?? e.plannedLoad,
      actualRPE: undefined as number | undefined,
    }));

    // Add RPE values from the map
    for (const [key, rpe] of Array.from(rpeValues.entries())) {
      // key format: "phaseKey_exerciseIdx" — need to map back to flat index
      const [phaseKey, idxStr] = key.split('_');
      const idx = parseInt(idxStr, 10);
      // Find the flat index
      let flatIdx = 0;
      for (const pg of phaseGroups) {
        if (pg.key === phaseKey) {
          flatIdx += idx;
          break;
        }
        flatIdx += pg.exercises.length;
      }
      if (flatIdx < enriched.length) {
        enriched[flatIdx].actualRPE = rpe;
      }
    }

    const summary = calcSummary(enriched, '');
    const log: TrainingSessionLog = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      planId: planId || 'unknown',
      scene,
      goal,
      duration,
      matchDay,
      playerName,
      exercises: enriched,
      summary,
      createdAt: new Date().toISOString(),
    };
    saveSessionLog(log);
  }, [modules, allExercises, rpeValues, phaseGroups, planId, scene, goal, duration, matchDay, playerName]);

  // ═══ COMPUTED VALUES ═══
  const totalTime = useMemo(() => fmtTime(elapsed), [elapsed]);
  const avgRPE = useMemo(() => {
    const vals = Array.from(rpeValues.values());
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [rpeValues]);

  const setProgress = ex ? `${currentSet}/${ex.sets}` : '—';
  const exerciseInPhaseProgress = currentPhase
    ? `${exerciseIdx + 1}/${currentPhase.exercises.length}`
    : '—';

  // Per-phase elapsed time
  const phaseElapsed = useMemo(() => {
    return fmtTime(elapsed - phaseStartElapsedRef.current);
  }, [elapsed, currentPhaseIdx]);

  // Remaining exercises in current phase
  const remainingInPhase = currentPhase
    ? currentPhase.exercises.length - exerciseIdx - 1
    : 0;

  // Next exercise preview
  const nextExercise = currentPhase && exerciseIdx + 1 < currentPhase.exercises.length
    ? currentPhase.exercises[exerciseIdx + 1].name
    : null;

  // Phase progress indicator
  const phaseProgressText = phaseGroups.map((pg, i) => {
    const done = i < currentPhaseIdx ? '✓' : i === currentPhaseIdx ? '●' : '○';
    return `${done}${pg.icon}`;
  }).join(' ');

  // ═══ EMPTY STATE ═══
  if (allExercises.length === 0 || phaseGroups.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
        <p className="text-gray-400 text-lg mb-4">该方案暂无跟练动作</p>
        <button type="button" onClick={onClose}
          className="px-6 py-3 bg-[#992828] text-white font-bold rounded-xl text-base active:scale-95 transition">
          返回方案
        </button>
      </div>
    );
  }

  // ═══ PHASE COMPLETE SCREEN ═══
  if (screen === 'phaseComplete' && currentPhase) {
    const phaseExerciseNames = currentPhase.exercises.map(e => e.name).join('、');
    const phaseElapsedMin = Math.round(elapsed / 60);

    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-6">
        {/* Check icon */}
        <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 className="text-white text-xl font-bold mb-1">
          {currentPhase.icon} {currentPhase.label}阶段完成
        </h2>
        <p className="text-gray-400 text-xs mb-6">
          {phaseExerciseNames} · 已用 {phaseElapsedMin}min
        </p>

        <button type="button"
          onClick={handleConfirmPhase}
          className="w-full max-w-xs py-4 bg-[#992828] hover:bg-[#7a1e1e] text-white font-bold rounded-xl text-base active:scale-95 transition mb-3"
        >
          ✅ 完成{currentPhase.label}阶段
        </button>

        <p className="text-[10px] text-gray-600">
          确认后将自动写入训练笔记
        </p>
      </div>
    );
  }

  // ═══ SUMMARY SCREEN ═══
  if (screen === 'summary') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-6">
        {/* Check icon */}
        <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 className="text-white text-2xl font-bold mb-1">训练完成</h2>
        <p className="text-gray-400 text-sm mb-2">热身+主训+放松全部完成</p>
        <p className="text-gray-500 text-xs mb-6">笔记已自动更新</p>

        {/* Stats */}
        <div className="w-full max-w-xs space-y-3 mb-8">
          <div className="flex justify-between text-sm bg-[#111] rounded-xl px-4 py-3">
            <span className="text-gray-400">总时长</span>
            <span className="text-white font-bold font-mono">{totalTime}</span>
          </div>
          <div className="flex justify-between text-sm bg-[#111] rounded-xl px-4 py-3">
            <span className="text-gray-400">完成动作</span>
            <span className="text-white font-bold">{totalExercises}/{totalExercises}</span>
          </div>
          <div className="flex justify-between text-sm bg-[#111] rounded-xl px-4 py-3">
            <span className="text-gray-400">平均RPE</span>
            <span className="text-white font-bold">{avgRPE > 0 ? avgRPE : '—'}</span>
          </div>
        </div>

        {/* Save button */}
        <button type="button"
          onClick={handleSaveLog}
          className="w-full max-w-xs py-4 bg-[#992828] hover:bg-[#7a1e1e] text-white font-bold rounded-xl text-base active:scale-95 transition mb-3"
        >
          保存训练日志
        </button>

        {/* Load management link */}
        <button type="button"
          onClick={() => { handleSaveLog(); router.push('/load'); }}
          className="w-full max-w-xs py-4 bg-[#222] border-2 border-[#555] text-white font-bold rounded-xl text-base active:scale-95 active:bg-[#444] transition mb-3"
        >
          📊 查看负荷
        </button>

        <button type="button"
          onClick={onClose}
          className="w-full max-w-xs py-3 bg-[#1a1a1a] border border-[#333] text-gray-300 font-medium rounded-xl text-sm active:scale-95 transition"
        >
          返回方案
        </button>
      </div>
    );
  }

  if (!ex || !currentPhase) return null;

  // ═══ CIRCULAR TIMER RING (SVG) ═══
  const ringRadius = 70;
  const circumference = 2 * Math.PI * ringRadius;
  const restProgress = restDuration > 0 ? restRemaining / restDuration : 0;
  const ringOffset = circumference * (1 - restProgress);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">
      {/* ═══ TOP BAR: phase label + progress + close ═══ */}
      <div className="px-4 pt-4 pb-2">
        {/* Phase indicator dots */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {phaseGroups.map((pg, i) => (
              <span key={pg.key} className={`text-xs font-bold transition ${
                i < currentPhaseIdx
                  ? 'text-green-400'
                  : i === currentPhaseIdx
                  ? 'text-white'
                  : 'text-gray-700'
              }`}>
                {i < currentPhaseIdx ? '✓' : ''} {pg.icon} {pg.label}
                {i < totalPhases - 1 && <span className="text-gray-700 mx-1">→</span>}
              </span>
            ))}
          </div>
          <button type="button" onClick={onClose} className="text-gray-600 hover:text-white px-2 py-1 text-sm">
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-1.5 bg-[#222] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#992828] rounded-full transition-all duration-500"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
          {/* ═══ LOAD MONITORING BAR ═══ */}
          {loadWarning && (
            <div className={`mb-2 p-2 rounded-lg text-[10px] font-bold flex items-center gap-2 ${
              loadWarning === 'danger' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
            }`}>
              {loadWarning === 'danger' ? '🔴' : '🟡'} 负荷已达 {loadPct}%（{currentTRIMP}/{dayCap} TRIMP）
              {loadWarning === 'danger' ? ' — 必须休息！不能再练！' : ' — 注意控制强度'}
            </div>
          )}
          {/* Load progress bar */}
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1 bg-[#222] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${
                loadPct >= 100 ? 'bg-red-500' : loadPct >= 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`} style={{ width: `${loadPct}%` }} />
            </div>
            <span className={`text-[9px] font-mono ${loadPct >= 80 ? 'text-yellow-400' : 'text-gray-500'}`}>
              {currentTRIMP}/{dayCap}
            </span>
          </div>

          <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
            {exerciseIdx + 1}/{currentPhase.exercises.length}
          </span>
        </div>

        {/* Exercise phase tag + name */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[10px] font-bold ${PHASE_COLORS[ex.phase] || 'text-gray-400'}`}>
              {PHASE_LABELS[ex.phase] || ex.phase}
            </span>
            <span className="text-[10px] text-gray-600">{currentPhase.icon} {currentPhase.label}</span>
          </div>
        </div>

        <h1 className="text-xl font-bold text-white truncate mt-1">{ex.name}</h1>
      </div>

      {/* ═══ CENTER: timer / exercise info ═══ */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {subPhase === 'rest' ? (
          <>
            {/* Circular rest countdown */}
            <div className="relative w-44 h-44 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80" cy="80" r={ringRadius}
                  fill="none"
                  stroke="#222"
                  strokeWidth="6"
                />
                <circle
                  cx="80" cy="80" r={ringRadius}
                  fill="none"
                  stroke="#992828"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-white font-mono tracking-tight">
                  {fmtTime(restRemaining)}
                </span>
                <span className="text-xs text-[#992828]/70 mt-1">组间休息</span>
              </div>
            </div>

            {/* Rest adjust buttons — prominent for quick coach adjustment */}
            <div className="flex items-center gap-3 mb-4">
              <button type="button"
                onClick={() => adjustRest(-15)}
                className="px-6 py-3 bg-[#222] border-2 border-[#555] text-white rounded-xl text-base font-bold active:bg-[#444] active:border-[#888] transition"
              >
                −15s
              </button>
              <button type="button"
                onClick={() => adjustRest(15)}
                className="px-6 py-3 bg-[#222] border-2 border-[#555] text-white rounded-xl text-base font-bold active:bg-[#444] active:border-[#888] transition"
              >
                +15s
              </button>
              <button type="button"
                onClick={addThirty}
                className="px-6 py-3 bg-[#222] border-2 border-[#555] text-white rounded-xl text-base font-bold active:bg-[#444] active:border-[#888] transition"
              >
                +30s
              </button>
            </div>

            {/* Hydration button */}
            <button type="button"
              onClick={handleHydration}
              className="px-5 py-3 bg-[#1a3a5c]/40 border border-[#3a6fa0]/50 text-[#7cb9e8] rounded-xl text-sm font-bold active:bg-[#1a3a5c]/70 transition mb-3"
            >
              💧 补水
            </button>

            {/* Skip rest button */}
            <button type="button"
              onClick={handleSkipRest}
              className="text-gray-500 text-sm underline active:text-gray-300 transition"
            >
              跳过休息
            </button>
          </>
        ) : subPhase === 'rpe' ? (
          <>
            {/* RPE picker */}
            <p className="text-white text-lg font-bold mb-1">{ex.name}</p>
            <p className="text-gray-400 text-sm mb-2">完成 {ex.sets} 组 x {ex.reps}次</p>
            <p className="text-gray-500 text-xs mb-6">自感劳累评分 (RPE)</p>

            <div className="flex gap-2 max-w-sm flex-wrap justify-center">
              {[6, 7, 8, 8.5, 9, 9.5, 10].map(rpe => (
                <button type="button"
                  key={rpe}
                  onClick={() => handleSelectRPE(rpe)}
                  className={`w-14 h-14 rounded-xl border font-bold text-lg active:scale-95 transition ${
                    rpe <= 6 ? 'border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20' :
                    rpe <= 7 ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' :
                    rpe <= 8 ? 'border-orange-500/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' :
                    rpe <= 9 ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20' :
                    'border-red-600/50 bg-red-600/10 text-red-500 hover:bg-red-600/20'
                  }`}
                >
                  {rpe}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Active set — show exercise info BIG */}
            <p className="text-lg font-bold text-white mb-1 text-center">{ex.name}</p>

            {/* Target info */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl font-bold text-white font-mono">
                {ex.sets}
                <span className="text-lg text-gray-500">x</span>
                {ex.reps}
              </span>
              {ex.load && ex.load !== 'BW' && (
                <span className="text-2xl text-[#992828] font-bold">{ex.load}</span>
              )}
              {ex.load === 'BW' && (
                <span className="text-lg text-gray-500">自重</span>
              )}
            </div>

            {/* Set progress */}
            <p className="text-gray-400 text-sm mb-6">
              第 {currentSet}/{ex.sets} 组
            </p>

            {/* ── Monitoring info ── */}
            <div className="w-full max-w-xs space-y-2 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>当前阶段已用</span>
                <span className="text-white font-mono">{phaseElapsed}</span>
              </div>
              {remainingInPhase > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>本阶段剩余动作</span>
                  <span className="text-white font-mono">{remainingInPhase}</span>
                </div>
              )}
              {nextExercise && (
                <div className="flex justify-between text-gray-500">
                  <span className="truncate max-w-[60%]">下一个动作</span>
                  <span className="text-gray-300 truncate max-w-[55%] text-right">{nextExercise}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ═══ BOTTOM CONTROLS ═══ */}
      <div className="px-4 pb-8 pt-2">
        {subPhase === 'active' && (
          <button type="button"
            onClick={handleCompleteSet}
            className="w-full py-5 bg-[#992828] hover:bg-[#7a1e1e] text-white font-bold rounded-2xl text-lg active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            ✓ 完成组
          </button>
        )}

        {subPhase === 'rest' && (
          <button type="button"
            onClick={handleSkipRest}
            className="w-full py-5 bg-[#992828] hover:bg-[#7a1e1e] text-white font-bold rounded-2xl text-lg active:scale-[0.98] transition"
          >
            跳过休息 · 开始第 {currentSet + 1} 组
          </button>
        )}

        {/* Total elapsed time */}
        <p className="text-center text-[10px] text-gray-600 mt-3 font-mono">
          已用 {totalTime}
        </p>
      </div>
    </div>
  );
}
