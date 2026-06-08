"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search, X, GripVertical, ChevronRight, CheckCircle2,
  XCircle, AlertTriangle, Dumbbell, Save, Calendar,
  Shuffle, MapPin, Edit3,
} from "lucide-react";
import { GymLayout } from "@/components/GymLayout";
import { RosterInjuryCheck } from "@/components/RosterInjuryCheck";
import { notifyChange } from "@/lib/data-events";
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
  { value: "上半身", label: "上半身", group: "上半身" },
  { value: "下半身", label: "下半身", group: "下半身" },
  { value: "全身", label: "全身", group: "全身" },
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
  status: 'pass' | 'warn' | 'fail' | 'skip'; // pass=通过 warn=建议 fail=不推荐 skip=数据不足
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
      { status: "skip", label: "拮抗交替", reason: "至少需要3个动作才能校验" },
      { status: "skip", label: "大肌群优先", reason: "至少需要3个动作才能校验" },
      { status: "skip", label: "复合优先", reason: "至少需要3个动作才能校验" },
      { status: "skip", label: "强度递减", reason: "至少需要3个动作才能校验" },
      { status: "skip", label: "关节分散", reason: "至少需要3个动作才能校验" },
      { status: "skip", label: "伤病规避", reason: injuries.length === 0 ? "未设置伤病信息" : "至少需要3个动作才能校验" },
    ];
  }

  const infos = exerciseIds.map((id) => MUSCLE_GROUPS[id] || null);
  const exercises = exerciseIds.map(
    (id) => EXERCISE_LIBRARY.find((e) => e.id === id)?.name || id,
  );

  // ── Check 1: 拮抗交替 ──
  // Consecutive exercises should not target the same muscle category
  const antagonistIssues: string[] = [];
  for (let i = 0; i < infos.length - 1; i++) {
    const a = infos[i];
    const b = infos[i + 1];
    if (a && b && a.category === b.category) {
      antagonistIssues.push(`#${i + 1} ${exercises[i]} → #${i + 2} ${exercises[i + 1]} 同为${categoryLabel(a.category)}`);
    }
  }
  let antagonistStatus: ValidationResult['status'] = 'pass';
  let antagonistReason = "相邻动作不重复刺激同一肌群，拮抗肌群交替合理";
  if (antagonistIssues.length >= 3) {
    antagonistStatus = 'fail';
    antagonistReason = antagonistIssues.join("; ");
  } else if (antagonistIssues.length >= 1) {
    antagonistStatus = 'warn';
    antagonistReason = antagonistIssues.join("; ");
  }

  // ── Check 2: 大肌群优先 ──
  // Compound exercises should appear before isolation exercises
  const compoundIndices: number[] = [];
  const isolationIndices: number[] = [];
  infos.forEach((info, idx) => {
    if (!info) return;
    if (info.isCompound) compoundIndices.push(idx);
    else isolationIndices.push(idx);
  });
  let bigFirstStatus: ValidationResult['status'] = 'pass';
  let bigFirstReason = "大肌群复合动作优先安排，小肌群孤立动作后置";
  const bigFirstIssues: string[] = [];
  if (compoundIndices.length > 0 && isolationIndices.length > 0) {
    const maxCompoundIdx = Math.max(...compoundIndices);
    isolationIndices.forEach(isoIdx => {
      if (isoIdx < maxCompoundIdx) {
        bigFirstIssues.push(`#${isoIdx + 1} "${exercises[isoIdx]}"（孤立）排在复合动作之前`);
      }
    });
    if (bigFirstIssues.length >= 2) {
      bigFirstStatus = 'fail';
      bigFirstReason = bigFirstIssues.join("; ");
    } else if (bigFirstIssues.length === 1) {
      bigFirstStatus = 'warn';
      bigFirstReason = bigFirstIssues[0];
    }
  }

  // ── Check 3: 复合优先 ──
  // Multi-joint (compound) should come before single-joint (isolation)
  const compoundFirstIssues: string[] = [];
  for (let i = 0; i < infos.length - 1; i++) {
    const a = infos[i];
    const b = infos[i + 1];
    if (a && b && a.isCompound === false && b.isCompound === true) {
      compoundFirstIssues.push(`孤立动作 #${i + 1} "${exercises[i]}" 排在复合动作 #${i + 2} "${exercises[i + 1]}" 之前`);
    }
  }
  let compoundFirstStatus: ValidationResult['status'] = 'pass';
  let compoundFirstReason = "多关节复合动作在前，单关节孤立动作在后";
  if (compoundFirstIssues.length >= 2) {
    compoundFirstStatus = 'fail';
    compoundFirstReason = compoundFirstIssues.join("; ");
  } else if (compoundFirstIssues.length === 1) {
    compoundFirstStatus = 'warn';
    compoundFirstReason = compoundFirstIssues[0];
  }

  // ── Check 4: 强度递减 ──
  // Heavy → Medium → Light order
  const intensityIssues: string[] = [];
  const intensityOrder = { heavy: 3, medium: 2, light: 1 };
  for (let i = 0; i < infos.length - 1; i++) {
    const a = infos[i];
    const b = infos[i + 1];
    if (!a || !b) continue;
    const aInt = intensityOrder[a.intensity];
    const bInt = intensityOrder[b.intensity];
    if (aInt < bInt) {
      intensityIssues.push(
        `#${i + 1} "${exercises[i]}" (${intensityLabel(a.intensity)}) → #${i + 2} "${exercises[i + 1]}" (${intensityLabel(b.intensity)})，强度不递减`,
      );
    }
  }
  let intensityStatus: ValidationResult['status'] = 'pass';
  let intensityReason = "大重量→中等→轻量，强度合理递减";
  if (intensityIssues.length >= 3) {
    intensityStatus = 'fail';
    intensityReason = intensityIssues.join("; ");
  } else if (intensityIssues.length >= 1) {
    intensityStatus = 'warn';
    intensityReason = intensityIssues.join("; ");
  }

  // ── Check 5: 关节分散 ──
  // Check consecutive same-joint exercises
  const jointIssues: string[] = [];
  // Check 2 consecutive same joint
  for (let i = 0; i <= infos.length - 2; i++) {
    const a = infos[i];
    const b = infos[i + 1];
    if (a && b && a.jointStress && b.jointStress &&
        a.jointStress !== 'none' && b.jointStress !== 'none' &&
        a.jointStress === b.jointStress) {
      jointIssues.push(`#${i + 1}-#${i + 2} 连续2个${jointLabel(a.jointStress)}动作: ${exercises[i]}, ${exercises[i + 1]}`);
    }
  }
  // Check 3+ consecutive same joint
  const tripleIssues: string[] = [];
  for (let i = 0; i <= infos.length - 3; i++) {
    const slice = infos.slice(i, i + 3);
    const joints = slice.map(s => s?.jointStress || '');
    const allSame = joints[0] && joints[0] !== 'none' && joints.every(j => j === joints[0]);
    if (allSame) {
      tripleIssues.push(`#${i + 1}-#${i + 3} 连续3个${jointLabel(joints[0])}动作: ${exercises.slice(i, i + 3).join(", ")}`);
    }
  }
  let jointStatus: ValidationResult['status'] = 'pass';
  let jointReason = "关节压力分散合理，无连续同关节负荷";
  if (tripleIssues.length > 0) {
    jointStatus = 'fail';
    jointReason = tripleIssues.join("; ");
  } else if (jointIssues.length > 0) {
    jointStatus = 'warn';
    jointReason = jointIssues.join("; ");
  }

  // ── Check 6: 伤病规避 ──
  // Check against injury list (joint stress keywords from injuries)
  const injuryIssues: string[] = [];
  if (injuries.length > 0) {
    // Map injury body parts / types to joint stresses to avoid
    const injuryJointMap: Record<string, string> = {
      knee: "knee", knee_l: "knee", knee_r: "knee",
      acl: "knee", mcl: "knee", meniscus: "knee",
      shoulder: "shoulder", shoulder_l: "shoulder", shoulder_r: "shoulder",
      rotator_cuff: "shoulder", dislocation: "shoulder",
      hip: "hip", hip_l: "hip", hip_r: "hip",
      groin: "hip", thigh_l: "knee", thigh_r: "knee",
      ankle: "ankle", ankle_l: "ankle", ankle_r: "ankle",
      achilles: "ankle", sprain: "ankle", foot_l: "ankle", foot_r: "ankle",
      back: "spine", spine: "spine", herniated_disc: "spine", waist: "spine",
      hamstring: "knee", shin_l: "ankle", shin_r: "ankle",
      wrist: "shoulder", wrist_l: "shoulder", wrist_r: "shoulder",
      elbow: "shoulder", elbow_l: "shoulder", elbow_r: "shoulder",
    };

    const stressedJoints = new Set<string>();
    injuries.forEach((inj) => {
      // Try direct match first, then substring match
      const mapped = injuryJointMap[inj];
      if (mapped) {
        stressedJoints.add(mapped);
      } else {
        // Fuzzy: check if any key contains this injury or vice versa
        const injLower = inj.toLowerCase();
        for (const [key, joint] of Object.entries(injuryJointMap)) {
          if (injLower.includes(key) || key.includes(injLower)) {
            stressedJoints.add(joint);
          }
        }
      }
    });

    exerciseIds.forEach((id, idx) => {
      const info = MUSCLE_GROUPS[id];
      if (!info) return;
      if (info.jointStress && info.jointStress !== 'none' && stressedJoints.has(info.jointStress)) {
        injuryIssues.push(
          `#${idx + 1} "${exercises[idx]}" 会加压${jointLabel(info.jointStress)}，可能加重伤病`,
        );
      }
    });
  }

  let injuryStatus: ValidationResult['status'] = 'pass';
  let injuryReason: string;
  if (injuries.length === 0) {
    injuryStatus = 'skip';
    injuryReason = "未设置伤病信息（可在花名册或伤报页添加）";
  } else if (injuryIssues.length > 0) {
    injuryStatus = 'fail';
    injuryReason = injuryIssues.join("; ");
  } else {
    injuryReason = "当前方案未触发伤病禁忌关节，可安全执行";
  }

  // Build results
  const results: ValidationResult[] = [
    {
      status: antagonistStatus,
      label: "拮抗交替",
      reason: antagonistReason,
      suggestion: antagonistStatus !== 'pass' ? "将同一肌群动作分散到不同位置，中间插入拮抗肌群动作" : undefined,
    },
    {
      status: bigFirstStatus,
      label: "大肌群优先",
      reason: bigFirstReason,
      suggestion: bigFirstStatus !== 'pass' ? "将复合动作（深蹲、硬拉、卧推等）移至训练前半段" : undefined,
    },
    {
      status: compoundFirstStatus,
      label: "复合优先",
      reason: compoundFirstReason,
      suggestion: compoundFirstStatus !== 'pass' ? "将复合动作提前，孤立动作移至训练末尾" : undefined,
    },
    {
      status: intensityStatus,
      label: "强度递减",
      reason: intensityReason,
      suggestion: intensityStatus !== 'pass' ? "按大重量→中等→轻量的顺序排列动作" : undefined,
    },
    {
      status: jointStatus,
      label: "关节分散",
      reason: jointReason,
      suggestion: jointStatus !== 'pass' ? "在连续同关节动作之间插入其他肌群或核心训练" : undefined,
    },
    {
      status: injuryStatus,
      label: "伤病规避",
      reason: injuryReason,
      suggestion: injuryStatus === 'fail' ? "移除或替换涉及伤病关节的动作" : undefined,
    },
  ];

  // Check for uncategorized exercises
  const uncategorized = exerciseIds.filter((id) => !MUSCLE_GROUPS[id]);
  if (uncategorized.length > 0) {
    const names = uncategorized.map(
      (id) => EXERCISE_LIBRARY.find((e) => e.id === id)?.name || id,
    );
    results.push({
      status: "skip",
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
  // Merge custom exercises from localStorage
  const allExercises = useMemo(() => {
    const builtIn = [...EXERCISE_LIBRARY];
    try {
      const custom = JSON.parse(localStorage.getItem("kenshin_custom_exercises") || "[]");
      custom.forEach((ce: any) => {
        builtIn.push({
          id: ce.id,
          name: ce.name,
          body_part: ce.body_part || "全身",
          equipment: ce.equipment === "悬吊" ? "cable" : ce.equipment === "其他" ? "other" : ce.equipment || "bodyweight",
          type: "力量",
          description: ce.description || "",
          cue_points: ce.cue_points || [],
          progression: ce.progression || "",
          regression: ce.regression || "",
          image_url: ce.image_url || undefined,
        });
      });
    } catch {}
    return builtIn;
  }, []);

  const filtered = useMemo(() => {
    return allExercises.filter((ex) => {
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
          <Dumbbell className="w-4 h-4 text-[#992828]" />
          <span className="text-sm font-bold text-white">动作库</span>
          <span className="text-[10px] text-gray-500 ml-auto">{allExercises.length}个动作</span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索动作名称或ID..."
            className="w-full pl-8 pr-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#992828] transition"
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
                  ? "bg-[#992828] text-white"
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
                  ? "bg-[#992828] text-white"
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
                      ? "bg-[#992828]/10 border border-[#992828]/30 cursor-not-allowed"
                      : "bg-[#121212] border border-transparent hover:border-[#333] hover:bg-[#1a1a1a]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium truncate ${isSelected ? "text-[#992828]" : "text-gray-200"}`}>
                        {ex.name}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-[#992828] shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#992828]/10 text-[#992828] font-medium">
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
  selectedIds, exerciseParams, onUpdateParams,
  onRemoveExercise, onReorder,
}: {
  selectedIds: string[];
  exerciseParams: Record<string, {sets:number,reps:number,rest:number}>;
  onUpdateParams: (id: string, field: string, value: number) => void;
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
          <Shuffle className="w-4 h-4 text-[#992828]" />
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
                  className={`flex items-center gap-3 p-3 rounded-lg bg-[#121212] border transition group ${
                    isDragOver
                      ? "border-[#992828] bg-[#992828]/5"
                      : dragIndex === idx
                        ? "border-[#992828]/50 opacity-50"
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
                    <span className="text-xs font-medium text-white block leading-snug">
                      {ex?.name || id}
                    </span>
                    {/* Editable params */}
                    <div className="flex items-center gap-2.5 mt-1.5 text-[10px] text-gray-500">
                      <input type="number" min={1} max={10}
                        value={exerciseParams[id]?.sets || 3}
                        onChange={e => onUpdateParams(id, "sets", parseInt(e.target.value)||1)}
                        className="w-12 px-1.5 py-1 bg-[#0a0a0a] border border-[#333] rounded text-[11px] text-center text-gray-300 focus:border-[#992828] outline-none"
                        title="组数" /><span>组</span>
                      <input type="number" min={1} max={30}
                        value={exerciseParams[id]?.reps || 8}
                        onChange={e => onUpdateParams(id, "reps", parseInt(e.target.value)||1)}
                        className="w-12 px-1.5 py-1 bg-[#0a0a0a] border border-[#333] rounded text-[11px] text-center text-gray-300 focus:border-[#992828] outline-none"
                        title="次数" /><span>次</span>
                      <input type="number" min={0} max={300}
                        value={exerciseParams[id]?.rest || 90}
                        onChange={e => onUpdateParams(id, "rest", parseInt(e.target.value)||0)}
                        className="w-14 px-1.5 py-1 bg-[#0a0a0a] border border-[#333] rounded text-[11px] text-center text-gray-300 focus:border-[#992828] outline-none"
                        title="间歇(秒)" /><span>s</span>
                    </div>
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
                    className="p-1 text-gray-500 hover:text-[#992828] rounded transition shrink-0"
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

  const passCount = results.filter((r) => r.status === 'pass').length;
  const warnCount = results.filter((r) => r.status === 'warn').length;
  const failCount = results.filter((r) => r.status === 'fail').length;

  const statusLabel = (s: ValidationResult['status']) => {
    switch (s) {
      case 'pass': return '通过';
      case 'warn': return '建议';
      case 'fail': return '不推荐';
      case 'skip': return '待定';
    }
  };
  const statusEmoji = (s: ValidationResult['status']) => {
    switch (s) {
      case 'pass': return '✅';
      case 'warn': return '⚠️';
      case 'fail': return '❌';
      case 'skip': return '—';
    }
  };
  const statusColor = (s: ValidationResult['status']) => {
    switch (s) {
      case 'pass': return { bg: 'bg-green-500/5', border: 'border-green-500/20', text: 'text-green-400', badge: 'bg-green-500/20 text-green-400' };
      case 'warn': return { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' };
      case 'fail': return { bg: 'bg-[#992828]/5', border: 'border-[#992828]/20', text: 'text-[#992828]', badge: 'bg-[#992828]/20 text-[#992828]' };
      case 'skip': return { bg: 'bg-[#222]/50', border: 'border-[#333]', text: 'text-gray-400', badge: 'bg-[#333] text-gray-500' };
    }
  };
  const statusIcon = (s: ValidationResult['status']) => {
    switch (s) {
      case 'pass': return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />;
      case 'fail': return <XCircle className="w-4 h-4 text-[#992828] shrink-0 mt-0.5" />;
      case 'skip': return <AlertTriangle className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />;
    }
  };

  if (selectedIds.length < 3) {
    return (
      <div className="flex flex-col h-full bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden">
        <div className="p-3 border-b border-[#222]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#992828]" />
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
          <AlertTriangle className="w-4 h-4 text-[#992828]" />
          <span className="text-sm font-bold text-white">AI 校验</span>
          <span className="text-[10px] text-gray-500 ml-auto">
            {passCount}通过 {warnCount > 0 ? `/ ${warnCount}建议` : ''} {failCount > 0 ? `/ ${failCount}不推荐` : ''}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {results.map((r, i) => {
          const c = statusColor(r.status);
          return (
          <div
            key={i}
            className={`p-2.5 rounded-lg border text-xs ${c.bg} ${c.border}`}
          >
            <div className="flex items-start gap-2">
              {statusIcon(r.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`font-bold ${c.text}`}>
                    {statusEmoji(r.status)} {r.label}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${c.badge}`}>
                    {statusLabel(r.status)}
                  </span>
                </div>
                <p className={`leading-relaxed ${r.status === 'fail' ? 'text-[#992828]/80' : r.status === 'warn' ? 'text-yellow-400/80' : 'text-gray-400'}`}>
                  {r.reason}
                </p>
                {r.suggestion && (
                  <p className={`mt-1 text-[10px] ${r.status === 'fail' ? 'text-[#992828]/60' : 'text-yellow-400/60'}`}>
                    {r.status === 'fail' ? '建议: ' : '提示: '}{r.suggestion}
                  </p>
                )}
              </div>
            </div>
          </div>
          );
        })}
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
                    ? "bg-[#992828]/20 text-[#992828] border border-[#992828]/30"
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

  // Workout state — restore from localStorage on mount
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("kenshin_gym_draft_ids") || "[]"); } catch { return []; }
  });
  const [exerciseParams, setExerciseParams] = useState<Record<string, {sets:number,reps:number,rest:number}>>(() => {
    try { return JSON.parse(localStorage.getItem("kenshin_gym_draft_params") || "{}"); } catch { return {}; }
  });
  const [workoutName, setWorkoutName] = useState(() => {
    try { return localStorage.getItem("kenshin_gym_draft_name") || ""; } catch { return ""; }
  });

  // Auto-save draft on every change
  useEffect(() => { localStorage.setItem("kenshin_gym_draft_ids", JSON.stringify(selectedIds)); }, [selectedIds]);
  useEffect(() => { localStorage.setItem("kenshin_gym_draft_params", JSON.stringify(exerciseParams)); }, [exerciseParams]);
  useEffect(() => { localStorage.setItem("kenshin_gym_draft_name", workoutName); }, [workoutName]);
  const [phase, setPhase] = useState<string>("preseason");
  const [goal, setGoal] = useState<string>("strength");
  // Read actual injury data from localStorage roster and injury reports
  const injuries = useMemo<string[]>(() => {
    const tags: string[] = [];
    try {
      // 1. Read roster players with injury status
      const rosterRaw = localStorage.getItem('roster_players');
      if (rosterRaw) {
        const roster = JSON.parse(rosterRaw);
        roster.forEach((p: any) => {
          if (p.injuryStatus && p.injuryStatus !== 'healthy') {
            if (p.injuryNote) tags.push(p.injuryNote.toLowerCase());
            if (p.injuryStatus === 'out') tags.push('out');
            if (p.injuryStatus === 'minor') tags.push('minor');
          }
        });
      }
      // 2. Read detailed injury reports
      const reportsRaw = localStorage.getItem('kenshin_injury_reports');
      if (reportsRaw) {
        const reports = JSON.parse(reportsRaw);
        reports.forEach((r: any) => {
          if (r.bodyPart) tags.push(r.bodyPart.toLowerCase());
          if (r.severity && r.severity >= 3) tags.push('severe');
        });
      }
    } catch {}
    return tags;
  }, []);

  // Tabs
  const [activeTab, setActiveTab] = useState<"editor" | "layout">("editor");

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
  const handleUpdateParams = useCallback((id: string, field: string, value: number) => {
    setExerciseParams(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {sets:3,reps:8,rest:90}), [field]: value }
    }));
  }, []);

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
    notifyChange("gym-workout-updated");
    notifyChange("load-data-changed");
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
      <main className="max-w-[90rem] mx-auto px-2 sm:px-4 py-4 pb-24 lg:pb-4">

        {/* Roster Injury Overview */}
        <div className="mb-3">
          <RosterInjuryCheck />
        </div>

        <div className={`flex flex-col lg:flex-row gap-3 ${
          activeTab === "layout"
            ? "h-[400px] lg:h-[350px]"
            : "h-[calc(100vh-140px)]"
        }`}>
          {/* Left Panel: Exercise Library */}
          <div className="w-full lg:w-56 xl:w-64 flex-shrink-0 h-[400px] lg:h-full">
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
              exerciseParams={exerciseParams}
              onUpdateParams={handleUpdateParams}
              onRemoveExercise={handleRemoveExercise}
              onReorder={handleReorder}
            />
          </div>

          {/* Right Panel: AI Validation */}
          <div className="w-full lg:w-56 xl:w-64 flex-shrink-0 h-[400px] lg:h-full">
            <ValidationPanel
              selectedIds={selectedIds}
              injuries={injuries}
            />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-3 flex items-center gap-1 bg-[#1a1a1a] border border-[#222] rounded-xl p-1">
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "editor"
                ? "bg-[#992828] text-white"
                : "text-gray-400 hover:text-white hover:bg-[#222]"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            方案编辑
          </button>
          <button
            onClick={() => setActiveTab("layout")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "layout"
                ? "bg-[#992828] text-white"
                : "text-gray-400 hover:text-white hover:bg-[#222]"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            训练站布局
          </button>
        </div>

        {/* Bottom Content: Editor Controls or Layout */}
        {activeTab === "editor" ? (
          <div className="mt-3 bg-[#1a1a1a] border border-[#222] rounded-xl p-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Workout name */}
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <input
                  type="text"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="方案名称（如：基础力量日）"
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#992828] transition"
                />
              </div>

              {/* Phase + Goal dropdowns */}
              <select value={phase} onChange={e => setPhase(e.target.value)}
                className="bg-[#121212] border border-[#333] rounded-lg px-2 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-[#992828] cursor-pointer">
                {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <select value={goal} onChange={e => setGoal(e.target.value)}
                className="bg-[#121212] border border-[#333] rounded-lg px-2 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-[#992828] cursor-pointer">
                {GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>

              {/* Core actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={handleSaveToLibrary} disabled={selectedIds.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e1e1e] border border-[#333] text-gray-300 text-[10px] rounded-lg hover:bg-[#252525] transition disabled:opacity-50 disabled:cursor-not-allowed">
                  <Save className="w-3 h-3" />保存
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    const d = now.toISOString().split("T")[0];
                    const exs = selectedIds.map(id => EXERCISE_LIBRARY.find(e => e.id === id)?.name || id);
                    const log = {
                      id: "gym_" + Date.now(), date: d, planId: workoutName || "力量方案",
                      scene: "gym", goal, duration: selectedIds.length * 8, matchDay: "",
                      exercises: exs.map(n => ({ name: n, plannedSets: 3, plannedReps: 8, plannedLoad: "", completed: true, actualSets: 3, actualReps: 8, actualRPE: 7 })),
                      summary: { totalExercises: selectedIds.length, completedExercises: selectedIds.length, completionRate: 100, averageRPE: 7, totalVolumeLoad: selectedIds.length * 24 },
                    };
                    const logs = JSON.parse(localStorage.getItem("kenshin_training_logs") || "[]");
                    logs.unshift(log);
                    localStorage.setItem("kenshin_training_logs", JSON.stringify(logs.slice(0, 100)));
                    setSaveMessage("✅ 训练设计完成，已写入训练日志");
                    setTimeout(() => setSaveMessage(null), 3000);
                  }}
                  disabled={selectedIds.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#992828] text-white text-xs font-semibold rounded-lg hover:bg-[#b91c1c] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  完成设计
                </button>
                <button
                  onClick={() => setDayPickerOpen(true)}
                  disabled={selectedIds.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#1e1e1e] border border-[#333] text-gray-300 text-xs font-semibold rounded-lg hover:bg-[#252525] hover:border-[#992828]/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  绑定到训练日历
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <GymLayout selectedIds={selectedIds} />
          </div>
        )}
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
