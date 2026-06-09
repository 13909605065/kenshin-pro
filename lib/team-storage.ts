/**
 * Team-scoped localStorage utilities.
 *
 * Every data key is automatically namespaced by the active team ID.
 * Switching teams in the UI changes getActiveTeamId() → all reads/writes
 * transparently target the new team's data.
 */

const TEAMS_KEY = "kenshin_teams";
const ACTIVE_TEAM_KEY = "kenshin_active_team_id";

const isBrowser = typeof window !== "undefined";

// ---------------------------------------------------------------------------
// Active team ID
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
  // Team-scoped keys look like: something_uuid_or_timestamp
  // Non-scoped keys are plain like: kenshin_gps_data
  // Heuristic: if key ends with _ followed by 20+ alphanumeric chars, it's scoped
  return /_[a-z0-9_-]{20,}$/.test(key) || key.endsWith("_server_");
}

// Set of keys that have been migrated (in-memory, per session)
const migratedKeys = new Set<string>();

/**
 * Migrate old unscoped key to team-scoped key on first access.
 * Moves data from `baseKey` → `baseKey_teamId` so existing data isn't lost.
 */
function migrateIfNeeded(baseKey: string, teamId: string): void {
  if (!isBrowser || migratedKeys.has(baseKey)) return;
  migratedKeys.add(baseKey);

  // Already team-scoped? Skip.
  if (isAlreadyScoped(baseKey)) return;

  const scopedKey = teamKey(baseKey, teamId);
  // Only migrate if scoped key doesn't exist AND unscoped key does
  if (localStorage.getItem(scopedKey) !== null) return;

  try {
    const old = localStorage.getItem(baseKey);
    if (old !== null) {
      localStorage.setItem(scopedKey, old);
      // Don't delete old key — user might switch back to unscoped?
      // Actually, delete it to avoid confusion after confirming migration works.
      // But for safety, keep it for now (first deploy).
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
  localStorage.setItem(teamKey(baseKey, teamId), value);
}

export function teamRemove(baseKey: string): void {
  if (!isBrowser) return;
  const teamId = getActiveTeamId();
  localStorage.removeItem(teamKey(baseKey, teamId));
}
