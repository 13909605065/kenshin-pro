"use client";

import { useState, useEffect } from "react";
import { Clock, Dumbbell, TrendingUp } from "lucide-react";

interface WorkoutRecord {
  date: string;
  totalDuration: number;
  stepsCompleted: number;
  planId?: string;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  return m > 0 ? `${m}min` : `${sec}s`;
}

export function TrainingHistory() {
  const [records, setRecords] = useState<WorkoutRecord[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("workout_records");
      if (raw) setRecords(JSON.parse(raw));
    } catch {}
  }, []);

  if (records.length === 0) return null;

  // This week stats
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  weekStart.setHours(0, 0, 0, 0);
  const thisWeek = records.filter((r) => new Date(r.date) >= weekStart);
  const totalMin = thisWeek.reduce((s, r) => s + r.totalDuration, 0) / 60;

  return (
    <div className="mt-6 glass-card p-4">
      <h2 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-neon-pink" />
        训练历史
      </h2>

      {/* This week stats */}
      {thisWeek.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-pitch-700/50 rounded-lg p-2 text-center">
            <div className="text-neon-pink font-bold text-lg">{thisWeek.length}</div>
            <div className="text-[10px] text-gray-500">本周训练</div>
          </div>
          <div className="bg-pitch-700/50 rounded-lg p-2 text-center">
            <div className="text-neon-pink font-bold text-lg">{Math.round(totalMin)}</div>
            <div className="text-[10px] text-gray-500">总分钟</div>
          </div>
          <div className="bg-pitch-700/50 rounded-lg p-2 text-center">
            <div className="text-neon-pink font-bold text-lg">{thisWeek.length > 0 ? Math.round(totalMin / thisWeek.length) : 0}</div>
            <div className="text-[10px] text-gray-500">平均分钟</div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {records.slice(0, 10).map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-pitch-700/30">
            <span className="text-gray-500 w-20 flex-shrink-0">{new Date(r.date).toLocaleDateString("zh-CN")}</span>
            <Clock className="w-3 h-3 text-gray-600" />
            <span className="text-gray-300">{fmt(r.totalDuration)}</span>
            <Dumbbell className="w-3 h-3 text-gray-600 ml-2" />
            <span className="text-gray-300">{r.stepsCompleted}项</span>
          </div>
        ))}
      </div>
    </div>
  );
}
