/**
 * 伤病记录 API — FIFA consensus (Fuller et al., 2006)
 */
import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const player = searchParams.get("player");
  const active = searchParams.get("active"); // "true" = return_date is null

  let q = supabase.from("injuries").select("*").eq("user_id", user.id);
  if (player) q = q.eq("player_name", player);
  if (active === "true") q = q.is("return_date", null);
  q = q.order("occurrence_date", { ascending: false });

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
    body_part: e.body_part,
    injury_type: e.injury_type,
    occurrence_date: e.occurrence_date,
    context: e.context || null,
    mechanism: e.mechanism || null,
    days_absent: e.days_absent || 0,
    return_date: e.return_date || null,
    notes: e.notes || null,
  }));

  const { data, error } = await supabase.from("injuries").insert(rows).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data, count: data.length });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return Response.json({ error: "需要 id" }, { status: 400 });

  const { data, error } = await supabase.from("injuries").update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", user.id).select();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "需要 id 参数" }, { status: 400 });

  const { error } = await supabase.from("injuries").delete().eq("id", id).eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
