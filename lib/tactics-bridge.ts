/**
 * 教案→战术板 桥接工具
 *
 * 教练在训练教案中点击练习的「在战术板打开」→ 写到 localStorage →
 * 战术板页面读取 → 自动渲染场地背景 + 球员站位 + 指导标注。
 */

import type { SessionActivity, DrillContext } from "@/lib/types";

const STORAGE_KEY = "tac_drill_context";

// ---------- localStorage 读写 ----------

/** 将练习上下文写入 localStorage，准备跳转战术板 */
export function writeDrillContext(activity: SessionActivity): void {
  const ctx: DrillContext = {
    name: activity.name,
    area: activity.area,
    groups: activity.groups,
    coaching_points: activity.coaching_points,
    duration: activity.duration,
    description: activity.description,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    // localStorage 满了或不可用，静默失败
  }
}

/** 读取并清除 drill 上下文。返回 null 表示无待加载的上下文。 */
export function readDrillContext(): DrillContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw) as DrillContext;
  } catch {
    return null;
  }
}

// ---------- 分组解析 ----------

/** 解析分组字符串 => 红/蓝/中性人数 */
export function parseGroups(groups: string): {
  red: number;
  blue: number;
  neutral: number;
} {
  // 匹配 "4v4+2", "3v3", "6v5+1", "11v11"
  const vMatch = groups.match(/(\d+)\s*v\s*(\d+)(?:\s*\+\s*(\d+))?/i);
  if (vMatch) {
    return {
      red: parseInt(vMatch[1], 10),
      blue: parseInt(vMatch[2], 10),
      neutral: vMatch[3] ? parseInt(vMatch[3], 10) : 0,
    };
  }

  // 匹配纯数字 "8", "10 players", "12人"
  const numMatch = groups.match(/(\d+)/);
  if (numMatch) {
    const total = parseInt(numMatch[1], 10);
    const half = Math.ceil(total / 2);
    return { red: half, blue: total - half, neutral: 0 };
  }

  // 兜底
  return { red: 5, blue: 5, neutral: 0 };
}

// ---------- 场地映射 ----------

/** 将中文场地区域映射到 /public/equipment/ 下的场地图片文件名 */
export function mapAreaToField(area: string): string {
  const a = area.toLowerCase();
  if (a.includes("全场")) return "场地";
  if (a.includes("半场")) return "场地6";
  if (a.includes("禁区") || a.includes("box") || a.includes("penalty"))
    return "场地5";
  if (a.includes("中场") || a.includes("middle")) return "场地2";
  if (a.includes("边路") || a.includes("wing") || a.includes("flank"))
    return "场地3";
  if (a.includes("小场地") || a.includes("small")) return "场地7";
  return "场地"; // 默认全场
}

// ---------- 球员站位计算 ----------

/** 画布尺寸（与 FabricBoard 保持一致） */
const CANVAS_W = 1050;
const CANVAS_H = 680;

export interface PlayerPosition {
  x: number;
  y: number;
  n: string; // 球衣号码/标识
  c: string; // 颜色 hex
}

/** 根据人数 + 区域，计算球员在战术板上的坐标 */
export function computePlayerPositions(
  red: number,
  blue: number,
  neutral: number,
  area: string
): PlayerPosition[] {
  const isHalf = area.toLowerCase().includes("半场");
  const positions: PlayerPosition[] = [];

  // 红方：攻方，左侧
  const redZoneLeft = isHalf ? 20 : 20;
  const redZoneRight = isHalf ? CANVAS_W / 2 - 60 : CANVAS_W / 2 - 80;
  addTeam(positions, red, redZoneLeft, redZoneRight, "#FF2D55");

  // 蓝方：守方，右侧
  const blueZoneLeft = isHalf ? CANVAS_W / 2 + 20 : CANVAS_W / 2 + 80;
  const blueZoneRight = isHalf ? CANVAS_W - 20 : CANVAS_W - 20;
  addTeam(positions, blue, blueZoneLeft, blueZoneRight, "#3B82F6");

  // 中性球员：中间纵列，金色
  const neutralYSpacing = Math.min(80, CANVAS_H / Math.max(neutral, 1));
  for (let i = 0; i < neutral; i++) {
    positions.push({
      x: CANVAS_W / 2,
      y: 60 + i * neutralYSpacing,
      n: `N${i + 1}`,
      c: "#FFD700",
    });
  }

  return positions;
}

/** 在指定区域内按网格排列一队球员 */
function addTeam(
  positions: PlayerPosition[],
  count: number,
  zoneLeft: number,
  zoneRight: number,
  color: string
): void {
  if (count <= 0) return;

  const zoneW = zoneRight - zoneLeft;
  const cols = Math.ceil(Math.sqrt((count * zoneW) / CANVAS_H));
  const rows = Math.ceil(count / cols);
  const cellW = zoneW / cols;
  const cellH = Math.min(100, CANVAS_H / Math.max(rows, 1));
  const startY = (CANVAS_H - rows * cellH) / 2 + cellH / 2;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push({
      x: zoneLeft + col * cellW + cellW / 2,
      y: startY + row * cellH,
      n: String(i + 1),
      c: color,
    });
  }
}
