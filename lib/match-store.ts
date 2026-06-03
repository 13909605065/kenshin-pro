"use client";

import type { MatchRecord } from "./match-types";
export type { MatchRecord };

const KEY = "kenshin_matches";

export function getMatches(): MatchRecord[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function saveMatches(matches: MatchRecord[]): void {
  localStorage.setItem(KEY, JSON.stringify(matches));
}

export function addMatch(m: Omit<MatchRecord, "id">): MatchRecord {
  const matches = getMatches();
  const record: MatchRecord = { ...m, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) };
  matches.push(record);
  saveMatches(matches);
  return record;
}

export function updateMatch(id: string, data: Partial<MatchRecord>): void {
  const matches = getMatches();
  const idx = matches.findIndex(m => m.id === id);
  if (idx >= 0) { matches[idx] = { ...matches[idx], ...data }; saveMatches(matches); }
}

export function deleteMatch(id: string): void {
  saveMatches(getMatches().filter(m => m.id !== id));
}

export function getNextMatch(): MatchRecord | null {
  const upcoming = getMatches()
    .filter(m => m.status === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] || null;
}

/* Excel import: parse rows like { 日期, 时间, 对手, 主/客, 场地, 联赛 } */
export function importMatches(rows: Record<string, string>[]): MatchRecord[] {
  const existing = getMatches();
  const created: MatchRecord[] = [];

  rows.forEach(row => {
    const dateStr = row["日期"] || row["date"] || "";
    if (!dateStr) return;
    const opponent = row["对手"] || row["opponent"] || "";
    if (!opponent) return;

    const locRaw = (row["主/客"] || row["location"] || "home").trim();
    const location: "home" | "away" = locRaw.includes("客") || locRaw === "away" ? "away" : "home";

    const match: MatchRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(0, 2),
      date: dateStr,
      time: row["时间"] || row["time"] || undefined,
      opponent,
      location,
      venue: row["场地"] || row["venue"] || undefined,
      league: row["联赛"] || row["league"] || undefined,
      opponentStyle: row["对手特点"] || row["style"] || undefined,
      opponentWeakness: row["对手弱点"] || row["weakness"] || undefined,
      status: "upcoming",
    };

    // Avoid duplicates
    const dup = existing.find(e => e.date === match.date && e.opponent === match.opponent);
    if (!dup) {
      existing.push(match);
      created.push(match);
    }
  });

  saveMatches(existing);
  return created;
}
