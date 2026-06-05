/**
 * 周负荷自动追踪引擎
 *
 * 聚合 6 个 localStorage 数据源，计算当前比赛周的每日/总 TRIMP，
 * 基于 NSCA ACWR 指南输出风险评估。
 *
 * 数据源:
 * 1. kenshin_microcycle_plans  — 训练方案（按 matchDate_dayOffset 键值）
 * 2. kenshin_training_logs     — 完成的训练课（RPE 冲量）
 * 3. kenshin_match_state       — 比赛记录（出场时间 × 位置系数）
 * 4. kenshin_gym_calendar      — 力量房排课
 * 5. kenshin_warmup_calendar   — 热身排课 + fieldLoad/fieldTime
 * 6. kenshin_field_sessions    — 已归档的外场训练课
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TrainingSessionLog } from '@/lib/training-log';

// ═══════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════

export interface LoadSegment {
  source: 'training_plan' | 'field_session' | 'match' | 'gym' | 'warmup' | 'addon';
  label: string;
  duration: number;
  trimp: number;
  timeOfDay?: string;
}

export interface DailyLoad {
  date: string;
  weekday: string;
  mdLabel: string;
  segments: LoadSegment[];
  totalTRIMP: number;
  riskLevel: 'normal' | 'elevated' | 'high';
}

export interface WeeklyLoadReport {
  weekStart: string;
  weekEnd: string;
  daily: DailyLoad[];
  totalTRIMP: number;
  averageDailyTRIMP: number;
  status: 'safe' | 'warning' | 'overload';
  warnings: string[];
}

// ═══════════════════════════════════════════
// 常量
// ═══════════════════════════════════════════

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 方案场景-目标 → TRIMP/分钟估算系数 */
const PLAN_TRIMP_RATE: Record<string, number> = {
  gym_strength: 2.0,
  gym_power: 2.5,
  gym_agility: 1.8,
  gym_mas_endurance: 2.5,
  pitch_strength: 2.2,
  pitch_power: 2.8,
  pitch_speed: 2.0,
  pitch_mas_endurance: 3.0,
};

/** 比赛日 TRIMP/分钟（高强度） */
const MATCH_TRIMP_RATE = 7.0;

/** 力量房 TRIMP/分钟 */
const GYM_TRIMP_RATE = 2.0;

/** 热身 TRIMP/分钟（低强度）*/
const WARMUP_TRIMP_RATE = 0.8;

/** 球场外场 TRIMP/分钟（默认） */
const FIELD_DEFAULT_TRIMP_RATE = 2.5;

// ═══════════════════════════════════════════
// 阶段感知负荷阈值（读取赛季全景自动切换）
// ═══════════════════════════════════════════

type SeasonPhaseKey = 'offseason' | 'preseason_build' | 'regular_season' | 'playoffs';

interface PhaseThresholds {
  dayElevated: number;
  dayHigh: number;
  weekWarning: number;
  weekOverload: number;
}

const PHASE_THRESHOLDS: Record<SeasonPhaseKey, PhaseThresholds> = {
  offseason: {
    dayElevated: 120,
    dayHigh: 180,
    weekWarning: 700,
    weekOverload: 1000,
  },
  preseason_build: {
    dayElevated: 200,
    dayHigh: 300,
    weekWarning: 1200,
    weekOverload: 1500,
  },
  regular_season: {
    dayElevated: 180,
    dayHigh: 280,
    weekWarning: 1100,
    weekOverload: 1400,
  },
  playoffs: {
    dayElevated: 140,
    dayHigh: 220,
    weekWarning: 800,
    weekOverload: 1100,
  },
};

function getCurrentPhaseThresholds(): PhaseThresholds {
  try {
    const raw = localStorage.getItem('kenshin_season_calendar');
    if (!raw) return PHASE_THRESHOLDS.regular_season;
    const data = JSON.parse(raw);
    const ranges = data.phaseRanges || [];
    const today = new Date().toISOString().slice(0, 10);
    const phase = ranges.find((r: any) => today >= r.startDate && today <= r.endDate);
    if (phase && PHASE_THRESHOLDS[phase.phase as SeasonPhaseKey]) {
      return PHASE_THRESHOLDS[phase.phase as SeasonPhaseKey];
    }
  } catch {}
  return PHASE_THRESHOLDS.regular_season;
}

