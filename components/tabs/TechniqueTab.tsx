"use client";

import { TrainingModule } from "@/lib/types";
import { FieldDiagram } from "../FieldDiagram";
import { useState } from "react";
import { Eye } from "lucide-react";
import { ImageModal } from "../ImageModal";

interface Props {
  modules: TrainingModule[];
}

export function TechniqueTab({ modules }: Props) {
  const techModule = modules.find((m) => m.module === "technique_running");
  const [drillPreview, setDrillPreview] = useState<{ url: string; name: string } | null>(null);

  if (!techModule || techModule.module !== "technique_running" || !techModule.drills) {
    return <p className="text-sm text-gray-500 py-8 text-center">暂无技术训练内容</p>;
  }

  return (
    <div className="space-y-4">
      {/* Drills */}
      <div>
        <h4 className="text-neon-pink text-sm font-bold mb-2">技术练习</h4>
        {techModule.drills.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">暂无技术练习</p>
        ) : (
          <div className="space-y-3">
            {techModule.drills.map((drill, i) => (
              <div key={i}>
                <div className="bg-pitch-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white">{drill.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {drill.image_url && (
                        <button
                          onClick={() => setDrillPreview({ url: drill.image_url!, name: drill.name })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium
                                     bg-pitch-700 border border-pitch-600 text-gray-300
                                     hover:border-neon-pink hover:text-neon-pink transition-all"
                        >
                          <Eye className="w-3 h-3" />
                          查看动作图
                        </button>
                      )}
                      <span className="text-xs text-gray-400">{drill.duration}分钟</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{drill.description}</p>

                  {(drill.purpose || (drill.key_points && drill.key_points.length > 0)) && (
                    <div className="mt-3 pt-3 border-t border-pitch-600 space-y-2">
                      {drill.purpose && (
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] text-neon-pink font-bold mt-0.5 whitespace-nowrap">🎯 目的</span>
                          <span className="text-xs text-gray-300">{drill.purpose}</span>
                        </div>
                      )}
                      {drill.key_points && drill.key_points.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-neon-pink font-bold">⚡ 要点</span>
                          {drill.key_points.map((kp, j) => (
                            <div key={j} className="flex items-start gap-1.5">
                              <span className="text-[10px] text-neon-pink font-bold mt-0.5">{j + 1}.</span>
                              <span className="text-xs text-gray-300">{kp}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {drill.diagram && <FieldDiagram diagram={drill.diagram} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Running Profile */}
      <div>
        <h4 className="text-neon-pink text-sm font-bold mb-2">跑动特征</h4>
        <div className="bg-pitch-700/50 rounded-lg p-3">
          <p className="text-sm text-gray-300">
            总跑动距离：<span className="text-white">{techModule.running_profile.total_distance}</span>
          </p>
          <div className="flex gap-2 mt-2">
            {techModule.running_profile.intensity_zones.map((zone, i) => (
              <span key={i} className="px-2 py-1 bg-pitch-600 rounded text-xs text-gray-300">
                {zone}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ImageModal
        open={!!drillPreview}
        imageUrl={drillPreview?.url || ""}
        title={drillPreview?.name || ""}
        onClose={() => setDrillPreview(null)}
      />
    </div>
  );
}
