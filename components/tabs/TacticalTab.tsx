"use client";

import { TrainingModule } from "@/lib/types";

interface Props {
  modules: TrainingModule[];
}

export function TacticalTab({ modules }: Props) {
  const phaseModule = modules.find((m) => m.module === "phase_plan");

  if (!phaseModule || phaseModule.module !== "phase_plan") {
    return <p className="text-sm text-gray-500 py-8 text-center">暂无战术周期内容</p>;
  }

  return (
    <div className="space-y-4">
      {/* Intensity Distribution */}
      <div>
        <h4 className="text-neon-pink text-sm font-bold mb-2">周期适配计划</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-pitch-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-neon-pink">{phaseModule.weekly_frequency}</div>
            <div className="text-xs text-gray-400 mt-1">次/周</div>
          </div>
          <div className="bg-pitch-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-neon-pink">{phaseModule.session_duration}</div>
            <div className="text-xs text-gray-400 mt-1">分钟/次</div>
          </div>
          <div className="col-span-2 bg-pitch-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">强度分布</div>
            <div className="flex h-3 rounded-full overflow-hidden">
              <div
                className="bg-gray-500"
                style={{ width: `${phaseModule.intensity_distribution.low}%` }}
                title={`低强度 ${phaseModule.intensity_distribution.low}%`}
              />
              <div
                className="bg-neon-pink/60"
                style={{ width: `${phaseModule.intensity_distribution.medium}%` }}
                title={`中强度 ${phaseModule.intensity_distribution.medium}%`}
              />
              <div
                className="bg-neon-red/60"
                style={{ width: `${phaseModule.intensity_distribution.high}%` }}
                title={`高强度 ${phaseModule.intensity_distribution.high}%`}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>低 {phaseModule.intensity_distribution.low}%</span>
              <span>中 {phaseModule.intensity_distribution.medium}%</span>
              <span>高 {phaseModule.intensity_distribution.high}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Strategy */}
      <div>
        <h4 className="text-neon-pink text-sm font-bold mb-2">恢复策略</h4>
        <div className="bg-pitch-700/50 rounded-lg p-3">
          <p className="text-sm text-gray-300">{phaseModule.recovery_strategy}</p>
        </div>
      </div>

      {/* Tactical Board Placeholder */}
      <div>
        <h4 className="text-neon-pink text-sm font-bold mb-2">战术分析</h4>
        <div className="bg-pitch-700/50 rounded-lg p-6 text-center border border-dashed border-pitch-600">
          <p className="text-sm text-gray-500">
            战术板功能将在下一版本上线
          </p>
          <p className="text-xs text-gray-600 mt-1">
            届时支持绘制点位、球员跑动路线、攻防站位排布
          </p>
        </div>
      </div>
    </div>
  );
}
