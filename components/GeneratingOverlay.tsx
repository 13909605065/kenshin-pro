"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

const EVENT_LABELS: Record<string, string> = {
  module_1: "生成训练动作库...",
  module_2: "匹配定向能力方案...",
  module_3: "分析位置跑动特征...",
  module_4: "适配周期训练计划...",
  module_5: "评估伤病康复需求...",
};

const COACH_EVENT_LABELS: Record<string, string> = {
  module_1: "设计训练课结构...",
  module_2: "编排战术主题内容...",
  module_3: "匹配分队比赛方案...",
  module_4: "制定进退阶要点...",
  module_5: "整理完整训练方案...",
};

interface Props {
  currentModule: string;
  isCoach?: boolean;
  moduleCount?: number;
  onCancel?: () => void;
}

/** How many percent to bump when a module event fires (diminishing by position). */
function moduleEventBump(idx: number, total: number): number {
  if (idx < 0 || total <= 0) return 0;
  // First modules get bigger bumps, later ones smaller — reflects real progress
  return 5 - (idx / Math.max(total - 1, 1)) * 3.5; // 5% → 1.5%
}

/** Continuous counter tick increment — fast early, slow near 95%. */
function tickIncrement(currentPct: number, tickIntervalMs: number): number {
  const progress = Math.max(currentPct / 95, 0); // 0..1
  // ~10%/s at 0%, ~1%/s at 90%, ~0.3%/s at 94% — cubic ease-out
  const perSecond = 10 * Math.pow(1 - progress, 2) + 0.3;
  return Math.max((perSecond * tickIntervalMs) / 1000, 0.03);
}

export function GeneratingOverlay({ currentModule, isCoach, moduleCount = 0, onCancel }: Props) {
  const labels = isCoach ? COACH_EVENT_LABELS : EVENT_LABELS;
  const fallback = isCoach ? "正在分析战术需求..." : "正在分析球员数据...";
  const label = labels[currentModule] || fallback;

  const totalModules = isCoach ? 3 : 5;

  const [display, setDisplay] = useState(3); // start at 3%

  // Track previous module to trigger bumps on change
  const prevModuleRef = useRef(currentModule);

  // ---- Continuous timer-based counter ----
  useEffect(() => {
    const INTERVAL = 180; // ms per tick

    const id = window.setInterval(() => {
      setDisplay((prev) => {
        if (prev >= 95) return 95;
        return Math.min(prev + tickIncrement(prev, INTERVAL), 95);
      });
    }, INTERVAL);

    return () => window.clearInterval(id);
  }, []); // runs for the full lifetime of the overlay

  // ---- Small bump when a module event fires ----
  useEffect(() => {
    if (currentModule && currentModule !== prevModuleRef.current) {
      prevModuleRef.current = currentModule;
      const idx = parseInt(currentModule.replace("module_", "")) - 1;
      const bump = moduleEventBump(idx, totalModules);
      if (bump > 0) {
        setDisplay((prev) => Math.min(prev + bump, 95));
      }
    }
  }, [currentModule, totalModules]);

  const pct = Math.round(display);

  return (
    <div className="glass-card p-8 flex flex-col items-center justify-center space-y-5 relative">
      {/* Cancel */}
      {onCancel && (
        <button onClick={onCancel}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition text-xs flex items-center gap-1">
          <X className="w-4 h-4" /> 取消
        </button>
      )}

      {/* Progress */}
      <div className="w-full max-w-[240px] space-y-2">
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{label}</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#992828] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Dots */}
      <div className="flex gap-1">
        {[...Array(3)].map((_, i) => (
          <div key={i}
            className="w-2 h-2 bg-[#992828] rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}
