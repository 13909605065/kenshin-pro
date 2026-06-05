"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Activity, TrendingUp, AlertTriangle } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import WeeklyLoadBar from "@/components/WeeklyLoadBar";

const WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

type PhaseKey = 'offseason' | 'preseason_build' | 'regular_season' | 'playoffs';

const PHASE_INFO: Record<PhaseKey, { label: string; icon: string; color: string; weekCap: number; dayCap: number; matchWeekCap: number }> = {
  offseason:     { label: '休赛期', icon: '🧊', color: '#374151', weekCap: 1000, dayCap: 180, matchWeekCap: 1000 },
  preseason_build: { label: '季前备战期', icon: '🏋️', color: '#166534', weekCap: 1500, dayCap: 300, matchWeekCap: 1200 },
  regular_season:  { label: '常规赛季', icon: '⚽', color: '#991b1b', weekCap: 1400, dayCap: 280, matchWeekCap: 1000 },
  playoffs:       { label: '附加赛', icon: '🏆', color: '#7f1d1d', weekCap: 1100, dayCap: 220, matchWeekCap: 800 },
};

export default function LoadPage() {
  const router = useRouter();

  // Read season phase
  const info = useMemo(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem("kenshin_season_calendar");
      if (!raw) return null;
      const ranges = JSON.parse(raw).phaseRanges || [];
      const p = ranges.find((r: any) => today >= r.startDate && today <= r.endDate);
      if (p && PHASE_INFO[p.phase as PhaseKey]) return PHASE_INFO[p.phase as PhaseKey];
    } catch {}
    return null;
  }, []);

  // MD calc
  const matchDate = (() => { try { return localStorage.getItem('kenshin_coach_matchDate') || new Date().toISOString().slice(0, 10); } catch { return new Date().toISOString().slice(0, 10); }})();
  const mdDay = (() => { try { const m = new Date(matchDate + 'T00:00:00'); const n = new Date(); return Math.ceil((m.getTime() - n.getTime()) / 86400000); } catch { return 7; }})();

  // Is this a match week?
  const isMatchWeek = mdDay >= -1 && mdDay <= 6;
  const weekCap = info ? (isMatchWeek ? info.matchWeekCap : info.weekCap) : 1500;
  const dayCap = info ? info.dayCap : 300;

  // Read logs
  const logs = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]"); }
    catch { return []; }
  }, []);

  // This week
  const { weekDays, usedTRIMP, remainingTRIMP, pct } = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    const days: any[] = [];
    let used = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = d.toISOString().slice(0, 10);
      const log = logs.find((l: any) => l.date === ds);
      // Estimate TRIMP: duration × 2.5 (field) or 2.0 (gym)
      const estTRIMP = log ? Math.round(log.duration * (log.trainType === 'pitch' ? 2.5 : 2.0)) : 0;
      used += estTRIMP;
      days.push({ date: ds, day: WEEKDAY[d.getDay()], monthDay: `${d.getMonth()+1}/${d.getDate()}`, log, trimp: estTRIMP, isToday: ds === new Date().toISOString().slice(0, 10) });
    }
    const remaining = Math.max(0, weekCap - used);
    const pctVal = Math.min(100, Math.round((used / weekCap) * 100));
    return { weekDays: days, usedTRIMP: used, remainingTRIMP: remaining, pct: pctVal };
  }, [logs, weekCap]);

  const statusEmoji = pct >= 90 ? '🔴' : pct >= 70 ? '🟡' : '🟢';
  const statusText = pct >= 90 ? '超负荷' : pct >= 70 ? '关注' : '安全';

  return (
    <div className="min-h-screen bg-[#121212] p-4 pb-20">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-white font-bold text-lg">📊 负荷管理</h1>
        {info && <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: info.color + '30', color: '#fff' }}>{info.icon} {info.label}</span>}
      </div>

      {/* ═══ LOAD CAPACITY CARD ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-bold text-white">本周负荷容量</span>
            <span className="text-[10px] text-gray-500 ml-2">{isMatchWeek ? '⚽ 比赛周' : '📅 非比赛周'}</span>
          </div>
          <span className={`text-lg font-bold ${pct >= 90 ? 'text-red-400' : pct >= 70 ? 'text-yellow-400' : 'text-green-400'}`}>
            {statusEmoji} {statusText}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: pct >= 90 ? '#ef4444' : pct >= 70 ? '#eab308' : '#22c55e' }} />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">已用 <span className="text-white font-bold">{usedTRIMP}</span> TRIMP</span>
          <span className="text-gray-400">剩余 <span className={`font-bold ${remainingTRIMP < dayCap * 1.5 ? 'text-red-400' : 'text-green-400'}`}>{remainingTRIMP}</span> TRIMP</span>
          <span className="text-gray-500">上限 {weekCap} TRIMP</span>
        </div>

        {remainingTRIMP < dayCap && remainingTRIMP > 0 && (
          <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-[10px] text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 shrink-0" /> 剩余负荷不足一日量（{remainingTRIMP}/{dayCap}），今日训练须控制强度
          </div>
        )}
        {remainingTRIMP <= 0 && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-[10px] text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 shrink-0" /> 本周负荷已达上限！建议改为恢复/低强度训练
          </div>
        )}
      </div>

      {/* ═══ WEEKLY LOAD BAR ═══ */}
      <WeeklyLoadBar matchDate={matchDate} mdDay={mdDay} />

      {/* ═══ DAILY BREAKDOWN ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4 mb-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#d92525]" /> 每日明细
        </h3>
        <div className="space-y-1.5">
          {weekDays.map((d: any) => (
            <div key={d.date} className={`flex items-center gap-3 py-2 px-3 rounded-lg ${d.log ? 'bg-[#111]' : 'bg-[#0a0a0a] opacity-50'} ${d.isToday ? 'ring-1 ring-[#d92525]' : ''}`}>
              <span className="text-xs text-white font-medium w-16 shrink-0">{d.monthDay} {d.day}</span>
              {d.log ? (
                <>
                  <span className="text-xs">{d.log.trainType === 'pitch' ? '⚽ 外场' : '🏋️ 力量房'}</span>
                  <span className="text-xs text-gray-500">{d.log.timeSlot === 'morning' ? '🌅上午' : '🌇下午'}</span>
                  <div className="flex-1 mx-2">
                    <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, (d.trimp / dayCap) * 100)}%`,
                        backgroundColor: d.trimp > dayCap ? '#ef4444' : d.trimp > dayCap * 0.8 ? '#eab308' : '#22c55e'
                      }} />
                    </div>
                  </div>
                  <span className={`text-[10px] tabular-nums font-mono ${d.trimp > dayCap ? 'text-red-400' : d.trimp > dayCap * 0.8 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {d.trimp} / {dayCap}
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-gray-600">{d.isToday ? '— 今天未训练' : '— 休息'}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ LOG ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-[#d92525]" /> 训练日志
        </h3>
        {logs.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">暂无记录，在主页生成训练方案后自动同步</p>
        ) : (
          <div className="space-y-1">
            {logs.slice(0, 14).map((log: any) => (
              <div key={log.date} className="flex items-center gap-3 py-1.5 px-2 text-xs">
                <span className="text-gray-400 w-16 shrink-0">{log.date.slice(5)} {WEEKDAY[new Date(log.date + "T00:00:00").getDay()]}</span>
                <span>{log.trainType === 'pitch' ? '⚽ 外场' : '🏋️ 力量房'}</span>
                <span className="text-gray-500">{log.timeSlot === 'morning' ? '🌅上午' : '🌇下午'}</span>
                <span className="text-gray-600 ml-auto">{log.duration}min</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
