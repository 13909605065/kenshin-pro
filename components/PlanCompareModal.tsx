"use client";

import { X } from "lucide-react";
import { TrainingModule } from "@/lib/types";

interface PlanCompareModalProps {
  planA: { name: string; modules: TrainingModule[]; date: string };
  planB: { name: string; modules: TrainingModule[]; date: string };
  onClose: () => void;
}

function getModuleStats(modules: TrainingModule[]) {
  const stats: Record<string, { label: string; value: string }> = {};

  for (const m of modules) {
    switch (m.module) {
      case "position_training":
        stats[m.module] = {
          label: m.title || "专项训练",
          value: [
            m.warmup?.length ? `热身${m.warmup.length}项` : "",
            m.upper_limb?.length ? `上肢${m.upper_limb.length}项` : "",
            m.lower_limb?.length ? `下肢${m.lower_limb.length}项` : "",
            m.core?.length ? `核心${m.core.length}项` : "",
            m.cooldown?.length ? `冷身${m.cooldown.length}项` : "",
          ]
            .filter(Boolean)
            .join(" · "),
        };
        break;
      case "ability_training":
        stats[m.module] = {
          label: m.title || "能力训练",
          value: `${m.exercises?.length || 0}项练习`,
        };
        break;
      case "technique_running":
        stats[m.module] = {
          label: m.title || "技术跑动",
          value: `${m.drills?.length || 0}项训练 · ${m.running_profile?.total_distance || "N/A"}`,
        };
        break;
      case "phase_plan":
        stats[m.module] = {
          label: m.title || "阶段计划",
          value: `周${m.weekly_frequency || "?"}次 · ${m.session_duration || "?"}min/次`,
        };
        break;
      case "injury_recovery":
        stats[m.module] = {
          label: m.title || "伤病恢复",
          value:
            m.status === "skipped"
              ? "已跳过"
              : `${m.phases?.length || 0}个康复阶段`,
        };
        break;
      case "session_plan":
        stats[m.module] = {
          label: m.title || "训练教案",
          value: `${m.activities?.length || 0}项活动 · ${m.duration || "?"}min`,
        };
        break;
      case "tactical_focus":
        stats[m.module] = {
          label: m.title || "战术专项",
          value: `${m.drills?.length || 0}项战术练习`,
        };
        break;
      case "microcycle":
        stats[m.module] = {
          label: m.title || "微周期",
          value: `${m.days?.length || 0}天 · 比赛日: ${m.match_day || "?"}`,
        };
        break;
    }
  }
  return stats;
}

function diffBadge(aVal: string, bVal: string): { text: string; className: string } {
  if (aVal === bVal) return { text: "—", className: "text-gray-600" };

  const numsA = (aVal.match(/\d+/g) || []).map(Number);
  const numsB = (bVal.match(/\d+/g) || []).map(Number);

  // Compare first number pair
  if (numsA.length > 0 && numsB.length > 0) {
    const a0 = numsA[0];
    const b0 = numsB[0];
    if (b0 > a0) return { text: `+${b0 - a0}`, className: "text-green-400 font-bold" };
    if (b0 < a0) return { text: `${b0 - a0}`, className: "text-[#d92525] font-bold" };
  }

  return { text: "已变更", className: "text-amber-400" };
}

export function PlanCompareModal({
  planA,
  planB,
  onClose,
}: PlanCompareModalProps) {
  const statsA = getModuleStats(planA.modules);
  const statsB = getModuleStats(planB.modules);
  const allKeys = Array.from(new Set([...Object.keys(statsA), ...Object.keys(statsB)]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="glass-card p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">方案版本对比</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan labels */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#121212] rounded-lg p-2.5 border border-[#222]">
            <span className="text-gray-400">方案 1: </span>
            <span className="text-[#d92525] font-bold">{planA.name}</span>
            <span className="text-gray-500 ml-2">{planA.date}</span>
          </div>
          <div className="bg-[#121212] rounded-lg p-2.5 border border-[#222]">
            <span className="text-gray-400">方案 2: </span>
            <span className="text-[#d92525] font-bold">{planB.name}</span>
            <span className="text-gray-500 ml-2">{planB.date}</span>
          </div>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#333]">
                <th className="text-left py-2 text-gray-400 font-medium w-24">
                  模块
                </th>
                <th className="text-left py-2 text-gray-400 font-medium">
                  方案 1
                </th>
                <th className="text-left py-2 text-gray-400 font-medium">
                  方案 2
                </th>
                <th className="text-center py-2 text-gray-400 font-medium w-16">
                  变化
                </th>
              </tr>
            </thead>
            <tbody>
              {allKeys.map((key) => {
                const sa = statsA[key];
                const sb = statsB[key];
                const label = sa?.label || sb?.label || key;
                const valA = sa?.value || "—";
                const valB = sb?.value || "—";
                const diff = diffBadge(valA, valB);
                return (
                  <tr key={key} className="border-b border-[#222]">
                    <td className="py-2 text-gray-300 font-medium">
                      {label}
                    </td>
                    <td className="py-2 text-gray-400">{valA}</td>
                    <td className="py-2 text-gray-200">{valB}</td>
                    <td className="py-2 text-center">
                      <span className={diff.className}>{diff.text}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary bar */}
        <div className="bg-[#121212] rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">{planA.name}: </span>
            <span className="text-white font-bold">
              {planA.modules.length}个模块
            </span>
          </div>
          <div>
            <span className="text-gray-400">{planB.name}: </span>
            <span className="text-white font-bold">
              {planB.modules.length}个模块
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-[#1e1e1e] text-gray-400 rounded-lg text-sm hover:bg-[#222] transition"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
