"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Plus, TrendingUp, Activity } from "lucide-react";

interface LoadDay {
  date: string;
  sRPE: number; // 1-10
  duration: number; // minutes
  load: number; // sRPE × duration
  note?: string;
}

const STORAGE_KEY = "kenshin_load_data";
const DAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function getWeekdayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return DAY_LABELS[d.getDay()];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }
  return days;
}

function loadColor(load: number): string {
  if (load < 300) return "#22c55e";
  if (load <= 500) return "#f59e0b";
  return "#d92525";
}

function loadBgClass(load: number): string {
  if (load < 300) return "bg-[#22c55e]";
  if (load <= 500) return "bg-[#f59e0b]";
  return "bg-[#d92525]";
}

function loadTextClass(load: number): string {
  if (load < 300) return "text-[#22c55e]";
  if (load <= 500) return "text-[#f59e0b]";
  return "text-[#d92525]";
}

function loadLabel(load: number): string {
  if (load < 300) return "低负荷";
  if (load <= 500) return "中负荷";
  return "高负荷";
}

/** Compute ACWR: Acute (7-day avg) / Chronic (28-day avg) */
function computeACWR(data: LoadDay[]): { ratio: number | null; label: string; color: string } {
  if (data.length < 7) return { ratio: null, label: "数据不足", color: "#888" };

  const sorted = [...data].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const acuteSlice = sorted.slice(0, 7);
  const acuteAvg =
    acuteSlice.reduce((sum, d) => sum + d.load, 0) / acuteSlice.length;

  if (sorted.length < 28) {
    // Not enough chronic data — use all available beyond 7 days
    const chronicSlice = sorted.slice(7);
    if (chronicSlice.length === 0) {
      return {
        ratio: null,
        label: "需更多数据",
        color: "#888",
      };
    }
    const chronicAvg =
      chronicSlice.reduce((sum, d) => sum + d.load, 0) / chronicSlice.length;
    const ratio = acuteAvg / chronicAvg;
    if (ratio < 0.8) return { ratio, label: "负荷不足", color: "#22c55e" };
    if (ratio <= 1.3) return { ratio, label: "负荷合理", color: "#22c55e" };
    if (ratio <= 1.5) return { ratio, label: "负荷偏高", color: "#f59e0b" };
    return { ratio, label: "负荷过高", color: "#d92525" };
  }

  const chronicSlice = sorted.slice(0, 28);
  const chronicAvg =
    chronicSlice.reduce((sum, d) => sum + d.load, 0) / chronicSlice.length;
  const ratio = acuteAvg / chronicAvg;

  if (ratio < 0.8) return { ratio, label: "负荷不足", color: "#22c55e" };
  if (ratio <= 1.3) return { ratio, label: "负荷合理", color: "#22c55e" };
  if (ratio <= 1.5) return { ratio, label: "负荷偏高", color: "#f59e0b" };
  return { ratio, label: "负荷过高", color: "#d92525" };
}

