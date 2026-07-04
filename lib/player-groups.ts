/**
 * 球员分组工具 — U21/GK/位置分组
 *
 * 基于 PlayerRecord 的 age/position 字段纯计算，不新增字段。
 * 所有函数都是纯函数，无副作用。
 */

import type { PlayerRecord } from "@/lib/roster-utils";

/* ───────────────────────────────────────────
   Types
   ─────────────────────────────────────────── */

export enum PlayerGroup {
  GK = "门将",
  DEF = "后卫",
  MID = "中场",
  FWD = "前锋",
  U21 = "U21",
}

export const GROUP_META: Record<PlayerGroup, { label: string; emoji: string; cssBorder: string }> = {
  [PlayerGroup.GK]:  { label: "门将", emoji: "🧤", cssBorder: "border-l-yellow-500" },
  [PlayerGroup.DEF]: { label: "后卫", emoji: "🛡️", cssBorder: "border-l-blue-500" },
  [PlayerGroup.MID]: { label: "中场", emoji: "⚡", cssBorder: "border-l-green-500" },
  [PlayerGroup.FWD]: { label: "前锋", emoji: "🎯", cssBorder: "border-l-red-500" },
  [PlayerGroup.U21]: { label: "U21", emoji: "🌱", cssBorder: "border-l-purple-500" },
};

export interface GroupedPlayers {
  group: PlayerGroup;
  players: PlayerRecord[];
}

/* ───────────────────────────────────────────
   Position classification
   ─────────────────────────────────────────── */

const FORWARD_POSITIONS = ["中锋", "影锋", "边锋"];
const DEFENDER_POSITIONS = ["中后卫", "左后卫", "右后卫", "左边翼卫", "右边翼卫"];
const MIDFIELD_POSITIONS = ["后腰", "中前卫", "前腰"];

/** 根据中文位置返回分组 */
export function getPositionGroup(position: string): PlayerGroup {
  if (position === "门将") return PlayerGroup.GK;
  if (DEFENDER_POSITIONS.includes(position)) return PlayerGroup.DEF;
  if (MIDFIELD_POSITIONS.includes(position)) return PlayerGroup.MID;
  if (FORWARD_POSITIONS.includes(position)) return PlayerGroup.FWD;
  return PlayerGroup.MID; // 未知位置默认中场
}

/* ───────────────────────────────────────────
   Filters
   ─────────────────────────────────────────── */

export function isU21(player: { age: number | null }): boolean {
  return player.age != null && player.age <= 21;
}

export function isGoalkeeper(player: { position: string }): boolean {
  return player.position === "门将";
}

export function getU21Players(players: PlayerRecord[]): PlayerRecord[] {
  return players.filter((p) => isU21(p));
}

export function getGoalkeepers(players: PlayerRecord[]): PlayerRecord[] {
  return players.filter((p) => isGoalkeeper(p));
}

/* ───────────────────────────────────────────
   Grouping (主函数)
   ─────────────────────────────────────────── */

/**
 * 将球员列表按位置+U21分组。
 * U21 球员会同时出现在位置组和 U21 组中（用于独立的 U21 配额统计）。
 * 如果不希望重复，使用 groupByPositionExclusive。
 */
export function groupByPosition(players: PlayerRecord[]): GroupedPlayers[] {
  const result: GroupedPlayers[] = [];
  const order = [PlayerGroup.GK, PlayerGroup.DEF, PlayerGroup.MID, PlayerGroup.FWD, PlayerGroup.U21];

  const groups = new Map<PlayerGroup, PlayerRecord[]>();
  for (const g of order) groups.set(g, []);

  for (const p of players) {
    const posGroup = getPositionGroup(p.position);
    groups.get(posGroup)!.push(p);
    if (isU21(p)) {
      groups.get(PlayerGroup.U21)!.push(p);
    }
  }

  for (const g of order) {
    const groupPlayers = groups.get(g)!;
    if (groupPlayers.length > 0) {
      result.push({ group: g, players: groupPlayers });
    }
  }

  return result;
}

/**
 * U21 配额建议。
 * 足协通常要求每场 U21 球员累计出场时间达标。
 * 这里给出本周 U21 参训天数统计。
 */
export interface U21QuotaCheck {
  u21Count: number;
  u21Names: string[];
  message: string;
  isWarning: boolean;
}

/** 检查 U21 训练配额（需配合 attendance 数据使用） */
export function checkU21Quota(
  allPlayers: PlayerRecord[],
  attendanceDatesThisWeek: string[] // 本周有训练的日期列表
): U21QuotaCheck {
  const u21 = getU21Players(allPlayers);
  if (u21.length === 0) {
    return { u21Count: 0, u21Names: [], message: "无 U21 球员在册", isWarning: false };
  }

  const trainingDays = attendanceDatesThisWeek.length;
  const minTrainingDays = 3; // 足协通常要求每周至少 3 次训练

  if (trainingDays < minTrainingDays) {
    return {
      u21Count: u21.length,
      u21Names: u21.map((p) => p.name),
      message: `本周仅 ${trainingDays} 天有训练记录，U21 配额不足（需≥${minTrainingDays}天）`,
      isWarning: true,
    };
  }

  return {
    u21Count: u21.length,
    u21Names: u21.map((p) => p.name),
    message: `U21 ${u21.length} 人 · 本周 ${trainingDays} 天训练 ✓`,
    isWarning: false,
  };
}
