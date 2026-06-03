"use client";

import { useState } from "react";
import { ExerciseLibItem } from "@/lib/strength-types";
import { BODY_PART_LABELS, EQUIPMENT_LABELS } from "@/lib/exercise-data";
import { StickFigure } from "@/components/StickFigure";
import { X, Plus, TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  exercise: ExerciseLibItem | null;
  onClose: () => void;
  onAdd?: (ex: ExerciseLibItem) => void;
}

export function ExerciseDetailPanel({ exercise, onClose, onAdd }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!exercise) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-pitch-800 border-l border-pitch-600 z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-pitch-800/95 backdrop-blur border-b border-pitch-600 p-3 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-white truncate">{exercise.name}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Stick Figure — compact, centered */}
          <div className="w-full max-w-[160px] mx-auto bg-[#111] rounded-xl p-3">
            <StickFigure name={exercise.name} size={140} showMuscles={true} />
          </div>

          {/* External image (only if loads) */}
          {exercise.image_url && !imgFailed && (
            <div className="w-full aspect-video bg-pitch-700 rounded-xl overflow-hidden">
              <img src={exercise.image_url} alt={exercise.name} className="w-full h-full object-cover"
                onError={() => setImgFailed(true)} />
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-neon-pink/10 border border-neon-pink/20 text-xs text-neon-pink font-medium">{BODY_PART_LABELS[exercise.body_part]}</span>
            <span className="px-2 py-1 rounded bg-pitch-600 text-xs text-gray-400">{EQUIPMENT_LABELS[exercise.equipment]}</span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-white font-bold text-sm mb-1">动作说明</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{exercise.description}</p>
          </div>

          {/* Cue Points */}
          <div>
            <h3 className="text-white font-bold text-sm mb-1">动作要点</h3>
            <ol className="space-y-1">
              {exercise.cue_points.map((cue, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm text-gray-300">
                  <span className="text-neon-pink font-bold">{i+1}.</span> {cue}
                </li>
              ))}
            </ol>
          </div>

          {/* Progression / Regression */}
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-pitch-700/50 rounded-lg p-3 border border-pitch-600">
              <div className="flex items-center gap-1 mb-1"><TrendingUp className="w-4 h-4 text-neon-pink"/><span className="text-xs text-neon-pink font-bold">进阶变式</span></div>
              <p className="text-xs text-gray-400">{exercise.progression}</p>
            </div>
            <div className="bg-pitch-700/50 rounded-lg p-3 border border-pitch-600">
              <div className="flex items-center gap-1 mb-1"><TrendingDown className="w-4 h-4 text-blue-400"/><span className="text-xs text-blue-400 font-bold">退阶变式</span></div>
              <p className="text-xs text-gray-400">{exercise.regression}</p>
            </div>
          </div>

          {onAdd && (
            <button onClick={() => onAdd(exercise)} className="w-full bg-neon-pink text-black font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
              <Plus className="w-4 h-4"/> 添加到计划
            </button>
          )}
        </div>
      </div>
    </>
  );
}
