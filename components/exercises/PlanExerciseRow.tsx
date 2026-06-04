"use client";

import { PlanExercise } from "@/lib/strength-types";
import { BODY_PART_LABELS } from "@/lib/exercise-data";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";

interface Props {
  exercise: PlanExercise;
  index: number;
  total: number;
  onUpdate: (updates: Partial<PlanExercise>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function PlanExerciseRow({
  exercise,
  index,
  total,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Props) {
  return (
    <div className="bg-[#1e1e1e]/50 rounded-lg p-3 border border-[#222] hover:border-[#d92525] transition-colors">
      <div className="flex items-start gap-3">
        {/* Reorder controls */}
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition rounded"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-gray-600">{index + 1}</span>
          <button
            onClick={onMoveDown}
            disabled={index >= total - 1}
            className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition rounded"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Exercise info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-medium text-sm truncate">{exercise.name}</span>
            <span className="px-1.5 py-0.5 rounded bg-[#d92525]/10 border border-[#d92525]/20 text-[10px] text-[#d92525] font-medium flex-shrink-0">
              {BODY_PART_LABELS[exercise.body_part]}
            </span>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] text-gray-400 mb-1">组数</label>
              <input
                type="number"
                value={exercise.sets}
                onChange={(e) => onUpdate({ sets: Number(e.target.value) || 1 })}
                min={1}
                max={10}
                className="w-full h-8 px-2 bg-[#1e1e1e] border border-[#222] rounded-md text-white text-xs text-center focus:border-[#d92525] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-1">次数</label>
              <input
                type="number"
                value={exercise.reps}
                onChange={(e) => onUpdate({ reps: Number(e.target.value) || 1 })}
                min={1}
                max={50}
                className="w-full h-8 px-2 bg-[#1e1e1e] border border-[#222] rounded-md text-white text-xs text-center focus:border-[#d92525] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-1">负荷</label>
              <input
                type="text"
                value={exercise.load}
                onChange={(e) => onUpdate({ load: e.target.value })}
                placeholder="80% 1RM"
                className="w-full h-8 px-2 bg-[#1e1e1e] border border-[#222] rounded-md text-white text-xs text-center focus:border-[#d92525] focus:outline-none transition-colors placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-1">间歇(s)</label>
              <input
                type="number"
                value={exercise.rest}
                onChange={(e) => onUpdate({ rest: Number(e.target.value) || 0 })}
                min={0}
                max={600}
                className="w-full h-8 px-2 bg-[#1e1e1e] border border-[#222] rounded-md text-white text-xs text-center focus:border-[#d92525] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Remove */}
        <button
          onClick={onRemove}
          className="p-1.5 text-gray-600 hover:text-neon-red transition rounded-lg hover:bg-[#1e1e1e] flex-shrink-0 mt-1"
          title="移除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
