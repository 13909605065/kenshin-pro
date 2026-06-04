// ---- Tactical Board Types ----
export type EquipmentKind = "cone" | "ball" | "goal" | "marker_pole" | "player_home" | "player_away";
export interface TacticalScene { items: any[]; arrows: any[]; }
export type TacticalTool = "select" | "place_player" | "place_cone" | "place_ball" | "place_goal" | "place_marker_pole" | "draw_arrow" | "erase";

// ---- Form Input ----
export type Position = "goalkeeper" | "defender" | "midfielder" | "forward" | "wingback";
export type TrainingGoal = "strength" | "power" | "speed" | "agility" | "mas_endurance" | "combat";
export type FitnessGoal = "hypertrophy" | "fat_loss" | "body_shaping" | "general_fitness" | "strength_fitness" | "endurance_fitness";
export type SeasonPhase = "preseason" | "competition" | "recovery" | "offseason";
export type InjurySite = "knee" | "ankle" | "achilles" | "waist" | "thigh" | "hip" | "finger" | "wrist" | "shoulder";
export type UserRole = "athlete" | "coach" | "fitness";
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

export type Gender = "male" | "female";

export interface PlayerFormData {
  role: UserRole;
  name: string;
  gender: Gender;
  position: Position | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  years: number | null;
  injuryHistory: string;
  goal: TrainingGoal | FitnessGoal | null;
  phase: SeasonPhase | null;
  injurySites: InjurySite[];
  // Athlete-specific
  weakness: string; // "我的短板/想提升什么"
  // Coach-specific
  coachCert: CoachCert | null;
  coachRole: CoachRole | null;
  leagueTag: LeagueTag | null;
  tacticalThemes: TacticalTheme[];
  equipmentAvailable: string[]; // 可用器材列表
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
  analysis?: string;
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

// ---- Coach-specific Module Types ----

export interface SessionActivity {
  name: string;
  duration: number;
  area: string;
  groups: string;
  description: string;
  coaching_points: string[];
  progression: string;
  regression: string;
  diagram?: DrillDiagram; // 内联训练示意图
}

/** Drill context passed from training view to tactics board via localStorage */
export interface DrillContext {
  name: string;
  area: string;
  groups: string;
  coaching_points: string[];
  duration: number;
  description: string;
}

export interface SSGInfo {
  id: string;
  name: string;
  focus: string;
  duration: number;
  area: string;
  players: string;
  rules: string;
  coaching_focus: string[];
}

export interface SessionPlan {
  module: "session_plan";
  title: string;
  duration: number;
  player_count: number;
  equipment: string[];
  warmup: WarmupItem[];
  activities: SessionActivity[];
  ssg: SSGInfo;
  cooldown: WarmupItem[];
  status: "complete";
}

export interface TacticalFocus {
  module: "tactical_focus";
  title: string;
  tactical_theme: string;
  drills: SessionActivity[];
  /** Rich tactical analysis (4+ well-developed bullet points covering formation, patterns, transitions) */
  tactical_analysis?: string[];
  /** Formation-specific notes (e.g. "4-3-3 → 3-2-5 in attack") */
  formation_notes?: string;
  /** Pressing triggers — when and how to initiate the press */
  pressing_triggers?: string;
  /** Defensive shape and organization */
  defensive_shape?: string;
  /** Attacking patterns and combinations */
  attacking_patterns?: string;
  /** Key transition moments (attack↔defense) */
  transition_moments?: string;
  /** Offensive set piece organization */
  set_piece_offense?: string;
  /** Defensive set piece organization */
  set_piece_defense?: string;
  /** Player-specific tactical roles and responsibilities */
  player_roles?: string[];
  /** Counter-attacking structure and triggers */
  counter_structure?: string;
  /** Build-up phase: playing out from the back */
  build_up_phase?: string;
  /** Midfield transition: progressing through the middle third */
  midfield_transition?: string;
  /** Final third: chance creation and finishing patterns */
  final_third?: string;
  /** Defensive block: compactness, line spacing, pressing zones */
  defensive_block?: string;
  status: "complete";
}

export interface MicrocycleDay {
  day: string;
  focus: string;
  intensity: string;
  duration: number;
  session_type: string;
}

export interface Microcycle {
  module: "microcycle";
  title: string;
  match_day: string;
  days: MicrocycleDay[];
  status: "complete";
}

export type TrainingModule =
  | PositionTraining
  | AbilityTraining
  | TechniqueRunning
  | PhasePlan
  | InjuryRecovery
  | SessionPlan
  | TacticalFocus
  | Microcycle
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