function LoadEntryModal({
  onClose,
  onSave,
  initialDate,
}: {
  onClose: () => void;
  onSave: (day: LoadDay) => void;
  initialDate: string;
}) {
  const [sRPE, setSRPE] = useState<number>(5);
  const [duration, setDuration] = useState<number>(60);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(initialDate);

  const load = sRPE * duration;

  const handleSave = () => {
    onSave({
      date,
      sRPE,
      duration,
      load,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-5 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm">录入训练负荷</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date */}
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#d92525] focus:outline-none"
          />
        </div>

        {/* sRPE */}
        <div>
          <label className="text-[10px] text-gray-400 block mb-1.5">
            训练强度 RPE (1-10)
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
              <button
                key={v}
                onClick={() => setSRPE(v)}
                className={`flex-1 py-2 rounded-md text-xs font-bold transition-all duration-150 border ${
                  sRPE === v
                    ? "bg-[#d92525] text-white border-[#d92525]"
                    : "bg-[#1e1e1e] text-gray-400 border-[#222] hover:border-[#444]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            {sRPE <= 3
              ? "轻松"
              : sRPE <= 5
              ? "中等"
              : sRPE <= 7
              ? "较难"
              : sRPE <= 9
              ? "很难"
              : "极限"}
          </p>
        </div>

        {/* Duration */}
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">
            训练时长 (分钟)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5}
              max={300}
              step={5}
              value={duration}
              onChange={(e) =>
                setDuration(Math.max(1, parseInt(e.target.value) || 0))
              }
              className="w-24 bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-sm text-white text-center focus:border-[#d92525] focus:outline-none"
            />
            <span className="text-sm text-gray-400">分钟</span>
            <div className="flex gap-1 ml-2">
              {[30, 45, 60, 90].map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition border ${
                    duration === m
                      ? "bg-[#d92525]/15 text-[#d92525] border-[#d92525]/20"
                      : "bg-[#1e1e1e] text-gray-400 border-[#222] hover:border-[#444]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Load preview */}
        <div className="bg-[#121212] rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">负荷得分 (sRPE × 时长)</span>
          <span
            className={`text-lg font-bold ${loadTextClass(load)}`}
          >
            {load}
          </span>
        </div>

        {/* Note */}
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">
            备注 (可选)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：比赛日、高强度间歇..."
            maxLength={60}
            className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-[#d92525] focus:outline-none"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-[#d92525] text-white font-bold rounded-xl text-sm hover:bg-opacity-90 transition"
        >
          保存负荷数据
        </button>
      </div>
    </div>
  );
}

export function LoadDashboard() {
  const [loadData, setLoadData] = useState<LoadDay[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Hydration guard
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLoadData(parsed);
      }
    } catch {}
  }, []);

  // Save to localStorage whenever data changes
  const saveData = useCallback(
    (newData: LoadDay[]) => {
      setLoadData(newData);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      } catch {}
    },
    []
  );

  const handleSaveEntry = useCallback(
    (day: LoadDay) => {
      // Replace existing entry for same date, or add new
      const existing = loadData.findIndex((d) => d.date === day.date);
      if (existing >= 0) {
        const updated = [...loadData];
        updated[existing] = day;
        saveData(updated);
      } else {
        saveData([...loadData, day]);
      }
      setShowModal(false);
    },
    [loadData, saveData]
  );

  const handleDeleteEntry = useCallback(
    (date: string) => {
      saveData(loadData.filter((d) => d.date !== date));
    },
    [loadData, saveData]
  );

  // Compute visible data: last 7 days
  const last7Days = useMemo(() => getLast7Days(), []);
  const weekMap = useMemo(() => {
    const map = new Map<string, LoadDay>();
    for (const d of loadData) {
      map.set(d.date, d);
    }
    return map;
  }, [loadData]);

  const weekData = useMemo(
    () =>
      last7Days.map((date) => {
        const entry = weekMap.get(date);
        return entry
          ? entry
          : ({ date, sRPE: 0, duration: 0, load: 0 } as LoadDay);
      }),
    [last7Days, weekMap]
  );

  const totalWeekLoad = useMemo(
    () => weekData.reduce((sum, d) => sum + d.load, 0),
    [weekData]
  );

  const maxLoad = useMemo(
    () => Math.max(...weekData.map((d) => d.load), 100),
    [weekData]
  );

  const acwr = useMemo(() => computeACWR(loadData), [loadData]);

  const hasAnyEntry = useMemo(
    () => weekData.some((d) => d.load > 0),
    [weekData]
  );

  if (!hasMounted) return null;

  return (
    <>
      <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#d92525]" />
            <p className="text-sm font-bold text-white">训练负荷仪表盘</p>
          </div>

          {/* ACWR badge */}
          <div className="flex items-center gap-2">
            {acwr.ratio !== null && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: `${acwr.color}15`,
                  border: `1px solid ${acwr.color}30`,
                  color: acwr.color,
                }}
              >
                <TrendingUp className="w-3 h-3" />
                ACWR {acwr.ratio.toFixed(2)}
              </div>
            )}
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${acwr.color}15`,
                color: acwr.color,
              }}
            >
              {acwr.label}
            </span>
          </div>
        </div>

        {/* Total week load */}
        <div className="bg-[#121212] rounded-lg p-3 mb-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">本周总负荷</span>
          <span className={`text-xl font-bold ${loadTextClass(totalWeekLoad > 0 ? totalWeekLoad : 0)}`}>
            {totalWeekLoad}
          </span>
        </div>

        {/* 7-day bar chart */}
        {!hasAnyEntry ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 mb-2">暂无负荷数据</p>
            <p className="text-[10px] text-gray-600">
              录入每日训练负荷以追踪周负荷变化
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {weekData.map((day) => {
              const barWidth =
                maxLoad > 0
                  ? Math.max((day.load / maxLoad) * 100, day.load > 0 ? 4 : 0)
                  : 0;
              const hasLoad = day.load > 0;
              return (
                <div key={day.date} className="flex items-center gap-2 group">
                  {/* Day label */}
                  <span className="text-[10px] text-gray-400 w-9 text-right flex-shrink-0">
                    {getWeekdayLabel(day.date)}
                  </span>
                  <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">
                    {formatDate(day.date)}
                  </span>

                  {/* Bar */}
                  <div className="flex-1 h-6 bg-[#121212] rounded-full overflow-hidden relative min-w-0">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: hasLoad
                          ? loadColor(day.load)
                          : "transparent",
                      }}
                    />
                  </div>

                  {/* Load value */}
                  {hasLoad ? (
                    <span
                      className={`text-xs font-bold w-10 text-right flex-shrink-0 ${loadTextClass(day.load)}`}
                    >
                      {day.load}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600 w-10 text-right flex-shrink-0">
                      —
                    </span>
                  )}

                  {/* Delete button on hover */}
                  {hasLoad && (
                    <button
                      onClick={() => handleDeleteEntry(day.date)}
                      className="text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 p-0.5 flex-shrink-0"
                      title="删除"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {!hasLoad && <div className="w-4 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Color legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#222]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
            <span className="text-[10px] text-gray-400">&lt;300 低</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="text-[10px] text-gray-400">300-500 中</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d92525]" />
            <span className="text-[10px] text-gray-400">&gt;500 高</span>
          </div>
        </div>

        {/* Log today button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full mt-3 py-2.5 bg-[#d92525]/10 border border-[#d92525]/20 text-[#d92525] rounded-xl text-sm font-bold hover:bg-[#d92525]/20 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          录入今日负荷
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <LoadEntryModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveEntry}
          initialDate={todayStr()}
        />
      )}
    </>
  );
}
