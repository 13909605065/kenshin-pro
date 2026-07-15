/**
 * Bulk Import API — import a full day of player data at once.
 *
 * POST /api/monitoring/import
 *
 * Accepts: { date: "YYYY-MM-DD", entries: [{ player_name, ... }] }
 * Writes to both srpe_entries and health_questionnaires.
 * Idempotent — delete+insert to handle duplicates.
 */
import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/supabase-server";

interface ImportEntry {
  player_name: string;
  position?: string;
  // Training
  session_type?: "training" | "match";
  rpe_score?: number | null;
  duration_min?: number | null;
  // Wellness
  sleep_score?: number | null;
  fatigue_score?: number | null;
  soreness_score?: number | null;
  stress_score?: number | null;
  mood_score?: number | null;
  // Meta
  notes?: string;
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  const body = await request.json();
  const { date, entries } = body as { date: string; entries: ImportEntry[] };

  if (!date || !entries?.length) {
    return Response.json({ error: "需要 date 和 entries[]" }, { status: 400 });
  }

  const srpeRows: any[] = [];
  const healthRows: any[] = [];
  const skipped: string[] = [];

  for (const e of entries) {
    if (!e.player_name) continue;

    // Build sRPE row if RPE or duration present
    if (e.rpe_score != null || e.duration_min != null) {
      srpeRows.push({
        user_id: user.id,
        player_name: e.player_name,
        session_date: date,
        session_type: e.session_type || "training",
        rpe_score: e.rpe_score ?? 0,
        duration_min: e.duration_min ?? 0,
        notes: e.notes || null,
      });
    }

    // Build health row if any wellness score present
    if (
      e.sleep_score != null ||
      e.fatigue_score != null ||
      e.soreness_score != null ||
      e.stress_score != null ||
      e.mood_score != null
    ) {
      healthRows.push({
        user_id: user.id,
        player_name: e.player_name,
        record_date: date,
        sleep_score: e.sleep_score ?? 3,
        fatigue_score: e.fatigue_score ?? 3,
        soreness_score: e.soreness_score ?? 3,
        stress_score: e.stress_score ?? 3,
        mood_score: e.mood_score ?? 3,
        notes: e.notes || null,
      });
    }

    if (
      e.rpe_score == null &&
      e.sleep_score == null &&
      e.fatigue_score == null &&
      e.soreness_score == null
    ) {
      skipped.push(e.player_name);
    }
  }

  let srpeCount = 0;
  let healthCount = 0;

  // Delete old + insert new for sRPE
  if (srpeRows.length > 0) {
    await supabase.from("srpe_entries").delete()
      .eq("user_id", user.id).eq("session_date", date);
    const { error: srpeErr } = await supabase.from("srpe_entries").insert(srpeRows).select();
    if (srpeErr) return Response.json({ error: srpeErr.message }, { status: 500 });
    srpeCount = srpeRows.length;
  }

  // Delete old + insert new for health
  if (healthRows.length > 0) {
    await supabase.from("health_questionnaires").delete()
      .eq("user_id", user.id).eq("record_date", date);
    const { error: healthErr } = await supabase.from("health_questionnaires").insert(healthRows).select();
    if (healthErr) return Response.json({ error: healthErr.message }, { status: 500 });
    healthCount = healthRows.length;
  }

  return Response.json({
    success: true,
    date,
    srpeCount,
    healthCount,
    skipped,
  });
}
