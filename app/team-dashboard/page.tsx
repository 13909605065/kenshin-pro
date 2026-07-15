"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, TrendingUp, UserCheck, Upload } from "lucide-react";
import { CoachBriefing, LoadMonitor, PlayerTrends } from "@/components/TeamDashboard";
import { getDashboardData } from "@/lib/monitoring-client";
import type { DashboardData } from "@/lib/monitoring-client";

const TABS = [
  { id: "briefing", label: "教练简报", icon: LayoutDashboard },
  { id: "load", label: "负荷监控", icon: TrendingUp },
  { id: "trends", label: "球员趋势", icon: UserCheck },
];

function getDateRange(daysBack: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function TeamDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("briefing");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { from, to } = getDateRange(14);
      const result = await getDashboardData({ from, to });
      if (result) {
        setData(result);
      } else {
        setError("数据加载失败，请确认已录入训练数据");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    syncPlayerReports();
  }, [fetchData]);

  // Sync queued player self-reports from localStorage
  const syncPlayerReports = useCallback(async () => {
    try {
      const raw = localStorage.getItem("kenshin_report_queue");
      if (!raw) return;
      const queue = JSON.parse(raw);
      if (!queue.length) return;

      setSyncing(true);
      setSyncMsg(`同步球员自填数据 (${queue.length}条)...`);

      // Group entries by date
      const byDate: Record<string, any[]> = {};
      for (const entry of queue) {
        if (!byDate[entry.date]) byDate[entry.date] = [];
        byDate[entry.date].push(entry);
      }

      let synced = 0;
      for (const [date, entries] of Object.entries(byDate)) {
        const res = await fetch("/api/monitoring/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, entries: entries.map((e: any) => ({
            player_name: e.player_name,
            rpe_score: e.rpe,
            sleep_score: e.sleep,
            fatigue_score: e.fatigue,
            soreness_score: e.soreness,
            stress_score: e.stress,
            mood_score: e.mood,
            notes: e.notes,
          })) }),
        });
        if (res.ok) synced += entries.length;
      }

      // Clear queue
      localStorage.removeItem("kenshin_report_queue");
      setSyncMsg(`已同步 ${synced} 条球员自填数据`);
      setTimeout(() => setSyncMsg(""), 3000);
      if (synced > 0) fetchData(); // refresh dashboard
    } catch {
      setSyncMsg("");
    } finally {
      setSyncing(false);
    }
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0d1117]/95 backdrop-blur border-b border-[#21262d] px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="text-[#8b949e] hover:text-white">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold">球队仪表盘</h1>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-[10px] px-2 py-1 rounded bg-[#1a1f2e] border border-[#30363d] text-[#8b949e] hover:text-white disabled:opacity-50"
          >
            {loading ? "刷新中..." : "刷新"}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-[49px] z-10 bg-[#0d1117]/95 backdrop-blur border-b border-[#21262d]">
        <div className="flex max-w-4xl mx-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#58a6ff] text-[#58a6ff]"
                  : "border-transparent text-[#8b949e] hover:text-white"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {error && (
          <div className="bg-[#3a1a1a]/30 border border-[#992828]/30 rounded-xl p-4 mb-4 text-sm text-[#992828]">
            {error}
          </div>
        )}
        {syncMsg && (
          <div className="bg-[#1a3a2a]/30 border border-[#2ea043]/30 rounded-xl p-3 mb-4 text-xs text-[#2ea043] flex items-center gap-2">
            {syncing && <div className="animate-spin w-3 h-3 border border-[#2ea043] border-t-transparent rounded-full" />}
            {syncMsg}
          </div>
        )}

        {activeTab === "briefing" && (
          <CoachBriefing days={data?.days || []} loading={loading} />
        )}
        {activeTab === "load" && (
          <LoadMonitor acwr={data?.acwr || []} loading={loading} />
        )}
        {activeTab === "trends" && (
          <PlayerTrends days={data?.days || []} loading={loading} />
        )}
      </div>
    </div>
  );
}
