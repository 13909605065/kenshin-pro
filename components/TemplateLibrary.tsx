"use client";

import { useState } from "react";
import { X, Trash2, Zap, Clock, User, Target } from "lucide-react";
import type { TrainingTemplate } from "@/hooks/useTemplates";
import type { PlayerFormData } from "@/lib/types";
import { COACH_ROLE_LABELS, GOAL_LABELS } from "@/lib/constants";

interface Props {
  templates: TrainingTemplate[];
  onApply: (template: TrainingTemplate) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function TemplateLibrary({ templates, onApply, onDelete, onClose }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  const getRoleLabel = (fd: PlayerFormData) => {
    if (fd.role === "coach") {
      const parts = [
        fd.coachCert && fd.coachCert.toUpperCase(),
        fd.coachRole && (COACH_ROLE_LABELS as any)[fd.coachRole],
      ].filter(Boolean);
      return parts.join(" · ") || "教练";
    }
    return fd.position || "球员";
  };

  const getGoalLabel = (fd: PlayerFormData) => {
    if (fd.goal && fd.role !== "coach") return (GOAL_LABELS as any)[fd.goal] || fd.goal;
    if (fd.role === "coach" && fd.tacticalThemes?.length) {
      return fd.tacticalThemes.slice(0, 2).join("+");
    }
    return "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: "#1e1e1e", border: "1px solid #222" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #222" }}>
          <div>
            <h2 className="text-white font-bold text-lg">训练模板库</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">保存的方案模板，一键套用生成新训练计划</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#333] transition text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">暂无保存的模板</p>
              <p className="text-[11px] text-gray-600 mt-1">生成训练方案后，点击底部「保存模板」即可存入模板库</p>
            </div>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-[#121212] border border-[#222] rounded-xl p-4 hover:border-[#992828]/30 transition-all duration-150 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Name + badges */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-white font-bold text-sm truncate">{tpl.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[9px] font-medium bg-[#992828]/15 text-[#992828] flex-shrink-0">
                        {tpl.plan_content?.length || 0} 模块
                      </span>
                    </div>
                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {getRoleLabel(tpl.form_data)}</span>
                      {getGoalLabel(tpl.form_data) && (
                        <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {getGoalLabel(tpl.form_data)}</span>
                      )}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(tpl.created_at)}</span>
                    </div>
                    {/* Module preview */}
                    {tpl.plan_content?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tpl.plan_content.slice(0, 4).map((m: any, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-[#1a1a1a] text-gray-400">
                            {m.module === "position_training" ? "位置训练" :
                             m.module === "session_plan" ? "训练教案" :
                             m.module === "tactical_focus" ? "战术专项" :
                             m.module === "microcycle" ? "微周期" :
                             m.module === "ability_training" ? "能力定向" :
                             m.module === "technique_running" ? "技术跑动" :
                             m.module || "—"}
                          </span>
                        ))}
                        {tpl.plan_content.length > 4 && <span className="text-[9px] text-gray-600">+{tpl.plan_content.length - 4}</span>}
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onApply(tpl)}
                      className="flex items-center gap-1 px-3 py-2 bg-[#992828] text-white rounded-lg text-xs font-bold hover:bg-[#b91d1d] transition active:scale-[0.98]"
                    >
                      <Zap className="w-3.5 h-3.5" />套用
                    </button>
                    {confirmDelete === tpl.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { onDelete(tpl.id); setConfirmDelete(null); }}
                          className="px-2 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-500/30 transition">
                          确认删除
                        </button>
                        <button onClick={() => setConfirmDelete(null)}
                          className="px-2 py-2 text-gray-400 hover:text-white rounded-lg text-[10px] transition">
                          取消
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(tpl.id)}
                        className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                        title="删除模板">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
