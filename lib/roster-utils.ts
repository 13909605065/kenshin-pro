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

export interface ParseResult {
  players: Omit<PlayerRecord, "id">[];
  warnings: string[];
}

/** Validate a numeric field and return a warning if out of bounds */
function validateNum(
  value: unknown,
  field: string,
  rowIdx: number,
  min: number,
  max: number
): { num: number | null; warning: string | null } {
  if (value == null || value === "") return { num: null, warning: null };
  const n = Number(value);
  if (isNaN(n)) {
    return { num: null, warning: `第${rowIdx}行「${field}」不是有效数字: "${String(value).slice(0, 20)}"，已忽略` };
  }
  if (n < min || n > max) {
    return { num: null, warning: `第${rowIdx}行「${field}」超出合理范围 (${min}-${max}): ${n}，已忽略` };
  }
  return { num: n, warning: null };
}

/**
 * Parse Excel .xlsx / CSV data into PlayerRecord array.
 * Falls back to position-based mapping when header detection fails.
 */
export function parseExcelData(
  rows: (string | number | null)[][]
): ParseResult {
  const warnings: string[] = [];
  if (rows.length < 2) {
    return { players: [], warnings: ["文件为空或只有表头，无数据行"] };
  }

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

  // If no name column detected at all, fall back to position-based mapping
  const useFallback = nameIdx === -1;
  if (useFallback) {
    warnings.push("未检测到「姓名」列，将按位置解析：第1列=姓名, 第2列=位置, 第3列=号码, 第4列=年龄, 第5列=身高, 第6列=体重, 第7列=伤病, 第8列=备注");
  }

  const players: Omit<PlayerRecord, "id">[] = [];
  let emptyRowCount = 0;

  if (typeof console !== "undefined") {
    console.log("[roster-utils] parseExcelData input:", rows.length, "rows, header:", rows[0]);
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip completely empty rows
    if (!row || row.every((c) => c == null || String(c).trim() === "")) {
      emptyRowCount++;
      continue;
    }

    const rowNum = i + 1; // 1-based for user-facing messages, account for header

    const name = String(
      useFallback ? (row[0] || "") : (row[nameIdx] || "")
    ).trim();
    if (!name) {
      warnings.push(`第${rowNum}行缺少姓名，已跳过`);
      continue;
    }

    // Validate numeric fields
    const ageRaw = useFallback ? row[3] : row[ageIdx];
    const ageResult = validateNum(ageRaw, "年龄", rowNum, 10, 65);

    const heightRaw = useFallback ? row[4] : row[heightIdx];
    const heightResult = validateNum(heightRaw, "身高", rowNum, 130, 250);

    const weightRaw = useFallback ? row[5] : row[weightIdx];
    const weightResult = validateNum(weightRaw, "体重", rowNum, 30, 150);

    if (ageResult.warning) warnings.push(ageResult.warning);
    if (heightResult.warning) warnings.push(heightResult.warning);
    if (weightResult.warning) warnings.push(weightResult.warning);

    players.push({
      name,
      position: String(
        useFallback ? (row[1] || "") : (row[posIdx] || "")
      ).trim(),
      number: String(
        useFallback ? (row[2] || "") : (row[numIdx] || "")
      ).trim(),
      age: ageResult.num,
      height: heightResult.num,
      weight: weightResult.num,
      injuryStatus: "healthy" as const,
      injuryNote: String(
        useFallback ? (row[6] || "") : (row[injuryIdx] || "")
      ).trim(),
      injuryHistory: "",
      disabledExercises: [] as string[],
      notes: String(
        useFallback ? (row[7] || "") : (row[notesIdx] || "")
      ).trim(),
    });
  }

  if (emptyRowCount > 0 && players.length === 0) {
    warnings.push(`${emptyRowCount} 行数据均为空，请检查 Excel 内容`);
  }

  if (players.length === 0 && warnings.length === 0) {
    warnings.push("未识别到有效球员数据，请检查 Excel 格式");
  }

  if (typeof console !== "undefined") {
    console.log("[roster-utils] parseExcelData result:", players.length, "players,", warnings.length, "warnings");
  }

  return { players, warnings };
}
