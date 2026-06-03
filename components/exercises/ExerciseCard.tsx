"use client";

import { useState } from "react";
import { ExerciseLibItem } from "@/lib/strength-types";
import { BODY_PART_LABELS, EQUIPMENT_LABELS } from "@/lib/exercise-data";
import { StickFigure } from "@/components/StickFigure";
import { Plus, Eye } from "lucide-react";

interface Props {
  exercise: ExerciseLibItem;
  onView: (ex: ExerciseLibItem) => void;
  onAdd?: (ex: ExerciseLibItem) => void;
}

export function ExerciseCard({ exercise, onView, onAdd }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="glass-card-hover p-4 group">
      {/* Image: external GIF primary, stick figure fallback */}
      <div className="relative w-full aspect-square bg-[#111] rounded-lg overflow-hidden mb-3">
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
        <button
          onClick={() => onView(exercise)}
          className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100"
        >
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pitch-900/80 border border-pitch-600 text-white text-xs font-medium backdrop-blur-sm">
            <Eye className="w-3.5 h-3.5" />
            查看详情
          </span>
        </button>
      </div>

      {/* Info */}
      <h3 className="text-white font-bold text-sm">{exercise.name}</h3>
      <div className="flex items-center gap-2 mt-2">
        <span className="px-1.5 py-0.5 rounded bg-neon-pink/10 border border-neon-pink/20 text-[10px] text-neon-pink font-medium">
          {BODY_PART_LABELS[exercise.body_part]}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-pitch-600 text-[10px] text-gray-400">
          {EQUIPMENT_LABELS[exercise.equipment]}
        </span>
      </div>

      {/* Add button */}
      {onAdd && (
        <button
          onClick={() => onAdd(exercise)}
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg
                     bg-pitch-700 border border-pitch-600 text-gray-300 text-xs font-medium
                     hover:border-neon-pink hover:text-neon-pink transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          添加到计划
        </button>
      )}
    </div>
  );
}
