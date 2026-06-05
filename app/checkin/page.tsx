'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Send, History, X } from 'lucide-react';
import type { ExerciseLogEntry } from '@/lib/training-log';

// ── types ──

interface PlayerCheckin {
  id: string;
  planId: string;
  playerName: string;
  date: string;
  exercises: ExerciseLogEntry[];
  submittedAt: string;
}

interface MicrocyclePlan {
  modules: any[];
  formData: any;
  scene: string;
  duration: number;
  goal: string;
  phase: string;
  savedAt: string;
}

const CHECKINS_KEY = 'kenshin_player_checkins';
const MC_KEY = 'kenshin_microcycle_plans';

// ── localStorage helpers ──

function loadCheckins(): PlayerCheckin[] {
  try { return JSON.parse(localStorage.getItem(CHECKINS_KEY) || '[]'); } catch { return []; }
}

function saveCheckin(checkin: PlayerCheckin) {
  try {
    const all = loadCheckins();
    // Overwrite existing check-in for same plan + player
    const idx = all.findIndex(c => c.planId === checkin.planId && c.playerName === checkin.playerName);
    if (idx >= 0) all[idx] = checkin;
    else all.unshift(checkin);
    localStorage.setItem(CHECKINS_KEY, JSON.stringify(all.slice(0, 100)));
  } catch {}
}

function loadMicrocyclePlans(): Record<string, MicrocyclePlan> {
  try { return JSON.parse(localStorage.getItem(MC_KEY) || '{}'); } catch { return {}; }
}

function getPlanById(planId: string): MicrocyclePlan | null {
  const plans = loadMicrocyclePlans();
  // planId in our system is like "2025-06-07_3" (matchDate_dayOffset)
  // or a generated UUID-like planId from useTraining
  const direct = plans[planId];
  if (direct) return direct;
  // Try matching by partial key
  for (const [k, v] of Object.entries(plans)) {
    if (k.includes(planId) || (v as any).planId === planId) {
      return v;
    }
  }
  return null;
}

// ── extract exercises from plan modules (duplicated from training-log for checkin context) ──

function extractExercises(modules: any[]): ExerciseLogEntry[] {
  const entries: ExerciseLogEntry[] = [];
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
      entries.push({
        name: ex.name || '—',
        plannedSets: typeof ex.sets === 'number' ? ex.sets : Array.isArray(ex.sets) ? ex.sets[0] : 3,
        plannedReps: typeof ex.reps === 'number' ? ex.reps : Array.isArray(ex.reps) ? ex.reps[0] : 10,
        plannedLoad: ex.load || ex.load_default || 'BW',
        completed: false,
      });
    }
  }
  return entries;
}

// ── RPE labels ──

const RPE_LABELS: Record<number, string> = {
  6: '轻松',
  7: '适中',
  8: '较难',
  8.5: '困难',
  9: '很困难',
  9.5: '极限',
  10: '力竭',
};

const RPE_VALUES = [6, 7, 8, 8.5, 9, 9.5, 10] as const;

// ── main page content (separated so Suspense works) ──