// ═══════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getSunday(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 0);
  return sunday;
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/** 安全的 localStorage 读取 */
function readJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// ═══════════════════════════════════════════
// 各数据源读取
// ═══════════════════════════════════════════

interface MicrocyclePlan {
  modules: any[];
  formData: any;
  scene: string;
  duration: number;
  goal: string;
  phase: string;
  savedAt: string;
}

/** 1. 读取某天的训练方案（微周期） */
function getPlanForDate(matchDate: string, dateISO: string): MicrocyclePlan | null {
  const match = new Date(matchDate + 'T00:00:00');
  const target = new Date(dateISO + 'T00:00:00');
  const offset = dayDiff(target, match); // positive = before match (MD-N), negative = after match (MD+N)
  const plans = readJSON<Record<string, MicrocyclePlan>>('kenshin_microcycle_plans', {});
  return plans[`${matchDate}_${offset}`] || null;
}

interface MatchPlayerData {
  id: string;
  name: string;
  position: string;
  timeOnField: number;
}

interface MatchState {
  matchType: string;
  matchName: string;
  startedAt: string | null;
  totalTime: number;
  players: MatchPlayerData[];
  clockRunning: boolean;
}

/** 2. 读取某天的比赛数据（仅限比赛日当天） */
function getMatchForDate(dateISO: string): MatchState | null {
  const state = readJSON<MatchState | null>('kenshin_match_state', null);
  if (!state || !state.startedAt) return null;
  // Match state persists; check if it's from today
  const stateDate = state.startedAt.slice(0, 10);
  if (stateDate !== dateISO) return null;
  return state;
}

interface GymCalendarEntry {
  id: string;
  comboId: string;
  date: string;
  phase: string;
  goal: string;
  exerciseIds: string[];
}

/** 3. 读取某天的力量房排课 */
function getGymForDate(dateISO: string): GymCalendarEntry | null {
  const entries = readJSON<GymCalendarEntry[]>('kenshin_gym_calendar', []);
  return entries.find(e => e.date === dateISO) || null;
}

interface WarmupDayNotes {
  warmupId: string | null;
  warmupDuration: number;
  scaledSegments?: { name: string; duration: number }[];
  theme?: string;
  fieldLoad?: number;
  fieldTime?: number;
}

/** 4. 读取某天的热身排课 */
function getWarmupForDate(dateISO: string): WarmupDayNotes | null {
  const cal = readJSON<Record<string, WarmupDayNotes>>('kenshin_warmup_calendar', {});
  const notes = cal[dateISO];
  if (!notes || (!notes.warmupId && !notes.fieldLoad)) return null;
  return notes;
}

interface FieldSession {
  id: string;
  date: string;
  warmupMin: number;
  totalTRIMP: number;
  totalFieldTimeMin: number;
  archived: boolean;
  phases?: { text: string; phaseTRIMP: number }[];
}

/** 5. 读取某天的外场训练课（已归档） */
function getFieldSessionForDate(dateISO: string): FieldSession | null {
  const sessions = readJSON<FieldSession[]>('kenshin_field_sessions', []);
  return sessions.find(s => s.date === dateISO && s.archived) || null;
}

/** 6. 读取某天的训练日志 */
function getTrainingLogForDate(dateISO: string): TrainingSessionLog | null {
  const logs = readJSON<TrainingSessionLog[]>('kenshin_training_logs', []);
  return logs.find(l => l.date === dateISO) || null;
}

// ═══════════════════════════════════════════
// 单日负荷聚合
// ═══════════════════════════════════════════

