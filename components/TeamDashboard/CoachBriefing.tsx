"use client";

import React, { useState } from "react";
import StatTile from "./StatTile";
import PlayerRow from "./PlayerRow";
import DayTab from "./DayTab";
import type { DashboardDaySummary } from "@/lib/monitoring-client";

interface CoachBriefingProps {
  days: DashboardDaySummary[];
  loading: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function weekdayLabel(dateStr: string): string {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return days[new Date(dateStr).getDay()];
}

function dayTypeLabel(t: string): string {
  if (t === "比赛") return "⚽ 比赛日";
  if (t === "放假") return "放假";
  if (t === "恢复") return "恢复";
  return "训练";
}

function dayTypeClass(t: string): string {
  if (t === "比赛") return "bg-[#3a2f1a] text-[#d29922]";
  if (t === "放假" || t === "恢复") return "bg-[#1a2a3a] text-[#58a6ff]";
  return "bg-[#1a3a2a] text-[#2ea043]";
}

function srpeColor(v: number): "green" | "amber" | "red" | "default" {
  if (v > 8000) return "red";
  if (v > 5000) return "amber";
  return "green";
}

function avgColor(v: number, threshold: number): "default" | "amber" {
  return v > threshold ? "amber" : "default";
}

export default function CoachBriefing({ days, loading }: CoachBriefingProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const day: DashboardDaySummary | undefined = days[activeIdx];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-[#58a6ff] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="text-center py-20 text-[#8b949e] text-sm">
        暂无数据。请先录入训练数据。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {days.map((d, i) => (
          <DayTab
            key={d.date}
            label={`${formatDate(d.date)} ${weekdayLabel(d.date)}`}
            active={i === activeIdx}
            onClick={() => setActiveIdx(i)}
          />
        ))}
      </div>

      {day && (
        <>
          {/* Hero Card */}
          <div className="bg-[#1a1f2e] border border-[#30363d] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg font-bold text-white">
                {formatDate(day.date)} {weekdayLabel(day.date)}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${dayTypeClass(day.dayType)}`}>
                {dayTypeLabel(day.dayType)}
              </span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-5 gap-2">
              <StatTile label="参训" value={day.nParticipants} />
              <StatTile label="总sRPE" value={day.totalSRPE} color={srpeColor(day.totalSRPE)} />
              <StatTile label="均RPE" value={day.avgRPE || "-"} color={avgColor(day.avgRPE, 5)} />
              <StatTile label="均睡眠" value={day.avgSleep || "-"} color={avgColor(day.avgSleep, 3)} />
              <StatTile
                label="风险"
                value={day.atRiskCount}
                color={day.atRiskCount > 5 ? "red" : day.atRiskCount > 2 ? "amber" : "green"}
              />
            </div>

            {/* Summary line */}
            <div className="mt-3 text-[11px] text-[#8b949e]">
              晨间问卷 {day.nMorningSurveys}人 · 均疲劳 {day.avgFatigue || "-"} · 均酸痛 {day.avgSoreness || "-"}
            </div>
          </div>

          {/* Player List */}
          <div className="bg-[#1a1f2e] border border-[#30363d] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wide">球员列表</h3>
              <div className="flex items-center gap-4 text-[10px] text-[#8b949e]">
                <span>RPE</span>
                <span>sRPE</span>
                <span>睡/疲/酸</span>
              </div>
            </div>
            {day.players
              .filter(p => p.rpe !== null || p.sleep !== null)
              .map((p, i) => (
                <PlayerRow
                  key={`${p.name}-${i}`}
                  name={p.name}
                  rpe={p.rpe}
                  srpe={p.srpe}
                  sleep={p.sleep}
                  fatigue={p.fatigue}
                  soreness={p.soreness}
                  sessionType={p.sessionType}
                  injuryStatus={p.injuryStatus}
                  notes={p.injuryNote || p.notes || undefined}
                />
              ))}
            {day.players.filter(p => p.rpe !== null || p.sleep !== null).length === 0 && (
              <div className="text-center py-8 text-[#8b949e] text-xs">今日暂无数据</div>
            )}
          </div>

          {/* Issues summary */}
          {day.atRiskCount > 0 && (
            <div className="bg-[#3a1a1a]/30 border border-[#992828]/30 rounded-xl p-3">
              <h3 className="text-xs font-semibold text-[#992828] mb-2">
                ⚠️ 需关注 ({day.atRiskCount}人)
              </h3>
              <div className="space-y-1">
                {day.players
                  .filter(p => p.healthWarning || p.injuryStatus)
                  .map((p, i) => (
                    <div key={i} className="text-xs text-[#e6edf3]">
                      <span className="font-semibold">{p.name}</span>
                      {p.injuryStatus && <span className="text-[#992828] ml-2">{p.injuryStatus}</span>}
                      {p.healthWarning && <span className="text-[#d29922] ml-2">健康总分偏高</span>}
                      {p.fatigue && p.fatigue >= 4 && <span className="text-[#d29922] ml-2">疲劳{p.fatigue}</span>}
                      {p.soreness && p.soreness >= 4 && <span className="text-[#d29922] ml-2">酸痛{p.soreness}</span>}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
