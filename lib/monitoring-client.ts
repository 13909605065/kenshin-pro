/**
 * Monitoring Client — Supabase-backed data layer for all field monitoring tools.
 *
 * Replaces localStorage-based storage in acwr.ts, gps-import.ts with
 * server-persisted Supabase storage via API routes.
 *
 * Data flow: Component → monitoring-client.ts → /api/monitoring/* → Supabase
 *
 * All calculation logic (ACWR, TRIMP, recovery) stays in their respective lib files.
 * This file handles ONLY data persistence.
 */

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface SRPEEntry {
  id?: string;
  player_name: string;
  session_date: string;   // YYYY-MM-DD
  session_type: "training" | "match";
  rpe_score: number;       // 0-10
  duration_min: number;
  notes?: string;
  created_at?: string;
}

export interface CMJRecord {
  id?: string;
  player_name: string;
  test_date: string;
  jump_1_cm: number;
  jump_2_cm: number;
  jump_3_cm: number;
  baseline_cm?: number | null;
  notes?: string;
  created_at?: string;
}

export interface HealthQuestionnaire {
  id?: string;
  player_name: string;
  record_date: string;
  sleep_score: number;     // 1-5
  fatigue_score: number;   // 1-5
  soreness_score: number;  // 1-5
  stress_score: number;    // 1-5
  mood_score: number;      // 1-5
  notes?: string;
  created_at?: string;
}

export interface InjuryRecord {
  id?: string;
  player_name: string;
  body_part: string;
  injury_type: string;
  occurrence_date: string;
  context?: "training" | "match" | null;
  mechanism?: "contact" | "non-contact" | null;
  days_absent?: number;
  return_date?: string | null;
  notes?: string;
  created_at?: string;
}

