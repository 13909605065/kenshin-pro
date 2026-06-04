"use client";

import { createClient } from "@/lib/supabase/supabase-client";
import { PlayerFormData } from "@/lib/types";

const supabase = createClient();

export interface SupabaseProfile {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  form_data?: PlayerFormData | null;
  updated_at?: string;
}

/** Load profile from Supabase profiles table. Returns null if not found or error. */
export async function loadProfileFromSupabase(userId: string): Promise<SupabaseProfile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    return data as SupabaseProfile;
  } catch {
    return null;
  }
}

/** Upsert formData to Supabase profiles table. Returns true on success, false on failure. */
export async function syncFormDataToSupabase(
  userId: string,
  formData: PlayerFormData
): Promise<boolean> {
  try {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        form_data: formData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    return !error;
  } catch {
    return false;
  }
}

/** Upsert display metadata (name, avatar) to Supabase profiles table. */
export async function syncProfileMetaToSupabase(
  userId: string,
  meta: { display_name?: string; avatar_url?: string }
): Promise<boolean> {
  try {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        ...meta,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    return !error;
  } catch {
    return false;
  }
}
