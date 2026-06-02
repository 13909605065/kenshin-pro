"use client";

import { InjurySite } from "@/lib/types";
import { INJURY_SITE_OPTIONS } from "@/lib/constants";

interface Props {
  selected: InjurySite[];
  onToggle: (site: InjurySite) => void;
  injuryHistory: string;
  onHistoryChange: (val: string) => void;
}

export function InjuryStep({ selected, onToggle, injuryHistory, onHistoryChange }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">伤病情况</h2>
      <p className="text-gray-400 text-sm">选择需要康复的部位（无伤病可跳过）</p>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {INJURY_SITE_OPTIONS.map((site) => (
          <button
            key={site.value}
            onClick={() => onToggle(site.value)}
            className={`p-4 rounded-xl border transition-all text-center ${
              selected.includes(site.value)
                ? "border-neon-red bg-neon-red/10 text-neon-red"
                : "border-pitch-600 text-gray-400 hover:border-pitch-500"
            }`}
          >
            <div className="text-lg font-bold">{site.region}</div>
            <div className="text-xs mt-1">{site.label}</div>
          </button>
        ))}
      </div>

      {/* Injury History */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">伤病史补充（选填）</label>
        <textarea
          value={injuryHistory}
          onChange={(e) => onHistoryChange(e.target.value)}
          placeholder="详细描述伤病时间和情况..."
          maxLength={500}
          rows={2}
          className="input-field resize-none"
        />
      </div>

      <div className="text-center">
        <p className="text-gray-500 text-sm">
          跳过此步，直接点击下方「生成训练方案」
        </p>
      </div>
    </div>
  );
}
