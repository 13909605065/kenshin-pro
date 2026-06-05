"use client";

import { createClient } from "@/lib/supabase/supabase-client";

export interface PlayerRecord {
  id: string;
  name: string;
  position: string;
  number: string;
  age: number | null;
  height: number | null;
  weight: number | null;
  injuryStatus: "healthy" | "minor" | "out";
  injuryNote: string;
  injuryHistory: string;       // 伤病史（如"2024-03 ACL重建右膝"）
  disabledExercises: string[]; // 禁用动作（如["深蹲","高翻"]）
  notes: string;
}

const STORAGE_KEY = "roster_players";

// ---------------------------------------------------------------------------
// Helpers: camelCase (JS) <-> snake_case (Supabase)
// ---------------------------------------------------------------------------

/** Map a Supabase row (snake_case) to a PlayerRecord (camelCase). */
function mapRowToPlayer(row: Record<string, unknown>): PlayerRecord {
  let disabled: string[] = [];
  try { const d = row.disabled_exercises; disabled = Array.isArray(d) ? d : (typeof d === 'string' ? JSON.parse(d) : []); } catch { disabled = []; }
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    position: String(row.position ?? ""),
    number: String(row.number ?? ""),
    age: row.age != null ? Number(row.age) : null,
    height: row.height != null ? Number(row.height) : null,
    weight: row.weight != null ? Number(row.weight) : null,
    injuryStatus: (row.injury_status as PlayerRecord["injuryStatus"]) || "healthy",
    injuryNote: String(row.injury_note ?? ""),
    injuryHistory: String(row.injury_history ?? ""),
    disabledExercises: disabled,
    notes: String(row.notes ?? ""),
  };
}

/** Map a PlayerRecord partial to a Supabase-columns object (snake_case). */
function mapPlayerToRow(p: Partial<PlayerRecord>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.position !== undefined) row.position = p.position;
  if (p.number !== undefined) row.number = p.number;
  if (p.age !== undefined) row.age = p.age;
  if (p.height !== undefined) row.height = p.height;
  if (p.weight !== undefined) row.weight = p.weight;
  if (p.injuryStatus !== undefined) row.injury_status = p.injuryStatus;
  if (p.injuryNote !== undefined) row.injury_note = p.injuryNote;
  if (p.injuryHistory !== undefined) row.injury_history = p.injuryHistory;
  if (p.disabledExercises !== undefined) row.disabled_exercises = p.disabledExercises;
  if (p.notes !== undefined) row.notes = p.notes;
  return row;
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

/** Get the current authenticated user ID, or null if not logged in. */
async function getUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// localStorage fallback (synchronous)
// ---------------------------------------------------------------------------

function getLocalPlayers(): PlayerRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as PlayerRecord[];
  } catch {
    return [];
  }
}

function saveLocalPlayers(players: PlayerRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  } catch {
    // quota exceeded or disabled — swallow silently
  }
}

// ---------------------------------------------------------------------------
// Public API — Supabase-primary, localStorage-fallback
// ---------------------------------------------------------------------------

/* Pull from cloud on first load */
let cloudPulled = false;
async function pullFromCloud() {
  if (cloudPulled) return;
  cloudPulled = true;
  try {
    const userId = await getUserId();
    if (!userId) return;
    const supabase = createClient();
    const { data } = await supabase.from("roster_players").select("*").eq("user_id", userId).order("created_at", { ascending: true });
    if (data?.length) saveLocalPlayers(data.map(mapRowToPlayer));
  } catch {}
}

/** Sync read — localStorage primary for instant UI */
export function getPlayers(): PlayerRecord[] {
  pullFromCloud();
  return getLocalPlayers();
}

/* Sync save + background cloud */
export function savePlayers(players: PlayerRecord[]): void {
  saveLocalPlayers(players);
  getUserId().then(userId => {
    if (!userId) return;
    createClient().from("roster_players").upsert(players.map(p => ({ id: p.id, user_id: userId, ...mapPlayerToRow(p) })), { onConflict: "id" }).then(({ error }) => { if (error) console.warn("roster sync:", error); });
  });
}

export function addPlayer(p: Omit<PlayerRecord, "id">): PlayerRecord {
  const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2);
  const np: PlayerRecord = { ...p, id: newId };
  const local = getLocalPlayers();
  local.push(np);
  saveLocalPlayers(local);
  getUserId().then(userId => { if (userId) createClient().from("roster_players").insert({ id: newId, user_id: userId, ...mapPlayerToRow(np) }).then(({ error }) => { if (error) console.warn("addPlayer sync:", error); }); });
  return np;
}

export function updatePlayer(id: string, updates: Partial<PlayerRecord>): void {
  const local = getLocalPlayers().map(p => p.id === id ? { ...p, ...updates } : p);
  saveLocalPlayers(local);
  getUserId().then(userId => { if (userId) createClient().from("roster_players").update(mapPlayerToRow(updates)).eq("id", id).eq("user_id", userId).then(({ error }) => { if (error) console.warn("updatePlayer sync:", error); }); });
}

export function deletePlayer(id: string): void {
  saveLocalPlayers(getLocalPlayers().filter(p => p.id !== id));
  getUserId().then(userId => { if (userId) createClient().from("roster_players").delete().eq("id", id).eq("user_id", userId).then(({ error }) => { if (error) console.warn("deletePlayer sync:", error); }); });
}

// ---------------------------------------------------------------------------
// Excel parsing (unchanged — pure, no I/O)
// ---------------------------------------------------------------------------

/** Parse Excel .xlsx data into PlayerRecord array */
export function parseExcelData(
  rows: (string | number | null)[][]
): Omit<PlayerRecord, "id">[] {
  if (rows.length < 2) return [];

  // Try to detect header row
  const header = rows[0].map((h) => String(h || "").trim().toLowerCase());
  const nameIdx = header.findIndex((h) => h.includes("姓名") || h.includes("name"));
  const posIdx = header.findIndex(
    (h) => h.includes("位置") || h.includes("position")
  );
  const numIdx = header.findIndex(
    (h) => h.includes("号码") || h.includes("number") || h.includes("编号")
  );
  const ageIdx = header.findIndex((h) => h.includes("年龄") || h.includes("age"));
  const heightIdx = header.findIndex(
    (h) => h.includes("身高") || h.includes("height")
  );
  const weightIdx = header.findIndex(
    (h) => h.includes("体重") || h.includes("weight")
  );
  const injuryIdx = header.findIndex(
    (h) => h.includes("伤病") || h.includes("injury")
  );
  const notesIdx = header.findIndex(
    (h) => h.includes("备注") || h.includes("notes")
  );

  return rows
    .slice(1)
    .map((row) => ({
      name: String(row[nameIdx] || "").trim(),
      position: String(row[posIdx] || "").trim(),
      number: String(row[numIdx] || "").trim(),
      age: row[ageIdx] ? Number(row[ageIdx]) || null : null,
      height: row[heightIdx] ? Number(row[heightIdx]) || null : null,
      weight: row[weightIdx] ? Number(row[weightIdx]) || null : null,
      injuryStatus: "healthy" as const,
      injuryNote: String(row[injuryIdx] || "").trim(),
      injuryHistory: "",
      disabledExercises: [] as string[],
      notes: String(row[notesIdx] || "").trim(),
    }))
    .filter((p) => p.name);
}
