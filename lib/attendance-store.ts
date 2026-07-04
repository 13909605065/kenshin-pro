/**
 * 每日训练参训签到数据层
 *
 * 存储键：kenshin_attendance_${teamId}（team-scoped），仅保留最近 90 天。
 * 数据流：CoachWorkbench 读/写 → 负荷页消费 → ACWR 自动修正
 */

import { teamGet, teamSet } from "@/lib/team-storage";
import { notifyChange } from "@/lib/data-events";
import type { PlayerRecord } from "@/lib/roster-utils";

/* ───────────────────────────────────────────
   Types
   ─────────────────────────────────────────── */

export type AbsenceReason = "rest" | "injury" | "suspension" | "leave" | "other";

export const ABSENCE_LABELS: Record<AbsenceReason, string> = {
  rest: "轮休",
  injury: "伤病",
  suspension: "停赛",
  leave: "请假",
  other: "其他",
};

export const ABSENCE_ORDER: AbsenceReason[] = ["rest", "injury", "suspension", "leave", "other"];

export interface AttendanceEntry {
  playerId: string;
  present: boolean;
  absenceReason: AbsenceReason | null; // null = present 或 absent 但未标记
}

export interface DailyAttendance {
  date: string; // YYYY-MM-DD
  entries: AttendanceEntry[];
  updatedAt: string; // ISO timestamp
}

/* ───────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────── */

const ATTENDANCE_KEY = "kenshin_attendance";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ───────────────────────────────────────────
   CRUD
   ─────────────────────────────────────────── */

/** Load all attendance records from localStorage */
function loadAll(): DailyAttendance[] {
  try {
    return JSON.parse(teamGet(ATTENDANCE_KEY) || "[]") as DailyAttendance[];
  } catch {
    return [];
  }
}

function saveAll(records: DailyAttendance[]): void {
  // 只保留 90 天
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const filtered = records.filter((r) => r.date >= cutoffStr);
  teamSet(ATTENDANCE_KEY, JSON.stringify(filtered));
  notifyChange("attendance-updated");
}

/** 获取某一天的参训记录 */
export function getAttendanceByDate(date?: string): DailyAttendance | null {
  const key = date || todayStr();
  return loadAll().find((a) => a.date === key) || null;
}

/** 获取今日参训记录 */
export function getTodayAttendance(): DailyAttendance | null {
  return getAttendanceByDate(todayStr());
}

/** 保存/更新某一天的参训记录 */
export function saveAttendance(record: DailyAttendance): void {
  const all = loadAll();
  const idx = all.findIndex((a) => a.date === record.date);
  record.updatedAt = new Date().toISOString();
  if (idx >= 0) all[idx] = record;
  else all.unshift(record);
  saveAll(all);
}

/** 获取参训球员 ID 集合 */
export function getAttendingPlayerIds(date?: string): Set<string> {
  const record = getAttendanceByDate(date);
  if (!record) return new Set();
  return new Set(record.entries.filter((e) => e.present).map((e) => e.playerId));
}

/** 获取缺席球员条目 */
export function getAbsentEntries(date?: string): AttendanceEntry[] {
  const record = getAttendanceByDate(date);
  if (!record) return [];
  return record.entries.filter((e) => !e.present);
}

/** 批量设置参训球员（从全队花名册 + 参训 ID 集合构建记录） */
export function buildAttendance(
  allPlayers: PlayerRecord[],
  attendingIds: Set<string>,
  date?: string
): DailyAttendance {
  const key = date || todayStr();
  const existing = getAttendanceByDate(key);
  const oldReasons: Record<string, AbsenceReason | null> = {};
  if (existing) {
    for (const e of existing.entries) {
      oldReasons[e.playerId] = e.absenceReason;
    }
  }

  const entries: AttendanceEntry[] = allPlayers.map((p) => {
    const present = attendingIds.has(p.id);
    let absenceReason: AbsenceReason | null = null;
    if (!present) {
      // 伤病球员自动标记
      if (p.injuryStatus === "out") {
        absenceReason = "injury";
      } else if (p.injuryStatus === "minor") {
        absenceReason = oldReasons[p.id] || "injury";
      } else {
        absenceReason = oldReasons[p.id] || null; // null = 未标记
      }
    }
    return { playerId: p.id, present, absenceReason };
  });

  return { date: key, entries, updatedAt: new Date().toISOString() };
}

