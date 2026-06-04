/**
 * 战术板统一设计 Token — 黑粉暗场风格
 *
 * 配色体系：
 * - 容器底色 #0d0d0d 纯黑（杜绝藏青窜色）
 * - 草坪 #17241c 暗墨绿（融入黑红UI，不跳脱）
 * - 标线 #e0e0e0 浅灰 / 关键线 #a81818 暗红
 * - 球员 己方#B91818红 / 对方#203E96蓝 / 门将#D49000橙
 * - 禁止高饱和艳色、卡通填充、大块纯色按钮
 */

export const TAC_THEME = {
  // 背景色 — 纯黑底，根除藏青
  bg: "#0d0d0d",
  bgHeader: "#0d0d0d",
  bgToolbar: "rgba(13,13,13,0.96)",
  bgCard: "#151515",
  bgInput: "#0a0a0a",
  bgHover: "#1c1c1c",

  // 边框
  border: "#292A30",
  borderLight: "#333",

  // 文字
  textMain: "#c8ccd4",
  textDim: "#777777",
  textWhite: "#fff",

  // 主强调色
  accent: "#C4242E",

  // 辅助色
  blue: "#203E96",
  gray: "#999",

  // 功能色
  error: "#ef4444",
  success: "#279e46",

  // ─── 场地配色：方案②标准黑粉暗场 ───
  grass: "#17241c",
  grassLight: "#1e2d24",
  fieldLine: "#e0e0e0",
  fieldLineStrong: "#a81818",
  goalFill: "#a81818",

  // ─── 球员配色：红蓝区分敌我 ───
  playerOwn: "#B91818",
  playerOpponent: "#203E96",
  playerGK: "#D49000",

  // 圆角
  radius: "6px",

  // 球员标记
  playerRingWidth: 2,
  playerRadius: 20,
} as const;
