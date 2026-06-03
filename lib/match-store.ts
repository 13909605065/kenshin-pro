"use client";

import type { MatchRecord } from "./match-types";
import { createClient } from "@/lib/supabase/supabase-client";
export type { MatchRecord };

const KEY = "kenshin_matches";

/* Sync read — localStorage is source of truth for instant UI */
function loadLocal(): MatchRecord[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function saveLocal(matches: MatchRecord[]): void {
  localStorage.setItem(KEY, JSON.stringify(matches));
}

/* Fire-and-forget Supabase sync */
async function syncToCloud(matches: MatchRecord[]) {
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const cleaned = matches.map(m => ({
      id: m.id, user_id: user.id, date: m.date, time: m.time,
      opponent: m.opponent, location: m.location, venue: m.venue,
      league: m.league, opponent_style: m.opponentStyle,
      opponent_weakness: m.opponentWeakness, our_issues: m.ourIssues,
      notes: m.notes, result: m.result, status: m.status,
    }));
    await sb.from("matches").upsert(cleaned, { onConflict: "id" });
  } catch {}
}

/* Pull from cloud on first load */
let cloudPulled = false;
async function pullFromCloud() {
  if (cloudPulled) return;
  cloudPulled = true;
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { data } = await sb.from("matches").select("*").eq("user_id", user.id).order("date", { ascending: true });
    if (data?.length) {
      const mapped: MatchRecord[] = data.map((r: any) => ({
        id: r.id, date: r.date, time: r.time, opponent: r.opponent,
        location: r.location || "home", venue: r.venue, league: r.league,
        opponentStyle: r.opponent_style, opponentWeakness: r.opponent_weakness,
        ourIssues: r.our_issues, notes: r.notes, result: r.result,
        status: r.status || "upcoming",
      }));
      saveLocal(mapped);
    }
  } catch {}
}

export function getMatches(): MatchRecord[] {
  pullFromCloud();
  return loadLocal();
}

export function saveMatches(matches: MatchRecord[]): void {
  saveLocal(matches);
  syncToCloud(matches);
}

export function addMatch(m: Omit<MatchRecord, "id">): MatchRecord {
  const record: MatchRecord = { ...m, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) };
  const local = loadLocal();
  local.push(record);
  saveLocal(local);
  syncToCloud(local);
  return record;
}

export function updateMatch(id: string, data: Partial<MatchRecord>): void {
  const local = loadLocal();
  const idx = local.findIndex(m => m.id === id);
  if (idx >= 0) { local[idx] = { ...local[idx], ...data }; saveLocal(local); syncToCloud(local); }
}

export function deleteMatch(id: string): void {
  const local = loadLocal().filter(m => m.id !== id);
  saveLocal(local);
  syncToCloud(local);
}

export function getNextMatch(): MatchRecord | null {
  const upcoming = getMatches().filter(m => m.status === "upcoming").sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] || null;
}

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
    const match: MatchRecord = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(0, 2), date: dateStr, time: row["时间"] || row["time"] || undefined, opponent, location, venue: row["场地"] || row["venue"] || undefined, league: row["联赛"] || row["league"] || undefined, opponentStyle: row["对手特点"] || row["style"] || undefined, opponentWeakness: row["对手弱点"] || row["weakness"] || undefined, status: "upcoming" };
    const dup = existing.find(e => e.date === match.date && e.opponent === match.opponent);
    if (!dup) { existing.push(match); created.push(match); }
  });
  saveLocal(existing);
  syncToCloud(existing);
  return created;
}
