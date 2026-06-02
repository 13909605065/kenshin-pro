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

function moduleToTarget(module: string, count: number): number {
  if (!module) return 3;
  const idx = parseInt(module.replace("module_", "")) - 1; // 0-4
  const base = idx * 20; // 0, 20, 40, 60, 80
  const within = Math.min(count * 2, 18); // up to 18% within module
  return Math.min(base + within, 97);
}

export function GeneratingOverlay({ currentModule, isCoach, moduleCount = 0, onCancel }: Props) {
  const labels = isCoach ? COACH_EVENT_LABELS : EVENT_LABELS;
  const label = labels[currentModule] || "正在分析球员数据...";

  // Smooth progress animation
  const target = moduleToTarget(currentModule, moduleCount);
  const [display, setDisplay] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const step = () => {
      setDisplay((prev) => {
        const next = prev + (target - prev) * 0.08;
        if (Math.abs(next - target) < 0.3) {
          cancelAnimationFrame(animRef.current);
          return target;
        }
        animRef.current = requestAnimationFrame(step);
        return next;
      });
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [target]);

  const pct = Math.round(display);

  return (
    <div className="glass-card p-8 flex flex-col items-center justify-center space-y-5 relative">
      {/* Cancel */}
      {onCancel && (
        <button onClick={onCancel}
          className="absolute top-3 right-3 text-gray-500 hover:text-white transition text-xs flex items-center gap-1">
          <X className="w-4 h-4" /> 取消
        </button>
      )}

      {/* Progress */}
      <div className="w-full max-w-[240px] space-y-2">
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>{label}</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 bg-pitch-600 rounded-full overflow-hidden">
          <div
            className="h-full bg-neon-pink rounded-full transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Dots */}
      <div className="flex gap-1">
        {[...Array(3)].map((_, i) => (
          <div key={i}
            className="w-2 h-2 bg-neon-pink rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}
