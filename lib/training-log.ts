/**
 * 训练日志 — 追踪每次方案执行的实际数据
 *
 * 存储: localStorage key: kenshin_training_logs
 * 每条日志记录: 日期、方案ID、实际RPE、完成状态、每项动作的实际负荷
 */

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
  playerName?: string; // individual mode
  exercises: ExerciseLogEntry[];
  summary: {
    totalExercises: number;
    completedExercises: number;
    completionRate: number; // 0-1
    averageRPE: number;
    totalVolumeLoad: number; // sets × reps × load (estimated)
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

/** Create exercise log entries from plan modules */
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

/** Calculate summary from exercise log entries */
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
