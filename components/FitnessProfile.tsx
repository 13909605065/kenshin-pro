"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface FitnessBaseline {
  date: string;
  sprint30m?: number; // seconds — lower is better
  squat1RM?: number; // kg — higher is better
  verticalJump?: number; // cm — higher is better
  yBalance?: number; // composite score — higher is better
  notes?: string;
}

const STORAGE_KEY = "kenshin_fitness_baselines";

interface MetricDef {
  key: keyof Omit<FitnessBaseline, "date" | "notes">;
  label: string;
  unit: string;
  /** true = higher is better (squat, jump, y-balance), false = lower is better (sprint) */
  higherIsBetter: boolean;
  decimals: number;
}

const METRICS: MetricDef[] = [
  { key: "sprint30m", label: "30m 冲刺", unit: "秒", higherIsBetter: false, decimals: 2 },
  { key: "squat1RM", label: "深蹲 1RM", unit: "kg", higherIsBetter: true, decimals: 1 },
  { key: "verticalJump", label: "垂直起跳", unit: "cm", higherIsBetter: true, decimals: 1 },
  { key: "yBalance", label: "Y-Balance", unit: "分", higherIsBetter: true, decimals: 1 },
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/** Compute change between current and previous baseline */
function computeChange(
  current: number | undefined,
  prev: number | undefined,
  higherIsBetter: boolean
): { diff: number | null; label: string; icon: "up" | "down" | "flat"; color: string } {
  if (current == null || prev == null) {
    return { diff: null, label: "—", icon: "flat", color: "#666" };
  }
  const rawDiff = current - prev;
  const improved = higherIsBetter ? rawDiff > 0 : rawDiff < 0;
  const declined = higherIsBetter ? rawDiff < 0 : rawDiff > 0;

  if (Math.abs(rawDiff) < 0.001) {
    return { diff: 0, label: "0", icon: "flat", color: "#888" };
  }
  if (improved) {
    return { diff: rawDiff, label: `${rawDiff > 0 ? "+" : ""}${rawDiff.toFixed(2)}`, icon: "up", color: "#22c55e" };
  }
  if (declined) {
    return { diff: rawDiff, label: `${rawDiff > 0 ? "+" : ""}${rawDiff.toFixed(2)}`, icon: "down", color: "#d92525" };
  }
  return { diff: rawDiff, label: `${rawDiff > 0 ? "+" : ""}${rawDiff.toFixed(2)}`, icon: "flat", color: "#888" };
}

function EntryModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (entry: FitnessBaseline) => void;
}) {
  const [sprint30m, setSprint30m] = useState<string>("");
  const [squat1RM, setSquat1RM] = useState<string>("");
  const [verticalJump, setVerticalJump] = useState<string>("");
  const [yBalance, setYBalance] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayStr());

  const handleSave = () => {
    const entry: FitnessBaseline = { date };
    const s = parseFloat(sprint30m);
    const sq = parseFloat(squat1RM);
    const vj = parseFloat(verticalJump);
    const yb = parseFloat(yBalance);
    if (!isNaN(s)) entry.sprint30m = s;
    if (!isNaN(sq)) entry.squat1RM = sq;
    if (!isNaN(vj)) entry.verticalJump = vj;
    if (!isNaN(yb)) entry.yBalance = yb;
    if (notes.trim()) entry.notes = notes.trim();

    // Require at least one metric
    if (!entry.sprint30m && !entry.squat1RM && !entry.verticalJump && !entry.yBalance) {
      return;
    }
    onSave(entry);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-5 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm">录入体能数据</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date */}
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">测试日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#d92525] focus:outline-none"
          />
        </div>

        {/* Metrics */}
        <div className="space-y-3">
          {METRICS.map((m) => (
            <div key={m.key}>
              <label className="text-[10px] text-gray-400 block mb-1">
                {m.label} ({m.unit})
              </label>
              <input
                type="number"
                step="any"
                placeholder={`输入${m.label}`}
                value={
                  m.key === "sprint30m"
                    ? sprint30m
                    : m.key === "squat1RM"
                    ? squat1RM
                    : m.key === "verticalJump"
                    ? verticalJump
                    : yBalance
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (m.key === "sprint30m") setSprint30m(v);
                  else if (m.key === "squat1RM") setSquat1RM(v);
                  else if (m.key === "verticalJump") setVerticalJump(v);
                  else setYBalance(v);
                }}
                className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-[#d92525] focus:outline-none"
              />
            </div>
          ))}
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">
            备注 (可选)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="例如：赛季前测试、康复后测试..."
            maxLength={100}
            className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-[#d92525] focus:outline-none"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-[#d92525] text-white font-bold rounded-xl text-sm hover:bg-opacity-90 transition"
        >
          保存体能数据
        </button>
      </div>
    </div>
  );
}

