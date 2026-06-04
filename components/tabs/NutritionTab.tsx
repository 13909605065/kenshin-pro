"use client";

import { TrainingModule } from "@/lib/types";

interface Props {
  modules: TrainingModule[];
}

export function NutritionTab({ modules }: Props) {
  const posModule = modules.find((m) => m.module === "position_training");

  if (!posModule || posModule.module !== "position_training") {
    return <p className="text-sm text-gray-500 py-8 text-center">暂无饮食与恢复内容</p>;
  }

  const nutrition = posModule.nutrition;
  const cooldown = posModule.cooldown || [];

  return (
    <div className="space-y-4">
      {/* Nutrition */}
      {nutrition && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">🥗 饮食搭配</h4>
          <div className="bg-[#1e1e1e]/50 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-[#d92525] text-xs font-bold">训练前：</span>
              <p className="text-sm text-gray-300 mt-1">{nutrition.pre_training}</p>
            </div>
            <div>
              <span className="text-[#d92525] text-xs font-bold">训练后：</span>
              <p className="text-sm text-gray-300 mt-1">{nutrition.post_training}</p>
            </div>
            <div>
              <span className="text-[#d92525] text-xs font-bold">日常饮食：</span>
              <p className="text-sm text-gray-300 mt-1">{nutrition.daily_plan}</p>
            </div>
            <div>
              <span className="text-[#d92525] text-xs font-bold">补水：</span>
              <p className="text-sm text-gray-300 mt-1">{nutrition.hydration}</p>
            </div>
            <div>
              <span className="text-[#d92525] text-xs font-bold">补剂建议：</span>
              <p className="text-sm text-gray-300 mt-1">{nutrition.supplements}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cool Down */}
      {cooldown.length > 0 && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">🧊 整理活动</h4>
          <div className="space-y-2">
            {cooldown.map((c, i) => (
              <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="font-medium text-white">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.duration}秒</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!nutrition && cooldown.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">暂无饮食与恢复内容</p>
      )}
    </div>
  );
}
