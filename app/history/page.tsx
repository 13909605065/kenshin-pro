"use client";

import { useState, useEffect, useMemo } from "react";
import { MobileNav } from "@/components/MobileNav";
import { Clock, Dumbbell, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface WorkoutRecord {
  date: string;
  totalDuration: number;
  stepsCompleted: number;
  planId?: string;
}

interface SavedPlan {
  id: string;
  playerName: string;
  modules: any[];
  formData: any;
  createdAt: string;
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
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("workout_records");
      if (raw) setRecords(JSON.parse(raw));
    } catch {}
    try {
      const raw = localStorage.getItem("kenshin_plans");
      if (raw) setPlans(JSON.parse(raw));
    } catch {}
  }, []);

  // Filter plans by search
  const filteredPlans = useMemo(() => {
    if (!search.trim()) return plans;
    const q = search.toLowerCase();
    return plans.filter((p) =>
      p.playerName.toLowerCase().includes(q) ||
      (p.formData?.position && p.formData.position.includes(q)) ||
      new Date(p.createdAt).toLocaleDateString("zh-CN").includes(q)
    );
  }, [plans, search]);

  const totalMin = records.reduce((s, r) => s + r.totalDuration, 0) / 60;
  const totalSessions = records.length;
  const avgMin = totalSessions > 0 ? Math.round(totalMin / totalSessions) : 0;

  return (
    <div className="min-h-screen bg-[#121212] pb-20">
      <header className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur border-b border-[#1e1e1e] px-4 h-14 flex items-center">
        <h1 className="text-white font-bold text-lg">📜 训练历史</h1>
        <button onClick={() => router.push("/")} className="ml-auto text-sm text-gray-400 hover:text-white">← 返回</button>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        {/* Stats */}
        {totalSessions > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="glass-card p-4 text-center">
              <div className="text-[#d92525] font-bold text-2xl">{totalSessions}</div>
              <div className="text-xs text-gray-400 mt-1">总训练次数</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-[#d92525] font-bold text-2xl">{Math.round(totalMin)}</div>
              <div className="text-xs text-gray-400 mt-1">总分钟数</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-[#d92525] font-bold text-2xl">{avgMin}</div>
              <div className="text-xs text-gray-400 mt-1">平均分钟/次</div>
            </div>
          </div>
        )}

        {/* Search */}
        {plans.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索方案（球员名/位置/日期）..."
              className="w-full bg-[#1e1e1e] border border-[#333] rounded-xl pl-9 pr-8 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#d92525] focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Plans */}
        {filteredPlans.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-400 mb-2">📋 训练方案 ({filteredPlans.length})</h2>
            <div className="space-y-2">
              {filteredPlans.map((plan) => (
                <div key={plan.id} className="glass-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium text-sm">{plan.playerName}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(plan.createdAt).toLocaleDateString("zh-CN", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-1 text-[11px] text-gray-400">
                    <span>{plan.modules.length}个模块</span>
                    {plan.formData?.position && <span>{plan.formData.position}</span>}
                    {plan.formData?.goal && <span>{plan.formData.goal}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workout records */}
        {records.length === 0 && plans.length === 0 ? (
          <p className="text-gray-400 text-center py-12">暂无训练记录。运动员跟练完成后会自动记录。</p>
        ) : records.length > 0 ? (
          <div>
            <h2 className="text-sm font-bold text-gray-400 mb-2">⏱️ 跟练记录 ({records.length})</h2>
            <div className="space-y-2">
              {records.map((r, i) => (
                <div key={i} className="glass-card p-4 flex items-center gap-4">
                  <div className="text-xs text-gray-400 w-24 flex-shrink-0">{new Date(r.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" })}</div>
                  <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span className="text-white text-sm flex-1">{fmt(r.totalDuration)}</span>
                  <Dumbbell className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{r.stepsCompleted}项</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <MobileNav />
    </div>
  );
}
