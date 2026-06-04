"use client";

import { SeasonPhase } from "@/lib/types";

const PHASES: { value: SeasonPhase; label: string; icon: string; desc: string }[] = [
  { value: "preseason", label: "准备期", icon: "🏋️", desc: "赛季前 6-8 周，建立体能基础与力量储备" },
  { value: "competition", label: "赛季期", icon: "⚽", desc: "比赛期间，维持竞技状态，管理疲劳" },
  { value: "recovery", label: "赛后恢复", icon: "🧊", desc: "赛后 24-72 小时，主动恢复与再生" },
  { value: "offseason", label: "休赛期", icon: "🌴", desc: "赛季结束，身心恢复，伤病修复" },
];

interface Props {
  selected: SeasonPhase | null;
  onChange: (phase: SeasonPhase) => void;
  error?: string;
}

export function SeasonPhaseStep({ selected, onChange, error }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">选择赛季阶段</h2>
      <p className="text-gray-400 text-sm">训练方案将根据赛季周期自动适配</p>

      <div className="space-y-4">
          {PHASES.map((phase) => (
            <button
              key={phase.value}
              onClick={() => onChange(phase.value)}
              className={`w-full p-4 rounded-xl border transition-all text-left flex items-start gap-4 ${
                selected === phase.value
                  ? "border-[#d92525] bg-[#d92525]/10"
                  : "border-[#222] hover:border-[#d92525] bg-[#1e1e1e]"
              }`}
            >
              <div className="text-2xl">{phase.icon}</div>
              <div>
                <div className="font-bold text-white">{phase.label}</div>
                <div className="text-sm text-gray-500 mt-1">{phase.desc}</div>
              </div>
              <div className="ml-auto">
                <div
                  className={`w-5 h-5 rounded-full border-2 ${
                    selected === phase.value
                      ? "border-[#d92525] bg-[#d92525]"
                      : "border-[#d92525]"
                  }`}
                />
              </div>
            </button>
          ))}
        </div>

      {error && <p className="text-neon-red text-sm">{error}</p>}
    </div>
  );
}
