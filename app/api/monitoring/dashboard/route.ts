/**
 * Dashboard API — unified data endpoint for team dashboards.
 *
 * GET /api/monitoring/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns all monitoring data needed by the 3 dashboard tabs
 * (教练简报 / 负荷监控 / 球员趋势) in a single request.
 */
import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/supabase-server";

// ── Types ──────────────────────────────────────────────

export interface DashboardPlayerDay {
  name: string;
  position: string;
  rpe: number | null;
  srpe: number | null;
  duration: number | null;
  sessionType: "training" | "match" | null;
  sleep: number | null;
  fatigue: number | null;
  soreness: number | null;
  stress: number | null;
  mood: number | null;
  healthTotal: number | null;
  healthWarning: boolean;
  injuryStatus: string | null;
  injuryNote: string | null;
  notes: string;
}

export interface DashboardDaySummary {
  date: string;
  dayType: "训练" | "比赛" | "放假" | "恢复";
  nParticipants: number;
  nMorningSurveys: number;
  totalSRPE: number;
  avgRPE: number;
  avgSleep: number;
  avgFatigue: number;
  avgSoreness: number;
  avgHealthTotal: number;
  atRiskCount: number;
  players: DashboardPlayerDay[];
}

export interface DashboardACWR {
  playerName: string;
  acuteTotal: number;
  acuteDaily: number;
  chronicDaily: number;
  acwr: number | null;
  status: "safe" | "warning" | "danger" | "insufficient";
}

export interface DashboardResponse {
  days: DashboardDaySummary[];
  acwr: DashboardACWR[];
  dateRange: { from: string; to: string };
  generatedAt: string;
}

// ── Helpers ────────────────────────────────────────────

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

function determineDayType(
  entries: { session_type: string }[],
  nRPE: number,
  nMorning: number
): DashboardDaySummary["dayType"] {
  const hasMatch = entries.some(e => e.session_type === "match");
  if (hasMatch) return "比赛";
  if (nRPE === 0 && nMorning > 0) return "放假";
  if (nRPE === 0 && nMorning === 0) return "放假";
  const allLow = entries.every(e => e.session_type === "training" && nRPE > 0);
  if (allLow && nRPE > 0) return "训练";
  return "恢复";
}

