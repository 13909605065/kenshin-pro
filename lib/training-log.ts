"use client";

import { createClient } from "@/lib/supabase/supabase-client";

// ═══════════════════════════════════════════
// 训练执行日志（原有，localStorage）
// ═══════════════════════════════════════════

export interface ExerciseLogEntry {
  name: string;
  plannedSets: number;
  plannedReps: number;
  plannedLoad: string;
  completed: boolean;
  actualSets?: number;
  actualReps?: number;
  actualLoad?: string;
  actualRPE?: number;
  notes?: string;
}

export interface TrainingSessionLog {
  id: string;
  date: string;
  planId: string;
  scene: string;
  goal: string;
  duration: number;
  matchDay: string;
  playerName?: string;
  exercises: ExerciseLogEntry[];
  summary: {
    totalExercises: number;
    completedExercises: number;
    completionRate: number;
    averageRPE: number;
    totalVolumeLoad: number;
    notes: string;
  };
  createdAt: string;
}

const LOG_KEY = 'kenshin_training_logs';
const MAX_LOGS = 50;

export function getLogs(): TrainingSessionLog[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
}

function saveLogs(logs: TrainingSessionLog[]) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, MAX_LOGS))); } catch {}
}

export function saveSessionLog(log: TrainingSessionLog) {
  const logs = [log, ...getLogs()].slice(0, MAX_LOGS);
  saveLogs(logs);
}

export function getLogsForPlayer(playerName: string): TrainingSessionLog[] {
  return getLogs().filter(l => l.playerName === playerName);
}

export function getLogsByDateRange(from: string, to: string): TrainingSessionLog[] {
  return getLogs().filter(l => l.date >= from && l.date <= to);
}

export function getRecentLogs(count: number = 5): TrainingSessionLog[] {
  return getLogs().slice(0, count);
}

export function extractExercisesFromModules(modules: any[]): ExerciseLogEntry[] {
  const entries: ExerciseLogEntry[] = [];
  for (const m of modules) {
    if (m.module !== 'position_training') continue;
    const allEx = [
      ...(m.warmup || []).map((e: any) => ({ ...e, phase: 'warmup' })),
      ...(m.upper_limb || []).map((e: any) => ({ ...e, phase: 'upper' })),
      ...(m.lower_limb || []).map((e: any) => ({ ...e, phase: 'lower' })),
      ...(m.core || []).map((e: any) => ({ ...e, phase: 'core' })),
      ...(m.cooldown || []).map((e: any) => ({ ...e, phase: 'cooldown' })),
    ];
    for (const ex of allEx) {
      entries.push({
        name: ex.name || '—',
        plannedSets: typeof ex.sets === 'number' ? ex.sets : Array.isArray(ex.sets) ? ex.sets[0] : 3,
        plannedReps: typeof ex.reps === 'number' ? ex.reps : Array.isArray(ex.reps) ? ex.reps[0] : 10,
        plannedLoad: ex.load || ex.load_default || 'BW',
        completed: false,
      });
    }
  }
  return entries;
}

export function calcSummary(entries: ExerciseLogEntry[], notes: string = '') {
  const completed = entries.filter(e => e.completed).length;
  const rpeValues = entries.filter(e => e.actualRPE != null).map(e => e.actualRPE!);
  const avgRPE = rpeValues.length > 0 ? Math.round(rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) : 0;
  const volumeLoad = entries
    .filter(e => e.completed)
    .reduce((sum, e) => {
      const sets = e.actualSets || e.plannedSets;
      const reps = e.actualReps || e.plannedReps;
      const load = parseInt((e.actualLoad || e.plannedLoad).replace(/\D/g, '')) || 1;
      return sum + sets * reps * load;
    }, 0);
  return {
    totalExercises: entries.length,
    completedExercises: completed,
    completionRate: entries.length > 0 ? Math.round((completed / entries.length) * 100) : 0,
    averageRPE: avgRPE,
    totalVolumeLoad: volumeLoad,
    notes,
  };
}

// ═══════════════════════════════════════════
// 训练计划持久化 + 球员单练（Supabase + localStorage 双保险）
// ═══════════════════════════════════════════

export interface DayPlanData {
  id: string;
  day: string;
  focus: string;
  intensity: string;
  duration: number;
  scene: 'gym' | 'pitch' | null;
  goal: string;
  notes: string;
}

export interface SavedTrainingPlan {
  id: string;
  user_id: string;
  name: string;
  phase_type: string;
  phase_label: string;
  week_data: { days: DayPlanData[]; matchDayIndex: number; phaseType: string; icon: string };
  created_at: string;
  updated_at: string;
}

export interface PlayerSession {
  id: string;
  plan_id: string;
  player_id: string;
  player_name: string;
  date: string;
  scene: 'gym' | 'pitch';
  focus: string;
  duration: number;
  intensity: string;
  load_estimate: number;
  notes: string;
  created_at: string;
}

