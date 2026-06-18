/**
 * Team-scoped localStorage + Supabase sync utilities.
 *
 * STRATEGY: localStorage is the FAST READ layer (synchronous, instant).
 * Supabase is the SOURCE OF TRUTH for cross-device sync.
 *
 * - Reads: localStorage (instant) + background Supabase pull on init
 * - Writes: localStorage (instant) + fire-and-forget Supabase push
 * - On app init: pull teams + active_team_id from Supabase → update localStorage
 *
 * Every data key is automatically namespaced by the active team ID.
 * Switching teams in the UI changes getActiveTeamId() → all reads/writes
 * transparently target the new team's data.
 */

import { createClient } from "@/lib/supabase/supabase-client";

const TEAMS_KEY = "kenshin_teams";
const ACTIVE_TEAM_KEY = "kenshin_active_team_id";

const isBrowser = typeof window !== "undefined";

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function getUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

/** Pull teams from Supabase → update localStorage. Returns true if data was pulled. */
async function pullTeamsFromCloud(): Promise<boolean> {
  try {
    const userId = await getUserId();
    if (!userId) return false;
    const supabase = createClient();
    const { data, error } = await supabase.from("teams").select("*").eq("user_id", userId).order("created_at", { ascending: true });
    if (error || !data) return false;
    if (data.length > 0) {
      const teams: Team[] = data.map(r => ({ id: r.id, name: r.name, createdAt: r.created_at }));
      localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
      return true;
    }
    return false;
  } catch { return false; }
}

/** Pull active_team_id from Supabase → update localStorage (only if local has no data or cloud is newer). */
async function pullActiveTeamFromCloud(): Promise<boolean> {
  try {
    const userId = await getUserId();
    if (!userId) return false;
    const supabase = createClient();
    const { data, error } = await supabase.from("user_prefs").select("active_team_id").eq("user_id", userId).single();
    if (error || !data?.active_team_id) return false;

    const cloudTeamId = data.active_team_id;
    const localTeamId = localStorage.getItem(ACTIVE_TEAM_KEY);

    // If same, nothing to do
    if (localTeamId === cloudTeamId) return true;

    // If local has roster data but cloud doesn't, keep local (don't lose data)
    if (localTeamId) {
      const localRoster = localStorage.getItem(`roster_players_${localTeamId}`);
      const hasLocalData = localRoster && localRoster !== "[]";
      if (hasLocalData) {
        // Local has data — push local team ID to cloud instead
        await pushActiveTeamToCloud(localTeamId);
        return true;
      }
    }

    // Cloud team wins — update localStorage
    localStorage.setItem(ACTIVE_TEAM_KEY, cloudTeamId);
    return true;
  } catch { return false; }
}

/** Push all teams to Supabase (upsert per team). */
async function pushTeamsToCloud(teams: Team[]): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    const supabase = createClient();
    // Delete teams not in current list, then upsert current
    const currentIds = teams.map(t => t.id);
    // Get existing IDs from cloud
    const { data: existing } = await supabase.from("teams").select("id").eq("user_id", userId);
    if (existing) {
      const existingIds = existing.map((r: any) => r.id);
      const toDelete = existingIds.filter((id: string) => !currentIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("teams").delete().in("id", toDelete).eq("user_id", userId);
      }
    }
    // Upsert all current teams
    const rows = teams.map(t => ({ id: t.id, user_id: userId, name: t.name, created_at: t.createdAt }));
    const { error } = await supabase.from("teams").upsert(rows, { onConflict: "id" });
    if (error) console.warn("[team-storage] pushTeamsToCloud error:", error);
  } catch (e) { console.warn("[team-storage] pushTeamsToCloud failed:", e); }
}

/** Push active_team_id to Supabase. */
async function pushActiveTeamToCloud(teamId: string): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    const supabase = createClient();
    const { error } = await supabase.from("user_prefs").upsert({
      user_id: userId,
      active_team_id: teamId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) console.warn("[team-storage] pushActiveTeamToCloud error:", error);
  } catch (e) { console.warn("[team-storage] pushActiveTeamToCloud failed:", e); }
}

// ---------------------------------------------------------------------------
// User KV — generic key-value sync for ALL data
// ---------------------------------------------------------------------------

/** Push a single KV pair to Supabase (fire-and-forget). */
async function pushKV(key: string, value: string): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    const supabase = createClient();
    const { error } = await supabase.from("user_kv").upsert({
      user_id: userId, key, value,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id, key" });
    if (error) console.warn("[team-storage] pushKV error:", error);
  } catch (e) { /* silent */ }
}

