"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search, X, GripVertical, ChevronRight, CheckCircle2,
  XCircle, AlertTriangle, Dumbbell, Save, Calendar,
  Shuffle,
} from "lucide-react";
import { EXERCISE_LIBRARY } from "@/lib/exercise-data";
import type { ExerciseLibItem, BodyPart, Equipment } from "@/lib/strength-types";
import {
  BODY_PART_LABELS, EQUIPMENT_LABELS,
} from "@/lib/exercise-data";

/* ───────────────────────────────────────────
   Constants
   ─────────────────────────────────────────── */

const LIBRARY_KEY = "kenshin_gym_library";
const CALENDAR_KEY = "kenshin_gym_calendar";

const BODY_PART_FILTERS: { value: BodyPart | "all"; label: string; group: string }[] = [
  { value: "all", label: "全部", group: "" },
  { value: "upper_push", label: "上肢推", group: "上肢" },
  { value: "upper_pull", label: "上肢拉", group: "上肢" },
  { value: "shoulders", label: "肩部", group: "上肢" },
  { value: "chest", label: "胸部", group: "上肢" },
  { value: "arms", label: "手臂", group: "上肢" },
  { value: "back", label: "背部", group: "上肢" },
  { value: "lower", label: "下肢", group: "下肢" },
  { value: "legs", label: "腿部", group: "下肢" },
  { value: "core", label: "核心", group: "核心" },
  { value: "full_body", label: "全身", group: "全身" },
];

const EQUIPMENT_FILTERS: { value: Equipment | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "barbell", label: "杠铃" },
  { value: "dumbbell", label: "哑铃" },
  { value: "cable", label: "绳索" },
  { value: "bodyweight", label: "自重" },
  { value: "machine", label: "器械" },
  { value: "kettlebell", label: "壶铃" },
  { value: "med_ball", label: "药球" },
  { value: "band", label: "弹力带" },
];

const PHASES = [
  { value: "preseason", label: "季前准备" },
  { value: "competition", label: "赛季中" },
  { value: "recovery", label: "恢复期" },
  { value: "offseason", label: "休赛期" },
] as const;

const GOALS = [
  { value: "strength", label: "最大力量" },
  { value: "power", label: "爆发力" },
  { value: "agility", label: "协调灵敏" },
  { value: "mas_endurance", label: "专项耐力" },
] as const;

/* ───────────────────────────────────────────
   Muscle Group Categorization Map
   For the 6 validation checks
   ─────────────────────────────────────────── */

interface MuscleInfo {
  category: "knee_dominant" | "hip_dominant" | "horizontal_push" | "horizontal_pull"
    | "vertical_push" | "vertical_pull" | "core" | "explosive" | "isolation";
  isCompound: boolean;
  intensity: "heavy" | "medium" | "light";
  jointStress?: "knee" | "shoulder" | "hip" | "spine" | "ankle" | "none";
}

