/**
 * Data Export Utility — aggregate all localStorage data for backup/export.
 *
 * Reads every localStorage key the app uses and packages them into:
 *   • Full JSON backup (all keys)
 *   • CSV export (training logs + match data)
 */

// ── LocalStorage Key Registry ──

const LS_KEYS = {
  trainingPlans: "kenshin_microcycle_plans",
  trainingPlansSaved: "kenshin_microcycle_plans_saved",
  trainingLogs: "kenshin_training_logs",
  warmupLibrary: "kenshin_warmup_library",
  gymLibrary: "kenshin_gym_library",
  matchState: "kenshin_match_state",
  fieldSessions: "kenshin_field_sessions",
  fieldHistory: "kenshin_field_tactical_history",
  playerCheckins: "kenshin_player_checkins",
  fitnessProfiles: "kenshin_fitness_profiles",
  fitnessBaselines: "kenshin_fitness_baselines",
  // Calendar
  warmupCalendar: "kenshin_warmup_calendar",
  gymCalendar: "kenshin_gym_calendar",
  seasonCalendar: "kenshin_season_calendar",
  // Profiles
  coachProfile: "kenshin_coach_profile",
  coachProfileLegacy: "coach_profile",
  athleteProfile: "athlete_profile",
  // Roster
  rosterPlayers: "roster_players",
  rosterPlayerMatches: "roster_player_matches",
  // Misc data
  history: "kenshin_history",
  cachedModules: "kenshin_cached_modules",
  planCache: "kenshin_plan_cache",
  syncQueue: "kenshin_sync_queue",
  prData: "kenshin_pr_data",
  motivation: "kenshin_motivation",
  loadData: "kenshin_load_data",
  injuryReports: "kenshin_injury_reports",
  recoveryLog: "kenshin_recovery_log",
  dailyCheckin: "kenshin_daily_checkin",
  voiceNotes: "kenshin_voice_notes",
  workoutRecords: "workout_records",
  templates: "kenshin_templates_library",
  fitnessProfilesList: "kenshin_fitness_profiles_list",
  fitnessProfileActive: "kenshin_fitness_profile_active",
  customExercises: "kenshin_custom_exercises",
  strengthDraft: "kenshin_strength_draft",
  strengthPlans: "kenshin_strength_plans",
  plans: "kenshin_plans",
  tacBriefingSync: "tac_briefing_sync",
  exercisesForPlan: "exercises_selected_for_plan",
  // Settings / state
  role: "kenshin_role",
  scene: "kenshin_scene",
  theme: "kenshin_theme",
  lang: "kenshin_lang",
  onboardingDone: "kenshin_onboarding_done",
  coachPhase: "kenshin_coach_phase",
  coachMatchDate: "kenshin_coach_matchDate",
  coachPlanMode: "kenshin_coach_planMode",
  workbenchPreset: "kenshin_workbench_preset",
  periodizationPreset: "kenshin_periodization_preset",
} as const;

// ── Types ──

export interface DataStats {
  trainingPlans: number;
  trainingLogs: number;
  warmupDesigns: number;
  gymDesigns: number;
  matchRecords: number;
  fieldSessions: number;
  calendar: { warmup: number; gym: number; season: number };
  playerCheckins: number;
  fitnessProfiles: number;
  totalSizeKB: number;
}

interface ExportBundle {
  exportedAt: string;
  stats: DataStats;
  data: Record<string, unknown>;
}

// ── Helpers ──

function safeReadLS(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeCount(key: string): number {
  const v = safeReadLS(key);
  if (v === null || v === undefined) return 0;
  if (Array.isArray(v)) return v.length;
  if (typeof v === "object") return Object.keys(v as object).length;
  return 1;
}

function calcTotalSizeKB(): number {
  if (typeof window === "undefined") return 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || "";
      // JS strings are UTF-16, each char = 2 bytes
      total += key.length * 2 + value.length * 2;
    }
  }
  return Math.round(total / 1024);
}

