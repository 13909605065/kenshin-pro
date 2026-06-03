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

  const posModule = modules.find((m) => m.module === "position_training");
  if (!posModule || posModule.module !== "position_training" || !posModule.warmup) {
    return <p className="text-sm text-gray-500 py-8 text-center">暂无热身内容</p>;
  }

  const warmup = posModule.warmup;

  const classifyBallMode = (item: { name: string; description: string }): "no_ball" | "with_ball" => {
    const ballKeywords = /球|ball|pass|dribble|touch|control|juggling|drill|cone/i;
    return ballKeywords.test(item.name + item.description) ? "with_ball" : "no_ball";
  };

  // Classify warmup item into 4-phase structure: ①心肺动员 ②躯干激活 ③动态拉伸 ④神经准备
  const getWarmupPhase = (item: { name: string; description: string }): number => {
    const text = item.name + item.description;
    // Phase 1: 心肺动员 — jogging, skipping, jumping, heart rate elevation
    if (/慢跑|jog|开合跳|jumping.jack|小步跑|直腿跑|马克操|高抬腿|skip|转髋跳|踝膝|变向|后退|侧滑|心率|心肺/i.test(text)) return 1;
    // Phase 2: 躯干激活 — glute, core, band activation, planks, nordic, FIFA 11+
    if (/臀肌|臀桥|弹力带|band|平板|侧桥|北欧|nordic|单腿平衡|鸟狗|死虫|蚌式|glute|plank|核心|core|激活/i.test(text)) return 2;
    // Phase 3: 动态拉伸 — dynamic stretch, mobility, hip open, spider-man, world greatest
    if (/拉伸|stretch|髋关节|hip.open|蜘蛛侠|spider|最伟大|world.greatest|弓步|lunge|燕式|抱膝|mobil/i.test(text)) return 3;
    // Phase 4: 神经准备 — neural, agility, plyo, acceleration, ladder, reaction
    if (/神经|neural|增强式|plyo|加速|accel|绳梯|ladder|反应|启动|协调|冲刺|sprint/i.test(text)) return 4;
    // Default: phase 3 (dynamic stretch/mobility)
    return 3;
  };

  const PHASE_LABELS = ["", "① 心肺动员", "② 躯干激活", "③ 动态拉伸", "④ 神经准备"];

  const effectiveMode = isGoalkeeper ? "no_ball" : mode;
  const filtered = effectiveMode === "combined"
    ? warmup
    : warmup.filter((w) => classifyBallMode(w) === effectiveMode);

  return (
    <div className="space-y-4">
      {/* Warmup mode selector (hidden for goalkeepers) */}
      {!isGoalkeeper && (
        <div className="flex items-center gap-1 bg-pitch-800 rounded-lg p-0.5 w-fit">
          {([
            { value: "no_ball" as const, label: "无球热身" },
            { value: "with_ball" as const, label: "有球热身" },
            { value: "combined" as const, label: "两者结合" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                mode === opt.value
                  ? "bg-neon-pink text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {isGoalkeeper && (
        <p className="text-xs text-gray-500">守门员仅展示无球热身内容</p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          {effectiveMode === "no_ball" ? "暂无无球热身项目" : "暂有球热身项目"}
        </p>
      ) : (
        <div className="space-y-3">
          {(() => {
            const isNoBall = effectiveMode === "no_ball";
            if (!isNoBall) {
              // Simple flat list for with_ball or combined mode
              return filtered.map((w, i) => (
                <div key={i} className="bg-pitch-700/50 rounded-lg p-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-white">{w.name}</span>
                    <span className="text-xs text-gray-400">{w.duration}秒</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{w.description}</p>
                </div>
              ));
            }
            // Group by phase for no_ball mode
            const grouped: Record<number, typeof filtered> = {};
            filtered.forEach((w) => {
              const phase = getWarmupPhase(w);
              if (!grouped[phase]) grouped[phase] = [];
              grouped[phase].push(w);
            });
            const phases = [1, 2, 3, 4].filter((p) => grouped[p]?.length > 0);
            return phases.map((phase) => (
              <div key={phase}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-neon-pink/80 bg-neon-pink/10 px-2 py-0.5 rounded">
                    {PHASE_LABELS[phase]}
                  </span>
                  <div className="flex-1 h-px bg-pitch-700/50" />
                </div>
                <div className="space-y-2">
                  {grouped[phase].map((w, i) => (
                    <div key={i} className="bg-pitch-700/50 rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="font-medium text-white">{w.name}</span>
                        <span className="text-xs text-gray-400">{w.duration}秒</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{w.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
