// ACWR = Acute:Chronic Workload Ratio = 最近7天负荷 / 最近28天平均负荷
// Safe: 0.8-1.3, Warning: 1.3-1.5, Danger: >1.5 or <0.8

export interface LoadEntry {
  date: string; // ISO date string YYYY-MM-DD
  sRPE: number; // 1-10
  duration: number; // minutes
}

export interface ACWRResult {
  acwr: number;
  status: "safe" | "warning" | "danger";
  message: string;
}

export interface PlayerLoadData {
  [playerName: string]: LoadEntry[];
}

import { teamGet, teamSet, teamRemove } from "@/lib/team-storage";

const LOAD_KEY = "kenshin_load_data";

/**
 * Calculate ACWR from recent load entries.
 * recentLoads should be sorted by date descending, covering up to 28 days.
 */
export function calcACWR(recentLoads: LoadEntry[]): ACWRResult {
  if (recentLoads.length === 0) {
    return { acwr: 1, status: "safe", message: "无负荷数据，默认安全" };
  }

  const acute = recentLoads.slice(0, 7).reduce((s, e) => s + e.sRPE * e.duration, 0) / 7;
  const chronic =
    recentLoads.reduce((s, e) => s + e.sRPE * e.duration, 0) / Math.min(recentLoads.length, 28);
  const acwr = chronic > 0 ? acute / chronic : 1;

  let status: "safe" | "warning" | "danger" = "safe";
  let message = "";

  if (acwr > 1.5) {
    status = "danger";
    message = `ACWR=${acwr.toFixed(
      1
    )}，受伤风险显著升高，建议本周减量30-40%`;
  } else if (acwr > 1.3) {
    status = "warning";
    message = `ACWR=${acwr.toFixed(1)}，负荷偏高，关注恢复`;
  } else if (acwr < 0.8) {
    status = "warning";
    message = `ACWR=${acwr.toFixed(1)}，训练量可能不足`;
  } else {
    message = `ACWR=${acwr.toFixed(1)}，负荷在安全区间`;
  }

  return { acwr, status, message };
}

/** Read all load data from localStorage */
export function getLoadData(): PlayerLoadData {
  try {
    const raw = teamGet(LOAD_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Save all load data to localStorage */
export function saveLoadData(data: PlayerLoadData): void {
  try {
    teamSet(LOAD_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("localStorage write failed for load data", e);
  }
}

/** Add a load entry for a specific player */
export function addLoadEntry(playerName: string, entry: LoadEntry): void {
  const data = getLoadData();
  if (!data[playerName]) {
    data[playerName] = [];
  }
  data[playerName].push(entry);
  // Keep sorted by date descending
  data[playerName].sort((a, b) => b.date.localeCompare(a.date));
  // Keep at most 35 days of data
  if (data[playerName].length > 35) {
    data[playerName] = data[playerName].slice(0, 35);
  }
  saveLoadData(data);
}

/** Get load entries for a specific player (sorted by date descending) */
export function getPlayerLoadEntries(playerName: string): LoadEntry[] {
  const data = getLoadData();
  return data[playerName] || [];
}

/** Get ACWR for a specific player */
export function getPlayerACWR(playerName: string): ACWRResult {
  const entries = getPlayerLoadEntries(playerName);
  return calcACWR(entries);
}

/** Get all players who have ACWR warning or danger status */
export function getAtRiskPlayers(): { name: string; result: ACWRResult }[] {
  const data = getLoadData();
  const atRisk: { name: string; result: ACWRResult }[] = [];
  for (const [name, entries] of Object.entries(data)) {
    const result = calcACWR(entries);
    if (result.status === "warning" || result.status === "danger") {
      atRisk.push({ name, result });
    }
  }
  return atRisk;
}

/** Delete all load data for a player */
export function deletePlayerLoadData(playerName: string): void {
  const data = getLoadData();
  delete data[playerName];
  saveLoadData(data);
}

// ═══════════════════════════════════════════
// UNIFIED READ — single source: kenshin_daily_training_log
// ═══════════════════════════════════════════

export interface UnifiedTRIMPEntry {
  playerName: string;
  date: string;
  trimp: number;
  trainType: string;
  savedAt?: string;
}

/** Read ALL player TRIMP from the unified store (kenshin_daily_training_log).
 *  Handles both new format {players: [{name, trimp}]} and old format {players: ["name"]}. */
export function getAllPlayerTRIMP(): UnifiedTRIMPEntry[] {
  try {
    const raw = localStorage.getItem("kenshin_daily_training_log");
    if (!raw) return [];
    const logs = JSON.parse(raw);
    const results: UnifiedTRIMPEntry[] = [];
    for (const log of logs) {
      const date = log.date;
      const trainType = log.trainType || 'pitch';
      const players = log.players;
      if (!Array.isArray(players)) continue;
      for (const p of players) {
        if (typeof p === 'object' && p.name) {
          results.push({ playerName: p.name, date, trimp: p.trimp || 0, trainType });
        } else if (typeof p === 'string') {
          // Old format: just names, no TRIMP. Estimate from duration.
          const trimp = log.duration && players.length > 0
            ? Math.round((log.duration * 2.0) / players.length)
            : 0;
          results.push({ playerName: p, date, trimp, trainType });
        }
      }
    }
    return results;
  } catch { return []; }
}

/** Clear all load data */
export function clearAllLoadData(): void {
  try {
    teamRemove(LOAD_KEY);
  } catch {}
}

// ═══════════════════════════════════════
// Supabase-backed data layer (2026-06-11)
// These replace localStorage functions above.
// Old functions kept for backward compatibility during migration.
// ═══════════════════════════════════════

import { getSRPEEntries, type SRPEEntry } from "./monitoring-client";

/** Convert Supabase sRPE entries to LoadEntry[] for ACWR calculation */
export function srpeToLoadEntries(entries: SRPEEntry[]): LoadEntry[] {
  return entries.map(e => ({
    date: e.session_date,
    sRPE: e.rpe_score,
    duration: e.duration_min,
  })).sort((a, b) => b.date.localeCompare(a.date));
}

/** Get ACWR for a specific player from Supabase (async) */
export async function getPlayerACWRSupabase(playerName: string): Promise<ACWRResult> {
  const entries = await getSRPEEntries({ player: playerName });
  const loads = srpeToLoadEntries(entries);
  return calcACWR(loads);
}

/** Get all players who have ACWR warning or danger status from Supabase */
export async function getAtRiskPlayersSupabase(): Promise<{ name: string; result: ACWRResult }[]> {
  const entries = await getSRPEEntries();
  // Group by player
  const byPlayer: Record<string, SRPEEntry[]> = {};
  for (const e of entries) {
    if (!byPlayer[e.player_name]) byPlayer[e.player_name] = [];
    byPlayer[e.player_name].push(e);
  }
  const atRisk: { name: string; result: ACWRResult }[] = [];
  for (const [name, playerEntries] of Object.entries(byPlayer)) {
    const loads = srpeToLoadEntries(playerEntries);
    const result = calcACWR(loads);
    if (result.status === "warning" || result.status === "danger") {
      atRisk.push({ name, result });
    }
  }
  return atRisk;
}
