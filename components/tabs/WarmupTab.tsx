"use client";

import { TrainingModule, Position } from "@/lib/types";
import { useState } from "react";

interface Props {
  modules: TrainingModule[];
  position: Position | null;
}

type WarmupMode = "no_ball" | "with_ball" | "combined";

export function WarmupTab({ modules, position }: Props) {
  const [mode, setMode] = useState<WarmupMode>("combined");
  const isGoalkeeper = position === "goalkeeper";

  const posModule = modules.find((m) => m.module === "position_training");
  if (!posModule || posModule.module !== "position_training" || !posModule.warmup) {
    return <p className="text-sm text-gray-500 py-8 text-center">暂无热身内容</p>;
  }

  const warmup = posModule.warmup;

  const classifyItem = (item: { name: string; description: string }): "no_ball" | "with_ball" => {
    const ballKeywords = /球|ball|pass|dribble|touch|control|juggling|drill|cone/i;
    return ballKeywords.test(item.name + item.description) ? "with_ball" : "no_ball";
  };

  const effectiveMode = isGoalkeeper ? "no_ball" : mode;
  const filtered = effectiveMode === "combined"
    ? warmup
    : warmup.filter((w) => classifyItem(w) === effectiveMode);

  return (
    <div className="space-y-4">
      {/* Warmup mode selector (hidden for goalkeepers) */}
      {!isGoalkeeper && (
        <div className="flex items-center gap-1 bg-pitch-800 rounded-lg p-0.5 w-fit">
          {([
            { value: "no_ball" as const, label: "无球热身" },
            { value: "with_ball" as const, label: "有球热身" },
            { value: "combined" as const, label: "两者结合" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                mode === opt.value
                  ? "bg-neon-pink text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {isGoalkeeper && (
        <p className="text-xs text-gray-500">守门员仅展示无球热身内容</p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          {effectiveMode === "no_ball" ? "暂无无球热身项目" : "暂有球热身项目"}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((w, i) => (
            <div key={i} className="bg-pitch-700/50 rounded-lg p-3">
              <div className="flex justify-between">
                <span className="font-medium text-white">{w.name}</span>
                <span className="text-xs text-gray-400">{w.duration}秒</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{w.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
