"use client";

import { BodyPart, Equipment } from "@/lib/strength-types";
import { BODY_PART_LABELS, EQUIPMENT_LABELS } from "@/lib/exercise-data";

interface Props {
  bodyPart: BodyPart | "all";
  equipment: Equipment | "all";
  footballCategory?: "all" | "爆发力" | "灵敏" | "速度" | "力量" | "耐力";
  exerciseType?: "all" | "力量" | "热身" | "冷身" | "技术";
  onBodyPartChange: (v: BodyPart | "all") => void;
  onEquipmentChange: (v: Equipment | "all") => void;
  onFootballCategoryChange?: (v: "all" | "爆发力" | "灵敏" | "速度" | "力量" | "耐力") => void;
  onExerciseTypeChange?: (v: "all" | "力量" | "热身" | "冷身" | "技术") => void;
}

const BODY_OPTIONS: { value: BodyPart | "all"; label: string }[] = [
  { value: "all", label: "全部部位" },
  ...Object.entries(BODY_PART_LABELS).map(([k, v]) => ({ value: k as BodyPart, label: v })),
];

const EQUIP_OPTIONS: { value: Equipment | "all"; label: string }[] = [
  { value: "all", label: "全部器械" },
  ...Object.entries(EQUIPMENT_LABELS).map(([k, v]) => ({ value: k as Equipment, label: v })),
];

const FOOTBALL_OPTIONS: { value: "all" | "爆发力" | "灵敏" | "速度" | "力量" | "耐力"; label: string }[] = [
  { value: "all", label: "全部专项" },
  { value: "爆发力", label: "⚡ 爆发力" },
  { value: "灵敏", label: "🔄 灵敏" },
  { value: "速度", label: "🏃 速度" },
  { value: "力量", label: "💪 力量" },
  { value: "耐力", label: "🫁 耐力" },
];

export function FilterBar({
  bodyPart,
  equipment,
  footballCategory,
  exerciseType,
  onBodyPartChange,
  onEquipmentChange,
  onFootballCategoryChange,
  onExerciseTypeChange,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Card 1: Body Part */}
      <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-3">
        <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wider">身体分区 Body Part</p>
        <div className="flex flex-wrap gap-1.5">
          {BODY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onBodyPartChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                bodyPart === opt.value
                  ? "bg-[#d92525] text-white"
                  : "text-gray-400 hover:text-white hover:bg-[#222]"
              }`}
            >
              {opt.value === "all" ? "全部" : opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card 2: Equipment */}
      <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-3">
        <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wider">器械 Equipment</p>
        <div className="flex flex-wrap gap-1.5">
          {EQUIP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onEquipmentChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                equipment === opt.value
                  ? "bg-[#d92525] text-white"
                  : "text-gray-400 hover:text-white hover:bg-[#222]"
              }`}
            >
              {opt.value === "all" ? "全部" : opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card 3: Football-Specific (NEW) */}
      {onFootballCategoryChange && (
        <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-3">
          <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wider">
            <span className="mr-1">⚽</span>足球专项 Football-Specific
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FOOTBALL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onFootballCategoryChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                  footballCategory === opt.value
                    ? "bg-[#d92525] text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#222]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card 4: Exercise Type */}
      {onExerciseTypeChange && (
        <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-3">
          <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wider">类型 Type</p>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "力量", "热身", "冷身", "技术"] as const).map((t) => (
              <button
                key={t}
                onClick={() => onExerciseTypeChange(t)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                  exerciseType === t
                    ? "bg-[#d92525] text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#222]"
                }`}
              >
                {t === "all" ? "全部" : t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
