/**
 * 场景系统 — 顶部标签栏切换，零额外步骤
 */

export type Role = "coach" | "athlete";

// 教练3场景
export const COACH_SCENES = [
  { id: "planning" as const, label: "备课", icon: "📋" },
  { id: "pitch" as const, label: "训练场", icon: "🏟️" },
  { id: "gym" as const, label: "健身房", icon: "🏋️" },
];

// 运动员2场景
export const ATHLETE_SCENES = [
  { id: "pitch" as const, label: "球场", icon: "⚽" },
  { id: "gym" as const, label: "健身房", icon: "🏋️" },
];

export type CoachScene = (typeof COACH_SCENES)[number]["id"];
export type AthleteScene = (typeof ATHLETE_SCENES)[number]["id"];
export type Scene = CoachScene | AthleteScene;

/** 获取角色对应的场景列表 */
export function getScenes(role: Role) {
  return role === "coach" ? COACH_SCENES : ATHLETE_SCENES;
}

/** 角色默认场景 */
export function getDefaultScene(role: Role): Scene {
  return role === "coach" ? "planning" : "pitch";
}
