"use client";

import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type CustomBodyPart = "下肢" | "上肢推" | "上肢拉" | "核心" | "全身";
export type CustomEquipment = "杠铃" | "哑铃" | "壶铃" | "自重" | "弹力带" | "药球" | "波速球" | "其他";
export type CustomDifficulty = "初级" | "中级" | "高级";

export interface CustomExercise {
  id: string; // "custom-{timestamp}"
  name: string;
  body_part: CustomBodyPart;
  equipment: CustomEquipment;
  difficulty: CustomDifficulty;
  description: string;
  sets_min?: number;
  sets_max?: number;
  reps_min?: number;
  reps_max?: number;
  rest_min?: number;
  rest_max?: number;
  cue_points: string[];
  progression: string;
  regression: string;
  image_url?: string;
}

const STORAGE_KEY = "kenshin_custom_exercises";
const MAX_EXERCISES = 50;

// ═══════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════

export function useCustomExercises() {
  const [exercises, setExercises] = useState<CustomExercise[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setExercises(parsed);
        }
      }
    } catch (e) {
      console.error("读取自定义动作失败:", e);
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage on change
  const persist = useCallback((list: CustomExercise[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("保存自定义动作失败:", e);
    }
  }, []);

  const addExercise = useCallback(
    (ex: Omit<CustomExercise, "id">): CustomExercise | null => {
      if (exercises.length >= MAX_EXERCISES) {
        alert(`最多只能添加 ${MAX_EXERCISES} 个自定义动作`);
        return null;
      }
      const newEx: CustomExercise = {
        ...ex,
        id: `custom-${Date.now()}`,
      };
      const updated = [...exercises, newEx];
      setExercises(updated);
      persist(updated);
      return newEx;
    },
    [exercises, persist]
  );

  const updateExercise = useCallback(
    (id: string, updates: Partial<CustomExercise>): boolean => {
      const idx = exercises.findIndex((e) => e.id === id);
      if (idx === -1) return false;
      const updated = [...exercises];
      updated[idx] = { ...updated[idx], ...updates };
      setExercises(updated);
      persist(updated);
      return true;
    },
    [exercises, persist]
  );

  const deleteExercise = useCallback(
    (id: string): boolean => {
      const updated = exercises.filter((e) => e.id !== id);
      if (updated.length === exercises.length) return false;
      setExercises(updated);
      persist(updated);
      return true;
    },
    [exercises, persist]
  );

  const getAll = useCallback(() => exercises, [exercises]);

  return {
    exercises,
    loaded,
    addExercise,
    updateExercise,
    deleteExercise,
    getAll,
  };
}

// ═══════════════════════════════════════════════
// Mapping helpers for the exercises page
// ═══════════════════════════════════════════════

/** Map custom body_part to page's BodyPart filter */
export function mapCustomBodyPart(bp: CustomBodyPart): "上肢" | "下肢" | "核心" | "背部" | "全身" {
  switch (bp) {
    case "下肢":
      return "下肢";
    case "上肢推":
    case "上肢拉":
      return "上肢";
    case "核心":
      return "核心";
    case "全身":
      return "全身";
  }
}

/** Map custom equipment to page's Equipment filter */
export function mapCustomEquipment(eq: CustomEquipment): "杠铃" | "哑铃" | "悬吊" | "自重" {
  switch (eq) {
    case "杠铃":
      return "杠铃";
    case "哑铃":
      return "哑铃";
    case "壶铃":
      return "哑铃";
    case "自重":
      return "自重";
    case "弹力带":
      return "悬吊";
    case "药球":
      return "自重";
    case "波速球":
      return "自重";
    case "其他":
      return "自重";
  }
}

// ═══════════════════════════════════════════════
// Mapping helpers for PlanBuilder (English enums)
// ═══════════════════════════════════════════════

/** Map custom body_part to strength-types BodyPart */
export function mapCustomToBodyPart(bp: CustomBodyPart): "chest" | "back" | "legs" | "shoulders" | "arms" | "core" {
  switch (bp) {
    case "下肢":
      return "legs";
    case "上肢推":
      return "chest";
    case "上肢拉":
      return "back";
    case "核心":
      return "core";
    case "全身":
      return "core";
  }
}

/** Map custom equipment to strength-types Equipment */
export function mapCustomToEquipment(eq: CustomEquipment): "barbell" | "dumbbell" | "cable" | "bodyweight" | "machine" {
  switch (eq) {
    case "杠铃":
      return "barbell";
    case "哑铃":
      return "dumbbell";
    case "壶铃":
      return "dumbbell";
    case "自重":
      return "bodyweight";
    case "弹力带":
      return "cable";
    case "药球":
      return "bodyweight";
    case "波速球":
      return "bodyweight";
    case "其他":
      return "machine";
  }
}

/** Convert a CustomExercise to an ExerciseLibItem for PlanBuilder */
export function customToExerciseLibItem(ex: CustomExercise): import("@/lib/strength-types").ExerciseLibItem {
  return {
    id: ex.id,
    name: ex.name,
    body_part: mapCustomToBodyPart(ex.body_part),
    equipment: mapCustomToEquipment(ex.equipment),
    type: "力量",
    description: ex.description,
    cue_points: ex.cue_points,
    progression: ex.progression || "—",
    regression: ex.regression || "—",
    image_url: ex.image_url,
  };
}
