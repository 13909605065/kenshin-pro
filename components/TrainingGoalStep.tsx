"use client";

import { TrainingGoal, FitnessGoal } from "@/lib/types";

type AnyGoal = TrainingGoal | FitnessGoal;
import { Dumbbell, Zap, Gauge, Timer, Heart, Swords } from "lucide-react";

const GOALS: { value: TrainingGoal; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "strength", label: "纯力量", icon: <Dumbbell className="w-6 h-6" />, desc: "最大力量发展，侧重神经肌肉适应" },
  { value: "power", label: "爆发力", icon: <Zap className="w-6 h-6" />, desc: "力-速度曲线优化，弹跳与冲刺" },
  { value: "speed", label: "速度", icon: <Gauge className="w-6 h-6" />, desc: "最大速度与加速度发展" },
  { value: "agility", label: "灵敏", icon: <Timer className="w-6 h-6" />, desc: "变向能力与反应速度" },
  { value: "mas_endurance", label: "耐力", icon: <Heart className="w-6 h-6" />, desc: "最大有氧速度与反复冲刺能力" },
  { value: "combat", label: "对抗能力", icon: <Swords className="w-6 h-6" />, desc: "身体对抗中的力量与稳定性" },
];

interface Props {
  selected: AnyGoal | null;
  onChange: (goal: AnyGoal) => void;
  error?: string;
}

export function TrainingGoalStep({ selected, onChange, error }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">选择训练目标</h2>
      <p className="text-gray-400 text-sm">选择本次训练周期的核心目标能力</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {GOALS.map((goal) => (
          <button
            key={goal.value}
            onClick={() => onChange(goal.value)}
            className={`p-5 rounded-xl border transition-all text-left ${
              selected === goal.value
                ? "border-[#d92525] bg-[#d92525]/10 shadow-[0_0_15px_rgba(0,255,136,0.1)]"
                : "border-[#222] hover:border-[#d92525] bg-[#1e1e1e]"
            }`}
          >
            <div
              className={`mb-3 ${
                selected === goal.value ? "text-[#d92525]" : "text-gray-400"
              }`}
            >
              {goal.icon}
            </div>
            <div className="font-bold text-white">{goal.label}</div>
            <div className="text-xs text-gray-500 mt-1">{goal.desc}</div>
          </button>
        ))}
      </div>

      {error && <p className="text-neon-red text-sm">{error}</p>}
    </div>
  );
}
