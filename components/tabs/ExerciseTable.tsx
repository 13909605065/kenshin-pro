"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { ExerciseIcon } from "./ExerciseIcon";
import { ImageModal } from "../ImageModal";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExerciseItem = any;

interface Props {
  exercises: ExerciseItem[];
}

export function ExerciseTable({ exercises }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");

  if (!exercises || exercises.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">暂无训练动作</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-pitch-600">
              <th className="text-left py-2 text-gray-400 font-medium">动作</th>
              <th className="text-center py-2 text-gray-400 font-medium">组数</th>
              <th className="text-center py-2 text-gray-400 font-medium">次数</th>
              <th className="text-center py-2 text-gray-400 font-medium">负荷</th>
              <th className="text-center py-2 text-gray-400 font-medium">间歇(s)</th>
              <th className="text-center py-2 text-gray-400 font-medium">RPE</th>
              <th className="text-center py-2 text-gray-400 font-medium">心率区间</th>
              <th className="text-center py-2 text-gray-400 font-medium w-24"></th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex: ExerciseItem, i: number) => {
              const hasImage = !!(ex.image_url || ex.side_view_url);
              const imgUrl = ex.image_url || ex.side_view_url;
              return (
                <tr key={i} className="border-b border-pitch-700/50">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <ExerciseIcon name={ex.name} imageUrl={ex.image_url} />
                      <span className="text-white">{ex.name}</span>
                    </div>
                  </td>
                  <td className="py-2 text-center text-gray-300">{ex.sets}</td>
                  <td className="py-2 text-center text-gray-300">{ex.reps}</td>
                  <td className="py-2 text-center text-gray-300">{ex.load}</td>
                  <td className="py-2 text-center text-gray-300">{ex.rest}</td>
                  <td className="py-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                      ex.rpe >= 8 ? "bg-red-500/20 text-red-400" :
                      ex.rpe >= 6 ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-green-500/20 text-green-400"
                    }`}>{ex.rpe || "-"}</span>
                  </td>
                  <td className="py-2 text-center text-gray-300 text-xs">{ex.heart_rate_zone || "-"}</td>
                  <td className="py-2 text-center">
                    {hasImage ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewUrl(imgUrl);
                          setPreviewName(ex.name);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium
                                   bg-pitch-700 border border-pitch-600 text-gray-300
                                   hover:border-neon-pink hover:text-neon-pink transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        查看动作图
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