function CheckinContent() {
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan') || '';
  const playerName = searchParams.get('player') || '';

  const [code, setCode] = useState('');
  const [plan, setPlan] = useState<MicrocyclePlan | null>(null);
  const [exercises, setExercises] = useState<ExerciseLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState(playerName);
  const [generalNotes, setGeneralNotes] = useState('');

  // Load plan from planId
  useEffect(() => {
    if (!planId) return;
    const found = getPlanById(planId);
    if (found) {
      setPlan(found);
      setExercises(extractExercises(found.modules));
    } else {
      setError('未找到该训练方案，请联系教练重新分享链接');
    }
  }, [planId]);

  // Handle code lookup
  const handleCodeLookup = () => {
    if (code.length !== 6) {
      setError('请输入6位确认码');
      return;
    }
    setLoading(true);
    setError(null);

    // Try to find a plan matching the code
    // The code maps to a localStorage key pattern or plan ID
    const plans = loadMicrocyclePlans();
    const matchKey = Object.keys(plans).find(k => k.includes(code) || k.endsWith(code));
    if (matchKey) {
      const found = plans[matchKey];
      setPlan(found);
      setExercises(extractExercises(found.modules));
    } else {
      // Try matching by plan ID stored in plans
      let found: MicrocyclePlan | null = null;
      for (const [k, v] of Object.entries(plans)) {
        const planObj = v as any;
        if (planObj.planId && planObj.planId.includes(code)) {
          found = v;
          break;
        }
      }
      if (found) {
        setPlan(found);
        setExercises(extractExercises(found.modules));
      } else {
        setError('未找到匹配的训练方案，请确认确认码是否正确');
      }
    }
    setLoading(false);
  };

  const toggleComplete = (idx: number) => {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, completed: !e.completed, actualRPE: !e.completed ? e.actualRPE || 7 : undefined } : e));
  };

  const setRPE = (idx: number, rpe: number) => {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, actualRPE: rpe, completed: true } : e));
  };

  const updateNotes = (idx: number, notes: string) => {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, notes } : e));
  };

  const updateActual = (idx: number, field: 'actualSets' | 'actualReps' | 'actualLoad', value: any) => {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const handleSubmit = () => {
    const checkin: PlayerCheckin = {
      id: `ci_${Date.now()}`,
      planId: planId || code || 'unknown',
      playerName: playerNameInput || playerName || '球员',
      date: new Date().toISOString().slice(0, 10),
      exercises: exercises.map(e => ({
        ...e,
        notes: e.notes || generalNotes || undefined,
      })),
      submittedAt: new Date().toISOString(),
    };

    saveCheckin(checkin);
    setSubmitted(true);
  };

  const completedCount = exercises.filter(e => e.completed).length;

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
        <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h1 className="text-xl font-bold text-white">确认已提交</h1>
          <p className="text-sm text-gray-400">
            {playerNameInput || playerName || '球员'}，你的训练完成情况已记录
          </p>
          <div className="bg-[#1a1a1a] rounded-xl p-3 text-left space-y-1">
            <p className="text-xs text-gray-500">
              完成 {completedCount}/{exercises.length} 项动作
            </p>
            <p className="text-xs text-gray-500">
              提交时间：{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <p className="text-[10px] text-gray-600">
            教练将在下一次打开工作台时看到你的确认
          </p>
        </div>
      </div>
    );
  }

  // No plan loaded yet — show code input or error
  if (!plan && !planId) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
        <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl p-6 max-w-sm w-full space-y-4">
          <div className="text-center">
            <div className="text-3xl mb-2">📋</div>
            <h1 className="text-lg font-bold text-white">训练确认</h1>
            <p className="text-xs text-gray-500 mt-1">输入教练给你的6位确认码</p>
          </div>

          <input
            type="text"
            value={code}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(v);
              setError(null);
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleCodeLookup(); }}
            placeholder="000000"
            maxLength={6}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-4 text-center text-2xl text-white tracking-[0.5em] font-mono placeholder-gray-700 focus:border-[#d92525] outline-none"
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-[10px] text-red-400 text-center">
              {error}
            </div>
          )}

          <button onClick={handleCodeLookup} disabled={loading || code.length !== 6}
            className="w-full py-3 bg-[#d92525] hover:bg-[#b71d1d] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
            {loading ? <span className="animate-spin">⏳</span> : '🔍'} 查找训练方案
          </button>

          {/* History */}
          <button onClick={() => setShowHistory(!showHistory)}
            className="w-full py-2 text-[10px] text-gray-500 hover:text-white transition flex items-center justify-center gap-1">
            <History className="w-3 h-3" />
            查看最近确认记录
          </button>

          {showHistory && (
            <RecentCheckins onClose={() => setShowHistory(false)} />
          )}
        </div>
      </div>
    );
  }

  // Plan loaded — show exercises
  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0d0d0d]/95 backdrop-blur border-b border-[#222] px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-bold text-white">训练确认 · {plan?.phase === 'competition' ? '联赛期' : plan?.phase === 'preseason' ? '季前' : plan?.phase === 'recovery' ? '恢复期' : '休赛期'}</h1>
              <p className="text-[10px] text-gray-500">
                {plan?.scene === 'gym' ? '🏋️ 力量房' : '⚽ 外场'} · {plan?.duration ?? '?'}min · {plan?.goal ?? '?'}
              </p>
            </div>
            <button onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
              <History className="w-3 h-3" /> 记录
            </button>
          </div>
        </div>
      </div>

      {/* Player name input (if not from URL) */}
      <div className="max-w-lg mx-auto px-4 mt-3">
        {!playerName && (
          <input
            value={playerNameInput}
            onChange={e => setPlayerNameInput(e.target.value)}
            placeholder="输入你的名字"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-[#d92525] outline-none"
          />
        )}
        {playerName && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#d92525]/20 flex items-center justify-center text-[#d92525] font-bold text-xs">
              {playerName[0]}
            </div>
            <span className="text-white font-medium text-sm">{playerName}</span>
          </div>
        )}
      </div>

      {/* Exercise list */}
      <div className="max-w-lg mx-auto px-4 mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">训练动作 ({completedCount}/{exercises.length})</span>
          {completedCount === exercises.length && (
            <span className="text-[10px] text-green-400">全部完成 ✓</span>
          )}
        </div>

        {exercises.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-6 text-center">
            <p className="text-xs text-gray-500">该方案暂无训练动作</p>
          </div>
        ) : (
          exercises.map((ex, idx) => (
            <CheckinExerciseCard
              key={idx}
              idx={idx}
              exercise={ex}
              onToggle={() => toggleComplete(idx)}
              onRPE={(rpe) => setRPE(idx, rpe)}
              onNotes={(n) => updateNotes(idx, n)}
              onActual={(f, v) => updateActual(idx, f, v)}
            />
          ))
        )}
      </div>

      {/* General notes */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        <textarea
          value={generalNotes}
          onChange={e => setGeneralNotes(e.target.value)}
          placeholder="补充说明（如：左膝稍有不适、今天状态不错）"
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 resize-none focus:border-[#d92525] outline-none"
          rows={2}
        />
      </div>

      {/* Submit button */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        <button onClick={handleSubmit}
          className="w-full py-3.5 bg-[#d92525] hover:bg-[#b71d1d] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 active:scale-[0.98]">
          <Send className="w-4 h-4" />
          提交确认
        </button>

        <p className="text-center text-[9px] text-gray-600 mt-2">
          提交后，教练将在工作台看到你的训练完成情况
        </p>
      </div>

      {/* History drawer */}
      {showHistory && (
        <RecentCheckins onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}

// ── Exercise card ──

function CheckinExerciseCard({
  idx,
  exercise,
  onToggle,
  onRPE,
  onNotes,
  onActual,
}: {
  idx: number;
  exercise: ExerciseLogEntry;
  onToggle: () => void;
  onRPE: (rpe: number) => void;
  onNotes: (notes: string) => void;
  onActual: (field: 'actualSets' | 'actualReps' | 'actualLoad', value: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = exercise.completed;

  return (
    <div className={`border rounded-xl transition-all ${
      isCompleted
        ? 'bg-green-500/5 border-green-500/20'
        : 'bg-[#0d0d0d] border-[#222] hover:border-[#333]'
    }`}>
      <div className="flex items-center gap-3 p-3">
        {/* Check button */}
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${
            isCompleted
              ? 'bg-green-500 border-green-500 text-black'
              : 'border-gray-600 hover:border-gray-400'
          }`}>
          {isCompleted && <Check className="w-3.5 h-3.5" />}
        </button>

        {/* Exercise info */}
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <p className={`text-xs font-medium truncate ${isCompleted ? 'text-green-400' : 'text-white'}`}>
            {idx + 1}. {exercise.name}
          </p>
          <p className="text-[10px] text-gray-500">
            {exercise.plannedSets}组 × {exercise.plannedReps}次 · {exercise.plannedLoad}
            {exercise.actualRPE && (
              <span className="ml-2 text-[#d92525]">RPE {exercise.actualRPE}</span>
            )}
          </p>
        </div>

        {/* Expand button */}
        <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-white shrink-0">
          <ChevronDown className={`w-4 h-4 transition ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expanded: RPE selector + notes */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-[#1a1a1a] pt-2 space-y-2">
          {/* RPE selector */}
          <div>
            <p className="text-[9px] text-gray-500 mb-1.5">自感劳累 (RPE)</p>
            <div className="flex gap-1">
              {RPE_VALUES.map(r => (
                <button
                  key={r}
                  onClick={() => onRPE(r)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition ${
                    exercise.actualRPE === r
                      ? 'bg-[#d92525] text-white'
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}>
                  <div>{r}</div>
                  <div className="text-[7px] opacity-60">{RPE_LABELS[r]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Actual sets/reps/load */}
          {isCompleted && (
            <div className="flex gap-2 text-[10px]">
              <div className="flex-1">
                <label className="text-gray-500 block mb-0.5">实际组数</label>
                <input
                  type="number"
                  value={exercise.actualSets || exercise.plannedSets}
                  onChange={e => onActual('actualSets', parseInt(e.target.value) || undefined)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-center"
                  min={0}
                />
              </div>
              <div className="flex-1">
                <label className="text-gray-500 block mb-0.5">实际次数/组</label>
                <input
                  type="number"
                  value={exercise.actualReps || exercise.plannedReps}
                  onChange={e => onActual('actualReps', parseInt(e.target.value) || undefined)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-center"
                  min={0}
                />
              </div>
              <div className="flex-1">
                <label className="text-gray-500 block mb-0.5">实际负荷</label>
                <input
                  type="text"
                  value={exercise.actualLoad || exercise.plannedLoad}
                  onChange={e => onActual('actualLoad', e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-center"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <input
            type="text"
            value={exercise.notes || ''}
            onChange={e => onNotes(e.target.value)}
            placeholder="备注（如：膝盖不适、减了重量）"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-white placeholder-gray-600"
          />
        </div>
      )}
    </div>
  );
}

// ── ChevronDown inline since we used it ──
function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Recent check-ins panel ──

function RecentCheckins({ onClose }: { onClose: () => void }) {
  const [checkins, setCheckins] = useState<PlayerCheckin[]>([]);

  useEffect(() => {
    setCheckins(loadCheckins().slice(0, 10));
  }, []);

  return (
    <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}>
      <div className="bg-[#0d0d0d] border border-[#222] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[60vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0d0d0d] border-b border-[#222] p-3 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white">最近确认记录</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 space-y-2">
          {checkins.length === 0 ? (
            <p className="text-[10px] text-gray-600 text-center py-6">暂无确认记录</p>
          ) : (
            checkins.map(c => (
              <div key={c.id} className="bg-[#1a1a1a] rounded-lg p-2.5 text-[10px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium">{c.playerName}</span>
                  <span className="text-gray-500">{c.date}</span>
                </div>
                <p className="text-gray-400">
                  {c.exercises.filter(e => e.completed).length}/{c.exercises.length} 项完成
                </p>
                <p className="text-[9px] text-gray-600 mt-0.5">
                  {new Date(c.submittedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page export with Suspense wrapper ──

export default function CheckinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-gray-500 text-sm">加载中...</div>
      </div>
    }>
      <CheckinContent />
    </Suspense>
  );
}