// ── GET Handler ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || "2026-07-01";
  const to = searchParams.get("to") || new Date().toISOString().slice(0, 10);

  // ── Fetch all data in parallel ─────────────────────
  const [srpeRes, healthRes, injuryRes] = await Promise.all([
    supabase.from("srpe_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("session_date", from)
      .lte("session_date", to)
      .order("session_date", { ascending: false }),
    supabase.from("health_questionnaires")
      .select("*")
      .eq("user_id", user.id)
      .gte("record_date", from)
      .lte("record_date", to)
      .order("record_date", { ascending: false }),
    supabase.from("injuries")
      .select("*")
      .eq("user_id", user.id)
      .or(`return_date.is.null,return_date.gte.${from}`),
  ]);

  if (srpeRes.error) return Response.json({ error: srpeRes.error.message }, { status: 500 });
  if (healthRes.error) return Response.json({ error: healthRes.error.message }, { status: 500 });

  const srpeEntries = srpeRes.data || [];
  const healthEntries = healthRes.data || [];
  const injuries = injuryRes.data || [];

  // ── Build injury lookup by player ──────────────────
  const injuryByPlayer: Record<string, { status: string; note: string }> = {};
  for (const inj of injuries) {
    injuryByPlayer[inj.player_name] = {
      status: inj.injury_type || "伤病",
      note: inj.notes || inj.body_part || "",
    };
  }

  // ── Group by date ──────────────────────────────────
  const dateMap = new Map<string, {
    srpe: any[];
    health: any[];
  }>();

  for (const e of srpeEntries) {
    const d = e.session_date;
    if (!dateMap.has(d)) dateMap.set(d, { srpe: [], health: [] });
    dateMap.get(d)!.srpe.push(e);
  }
  for (const h of healthEntries) {
    const d = h.record_date;
    if (!dateMap.has(d)) dateMap.set(d, { srpe: [], health: [] });
    dateMap.get(d)!.health.push(h);
  }

  // ── Build player sets and full date list ───────────
  const allPlayerNames = new Set<string>();
  for (const e of srpeEntries) allPlayerNames.add(e.player_name);
  for (const h of healthEntries) allPlayerNames.add(h.player_name);

  const sortedDates = Array.from(dateMap.keys()).sort().reverse();

  // ── Assemble day summaries ─────────────────────────
  const days: DashboardDaySummary[] = [];
  const playerSRPEMap = new Map<string, number[]>(); // playerName → daily sRPE values

  for (const date of sortedDates) {
    const group = dateMap.get(date)!;
    const players: DashboardPlayerDay[] = [];

    // Index health by player name for this date
    const healthByName: Record<string, any> = {};
    for (const h of group.health) {
      healthByName[h.player_name] = h;
    }

    // Process SRPE entries
    const seenPlayers = new Set<string>();
    for (const e of group.srpe) {
      seenPlayers.add(e.player_name);
      const h = healthByName[e.player_name];
      const healthTotal = h ? (h.sleep_score + h.fatigue_score + h.soreness_score + h.stress_score + h.mood_score) : null;
      const injury = injuryByPlayer[e.player_name];

      const srpeVal = (e.rpe_score && e.duration_min) ? e.rpe_score * e.duration_min : null;

      // Track sRPE for ACWR
      if (srpeVal) {
        if (!playerSRPEMap.has(e.player_name)) playerSRPEMap.set(e.player_name, []);
        playerSRPEMap.get(e.player_name)!.push(srpeVal);
      }

      players.push({
        name: e.player_name,
        position: "",
        rpe: e.rpe_score ?? null,
        srpe: srpeVal,
        duration: e.duration_min ?? null,
        sessionType: e.session_type ?? "training",
        sleep: h?.sleep_score ?? null,
        fatigue: h?.fatigue_score ?? null,
        soreness: h?.soreness_score ?? null,
        stress: h?.stress_score ?? null,
        mood: h?.mood_score ?? null,
        healthTotal,
        healthWarning: healthTotal !== null && healthTotal > 15,
        injuryStatus: injury?.status ?? null,
        injuryNote: injury?.note ?? null,
        notes: e.notes || h?.notes || "",
      });
    }

    // Add health-only players (morning survey but no sRPE)
    for (const h of group.health) {
      if (!seenPlayers.has(h.player_name)) {
        const healthTotal = h.sleep_score + h.fatigue_score + h.soreness_score + h.stress_score + h.mood_score;
        const injury = injuryByPlayer[h.player_name];
        players.push({
          name: h.player_name,
          position: "",
          rpe: null,
          srpe: null,
          duration: null,
          sessionType: null,
          sleep: h.sleep_score ?? null,
          fatigue: h.fatigue_score ?? null,
          soreness: h.soreness_score ?? null,
          stress: h.stress_score ?? null,
          mood: h.mood_score ?? null,
          healthTotal,
          healthWarning: healthTotal > 15,
          injuryStatus: injury?.status ?? null,
          injuryNote: injury?.note ?? null,
          notes: h.notes || "",
        });
      }
    }

    // Compute day-level aggregates
    const withRPE = players.filter(p => p.rpe !== null);
    const withSleep = players.filter(p => p.sleep !== null);
    const withFatigue = players.filter(p => p.fatigue !== null);
    const withSoreness = players.filter(p => p.soreness !== null);
    const withHealth = players.filter(p => p.healthTotal !== null);
    const atRisk = players.filter(p => p.healthWarning || (p.injuryStatus !== null));

    days.push({
      date,
      dayType: determineDayType(group.srpe, withRPE.length, group.health.length),
      nParticipants: withRPE.length,
      nMorningSurveys: withHealth.length,
      totalSRPE: withRPE.reduce((sum, p) => sum + (p.srpe || 0), 0),
      avgRPE: avg(withRPE.map(p => p.rpe!).filter(Boolean)),
      avgSleep: avg(withSleep.map(p => p.sleep!).filter(Boolean)),
      avgFatigue: avg(withFatigue.map(p => p.fatigue!).filter(Boolean)),
      avgSoreness: avg(withSoreness.map(p => p.soreness!).filter(Boolean)),
      avgHealthTotal: avg(withHealth.map(p => p.healthTotal!).filter(Boolean)),
      atRiskCount: atRisk.length,
      players: players.sort((a, b) => a.name.localeCompare(b.name, "zh")),
    });
  }

  // ── Compute ACWR for each player ───────────────────
  const acwrResults: DashboardACWR[] = [];
  playerSRPEMap.forEach((srpeValues, playerName) => {
    // 7-day acute: last 7 values
    const last7 = srpeValues.slice(0, 7);
    const acuteTotal = last7.reduce((a: number, b: number) => a + b, 0);
    const acuteDaily = Math.round(acuteTotal / Math.max(1, last7.length));

    // Chronic: average of all values before the acute window
    const chronicValues = srpeValues.slice(7);
    const chronicDaily = chronicValues.length > 0
      ? Math.round(chronicValues.reduce((a: number, b: number) => a + b, 0) / chronicValues.length)
      : 0;

    let acwr: number | null = null;
    let status: DashboardACWR["status"] = "insufficient";
    if (chronicDaily > 0 && last7.length >= 3) {
      acwr = Math.round((acuteDaily / chronicDaily) * 100) / 100;
      if (acwr < 0.8) status = "safe";
      else if (acwr <= 1.3) status = "safe";
      else if (acwr <= 1.5) status = "warning";
      else status = "danger";
    }

    acwrResults.push({
      playerName,
      acuteTotal,
      acuteDaily,
      chronicDaily,
      acwr,
      status,
    });
  });

  return Response.json({
    days,
    acwr: acwrResults.sort((a, b) => (b.acwr || 0) - (a.acwr || 0)),
    dateRange: { from, to },
    generatedAt: new Date().toISOString(),
  } as DashboardResponse);
}