const INTENSITY_COEF: Record<string, number> = {
  '极高': 2.0, '高': 1.5, '中高': 1.3, '中': 1.0, '中低': 0.8, '低': 0.6, '-': 0,
};

export function estimateLoad(duration: number, intensity: string, scene: 'gym' | 'pitch'): number {
  const coef = INTENSITY_COEF[intensity] || 1.0;
  const sf = scene === 'pitch' ? 7.0 : 5.5;
  return Math.round(duration * sf * coef);
}

export function calculateWeeklyLoad(sessions: PlayerSession[]): {
  totalLoad: number; pitchLoad: number; gymLoad: number; sessionCount: number;
} {
  let p = 0, g = 0;
  for (const s of sessions) { if (s.scene === 'pitch') p += s.load_estimate; else g += s.load_estimate; }
  return { totalLoad: p + g, pitchLoad: p, gymLoad: g, sessionCount: sessions.length };
}

const supabase = () => createClient();

export async function saveTrainingPlan(data: {
  name: string; phaseType: string; phaseLabel: string; icon: string;
  days: DayPlanData[]; matchDayIndex: number;
}): Promise<SavedTrainingPlan | null> {
  const { data: session } = await supabase().auth.getSession();
  const payload = {
    user_id: session?.session?.user?.id || 'anon',
    name: data.name, phase_type: data.phaseType, phase_label: data.phaseLabel,
    week_data: { days: data.days, matchDayIndex: data.matchDayIndex, phaseType: data.phaseType, icon: data.icon },
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  const { data: result, error } = await supabase().from("training_plans").insert(payload).select().single();
  if (error) { savePlanLocal(payload as any); return payload as any; }
  return result as SavedTrainingPlan;
}

export async function updateTrainingPlan(id: string, data: Partial<{ name: string; week_data: SavedTrainingPlan["week_data"] }>): Promise<boolean> {
  const { error } = await supabase().from("training_plans").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
  return !error;
}

export async function deleteTrainingPlan(id: string): Promise<boolean> {
  const { error } = await supabase().from("training_plans").delete().eq("id", id);
  if (error) { removePlanLocal(id); return true; }
  return true;
}

export async function loadTrainingPlans(): Promise<SavedTrainingPlan[]> {
  const { data: session } = await supabase().auth.getSession();
  if (!session.session) return loadLocalPlans();
  const { data, error } = await supabase().from("training_plans").select("*").eq("user_id", session.session.user.id).order("updated_at", { ascending: false });
  if (error || !data) return loadLocalPlans();
  return data as SavedTrainingPlan[];
}

export async function savePlayerSession(data: {
  plan_id?: string; player_id: string; player_name: string; date: string;
  scene: 'gym' | 'pitch'; focus: string; duration: number; intensity: string; notes?: string;
}): Promise<PlayerSession | null> {
  const le = estimateLoad(data.duration, data.intensity, data.scene);
  const payload = { ...data, load_estimate: le, notes: data.notes || "", created_at: new Date().toISOString() };
  const { data: result, error } = await supabase().from("player_sessions").insert(payload).select().single();
  if (error) { saveSessionLocal(payload as PlayerSession); return payload as PlayerSession; }
  return result as PlayerSession;
}

export async function loadPlayerSessions(planId?: string): Promise<PlayerSession[]> {
  let q = supabase().from("player_sessions").select("*");
  if (planId) q = q.eq("plan_id", planId);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) return loadSessionsLocal();
  return data as PlayerSession[];
}

export async function deletePlayerSession(id: string): Promise<boolean> {
  const { error } = await supabase().from("player_sessions").delete().eq("id", id);
  return !error;
}

// ── localStorage fallback ──

const LOCAL_PLANS = "kenshin_training_plans";
const LOCAL_SESSIONS = "kenshin_player_sessions";

function savePlanLocal(plan: SavedTrainingPlan) {
  try {
    const plans = JSON.parse(localStorage.getItem(LOCAL_PLANS) || "[]");
    const i = plans.findIndex((p: any) => p.id === plan.id);
    if (i >= 0) plans[i] = plan; else plans.unshift(plan);
    localStorage.setItem(LOCAL_PLANS, JSON.stringify(plans.slice(0, 50)));
  } catch {}
}

function removePlanLocal(id: string) {
  try { const plans = JSON.parse(localStorage.getItem(LOCAL_PLANS) || "[]"); localStorage.setItem(LOCAL_PLANS, JSON.stringify(plans.filter((p: any) => p.id !== id))); } catch {}
}

function loadLocalPlans(): SavedTrainingPlan[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_PLANS) || "[]"); } catch { return []; }
}

function saveSessionLocal(s: PlayerSession) {
  try { const ss = JSON.parse(localStorage.getItem(LOCAL_SESSIONS) || "[]"); ss.unshift(s); localStorage.setItem(LOCAL_SESSIONS, JSON.stringify(ss.slice(0, 200))); } catch {}
}

function loadSessionsLocal(): PlayerSession[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_SESSIONS) || "[]"); } catch { return []; }
}
