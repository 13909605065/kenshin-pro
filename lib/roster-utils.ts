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
 * Keyword variants for header detection — order matters (more specific first).
 * Each field has Chinese + English variants + common abbreviation patterns.
 */
const FIELD_KEYWORDS: Record<string, string[]> = {
  name: [
    "姓名", "名字", "球员", "队员", "名称", "球员姓名", "队员名称",
    "name", "player", "player name", "athlete", "full name",
  ],
  position: [
    "位置", "场上位置", "职位",
    "position", "pos", "role",
  ],
  number: [
    "号码", "编号", "背号", "球衣号", "球衣号码", "队号",
    "number", "jersey", "squad number", "no.", "num",
  ],
  age: [
    "年龄", "岁数",
    "age",
  ],
  height: [
    "身高", "高度",
    "height", "ht",
  ],
  weight: [
    "体重", "重量",
    "weight", "wt",
  ],
  injury: [
    "伤病", "伤情", "伤势", "伤病状态", "状态", "伤停", "受伤", "伤病史", "伤病情况",
    "injury", "status", "injury status", "condition",
  ],
  notes: [
    "备注", "说明", "注释", "信息", "其他", "补充",
    "notes", "note", "remark", "comment", "memo", "description",
  ],
};

/** Find column index by matching header against keyword list */
function findFieldIdx(headers: string[], field: string): number {
  const keywords = FIELD_KEYWORDS[field] || [];
  return headers.findIndex((h) =>
    keywords.some((kw) => h === kw || h.includes(kw))
  );
}

/** Analyze data rows to infer column types by content patterns */
function inferColumnTypes(
  rows: (string | number | null)[][],
  usedIndices: Set<number>
): Record<string, number> {
  const inferred: Record<string, number> = {};
  const dataRows = rows.slice(1).filter((r) => r && r.some((c) => c != null && String(c).trim() !== ""));
  if (dataRows.length === 0) return inferred;

  const colCount = Math.max(...dataRows.map((r) => r.length), rows[0]?.length || 0);

  for (let col = 0; col < colCount; col++) {
    if (usedIndices.has(col)) continue;
    const samples = dataRows.map((r) => String(r[col] ?? "").trim()).filter(Boolean);
    if (samples.length === 0) continue;

    // Infer NAME: mostly non-numeric, mixed Chinese/English text
    const isName = !inferred.name &&
      samples.every((s) => !/^\d+$/.test(s)) &&
      samples.length >= Math.min(1, Math.floor(dataRows.length * 0.5));
    if (isName) { inferred.name = col; usedIndices.add(col); continue; }

    // Infer AGE: integer 10-65
    const ageNums = samples.map(Number).filter((n) => Number.isInteger(n) && n >= 10 && n <= 65);
    if (!inferred.age && ageNums.length >= Math.min(1, Math.floor(samples.length * 0.7))) {
      inferred.age = col; usedIndices.add(col); continue;
    }

    // Infer HEIGHT: numbers 130-250
    const hNums = samples.map(Number).filter((n) => n >= 130 && n <= 250);
    if (!inferred.height && hNums.length >= Math.min(1, Math.floor(samples.length * 0.7))) {
      inferred.height = col; usedIndices.add(col); continue;
    }

    // Infer WEIGHT: numbers 30-150
    const wNums = samples.map(Number).filter((n) => n >= 30 && n <= 150);
    if (!inferred.weight && wNums.length >= Math.min(1, Math.floor(samples.length * 0.7))) {
      inferred.weight = col; usedIndices.add(col); continue;
    }

    // Infer NUMBER: short integers 1-99 (jersey numbers)
    const jerseyNums = samples.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 99);
    if (!inferred.number && jerseyNums.length >= Math.min(1, Math.floor(samples.length * 0.5))) {
      inferred.number = col; usedIndices.add(col); continue;
    }

    // Infer POSITION: short text, likely position names
    const posText = samples.filter((s) => s.length <= 10);
    if (!inferred.position && posText.length >= Math.min(1, Math.floor(samples.length * 0.5))) {
      inferred.position = col; usedIndices.add(col); continue;
    }

    // Infer INJURY: contains injury-related keywords or short text
    const hasInjuryKW = samples.some((s) =>
      /伤|痛|伤停|恢复|扭伤|拉伤|骨折|发炎|炎症|injury|pain|out|healthy|minor/i.test(s)
    );
    if (!inferred.injury && hasInjuryKW) {
      inferred.injury = col; usedIndices.add(col); continue;
    }
  }

  return inferred;
}

/** Parse injury status string into our enum */
function parseInjuryStatus(raw: string): { status: PlayerRecord["injuryStatus"]; note: string } {
  const s = raw.trim().toLowerCase();
  if (!s) return { status: "healthy", note: "" };

  // Chinese mappings
  if (/重伤|缺阵|out|重伤缺阵|无法出场|伤停/.test(s)) return { status: "out", note: raw.trim() };
  if (/轻伤|minor|轻微|小伤|不适|微伤/.test(s)) return { status: "minor", note: raw.trim() };
  if (/健康|healthy|良好|正常|无伤|ok|fine/.test(s)) return { status: "healthy", note: "" };

  // If it looks like a specific injury description (contains body parts or symptoms)
  if (/扭|拉|裂|折|炎|肿|痛|肌|膝|踝|腿|肩|腰|背|腕|肘|跟腱|韧带|半月板|acl|mcl|腘绳|腹股沟|股四头|小腿|大腿/.test(raw.trim())) {
    // Determine severity from keywords
    if (/断裂|撕裂|骨折|手术|重建|iii级|3级|三度/.test(raw.trim())) {
      return { status: "out", note: raw.trim() };
    }
    return { status: "minor", note: raw.trim() };
  }

  // Default: treat non-empty as injury note, status minor
  return { status: "minor", note: raw.trim() };
}

