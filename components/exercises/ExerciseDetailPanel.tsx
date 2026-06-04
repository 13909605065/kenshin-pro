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

// Optional difficulty detection
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

export function ExerciseDetailPanel({ exercise, onClose, onAdd }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!exercise) return null;

  const difficulty = detectDifficulty(exercise.id, exercise.name);
  const football = isFootballRelevant(exercise.id, exercise.name);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-[#1e1e1e] border-l border-[#222] z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#1e1e1e]/95 backdrop-blur border-b border-[#222] p-4 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-[#d1d1d1] truncate pr-2">{exercise.name}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors duration-150 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Stick Figure — centered */}
          <div className="w-full max-w-[160px] mx-auto bg-[#111] rounded-xl p-3">
            <StickFigure name={exercise.name} size={140} showMuscles={true} />
          </div>

          {/* External image (only if loads) */}
          {exercise.image_url && !imgFailed && (
            <div className="w-full aspect-video bg-[#111] rounded-xl overflow-hidden">
              <img
                src={exercise.image_url}
                alt={exercise.name}
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            </div>
          )}

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded bg-[#d92525]/10 border border-[#d92525]/20 text-xs text-[#d92525] font-medium">
              {BODY_PART_LABELS[exercise.body_part]}
            </span>
            <span className="px-2 py-1 rounded bg-[#222] text-xs text-gray-400">
              {EQUIPMENT_LABELS[exercise.equipment]}
            </span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                difficulty === "进阶"
                  ? "bg-[#d92525]/10 border border-[#d92525]/20 text-[#d92525]"
                  : difficulty === "中级"
                  ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
                  : "bg-green-500/10 border border-green-500/20 text-green-500"
              }`}
            >
              {difficulty}
            </span>
            {football && (
              <span className="px-2 py-1 rounded bg-[#d92525]/10 border border-[#d92525]/20 text-xs text-[#d92525] font-medium">
                ⚽ 足球专项
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider font-medium">动作说明</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{exercise.description}</p>
          </div>

          {/* Cue Points */}
          <div>
            <h3 className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider font-medium">动作要点</h3>
            <ol className="space-y-1.5">
              {exercise.cue_points.map((cue, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm text-gray-300">
                  <span className="text-[#d92525] font-bold shrink-0">{i + 1}.</span>
                  <span>{cue}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Progression / Regression */}
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-[#111] rounded-xl p-3 border border-[#222]">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-[#d92525]" />
                <span className="text-xs text-[#d92525] font-bold">进阶变式</span>
              </div>
              <p className="text-xs text-gray-400">{exercise.progression}</p>
            </div>
            <div className="bg-[#111] rounded-xl p-3 border border-[#222]">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-400 font-bold">退阶变式</span>
              </div>
              <p className="text-xs text-gray-400">{exercise.regression}</p>
            </div>
          </div>

          {/* Add to Plan Button */}
          {onAdd && (
            <button
              onClick={() => onAdd(exercise)}
              className="w-full bg-[#d92525] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-[#e03030] transition-all duration-150 hover:shadow-lg hover:shadow-[#d92525]/20"
            >
              <Plus className="w-4 h-4" />
              添加到训练方案
            </button>
          )}
        </div>
      </div>
    </>
  );
}
