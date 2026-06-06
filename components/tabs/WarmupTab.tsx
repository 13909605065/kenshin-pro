"use client";

import { TrainingModule, Position } from "@/lib/types";
import { useState } from "react";

interface Props {
  modules: TrainingModule[];
  position: Position | null;
}

type WarmupMode = "no_ball" | "with_ball" | "combined";

export function WarmupTab({ modules, position }: Props) {
  const [mode, setMode] = useState<WarmupMode>("combined");
  const isGoalkeeper = position === "goalkeeper";

  // 热身方案统一使用 Fabric.js 设计器，AI 不再输出热身内容
  return (
    <div className="py-8 text-center space-y-3">
      <p className="text-sm text-gray-400">热身方案请使用热身设计器手动编排</p>
      <a href="/warmup" className="inline-block px-4 py-2 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-lg text-xs font-bold transition">
        🎨 打开热身设计器
      </a>
    </div>
  );

}
