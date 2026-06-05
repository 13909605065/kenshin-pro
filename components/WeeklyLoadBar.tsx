'use client';

import { useState } from 'react';
import { useWeeklyLoad, type WeeklyLoadReport, type DailyLoad } from '@/lib/weekly-load';

// ═══════════════════════════════════════════
// Props
// ═══════════════════════════════════════════

interface Props {
  matchDate: string;
  mdDay: number;
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

const STATUS_BADGE: Record<WeeklyLoadReport['status'], { emoji: string; label: string; className: string }> = {
  safe: { emoji: '\u{1F7E2}', label: '安全', className: 'text-green-400 bg-green-500/10 border-green-500/20' },
  warning: { emoji: '\u{1F7E1}', label: '关注', className: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  overload: { emoji: '\u{1F534}', label: '超负荷', className: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

const RISK_COLORS: Record<DailyLoad['riskLevel'], string> = {
  normal: 'bg-green-500',
  elevated: 'bg-yellow-500',
  high: 'bg-red-500',
};

const MAX_BAR_WIDTH = 100; // percentage

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export default function WeeklyLoadBar({ matchDate }: Props) {
  const report = useWeeklyLoad(matchDate);
  const [expanded, setExpanded] = useState(false);

  const badge = STATUS_BADGE[report.status];

  // Auto-collapse if empty (no load data at all)
  const isEmpty = report.totalTRIMP === 0;

  if (isEmpty) {
    return (
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">周负荷</span>
          <span className="text-[10px] text-gray-600">暂无数据</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#222] rounded-xl overflow-hidden">
      {/* ── Compact header (always visible) ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-2 hover:bg-[#111] transition text-left"
      >
        <span className="text-xs font-bold text-white shrink-0">周负荷</span>

        {/* Total bar */}
        <div className="flex-1 h-3 bg-[#1a1a1a] rounded-full overflow-hidden min-w-0">
          <div
            className={`h-full rounded-full transition-all ${RISK_COLORS[report.daily[0]?.riskLevel || 'normal']}`}
            style={{ width: `${Math.min((report.totalTRIMP / 1500) * 100, MAX_BAR_WIDTH)}%` }}
          />
        </div>

        {/* Total + status */}
        <span className="text-xs font-mono font-bold text-white shrink-0">
          {report.totalTRIMP}
          <span className="text-gray-500 font-normal">/1,500</span>
        </span>

        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.className} shrink-0`}>
          {badge.emoji} {badge.label}
        </span>

        {/* Warnings indicator */}
        {report.warnings.length > 0 && (
          <span className="text-[9px] text-yellow-400 shrink-0" title={report.warnings.join('; ')}>
            {'⚠'}{report.warnings.length}
          </span>
        )}

        {/* Expand/collapse chevron */}
        <span className="text-[10px] text-gray-600 shrink-0">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* ── Expanded daily breakdown ── */}
      {expanded && (
        <div className="px-3 pb-3 space-y-1 border-t border-[#222] pt-2">
          {report.daily.map((day) => {
            const dayMax = Math.max(day.totalTRIMP, 1);
            const pct = Math.min((day.totalTRIMP / 300) * 100, MAX_BAR_WIDTH);

            return (
              <div key={day.date} className="flex items-center gap-2 text-[10px]">
                {/* Weekday + MD label */}
                <span className="w-16 shrink-0 text-gray-400 truncate">
                  {day.weekday}
                </span>
                <span className={`w-10 shrink-0 text-right text-[9px] font-mono ${
                  day.mdLabel === 'MD'
                    ? 'text-[#d92525] font-bold'
                    : 'text-gray-500'
                }`}>
                  {day.mdLabel}
                </span>

                {/* Day bar */}
                <div className="flex-1 h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden min-w-0 relative">
                  <div
                    className={`h-full rounded-full transition-all ${RISK_COLORS[day.riskLevel]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* TRIMP number */}
                <span className={`w-10 shrink-0 text-right font-mono ${
                  day.riskLevel === 'high' ? 'text-red-400 font-bold' :
                  day.riskLevel === 'elevated' ? 'text-yellow-400' :
                  'text-gray-400'
                }`}>
                  {day.totalTRIMP}
                </span>

                {/* Segment summary */}
                <span className="w-36 shrink-0 text-gray-600 truncate text-[9px]" title={
                  day.segments.map(s => s.label).join(' | ')
                }>
                  {day.segments.length === 0 ? '休息' : day.segments.map(s => s.label.split('·')[0]).join(' + ')}
                </span>
              </div>
            );
          })}

          {/* ── Weekly summary row ── */}
          <div className="flex items-center gap-2 text-[10px] pt-1.5 mt-1 border-t border-[#222]">
            <span className="w-16 shrink-0 text-gray-500">合计</span>
            <span className="w-10 shrink-0" />
            <div className="flex-1" />
            <span className="w-10 shrink-0 text-right font-mono text-white font-bold">
              {report.totalTRIMP}
            </span>
            <span className="w-36 shrink-0 text-gray-500 text-[9px]">
              日均 {report.averageDailyTRIMP} TRIMP
            </span>
          </div>

          {/* ── Warnings ── */}
          {report.warnings.length > 0 && (
            <div className="pt-1.5 space-y-0.5">
              {report.warnings.map((w, i) => (
                <div key={i} className="text-[9px] text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/10 rounded px-2 py-1">
                  {'⚠'} {w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