export function FitnessProfile() {
  const [baselines, setBaselines] = useState<FitnessBaseline[]>([]);
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
        if (Array.isArray(parsed)) setBaselines(parsed);
      }
    } catch {}
  }, []);

  // Save to localStorage
  const saveBaselines = useCallback((data: FitnessBaseline[]) => {
    setBaselines(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, []);

  const handleSaveEntry = useCallback(
    (entry: FitnessBaseline) => {
      const existing = baselines.findIndex((b) => b.date === entry.date);
      if (existing >= 0) {
        const updated = [...baselines];
        updated[existing] = entry;
        saveBaselines(updated);
      } else {
        saveBaselines([...baselines, entry]);
      }
      setShowModal(false);
    },
    [baselines, saveBaselines]
  );

  const handleDeleteEntry = useCallback(
    (date: string) => {
      saveBaselines(baselines.filter((b) => b.date !== date));
    },
    [baselines, saveBaselines]
  );

  // Sorted by date descending (newest first)
  const sorted = useMemo(
    () =>
      [...baselines].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [baselines]
  );

  // Current = most recent, previous = second most recent
  const current = sorted.length > 0 ? sorted[0] : null;
  const previous = sorted.length > 1 ? sorted[1] : null;

  if (!hasMounted) return null;

  return (
    <>
      <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#d92525]" />
            <p className="text-sm font-bold text-white">体能档案</p>
          </div>
          {current && (
            <span className="text-[10px] text-gray-400">
              最近: {formatDate(current.date)}
            </span>
          )}
        </div>

        {!current ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 mb-2">暂无体能数据</p>
            <p className="text-[10px] text-gray-600">
              录入基准测试数据以追踪体能变化
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-2 px-2 py-1.5 text-[10px] text-gray-500 border-b border-[#222]">
              <span>指标</span>
              <span className="text-center">当前</span>
              <span className="text-center">上次</span>
              <span className="text-center">变化</span>
            </div>

            {/* Metric rows */}
            {METRICS.map((metric) => {
              const curVal = current[metric.key];
              const prevVal = previous?.[metric.key];
              const change = computeChange(curVal, prevVal, metric.higherIsBetter);
              const hasCur = curVal != null;

              return (
                <div
                  key={metric.key}
                  className="grid grid-cols-4 gap-2 px-2 py-2.5 border-b border-[#222]/50 items-center hover:bg-[#1a1a1a] transition"
                >
                  {/* Label */}
                  <span className="text-xs text-gray-300 font-medium">
                    {metric.label}
                  </span>

                  {/* Current value */}
                  <span
                    className={`text-sm font-bold text-center ${
                      hasCur ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {hasCur
                      ? `${curVal!.toFixed(metric.decimals)} ${metric.unit}`
                      : "—"}
                  </span>

                  {/* Previous value */}
                  <span className="text-xs text-gray-500 text-center">
                    {prevVal != null
                      ? `${prevVal.toFixed(metric.decimals)} ${metric.unit}`
                      : "—"}
                  </span>

                  {/* Change */}
                  <div className="flex items-center justify-center gap-0.5">
                    {change.icon === "up" && (
                      <TrendingUp className="w-3.5 h-3.5 text-[#22c55e]" />
                    )}
                    {change.icon === "down" && (
                      <TrendingDown className="w-3.5 h-3.5 text-[#d92525]" />
                    )}
                    {change.icon === "flat" && change.diff !== null && (
                      <Minus className="w-3.5 h-3.5 text-gray-500" />
                    )}
                    <span
                      className="text-xs font-bold"
                      style={{ color: change.color }}
                    >
                      {change.label}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Notes if present */}
            {current.notes && (
              <div className="px-2 py-2 text-[10px] text-gray-500 border-b border-[#222]/50">
                📝 {current.notes}
              </div>
            )}
          </div>
        )}

        {/* History summary */}
        {sorted.length > 1 && (
          <div className="mt-3 pt-3 border-t border-[#222]">
            <p className="text-[10px] text-gray-400 mb-1.5">
              历史记录 ({sorted.length} 次测试)
            </p>
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {sorted.slice(1, 6).map((entry) => (
                <div
                  key={entry.date}
                  className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#1a1a1a] transition group"
                >
                  <span className="text-[10px] text-gray-400">
                    {formatDate(entry.date)}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {[
                      entry.sprint30m != null ? `冲刺${entry.sprint30m}s` : null,
                      entry.squat1RM != null ? `深蹲${entry.squat1RM}kg` : null,
                      entry.verticalJump != null ? `起跳${entry.verticalJump}cm` : null,
                      entry.yBalance != null ? `Y-bal ${entry.yBalance}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <button
                    onClick={() => handleDeleteEntry(entry.date)}
                    className="text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 p-0.5"
                    title="删除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add entry button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full mt-3 py-2.5 bg-[#d92525]/10 border border-[#d92525]/20 text-[#d92525] rounded-xl text-sm font-bold hover:bg-[#d92525]/20 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          录入新数据
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <EntryModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveEntry}
        />
      )}
    </>
  );
}
