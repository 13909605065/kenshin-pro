"use client";

import React, { useState, useMemo } from "react";
import type { DashboardDaySummary, DashboardPlayerDay } from "@/lib/monitoring-client";

interface PlayerTrendsProps {
  days: DashboardDaySummary[];
  loading: boolean;
}

export default function PlayerTrends({ days, loading }: PlayerTrendsProps) {
  const [selectedPlayer, setSelectedPlayer] = useState("");

  // Collect unique player names from all days
  const playerNames = useMemo(() => {
    const names = new Set<string>();
    days.forEach(d => d.players.forEach(p => names.add(p.name)));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "zh"));
  }, [days]);

  // Build player history with dates from parent days
  const playerHistory = useMemo(() => {
    if (!selectedPlayer) return [];
    return days
      .filter(d => d.players.some(p => p.name === selectedPlayer))
      .map(d => {
        const p = d.players.find(p => p.name === selectedPlayer)!;
        return { ...p, _date: d.date };
      })
      .reverse();
  }, [days, selectedPlayer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-[#58a6ff] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Player selector */}
      <div className="bg-[#1a1f2e] border border-[#30363d] rounded-xl p-3">
        <select
          value={selectedPlayer}
          onChange={e => setSelectedPlayer(e.target.value)}
          className="w-full bg-[#0d1117] text-white border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:border-[#58a6ff] outline-none"
        >
          <option value="">— 选择球员 —</option>
          {playerNames.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {selectedPlayer && playerHistory.length > 0 && (
        <>
          {/* Stats summary */}
          <div className="bg-[#1a1f2e] border border-[#30363d] rounded-xl p-3">
            <div className="grid grid-cols-4 gap-2">
              <StatMini label="数据天数" value={playerHistory.length} />
              <StatMini label="均RPE" value={avg(playerHistory.map(p => p.rpe).filter(Boolean) as number[])} />
              <StatMini label="均睡眠" value={avg(playerHistory.map(p => p.sleep).filter(Boolean) as number[])} />
              <StatMini label="均疲劳" value={avg(playerHistory.map(p => p.fatigue).filter(Boolean) as number[])} />
            </div>
          </div>

          {/* Sparkline charts */}
          <div className="grid grid-cols-2 gap-2">
            <SparkLineCard
              title="RPE (0-10)"
              data={playerHistory.map(p => p.rpe)}
              labels={playerHistory.map(p => p._date?.slice(5) || "")}
              color="#2ea043"
              max={10}
            />
            <SparkLineCard
              title="睡眠 (1-5)"
              data={playerHistory.map(p => p.sleep)}
              labels={playerHistory.map(p => p._date?.slice(5) || "")}
              color="#58a6ff"
              max={5}
            />
            <SparkLineCard
              title="疲劳 (1-5)"
              data={playerHistory.map(p => p.fatigue)}
              labels={playerHistory.map(p => p._date?.slice(5) || "")}
              color="#d29922"
              max={5}
            />
            <SparkLineCard
              title="酸痛 (1-5)"
              data={playerHistory.map(p => p.soreness)}
              labels={playerHistory.map(p => p._date?.slice(5) || "")}
              color="#992828"
              max={5}
            />
          </div>

          {/* Notes history */}
          <div className="bg-[#1a1f2e] border border-[#30363d] rounded-xl p-3">
            <h3 className="text-xs font-semibold text-[#d29922] mb-2">📝 近期备注</h3>
            <div className="space-y-1">
              {playerHistory
                .filter(p => p.notes || p.injuryNote)
                .slice(0, 10)
                .map((p, i) => (
                  <div key={i} className="text-xs border-b border-[#21262d] py-1 last:border-0">
                    <span className="font-semibold text-white">{p._date?.slice(5)}</span>
                    <span className="text-[#8b949e] ml-2">{p.injuryNote || p.notes}</span>
                  </div>
                ))}
              {playerHistory.filter(p => p.notes || p.injuryNote).length === 0 && (
                <div className="text-xs text-[#8b949e]">暂无备注</div>
              )}
            </div>
          </div>
        </>
      )}

      {selectedPlayer && playerHistory.length === 0 && (
        <div className="text-center py-10 text-[#8b949e] text-sm">该球员暂无数据</div>
      )}
    </div>
  );
}

// ── Mini helpers ───────────────────────────────────────

function avg(arr: number[]): string {
  if (arr.length === 0) return "-";
  return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
}

function StatMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] text-[#8b949e]">{label}</div>
    </div>
  );
}

function SparkLineCard({
  title, data, labels, color, max,
}: {
  title: string; data: (number | null)[]; labels: string[]; color: string; max: number;
}) {
  const valid = data.map((v, i) => ({ v, i })).filter(d => d.v !== null) as { v: number; i: number }[];
  const h = 60;
  const w = 160;

  if (valid.length < 2) {
    return (
      <div className="bg-[#1a1f2e] border border-[#30363d] rounded-xl p-3">
        <div className="text-[10px] text-[#8b949e] mb-1">{title}</div>
        <div className="text-xs text-[#8b949e] h-[60px] flex items-center justify-center">数据不足</div>
      </div>
    );
  }

  const points = valid.map((d, idx) => {
    const x = (idx / Math.max(valid.length - 1, 1)) * w;
    const y = h - ((d.v - 0.5) / (max - 0.5)) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="bg-[#1a1f2e] border border-[#30363d] rounded-xl p-3">
      <div className="text-[10px] text-[#8b949e] mb-1">{title}</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[60px]">
        {/* Grid lines */}
        <line x1={0} y1={h * 0.25} x2={w} y2={h * 0.25} stroke="#21262d" strokeWidth="0.5" />
        <line x1={0} y1={h * 0.5} x2={w} y2={h * 0.5} stroke="#21262d" strokeWidth="0.5" />
        <line x1={0} y1={h * 0.75} x2={w} y2={h * 0.75} stroke="#21262d" strokeWidth="0.5" />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots */}
        {valid.map((d, idx) => {
          const x = (idx / Math.max(valid.length - 1, 1)) * w;
          const y = h - ((d.v - 0.5) / (max - 0.5)) * h;
          return <circle key={idx} cx={x} cy={y} r="2" fill={color} />;
        })}
      </svg>
      <div className="text-[10px] text-[#8b949e] text-right mt-1">
        最新: {valid[valid.length - 1]?.v ?? "-"}
      </div>
    </div>
  );
}
