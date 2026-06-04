"use client";

import { TrainingModule, Position } from "@/lib/types";
import { ExerciseTable } from "./ExerciseTable";
import { Printer, Table2 } from "lucide-react";

interface Props {
  modules: TrainingModule[];
  position: Position | null;
}

export function PhysicalTab({ modules, position }: Props) {
  const posModule = modules.find((m) => m.module === "position_training");
  const abilityModule = modules.find((m) => m.module === "ability_training");
  const isGoalkeeper = position === "goalkeeper";

  const upper = posModule?.module === "position_training" ? (posModule.upper_limb || []) : [];
  const lower = posModule?.module === "position_training" ? (posModule.lower_limb || []) : [];
  const core = posModule?.module === "position_training" ? (posModule.core || []) : [];
  const abilityExercises = abilityModule?.module === "ability_training" ? (abilityModule.exercises || []) : [];

  const hasAnyContent = upper.length > 0 || lower.length > 0 || core.length > 0 || abilityExercises.length > 0;
  if (!hasAnyContent) {
    return <p className="text-sm text-gray-500 py-8 text-center">暂无体能训练内容</p>;
  }

  return (
    <div className="space-y-4">
      {/* Export buttons */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-[#d1d1d1] bg-[#1e1e1e] border border-[#222] hover:brightness-125 rounded-lg transition"
          >
            <Printer className="w-3.5 h-3.5" /> 导出PDF
          </button>
          <button
            onClick={() => {
              const table = document.querySelector(".export-table");
              if (table) {
                (table as HTMLElement).style.position = "static";
                (table as HTMLElement).style.visibility = "visible";
              }
              window.print();
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-[#d1d1d1] bg-[#1e1e1e] border border-[#222] hover:brightness-125 rounded-lg transition"
          >
            <Table2 className="w-3.5 h-3.5" /> 打印表格
          </button>
        </div>
      </div>

      {isGoalkeeper && (
        <p className="text-xs text-gray-500 bg-[#1e1e1e]/50 rounded-lg p-2">
          守门员仅展示无球训练内容
        </p>
      )}

      {upper.length > 0 && (
        <div className="border-b border-[#1e1e1e]/30 pb-4 mb-4">
          <h4 className="text-[#d92525] text-sm font-bold mb-2">🦾 上肢训练</h4>
          <ExerciseTable exercises={upper} />
        </div>
      )}

      {lower.length > 0 && (
        <div className="border-b border-[#1e1e1e]/30 pb-4 mb-4">
          <h4 className="text-[#d92525] text-sm font-bold mb-2">🦿 下肢训练</h4>
          <ExerciseTable exercises={lower} />
        </div>
      )}

      {core.length > 0 && (
        <div className="border-b border-[#1e1e1e]/30 pb-4 mb-4">
          <h4 className="text-[#d92525] text-sm font-bold mb-2">💪 核心训练</h4>
          <ExerciseTable exercises={core} />
        </div>
      )}

      {abilityExercises.length > 0 && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">⚡ 定向能力训练</h4>
          <div className="space-y-3">
            {abilityExercises.map((ex, i) => (
              <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{ex.name}</span>
                  <span className="text-xs text-gray-400">
                    {ex.sets}组 × {ex.reps}次 @ {ex.load} · 间歇{ex.rest}s
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{ex.progression}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
