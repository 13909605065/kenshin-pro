"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, Activity, AlertTriangle } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";

const WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export default function LoadPage() {
  const router = useRouter();

  // Read auto-generated training log
  const logs = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]"); }
    catch { return []; }
  }, []);

  // Recent 14 days
  const recentLogs = logs.slice(0, 14);

  // This week stats
  const thisWeek = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    const weekLogs: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = d.toISOString().slice(0, 10);
      const log = logs.find((l: any) => l.date === ds);
      weekLogs.push({ date: ds, day: WEEKDAY[d.getDay()], monthDay: `${d.getMonth()+1}/${d.getDate()}`, log: log || null });
    }
    const totalMin = weekLogs.reduce((s, w) => s + (w.log?.duration || 0), 0);
    const activeDays = weekLogs.filter(w => w.log).length;
    return { days: weekLogs, totalMin, activeDays };
  }, [logs]);

  // Read season phase
  const currentPhase = useMemo(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem("kenshin_season_calendar");
      if (!raw) return null;
      const data = JSON.parse(raw);
      const ranges = data.phaseRanges || [];
      return ranges.find((r: any) => today >= r.startDate && today <= r.endDate) || null;
    } catch { return null; }
  }, []);

  const phaseLabel = currentPhase ? ({
    offseason: '🧊 休赛期', preseason_build: '🏋️ 季前备战', regular_season: '⚽ 常规赛季', playoffs: '🏆 附加赛'
  } as any)[currentPhase.phase] || '' : '';

  return (
    <div className="min-h-screen bg-[#121212] p-4 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">📊 负荷管理</h1>
        {phaseLabel && <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] text-gray-300">{phaseLabel}</span>}
      </div>

      {/* ═══ THIS WEEK ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4 mb-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#d92525]" /> 本周负荷
        </h3>
        <div className="space-y-1.5">
          {thisWeek.days.map((d: any) => (
            <div key={d.date} className={`flex items-center gap-3 py-2 px-3 rounded-lg ${d.log ? 'bg-[#111]' : 'bg-[#0a0a0a] opacity-50'}`}>
              <span className="text-xs text-white font-medium w-16 shrink-0">{d.monthDay} {d.day}</span>
              {d.log ? (
                <>
                  <span className="text-xs">{d.log.trainType === 'pitch' ? '⚽ 外场' : '🏋️ 力量房'}</span>
                  <span className="text-xs text-gray-500">{d.log.timeSlot === 'morning' ? '🌅上午' : '🌇下午'}</span>
                  <div className="flex-1 mx-2 h-1.5 bg-[#222] rounded-full overflow-hidden">
                    <div className="h-full bg-[#d92525] rounded-full" style={{ width: `${Math.min(100, d.log.duration / 1.2)}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 tabular-nums">{d.log.duration}min</span>
                </>
              ) : (
                <span className="text-[10px] text-gray-600">— 休息 / 未记录</span>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#222]">
          <div>
            <span className="text-[10px] text-gray-500">周总时长</span>
            <p className="text-sm font-bold text-white">{thisWeek.totalMin}min</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500">训练日</span>
            <p className="text-sm font-bold text-white">{thisWeek.activeDays}/7天</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500">日均</span>
            <p className="text-sm font-bold text-white">{thisWeek.activeDays > 0 ? Math.round(thisWeek.totalMin / thisWeek.activeDays) : 0}min</p>
          </div>
        </div>
      </div>

      {/* ═══ RECENT ═══ */}
      {recentLogs.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#d92525]" /> 训练日志
          </h3>
          <div className="space-y-1">
            {recentLogs.map((log: any) => {
              const d = new Date(log.date + "T00:00:00");
              return (
                <div key={log.date} className="flex items-center gap-3 py-1.5 px-2 text-xs">
                  <span className="text-gray-400 w-16 shrink-0">{d.getMonth()+1}/{d.getDate()} {WEEKDAY[d.getDay()]}</span>
                  <span>{log.trainType === 'pitch' ? '⚽ 外场' : '🏋️ 力量房'}</span>
                  <span className="text-gray-500">{log.timeSlot === 'morning' ? '🌅上午' : '🌇下午'}</span>
                  <span className="text-gray-600 ml-auto">{log.duration}min</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recentLogs.length === 0 && (
        <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">暂无训练记录</p>
          <p className="text-gray-600 text-xs mt-1">在主页选择训练类型并生成方案后，数据自动同步</p>
        </div>
      )}

      <MobileNav />
    </div>
  );
}
