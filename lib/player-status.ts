/**
 * 球员状态统一数据层 —— 闭环核心
 *
 * 合并两个数据源：
 *   1. 教练主观评分（DailyReadiness 快捷输入）
 *   2. 球员自评（Excel 导入的 RPE/疲劳/酸痛）
 *
 * 产出统一视图，支持：
 *   - 教练端查看球员自评
 *   - 教练评分与球员自评比对
 *   - 恢复分数计算（喂入 calcRecoveryScore）
 *   - 负荷追踪（自评 RPE → sRPE load entry）
 *
 * 依据：NSCA CSCS Ch.12, Gabbett 2016 ACWR, Foster sRPE
 */

import { getPlayers, type PlayerRecord } from "./roster-utils";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface PlayerSelfReportEntry {
  name: string;
  rpe: number;       // 1-10 (Foster sRPE)
  fatigue: number;   // 1-5
  soreness: number;  // 1-5
  note: string;
  date: string;
}

export interface CoachScoreEntry {
  playerId: string;
  score: number;     // 0-100
}

export interface UnifiedPlayerStatus {
  playerId: string;
  playerName: string;
  position: string;
  // 教练评分
  coachScore?: number;
  coachLabel?: string;
  // 球员自评
  playerRPE?: number;
  playerFatigue?: number;
  playerSoreness?: number;
  playerNote?: string;
  hasSelfReport: boolean;
  // 比对
  discrepancy: 'none' | 'mild' | 'significant';
  discrepancyDetail: string;
}

export interface TeamStatusSnapshot {
  date: string;
  playerCount: number;
  coachEnteredCount: number;
  coachAvgScore: number | null;
  selfReportCount: number;
  selfReportAvgRPE: number | null;
  selfReportAvgFatigue: number | null;
  selfReportAvgSoreness: number | null;
  atRiskCount: number;
}

// ═══════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════

const COACH_KEY = "kenshin_team_readiness";
const SELF_KEY = "kenshin_player_self_reports";

// ═══════════════════════════════════════════════
// COACH READINESS
// ═══════════════════════════════════════════════

export function getCoachScores(date?: string): Record<string, number> {
  const d = date || new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(COACH_KEY);
    if (!raw) return {};
    const all = JSON.parse(raw);
    return all[d] || {};
  } catch {
    return {};
  }
}

export function saveCoachScores(scores: Record<string, number>, date?: string): void {
  const d = date || new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(COACH_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[d] = scores;
    localStorage.setItem(COACH_KEY, JSON.stringify(all));
  } catch {}
}

export function getCoachAvgScore(date?: string): number | null {
  const scores = Object.values(getCoachScores(date));
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// ═══════════════════════════════════════════════
// PLAYER SELF-REPORTS
// ═══════════════════════════════════════════════

export function getPlayerSelfReports(date?: string): PlayerSelfReportEntry[] {
  const d = date || new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(SELF_KEY);
    if (!raw) return [];
    const all: PlayerSelfReportEntry[] = JSON.parse(raw);
    return all.filter(r => r.date === d);
  } catch {
    return [];
  }
}

