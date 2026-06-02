// ---- Form Input ----
export type Position = "goalkeeper" | "defender" | "midfielder" | "forward" | "wingback";
export type TrainingGoal = "strength" | "power" | "speed" | "agility" | "mas_endurance" | "combat";
export type SeasonPhase = "preseason" | "competition" | "recovery" | "offseason";
export type InjurySite = "knee" | "ankle" | "achilles" | "waist" | "thigh" | "hip" | "finger" | "wrist" | "shoulder";
export type UserRole = "athlete" | "coach";
// 六档教练证书等级
export type CoachCert = "pro" | "a" | "b" | "c" | "d" | "none";

// 五种执教身份赛道
export type CoachRole = "campus" | "youth" | "amateur" | "semi_pro" | "pro";

// 联赛/梯队标签
export type LeagueTag =
  | "youth_u12" | "youth_u15" | "youth_u18" | "youth_u20" | "youth_u21"
  | "campus_u6_u12"
  | "china_league_two" | "china_league_one" | "chinese_super_league"
  | "amateur_team";
export type TacticalTheme = "possession" | "shooting" | "crossing" | "defending" | "pressing" | "counterattack" | "set_pieces" | "positional_attack";

export interface PlayerFormData {
  role: UserRole;
  name: string;
  position: Position | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  years: number | null;
  injuryHistory: string;
  goal: TrainingGoal | null;
  phase: SeasonPhase | null;
  injurySites: InjurySite[];
  // Coach-specific
  coachCert: CoachCert | null;
  coachRole: CoachRole | null;
  leagueTag: LeagueTag | null;
  tacticalThemes: TacticalTheme[];
}

// ---- Training Module Output ----
export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  load: string;
  rest: number;
  rpe: number;
  heart_rate_zone: string;
  image_url?: string;
  side_view_url?: string;
  force_points?: ForcePoint[];      // 发力方向标注
  joint_angles?: JointAngle[];      // 关节角度标注
  prime_movers?: string[];          // 主要参与肌群
  cue_points?: string[];            // 动作要点
}

export interface ForcePoint {
  label: string;         // e.g. "胸大肌向心收缩"
  direction: "up" | "down" | "left" | "right" | "upleft" | "upright" | "downleft" | "downright";
  muscle_group: string;  // e.g. "胸大肌"
}

export interface JointAngle {
  joint_name: string;    // e.g. "肘关节"
  angle: string;         // e.g. "90°"
  note: string;          // e.g. "下落至肘与肩平"
}

export interface AbilityExercise extends Exercise {
  progression: string;
}

export interface Drill {
  name: string;
  duration: number;
  description: string;
  image_url?: string;             // 动作示范图
  purpose?: string;               // 训练目的
  key_points?: string[];          // 技术要点
  diagram?: DrillDiagram;         // 场地示意图
}

export interface DrillDiagram {
  layout: "linear" | "zigzag" | "square" | "t_shape" | "l_shape" | "triangle";
  cone_count: number;            // 标志盘/桶数量
  cone_spacing: string;          // e.g. "5m"
  total_distance?: string;       // e.g. "20m"
  start_label?: string;          // e.g. "起点"
  end_label?: string;            // e.g. "终点"
  route_style?: "solid" | "dashed";  // 路线样式
  route_label?: string;          // e.g. "冲刺路线"
}

export interface RunningProfile {
  total_distance: string;
  intensity_zones: string[];
}

export interface RehabPhase {
  name: string;
  exercises: Exercise[];
  evaluation: string;
}

export interface WarmupItem {
  name: string;
  duration: number;
  description: string;
}

export interface NutritionInfo {
  pre_training: string;
  post_training: string;
  daily_plan: string;
  hydration: string;
  supplements: string;
}

export interface PositionTraining {
  module: "position_training";
  title: string;
  warmup: WarmupItem[];
  upper_limb: Exercise[];
  lower_limb: Exercise[];
  core: Exercise[];
  cooldown: WarmupItem[];
  nutrition: NutritionInfo;
  status: "complete";
}

export interface AbilityTraining {
  module: "ability_training";
  title: string;
  exercises: AbilityExercise[];
  status: "complete";
}

export interface TechniqueRunning {
  module: "technique_running";
  title: string;
  drills: Drill[];
  running_profile: RunningProfile;
  status: "complete";
}

export interface PhasePlan {
  module: "phase_plan";
  title: string;
  weekly_frequency: number;
  session_duration: number;
  intensity_distribution: { low: number; medium: number; high: number };
  recovery_strategy: string;
  status: "complete";
}

export interface InjuryRecovery {
  module: "injury_recovery";
  title: string;
  phases: RehabPhase[];
  status: "complete" | "skipped";
}

export interface ParseError {
  module: "parse_error";
  title: string;
  raw: string;
  status: "complete";
}

export type TrainingModule =
  | PositionTraining
  | AbilityTraining
  | TechniqueRunning
  | PhasePlan
  | InjuryRecovery
  | ParseError;

// ---- Generation State ----
export type GenerationStatus =
  | "idle"
  | "generating"
  | "streaming"
  | "complete"
  | "error"
  | "stream-interrupted";

// ---- History ----
export interface TrainingHistoryItem {
  id: string;
  user_id: string;
  form_data: PlayerFormData;
  plan_content: TrainingModule[];
  is_favorite: boolean;
  created_at: string;
}

// ---- Feedback ----
export type FeedbackRating = "up" | "down";
