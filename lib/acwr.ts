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

/** Clear all load data */
export function clearAllLoadData(): void {
  try {
    teamRemove(LOAD_KEY);
  } catch {}
}
