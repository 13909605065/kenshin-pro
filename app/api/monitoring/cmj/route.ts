/**
 * CMJ API — Countermovement Jump records CRUD
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

  let q = supabase.from("cmj_records").select("*").eq("user_id", user.id);
  if (player) q = q.eq("player_name", player);
  if (from) q = q.gte("test_date", from);
  if (to) q = q.lte("test_date", to);
  q = q.order("test_date", { ascending: false });

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

  const rows = entries.map((e: any) => ({
    user_id: user.id,
    player_name: e.player_name,
    test_date: e.test_date,
    jump_1_cm: e.jump_1_cm,
    jump_2_cm: e.jump_2_cm,
    jump_3_cm: e.jump_3_cm,
    baseline_cm: e.baseline_cm || null,
    notes: e.notes || null,
  }));

  const { data, error } = await supabase.from("cmj_records").insert(rows).select();
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

  const { error } = await supabase.from("cmj_records").delete().eq("id", id).eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
