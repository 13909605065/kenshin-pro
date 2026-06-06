/**
 * 间歇计时器 — 移动端大按钮训练计时
 *
 * 5种预设 + 自定义，支持振动提醒和后台运行
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface TimerPreset {
  id: string;
  name: string;
  nameCn: string;
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  sets: number;
  setRestSeconds: number;
  warmupSeconds: number;
  cooldownSeconds: number;
}

type TimerPhase = 'idle' | 'warmup' | 'work' | 'rest' | 'set_rest' | 'cooldown' | 'done';

interface TimerState {
  phase: TimerPhase;
  currentRound: number;
  currentSet: number;
  remainingSeconds: number;
  totalElapsed: number;
}

// ═══════════════════════════════════════════
// 预设
// ═══════════════════════════════════════════

export const TIMER_PRESETS: TimerPreset[] = [
  {
    id: 'tabata', name: 'Tabata', nameCn: 'Tabata 燃脂',
    workSeconds: 20, restSeconds: 10, rounds: 8, sets: 1, setRestSeconds: 0, warmupSeconds: 0, cooldownSeconds: 0,
  },
  {
    id: 'hiit', name: 'HIIT', nameCn: 'HIIT 间歇',
    workSeconds: 30, restSeconds: 30, rounds: 10, sets: 1, setRestSeconds: 0, warmupSeconds: 60, cooldownSeconds: 60,
  },
  {
    id: 'sprint', name: 'Sprint', nameCn: '冲刺间歇',
    workSeconds: 15, restSeconds: 45, rounds: 8, sets: 2, setRestSeconds: 120, warmupSeconds: 120, cooldownSeconds: 120,
  },
  {
    id: 'strength', name: 'Strength', nameCn: '力量组间歇',
    workSeconds: 40, restSeconds: 90, rounds: 4, sets: 3, setRestSeconds: 180, warmupSeconds: 0, cooldownSeconds: 0,
  },
  {
    id: 'custom', name: 'Custom', nameCn: '自定义',
    workSeconds: 30, restSeconds: 30, rounds: 5, sets: 1, setRestSeconds: 0, warmupSeconds: 0, cooldownSeconds: 0,
  },
];

// ═══════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════

interface IntervalTimerProps {
  preset?: TimerPreset;
  onComplete?: () => void;
  onPhaseChange?: (phase: TimerPhase, state: TimerState) => void;
  compact?: boolean;
  floating?: boolean;
}

const PHASE_COLORS: Record<TimerPhase, string> = {
  idle: 'text-gray-400',
  warmup: 'text-blue-400',
  work: 'text-green-400',
  rest: 'text-yellow-400',
  set_rest: 'text-orange-400',
  cooldown: 'text-blue-300',
  done: 'text-[#992828]',
};

const PHASE_BG: Record<TimerPhase, string> = {
  idle: 'border-gray-700',
  warmup: 'border-blue-500/30',
  work: 'border-green-500/30',
  rest: 'border-yellow-500/30',
  set_rest: 'border-orange-500/30',
  cooldown: 'border-blue-400/30',
  done: 'border-[#992828]/30',
};

const PHASE_LABELS: Record<TimerPhase, string> = {
  idle: '准备', warmup: '热身', work: '训练', rest: '休息', set_rest: '组间休息', cooldown: '冷身', done: '完成',
};

export default function IntervalTimer({ preset: initialPreset, onComplete, onPhaseChange, compact = false, floating = false }: IntervalTimerProps) {
  const [preset, setPreset] = useState<TimerPreset>(initialPreset || TIMER_PRESETS[0]);
  const [state, setState] = useState<TimerState>({
    phase: 'idle', currentRound: 1, currentSet: 1, remainingSeconds: 0, totalElapsed: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  const presetRef = useRef(preset);
  stateRef.current = state;
  presetRef.current = preset;

  // 清理
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // 获取下一阶段
  const getNextPhase = useCallback((s: TimerState, p: TimerPreset): TimerState => {
    const next = { ...s, totalElapsed: s.totalElapsed + 1 };

    if (s.remainingSeconds > 1) {
      return { ...next, remainingSeconds: s.remainingSeconds - 1 };
    }

    // 阶段转换
    switch (s.phase) {
      case 'idle':
        if (p.warmupSeconds > 0) return { ...next, phase: 'warmup', remainingSeconds: p.warmupSeconds };
        return { ...next, phase: 'work', remainingSeconds: p.workSeconds, currentRound: 1 };

      case 'warmup':
        return { ...next, phase: 'work', remainingSeconds: p.workSeconds, currentRound: 1 };

      case 'work':
        if (s.currentRound < p.rounds) {
          return { ...next, phase: 'rest', remainingSeconds: p.restSeconds };
        }
        // 这一组完成了
        if (s.currentSet < p.sets && p.setRestSeconds > 0) {
          return { ...next, phase: 'set_rest', remainingSeconds: p.setRestSeconds, currentSet: s.currentSet + 1, currentRound: 1 };
        }
        if (s.currentSet < p.sets) {
          return { ...next, phase: 'work', remainingSeconds: p.workSeconds, currentSet: s.currentSet + 1, currentRound: 1 };
        }
        // 全部完成
        if (p.cooldownSeconds > 0) return { ...next, phase: 'cooldown', remainingSeconds: p.cooldownSeconds };
        return { ...next, phase: 'done', remainingSeconds: 0 };

      case 'rest':
        return { ...next, phase: 'work', remainingSeconds: p.workSeconds, currentRound: s.currentRound + 1 };

      case 'set_rest':
        return { ...next, phase: 'work', remainingSeconds: p.workSeconds, currentRound: 1 };

      case 'cooldown':
        return { ...next, phase: 'done', remainingSeconds: 0 };

      case 'done':
        return { ...s, phase: 'done', remainingSeconds: 0 };
    }
  }, []);

  // Tick
  const tick = useCallback(() => {
    setState(prev => {
      const next = getNextPhase(prev, presetRef.current);
      if (prev.phase !== next.phase) {
        onPhaseChange?.(next.phase, next);
        // 振动
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          if (next.phase === 'work' || next.phase === 'done') navigator.vibrate([200, 100, 200]);
          else navigator.vibrate(100);
        }
      }
      // 最后3秒短振
      if (next.remainingSeconds <= 3 && next.remainingSeconds > 0 && next.phase !== prev.phase) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
      if (next.phase === 'done') {
        setIsRunning(false);
        onComplete?.();
      }
      return next;
    });
  }, [getNextPhase, onComplete, onPhaseChange]);

  // 开始/暂停
  const toggle = useCallback(() => {
    if (isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsRunning(false);
    } else {
      if (state.phase === 'idle' || state.phase === 'done') {
        const newState: TimerState = {
          phase: 'idle', currentRound: 1, currentSet: 1,
          remainingSeconds: preset.warmupSeconds > 0 ? preset.warmupSeconds : preset.workSeconds,
          totalElapsed: 0,
        };
        setState(preset.warmupSeconds > 0 ? { ...newState, phase: 'warmup', remainingSeconds: preset.warmupSeconds } : { ...newState, phase: 'work', remainingSeconds: preset.workSeconds });
      }
      intervalRef.current = setInterval(tick, 1000);
      setIsRunning(true);
    }
  }, [isRunning, state.phase, state.remainingSeconds, preset, tick]);

  // 重置
  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setState({ phase: 'idle', currentRound: 1, currentSet: 1, remainingSeconds: 0, totalElapsed: 0 });
  }, []);

  // 格式化时间
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // 选择预设
  const selectPreset = (p: TimerPreset) => {
    reset();
    setPreset(p);
  };

  const isLastFive = state.remainingSeconds <= 5 && state.remainingSeconds > 0 && isRunning;

  if (compact) {
    return (
      <div className={`bg-[#0d0d0d] border rounded-xl p-3 ${PHASE_BG[state.phase]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">{preset.nameCn}</span>
            <span className={`text-xs ${PHASE_COLORS[state.phase]}`}>{PHASE_LABELS[state.phase]}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-lg font-bold ${isLastFive ? 'text-[#992828] animate-pulse' : PHASE_COLORS[state.phase]}`}>
              {state.phase === 'idle' ? '--:--' : formatTime(state.remainingSeconds)}
            </span>
            <button onClick={toggle} className="w-8 h-8 rounded-full bg-[#992828] text-white text-xs flex items-center justify-center">
              {isRunning ? '⏸' : '▶'}
            </button>
          </div>
        </div>
        {state.phase !== 'idle' && state.phase !== 'done' && (
          <div className="text-[10px] text-gray-600 mt-1">
            组{state.currentSet}/{preset.sets} · 轮{state.currentRound}/{preset.rounds}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-[#0d0d0d] border border-[#222] rounded-2xl p-5 ${floating ? 'shadow-2xl shadow-black/50' : ''}`}>
      {/* 预设选择 */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        {TIMER_PRESETS.map(p => (
          <button key={p.id}
            onClick={() => selectPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition ${
              preset.id === p.id
                ? 'bg-[#992828] text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
            }`}>
            {p.nameCn}
          </button>
        ))}
      </div>

      {/* 大计时器 */}
      <div className={`text-center py-6 rounded-xl border mb-3 ${PHASE_BG[state.phase]} ${
        isLastFive ? 'animate-pulse' : ''
      }`}>
        <div className={`text-5xl md:text-6xl font-mono font-bold ${PHASE_COLORS[state.phase]}`}>
          {state.phase === 'idle' ? '--:--' : formatTime(state.remainingSeconds)}
        </div>
        <div className={`text-sm mt-2 ${PHASE_COLORS[state.phase]}`}>
          {PHASE_LABELS[state.phase]}
        </div>
      </div>

      {/* 进度 */}
      {state.phase !== 'idle' && state.phase !== 'done' && (
        <div className="text-center text-xs text-gray-500 mb-3">
          第 {state.currentSet}/{preset.sets} 组 · 第 {state.currentRound}/{preset.rounds} 轮
          {state.phase === 'set_rest' && ` · 下组${preset.workSeconds}s训练`}
        </div>
      )}

      {/* 控制按钮 */}
      <div className="flex gap-2">
        <button onClick={toggle}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${
            isRunning
              ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
              : 'bg-[#992828] text-white hover:bg-[#7a1e1e]'
          }`}>
          {isRunning ? '⏸ 暂停' : state.phase === 'done' ? '🔄 重新开始' : '▶ 开始'}
        </button>
        {isRunning && (
          <button onClick={reset}
            className="px-4 py-3 rounded-xl text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition">
            ⏹ 重置
          </button>
        )}
      </div>

      {/* 完成提示 */}
      {state.phase === 'done' && (
        <div className="text-center mt-3 text-[#992828] font-bold text-sm animate-bounce">
          🎉 训练完成！总用时 {formatTime(state.totalElapsed)}
        </div>
      )}
    </div>
  );
}
