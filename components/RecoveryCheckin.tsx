/**
 * 训练后恢复日志 — 24h后追评
 */

'use client';

import { useState, useCallback } from 'react';

// ═══════════════════════════════════════════

interface RecoveryLog {
  date: string;
  trainingSessionId: string;
  hoursPostTraining: number;
  sorenessLevels: Record<string, number>;
  painSites: Array<{ site: string; severity: 1 | 2 | 3 }>;
  recoveryQuality: 1 | 2 | 3 | 4 | 5;
  recoveryMethods: string[];
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

const STORAGE_KEY = 'kenshin_recovery_log';

const MUSCLE_GROUPS = [
  { id: 'quads', label: '股四头肌', region: '下肢' },
  { id: 'hamstrings', label: '腘绳肌', region: '下肢' },
  { id: 'glutes', label: '臀大肌', region: '下肢' },
  { id: 'calves', label: '小腿', region: '下肢' },
  { id: 'chest', label: '胸大肌', region: '上肢' },
  { id: 'back', label: '背阔肌', region: '上肢' },
  { id: 'shoulders', label: '三角肌', region: '上肢' },
  { id: 'core', label: '核心/腹肌', region: '躯干' },
  { id: 'lower_back', label: '下背/竖脊肌', region: '躯干' },
];

const RECOVERY_METHODS = [
  { id: 'foam_roll', label: '🧻 泡沫轴', icon: '🧻' },
  { id: 'static_stretch', label: '🧘 静态拉伸', icon: '🧘' },
  { id: 'ice_bath', label: '🧊 冰浴', icon: '🧊' },
  { id: 'massage', label: '💆 按摩', icon: '💆' },
  { id: 'compression', label: '🧦 压缩服', icon: '🧦' },
  { id: 'active_recovery', label: '🚶 主动恢复', icon: '🚶' },
  { id: 'contrast_shower', label: '🚿 冷热交替', icon: '🚿' },
  { id: 'nutrition', label: '🥗 营养补充', icon: '🥗' },
];

interface RecoveryCheckinProps {
  trainingSessionId?: string;
  onComplete?: (log: RecoveryLog) => void;
}

export function RecoveryCheckin({ trainingSessionId = 'default', onComplete }: RecoveryCheckinProps) {
  const [soreness, setSoreness] = useState<Record<string, number>>({});
  const [painSites, setPainSites] = useState<Array<{ site: string; severity: 1 | 2 | 3 }>>([]);
  const [recoveryQuality, setRecoveryQuality] = useState(3);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleSoreness = (muscleId: string) => {
    setSoreness(prev => {
      const next = { ...prev };
      if (next[muscleId]) {
        delete next[muscleId];
      } else {
        next[muscleId] = 3; // 默认适中
      }
      return next;
    });
  };

  const updateSoreness = (muscleId: string, level: number) => {
    setSoreness(prev => ({ ...prev, [muscleId]: level }));
  };

  const toggleMethod = (methodId: string) => {
    setSelectedMethods(prev =>
      prev.includes(methodId) ? prev.filter(m => m !== methodId) : [...prev, methodId]
    );
  };

  const handleSubmit = () => {
    const log: RecoveryLog = {
      date: new Date().toISOString().slice(0, 10),
      trainingSessionId,
      hoursPostTraining: 24,
      sorenessLevels: soreness,
      painSites,
      recoveryQuality: recoveryQuality as 1 | 2 | 3 | 4 | 5,
      recoveryMethods: selectedMethods,
      sleepQuality: sleepQuality as 1 | 2 | 3 | 4 | 5,
      notes: notes || undefined,
    };

    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      existing.unshift(log);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
    } catch { /* ignore */ }

    setSubmitted(true);
    onComplete?.(log);
  };

  if (submitted) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
        <div className="text-2xl mb-1">✅</div>
        <div className="text-sm text-green-400 font-bold">恢复日志已记录</div>
        <div className="text-[10px] text-gray-500 mt-0.5">良好恢复 = 更好的训练效果</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">🧘 训练后恢复日志</h3>

      {/* 肌肉酸痛 */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">💪 哪些部位有酸痛？点击标记</label>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_GROUPS.map(m => (
            <button key={m.id}
              onClick={() => toggleSoreness(m.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] transition ${
                soreness[m.id] !== undefined
                  ? 'bg-[#992828]/20 text-[#992828] border border-[#992828]/30'
                  : 'bg-[#1a1a1a] text-gray-400 border border-[#222]'
              }`}>
              {m.label}
            </button>
          ))}
        </div>
        {Object.keys(soreness).length > 0 && (
          <div className="mt-2 space-y-1">
            {Object.entries(soreness).map(([id, level]) => (
              <div key={id} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-20">{MUSCLE_GROUPS.find(m => m.id === id)?.label}</span>
                <input type="range" min={1} max={5} value={level}
                  onChange={e => updateSoreness(id, Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-gray-700" />
                <span className="text-[10px] text-gray-500 w-12 text-right">
                  {['很轻','轻','中','重','极重'][level - 1]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 恢复手段 */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">🔧 做了哪些恢复？（多选）</label>
        <div className="flex flex-wrap gap-1.5">
          {RECOVERY_METHODS.map(m => (
            <button key={m.id}
              onClick={() => toggleMethod(m.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] transition ${
                selectedMethods.includes(m.id)
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-[#1a1a1a] text-gray-400 border border-[#222]'
              }`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 恢复质量 */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">💚 整体恢复感觉</label>
        <div className="flex gap-1.5">
          {['很差','较差','一般','不错','极好'].map((label, i) => (
            <button key={i}
              onClick={() => setRecoveryQuality(i + 1 as 1|2|3|4|5)}
              className={`flex-1 py-2 rounded-lg text-[10px] transition ${
                recoveryQuality === i + 1
                  ? 'bg-[#992828]/20 text-[#992828] border border-[#992828]/30'
                  : 'bg-[#1a1a1a] text-gray-400'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 睡眠 */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">😴 昨晚睡眠质量</label>
        <div className="flex gap-1.5">
          {['很差','较差','一般','不错','极好'].map((label, i) => (
            <button key={i}
              onClick={() => setSleepQuality(i + 1 as 1|2|3|4|5)}
              className={`flex-1 py-2 rounded-lg text-[10px] transition ${
                sleepQuality === i + 1
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-[#1a1a1a] text-gray-400'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 备注 */}
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="补充说明…"
        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 resize-none"
        rows={2} />

      <button onClick={handleSubmit}
        className="w-full py-3 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-xl text-sm font-bold transition">
        提交恢复日志
      </button>
    </div>
  );
}
