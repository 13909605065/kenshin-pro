'use client';

import { useState } from 'react';
import { Check, Save, X } from 'lucide-react';
import {
  extractExercisesFromModules,
  calcSummary,
  saveSessionLog,
  type ExerciseLogEntry,
  type TrainingSessionLog,
} from '@/lib/training-log';

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

export function TrainingLogPanel({ modules, planId, scene, goal, duration, matchDay, playerName, onClose }: Props) {
  const [entries, setEntries] = useState<ExerciseLogEntry[]>(() => extractExercisesFromModules(modules));
  const [saved, setSaved] = useState(false);
  const [notes, setNotes] = useState('');

  const toggleComplete = (i: number) => {
    setEntries(prev => prev.map((e, j) => j === i ? { ...e, completed: !e.completed } : e));
  };

  const updateEntry = (i: number, field: keyof ExerciseLogEntry, value: any) => {
    setEntries(prev => prev.map((e, j) => j === i ? { ...e, [field]: value } : e));
  };

  const handleSave = () => {
    const summary = calcSummary(entries, notes);
    const log: TrainingSessionLog = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      planId: planId || 'unknown',
      scene,
      goal,
      duration,
      matchDay,
      playerName,
      exercises: entries,
      summary,
      createdAt: new Date().toISOString(),
    };
    saveSessionLog(log);
    setSaved(true);
  };

  const completedCount = entries.filter(e => e.completed).length;
  const summary = calcSummary(entries, notes);

  return (
    <div className="bg-[#0d0d0d] border border-[#222] rounded-xl overflow-hidden mt-3">
      <div className="flex items-center justify-between p-3 border-b border-[#222] bg-[#111]">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          📝 训练日志
          <span className="text-gray-500 font-normal">{completedCount}/{entries.length} 完成</span>
        </h3>
        <div className="flex items-center gap-2">
          {saved ? (
            <span className="text-[10px] text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> 已保存</span>
          ) : (
            <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 text-[10px] bg-[#992828] hover:bg-[#7a1e1e] text-white rounded font-bold transition">
              <Save className="w-3 h-3" /> 保存日志
            </button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Exercise list */}
      <div className="max-h-[300px] overflow-y-auto">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-[#111] border-b border-[#222] text-gray-500">
            <tr>
              <th className="py-1 px-2 text-left w-5">✓</th>
              <th className="py-1 px-2 text-left">动作</th>
              <th className="py-1 px-2 text-center w-12">计划组</th>
              <th className="py-1 px-2 text-center w-16">实际组×次</th>
              <th className="py-1 px-2 text-center w-14">实际负荷</th>
              <th className="py-1 px-2 text-center w-10">RPE</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className={`border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/50 ${e.completed ? 'bg-green-500/5' : ''}`}>
                <td className="py-1 px-2">
                  <button onClick={() => toggleComplete(i)}
                    className={`w-4 h-4 rounded border transition flex items-center justify-center ${
                      e.completed ? 'bg-green-500 border-green-500 text-black' : 'border-gray-600 hover:border-gray-400'
                    }`}>
                    {e.completed && <Check className="w-2.5 h-2.5" />}
                  </button>
                </td>
                <td className="py-1 px-2 text-gray-300 truncate max-w-[120px]">{e.name}</td>
                <td className="py-1 px-2 text-center text-gray-500">{e.plannedSets}×{e.plannedReps}</td>
                <td className="py-1 px-2 text-center">
                  <input
                    type="text"
                    value={e.completed ? `${e.actualSets || e.plannedSets}×${e.actualReps || e.plannedReps}` : '—'}
                    onChange={(ev) => {
                      const [s, r] = ev.target.value.split('×');
                      updateEntry(i, 'actualSets', parseInt(s) || undefined);
                      updateEntry(i, 'actualReps', parseInt(r) || undefined);
                    }}
                    disabled={!e.completed}
                    className="w-14 bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-center text-gray-300 disabled:opacity-40"
                    placeholder="3×10"
                  />
                </td>
                <td className="py-1 px-2 text-center">
                  <input
                    type="text"
                    value={e.completed ? (e.actualLoad || e.plannedLoad) : '—'}
                    onChange={(ev) => updateEntry(i, 'actualLoad', ev.target.value)}
                    disabled={!e.completed}
                    className="w-12 bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-center text-gray-300 disabled:opacity-40"
                  />
                </td>
                <td className="py-1 px-2 text-center">
                  <select
                    value={e.actualRPE ?? ''}
                    onChange={(ev) => updateEntry(i, 'actualRPE', ev.target.value ? Number(ev.target.value) : undefined)}
                    disabled={!e.completed}
                    className="w-10 bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-center text-gray-300 disabled:opacity-40">
                    <option value="">—</option>
                    {[6,7,8,8.5,9,9.5,10].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary + Notes */}
      <div className="border-t border-[#222] p-3 bg-[#111]">
        <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 mb-2">
          <span>完成率 <span className="text-white font-bold">{summary.completionRate}%</span></span>
          {summary.averageRPE > 0 && <span>平均RPE <span className="text-white font-bold">{summary.averageRPE}</span></span>}
          <span>总量 <span className="text-white font-bold">{summary.totalVolumeLoad.toLocaleString()}kg</span></span>
        </div>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="训练备注（如：球员反馈、调整原因）"
          className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-gray-300"
        />
      </div>
    </div>
  );
}
