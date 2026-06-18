import { createServerSupabase } from "@/lib/supabase/supabase-server";

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ status: "error", message: "未登录" });
    }

    // Check all sync tables
    const [teamsRes, prefsRes, calendarRes, kvRes, rosterRes] = await Promise.all([
      supabase.from("teams").select("id").eq("user_id", user.id),
      supabase.from("user_prefs").select("*").eq("user_id", user.id).single(),
      supabase.from("season_calendar").select("updated_at").eq("user_id", user.id).single(),
      supabase.from("user_kv").select("key").eq("user_id", user.id),
      supabase.from("roster_players").select("id").eq("user_id", user.id),
    ]);

    return Response.json({
      status: "ok",
      userId: user.id.slice(0, 8) + "...",
      teams: teamsRes.data?.length || 0,
      activeTeam: prefsRes.data?.active_team_id || null,
      seasonCalendar: calendarRes.data ? "有" : "无",
      kvKeys: kvRes.data?.map((r: any) => r.key) || [],
      kvCount: kvRes.data?.length || 0,
      rosterPlayers: rosterRes.data?.length || 0,
      error: {
        teams: teamsRes.error?.message || null,
        prefs: prefsRes.error?.message || null,
        calendar: calendarRes.error?.message || null,
        kv: kvRes.error?.message || null,
        roster: rosterRes.error?.message || null,
      },
    });
  } catch (e: any) {
    return Response.json({ status: "error", message: e.message });
  }
}
