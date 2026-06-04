"use client";

import { TrainingModule, Drill } from "@/lib/types";
import { FieldDiagram } from "../FieldDiagram";
import { ImageModal } from "../ImageModal";
import { useState } from "react";
import { Eye, ChevronDown, ChevronUp, Clock, Target, Zap, Image } from "lucide-react";

interface Props {
  modules: TrainingModule[];
}

function DrillCard({ drill, index }: { drill: Drill; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [imgPreview, setImgPreview] = useState<string | null>(null);

  const hasImage = !!drill.image_url;
  const hasDetails = !!(drill.purpose || (drill.key_points && drill.key_points.length > 0));

  return (
    <div className="bg-[#1e1e1e]/40 rounded-xl border border-[#222]/50 overflow-hidden group hover:border-[#d92525]/80 transition-colors">
      {/* Card Header — always visible */}
      <div className="flex items-start gap-3 p-3">
        {/* Number badge */}
        <div className="w-7 h-7 rounded-lg bg-[#d92525]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[#d92525] text-xs font-bold">{index + 1}</span>
        </div>

        {/* Thumbnail or placeholder */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-[#222] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {hasImage ? (
            <img src={drill.image_url} alt={drill.name}
              className="w-full h-full object-cover cursor-pointer hover:scale-110 transition"
              onClick={() => setImgPreview(drill.image_url!)}
              loading="lazy" />
          ) : (
            <Image className="w-5 h-5 text-gray-600" />
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-bold text-sm leading-tight">{drill.name}</h4>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{drill.description}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <Clock className="w-3 h-3" /> {drill.duration}分钟
            </span>
            {hasImage && (
              <button
                onClick={() => setImgPreview(drill.image_url!)}
                className="flex items-center gap-1 text-[10px] text-[#d92525] hover:text-white transition">
                <Eye className="w-3 h-3" /> 查看动作图
              </button>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        {hasDetails && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-white transition flex-shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Expandable details */}
      {expanded && hasDetails && (
        <div className="px-3 pb-3 pt-0 border-t border-[#222]/50 space-y-2.5">
          {drill.purpose && (
            <div className="flex items-start gap-2 bg-[#1e1e1e]/50 rounded-lg p-2.5">
              <Target className="w-3.5 h-3.5 text-[#d92525] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-[#d92525] font-bold mb-0.5">训练目的</p>
                <p className="text-xs text-gray-300">{drill.purpose}</p>
              </div>
            </div>
          )}
          {drill.key_points && drill.key_points.length > 0 && (
            <div className="bg-[#1e1e1e]/50 rounded-lg p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-3.5 h-3.5 text-[#d92525] flex-shrink-0" />
                <p className="text-[10px] text-[#d92525] font-bold">技术要点</p>
              </div>
              <div className="space-y-1">
                {drill.key_points.map((kp, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#d92525]/15 text-[#d92525] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-px">
                      {j + 1}
                    </span>
                    <span className="text-xs text-gray-300">{kp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Field diagram preview */}
      {drill.diagram && (
        <div className="border-t border-[#222]/50">
          <FieldDiagram diagram={drill.diagram} />
        </div>
      )}

      {/* Image modal */}
      <ImageModal
        open={!!imgPreview}
        imageUrl={imgPreview || ""}
        title={drill.name}
        onClose={() => setImgPreview(null)}
      />
    </div>
  );
}

export function TechniqueTab({ modules }: Props) {
  const techModule = modules.find((m) => m.module === "technique_running");

  if (!techModule || !Array.isArray(techModule.drills) || techModule.drills.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#1e1e1e] flex items-center justify-center mb-3">
          <Target className="w-6 h-6 text-gray-600" />
        </div>
        <p className="text-sm text-gray-400">暂无技术训练内容</p>
      </div>
    );
  }

  const safeDrills = techModule.drills || [];
  const running = techModule.running_profile || { total_distance: "暂无数据", intensity_zones: [] };
  const hasAnyImage = safeDrills.some((d: any) => !!d?.image_url);

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold">⚽ 技术练习</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {safeDrills.length} 项练习 · 点击展开查看要点
          </p>
        </div>
        {!hasAnyImage && (
          <span className="text-[10px] text-gray-600 bg-[#1e1e1e]/50 px-2 py-0.5 rounded">
            图片由 AI 自动匹配
          </span>
        )}
      </div>

      {/* Drill cards */}
      <div className="space-y-3">
        {safeDrills.map((drill: any, i: number) => (
          <DrillCard key={i} drill={drill} index={i} />
        ))}
      </div>

      {/* Running Profile — compact card */}
      <div className="bg-[#1e1e1e]/30 rounded-xl border border-[#222]/50 p-4">
        <h4 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
          🏃 跑动负荷特征
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1e1e1e]/60 rounded-lg p-3">
            <p className="text-[10px] text-gray-400 mb-0.5">总跑动距离</p>
            <p className="text-lg font-bold text-white">{running.total_distance}</p>
          </div>
          <div className="bg-[#1e1e1e]/60 rounded-lg p-3">
            <p className="text-[10px] text-gray-400 mb-0.5">强度区间分布</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {(running.intensity_zones || []).map((zone: string, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-[#222] text-[10px] text-gray-300">
                  {zone}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
