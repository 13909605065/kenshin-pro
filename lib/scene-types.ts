/**
 * 场景系统 — 三身份：教练 / 运动员 / 健身者
 */

export type Role = "coach" | "athlete" | "fitness";

// 教练3场景
export const COACH_SCENES = [
  { id: "planning" as const, label: "备战", icon: "🎯" },
  { id: "pitch" as const, label: "训练场", icon: "🏟️" },
  { id: "gym" as const, label: "力量房", icon: "🏋️" },
];

// 运动员3场景 — 对应四大板块中的板块二/三/四
export const ATHLETE_SCENES = [
  { id: "pitch" as const, label: "场地训练", icon: "⚽" },
  { id: "gym" as const, label: "力量房", icon: "🏋️" },
  { id: "rehab" as const, label: "伤病防控", icon: "🩺" },
];

// 健身者2场景 — 纯健身/塑形，无关足球
export const FITNESS_SCENES = [
  { id: "workout" as const, label: "训练", icon: "💪" },
  { id: "nutrition" as const, label: "营养", icon: "🥗" },
];

export type CoachScene = (typeof COACH_SCENES)[number]["id"];
export type AthleteScene = (typeof ATHLETE_SCENES)[number]["id"];
export type FitnessScene = (typeof FITNESS_SCENES)[number]["id"];
export type Scene = CoachScene | AthleteScene | FitnessScene;

/** 获取角色对应的场景列表 */
export function getScenes(role: Role) {
  if (role === "coach") return COACH_SCENES;
  if (role === "fitness") return FITNESS_SCENES;
  return ATHLETE_SCENES;
}

/** 角色默认场景 */
export function getDefaultScene(role: Role): Scene {
  if (role === "coach") return "planning";
  if (role === "fitness") return "workout";
  return "pitch";
}
