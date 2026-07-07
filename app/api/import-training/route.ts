import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase-server";

/**
 * POST /api/import-training
 * 从外部脚本接收训练数据，直接写入 Supabase user_kv
 * 服务端运行 → 境外 Vercel → 直连 Supabase → 不经过中国网络
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, teamId, logEntry, loadEntries } = body;

    if (!userId || !teamId) {
      return NextResponse.json({ error: "userId and teamId required" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const now = new Date().toISOString();

    // 1. 写入训练日志 (kenshin_daily_training_log)
    if (logEntry) {
      const logKey = `kenshin_daily_training_log_${teamId}`;

      // 先读取现有数据
      const { data: existing } = await admin
        .from("user_kv")
        .select("value")
        .eq("user_id", userId)
        .eq("key", logKey)
        .single();

      let logs: any[] = [];
      if (existing?.value) {
        try { logs = JSON.parse(existing.value); } catch {}
      }

      // 检查是否已有同日期记录
      const idx = logs.findIndex((l: any) => l.date === logEntry.date);
      if (idx >= 0) {
        logs[idx] = logEntry;
      } else {
        logs.unshift(logEntry);
      }

      await admin.from("user_kv").upsert({
        user_id: userId,
        key: logKey,
        value: JSON.stringify(logs.slice(0, 200)),
        updated_at: now,
      }, { onConflict: "user_id, key" });
    }

    // 2. 写入负荷数据 (kenshin_load_data)
    if (loadEntries) {
      const loadKey = `kenshin_load_data_${teamId}`;

      const { data: existing } = await admin
        .from("user_kv")
        .select("value")
        .eq("user_id", userId)
        .eq("key", loadKey)
        .single();

      let loadData: Record<string, any[]> = {};
      if (existing?.value) {
        try { loadData = JSON.parse(existing.value); } catch {}
      }

      // 合并新数据
      for (const [playerName, entries] of Object.entries(loadEntries)) {
        if (!loadData[playerName]) loadData[playerName] = [];
        for (const entry of entries as any[]) {
          const ei = loadData[playerName].findIndex((e: any) => e.date === entry.date);
          if (ei >= 0) {
            loadData[playerName][ei] = entry;
          } else {
            loadData[playerName].push(entry);
          }
        }
        loadData[playerName].sort((a: any, b: any) => b.date.localeCompare(a.date));
        if (loadData[playerName].length > 35) {
          loadData[playerName] = loadData[playerName].slice(0, 35);
        }
      }

      await admin.from("user_kv").upsert({
        user_id: userId,
        key: loadKey,
        value: JSON.stringify(loadData),
        updated_at: now,
      }, { onConflict: "user_id, key" });
    }

    return NextResponse.json({ success: true, message: "训练数据已写入" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/import-training?userId=xxx
 * 获取用户信息（用于确认 userId 和 teamId）
 */
export async function GET(_req: NextRequest) {
  try {
    const admin = supabaseAdmin();

    // 列出所有用户及其激活的球队
    const { data: users } = await admin.auth.admin.listUsers();

    const result = [];
    for (const user of users?.users || []) {
      const { data: prefs } = await admin
        .from("user_prefs")
        .select("active_team_id")
        .eq("user_id", user.id)
        .single();

      const { data: teams } = await admin
        .from("teams")
        .select("*")
        .eq("user_id", user.id);

      result.push({
        userId: user.id,
        email: user.email,
        activeTeamId: prefs?.active_team_id || null,
        teams: teams || [],
      });
    }

    return NextResponse.json({ users: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
