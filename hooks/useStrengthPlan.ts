"use client";

import { useState, useCallback, useEffect } from "react";
import { PlanExercise, ExerciseLibItem, StrengthTemplate } from "@/lib/strength-types";
import { findExercise } from "@/lib/exercise-data";
import { createClient } from "@/lib/supabase-client";

const STORAGE_KEY = "kenshin_strength_plan";
const PLANS_KEY = "kenshin_strength_plans";

interface SavedPlan {
  id: string;
  name: string;
  exercises: PlanExercise[];
  created_at: string;
}

export function useStrengthPlan() {
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [planName, setPlanName] = useState("");
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setExercises(parsed.exercises || []);
        setPlanName(parsed.name || "");
      }
      const plansRaw = localStorage.getItem(PLANS_KEY);
      if (plansRaw) {
        setSavedPlans(JSON.parse(plansRaw));
      }
    } catch { /* ignore */ }
  }, []);

  // Persist draft to localStorage on every change
  const persist = useCallback((exs: PlanExercise[], name: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ exercises: exs, name }));
    } catch { /* quota exceeded */ }
  }, []);

  const addExercise = useCallback((item: ExerciseLibItem) => {
    setExercises((prev) => {
      const next = [
        ...prev,
        { ...item, sets: 3, reps: 10, load: "70% 1RM", rest: 90 },
      ];
      persist(next, planName);
      return next;
    });
  }, [planName, persist]);

  const removeExercise = useCallback((index: number) => {
    setExercises((prev) => {
      const next = prev.filter((_, i) => i !== index);
      persist(next, planName);
      return next;
    });
  }, [planName, persist]);

  const updateExercise = useCallback((index: number, updates: Partial<PlanExercise>) => {
    setExercises((prev) => {
      const next = prev.map((ex, i) => (i === index ? { ...ex, ...updates } : ex));
      persist(next, planName);
      return next;
    });
  }, [planName, persist]);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setExercises((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      persist(next, planName);
      return next;
    });
  }, [planName, persist]);

  const moveDown = useCallback((index: number) => {
    setExercises((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      persist(next, planName);
      return next;
    });
  }, [planName, persist]);

  const clearPlan = useCallback(() => {
    setExercises([]);
    setPlanName("");
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const loadTemplate = useCallback((template: StrengthTemplate) => {
    const loaded: PlanExercise[] = template.exercises
      .map((te) => {
        const libItem = findExercise(te.exerciseId);
        if (!libItem) return null;
        return {
          ...libItem,
          sets: te.sets,
          reps: te.reps,
          load: te.load,
          rest: te.rest,
        } as PlanExercise;
      })
      .filter((ex): ex is PlanExercise => ex !== null);

    setExercises(loaded);
    setPlanName(template.name);
    persist(loaded, template.name);
  }, [persist]);

  const savePlan = useCallback(async (name?: string) => {
    const finalName = name || planName || "未命名计划";
    if (exercises.length === 0) return;

    setIsSaving(true);
    const plan: SavedPlan = {
      id: Date.now().toString(),
      name: finalName,
      exercises,
      created_at: new Date().toISOString(),
    };

    // localStorage
    try {
      const updated = [plan, ...savedPlans].slice(0, 50);
      localStorage.setItem(PLANS_KEY, JSON.stringify(updated));
      setSavedPlans(updated);
    } catch { /* ignore */ }

    // Supabase
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("training_templates").upsert({
          id: plan.id,
          user_id: user.id,
          name: finalName,
          form_data: { plan_exercises: exercises.map((ex) => ({ id: ex.id, sets: ex.sets, reps: ex.reps, load: ex.load, rest: ex.rest })) },
          plan_content: exercises,
        }, { onConflict: "id" });
      }
    } catch { /* offline */ }

    setPlanName(finalName);
    setIsSaving(false);
  }, [exercises, planName, savedPlans]);

  return {
    exercises,
    planName,
    setPlanName,
    savedPlans,
    isSaving,
    addExercise,
    removeExercise,
    updateExercise,
    moveUp,
    moveDown,
    clearPlan,
    loadTemplate,
    savePlan,
  };
}
