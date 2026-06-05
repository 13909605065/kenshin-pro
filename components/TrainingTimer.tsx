'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

type TimerPhase = 'active' | 'rest' | 'rpe' | 'summary';

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

// ── Extract exercises from position_training modules with full fields ──
function extractTimerExercises(modules: any[]): TimerExercise[] {
  const exercises: TimerExercise[] = [];
  for (const m of modules) {
    if (m.module !== 'position_training') continue;
    const allEx = [
      ...(m.warmup || []).map((e: any) => ({ ...e, phase: 'warmup' })),
      ...(m.upper_limb || []).map((e: any) => ({ ...e, phase: 'upper' })),
      ...(m.lower_limb || []).map((e: any) => ({ ...e, phase: 'lower' })),
      ...(m.core || []).map((e: any) => ({ ...e, phase: 'core' })),
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

// ── Phase labels ──
const PHASE_LABELS: Record<string, string> = {
  warmup: '热身',
  upper: '上肢',
  lower: '下肢',
  core: '核心',
  cooldown: '冷身',
};

const PHASE_COLORS: Record<string, string> = {
  warmup: 'text-orange-400',
  upper: 'text-[#d92525]',
  lower: 'text-[#d92525]',
  core: 'text-[#d92525]',
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
  const exercises = useMemo(() => extractTimerExercises(modules), [modules]);

  // ── Core state ──
  const [currentExercise, setCurrentExercise] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<TimerPhase>('active');
  const [restRemaining, setRestRemaining] = useState(0);
  const [restDuration, setRestDuration] = useState(90);
  const [rpeValues, setRpeValues] = useState<Map<number, number>>(new Map());
  const [elapsed, setElapsed] = useState(0);
  const [startedAt] = useState(() => Date.now());

  // ── Refs ──
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);
  const completedRef = useRef(false);

  const ex = exercises[currentExercise] as TimerExercise | undefined;
  const totalExercises = exercises.length;
  const globalProgress = totalExercises > 0
    ? Math.round((currentExercise / totalExercises) * 100)
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
    if (phase !== 'rest') return;
    if (restRemaining <= 0) return;

    const id = setInterval(() => {
      setRestRemaining(t => {
        const next = t - 1;
        if (next <= 0) {
          // Rest complete → vibrate + advance
          try { navigator.vibrate?.([200, 100, 200]); } catch {}
          clearInterval(id);
          // Advance to next set
          setCurrentSet(s => s + 1);
          setPhase('active');
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [phase, restRemaining]);

  // ═══ ACTIONS ═══

  /** User taps "✓ 完成组" — advance set or show RPE */
  const handleCompleteSet = useCallback(() => {
    if (!ex) return;

    if (currentSet < ex.sets) {
      // Not last set → enter rest
      setRestDuration(ex.rest);
      setRestRemaining(ex.rest);
      setPhase('rest');
    } else {
      // Last set → show RPE picker
      setPhase('rpe');
    }
  }, [ex, currentSet]);

  /** User taps an RPE value */
  const handleSelectRPE = useCallback((rpe: number) => {
    setRpeValues(prev => {
      const next = new Map(prev);
      next.set(currentExercise, rpe);
      return next;
    });

    // Advance to next exercise or summary
    if (currentExercise + 1 >= totalExercises) {
      setPhase('summary');
    } else {
      setCurrentExercise(i => i + 1);
      setCurrentSet(1);
      setPhase('active');
    }
  }, [currentExercise, totalExercises]);

  /** Skip remaining rest */
  const handleSkipRest = useCallback(() => {
    if (!ex) return;

    if (currentSet < ex.sets) {
      setCurrentSet(s => s + 1);
      setRestRemaining(0);
      setPhase('active');
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

  // ═══ SAVE SESSION LOG ═══
  const handleSaveLog = useCallback(() => {
    const entries: ExerciseLogEntry[] = extractExercisesFromModules(modules);
    // Mark all as completed and set RPE
    const enriched = entries.map((e, i) => ({
      ...e,
      completed: true,
      actualSets: exercises[i]?.sets ?? e.plannedSets,
      actualReps: exercises[i]?.reps ?? e.plannedReps,
      actualLoad: exercises[i]?.load ?? e.plannedLoad,
      actualRPE: rpeValues.get(i),
    }));

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
    completedRef.current = true;
  }, [modules, exercises, rpeValues, planId, scene, goal, duration, matchDay, playerName]);

  // ═══ COMPUTED VALUES ═══
  const totalTime = useMemo(() => fmtTime(elapsed), [elapsed]);
  const avgRPE = useMemo(() => {
    const vals = Array.from(rpeValues.values());
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [rpeValues]);

  const setProgress = ex ? `${currentSet}/${ex.sets}` : '—';
  const exerciseProgress = `${currentExercise + 1}/${totalExercises}`;

  // ═══ EMPTY STATE ═══
  if (exercises.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
        <p className="text-gray-400 text-lg mb-4">该方案暂无跟练动作</p>
        <button onClick={onClose}
          className="px-6 py-3 bg-[#d92525] text-white font-bold rounded-xl text-base active:scale-95 transition">
          返回方案
        </button>
      </div>
    );
  }

  // ═══ SUMMARY SCREEN ═══
  if (phase === 'summary') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-6">
        {/* Check icon */}
        <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 className="text-white text-2xl font-bold mb-1">训练完成</h2>
        <p className="text-gray-400 text-sm mb-6">干得漂亮</p>

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
        <button
          onClick={handleSaveLog}
          className="w-full max-w-xs py-4 bg-[#d92525] hover:bg-[#b71d1d] text-white font-bold rounded-xl text-base active:scale-95 transition mb-3"
        >
          保存训练日志
        </button>

        <button
          onClick={onClose}
          className="w-full max-w-xs py-3 bg-[#1a1a1a] border border-[#333] text-gray-300 font-medium rounded-xl text-sm active:scale-95 transition"
        >
          返回方案
        </button>
      </div>
    );
  }

  if (!ex) return null;

  // ═══ CIRCULAR TIMER RING (SVG) ═══
  const ringRadius = 70;
  const circumference = 2 * Math.PI * ringRadius;
  const restProgress = restDuration > 0 ? restRemaining / restDuration : 0;
  const ringOffset = circumference * (1 - restProgress);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">
      {/* ═══ TOP BAR: progress + close ═══ */}
      <div className="px-4 pt-4 pb-2">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-1.5 bg-[#222] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#d92525] rounded-full transition-all duration-500"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
            {exerciseProgress}
          </span>
        </div>

        {/* Phase tag + exercise name */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[10px] font-bold ${PHASE_COLORS[ex.phase] || 'text-gray-400'}`}>
              {PHASE_LABELS[ex.phase] || ex.phase}
            </span>
            <h1 className="text-xl font-bold text-white truncate">{ex.name}</h1>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white px-2 py-1 text-sm">
            ✕
          </button>
        </div>
      </div>

      {/* ═══ CENTER: timer / exercise info ═══ */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {phase === 'rest' ? (
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
                  stroke="#d92525"
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
                <span className="text-xs text-[#d92525]/70 mt-1">组间休息</span>
              </div>
            </div>

            {/* Rest adjust buttons */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => adjustRest(-15)}
                className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-gray-300 rounded-xl text-sm font-bold active:bg-[#333] transition"
              >
                −15s
              </button>
              <button
                onClick={addThirty}
                className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-gray-300 rounded-xl text-sm font-bold active:bg-[#333] transition"
              >
                +30s
              </button>
            </div>

            {/* Skip rest button (not primary — tap timer to skip) */}
            <button
              onClick={handleSkipRest}
              className="text-gray-500 text-sm underline active:text-gray-300 transition"
            >
              跳过休息
            </button>
          </>
        ) : phase === 'rpe' ? (
          <>
            {/* RPE picker */}
            <p className="text-white text-lg font-bold mb-1">{ex.name}</p>
            <p className="text-gray-400 text-sm mb-2">完成 {ex.sets} 组 × {ex.reps}次</p>
            <p className="text-gray-500 text-xs mb-6">自感劳累评分 (RPE)</p>

            <div className="flex gap-2 max-w-sm flex-wrap justify-center">
              {[6, 7, 8, 8.5, 9, 9.5, 10].map(rpe => (
                <button
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
                <span className="text-lg text-gray-500">×</span>
                {ex.reps}
              </span>
              {ex.load && ex.load !== 'BW' && (
                <span className="text-2xl text-[#d92525] font-bold">{ex.load}</span>
              )}
              {ex.load === 'BW' && (
                <span className="text-lg text-gray-500">自重</span>
              )}
            </div>

            {/* Set progress */}
            <p className="text-gray-400 text-sm mb-8">
              第 {currentSet}/{ex.sets} 组
            </p>

            {/* Progress bar text */}
            <p className="text-[11px] text-gray-600">
              {ex.name} {setProgress}组 · 第{exerciseProgress}个动作
            </p>
          </>
        )}
      </div>

      {/* ═══ BOTTOM CONTROLS ═══ */}
      <div className="px-4 pb-8 pt-2">
        {phase === 'active' && (
          <button
            onClick={handleCompleteSet}
            className="w-full py-5 bg-[#d92525] hover:bg-[#b71d1d] text-white font-bold rounded-2xl text-lg active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            ✓ 完成组
          </button>
        )}

        {phase === 'rest' && (
          <button
            onClick={handleSkipRest}
            className="w-full py-5 bg-[#d92525] hover:bg-[#b71d1d] text-white font-bold rounded-2xl text-lg active:scale-[0.98] transition"
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