/** 更新单个球员的缺席原因 */
export function setAbsentReason(
  playerId: string,
  reason: AbsenceReason | null,
  date?: string
): void {
  const key = date || todayStr();
  let record = getAttendanceByDate(key);
  if (!record) return;

  const entry = record.entries.find((e) => e.playerId === playerId);
  if (entry) {
    entry.absenceReason = reason;
    saveAttendance(record);
  }
}

/* ───────────────────────────────────────────
   缺席统计（供负荷页和警告横幅使用）
   ─────────────────────────────────────────── */

export interface AttendanceStats {
  totalRoster: number;
  attending: number;
  absent: number;
  absentByReason: Record<string, number>; // "rest" → 3, "injury" → 2, etc.
  unmarked: number; // 缺席但未标记原因
  absentPlayers: Array<{ playerId: string; name: string; position: string; reason: AbsenceReason | null }>;
}

/** 计算参训统计 */
export function getAttendanceStats(
  allPlayers: PlayerRecord[],
  date?: string
): AttendanceStats {
  const record = getAttendanceByDate(date);
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

  const absentByReason: Record<string, number> = {};
  let attending = 0;
  let absent = 0;
  let unmarked = 0;
  const absentPlayers: AttendanceStats["absentPlayers"] = [];

  if (!record) {
    // 无记录 = 全员默认参训
    return {
      totalRoster: allPlayers.length,
      attending: allPlayers.length,
      absent: 0,
      absentByReason: {},
      unmarked: 0,
      absentPlayers: [],
    };
  }

  for (const e of record.entries) {
    if (e.present) {
      attending++;
    } else {
      absent++;
      const player = playerMap.get(e.playerId);
      if (e.absenceReason) {
        absentByReason[e.absenceReason] = (absentByReason[e.absenceReason] || 0) + 1;
      } else {
        unmarked++;
      }
      absentPlayers.push({
        playerId: e.playerId,
        name: player?.name || "未知球员",
        position: player?.position || "—",
        reason: e.absenceReason,
      });
    }
  }

  return {
    totalRoster: allPlayers.length,
    attending,
    absent,
    absentByReason,
    unmarked,
    absentPlayers,
  };
}

/* ───────────────────────────────────────────
   负荷分类（供 supplement-load.ts 调用）
   ─────────────────────────────────────────── */

export type LoadClassification =
  | "attending"   // 参训，正常计算
  | "rest"        // 轮休，0负荷+不触发警告
  | "injury"      // 伤病，0负荷
  | "suspension"  // 停赛，0负荷+不触发警告
  | "leave"       // 请假，0负荷+不触发警告
  | "other"       // 其他，0负荷
  | "unmarked";   // 未标记缺席，0负荷+触发数据缺失警告

/** 根据参训记录分类球员负荷状态 */
export function classifyLoadStatus(
  playerId: string,
  date?: string
): LoadClassification {
  const record = getAttendanceByDate(date);
  if (!record) return "attending"; // 无记录默认参训

  const entry = record.entries.find((e) => e.playerId === playerId);
  if (!entry || entry.present) return "attending";

  if (!entry.absenceReason) return "unmarked";

  switch (entry.absenceReason) {
    case "rest":
    case "suspension":
    case "leave":
      return entry.absenceReason; // "rest" | "suspension" | "leave"
    case "injury":
    case "other":
      return entry.absenceReason; // "injury" | "other"
    default:
      return "unmarked";
  }
}

/* ───────────────────────────────────────────
   U21 / GK helpers
   ─────────────────────────────────────────── */

/** U21 判断：年龄 ≤ 21 */
export function isU21(player: { age: number | null }): boolean {
  return player.age != null && player.age <= 21;
}

/** 门将判断 */
export function isGoalkeeper(player: { position: string }): boolean {
  return player.position === "门将";
}