function aggregateDailyLoad(
  dateISO: string,
  matchDate: string,
  mdDay: number,
  weekday: string,
  mdLabel: string,
): DailyLoad {
  const segments: LoadSegment[] = [];

  // ── 训练方案 ──
  const plan = getPlanForDate(matchDate, dateISO);
  if (plan) {
    const rateKey = `${plan.scene}_${plan.goal}`;
    const rate = PLAN_TRIMP_RATE[rateKey] || FIELD_DEFAULT_TRIMP_RATE;
    const trimp = Math.round(plan.duration * rate);
    const SCENE_CN: Record<string, string> = { gym: '力量房', pitch: '外场' };
    const GOAL_CN: Record<string, string> = {
      strength: '力量', power: '爆发力', speed: '速度',
      agility: '灵敏', mas_endurance: '耐力',
    };
    segments.push({
      source: 'training_plan',
      label: `${SCENE_CN[plan.scene] || plan.scene}·${GOAL_CN[plan.goal] || plan.goal}·${plan.duration}min`,
      duration: plan.duration,
      trimp,
    });
  }

  // ── 训练日志（实际完成数据，权重更高） ──
  const log = getTrainingLogForDate(dateISO);
  if (log) {
    const avgRPE = log.summary?.averageRPE || 5;
    const trimpFromLog = Math.round(log.duration * avgRPE);
    segments.push({
      source: 'training_plan', // 复用 source 但补充标记
      label: `✓完成·${log.scene || '训练'}·${log.duration}min·RPE${avgRPE}`,
      duration: log.duration,
      trimp: trimpFromLog,
    });
  }

  // ── 比赛 ──
  const match = getMatchForDate(dateISO);
  if (match) {
    let totalPlayerMinutes = 0;
    for (const p of match.players) {
      totalPlayerMinutes += Math.round(p.timeOnField / 60);
    }
    const trimp = Math.round(totalPlayerMinutes * MATCH_TRIMP_RATE);
    segments.push({
      source: 'match',
      label: `${match.matchType || '比赛'}·${match.matchName || '—'}·${totalPlayerMinutes}人分钟`,
      duration: totalPlayerMinutes,
      trimp,
    });
  }

  // ── 力量房 ──
  const gym = getGymForDate(dateISO);
  if (gym) {
    // 每个动作估算 3 分钟
    const estDuration = Math.max(gym.exerciseIds.length * 3, 30);
    const trimp = Math.round(estDuration * GYM_TRIMP_RATE);
    segments.push({
      source: 'gym',
      label: `力量房·${gym.exerciseIds.length}个动作`,
      duration: estDuration,
      trimp,
    });
  }

  // ── 热身 ──
  const warmup = getWarmupForDate(dateISO);
  if (warmup) {
    // 热身 TRIMP
    if (warmup.warmupDuration && warmup.warmupDuration > 0) {
      const trimp = Math.round(warmup.warmupDuration * WARMUP_TRIMP_RATE);
      segments.push({
        source: 'warmup',
        label: `热身·${warmup.warmupDuration}min`,
        duration: warmup.warmupDuration,
        trimp,
      });
    }
    // fieldLoad/fieldTime from warmup calendar (used for field sessions scheduled via warmup UI)
    if (warmup.fieldTime && warmup.fieldTime > 0) {
      const trimp = Math.round(warmup.fieldTime * FIELD_DEFAULT_TRIMP_RATE);
      segments.push({
        source: 'addon',
        label: `场地训练·${warmup.fieldTime}min`,
        duration: warmup.fieldTime,
        trimp,
      });
    }
  }

  // ── 外场训练课（已归档） ──
  const fieldSession = getFieldSessionForDate(dateISO);
  if (fieldSession && fieldSession.totalTRIMP > 0) {
    segments.push({
      source: 'field_session',
      label: `外场课·${fieldSession.totalTRIMP}TRIMP`,
      duration: fieldSession.totalFieldTimeMin || 0,
      trimp: Math.round(fieldSession.totalTRIMP),
    });
  }

  // ── 计算当日总 TRIMP ──
  const totalTRIMP = segments.reduce((sum, s) => sum + s.trimp, 0);

  // ── 风险判定 ──
  let riskLevel: DailyLoad['riskLevel'] = 'normal';
  const t = getCurrentPhaseThresholds();
  if (totalTRIMP > t.dayHigh) riskLevel = 'high';
  else if (totalTRIMP > t.dayElevated) riskLevel = 'elevated';

  return { date: dateISO, weekday, mdLabel, segments, totalTRIMP, riskLevel };
}

