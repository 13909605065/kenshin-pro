import { Position, SeasonPhase, InjurySite, CoachCert, CoachRole, LeagueTag, TacticalTheme } from "./types";

// ====== Simple Label Maps (shared with prompt.ts) ======

export const POSITION_LABELS: Record<Position, string> = {
  goalkeeper: "守门员",
  defender: "中后卫",
  midfielder: "中场",
  center_forward: "中锋",
  winger: "边锋",
  forward: "前锋",
  wingback: "边后卫",
};

export const GOAL_LABELS: Record<string, string> = {
  strength: "纯力量",
  power: "爆发力",
  speed: "速度",
  agility: "协调灵敏",
  mas_endurance: "耐力",
  combat: "对抗能力",
  hypertrophy: "肌肥大",
  fat_loss: "减脂",
  body_shaping: "塑形",
  general_fitness: "锻炼身体",
  strength_fitness: "增力",
  endurance_fitness: "耐力体能",
};

export const PHASE_LABELS: Record<SeasonPhase, string> = {
  preseason: "准备期",
  competition: "赛季期",
  recovery: "赛后恢复",
  offseason: "休赛期",
};

export const INJURY_LABELS: Record<InjurySite, string> = {
  knee: "膝关节",
  ankle: "踝关节",
  achilles: "跟腱",
  waist: "腰部",
  thigh: "大腿",
  hip: "髋关节",
  finger: "手指",
  wrist: "腕关节",
  shoulder: "肩关节",
};

export const COACH_CERT_LABELS: Record<CoachCert, string> = {
  pro: "PRO 职业级",
  a: "A 级",
  b: "B 级",
  c: "C 级",
  d: "D 级",
  none: "无证",
};

export const COACH_ROLE_LABELS: Record<CoachRole, string> = {
  campus: "校园教练",
  youth: "青训教练",
  amateur: "业余教练",
  semi_pro: "半职业教练",
  pro: "职业教练",
};

export const LEAGUE_TAG_LABELS: Record<LeagueTag, string> = {
  youth_u12: "青训 U12",
  youth_u15: "青训 U15",
  youth_u18: "青训 U18",
  youth_u20: "青训 U20",
  youth_u21: "青训 U21",
  campus_u6_u12: "校园 U6-U12",
  china_league_two: "中乙",
  china_league_one: "中甲",
  chinese_super_league: "中超",
  amateur_team: "业余队",
};

export const TACTICAL_THEME_LABELS: Record<TacticalTheme, string> = {
  possession: "控球",
  shooting: "射门",
  crossing: "传中",
  defending: "防守",
  pressing: "压迫",
  counterattack: "反击",
  set_pieces: "定位球",
  positional_attack: "阵地进攻",
};

// ====== Rich Option Lists (with icons/descriptions for UI) ======

export const POSITION_OPTIONS = [
  { value: "goalkeeper" as const, label: "守门员" },
  { value: "defender" as const, label: "后卫" },
  { value: "midfielder" as const, label: "中场" },
  { value: "forward" as const, label: "前锋" },
  { value: "wingback" as const, label: "翼卫" },
];

export const COACH_CERT_OPTIONS = [
  { value: "pro" as const, label: "PRO" },
  { value: "a" as const, label: "A 级" },
  { value: "b" as const, label: "B 级" },
  { value: "c" as const, label: "C 级" },
  { value: "d" as const, label: "D 级" },
  { value: "none" as const, label: "无证" },
];

export const COACH_ROLE_OPTIONS = [
  { value: "campus" as const, label: "校园教练" },
  { value: "youth" as const, label: "青训教练" },
  { value: "amateur" as const, label: "业余教练" },
  { value: "semi_pro" as const, label: "半职业教练" },
  { value: "pro" as const, label: "职业教练" },
];

export const LEAGUE_TAG_OPTIONS: { value: LeagueTag; label: string; group: "youth" | "campus" | "pro" | "amateur" }[] = [
  { value: "youth_u12", label: "青训 U12", group: "youth" },
  { value: "youth_u15", label: "青训 U15", group: "youth" },
  { value: "youth_u18", label: "青训 U18", group: "youth" },
  { value: "youth_u20", label: "青训 U20", group: "youth" },
  { value: "youth_u21", label: "青训 U21", group: "youth" },
  { value: "campus_u6_u12", label: "校园 U6-U12", group: "campus" },
  { value: "amateur_team", label: "业余队", group: "amateur" },
  { value: "china_league_two", label: "中乙", group: "pro" },
  { value: "china_league_one", label: "中甲", group: "pro" },
  { value: "chinese_super_league", label: "中超", group: "pro" },
];

// ====== Certificate → Role → League Linkage Rules ======

export const CERT_LINKAGE: Record<CoachCert, {
  allowedRoles: CoachRole[];
  allowedLeagues: LeagueTag[];
}> = {
  none: {
    allowedRoles: ["campus", "amateur"],
    allowedLeagues: ["campus_u6_u12", "amateur_team"],
  },
  d: {
    allowedRoles: ["campus", "amateur", "youth"],
    allowedLeagues: ["youth_u12", "youth_u15", "campus_u6_u12", "amateur_team"],
  },
  c: {
    allowedRoles: ["campus", "amateur", "youth"],
    allowedLeagues: ["youth_u12", "youth_u15", "youth_u18", "campus_u6_u12", "amateur_team"],
  },
  b: {
    allowedRoles: ["youth", "amateur", "semi_pro"],
    allowedLeagues: ["youth_u15", "youth_u18", "youth_u20", "amateur_team", "china_league_two"],
  },
  a: {
    allowedRoles: ["youth", "semi_pro", "pro"],
    allowedLeagues: ["youth_u20", "youth_u21", "china_league_two", "china_league_one"],
  },
  pro: {
    allowedRoles: ["campus", "youth", "amateur", "semi_pro", "pro"],
    allowedLeagues: [
      "youth_u12", "youth_u15", "youth_u18", "youth_u20", "youth_u21",
      "campus_u6_u12", "amateur_team",
      "china_league_two", "china_league_one", "chinese_super_league",
    ],
  },
};

export const INJURY_SITE_OPTIONS = [
  { value: "knee" as const, label: "膝关节", region: "膝" },
  { value: "ankle" as const, label: "踝关节", region: "踝" },
  { value: "achilles" as const, label: "跟腱", region: "跟腱" },
  { value: "waist" as const, label: "腰部", region: "腰" },
  { value: "thigh" as const, label: "大腿", region: "大腿" },
  { value: "hip" as const, label: "髋关节", region: "髋" },
  { value: "finger" as const, label: "手指", region: "手指" },
  { value: "wrist" as const, label: "腕关节", region: "腕" },
  { value: "shoulder" as const, label: "肩关节", region: "肩" },
];

export const TACTICAL_THEME_OPTIONS = [
  { value: "possession" as const, label: "控球", icon: "⚽" },
  { value: "shooting" as const, label: "射门", icon: "🎯" },
  { value: "crossing" as const, label: "传中", icon: "↗️" },
  { value: "defending" as const, label: "防守", icon: "🛡️" },
  { value: "pressing" as const, label: "压迫", icon: "⚡" },
  { value: "counterattack" as const, label: "反击", icon: "💨" },
  { value: "set_pieces" as const, label: "定位球", icon: "🎪" },
  { value: "positional_attack" as const, label: "阵地进攻", icon: "🏗️" },
];