/** Pull all KV pairs from Supabase → localStorage. Returns count of pulled keys. */
async function pullAllKVFromCloud(): Promise<number> {
  try {
    const userId = await getUserId();
    if (!userId) return 0;
    const supabase = createClient();
    const { data, error } = await supabase.from("user_kv").select("key, value").eq("user_id", userId);
    if (error || !data) return 0;
    let count = 0;
    for (const row of data) {
      if (row.key && row.value !== undefined) {
        localStorage.setItem(row.key, row.value);
        count++;
      }
    }
    return count;
  } catch { return 0; }
}

// ---------------------------------------------------------------------------
// Init — call once on app mount
// ---------------------------------------------------------------------------

let lastSyncTime = 0;
const SYNC_COOLDOWN = 5000;

/** Called on every page load + window focus. Pull from cloud, push local → cloud. */
export async function initTeamSync(): Promise<void> {
  if (!isBrowser) return;
  const now = Date.now();
  if (now - lastSyncTime < SYNC_COOLDOWN) return;
  lastSyncTime = now;

  // Step 1: Pull ALL KV from cloud (won't overwrite if cloud is empty)
  await pullAllKVFromCloud();

  // Step 2: Pull teams & active team
  const [teamsPulled, activePulled] = await Promise.all([
    pullTeamsFromCloud(),
    pullActiveTeamFromCloud(),
  ]);

  // Step 3: Always push local → cloud (fills any gaps)
  if (!teamsPulled) {
    const localTeams = getTeams();
    if (localTeams.length > 0) await pushTeamsToCloud(localTeams);
  }
  if (!activePulled) {
    const localActive = localStorage.getItem(ACTIVE_TEAM_KEY);
    if (localActive) await pushActiveTeamToCloud(localActive);
  }
  await migrateLocalToCloud();

  // Step 4: Ensure active team is valid
  const teams = getTeams();
  const activeId = getActiveTeamId();
  if (teams.length > 0 && !teams.find(t => t.id === activeId)) {
    setActiveTeamId(teams[0].id);
  }
}

/** Push any localStorage-only keys that aren't yet in Supabase. */
async function migrateLocalToCloud() {
  if (!isBrowser) return;

  // Push ALL global keys we know about
  const globalKeys = [
    "kenshin_season_calendar",
    "kenshin_role", "kenshin_scene", "kenshin_theme", "kenshin_lang",
    "kenshin_onboarding_done", "kenshin_dashboard_draft",
    "coach_profile", "athlete_profile", "kenshin_coach_profile",
    "kenshin_coach_phase", "kenshin_coach_matchDate",
    "kenshin_coach_planMode", "kenshin_coach_weather",
    "kenshin_injury_reports", "kenshin_player_self_reports",
    "kenshin_team_readiness", "warmup_autosave", "kenshin_warmup_library",
  ];
  for (const key of globalKeys) {
    const val = localStorage.getItem(key);
    if (val) await pushKV(key, val);
  }

  // Discover ALL team IDs by scanning localStorage keys
  const discoveredTeamIds = new Set<string>();
  const teamBases = [
    "roster_players", "kenshin_fitness_profiles", "kenshin_history",
    "kenshin_cached_modules", "kenshin_load_data", "kenshin_training_logs",
    "kenshin_gps_data", "kenshin_pr_data", "kenshin_motivation",
  ];

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    for (const base of teamBases) {
      if (k.startsWith(base + "_")) {
        const tid = k.slice(base.length + 1);
        if (tid) discoveredTeamIds.add(tid);
      }
    }
  }

  // Also include known team IDs from teams list + active
  const teams = getTeams();
  for (const t of teams) discoveredTeamIds.add(t.id);
  const activeId = getActiveTeamId();
  if (activeId && activeId !== "_server_") discoveredTeamIds.add(activeId);

  // Push ALL discovered team-scoped data
  for (const tid of Array.from(discoveredTeamIds)) {
    for (const base of teamBases) {
      const key = `${base}_${tid}`;
      const val = localStorage.getItem(key);
      if (val) await pushKV(key, val);
    }
  }
}

// ---------------------------------------------------------------------------
// Active team ID (synchronous, localStorage-backed)
// ---------------------------------------------------------------------------

export function getActiveTeamId(): string {
  if (!isBrowser) return "_server_";
  try {
    const stored = localStorage.getItem(ACTIVE_TEAM_KEY);
    if (stored) return stored;
  } catch {}
  // First time: auto-create default team
  const teams = getTeams();
  if (teams.length > 0) {
    setActiveTeamId(teams[0].id);
    return teams[0].id;
  }
  const id = crypto.randomUUID ? crypto.randomUUID() : "t_" + Date.now().toString(36);
  saveTeams([{ id, name: "我的球队", createdAt: new Date().toISOString() }]);
  setActiveTeamId(id);
  return id;
}

