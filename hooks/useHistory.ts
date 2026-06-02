"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-client";
import { TrainingHistoryItem } from "@/lib/types";
import { getLocalHistory } from "@/lib/storage";

export function useHistory() {
  const [items, setItems] = useState<TrainingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems(getLocalHistory());
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("training_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setItems(
        (data || []).map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          form_data: row.form_data,
          plan_content: row.plan_content,
          is_favorite: row.is_favorite,
          created_at: row.created_at,
        }))
      );
    } catch {
      setItems(getLocalHistory());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const refresh = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { items, loading, refresh };
}
