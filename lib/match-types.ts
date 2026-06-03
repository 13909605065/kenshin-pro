/* 赛程系统 */

export interface MatchRecord {
  id: string;
  date: string;          // ISO date YYYY-MM-DD
  time?: string;         // HH:MM
  opponent: string;      // 对手队名
  location: "home" | "away";
  venue?: string;        // 场地名称
  league?: string;       // 联赛/杯赛
  opponentStyle?: string; // 对手特点
  opponentWeakness?: string; // 对手弱点
  ourIssues?: string;    // 我方需注意问题
  notes?: string;
  result?: string;       // 比分 (赛后填写)
  status: "upcoming" | "played" | "cancelled";
}

export interface MatchImportRow {
  date: string;
  time?: string;
  opponent: string;
  location: string;
  venue?: string;
  league?: string;
}

/* 计算距离下一场比赛的天数 */
export function daysUntilNextMatch(matches: MatchRecord[]): number | null {
  const upcoming = matches
    .filter(m => m.status === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!upcoming.length) return null;
  const next = new Date(upcoming[0].date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((next.getTime() - today.getTime()) / 86400000);
}

/* 根据距比赛天数推荐训练重点 */
export function matchDayTrainingHint(days: number | null): string {
  if (days === null) return "";
  if (days < 0) return "比赛日已过，关注恢复和复盘";
  if (days === 0) return "比赛日！轻量激活+心理准备";
  if (days === 1) return "赛前1天：轻量技术+定位球+战术确认";
  if (days === 2) return "赛前2天：中等强度+战术演练+定位球";
  if (days <= 3) return "赛前3天：正常训练最后一天，重点战术磨合";
  if (days <= 5) return "赛前备战期：体能+战术并重";
  if (days <= 7) return "周中训练：正常周期，关注对手特点";
  return "备战期：充分训练，针对性准备";
}

/* 生成对手分析提示词片段 */
export function opponentHint(match: MatchRecord): string {
  const parts: string[] = [];
  if (match.opponentStyle) parts.push(`对手特点: ${match.opponentStyle}`);
  if (match.opponentWeakness) parts.push(`对手弱点: ${match.opponentWeakness}`);
  if (match.ourIssues) parts.push(`我方注意: ${match.ourIssues}`);
  if (match.location === "away") parts.push("客场作战");
  if (!parts.length) return "";
  return `下一场对手「${match.opponent}」情报:\n${parts.join("\n")}`;
}