export function setActiveTeamId(id: string): void {
  if (!isBrowser) return;
  localStorage.setItem(ACTIVE_TEAM_KEY, id);
  // Background sync to Supabase
  pushActiveTeamToCloud(id);
}

// ---------------------------------------------------------------------------
// Team CRUD
// ---------------------------------------------------------------------------

export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export function getTeams(): Team[] {
  if (!isBrowser) return [];
  try { return JSON.parse(localStorage.getItem(TEAMS_KEY) || "[]"); } catch { return []; }
}

function saveTeams(teams: Team[]): void {
  if (!isBrowser) return;
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  // Background sync to Supabase
  pushTeamsToCloud(teams);
}

export function addTeam(name: string): Team {
  const id = crypto.randomUUID ? crypto.randomUUID() : "t_" + Date.now().toString(36);
  const team: Team = { id, name: name.trim(), createdAt: new Date().toISOString() };
  if (!isBrowser) return team;
  saveTeams([...getTeams(), team]);
  return team;
}

export function renameTeam(id: string, name: string): void {
  if (!isBrowser) return;
  saveTeams(getTeams().map(t => t.id === id ? { ...t, name: name.trim() } : t));
}

export function deleteTeam(id: string): void {
  if (!isBrowser) return;
  const teams = getTeams().filter(t => t.id !== id);
  saveTeams(teams);
  // If deleted active team, switch to another or recreate default
  if (getActiveTeamId() === id) {
    if (teams.length > 0) {
      setActiveTeamId(teams[0].id);
    } else {
      const newId = crypto.randomUUID ? crypto.randomUUID() : "t_" + Date.now().toString(36);
      saveTeams([{ id: newId, name: "我的球队", createdAt: new Date().toISOString() }]);
      setActiveTeamId(newId);
    }
  }
}

// ---------------------------------------------------------------------------
// Team-scoped key helpers
// ---------------------------------------------------------------------------

/** Build a team-scoped key: `baseKey` → `baseKey_teamId` */
export function teamKey(baseKey: string, teamId?: string): string {
  const tid = teamId || getActiveTeamId();
  return `${baseKey}_${tid}`;
}

/** Check if a key is already team-scoped (has `_teamId` suffix pattern) */
function isAlreadyScoped(key: string): boolean {
  return /_[a-z0-9_-]{20,}$/.test(key) || key.endsWith("_server_");
}

// Set of keys that have been migrated (in-memory, per session)
const migratedKeys = new Set<string>();

/**
 * Migrate old unscoped key to team-scoped key on first access.
 */
function migrateIfNeeded(baseKey: string, teamId: string): void {
  if (!isBrowser || migratedKeys.has(baseKey)) return;
  migratedKeys.add(baseKey);
  if (isAlreadyScoped(baseKey)) return;
  const scopedKey = teamKey(baseKey, teamId);
  if (localStorage.getItem(scopedKey) !== null) return;
  try {
    const old = localStorage.getItem(baseKey);
    if (old !== null) {
      localStorage.setItem(scopedKey, old);
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// Team-scoped get/set/remove
// ---------------------------------------------------------------------------

export function teamGet(baseKey: string): string | null {
  if (!isBrowser) return null;
  const teamId = getActiveTeamId();
  migrateIfNeeded(baseKey, teamId);
  return localStorage.getItem(teamKey(baseKey, teamId));
}

export function teamSet(baseKey: string, value: string): void {
  if (!isBrowser) return;
  const teamId = getActiveTeamId();
  migrateIfNeeded(baseKey, teamId);
  const fullKey = teamKey(baseKey, teamId);
  localStorage.setItem(fullKey, value);
  // Background sync to Supabase (cross-device)
  pushKV(fullKey, value);
}

export function teamRemove(baseKey: string): void {
  if (!isBrowser) return;
  const teamId = getActiveTeamId();
  const fullKey = teamKey(baseKey, teamId);
  localStorage.removeItem(fullKey);
  // Delete from cloud too
  getUserId().then(userId => {
    if (!userId) return;
    createClient().from("user_kv").delete().eq("user_id", userId).eq("key", fullKey).then(() => {});
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Global (non-team-scoped) key-value with Supabase sync
// ---------------------------------------------------------------------------

/** Set a global (non-team-scoped) value — localStorage + Supabase. */
export function userSet(key: string, value: string): void {
  if (!isBrowser) return;
  localStorage.setItem(key, value);
  pushKV(key, value);
}

/** Get a global (non-team-scoped) value from localStorage. */
export function userGet(key: string): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem(key);
}

/** Remove a global key. */
export function userRemove(key: string): void {
  if (!isBrowser) return;
  localStorage.removeItem(key);
  getUserId().then(userId => {
    if (!userId) return;
    createClient().from("user_kv").delete().eq("user_id", userId).eq("key", key).then(() => {});
  }).catch(() => {});
}
