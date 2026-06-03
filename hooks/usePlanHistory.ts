"use client";

import { useState, useCallback, useEffect } from "react";
import { PlayerFormData, TrainingModule } from "@/lib/types";
import { createClient } from "@/lib/supabase/supabase-client";

const PLANS_KEY = "kenshin_plans";
const MAX_PLANS = 30;

export interface SavedPlan {
  id: string;
  playerName: string;
  role: "coach" | "athlete";
  createdAt: string;
  formData: PlayerFormData;
  modules: TrainingModule[];
}

// ---- DB row shape matching training_plans (id, user_id, player_name, modules JSONB, form_data JSONB, created_at) ----

interface PlanRow {
  id: string;
  user_id: string;
  player_name: string;
  modules: TrainingModule[];
  form_data: PlayerFormData;
  created_at: string;
}

// ---- localStorage helpers (fallback) ----

function loadAll(): SavedPlan[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PLANS_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistLocal(plans: SavedPlan[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans.slice(0, MAX_PLANS)));
  } catch {}
}

// ---- Map between SavedPlan and DB row ----

function rowToPlan(row: PlanRow): SavedPlan {
  return {
    id: row.id,
    playerName: row.player_name,
    role: (row.form_data?.role || "athlete") as "coach" | "athlete",
    createdAt: row.created_at,
    formData: row.form_data,
    modules: row.modules,
  };
}

function planToRow(plan: SavedPlan, userId: string): PlanRow {
  return {
    id: plan.id,
    user_id: userId,
    player_name: plan.playerName,
    modules: plan.modules,
    form_data: plan.formData,
    created_at: plan.createdAt,
  };
}

export function usePlanHistory() {
  // Seed state from localStorage immediately (sync), Supabase refresh follows in useEffect
  const [plans, setPlans] = useState<SavedPlan[]>(() => loadAll());
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  /** Load plans from Supabase (primary), fallback to localStorage on error or missing auth */
  const refresh = useCallback(async (): Promise<SavedPlan[]> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const local = loadAll();
        setPlans(local);
        return local;
      }

      const { data, error } = await supabase
        .from("training_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(MAX_PLANS);

      if (error) throw error;

      const remote: SavedPlan[] = (data || []).map((row: any) => rowToPlan(row as PlanRow));
      setPlans(remote);
      persistLocal(remote); // keep localStorage cache in sync
      return remote;
    } catch {
      // Supabase unreachable or error — keep whatever localStorage has
      const local = loadAll();
      setPlans(local);
      return local;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch from Supabase on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Save a plan to history.
   * Writes localStorage synchronously (immediate, always succeeds).
   * Fires Supabase insert in background (primary store, best-effort).
   * Returns the SavedPlan synchronously for backward compatibility.
   */
  const savePlan = useCallback(
    (
      playerName: string,
      formData: PlayerFormData,
      modules: TrainingModule[]
    ): SavedPlan => {
      const plan: SavedPlan = {
        id: Date.now().toString(),
        playerName: playerName.trim(),
        role: (formData.role || "athlete") as "coach" | "athlete",
        createdAt: new Date().toISOString(),
        formData: { ...formData },
        modules: [...modules],
      };

      // localStorage — synchronous, always works
      const all = loadAll();
      const updated = [plan, ...all].slice(0, MAX_PLANS);
      persistLocal(updated);
      setPlans(updated);

      // Supabase — fire-and-forget in background
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from("training_plans").insert(planToRow(plan, user.id))
            .then(({ error }) => {
              if (error) console.warn("[usePlanHistory] Supabase insert failed:", error.message);
            });
        }
      }).catch(() => {});

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

  /** Get plans by current role */
  const getPlansByRole = useCallback(
    (currentRole: "coach" | "athlete"): SavedPlan[] => {
      return plans.filter((p) => p.role === currentRole);
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

  /**
   * Delete a plan by ID.
   * Updates localStorage + state synchronously.
   * Fires Supabase delete in background.
   */
  const deletePlan = useCallback(
    (id: string) => {
      const updated = plans.filter((p) => p.id !== id);
      persistLocal(updated);
      setPlans(updated);

      // Supabase — fire-and-forget in background
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from("training_plans").delete().eq("id", id)
            .then(({ error }) => {
              if (error) console.warn("[usePlanHistory] Supabase delete failed:", error.message);
            });
        }
      }).catch(() => {});
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
    loading,
    savePlan,
    getPlansForPlayer,
    getPlansByRole,
    loadPlan,
    deletePlan,
    hasPlansForPlayer,
    refresh,
  };
}