export function getAllSelfReports(): PlayerSelfReportEntry[] {
  try {
    const raw = localStorage.getItem(SELF_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSelfReports(reports: PlayerSelfReportEntry[]): void {
  try {
    localStorage.setItem(SELF_KEY, JSON.stringify(reports));
  } catch {}
}

export function importSelfReportsForToday(imported: PlayerSelfReportEntry[]): void {
  const today = new Date().toISOString().slice(0, 10);
  const existing = getAllSelfReports().filter(r => r.date !== today);
  saveSelfReports([...existing, ...imported]);
}

export function getSelfReportByPlayer(
  name: string,
  date?: string
): PlayerSelfReportEntry | null {
  return getPlayerSelfReports(date).find(r => r.name === name) || null;
}

export function getSelfReportAvgRPE(date?: string): number | null {
  const reports = getPlayerSelfReports(date);
  if (reports.length === 0) return null;
  return Math.round(reports.reduce((a, r) => a + r.rpe, 0) / reports.length * 10) / 10;
}

export function getSelfReportAvgFatigue(date?: string): number | null {
  const reports = getPlayerSelfReports(date);
  if (reports.length === 0) return null;
  return Math.round(reports.reduce((a, r) => a + r.fatigue, 0) / reports.length * 10) / 10;
}

export function getSelfReportAvgSoreness(date?: string): number | null {
  const reports = getPlayerSelfReports(date);
  if (reports.length === 0) return null;
  return Math.round(reports.reduce((a, r) => a + r.soreness, 0) / reports.length * 10) / 10;
}

// ═══════════════════════════════════════════════
// SELF-REPORT → sRPE LOAD ENTRY
// ═══════════════════════════════════════════════

/**
 * Convert a player self-report to a load entry for ACWR tracking.
 * Uses Foster's sRPE method: load = RPE × duration.
 * If duration unknown, estimate from typical session length (90 min).
 */
export function selfReportToLoadEntry(
  report: PlayerSelfReportEntry,
  sessionDurationMin?: number
): { name: string; sRPE: number; duration: number; date: string } {
  return {
    name: report.name,
    sRPE: report.rpe,
    duration: sessionDurationMin || 90,
    date: report.date,
  };
}

// ═══════════════════════════════════════════════
// COACH ↔ PLAYER DISCREPANCY DETECTION
// ═══════════════════════════════════════════════

/**
 * Coach score ≥ 85 = 极佳, ≥ 70 = 良好, ≥ 55 = 疲劳, ≥ 40 = 很累, < 40 = 休息
 * Player: high fatigue(≥4) + high soreness(≥4) → 疲劳
 *
 * Discrepancy:
 *   - significant: coach says 良好(≥70) but player reports fatigue≥4 + soreness≥4
 *   - significant: coach says 疲劳(<55) but player reports fatigue≤2 + soreness≤2
 *   - mild: coach says 良好(≥70) but player reports fatigue≥3
 *   - mild: coach says 疲劳(<55) but player reports fatigue≤3
 *   - none: otherwise
 */
export function checkCoachPlayerDiscrepancy(
  coachScore: number,
  playerFatigue: number,
  playerSoreness: number
): { level: 'none' | 'mild' | 'significant'; detail: string } {
  const coachGood = coachScore >= 70;
  const coachTired = coachScore < 55;
  const playerTired = playerFatigue >= 4 || playerSoreness >= 4;
  const playerFresh = playerFatigue <= 2 && playerSoreness <= 2;
  const playerMild = playerFatigue >= 3 || playerSoreness >= 3;

  if (coachGood && playerTired) {
    return {
      level: 'significant',
      detail: '教练评良好，球员自评疲劳/酸痛偏高→建议沟通确认',
    };
  }
  if (coachTired && playerFresh) {
    return {
      level: 'significant',
      detail: '教练评疲劳，球员自评感觉良好→可能心理状态影响教练判断',
    };
  }
  if (coachGood && playerMild) {
    return {
      level: 'mild',
      detail: '教练评良好，球员轻度疲劳→关注训练中表现',
    };
  }
  return { level: 'none', detail: '' };
}

// ═══════════════════════════════════════════════
// UNIFIED PLAYER STATUS
// ═══════════════════════════════════════════════

/** 单个球员的统一状态 */
export function getUnifiedPlayerStatus(
  player: PlayerRecord,
  coachScores: Record<string, number>,
  selfReports: PlayerSelfReportEntry[]
): UnifiedPlayerStatus {
  const coachScore = coachScores[player.id];
  const selfReport = selfReports.find(r => r.name === player.name);
  const coachLabel = coachScore !== undefined
    ? (coachScore >= 85 ? '极佳' : coachScore >= 70 ? '良好' : coachScore >= 55 ? '疲劳' : coachScore >= 40 ? '很累' : '休息')
    : undefined;

  const disc = coachScore !== undefined && selfReport
    ? checkCoachPlayerDiscrepancy(coachScore, selfReport.fatigue, selfReport.soreness)
    : { level: 'none' as const, detail: '' };

  return {
    playerId: player.id,
    playerName: player.name,
    position: player.position || '',
    coachScore,
    coachLabel,
    playerRPE: selfReport?.rpe,
    playerFatigue: selfReport?.fatigue,
    playerSoreness: selfReport?.soreness,
    playerNote: selfReport?.note,
    hasSelfReport: !!selfReport,
    discrepancy: disc.level,
    discrepancyDetail: disc.detail,
  };
}

/** 全队统一状态 */
export function getUnifiedTeamStatus(date?: string): UnifiedPlayerStatus[] {
  const players = getPlayers();
  const coachScores = getCoachScores(date);
  const selfReports = getPlayerSelfReports(date);
  return players.map(p => getUnifiedPlayerStatus(p, coachScores, selfReports));
}

// ═══════════════════════════════════════════════
// TEAM SNAPSHOT（供报告生成器使用）
// ═══════════════════════════════════════════════

export function getTeamStatusSnapshot(date?: string): TeamStatusSnapshot {
  const d = date || new Date().toISOString().slice(0, 10);
  const players = getPlayers();
  const coachScores = getCoachScores(d);
  const selfReports = getPlayerSelfReports(d);
  const scores = Object.values(coachScores);

  return {
    date: d,
    playerCount: players.length,
    coachEnteredCount: scores.length,
    coachAvgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    selfReportCount: selfReports.length,
    selfReportAvgRPE: getSelfReportAvgRPE(d),
    selfReportAvgFatigue: getSelfReportAvgFatigue(d),
    selfReportAvgSoreness: getSelfReportAvgSoreness(d),
    atRiskCount: selfReports.filter(r => r.fatigue >= 4 || r.soreness >= 4).length,
  };
}

// ═══════════════════════════════════════════════
// RECOVERY INPUT BUILDER
// ═══════════════════════════════════════════════

/**
 * Build RecoveryInput from today's self-reports and coach data.
 * Uses team averages where individual data isn't specified.
 *
 * @param playerName - specific player name, or null for team average
 */
export function buildRecoveryInputFromStatus(
  playerName?: string
): {
  sleepHours: number | null;
  sleepQuality: number | null;
  muscleSoreness: number | null;
  stressLevel: number | null;
  lastSessionRPE: number | null;
} {
  const selfReports = getPlayerSelfReports();

  if (playerName) {
    const report = selfReports.find(r => r.name === playerName);
    if (!report) return {
      sleepHours: null, sleepQuality: null,
      muscleSoreness: null, stressLevel: null,
      lastSessionRPE: null,
    };
    return {
      sleepHours: null,
      sleepQuality: null,
      muscleSoreness: report.soreness,
      stressLevel: null,
      lastSessionRPE: report.rpe,
    };
  }

  // Team averages
  const reports = selfReports;
  const count = reports.length;
  if (count === 0) return {
    sleepHours: null, sleepQuality: null,
    muscleSoreness: null, stressLevel: null,
    lastSessionRPE: null,
  };

  return {
    sleepHours: null,
    sleepQuality: null,
    muscleSoreness: Math.round(reports.reduce((a, r) => a + r.soreness, 0) / count),
    stressLevel: null,
    lastSessionRPE: Math.round(reports.reduce((a, r) => a + r.rpe, 0) / count),
  };
}