/**
 * Parse Excel .xlsx / CSV data into PlayerRecord array.
 * Smart detection: header matching → content-based inference → position fallback.
 */
export function parseExcelData(
  rows: (string | number | null)[][]
): ParseResult {
  const warnings: string[] = [];
  if (rows.length < 2) {
    return { players: [], warnings: ["文件为空或只有表头，无数据行"] };
  }

  if (typeof console !== "undefined") {
    console.log("[roster-utils] parseExcelData input:", rows.length, "rows, header:", rows[0]);
  }

  // Step 1: Try header-based detection
  const header = rows[0].map((h) => String(h || "").trim().toLowerCase());
  let nameIdx = findFieldIdx(header, "name");
  let posIdx = findFieldIdx(header, "position");
  let numIdx = findFieldIdx(header, "number");
  let ageIdx = findFieldIdx(header, "age");
  let heightIdx = findFieldIdx(header, "height");
  let weightIdx = findFieldIdx(header, "weight");
  let injuryIdx = findFieldIdx(header, "injury");
  let notesIdx = findFieldIdx(header, "notes");

  // Step 2: Content-based inference for undetected columns
  const usedIndices = new Set<number>();
  [nameIdx, posIdx, numIdx, ageIdx, heightIdx, weightIdx, injuryIdx, notesIdx]
    .forEach((idx) => { if (idx >= 0) usedIndices.add(idx); });
  const inferred = inferColumnTypes(rows, usedIndices);

  if (nameIdx < 0) nameIdx = inferred.name ?? -1;
  if (posIdx < 0) posIdx = inferred.position ?? -1;
  if (numIdx < 0) numIdx = inferred.number ?? -1;
  if (ageIdx < 0) ageIdx = inferred.age ?? -1;
  if (heightIdx < 0) heightIdx = inferred.height ?? -1;
  if (weightIdx < 0) weightIdx = inferred.weight ?? -1;
  if (injuryIdx < 0) injuryIdx = inferred.injury ?? -1;
  if (notesIdx < 0) notesIdx = inferred.notes ?? -1;

  // Step 3: Position-based fallback if name still not found
  if (nameIdx < 0) {
    nameIdx = 0;
    warnings.push("未检测到「姓名」列，已按第1列作为姓名解析");
  }
  if (posIdx < 0) posIdx = 1;
  if (numIdx < 0) numIdx = 2;
  if (ageIdx < 0) ageIdx = 3;
  if (heightIdx < 0) heightIdx = 4;
  if (weightIdx < 0) weightIdx = 5;
  if (injuryIdx < 0) injuryIdx = 6;
  if (notesIdx < 0) notesIdx = 7;

  console.log("[roster-utils] 列映射:", {
    name: nameIdx, position: posIdx, number: numIdx,
    age: ageIdx, height: heightIdx, weight: weightIdx,
    injury: injuryIdx, notes: notesIdx,
    inferredFields: Object.keys(inferred),
  });

  // Step 4: Parse data rows
  const players: Omit<PlayerRecord, "id">[] = [];
  let emptyRowCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c == null || String(c).trim() === "")) {
      emptyRowCount++;
      continue;
    }

    const rowNum = i + 1;

    const name = String(row[nameIdx] ?? "").trim();
    if (!name) {
      warnings.push(`第${rowNum}行缺少姓名，已跳过`);
      continue;
    }

    // Validate numeric fields
    const ageRaw = row[ageIdx];
    const ageResult = validateNum(ageRaw, "年龄", rowNum, 10, 65);

    const heightRaw = row[heightIdx];
    const heightResult = validateNum(heightRaw, "身高", rowNum, 130, 250);

    const weightRaw = row[weightIdx];
    const weightResult = validateNum(weightRaw, "体重", rowNum, 30, 150);

    if (ageResult.warning) warnings.push(ageResult.warning);
    if (heightResult.warning) warnings.push(heightResult.warning);
    if (weightResult.warning) warnings.push(weightResult.warning);

    // Parse injury status with smart detection
    const injuryRaw = String(row[injuryIdx] ?? "").trim();
    const injuryParsed = parseInjuryStatus(injuryRaw);

    players.push({
      name,
      position: String(row[posIdx] ?? "").trim(),
      number: String(row[numIdx] ?? "").trim(),
      age: ageResult.num,
      height: heightResult.num,
      weight: weightResult.num,
      injuryStatus: injuryParsed.status,
      injuryNote: injuryParsed.note,
      injuryHistory: "",
      disabledExercises: [] as string[],
      notes: String(row[notesIdx] ?? "").trim(),
    });
  }

  if (emptyRowCount > 0 && players.length === 0) {
    warnings.push(`${emptyRowCount} 行数据均为空，请检查 Excel 内容`);
  }

  if (players.length === 0 && warnings.length === 0) {
    warnings.push("未识别到有效球员数据，请检查 Excel 格式");
  }

  if (typeof console !== "undefined") {
    console.log("[roster-utils] parseExcelData result:", players.length, "players,", warnings.length, "warnings", warnings);
  }

  return { players, warnings };
}
