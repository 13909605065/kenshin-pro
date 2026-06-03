"use client";

import { useState, useCallback } from "react";
import { PlayerFormData, TrainingModule } from "@/lib/types";

const PLANS_KEY = "kenshin_plans";
const MAX_PLANS = 30;

export interface SavedPlan {
  id: string;
  playerName: string;
  createdAt: string;
  formData: PlayerFormData;
  modules: TrainingModule[];
}

function loadAll(): SavedPlan[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PLANS_KEY) || "[]");
  } catch {
    return [];
  }
}

function persist(plans: SavedPlan[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans.slice(0, MAX_PLANS)));
  } catch {}
}

export function usePlanHistory() {
  const [plans, setPlans] = useState<SavedPlan[]>(() => loadAll());

  const refresh = useCallback(() => {
    const all = loadAll();
    setPlans(all);
    return all;
  }, []);

  /** Save a plan to history, grouped by player name */
  const savePlan = useCallback(
    (
      playerName: string,
      formData: PlayerFormData,
      modules: TrainingModule[]
    ): SavedPlan => {
      const plan: SavedPlan = {
        id: Date.now().toString(),
        playerName: playerName.trim(),
        createdAt: new Date().toISOString(),
        formData: { ...formData },
        modules: [...modules],
      };
      const all = loadAll();
      const updated = [plan, ...all].slice(0, MAX_PLANS);
      persist(updated);
      setPlans(updated);
      return plan;
    },
    []
  );

  /** Get all plans matching the given player name (case-insensitive) */
  const getPlansForPlayer = useCallback(
    (playerName: string): SavedPlan[] => {
      if (!playerName || !playerName.trim()) return [];
      const normalized = playerName.trim().toLowerCase();
      return plans.filter(
        (p) => p.playerName.toLowerCase() === normalized
      );
    },
    [plans]
  );

  /** Load a specific plan by ID */
  const loadPlan = useCallback(
    (id: string): SavedPlan | null => {
      return plans.find((p) => p.id === id) || null;
    },
    [plans]
  );

  /** Delete a plan by ID */
  const deletePlan = useCallback(
    (id: string) => {
      const updated = plans.filter((p) => p.id !== id);
      persist(updated);
      setPlans(updated);
    },
    [plans]
  );

  /** Check if any plans exist for this player */
  const hasPlansForPlayer = useCallback(
    (playerName: string): boolean => {
      return getPlansForPlayer(playerName).length > 0;
    },
    [getPlansForPlayer]
  );

  return {
    plans,
    savePlan,
    getPlansForPlayer,
    loadPlan,
    deletePlan,
    hasPlansForPlayer,
    refresh,
  };
}
