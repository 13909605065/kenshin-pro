/**
 * 个人纪录仪表盘 — PR追踪和徽章展示
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { PR_CATEGORIES, getPRSummary, recordPR, getPRHistory, deletePR, getAllPRs } from '@/lib/pr-tracker';
import { getMotivationStats, recordPRBadge, getMileage } from '@/lib/motivation';
import type { PersonalRecord, MotivationStats } from '@/lib/types';

// ═══════════════════════════════════════════

export function PRDashboard() {
  const [prSummary, setPRSummary] = useState<ReturnType<typeof getPRSummary>>([]);
  const [mileage, setMileage] = useState<ReturnType<typeof getMileage>>([]);
  const [motivation, setMotivation] = useState<MotivationStats | null>(null);
  const [showAddPR, setShowAddPR] = useState(false);
  const [newPRName, setNewPRName] = useState('');
  const [newPRValue, setNewPRValue] = useState('');
  const [newPRUnit, setNewPRUnit] = useState('kg');
  const [justBrokePR, setJustBrokePR] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setPRSummary(getPRSummary());
    setMileage(getMileage());
    setMotivation(getMotivationStats());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAddPR = () => {
    if (!newPRName || !newPRValue) return;
    const { isNewRecord } = recordPR({
      exerciseName: newPRName,
      metricType: 'custom',
      value: parseFloat(newPRValue),
      unit: newPRUnit,
      date: new Date().toISOString().slice(0, 10),
    });
    if (isNewRecord) {
      setJustBrokePR(newPRName);
      recordPRBadge();
      setTimeout(() => setJustBrokePR(null), 3000);
    }
    setShowAddPR(false);
    setNewPRName('');
    setNewPRValue('');
    refresh();
  };

  const handleDeletePR = (id: string) => {
    deletePR(id);
    refresh();
  };

  return (
    <div className="space-y-4">
      {/* 里程统计 */}
      <div className="grid grid-cols-3 gap-2">
        {mileage.map(m => (
          <div key={m.label} className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 text-center">
            <div className="text-lg mb-0.5">{m.icon}</div>
            <div className="text-sm font-bold text-white">{m.value}<span className="text-[10px] text-gray-500 ml-0.5">{m.unit}</span></div>
            <div className="text-[10px] text-gray-600">{m.label}</div>
          </div>
        ))}
      </div>

      {/* PR 列表 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">🏆 个人纪录</h3>
          <button onClick={() => setShowAddPR(!showAddPR)}
            className="text-[10px] text-[#992828] hover:underline">
            + 添加PR
          </button>
        </div>

        {showAddPR && (
          <div className="bg-[#0d0d0d] border border-[#992828]/30 rounded-xl p-3 space-y-2 mb-3">
            <input type="text" value={newPRName} onChange={e => setNewPRName(e.target.value)}
              placeholder="动作名称" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
            <div className="flex gap-2">
              <input type="number" value={newPRValue} onChange={e => setNewPRValue(e.target.value)}
                placeholder="数值" className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              <select value={newPRUnit} onChange={e => setNewPRUnit(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-2 text-xs text-white">
                <option value="kg">kg</option><option value="s">秒</option>
                <option value="cm">cm</option><option value="次">次</option>
              </select>
            </div>
            <button onClick={handleAddPR}
              className="w-full py-2 bg-[#992828] text-white rounded-lg text-xs font-bold">
              记录
            </button>
          </div>
        )}

        {justBrokePR && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center mb-3 animate-bounce">
            <span className="text-yellow-400 font-bold text-sm">🎉 新纪录！{justBrokePR}</span>
          </div>
        )}

        {prSummary.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-600">
            暂无PR记录，开始训练后会自动追踪
          </div>
        ) : (
          <div className="space-y-2">
            {prSummary.map(pr => (
              <div key={pr.exerciseName}
                className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-white font-semibold">{pr.label}</div>
                  <div className="text-[10px] text-gray-500">{pr.count}次记录 · 最近: {pr.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#992828]">
                    {pr.best}<span className="text-xs text-gray-500 ml-0.5">{pr.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 徽章墙 */}
      {motivation && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-2">🎖️ 徽章 ({motivation.badges.filter(b => b.earnedAt).length}/{motivation.badges.length})</h3>
          <div className="grid grid-cols-4 gap-2">
            {motivation.badges.map(badge => (
              <div key={badge.id}
                className={`rounded-xl p-2 text-center border transition ${
                  badge.earnedAt
                    ? 'bg-yellow-500/5 border-yellow-500/30'
                    : 'bg-[#0d0d0d] border-[#222] opacity-50'
                }`}>
                <div className="text-xl">{badge.icon}</div>
                <div className={`text-[9px] font-semibold mt-0.5 ${badge.earnedAt ? 'text-white' : 'text-gray-600'}`}>
                  {badge.nameCn}
                </div>
                {!badge.earnedAt && badge.progress > 0 && (
                  <div className="mt-1 h-1 bg-gray-800 rounded-full">
                    <div className="h-full bg-[#992828] rounded-full" style={{ width: `${badge.progress}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 当前Streak */}
      {motivation && motivation.currentStreak > 0 && (
        <div className="bg-[#0d0d0d] border border-[#992828]/20 rounded-xl p-3 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <div className="text-white font-bold">连续训练 {motivation.currentStreak} 天</div>
            <div className="text-[10px] text-gray-500">最长纪录: {motivation.bestStreak} 天</div>
          </div>
        </div>
      )}
    </div>
  );
}
