"use client";

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
  notes: string;
}

const STORAGE_KEY = "roster_players";

export function getPlayers(): PlayerRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function savePlayers(players: PlayerRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

export function addPlayer(p: Omit<PlayerRecord, "id">): PlayerRecord {
  const players = getPlayers();
  const newPlayer: PlayerRecord = { ...p, id: Date.now().toString() };
  players.push(newPlayer);
  savePlayers(players);
  return newPlayer;
}

export function updatePlayer(id: string, updates: Partial<PlayerRecord>): void {
  const players = getPlayers().map((p) => (p.id === id ? { ...p, ...updates } : p));
  savePlayers(players);
}

export function deletePlayer(id: string): void {
  savePlayers(getPlayers().filter((p) => p.id !== id));
}

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

  return rows.slice(1).map((row) => ({
    name: String(row[nameIdx] || "").trim(),
    position: String(row[posIdx] || "").trim(),
    number: String(row[numIdx] || "").trim(),
    age: row[ageIdx] ? Number(row[ageIdx]) || null : null,
    height: row[heightIdx] ? Number(row[heightIdx]) || null : null,
    weight: row[weightIdx] ? Number(row[weightIdx]) || null : null,
    injuryStatus: "healthy" as const,
    injuryNote: String(row[injuryIdx] || "").trim(),
    notes: String(row[notesIdx] || "").trim(),
  })).filter((p) => p.name);
}
