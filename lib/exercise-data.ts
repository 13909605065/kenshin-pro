import { ExerciseLibItem, StrengthTemplate, BodyPart, Equipment } from "./strength-types";
import { STRENGTH_LIBRARY } from "./training-library";

// ====== Label Maps ======

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  上半身: "上半身",
  下半身: "下半身",
  全身: "全身",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "杠铃",
  dumbbell: "哑铃",
  cable: "绳索",
  bodyweight: "自重",
  machine: "器械",
  kettlebell: "壶铃",
  med_ball: "药球",
  band: "弹力带",
  bosu: "波速球",
  跳箱: "跳箱",
  other: "其他",
};

// ====== Equipment mapping: Chinese → English keys ======
const EQUIP_MAP: Record<string, Equipment> = {
  "杠铃": "barbell", "哑铃": "dumbbell", "壶铃": "kettlebell",
  "悬吊": "cable", "自重": "bodyweight", "弹力带": "band",
  "药球": "med_ball", "波速球": "bosu", "跳箱": "跳箱",
};

// ====== Auto-generated from STRENGTH_LIBRARY (single source of truth) ======
export const EXERCISE_LIBRARY: ExerciseLibItem[] = Object.entries(STRENGTH_LIBRARY).map(([id, ex]) => ({
  id,
  name: ex.name,
  body_part: (ex.bodyPart || "全身") as BodyPart,
  equipment: EQUIP_MAP[ex.equipment || ""] || "bodyweight",
  type: ex.exerciseType || "力量",
  description: "",
  cue_points: ex.cue_points || [],
  progression: ex.progression || "",
  regression: ex.regression || "",
}));

// ====== Strength Templates ======
export const STRENGTH_TEMPLATES: StrengthTemplate[] = [];