// ═══════════════════════════════════════════
// 主函数
// ═══════════════════════════════════════════

/**
 * 计算比赛周的周负荷报告。
 * @param matchDate ISO 日期字符串 (YYYY-MM-DD)
 * @returns WeeklyLoadReport
 */
export function getWeeklyLoad(matchDate: string): WeeklyLoadReport {
  const match = new Date(matchDate + 'T00:00:00');
  const monday = getMonday(match);
  const sunday = getSunday(monday);

  const weekStart = dateStr(monday);
  const weekEnd = dateStr(sunday);

  const daily: DailyLoad[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dateISO = dateStr(day);
    const weekday = WEEKDAY_CN[day.getDay()];
    const mdDay = dayDiff(day, match);

    let mdLabel: string;
    if (mdDay === 0) mdLabel = 'MD';
    else if (mdDay > 0) mdLabel = `MD-${mdDay}`;
    else mdLabel = `MD+${Math.abs(mdDay)}`;

    daily.push(aggregateDailyLoad(dateISO, matchDate, mdDay, weekday, mdLabel));
  }

  const totalTRIMP = daily.reduce((sum, d) => sum + d.totalTRIMP, 0);
  const averageDailyTRIMP = Math.round(totalTRIMP / 7);

  // ── 周状态判定 ──
  let status: WeeklyLoadReport['status'] = 'safe';
  const warnings: string[] = [];

  const t = getCurrentPhaseThresholds();
  if (totalTRIMP > t.weekOverload) {
    status = 'overload';
    warnings.push(`周总负荷 ${totalTRIMP} > ${t.weekOverload}，处于超负荷区间（当前阶段上限）`);
  } else if (totalTRIMP > t.weekWarning) {
    status = 'warning';
    warnings.push(`周总负荷 ${totalTRIMP} > ${t.weekWarning}，偏高须关注恢复`);
  }

  // 连续 3 天高风险
  let consecutiveHigh = 0;
  for (const d of daily) {
    if (d.riskLevel === 'high') {
      consecutiveHigh++;
      if (consecutiveHigh >= 3) {
        warnings.push('连续3天高负荷，建议减量');
        break;
      }
    } else {
      consecutiveHigh = 0;
    }
  }

  // 比赛日高危提醒
  for (const d of daily) {
    if (d.mdLabel === 'MD' && d.riskLevel === 'high') {
      warnings.push('比赛日负荷偏高，关注赛后恢复');
    }
  }

  return { weekStart, weekEnd, daily, totalTRIMP, averageDailyTRIMP, status, warnings };
}

// ═══════════════════════════════════════════
// React Hook
// ═══════════════════════════════════════════

/** 每 5 秒轮询一次 localStorage，检测同窗口内变更 */
const POLL_INTERVAL = 5000;

/**
 * 响应式周负荷 Hook。
 * - 比赛日变化时立即重新计算
 * - 监听 storage 事件（跨标签页变更）
 * - 每 5 秒轮询（同窗口变更）
 */
export function useWeeklyLoad(matchDate: string): WeeklyLoadReport {
  const [report, setReport] = useState<WeeklyLoadReport>(() => getWeeklyLoad(matchDate));
  const matchDateRef = useRef(matchDate);
  matchDateRef.current = matchDate;

  const refresh = useCallback(() => {
    setReport(getWeeklyLoad(matchDateRef.current));
  }, []);

  // matchDate 变化时刷新
  useEffect(() => {
    refresh();
  }, [matchDate, refresh]);

  // 跨标签页变更
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [refresh]);

  // 同窗口轮询
  useEffect(() => {
    const id = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [refresh]);

  return report;
}
