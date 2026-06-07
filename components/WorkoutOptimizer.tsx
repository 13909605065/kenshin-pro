"use client";

import { useMemo } from "react";
import { Lightbulb, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { getPlayers, type PlayerRecord } from "@/lib/roster-utils";

interface Props {
  exerciseNames: string[];
  bodyParts?: string[];
  phase?: string;
  goal?: string;
  onClose?: () => void;
}

const PHASE_TIPS: Record<string, string> = {
  preseason: "季前阶段以动作模式建立为主，强度逐步递增，避免突然加量",
  competition: "赛季中以维持力量为主，赛前2天降低下肢负荷，注重恢复",
  recovery: "恢复期重点为轻量激活+拉伸，禁止大重量下肢训练",
  offseason: "休赛期是力量窗口，可上大重量低次数",
};

const BALANCE_CHECKS = [
  { name: "下半身", keywords: ["蹲", "RDL", "臀", "硬拉", "弓步", "分腿", "lunge", "squat", "rdl", "thrust"] },
  { name: "上半身推", keywords: ["卧推", "实力推", "肩推", "bench", "press"] },
  { name: "上半身拉", keywords: ["划船", "引体", "row", "pull"] },
  { name: "爆发", keywords: ["翻", "抓", "挺", "甩", "swing", "clean", "snatch", "jerk"] },
  { name: "核心", keywords: ["plank", "支撑", "dead", "bug"] },
];

export function WorkoutOptimizer({ exerciseNames, bodyParts, phase, goal, onClose }: Props) {
  const injuredPlayers = useMemo(() => {
    try { return getPlayers().filter(p => p.injuryStatus !== "healthy"); } catch { return []; }
  }, []);

  const analysis = useMemo(() => {
    const names = exerciseNames.map(n => n.toLowerCase());
    const issues: string[] = [];
    const tips: string[] = [];
    const goods: string[] = [];

    // 1. Balance check
    const balanceResult: string[] = [];
    for (const check of BALANCE_CHECKS) {
      const found = names.some(n => check.keywords.some(k => n.includes(k)));
      if (!found) balanceResult.push(check.name);
    }
    if (balanceResult.length > 0) {
      issues.push(`缺少${balanceResult.join("、")}类动作，建议补充`);
    } else {
      goods.push("动作类型覆盖全面，上下肢+核心均衡");
    }

    // 2. Phase-based tips
    if (phase && PHASE_TIPS[phase]) {
      tips.push(PHASE_TIPS[phase]);
    }

    // 3. Exercise count
    if (exerciseNames.length < 4) {
      issues.push("动作数量偏少（" + exerciseNames.length + "个），建议至少4-6个");
    } else if (exerciseNames.length > 10) {
      issues.push("动作数量偏多（" + exerciseNames.length + "个），可能导致训练时间过长");
    } else {
      goods.push(`动作数量合理（${exerciseNames.length}个）`);
    }

    // 4. Injury warnings
    if (injuredPlayers.length > 0) {
      issues.push(`${injuredPlayers.length}名球员有伤病（${injuredPlayers.map(p => p.name).join("、")}），请自行判断是否调整动作`);
    }

    // 5. Goal tips
    if (goal === "power" && !names.some(n => ["翻","抓","挺","swing","clean","snatch","jerk"].some(k => n.includes(k)))) {
      tips.push("目标为爆发力但缺少爆发类动作，建议加入高翻/抓举/甩摆");
    }
    if (goal === "strength" && !names.some(n => ["蹲","squat","硬拉","deadlift","press","推"].some(k => n.includes(k)))) {
      tips.push("目标为最大力量但缺少大重量复合动作");
    }

    return { issues, tips, goods };
  }, [exerciseNames, phase, goal, injuredPlayers]);

  if (exerciseNames.length === 0) return null;

  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-bold text-[#d1d1d1]">训练方案优化建议</span>
          <span className="text-[9px] text-gray-600">仅供参考 · 最终由教练决定</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">关闭</button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Issues (red) */}
        {analysis.issues.map((issue, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 mt-0.5 text-[#992828]"><AlertTriangle className="w-3.5 h-3.5" /></span>
            <span className="text-gray-300">{issue}</span>
          </div>
        ))}

        {/* Tips (blue) */}
        {analysis.tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-2 text-xs bg-[#111] rounded-lg p-2.5 border border-[#222]">
            <span className="shrink-0 mt-0.5 text-blue-400"><Lightbulb className="w-3.5 h-3.5" /></span>
            <span className="text-gray-400">{tip}</span>
          </div>
        ))}

        {/* Goods (green) */}
        {analysis.goods.map((good, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 mt-0.5 text-green-500"><CheckCircle2 className="w-3.5 h-3.5" /></span>
            <span className="text-gray-400">{good}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
