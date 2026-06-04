"use client";

import { useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { ExerciseIcon } from "./ExerciseIcon";
import { ImageModal } from "../ImageModal";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExerciseItem = any;

interface Props {
  exercises: ExerciseItem[];
  onEditExercise?: (index: number, exercise: ExerciseItem) => void;
  /** When true, also displays the `progression` field below the exercise name (for ability exercises). */
  showProgression?: boolean;
}

function rpeBadgeColor(rpe: number): string {
  if (rpe >= 8) return "bg-red-500/20 text-red-400";
  if (rpe >= 6) return "bg-yellow-500/20 text-yellow-400";
  return "bg-green-500/20 text-green-400";
}

export function ExerciseTable({ exercises, onEditExercise, showProgression }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");

  if (!exercises || exercises.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">暂无训练动作</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {exercises.map((ex: ExerciseItem, i: number) => {
          const hasImage = !!(ex.image_url || ex.side_view_url);
          const imgUrl = ex.image_url || ex.side_view_url;
          const cuePoints = ex.cue_points;

          return (
            <div
              key={i}
              className="bg-[#1e1e1e] border border-[#222] border-l-2 border-l-[#d92525] rounded-xl p-4 flex flex-col gap-3"
            >
              {/* Header row: icon + name + edit hint */}
              <div className="flex items-start gap-3">
                <ExerciseIcon name={ex.name} imageUrl={ex.image_url} />
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onEditExercise?.(i, ex)}
                    className="text-base font-bold text-white hover:text-[#d92525] hover:underline cursor-pointer transition text-left leading-tight"
                    title="点击编辑此动作"
                  >
                    {ex.name}
                  </button>
                  {onEditExercise && (
                    <Pencil className="w-3 h-3 text-gray-600 inline ml-1.5 align-baseline" />
                  )}
                  {showProgression && ex.progression && (
                    <p className="text-xs text-gray-500 mt-0.5">{ex.progression}</p>
                  )}
                </div>
              </div>

              {/* Sets x Reps — large and prominent */}
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-[#d92525]">{ex.sets}组</span>
                <span className="text-[#d92525]/50 text-sm font-medium">×</span>
                <span className="text-lg font-bold text-[#d92525]">{ex.reps}次</span>
              </div>

              {/* Badge row: load / rest / RPE / heart-rate zone */}
              <div className="flex flex-wrap items-center gap-1.5">
                {ex.load && (
                  <span className="bg-[#121212] rounded px-2 py-0.5 text-sm text-[#d1d1d1]">
                    负荷 {ex.load}
                  </span>
                )}
                {ex.rest != null && (
                  <span className="bg-[#121212] rounded px-2 py-0.5 text-xs text-gray-400">
                    间歇 {ex.rest}s
                  </span>
                )}
                {ex.rpe != null && (
                  <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${rpeBadgeColor(ex.rpe)}`}>
                    RPE {ex.rpe}
                  </span>
                )}
                {ex.heart_rate_zone && (
                  <span className="bg-[#121212] rounded px-2 py-0.5 text-xs text-gray-400">
                    ❤️ {ex.heart_rate_zone}
                  </span>
                )}
              </div>

              {/* Cue points */}
              {cuePoints && (Array.isArray(cuePoints) ? cuePoints.length > 0 : true) && (
                <p className="text-xs text-gray-500 leading-relaxed">
                  📝 {Array.isArray(cuePoints) ? cuePoints.join(" · ") : cuePoints}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-auto pt-1">
                {hasImage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewUrl(imgUrl);
                      setPreviewName(ex.name);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                               bg-[#121212] border border-[#333] text-[#d1d1d1]
                               hover:border-[#d92525] hover:text-[#d92525] transition-all
                               min-h-[44px] min-w-[44px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    查看动作图
                  </button>
                )}
                {onEditExercise && (
                  <button
                    onClick={() => onEditExercise(i, ex)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                               bg-[#121212] border border-[#333] text-[#d1d1d1]
                               hover:border-[#d92525] hover:text-[#d92525] transition-all
                               min-h-[44px] min-w-[44px]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    编辑
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ImageModal
        open={!!previewUrl}
        imageUrl={previewUrl || ""}
        title={previewName}
        onClose={() => setPreviewUrl(null)}
      />
    </>
  );
}
