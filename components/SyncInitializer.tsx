"use client";

import { useEffect } from "react";
import { setupAutoSync } from "@/lib/sync-queue";

/**
 * Initializes the offline sync queue with Supabase-backed handlers.
 * When the user comes back online, queued actions (plan saves, profile updates)
 * are replayed automatically.
 */
export function SyncInitializer() {
  useEffect(() => {
    const cleanup = setupAutoSync(
      {
        save_training_log: async (payload: unknown) => {
          const { saveSRPEEntries } = await import("@/lib/monitoring-client");
          const data = payload as any;
          if (data?.entries) await saveSRPEEntries(data.entries);
        },
        save_profile: async (payload: unknown) => {
          const supabase = (await import("@/lib/supabase/supabase-client")).createClient();
          const data = payload as any;
          if (data?.profile) {
            await supabase.from("profiles").upsert(data.profile);
          }
        },
        save_settings: async (payload: unknown) => {
          // Settings are small — just re-apply to localStorage then trigger migration
          const data = payload as any;
          if (data?.key && data?.value !== undefined) {
            localStorage.setItem(data.key, JSON.stringify(data.value));
          }
        },
      },
      (result) => {
        console.log(`[SyncQueue] Auto-sync complete: ${result.processed} processed, ${result.remaining} remaining`);
      }
    );

    return cleanup;
  }, []);

  return null;
}
