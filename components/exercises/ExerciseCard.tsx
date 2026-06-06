"use client";

import { useState } from "react";
import { ExerciseLibItem } from "@/lib/strength-types";
import { BODY_PART_LABELS, EQUIPMENT_LABELS } from "@/lib/exercise-data";
import { StickFigure } from "@/components/StickFigure";
import { Plus, Eye, CheckSquare, Square } from "lucide-react";

interface Props {
  exercise: ExerciseLibItem;
  onView: (ex: ExerciseLibItem) => void;
  onAdd?: (ex: ExerciseLibItem) => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}

// Optional football-specific detection for the standalone card
function detectDifficulty(id: string, name: string): "基础" | "中级" | "进阶" {
  const n = name.toLowerCase();
  if (/power.?clean|snatch|jerk|保加利亚|pistol|单腿/.test(n)) return "进阶";
  if (/plank|平板|bridge|臀桥|dead.?bug|死虫|crunch|卷腹/.test(n)) return "基础";
  if (/curl|弯举|raise|平举|kickback|臂屈伸|stretch|拉伸/.test(n)) return "基础";
  return "中级";
}

function isFootballRelevant(id: string, name: string): boolean {
  const n = name.toLowerCase();
  if (/足球|football|soccer|变向|敏捷|冲刺|爆发|弹跳|核心|稳定|单腿|平衡|旋转|抗旋/.test(n)) return true;
  if (id.startsWith("ex-sus-")) return true;
  if (/nordic|plank|side.?plank/.test(n)) return true;
  return false;
}

export function ExerciseCard({ exercise, onView, onAdd, selected = false, onToggleSelect, showCheckbox = false }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const difficulty = detectDifficulty(exercise.id, exercise.name);
  const football = isFootballRelevant(exercise.id, exercise.name);

  return (
    <div
      className={`relative bg-[#1e1e1e] border rounded-xl overflow-hidden transition-all duration-200 ease-out group ${
        selected
          ? "border-[#992828] shadow-lg shadow-[#992828]/10 -translate-y-1"
          : "border-[#222] hover:-translate-y-1 hover:border-[#992828] hover:shadow-lg hover:shadow-[#992828]/10"
      }`}
    >
      {/* Checkbox (when enabled) */}
      {showCheckbox && onToggleSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className={`absolute top-2 right-2 z-10 p-0.5 rounded transition-all duration-150 ${
            selected
              ? "text-[#992828]"
              : "text-gray-600 opacity-0 group-hover:opacity-100 hover:text-white"
          }`}
        >
          {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>
      )}

      {/* Image: external GIF primary, stick figure fallback */}
      <div className="relative w-full aspect-square bg-[#111] rounded-t-xl overflow-hidden">
        {exercise.image_url && !imgFailed ? (
          <img
            src={exercise.image_url}
            alt={exercise.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2">
            <StickFigure name={exercise.name} size={80} compact={true} />
          </div>
        )}

        {/* Football badge */}
        {football && (
          <span className="absolute bottom-1.5 left-1.5 text-[14px] leading-none drop-shadow-lg" title="足球专项相关">
            ⚽
          </span>
        )}

        {/* Difficulty badge */}
        <span
          className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
            difficulty === "进阶"
              ? "bg-[#992828]/20 text-[#992828] border border-[#992828]/30"
              : difficulty === "中级"
              ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
              : "bg-green-500/20 text-green-500 border border-green-500/30"
          }`}
        >
          {difficulty}
        </span>

        {/* Hover overlay — view detail */}
        <button
          onClick={() => onView(exercise)}
          className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100"
        >
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e1e]/90 border border-[#222] text-[#d1d1d1] text-xs font-medium backdrop-blur-sm">
            <Eye className="w-3.5 h-3.5" />
            查看详情
          </span>
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-[#d1d1d1] font-bold text-sm truncate">{exercise.name}</h3>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="px-1.5 py-0.5 rounded bg-[#992828]/10 border border-[#992828]/20 text-[10px] text-[#992828] font-medium">
            {BODY_PART_LABELS[exercise.body_part]}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#222] text-[10px] text-gray-400">
            {EQUIPMENT_LABELS[exercise.equipment]}
          </span>
        </div>

        {/* Add button */}
        {onAdd && (
          <button
            onClick={() => onAdd(exercise)}
            className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg
                       bg-[#992828]/10 border border-[#992828]/20 text-[#992828] text-xs font-medium
                       hover:bg-[#992828] hover:text-white transition-all duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
            添加到计划
          </button>
        )}
      </div>
    </div>
  );
}
