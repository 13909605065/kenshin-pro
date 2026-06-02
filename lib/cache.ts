/**
 * Smart plan cache — fingerprint formData → serve instantly for repeat queries.
 * No API call needed when the same (position, goal, phase, injury) combo was generated before.
 */

import { PlayerFormData, TrainingModule } from "./types";

const CACHE_KEY = "kenshin_plan_cache";
const MAX_ENTRIES = 50;

interface CacheEntry {
  fingerprint: string;
  formData: PlayerFormData;
  modules: TrainingModule[];
  createdAt: string;
  hitCount: number;
}

/** Generate a deterministic fingerprint from formData fields that affect output */
export function fingerprint(data: PlayerFormData): string {
  const key = [
    data.role,
    data.position,
    data.goal,
    data.phase,
    data.age,
    data.height,
    data.weight,
    data.years,
    ...data.injurySites.sort(),
    data.injuryHistory?.slice(0, 50),
    data.coachCert,
    data.coachRole,
    data.leagueTag,
    ...data.tacticalThemes.sort(),
  ].map((v) => String(v ?? "")).join("|");
  // Simple hash
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

/** Load all cached entries */
export function loadCache(): CacheEntry[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCache(entries: CacheEntry[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {}
}

/** Look up a cached plan by fingerprint */
export function findCached(fp: string): CacheEntry | null {
  const entries = loadCache();
  const found = entries.find((e) => e.fingerprint === fp);
  if (found) {
    // Bump hit count
    found.hitCount++;
    saveCache(entries);
  }
  return found || null;
}

/** Save a generated plan to cache */
export function saveToCache(fp: string, data: PlayerFormData, modules: TrainingModule[]) {
  const entries = loadCache().filter((e) => e.fingerprint !== fp);
  entries.unshift({
    fingerprint: fp,
    formData: { ...data },
    modules,
    createdAt: new Date().toISOString(),
    hitCount: 0,
  });
  saveCache(entries);
}

/** Get cache stats */
export function cacheStats() {
  const entries = loadCache();
  return {
    total: entries.length,
    max: MAX_ENTRIES,
    recent: entries.slice(0, 5).map((e) => ({
      fp: e.fingerprint.slice(0, 6),
      hits: e.hitCount,
      date: e.createdAt,
    })),
  };
}

/** Clear all cache */
export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}
