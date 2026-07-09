/**
 * sRPE API — session-RPE data CRUD with Supabase
 * GET: /api/monitoring/srpe?player=&from=&to=
 * POST: batch insert sRPE entries (delete+insert to handle duplicates without unique constraint)
 */
import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const player = searchParams.get("player");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let q = supabase.from("srpe_entries").select("*").eq("user_id", user.id);
  if (player) q = q.eq("player_name", player);
  if (from) q = q.gte("session_date", from);
  if (to) q = q.lte("session_date", to);
  q = q.order("session_date", { ascending: false });

  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  const body = await request.json();
  const entries = Array.isArray(body) ? body : [body];

  // Add user_id to each entry
  const rows = entries.map((e: any) => ({
    user_id: user.id,
    player_name: e.player_name,
    session_date: e.session_date,
    session_type: e.session_type || "training",
    rpe_score: e.rpe_score,
    duration_min: e.duration_min,
    notes: e.notes || null,
  }));

  // Delete existing entries with same keys before insert
  // (table lacks unique constraint, so upsert fails)
  for (const row of rows) {
    await supabase.from("srpe_entries").delete()
      .eq("user_id", row.user_id)
      .eq("player_name", row.player_name)
      .eq("session_date", row.session_date)
      .eq("session_type", row.session_type);
  }

  const { data, error } = await supabase.from("srpe_entries").insert(rows).select();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data, count: data.length });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "需要 id 参数" }, { status: 400 });

  const { error } = await supabase.from("srpe_entries").delete().eq("id", id).eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
