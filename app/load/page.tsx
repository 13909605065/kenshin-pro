"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";

type TrainType = "pitch" | "gym";
type TimeSlot = "morning" | "afternoon";

const WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function LoadPage() {
  const router = useRouter();
  const today = new Date();
  const dateStr = todayStr();

  const [trainType, setTrainType] = useState<TrainType>("pitch");
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(today.getHours() < 12 ? "morning" : "afternoon");
  const [duration, setDuration] = useState(60);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    try {
      const logs = JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]");
      const existing = logs.findIndex((l: any) => l.date === dateStr);
      const entry = { date: dateStr, trainType, timeSlot, duration, savedAt: new Date().toISOString() };
      if (existing >= 0) logs[existing] = entry;
      else logs.unshift(entry);
      localStorage.setItem("kenshin_daily_training_log", JSON.stringify(logs.slice(0, 100)));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  // Recent 7 days load
  const recentLogs = (() => {
    try {
      return JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]").slice(0, 7);
    } catch { return []; }
  })();

  return (
    <div className="min-h-screen bg-[#121212] p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">📊 负荷管理</h1>
      </div>

      {/* ═══ TODAY CARD ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-2xl font-bold text-white">{today.getMonth() + 1}月{today.getDate()}日</span>
            <span className="text-lg text-gray-400 ml-2">{WEEKDAY[today.getDay()]}</span>
          </div>
          <span className="text-[10px] text-gray-600">{dateStr}</span>
        </div>

        {/* Training type */}
        <div className="mb-3">
          <label className="text-[10px] text-gray-500 block mb-2">今天练什么</label>
          <div className="flex gap-2">
            <button onClick={() => setTrainType("pitch")}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${
                trainType === "pitch" ? "bg-[#d92525] text-white" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
              }`}>⚽ 外场训练</button>
            <button onClick={() => setTrainType("gym")}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${
                trainType === "gym" ? "bg-[#d92525] text-white" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
              }`}>🏋️ 力量房</button>
          </div>
        </div>

        {/* Time slot */}
        <div className="mb-3">
          <label className="text-[10px] text-gray-500 block mb-2">哪个时段</label>
          <div className="flex gap-2">
            <button onClick={() => setTimeSlot("morning")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                timeSlot === "morning" ? "bg-[#3b82f6] text-white" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
              }`}>🌅 上午</button>
            <button onClick={() => setTimeSlot("afternoon")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                timeSlot === "afternoon" ? "bg-[#f97316] text-white" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
              }`}>🌇 下午</button>
          </div>
        </div>

        {/* Duration */}
        <div className="mb-4">
          <label className="text-[10px] text-gray-500 block mb-2">训练时长</label>
          <div className="flex gap-1.5 flex-wrap">
            {[30, 45, 60, 75, 90, 120].map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  duration === d ? "bg-[#d92525] text-white" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
                }`}>{d}min</button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button onClick={handleSave}
          className={`w-full py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
            saved ? "bg-green-500 text-white" : "bg-[#d92525] hover:bg-[#b71d1d] text-white"
          }`}>
          {saved ? <><CheckCircle2 className="w-4 h-4" /> 已保存</> : <><Save className="w-4 h-4" /> 记录今日训练</>}
        </button>
      </div>

      {/* ═══ RECENT 7 DAYS ═══ */}
      {recentLogs.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-3">📋 最近7天记录</h3>
          <div className="space-y-1.5">
            {recentLogs.map((log: any) => {
              const d = new Date(log.date + "T00:00:00");
              return (
                <div key={log.date} className="flex items-center gap-3 py-2 px-3 bg-[#111] rounded-lg">
                  <span className="text-xs text-white font-medium w-20 shrink-0">
                    {d.getMonth() + 1}/{d.getDate()} {WEEKDAY[d.getDay()]}
                  </span>
                  <span className="text-xs">{log.trainType === "pitch" ? "⚽ 外场" : "🏋️ 力量房"}</span>
                  <span className="text-xs text-gray-500">{log.timeSlot === "morning" ? "🌅上午" : "🌇下午"}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">{log.duration}min</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
}
