"use client";

import { BodyPart, Equipment } from "@/lib/strength-types";
import { BODY_PART_LABELS, EQUIPMENT_LABELS } from "@/lib/exercise-data";

interface Props {
  bodyPart: BodyPart | "all";
  equipment: Equipment | "all";
  onBodyPartChange: (v: BodyPart | "all") => void;
  onEquipmentChange: (v: Equipment | "all") => void;
}

const BODY_OPTIONS: { value: BodyPart | "all"; label: string }[] = [
  { value: "all", label: "全部部位" },
  ...Object.entries(BODY_PART_LABELS).map(([k, v]) => ({ value: k as BodyPart, label: v })),
];

const EQUIP_OPTIONS: { value: Equipment | "all"; label: string }[] = [
  { value: "all", label: "全部器械" },
  ...Object.entries(EQUIPMENT_LABELS).map(([k, v]) => ({ value: k as Equipment, label: v })),
];

export function FilterBar({ bodyPart, equipment, onBodyPartChange, onEquipmentChange }: Props) {
  return (
    <div className="flex gap-3 flex-wrap">
      <select
        value={bodyPart}
        onChange={(e) => onBodyPartChange(e.target.value as BodyPart | "all")}
        className="input-field text-sm py-2 w-auto min-w-[140px]"
      >
        {BODY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-pitch-800">
            {opt.label}
          </option>
        ))}
      </select>
      <select
        value={equipment}
        onChange={(e) => onEquipmentChange(e.target.value as Equipment | "all")}
        className="input-field text-sm py-2 w-auto min-w-[140px]"
      >
        {EQUIP_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-pitch-800">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