const MUSCLE_GROUPS: Record<string, MuscleInfo> = {
  // ── Knee Dominant (compound) ──
  "barbell-back-squat": { category: "knee_dominant", isCompound: true, intensity: "heavy", jointStress: "knee" },
  "front-squat": { category: "knee_dominant", isCompound: true, intensity: "heavy", jointStress: "knee" },
  "goblet-squat": { category: "knee_dominant", isCompound: true, intensity: "medium", jointStress: "knee" },
  "bulgarian-split-squat": { category: "knee_dominant", isCompound: true, intensity: "medium", jointStress: "knee" },
  "split-squat": { category: "knee_dominant", isCompound: true, intensity: "light", jointStress: "knee" },
  "cossack-squat": { category: "knee_dominant", isCompound: true, intensity: "light", jointStress: "knee" },
  "sumo-squat": { category: "knee_dominant", isCompound: true, intensity: "medium", jointStress: "knee" },
  "leg-press": { category: "knee_dominant", isCompound: true, intensity: "medium", jointStress: "knee" },
  "lunge-squat": { category: "knee_dominant", isCompound: true, intensity: "light", jointStress: "knee" },
  "walking-lunge": { category: "knee_dominant", isCompound: true, intensity: "light", jointStress: "knee" },
  "lateral-lunge": { category: "knee_dominant", isCompound: true, intensity: "light", jointStress: "knee" },
  "dumbbell-lunges": { category: "knee_dominant", isCompound: true, intensity: "medium", jointStress: "knee" },
  "kettlebell-goblet-split-squat": { category: "knee_dominant", isCompound: true, intensity: "medium", jointStress: "knee" },
  "barbell-squat-jump": { category: "knee_dominant", isCompound: true, intensity: "medium", jointStress: "knee" },

  // ── Hip Dominant (compound) ──
  "deadlift": { category: "hip_dominant", isCompound: true, intensity: "heavy", jointStress: "hip" },
  "romanian-deadlift": { category: "hip_dominant", isCompound: true, intensity: "medium", jointStress: "hip" },
  "single-leg-rdl": { category: "hip_dominant", isCompound: true, intensity: "medium", jointStress: "hip" },
  "kettlebell-single-leg-rdl": { category: "hip_dominant", isCompound: true, intensity: "medium", jointStress: "hip" },
  "barbell-hip-thrust": { category: "hip_dominant", isCompound: true, intensity: "heavy", jointStress: "hip" },
  "weighted-glute-bridge": { category: "hip_dominant", isCompound: true, intensity: "medium", jointStress: "hip" },
  "single-leg-glute-bridge": { category: "hip_dominant", isCompound: true, intensity: "light", jointStress: "hip" },
  "kneeling-hip-extension": { category: "hip_dominant", isCompound: true, intensity: "light", jointStress: "hip" },
  "rapid-hip-thrust": { category: "hip_dominant", isCompound: true, intensity: "light", jointStress: "hip" },
  "hamstring-glute-bridge": { category: "hip_dominant", isCompound: true, intensity: "light", jointStress: "hip" },

  // ── Horizontal Push (compound) ──
  "bench-press": { category: "horizontal_push", isCompound: true, intensity: "heavy", jointStress: "shoulder" },
  "dumbbell-bench-press": { category: "horizontal_push", isCompound: true, intensity: "medium", jointStress: "shoulder" },
  "push-up": { category: "horizontal_push", isCompound: true, intensity: "light", jointStress: "shoulder" },
  "dynamic-pushup": { category: "horizontal_push", isCompound: true, intensity: "light", jointStress: "shoulder" },
  "wide-pushup": { category: "horizontal_push", isCompound: true, intensity: "light", jointStress: "shoulder" },
  "single-leg-db-bench-press": { category: "horizontal_push", isCompound: true, intensity: "medium", jointStress: "shoulder" },
  "lying-med-ball-chest-push": { category: "horizontal_push", isCompound: true, intensity: "light", jointStress: "shoulder" },

  // ── Horizontal Pull (compound) ──
  "bent-over-row": { category: "horizontal_pull", isCompound: true, intensity: "heavy", jointStress: "shoulder" },
  "cable-row": { category: "horizontal_pull", isCompound: true, intensity: "medium", jointStress: "shoulder" },
  "dumbbell-row": { category: "horizontal_pull", isCompound: true, intensity: "medium", jointStress: "shoulder" },
  "inverted-row": { category: "horizontal_pull", isCompound: true, intensity: "light", jointStress: "shoulder" },
  "trx-row": { category: "horizontal_pull", isCompound: true, intensity: "light", jointStress: "shoulder" },

  // ── Vertical Push (compound) ──
  "overhead-press": { category: "vertical_push", isCompound: true, intensity: "heavy", jointStress: "shoulder" },
  "dumbbell-shoulder-press": { category: "vertical_push", isCompound: true, intensity: "medium", jointStress: "shoulder" },
  "single-arm-kettlebell-press": { category: "vertical_push", isCompound: true, intensity: "medium", jointStress: "shoulder" },

  // ── Vertical Pull (compound) ──
  "pull-up": { category: "vertical_pull", isCompound: true, intensity: "medium", jointStress: "shoulder" },
  "lat-pulldown": { category: "vertical_pull", isCompound: true, intensity: "medium", jointStress: "shoulder" },

  // ── Explosive (compound) ──
  "box-jump": { category: "explosive", isCompound: true, intensity: "light", jointStress: "knee" },
  "squat-to-sprint": { category: "explosive", isCompound: true, intensity: "light", jointStress: "knee" },
  "kettlebell-swing": { category: "explosive", isCompound: true, intensity: "medium", jointStress: "hip" },
  "med-ball-overhead-slam": { category: "explosive", isCompound: true, intensity: "light", jointStress: "shoulder" },

  // ── Isolation (not compound) ──
  "tricep-pushdown": { category: "isolation", isCompound: false, intensity: "light", jointStress: "none" },
  "face-pull": { category: "isolation", isCompound: false, intensity: "light", jointStress: "shoulder" },
  "cable-chest-fly": { category: "isolation", isCompound: false, intensity: "light", jointStress: "shoulder" },
  "nordic-hamstring-curl": { category: "isolation", isCompound: false, intensity: "medium", jointStress: "knee" },
  "seated-calf-raise": { category: "isolation", isCompound: false, intensity: "light", jointStress: "ankle" },
  "standing-calf-raise": { category: "isolation", isCompound: false, intensity: "light", jointStress: "ankle" },
  "rapid-calf-raise": { category: "isolation", isCompound: false, intensity: "light", jointStress: "ankle" },
  "band-face-pull": { category: "isolation", isCompound: false, intensity: "light", jointStress: "shoulder" },
  "pallof-press": { category: "isolation", isCompound: false, intensity: "light", jointStress: "none" },

  // ── Core (not compound) ──
  "plank": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "dead-bug": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "bird-dog": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "copenhagen-plank": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "russian-twist": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "bosu-russian-twist": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "v-up": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "opposite-arm-leg-raise": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "adductor-raise": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "plank-shoulder-tap": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "saw-plank": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "hollow-body-hold": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "side-plank": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "banded-plank-variation": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },
  "sit-up": { category: "core", isCompound: false, intensity: "light", jointStress: "none" },

  // ── Full-body carries (compound) ──
  "farmers-walk": { category: "isolation", isCompound: false, intensity: "medium", jointStress: "none" },
};

