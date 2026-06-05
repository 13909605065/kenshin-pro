/**
 * 逐组RPE录入器 — 移动端大按钮快速记录每组的实际RPE
 */

'use client';

import { useState, useCallback } from 'react';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface SetLogEntry {
  id: string;
  exerciseName: string;
  setNumber: number;
  targetReps: number;
  actualReps: number;
  load: number;
  rpe: number;
  completed: boolean;
  notes?: string;
  timestamp: string;
}

interface SetRpeLoggerProps {
  exerciseName: string;
  setNumber: number;
  totalSets: number;
  targetReps: number;
  targetLoad: number;
  onComplete: (log: SetLogEntry) => void;
  onSkip?: () => void;
}

// ═══════════════════════════════════════════
// RPE scale
// ═══════════════════════════════════════════

const RPE_LEVELS = [
  { value: 6, label: '6', desc: '轻松', color: 'bg-green-600' },
  { value: 7, label: '7', desc: '较轻松', color: 'bg-green-500' },
  { value: 8, label: '8', desc: '有挑战', color: 'bg-yellow-600' },
  { value: 9, label: '9', desc: '很难', color: 'bg-orange-600' },
  { value: 10, label: '10', desc: '极限', color: 'bg-red-600' },
];

// ═══════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════

export function SetRpeLogger({ exerciseName, setNumber, totalSets, targetReps, targetLoad, onComplete, onSkip }: SetRpeLoggerProps) {
  const [actualReps, setActualReps] = useState(targetReps);
  const [actualLoad, setActualLoad] = useState(targetLoad);
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(() => {
    if (rpe === null) return;
    const log: SetLogEntry = {
      id: `${exerciseName}_set${setNumber}_${Date.now()}`,
      exerciseName,
      setNumber,
      targetReps,
      actualReps,
      load: actualLoad,
      rpe,
      completed: true,
      notes: notes || undefined,
      timestamp: new Date().toISOString(),
    };
    setSubmitted(true);
    onComplete(log);
  }, [exerciseName, setNumber, targetReps, actualReps, actualLoad, rpe, notes, onComplete]);

  if (submitted) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center gap-2">
        <span className="text-lg">✅</span>
        <div className="text-xs">
          <span className="text-green-400 font-semibold">{exerciseName} 第{setNumber}组完成</span>
          <span className="text-gray-500 ml-2">{actualReps}次×{actualLoad}kg @ RPE {rpe}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4 space-y-3">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-white font-semibold">{exerciseName}</span>
          <span className="text-xs text-gray-500 ml-2">第 {setNumber}/{totalSets} 组</span>
        </div>
        <span className="text-xs text-gray-400">目标: {targetReps}次×{targetLoad}kg</span>
      </div>

      {/* 实际次数和重量 */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[10px] text-gray-500 block mb-1">实际次数</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setActualReps(Math.max(1, actualReps - 1))}
              className="w-8 h-8 rounded-lg bg-[#1a1a1a] text-white text-sm hover:bg-[#333]">−</button>
            <span className="text-lg font-bold text-white min-w-[2ch] text-center">{actualReps}</span>
            <button onClick={() => setActualReps(actualReps + 1)}
              className="w-8 h-8 rounded-lg bg-[#1a1a1a] text-white text-sm hover:bg-[#333]">+</button>
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-gray-500 block mb-1">实际负荷(kg)</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setActualLoad(Math.max(0, actualLoad - 2.5))}
              className="w-8 h-8 rounded-lg bg-[#1a1a1a] text-white text-sm hover:bg-[#333]">−</button>
            <span className="text-lg font-bold text-white min-w-[3ch] text-center">{actualLoad}</span>
            <button onClick={() => setActualLoad(actualLoad + 2.5)}
              className="w-8 h-8 rounded-lg bg-[#1a1a1a] text-white text-sm hover:bg-[#333]">+</button>
          </div>
        </div>
      </div>

      {/* RPE 选择 */}
      <div>
        <label className="text-[10px] text-gray-500 block mb-1.5">RPE (自感用力程度)</label>
        <div className="flex gap-1.5">
          {RPE_LEVELS.map(level => (
            <button key={level.value}
              onClick={() => setRpe(level.value)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold text-white transition ${
                rpe === level.value
                  ? `${level.color} ring-2 ring-white/30 scale-105`
                  : 'bg-[#1a1a1a] hover:bg-[#333]'
              }`}>
              <div>{level.label}</div>
              <div className="text-[9px] opacity-60">{level.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 备注 */}
      {showNotes && (
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="如: 最后一组很吃力, 左膝稍有不适…"
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 resize-none"
          rows={2} />
      )}

      {/* 按钮 */}
      <div className="flex gap-2">
        <button onClick={() => setShowNotes(!showNotes)}
          className="px-3 py-2 rounded-lg text-xs bg-[#1a1a1a] text-gray-400 hover:text-white transition">
          {showNotes ? '收起备注' : '📝 添加备注'}
        </button>
        {onSkip && (
          <button onClick={onSkip}
            className="px-3 py-2 rounded-lg text-xs bg-gray-700 text-gray-400 hover:text-white transition">
            跳过
          </button>
        )}
        <button onClick={handleSubmit}
          disabled={rpe === null}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
            rpe !== null
              ? 'bg-[#d92525] text-white hover:bg-[#b71d1d]'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}>
          ✓ 标记完成
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 多组训练日志组件
// ═══════════════════════════════════════════

interface MultiSetLoggerProps {
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    load: number;
  }>;
  onAllComplete?: (logs: SetLogEntry[]) => void;
}

export function MultiSetLogger({ exercises, onAllComplete }: MultiSetLoggerProps) {
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [logs, setLogs] = useState<SetLogEntry[]>([]);

  const ex = exercises[currentExIdx];
  if (!ex || currentExIdx >= exercises.length) {
    // 全部完成
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <div className="text-white font-bold">全部训练完成！</div>
        <div className="text-xs text-gray-400 mt-1">{logs.length}组记录已完成</div>
      </div>
    );
  }

  const handleSetComplete = useCallback((log: SetLogEntry) => {
    setLogs(prev => [...prev, log]);

    if (currentSet < ex.sets) {
      setCurrentSet(prev => prev + 1);
    } else if (currentExIdx < exercises.length - 1) {
      setCurrentExIdx(prev => prev + 1);
      setCurrentSet(1);
    } else {
      // 全部完成
      const allLogs = [...logs, log];
      onAllComplete?.(allLogs);
      setCurrentExIdx(exercises.length); // 触发完成视图
    }
  }, [currentSet, currentExIdx, ex.sets, exercises.length, logs, onAllComplete]);

  return (
    <div className="space-y-3">
      {/* 进度条 */}
      <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
        <span>动作 {currentExIdx + 1}/{exercises.length}</span>
        <div className="flex-1 h-1 bg-gray-800 rounded-full">
          <div className="h-full bg-[#d92525] rounded-full transition"
            style={{ width: `${((currentExIdx * ex.sets + currentSet - 1) / (exercises.reduce((s, e) => s + e.sets, 0))) * 100}%` }} />
        </div>
      </div>

      <SetRpeLogger
        exerciseName={ex.name}
        setNumber={currentSet}
        totalSets={ex.sets}
        targetReps={ex.reps}
        targetLoad={ex.load}
        onComplete={handleSetComplete}
      />

      {/* 已完成记录 */}
      {logs.length > 0 && (
        <div className="space-y-1">
          {logs.slice(-5).reverse().map(log => (
            <div key={log.id} className="flex items-center gap-2 text-[10px] text-gray-500">
              <span className="text-green-400">✓</span>
              <span>{log.exerciseName}</span>
              <span>第{log.setNumber}组</span>
              <span>{log.actualReps}次×{log.load}kg</span>
              <span className="text-yellow-400">RPE {log.rpe}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