// ═══════════════════════════════════════════
// Internal fetch helper
// ═══════════════════════════════════════════

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "请求失败" }));
    throw new Error(err.error || `API ${res.status}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════
// sRPE
// ═══════════════════════════════════════════

export async function getSRPEEntries(params?: {
  player?: string;
  from?: string;
  to?: string;
}): Promise<SRPEEntry[]> {
  const sp = new URLSearchParams();
  if (params?.player) sp.set("player", params.player);
  if (params?.from) sp.set("from", params.from);
  if (params?.to) sp.set("to", params.to);
  const qs = sp.toString();
  const { data } = await apiFetch<{ data: SRPEEntry[] }>(`/api/monitoring/srpe${qs ? `?${qs}` : ""}`);
  return data || [];
}

export async function saveSRPEEntries(entries: SRPEEntry[]): Promise<SRPEEntry[]> {
  const { data } = await apiFetch<{ data: SRPEEntry[] }>("/api/monitoring/srpe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entries),
  });
  return data || [];
}

export async function deleteSRPEEntry(id: string): Promise<void> {
  await apiFetch(`/api/monitoring/srpe?id=${id}`, { method: "DELETE" });
}

// ═══════════════════════════════════════════
// CMJ
// ═══════════════════════════════════════════

export async function getCMJRecords(params?: {
  player?: string;
  from?: string;
  to?: string;
}): Promise<CMJRecord[]> {
  const sp = new URLSearchParams();
  if (params?.player) sp.set("player", params.player);
  if (params?.from) sp.set("from", params.from);
  if (params?.to) sp.set("to", params.to);
  const qs = sp.toString();
  const { data } = await apiFetch<{ data: CMJRecord[] }>(`/api/monitoring/cmj${qs ? `?${qs}` : ""}`);
  return data || [];
}

export async function saveCMJRecords(records: CMJRecord[]): Promise<CMJRecord[]> {
  const { data } = await apiFetch<{ data: CMJRecord[] }>("/api/monitoring/cmj", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(records),
  });
  return data || [];
}

export async function deleteCMJRecord(id: string): Promise<void> {
  await apiFetch(`/api/monitoring/cmj?id=${id}`, { method: "DELETE" });
}

/**
 * Calculate CMJ baseline from first 3 tests for a player.
 * Returns the average of the best jumps from the first 3 sessions.
 */
export function calcCMJBaseline(records: CMJRecord[]): number | null {
  if (records.length < 3) return null;
  const first3 = records.slice(0, 3);
  const bests = first3.map(r => Math.max(r.jump_1_cm, r.jump_2_cm, r.jump_3_cm));
  return Math.round(bests.reduce((a, b) => a + b, 0) / bests.length * 10) / 10;
}

// ═══════════════════════════════════════════
// Health Questionnaire
// ═══════════════════════════════════════════

export async function getHealthQuestionnaires(params?: {
  player?: string;
  from?: string;
  to?: string;
}): Promise<HealthQuestionnaire[]> {
  const sp = new URLSearchParams();
  if (params?.player) sp.set("player", params.player);
  if (params?.from) sp.set("from", params.from);
  if (params?.to) sp.set("to", params.to);
  const qs = sp.toString();
  const { data } = await apiFetch<{ data: HealthQuestionnaire[] }>(`/api/monitoring/health${qs ? `?${qs}` : ""}`);
  return data || [];
}

export async function saveHealthQuestionnaires(records: HealthQuestionnaire[]): Promise<HealthQuestionnaire[]> {
  const { data } = await apiFetch<{ data: HealthQuestionnaire[] }>("/api/monitoring/health", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(records),
  });
  return data || [];
}

export async function deleteHealthQuestionnaire(id: string): Promise<void> {
  await apiFetch(`/api/monitoring/health?id=${id}`, { method: "DELETE" });
}

/** Compute total score from 5 dimensions */
export function calcHealthTotal(q: HealthQuestionnaire): number {
  return q.sleep_score + q.fatigue_score + q.soreness_score + q.stress_score + q.mood_score;
}

/** Check if total > 15 → recovery warning */
export function isHealthWarning(q: HealthQuestionnaire): boolean {
  return calcHealthTotal(q) > 15;
}

// ═══════════════════════════════════════════
// Injuries
// ═══════════════════════════════════════════

export async function getInjuries(params?: {
  player?: string;
  active?: boolean;
}): Promise<InjuryRecord[]> {
  const sp = new URLSearchParams();
  if (params?.player) sp.set("player", params.player);
  if (params?.active) sp.set("active", "true");
  const qs = sp.toString();
  const { data } = await apiFetch<{ data: InjuryRecord[] }>(`/api/monitoring/injuries${qs ? `?${qs}` : ""}`);
  return data || [];
}

export async function saveInjuries(records: InjuryRecord[]): Promise<InjuryRecord[]> {
  const { data } = await apiFetch<{ data: InjuryRecord[] }>("/api/monitoring/injuries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(records),
  });
  return data || [];
}

export async function updateInjury(id: string, updates: Partial<InjuryRecord>): Promise<InjuryRecord> {
  const { data } = await apiFetch<{ data: InjuryRecord[] }>("/api/monitoring/injuries", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...updates }),
  });
  return data?.[0] || null;
}

export async function deleteInjury(id: string): Promise<void> {
  await apiFetch(`/api/monitoring/injuries?id=${id}`, { method: "DELETE" });
}

// ═══════════════════════════════════════════
// Migration: localStorage → Supabase
// ═══════════════════════════════════════════

/**
 * One-time migration: read old localStorage data and push to Supabase.
 * Call this once on app load. Safe to call multiple times (upsert).
 */
export async function migrateLocalStorageToSupabase(): Promise<{
  srpe: number;
  gps: number;
  errors: string[];
}> {
  const result = { srpe: 0, gps: 0, errors: [] as string[] };

  if (typeof window === "undefined") return result;

  try {
    // Migrate sRPE data
    const teamId = localStorage.getItem("kenshin_active_team_id") || "_server_";
    const srpeKey = `kenshin_team_${teamId}_kenshin_load_data`;
    const raw = localStorage.getItem(srpeKey);
    if (raw) {
      const loadData = JSON.parse(raw);
      const entries: SRPEEntry[] = [];
      for (const [playerName, loads] of Object.entries(loadData)) {
        for (const load of loads as any[]) {
          entries.push({
            player_name: playerName,
            session_date: load.date,
            session_type: "training",
            rpe_score: load.sRPE || 5,
            duration_min: load.duration || 60,
          });
        }
      }
      if (entries.length > 0) {
        await saveSRPEEntries(entries);
        result.srpe = entries.length;
      }
    }

    // Migrate GPS data
    const gpsRaw = localStorage.getItem("kenshin_gps_data");
    if (gpsRaw) {
      const gpsData = JSON.parse(gpsRaw);
      // GPS data stays in localStorage for now (large volume),
      // but we save the summary via sRPE
      result.gps = Array.isArray(gpsData) ? gpsData.length : 0;
    }
  } catch (e: any) {
    result.errors.push(e.message);
  }

  return result;
}
