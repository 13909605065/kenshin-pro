"use client";

import { useState } from "react";
import { Exercise, ForcePoint, JointAngle } from "@/lib/types";
import { ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props {
  exercise: Exercise;
}

const FORCE_ARROW: Record<ForcePoint["direction"], string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  upleft: "↖",
  upright: "↗",
  downleft: "↙",
  downright: "↘",
};

const FORCE_ROTATION: Record<ForcePoint["direction"], string> = {
  up: "-90deg",
  down: "90deg",
  left: "180deg",
  right: "0deg",
  upleft: "-135deg",
  upright: "-45deg",
  downleft: "135deg",
  downright: "45deg",
};

export function ExerciseDetail({ exercise }: Props) {
  const [view, setView] = useState<"front" | "side">("front");
  const [zoom, setZoom] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [sideImgFailed, setSideImgFailed] = useState(false);

  const currentUrl =
    view === "front" ? exercise.image_url : exercise.side_view_url;
  const hasImage = !!currentUrl && !imgFailed && !sideImgFailed;
  const hasSideView = !!exercise.side_view_url;
  const hasAnnotations =
    (exercise.force_points && exercise.force_points.length > 0) ||
    (exercise.joint_angles && exercise.joint_angles.length > 0);

  return (
    <>
      {/* Inline card */}
      <div className="mt-3 border border-pitch-600 rounded-xl overflow-hidden bg-pitch-800/60">
        {/* View toggle bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-pitch-700/80 border-b border-pitch-600">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">动作示范</span>
            {hasSideView && (
              <div className="flex bg-pitch-800 rounded-md p-0.5">
                <button
                  onClick={() => { setView("front"); setSideImgFailed(false); }}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    view === "front"
                      ? "bg-neon-pink text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  主视图
                </button>
                <button
                  onClick={() => { setView("side"); setImgFailed(false); }}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    view === "side"
                      ? "bg-neon-pink text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  侧视图
                </button>
              </div>
            )}
          </div>
          {hasImage && (
            <button
              onClick={() => setZoom(true)}
              className="p-1.5 text-gray-400 hover:text-neon-pink transition rounded-lg hover:bg-pitch-600"
              title="放大查看"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Image area */}
        <div className="relative bg-pitch-900 flex items-center justify-center min-h-[200px] p-4">
          {hasImage ? (
            <div className="relative inline-block">
              <img
                src={currentUrl}
                alt={`${exercise.name} - ${view === "front" ? "主视图" : "侧视图"}`}
                className="max-w-full max-h-[320px] object-contain rounded-lg"
                loading="lazy"
                onError={() => {
                  if (view === "front") setImgFailed(true);
                  else setSideImgFailed(true);
                }}
              />

              {/* Force point overlays */}
              {exercise.force_points?.map((fp, i) => (
                <div
                  key={`force-${i}`}
                  className="absolute flex items-center gap-1 pointer-events-none"
                  style={{ top: "40%", left: `${30 + i * 25}%` }}
                >
                  <span className="w-6 h-6 rounded-full bg-neon-pink/20 border border-neon-pink flex items-center justify-center text-neon-pink text-xs font-bold backdrop-blur-sm">
                    {FORCE_ARROW[fp.direction]}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-pitch-900/90 border border-neon-pink/30 text-[10px] text-neon-pink whitespace-nowrap backdrop-blur-sm">
                    {fp.muscle_group}
                  </span>
                </div>
              ))}

              {/* Joint angle overlays */}
              {exercise.joint_angles?.map((ja, i) => (
                <div
                  key={`angle-${i}`}
                  className="absolute flex items-center gap-1 pointer-events-none"
                  style={{ top: `${55 + i * 20}%`, left: `${25 + i * 30}%` }}
                >
                  <span className="w-6 h-6 rounded-full border border-neon-pink flex items-center justify-center text-[10px] font-bold bg-pitch-900/90 text-neon-pink backdrop-blur-sm">
                    {ja.angle}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-pitch-900/90 border border-neon-pink/30 text-[10px] text-neon-pink whitespace-nowrap backdrop-blur-sm">
                    {ja.joint_name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <ExercisePlaceholder name={exercise.name} />
          )}
        </div>

        {/* Info footer */}
        <div className="px-4 py-3 border-t border-pitch-600 space-y-2">
          {/* Prime movers */}
          {exercise.prime_movers && exercise.prime_movers.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-gray-500 whitespace-nowrap mt-0.5">目标肌群</span>
              <div className="flex flex-wrap gap-1">
                {exercise.prime_movers.map((m, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded bg-neon-pink/10 border border-neon-pink/20 text-[10px] text-neon-pink font-medium"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cue points */}
          {exercise.cue_points && exercise.cue_points.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-gray-500">动作要点</span>
              {exercise.cue_points.map((cue, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[10px] text-neon-pink font-bold mt-0.5">{i + 1}.</span>
                  <span className="text-xs text-gray-300">{cue}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zoom modal */}
      {zoom && hasImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur flex items-center justify-center p-4"
          onClick={() => setZoom(false)}
        >
          <button
            onClick={() => setZoom(false)}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={currentUrl}
              alt={`${exercise.name} - 放大`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
            {/* Re-draw overlays at larger scale */}
            {exercise.force_points?.map((fp, i) => (
              <div
                key={`zoom-f-${i}`}
                className="absolute flex items-center gap-2 pointer-events-none"
                style={{ top: "40%", left: `${30 + i * 25}%` }}
              >
                <span className="w-8 h-8 rounded-full bg-neon-pink/20 border-2 border-neon-pink flex items-center justify-center text-neon-pink text-sm font-bold backdrop-blur-sm">
                  {FORCE_ARROW[fp.direction]}
                </span>
                <span className="px-2 py-1 rounded bg-black/80 border border-neon-pink/40 text-xs text-neon-pink backdrop-blur-sm">
                  {fp.label}
                </span>
              </div>
            ))}
            {exercise.joint_angles?.map((ja, i) => (
              <div
                key={`zoom-a-${i}`}
                className="absolute flex items-center gap-2 pointer-events-none"
                style={{ top: `${55 + i * 20}%`, left: `${25 + i * 30}%` }}
              >
                <span className="w-8 h-8 rounded-full border-2 border-neon-pink flex items-center justify-center text-xs font-bold bg-black/80 text-neon-pink backdrop-blur-sm">
                  {ja.angle}
                </span>
                <span className="px-2 py-1 rounded bg-black/80 border border-neon-pink/40 text-xs text-neon-pink backdrop-blur-sm">
                  {ja.note}
                </span>
              </div>
            ))}
          </div>

          {/* Mobile hint */}
          <p className="absolute bottom-6 text-white/40 text-xs">
            双指缩放 · 点击任意处关闭
          </p>
        </div>
      )}
    </>
  );
}

/* ---- Placeholder when no image ---- */
function ExercisePlaceholder({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="w-16 h-16 rounded-2xl bg-pitch-700 border border-pitch-600 flex items-center justify-center">
        <span className="text-2xl">🏋️</span>
      </div>
      <p className="text-xs text-gray-500">{name}</p>
      <p className="text-[10px] text-gray-600">暂无动作示范图片</p>
    </div>
  );
}
