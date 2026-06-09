import { teamGet, teamSet } from "@/lib/team-storage";
import { TrainingHistoryItem, TrainingModule } from "./types";

const HISTORY_KEY = "kenshin_history";
const MAX_LOCAL_ITEMS = 20;

export function saveToLocal(item: TrainingHistoryItem): void {
  try {
    const existing = getLocalHistory();
    const updated = [item, ...existing].slice(0, MAX_LOCAL_ITEMS);
    teamSet(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("localStorage write failed, storage may be full", e);
  }
}

export function getLocalHistory(): TrainingHistoryItem[] {
  try {
    const raw = teamGet(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function cacheModules(modules: TrainingModule[]): void {
  try {
    teamSet("kenshin_cached_modules", JSON.stringify(modules));
  } catch {}
}

export function getCachedModules(): TrainingModule[] {
  try {
    const raw = teamGet("kenshin_cached_modules");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
