/**
 * 战术板统一设计 Token — 深色商务风
 *
 * 色值硬性规范：
 * - 底色 #111217 深炭黑（非纯黑）
 * - 主强调 #C4242E 低饱和酒红
 * - 禁止高饱和艳色、卡通填充、大块纯色按钮
 */

export const TAC_THEME = {
  // 背景色
  bg: "#111217",
  bgHeader: "#111217",
  bgToolbar: "rgba(17,18,23,0.96)",
  bgCard: "#1a1d24",
  bgInput: "#0d0e12",
  bgHover: "#1e222a",

  // 边框
  border: "#292A30",
  borderLight: "#333",

  // 文字
  textMain: "#c8ccd4",
  textDim: "#6b6f78",
  textWhite: "#fff",

  // 主强调色
  accent: "#C4242E",

  // 辅助色
  blue: "#2563EB",
  gray: "#999",

  // 功能色
  error: "#ef4444",
  success: "#279e46",

  // 场地
  grass: "#1a3828",
  grassLight: "#1e4028",
  fieldLine: "rgba(255,255,255,0.35)",
  fieldLineStrong: "rgba(255,255,255,0.25)",
  goalFill: "rgba(255,255,255,0.35)",

  // 圆角
  radius: "6px",

  // 球员标记
  playerRingWidth: 2,
  playerRadius: 20,
} as const;
