"use client";

import { useState } from "react";
import { ExerciseLibItem } from "@/lib/strength-types";
import { BODY_PART_LABELS, EQUIPMENT_LABELS } from "@/lib/exercise-data";
import { X, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { ImageModal } from "../ImageModal";

interface Props {
  exercise: ExerciseLibItem | null;
  onClose: () => void;
  onAdd?: (ex: ExerciseLibItem) => void;
}

export function ExerciseDetailPanel({ exercise, onClose, onAdd }: Props) {
  const [zoomImg, setZoomImg] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  if (!exercise) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-pitch-800 border-l border-pitch-600 z-50 animate-slide-left overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-pitch-800/95 backdrop-blur border-b border-pitch-600 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-white">{exercise.name}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-pitch-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Image */}
          {exercise.image_url && !imgFailed && (
            <div
              className="relative w-full aspect-[4/3] bg-pitch-700 rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => setZoomImg(true)}
            >
              <img
                src={exercise.image_url}
                alt={exercise.name}
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition text-white text-xs bg-pitch-900/70 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  点击放大
                </span>
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-neon-pink/10 border border-neon-pink/20 text-xs text-neon-pink font-medium">
              {BODY_PART_LABELS[exercise.body_part]}
            </span>
            <span className="px-2 py-1 rounded bg-pitch-600 text-xs text-gray-400">
              {EQUIPMENT_LABELS[exercise.equipment]}
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-white font-bold text-sm mb-2">动作说明</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{exercise.description}</p>
          </div>

          {/* Cue Points */}
          <div>
            <h3 className="text-white font-bold text-sm mb-2">动作要点</h3>
            <ol className="space-y-1.5">
              {exercise.cue_points.map((cue, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-neon-pink font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                  {cue}
                </li>
              ))}
            </ol>
          </div>

          {/* Progression / Regression */}
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-pitch-700/50 rounded-lg p-3 border border-pitch-600">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-4 h-4 text-neon-pink" />
                <span className="text-xs text-neon-pink font-bold">进阶变式</span>
              </div>
              <p className="text-xs text-gray-400">{exercise.progression}</p>
            </div>
            <div className="bg-pitch-700/50 rounded-lg p-3 border border-pitch-600">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingDown className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-400 font-bold">退阶变式</span>
              </div>
              <p className="text-xs text-gray-400">{exercise.regression}</p>
            </div>
          </div>

          {/* Add to plan */}
          {onAdd && (
            <button
              onClick={() => onAdd(exercise)}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加到计划
            </button>
          )}
        </div>
      </div>

      {/* Image zoom modal */}
      {exercise.image_url && (
        <ImageModal
          open={zoomImg}
          imageUrl={exercise.image_url}
          title={exercise.name}
          onClose={() => setZoomImg(false)}
        />
      )}
    </>
  );
}
