"use client";

import { useState, useEffect } from "react";
import { MobileNav } from "@/components/MobileNav";
import { Clock, Dumbbell, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface WorkoutRecord {
  date: string;
  totalDuration: number;
  stepsCompleted: number;
  planId?: string;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h${m % 60}m`;
  }
  return `${m}min`;
}

export default function HistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<WorkoutRecord[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("workout_records");
      if (raw) setRecords(JSON.parse(raw));
    } catch {}
  }, []);

  const totalMin = records.reduce((s, r) => s + r.totalDuration, 0) / 60;
  const totalSessions = records.length;
  const avgMin = totalSessions > 0 ? Math.round(totalMin / totalSessions) : 0;

  return (
    <div className="min-h-screen bg-pitch-900 pb-20">
      <header className="sticky top-0 z-40 bg-pitch-900/90 backdrop-blur border-b border-pitch-700 px-4 h-14 flex items-center">
        <h1 className="text-white font-bold text-lg">📜 训练历史</h1>
        <button onClick={() => router.push("/")} className="ml-auto text-sm text-gray-400 hover:text-white">← 返回</button>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        {totalSessions > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass-card p-4 text-center">
              <div className="text-neon-pink font-bold text-2xl">{totalSessions}</div>
              <div className="text-xs text-gray-500 mt-1">总训练次数</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-neon-pink font-bold text-2xl">{Math.round(totalMin)}</div>
              <div className="text-xs text-gray-500 mt-1">总分钟数</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-neon-pink font-bold text-2xl">{avgMin}</div>
              <div className="text-xs text-gray-500 mt-1">平均分钟/次</div>
            </div>
          </div>
        )}

        {records.length === 0 ? (
          <p className="text-gray-500 text-center py-12">暂无训练记录。运动员跟练完成后会自动记录。</p>
        ) : (
          <div className="space-y-2">
            {records.map((r, i) => (
              <div key={i} className="glass-card p-4 flex items-center gap-4">
                <div className="text-xs text-gray-500 w-24 flex-shrink-0">{new Date(r.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" })}</div>
                <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="text-white text-sm flex-1">{fmt(r.totalDuration)}</span>
                <Dumbbell className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="text-gray-300 text-sm">{r.stepsCompleted}项</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