/* ───────────────────────────────────────────
   Types
   ─────────────────────────────────────────── */

interface ValidationResult {
  pass: boolean | null; // null = uncategorized/skip
  label: string;
  reason: string;
  suggestion?: string;
}

interface GymWorkout {
  id: string;
  name: string;
  exerciseIds: string[];
  phase: string;
  goal: string;
  createdAt: string;
  updatedAt: string;
}

interface CalendarEntry {
  id: string;
  comboId: string;
  date: string;
  phase: string;
  goal: string;
  exerciseIds: string[];
}

/* ───────────────────────────────────────────
   Helper functions
   ─────────────────────────────────────────── */

function generateId(): string {
  return "gym_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

function loadLibrary(): GymWorkout[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLibrary(items: GymWorkout[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save gym library:", e);
  }
}

function loadCalendar(): CalendarEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CALENDAR_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCalendar(items: CalendarEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save gym calendar:", e);
  }
}

/* ───────────────────────────────────────────
   Validation Engine (6 deterministic checks)
   ─────────────────────────────────────────── */

function runValidation(
  exerciseIds: string[],
  injuries: string[],
): ValidationResult[] {
  if (exerciseIds.length < 3) {
    return [
      {
        pass: null, label: "拮抗交替", reason: "至少需要3个动作才能校验",
      },
      {
        pass: null, label: "大肌群优先", reason: "至少需要3个动作才能校验",
      },
      {
        pass: null, label: "复合优先", reason: "至少需要3个动作才能校验",
      },
      {
        pass: null, label: "强度递减", reason: "至少需要3个动作才能校验",
      },
      {
        pass: null, label: "关节分散", reason: "至少需要3个动作才能校验",
      },
      {
        pass: null, label: "伤病规避", reason: injuries.length === 0 ? "未设置伤病信息" : "至少需要3个动作才能校验",
      },
    ];
  }

  const infos = exerciseIds.map((id) => MUSCLE_GROUPS[id] || null);
  const exercises = exerciseIds.map(
    (id) => EXERCISE_LIBRARY.find((e) => e.id === id)?.name || id,
  );

  // ── Check 1: 拮抗交替 ──
  // Consecutive exercises should not target the same muscle category
  let antagonistPass = true;
  const antagonistIssues: string[] = [];
  for (let i = 0; i < infos.length - 1; i++) {
    const a = infos[i];
    const b = infos[i + 1];
    if (a && b && a.category === b.category) {
      antagonistPass = false;
      antagonistIssues.push(`#${i + 1} ${exercises[i]} → #${i + 2} ${exercises[i + 1]} 同为${categoryLabel(a.category)}`);
    }
  }

  // ── Check 2: 大肌群优先 ──
  // Compound exercises should appear before isolation exercises
  let bigFirstPass = true;
  const compoundIndices: number[] = [];
  const isolationIndices: number[] = [];
  infos.forEach((info, idx) => {
    if (!info) return;
    if (info.isCompound) compoundIndices.push(idx);
    else isolationIndices.push(idx);
  });
  if (compoundIndices.length > 0 && isolationIndices.length > 0) {
    const maxCompoundIdx = Math.max(...compoundIndices);
    const minIsolationIdx = Math.min(...isolationIndices);
    if (maxCompoundIdx > minIsolationIdx) {
      bigFirstPass = false;
    }
  }

  // ── Check 3: 复合优先 ──
  // Multi-joint (compound) should come before single-joint (isolation)
  // This is similar to check 2 but with more granularity
  let compoundFirstPass = true;
  const compoundFirstIssues: string[] = [];
  for (let i = 0; i < infos.length - 1; i++) {
    const a = infos[i];
    const b = infos[i + 1];
    if (a && b && a.isCompound === false && b.isCompound === true) {
      compoundFirstPass = false;
      compoundFirstIssues.push(`孤立动作 #${i + 1} "${exercises[i]}" 排在复合动作 #${i + 2} "${exercises[i + 1]}" 之前`);
    }
  }
  // Also check if uncategorized exercises are mixed (skip)

  // ── Check 4: 强度递减 ──
  // Heavy → Medium → Light order
  let intensityPass = true;
  const intensityIssues: string[] = [];
  const intensityOrder = { heavy: 3, medium: 2, light: 1 };
  for (let i = 0; i < infos.length - 1; i++) {
    const a = infos[i];
    const b = infos[i + 1];
    if (!a || !b) continue;
    const aInt = intensityOrder[a.intensity];
    const bInt = intensityOrder[b.intensity];
    if (aInt < bInt) {
      intensityPass = false;
      intensityIssues.push(
        `#${i + 1} "${exercises[i]}" (${intensityLabel(a.intensity)}) → #${i + 2} "${exercises[i + 1]}" (${intensityLabel(b.intensity)})，强度不递减`,
      );
    }
  }

  // ── Check 5: 关节分散 ──
  // No 3 consecutive knee-dominant or shoulder-dominant exercises
  let jointPass = true;
  const jointIssues: string[] = [];
  for (let i = 0; i <= infos.length - 3; i++) {
    const slice = infos.slice(i, i + 3);
    const allKnee = slice.every((info) => info?.jointStress === "knee");
    const allShoulder = slice.every((info) => info?.jointStress === "shoulder");
    if (allKnee) {
      jointPass = false;
      jointIssues.push(`#${i + 1}-#${i + 3} 连续3个膝关节主导动作: ${exercises.slice(i, i + 3).join(", ")}`);
    }
    if (allShoulder) {
      jointPass = false;
      jointIssues.push(`#${i + 1}-#${i + 3} 连续3个肩关节主导动作: ${exercises.slice(i, i + 3).join(", ")}`);
    }
  }

  // ── Check 6: 伤病规避 ──
  // Check against injury list
  let injuryPass = true;
  const injuryIssues: string[] = [];
  if (injuries.length > 0) {
    // Map injury types to joint stresses to avoid
    const injuryJointMap: Record<string, string> = {
      knee: "knee",
      acl: "knee",
      mcl: "knee",
      meniscus: "knee",
      shoulder: "shoulder",
      rotator_cuff: "shoulder",
      dislocation: "shoulder",
      hip: "hip",
      groin: "hip",
      ankle: "ankle",
      achilles: "ankle",
      sprain: "ankle",
      back: "spine",
      spine: "spine",
      herniated_disc: "spine",
      waist: "spine",
      hamstring: "knee",
      wrist: "shoulder",
      elbow: "shoulder",
    };

    const stressedJoints = injuries
      .map((inj) => injuryJointMap[inj] || null)
      .filter((j): j is string => j !== null);

    exerciseIds.forEach((id, idx) => {
      const info = MUSCLE_GROUPS[id];
      if (!info) return;
      if (info.jointStress && stressedJoints.includes(info.jointStress)) {
        injuryPass = false;
        injuryIssues.push(
          `#${idx + 1} "${exercises[idx]}" 会加压${jointLabel(info.jointStress)}，可能影响伤病`,
        );
      }
    });
  }

  // Build results
  const results: ValidationResult[] = [
    {
      pass: antagonistPass,
      label: "拮抗交替",
      reason: antagonistPass
        ? "相邻动作不重复刺激同一肌群，拮抗肌群交替合理"
        : antagonistIssues.join("; "),
      suggestion: antagonistPass ? undefined : "将同一肌群动作分散到不同位置，中间插入拮抗肌群动作",
    },
    {
      pass: bigFirstPass,
      label: "大肌群优先",
      reason: bigFirstPass
        ? "大肌群复合动作优先安排，小肌群孤立动作后置"
        : "孤立动作出现在复合动作之前，应调整顺序",
      suggestion: bigFirstPass ? undefined : "将复合动作（深蹲、硬拉、卧推等）移至训练前半段",
    },
    {
      pass: compoundFirstPass,
      label: "复合优先",
      reason: compoundFirstPass
        ? "多关节复合动作在前，单关节孤立动作在后"
        : compoundFirstIssues.join("; "),
      suggestion: compoundFirstPass ? undefined : "将复合动作提前，孤立动作移至训练末尾",
    },
    {
      pass: intensityPass,
      label: "强度递减",
      reason: intensityPass
        ? "大重量→中等→轻量，强度合理递减"
        : intensityIssues.join("; "),
      suggestion: intensityPass ? undefined : "按大重量→中等→轻量的顺序排列动作",
    },
    {
      pass: jointPass,
      label: "关节分散",
      reason: jointPass
        ? "没有连续3个同关节主导动作，关节压力分散"
        : jointIssues.join("; "),
      suggestion: jointPass ? undefined : "在连续同关节动作之间插入其他肌群或核心训练",
    },
    {
      pass: injuryPass,
      label: "伤病规避",
      reason: injuries.length === 0
        ? "未设置伤病信息（可在设置页添加）"
        : injuryPass
          ? "当前方案未触发伤病禁忌关节"
          : injuryIssues.join("; "),
      suggestion: !injuryPass ? "移除或替换涉及伤病关节的动作" : undefined,
    },
  ];

  // Check for uncategorized exercises
  const uncategorized = exerciseIds.filter((id) => !MUSCLE_GROUPS[id]);
  if (uncategorized.length > 0) {
    const names = uncategorized.map(
      (id) => EXERCISE_LIBRARY.find((e) => e.id === id)?.name || id,
    );
    results.push({
      pass: null,
      label: "未分类动作",
      reason: `${names.join(", ")} 未在分类库中，相关检查可能不完整`,
    });
  }

  return results;
}

function categoryLabel(c: string): string {
  const map: Record<string, string> = {
    knee_dominant: "膝主导",
    hip_dominant: "髋主导",
    horizontal_push: "水平推",
    horizontal_pull: "水平拉",
    vertical_push: "垂直推",
    vertical_pull: "垂直拉",
    core: "核心",
    explosive: "爆发力",
    isolation: "孤立动作",
  };
  return map[c] || c;
}

function intensityLabel(i: string): string {
  const map: Record<string, string> = {
    heavy: "大重量",
    medium: "中等",
    light: "轻量",
  };
  return map[i] || i;
}

function jointLabel(j: string): string {
  const map: Record<string, string> = {
    knee: "膝关节",
    shoulder: "肩关节",
    hip: "髋关节",
    spine: "脊柱",
    ankle: "踝关节",
    none: "",
  };
  return map[j] || j;
}

/* ───────────────────────────────────────────
   Sub-components
   ─────────────────────────────────────────── */

/** Left Panel: Exercise Library */
function ExerciseLibraryPanel({
  searchQuery,
  setSearchQuery,
  bodyPartFilter,
  setBodyPartFilter,
  equipmentFilter,
  setEquipmentFilter,
  selectedIds,
  onAddExercise,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  bodyPartFilter: BodyPart | "all";
  setBodyPartFilter: (v: BodyPart | "all") => void;
  equipmentFilter: Equipment | "all";
  setEquipmentFilter: (v: Equipment | "all") => void;
  selectedIds: string[];
  onAddExercise: (id: string) => void;
}) {
  const filtered = useMemo(() => {
    return EXERCISE_LIBRARY.filter((ex) => {
      if (bodyPartFilter !== "all" && ex.body_part !== bodyPartFilter) return false;
      if (equipmentFilter !== "all" && ex.equipment !== equipmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ex.name.toLowerCase().includes(q) ||
          ex.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bodyPartFilter, equipmentFilter, searchQuery]);

  const selectedSet = new Set(selectedIds);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden">
      {/* Panel header */}
      <div className="p-3 border-b border-[#222]">
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell className="w-4 h-4 text-[#d92525]" />
          <span className="text-sm font-bold text-white">动作库</span>
          <span className="text-[10px] text-gray-500 ml-auto">{EXERCISE_LIBRARY.length}个动作</span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索动作名称或ID..."
            className="w-full pl-8 pr-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d92525] transition"
          />
        </div>
      </div>

      {/* Quick filters */}
      <div className="p-2 border-b border-[#222] space-y-2">
        {/* Body part */}
        <div className="flex flex-wrap gap-1">
          {BODY_PART_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setBodyPartFilter(f.value)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                bodyPartFilter === f.value
                  ? "bg-[#d92525] text-white"
                  : "bg-[#121212] text-gray-400 hover:text-white hover:bg-[#252525]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {/* Equipment */}
        <div className="flex flex-wrap gap-1">
          {EQUIPMENT_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setEquipmentFilter(f.value)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                equipmentFilter === f.value
                  ? "bg-[#d92525] text-white"
                  : "bg-[#222] text-gray-400 hover:text-white hover:bg-[#252525]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">没有匹配的动作</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((ex) => {
              const isSelected = selectedSet.has(ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() => onAddExercise(ex.id)}
                  disabled={isSelected}
                  className={`flex items-center gap-2 p-2 rounded-lg text-left transition group ${
                    isSelected
                      ? "bg-[#d92525]/10 border border-[#d92525]/30 cursor-not-allowed"
                      : "bg-[#121212] border border-transparent hover:border-[#333] hover:bg-[#1a1a1a]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium truncate ${isSelected ? "text-[#d92525]" : "text-gray-200"}`}>
                        {ex.name}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-[#d92525] shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#d92525]/10 text-[#d92525] font-medium">
                        {BODY_PART_LABELS[ex.body_part] || ex.body_part}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-gray-400 font-medium">
                        {EQUIPMENT_LABELS[ex.equipment] || ex.equipment}
                      </span>
                    </div>
                  </div>
                  {!isSelected && (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-300 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Center Panel: Current Workout */
function WorkoutPanel({
  selectedIds,
  onRemoveExercise,
  onReorder,
}: {
  selectedIds: string[];
  onRemoveExercise: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    // Make drag image semi-transparent
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDragIndex(null);
    setDragOverIndex(null);
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== dropIndex) {
      onReorder(dragIndex, dropIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Move up/down buttons
  const moveUp = (index: number) => {
    if (index > 0) onReorder(index, index - 1);
  };
  const moveDown = (index: number) => {
    if (index < selectedIds.length - 1) onReorder(index, index + 1);
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden">
      <div className="p-3 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-[#d92525]" />
          <span className="text-sm font-bold text-white">当前训练方案</span>
          <span className="text-[10px] text-gray-500 ml-auto">{selectedIds.length}个动作</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {selectedIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Dumbbell className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">从左侧动作库点击添加动作</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {selectedIds.map((id, idx) => {
              const ex = EXERCISE_LIBRARY.find((e) => e.id === id);
              const isDragOver = dragOverIndex === idx;

              return (
                <div
                  key={id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`flex items-center gap-2 p-2 rounded-lg bg-[#121212] border transition group ${
                    isDragOver
                      ? "border-[#d92525] bg-[#d92525]/5"
                      : dragIndex === idx
                        ? "border-[#d92525]/50 opacity-50"
                        : "border-[#222] hover:border-[#333]"
                  }`}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-300 shrink-0">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Order number */}
                  <span className="text-[10px] text-gray-500 font-mono w-5 text-center shrink-0">
                    {idx + 1}
                  </span>

                  {/* Exercise info */}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-white truncate block">
                      {ex?.name || id}
                    </span>
                    {ex && (
                      <span className="text-[9px] text-gray-500">
                        {BODY_PART_LABELS[ex.body_part] || ex.body_part}
                      </span>
                    )}
                  </div>

                  {/* Move buttons */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
                      title="上移"
                    >
                      <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === selectedIds.length - 1}
                      className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
                      title="下移"
                    >
                      <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                    </button>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => onRemoveExercise(id)}
                    className="p-1 text-gray-500 hover:text-[#d92525] rounded transition shrink-0"
                    title="移除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Right Panel: AI Validation */
function ValidationPanel({
  selectedIds,
  injuries,
}: {
  selectedIds: string[];
  injuries: string[];
}) {
  const results = useMemo(
    () => runValidation(selectedIds, injuries),
    [selectedIds, injuries],
  );

  const passCount = results.filter((r) => r.pass === true).length;
  const failCount = results.filter((r) => r.pass === false).length;

  if (selectedIds.length < 3) {
    return (
      <div className="flex flex-col h-full bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden">
        <div className="p-3 border-b border-[#222]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#d92525]" />
            <span className="text-sm font-bold text-white">AI 校验</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-gray-500 text-center">
            添加至少3个动作用启用校验<br />
            <span className="text-[10px]">当前已选 {selectedIds.length} 个</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden">
      <div className="p-3 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#d92525]" />
          <span className="text-sm font-bold text-white">AI 校验</span>
          <span className="text-[10px] text-gray-500 ml-auto">
            {passCount}通过 / {failCount}未通过
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {results.map((r, i) => (
          <div
            key={i}
            className={`p-2.5 rounded-lg border text-xs ${
              r.pass === true
                ? "bg-green-500/5 border-green-500/20"
                : r.pass === false
                  ? "bg-[#d92525]/5 border-[#d92525]/20"
                  : "bg-[#222]/50 border-[#333]"
            }`}
          >
            <div className="flex items-start gap-2">
              {r.pass === true ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              ) : r.pass === false ? (
                <XCircle className="w-4 h-4 text-[#d92525] shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`font-bold ${
                      r.pass === true
                        ? "text-green-400"
                        : r.pass === false
                          ? "text-[#d92525]"
                          : "text-gray-400"
                    }`}
                  >
                    {r.label}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      r.pass === true
                        ? "bg-green-500/20 text-green-400"
                        : r.pass === false
                          ? "bg-[#d92525]/20 text-[#d92525]"
                          : "bg-[#333] text-gray-500"
                    }`}
                  >
                    {r.pass === true ? "通过" : r.pass === false ? "未通过" : "待定"}
                  </span>
                </div>
                <p className={`leading-relaxed ${r.pass === false ? "text-[#d92525]/80" : "text-gray-400"}`}>
                  {r.reason}
                </p>
                {r.suggestion && (
                  <p className="mt-1 text-[10px] text-[#d92525]/60">
                    建议: {r.suggestion}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Day Picker Modal */
function DayPickerModal({
  isOpen,
  onClose,
  onSelectDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4 w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <button onClick={handlePrevMonth} className="p-1 text-gray-400 hover:text-white rounded">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <span className="text-sm font-bold text-white">
            {year}年{month + 1}月
          </span>
          <button onClick={handleNextMonth} className="p-1 text-gray-400 hover:text-white rounded">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
            <span key={d} className="text-[10px] text-gray-500 text-center">{d}</span>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            return (
              <button
                key={day}
                onClick={() => onSelectDate(dateStr)}
                className={`p-2 text-xs rounded-lg transition font-medium ${
                  isToday
                    ? "bg-[#d92525]/20 text-[#d92525] border border-[#d92525]/30"
                    : "text-gray-300 hover:bg-[#252525] hover:text-white"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-[#252525] transition"
        >
          取消
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Main Page
   ─────────────────────────────────────────── */

export function GymDesigner() {

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [bodyPartFilter, setBodyPartFilter] = useState<BodyPart | "all">("all");
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | "all">("all");

  // Workout state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [workoutName, setWorkoutName] = useState("");
  const [phase, setPhase] = useState<string>("preseason");
  const [goal, setGoal] = useState<string>("strength");
  const [injuries] = useState<string[]>([]);

  // Modals
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Add exercise from library
  const handleAddExercise = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  // Remove exercise from workout
  const handleRemoveExercise = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  // Reorder exercises
  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  // Save to library
  const handleSaveToLibrary = useCallback(() => {
    if (selectedIds.length === 0) {
      setSaveMessage("请先添加动作");
      setTimeout(() => setSaveMessage(null), 2000);
      return;
    }

    const workout: GymWorkout = {
      id: generateId(),
      name: workoutName.trim() || `力量方案 ${new Date().toLocaleDateString("zh-CN")}`,
      exerciseIds: selectedIds,
      phase,
      goal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const library = loadLibrary();
    library.unshift(workout);
    saveLibrary(library);

    setSaveMessage("已保存到资料库");
    setTimeout(() => setSaveMessage(null), 2000);

    // Dispatch event for library refresh
    window.dispatchEvent(new Event("gym-library-refresh"));
  }, [selectedIds, workoutName, phase, goal]);

  // Bind to calendar
  const handleBindToCalendar = useCallback(
    (date: string) => {
      if (selectedIds.length === 0) return;

      // Save current workout to library first
      const workoutId = generateId();
      const workout: GymWorkout = {
        id: workoutId,
        name: workoutName.trim() || `力量方案 ${new Date().toLocaleDateString("zh-CN")}`,
        exerciseIds: selectedIds,
        phase,
        goal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const library = loadLibrary();
      library.unshift(workout);
      saveLibrary(library);

      // Save to calendar
      const entry: CalendarEntry = {
        id: generateId(),
        comboId: workoutId,
        date,
        phase,
        goal,
        exerciseIds: selectedIds,
      };

      const calendar = loadCalendar();
      calendar.push(entry);
      saveCalendar(calendar);

      setDayPickerOpen(false);
      setSaveMessage(`已绑定到 ${date}`);
      setTimeout(() => setSaveMessage(null), 3000);
      window.dispatchEvent(new Event("gym-library-refresh"));
    },
    [selectedIds, workoutName, phase, goal],
  );

  return (
    <div className="bg-[#121212]">
      {/* Save message toast */}
      {saveMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-xs text-green-400 font-medium animate-pulse">
          {saveMessage}
        </div>
      )}

      {/* Main content: 3-panel layout */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 pb-24 lg:pb-4">
        <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-140px)]">
          {/* Left Panel: Exercise Library */}
          <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 h-[400px] lg:h-full">
            <ExerciseLibraryPanel
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              bodyPartFilter={bodyPartFilter}
              setBodyPartFilter={setBodyPartFilter}
              equipmentFilter={equipmentFilter}
              setEquipmentFilter={setEquipmentFilter}
              selectedIds={selectedIds}
              onAddExercise={handleAddExercise}
            />
          </div>

          {/* Center Panel: Current Workout */}
          <div className="flex-1 min-w-0 h-[400px] lg:h-full">
            <WorkoutPanel
              selectedIds={selectedIds}
              onRemoveExercise={handleRemoveExercise}
              onReorder={handleReorder}
            />
          </div>

          {/* Right Panel: AI Validation */}
          <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 h-[400px] lg:h-full">
            <ValidationPanel
              selectedIds={selectedIds}
              injuries={injuries}
            />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-3 bg-[#1a1a1a] border border-[#222] rounded-xl p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Workout name */}
            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <input
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="方案名称（如：基础力量日）"
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d92525] transition"
              />
            </div>

            {/* Phase selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-gray-500">周期:</span>
              <div className="flex bg-[#121212] rounded-lg p-0.5">
                {PHASES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPhase(p.value)}
                    className={`px-2.5 py-1.5 rounded-md text-[10px] font-medium transition ${
                      phase === p.value
                        ? "bg-[#d92525] text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-gray-500">目标:</span>
              <div className="flex bg-[#121212] rounded-lg p-0.5">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGoal(g.value)}
                    className={`px-2.5 py-1.5 rounded-md text-[10px] font-medium transition ${
                      goal === g.value
                        ? "bg-[#d92525] text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSaveToLibrary}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#d92525] text-white text-xs font-semibold rounded-lg hover:bg-[#b91c1c] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                保存到资料库
              </button>
              <button
                onClick={() => setDayPickerOpen(true)}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1e1e1e] border border-[#333] text-gray-300 text-xs font-semibold rounded-lg hover:bg-[#252525] hover:border-[#d92525]/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calendar className="w-3.5 h-3.5" />
                绑定到训练日历
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Day Picker Modal */}
      <DayPickerModal
        isOpen={dayPickerOpen}
        onClose={() => setDayPickerOpen(false)}
        onSelectDate={handleBindToCalendar}
      />
    </div>
  );
}
