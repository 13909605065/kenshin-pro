import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/supabase-server";

/**
 * POST /api/share — Save training plan, return short share ID
 * GET  /api/share?id=xxx — Retrieve shared plan (no auth required)
 */

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ code: "auth-required", message: "请先登录" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
    if (!payload?.modules || !payload?.formData) {
      return Response.json({ code: "invalid", message: "缺少训练数据" }, { status: 400 });
    }
  } catch {
    return Response.json({ code: "invalid", message: "无效数据" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shared_plans")
    .insert({
      user_id: user.id,
      modules: payload.modules,
      form_data: payload.formData,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Share save error:", error);
    return Response.json({ code: "db-error", message: "保存失败" }, { status: 500 });
  }

  return Response.json({ code: "ok", id: data.id });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ code: "invalid", message: "缺少分享ID" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("shared_plans")
    .select("modules, form_data, created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return Response.json({ code: "not-found", message: "方案不存在或已过期" }, { status: 404 });
  }

  return Response.json({
    code: "ok",
    data: {
      modules: data.modules,
      formData: data.form_data,
      createdAt: data.created_at,
    },
  });
}