function triggerDownload(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Public API ──

/**
 * Export all localStorage data as a structured object including stats.
 */
export function exportAllData(): { json: string; stats: DataStats } {
  const bundle: ExportBundle = {
    exportedAt: new Date().toISOString(),
    stats: buildStats(),
    data: {},
  };

  // Collect every known key
  for (const [label, key] of Object.entries(LS_KEYS)) {
    const value = safeReadLS(key);
    if (value !== null) {
      (bundle.data as Record<string, unknown>)[key] = value;
    }
  }

  // Also capture any unknown keys that might exist
  if (typeof window !== "undefined") {
    const knownKeys: Set<string> = new Set(Object.values(LS_KEYS));
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !knownKeys.has(key)) {
        const value = safeReadLS(key);
        if (value !== null) {
          (bundle.data as Record<string, unknown>)[key] = value;
        }
      }
    }
  }

  return { json: JSON.stringify(bundle, null, 2), stats: bundle.stats };
}

/**
 * Build summary stats from localStorage.
 */
function buildStats(): DataStats {
  return {
    trainingPlans: safeCount(LS_KEYS.trainingPlans),
    trainingLogs: safeCount(LS_KEYS.trainingLogs),
    warmupDesigns: safeCount(LS_KEYS.warmupLibrary),
    gymDesigns: safeCount(LS_KEYS.gymLibrary),
    matchRecords: safeCount(LS_KEYS.matchState)
      ? 1 // matchState is a single object, count as 1 if exists
      : safeCount(LS_KEYS.matchState),
    fieldSessions: safeCount(LS_KEYS.fieldSessions),
    calendar: {
      warmup: safeCount(LS_KEYS.warmupCalendar),
      gym: safeCount(LS_KEYS.gymCalendar),
      season: safeCount(LS_KEYS.seasonCalendar),
    },
    playerCheckins: safeCount(LS_KEYS.playerCheckins),
    fitnessProfiles: safeCount(LS_KEYS.fitnessProfiles),
    totalSizeKB: calcTotalSizeKB(),
  };
}

/**
 * Download a full JSON backup of all localStorage data.
 */
export function exportAsJSON(): void {
  const { json, stats } = exportAllData();
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(
    `kenshin-backup-${date}.json`,
    json,
    "application/json"
  );
}

// ── CSV Export ──

interface CsvRow {
  date: string;
  type: string;
  player: string;
  duration: string;
  rpe: string;
  load: string;
  notes: string;
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Build CSV rows from training logs.
 */
function logsToCsvRows(): CsvRow[] {
  const logs = (safeReadLS(LS_KEYS.trainingLogs) as any[]) || [];
  return logs.map((log: any) => ({
    date: log.date || "",
    type: "训练日志",
    player: log.playerName || "",
    duration: log.duration != null ? String(log.duration) : "",
    rpe: log.summary?.averageRPE != null ? String(log.summary.averageRPE) : "",
    load: log.summary?.totalVolumeLoad != null ? String(log.summary.totalVolumeLoad) : "",
    notes: log.summary?.notes || "",
  }));
}

/**
 * Build CSV rows from match records.
 */
function matchesToCsvRows(): CsvRow[] {
  const matchState = safeReadLS(LS_KEYS.matchState) as any;
  if (!matchState || !Array.isArray(matchState.matches)) return [];
  return (matchState.matches as any[]).map((m: any) => ({
    date: m.date || m.matchDate || "",
    type: "比赛",
    player: m.opponent || "",
    duration: m.duration || m.minutes || "",
    rpe: m.rpe != null ? String(m.rpe) : "",
    load: m.load != null ? String(m.load) : "",
    notes: m.notes || "",
  }));
}

/**
 * Download training logs + match data as CSV.
 */
export function exportAsCSV(): void {
  const rows = [...logsToCsvRows(), ...matchesToCsvRows()];
  const headers = ["date", "type", "player", "duration", "rpe", "load", "notes"];

  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => escapeCsv(r[h as keyof CsvRow])).join(",")
    ),
  ].join("\n");

  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(
    `kenshin-logs-${date}.csv`,
    csv,
    "text/csv;charset=utf-8"
  );
}
