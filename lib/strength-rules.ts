/**
 * 足球专项力量房训练规则 — 单一数据源
 * kenshin 制定，2026-06-08
 *
 * 用途：
 * - /api/validate-gym 系统提示词注入
 * - GymDesigner 默认参数匹配
 * - 自动排序逻辑
 * - AI 校验维度定义
 */

// ═══════════════════════════════════════════
// 一、五大动作模式 & 肌群分类
// ═══════════════════════════════════════════

export type MovementPattern =
  | "hip_hinge"      // 髋铰链 — 优先级1
  | "squat"          // 蹲 — 优先级2
  | "unilateral"     // 单侧下肢 — 优先级3，占比≥40%
  | "push"           // 推
  | "pull"           // 拉 — 配比拉>推
  | "rotation_anti"  // 旋转/抗旋 — 优先级5
  | "isolation";     // 孤立（仅刚需部位）

export type AnatomicalPlane = "sagittal" | "frontal" | "transverse";

export interface ExerciseRule {
  id: string;
  pattern: MovementPattern;
  plane: AnatomicalPlane;
  isCompound: boolean;
  jointStress: "knee" | "hip" | "shoulder" | "spine" | "ankle" | "none";
  intensity: "explosive" | "heavy" | "medium" | "light";
  // 场上应用场景
  fieldApplication: string;
  // 禁忌
  forbidden?: string;
  // 适用位置
  positionBias?: ("forward" | "midfielder" | "defender" | "goalkeeper")[];
}

/** 动作模式 → 编排优先级（数字越小越靠前） */
export const PATTERN_ORDER: Record<MovementPattern, number> = {
  hip_hinge: 1,
  squat: 2,
  unilateral: 2,    // 单侧与蹲同级，占比须≥40%
  push: 4,
  pull: 4,           // 推拉同级，拉>推
  rotation_anti: 5,
  isolation: 6,      // 最后
};

// ═══════════════════════════════════════════
// 二、三平面配比强制标准
// ═══════════════════════════════════════════

export const PLANE_RATIO = {
  sagittal:    { min: 0.45, max: 0.55, target: 0.50, label: "矢状面" },
  frontal:     { min: 0.25, max: 0.35, target: 0.30, label: "冠状面" },
  transverse:  { min: 0.15, max: 0.25, target: 0.20, label: "水平面" },
} as const;

// ═══════════════════════════════════════════
// 三、复合/孤立配比
// ═══════════════════════════════════════════

export const COMPOUND_RATIO = {
  compound:  { min: 0.75, target: 0.80, label: "复合动作" },
  isolation: { max: 0.25, target: 0.20, label: "孤立动作" },
} as const;

/** 仅允许的孤立动作列表（其他孤立动作警告） */
export const ALLOWED_ISOLATION = new Set([
  "nordic-hamstring-curl", "seated-calf-raise", "standing-calf-raise",
  "rapid-calf-raise", "face-pull", "band-face-pull",
  "tricep-pushdown", "cable-chest-fly",
]);

// ═══════════════════════════════════════════
// 四、肌力平衡硬性指标
// ═══════════════════════════════════════════

export const MUSCLE_BALANCE = {
  quadHamstringRatio: { min: 0.7, max: 0.8, label: "股四头肌:腘绳肌" },
  shoulderRule: "肩袖肌群 > 胸肌/三角肌前束",
  trunkRule: "下背伸肌 = 腹部屈肌",
} as const;

// ═══════════════════════════════════════════
// 五、负荷参数（按训练目标）
// ═══════════════════════════════════════════

export type TrainGoal = "strength" | "power" | "agility" | "mas_endurance";

export interface LoadParams {
  loadPctMin: number;
  loadPctMax: number;
  repsMin: number;
  repsMax: number;
  setsMin: number;
  setsMax: number;
  restMin: number;  // seconds
  restMax: number;
  tempo: string;
  note: string;
}

export const LOAD_PARAMS: Record<TrainGoal, LoadParams> = {
  // 快速力量/爆发力
  power: {
    loadPctMin: 30, loadPctMax: 60,
    repsMin: 2, repsMax: 6,
    setsMin: 3, setsMax: 5,
    restMin: 120, restMax: 180,
    tempo: "向心极速爆发，离心慢速控制",
    note: "足球核心目标，备赛期主力，赛季中减量保留",
  },
  // 功能性基础力量
  strength: {
    loadPctMin: 60, loadPctMax: 75,
    repsMin: 6, repsMax: 10,
    setsMin: 3, setsMax: 4,
    restMin: 90, restMax: 120,
    tempo: "中等速度，全程躯干刚性",
    note: "主流负荷区间，支撑/卡位/对抗",
  },
  // 协调灵敏（肌耐力向）
  agility: {
    loadPctMin: 40, loadPctMax: 60,
    repsMin: 12, repsMax: 20,
    setsMin: 3, setsMax: 4,
    restMin: 45, restMax: 60,
    tempo: "流畅持续，抗疲劳",
    note: "赛季中适用，90分钟不掉速",
  },
  // 专项耐力/损伤预防
  mas_endurance: {
    loadPctMin: 0, loadPctMax: 40,
    repsMin: 15, repsMax: 20,
    setsMin: 2, setsMax: 3,
    restMin: 30, restMax: 60,
    tempo: "慢速精准，感受目标肌肉",
    note: "腘绳肌/肩袖/臀中肌防伤",
  },
};

// ═══════════════════════════════════════════
// 六、分赛季频率与容量
// ═══════════════════════════════════════════

export type SeasonPhase = "offseason" | "preseason" | "competition" | "recovery";

export interface PhaseConfig {
  sessionsPerWeek: number;
  capacityPct: number;   // 相对休赛期的容量比例
  loadMaxPct: number;    // 最大1RM%
  focus: string;
  forbidden: string[];
}

export const PHASE_CONFIG: Record<SeasonPhase, PhaseConfig> = {
  offseason: {
    sessionsPerWeek: 4,
    capacityPct: 1.0,
    loadMaxPct: 80,
    focus: "基础力量搭建",
    forbidden: [],
  },
  preseason: {
    sessionsPerWeek: 3,
    capacityPct: 0.85,
    loadMaxPct: 75,
    focus: "爆发力+动作速度",
    forbidden: ["极限大重量(>85%1RM)"],
  },
  competition: {
    sessionsPerWeek: 2,
    capacityPct: 0.6,
    loadMaxPct: 65,
    focus: "维持+激活+防伤",
    forbidden: ["大重量深蹲", "大重量硬拉", "极限组", "连续下肢高强度"],
  },
  recovery: {
    sessionsPerWeek: 1,
    capacityPct: 0.3,
    loadMaxPct: 50,
    focus: "轻力量+每日激活放松",
    forbidden: ["所有高强度组", "爆发力动作", "大重量"],
  },
};

// ═══════════════════════════════════════════
// 七、编排顺序（通用流程）
// ═══════════════════════════════════════════

export const SEQUENCE_TEMPLATE: { phase: string; patterns: MovementPattern[]; note: string }[] = [
  { phase: "动态热身", patterns: [], note: "场地+器械激活，FIFA 11+标准化" },
  { phase: "爆发力", patterns: ["hip_hinge"], note: "药球抛、跳箱、轻重量快速硬拉" },
  { phase: "单侧下肢", patterns: ["unilateral"], note: "保加利亚分腿蹲、单腿RDL — 占比≥40%" },
  { phase: "双侧复合", patterns: ["squat", "hip_hinge"], note: "杯式深蹲、罗马尼亚硬拉" },
  { phase: "上肢推拉", patterns: ["pull", "push"], note: "拉>推，肩袖必练" },
  { phase: "旋转/抗旋", patterns: ["rotation_anti"], note: "Pallof推举、绳索伐木" },
  { phase: "局部孤立", patterns: ["isolation"], note: "仅腘绳肌/小腿/肩袖" },
  { phase: "拉伸放松", patterns: [], note: "静态拉伸+筋膜放松" },
];

// ═══════════════════════════════════════════
// 八、编排红线（硬性禁忌）
// ═══════════════════════════════════════════

export const SEQUENCE_RED_LINES = [
  "大重量深蹲/硬拉不放训练末尾",
  "下肢不连续高强度蹲+跳",
  "旋转动作后不立刻做大重量脊柱负重",
  "左右腿单侧动作必须同组交替",
];

// ═══════════════════════════════════════════
// 九、动作技术红线
// ═══════════════════════════════════════════

export const TECH_RED_LINES = {
  spine: "全程脊柱中立位，禁止弓背/塌腰/扭转",
  knee: "膝盖与脚尖一致，禁内扣，不锁死，禁大重量腿屈伸",
  hip: "优先髋铰链，减少膝关节分担",
  landing: "前脚掌→全脚掌落地，屈膝屈髋缓冲",
  shoulder: "肩胛稳定不耸肩，肩袖小幅度，禁颈后推举/下拉",
  unilateral: "两侧幅度/速度/负重一致，弱侧加组数不加重量",
};

// ═══════════════════════════════════════════
// 十、特殊人群差异化
// ═══════════════════════════════════════════

export type FieldPosition = "forward" | "midfielder" | "defender" | "goalkeeper";

export const POSITION_BIAS: Record<FieldPosition, {
  emphasis: MovementPattern[];
  reduce: MovementPattern[];
  note: string;
}> = {
  forward: {
    emphasis: ["hip_hinge", "unilateral"],
    reduce: ["squat"],
    note: "爆发+单侧+小腿，减少大重量静态深蹲",
  },
  midfielder: {
    emphasis: ["rotation_anti", "unilateral"],
    reduce: [],
    note: "肌耐力+抗旋+冠状面，容量适中",
  },
  defender: {
    emphasis: ["hip_hinge", "push", "pull"],
    reduce: [],
    note: "后侧链+躯干刚性+上肢推拉+减速控制",
  },
  goalkeeper: {
    emphasis: ["unilateral", "rotation_anti", "pull"],
    reduce: ["squat", "hip_hinge"],
    note: "单侧平衡+侧向+核心旋转+肩袖，下肢负荷降低",
  },
};

// ═══════════════════════════════════════════
// 十一、渐进超负荷规则
// ═══════════════════════════════════════════

export const PROGRESSION = {
  priority: ["动作速度", "次数", "重量"] as const,
  weeklyLoadIncreaseMax: 0.025,  // 2.5%
  seasonNoIncrease: true,         // 赛季中基本不加重量
  variationWeeks: 4,              // 每4周变式轮换
};

// ═══════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════

/** 根据训练目标获取默认组数/次数/间歇 */
export function getDefaultParams(goal: TrainGoal): { sets: number; reps: number; rest: number } {
  const p = LOAD_PARAMS[goal];
  return {
    sets: p.setsMin,
    reps: Math.round((p.repsMin + p.repsMax) / 2),
    rest: Math.round((p.restMin + p.restMax) / 2),
  };
}

/** 根据赛季阶段获取推荐训练频率 */
export function getSessionsPerWeek(phase: SeasonPhase): number {
  return PHASE_CONFIG[phase].sessionsPerWeek;
}

/** 根据位置获取侧重动作模式 */
export function getPositionEmphasis(position: string): MovementPattern[] {
  const p = position.toLowerCase();
  if (p === "forward" || p === "striker" || p === "center_forward" || p === "winger") {
    return POSITION_BIAS.forward.emphasis;
  }
  if (p === "midfielder" || p === "wingback") {
    return POSITION_BIAS.midfielder.emphasis;
  }
  if (p === "defender" || p === "center_back") {
    return POSITION_BIAS.defender.emphasis;
  }
  if (p === "goalkeeper") {
    return POSITION_BIAS.goalkeeper.emphasis;
  }
  return [];
}

/** 导出全部规则为 AI 可读文本（注入 system prompt） */
export function buildStrengthRulesContext(phase: string, goal: string): string {
  const phaseCfg = PHASE_CONFIG[phase as SeasonPhase];
  const loadParams = LOAD_PARAMS[goal as TrainGoal];

  return `
## 足球专项力量训练规则（教练审定）

### 核心逻辑
足球=间歇性高强度爆发。力量训练以功能性力量、快速力量、反应力量、关节稳定、肌力平衡为目标。
拒绝过度增肌，负荷偏中轻重量、快发力节奏，极少使用极限大重量。

### 五大动作模式优先级
1.髋铰链（最高）→ 2.蹲 → 3.单侧下肢（≥40%）→ 4.推/拉（拉>推）→ 5.旋转/抗旋
单侧动作占比必须≥40%，两侧必须均等。

### 三平面配比
矢状面50% / 冠状面30% / 水平面20%

### 复合/孤立配比
复合80% / 孤立20%。孤立仅限腘绳肌/小腿/肩袖。

### 肌力平衡硬指标
- 股四头肌:腘绳肌 = 1:0.7~0.8
- 肩袖肌群 > 胸肌/三角肌前束
- 下背伸肌 = 腹部屈肌
- 强化臀中肌（防膝内扣）

### 当前阶段参数
- 阶段：${phaseCfg?.focus || "维持"}，每周${phaseCfg?.sessionsPerWeek || 2}次
- 最大负荷：${phaseCfg?.loadMaxPct || 65}%1RM
- 禁止：${phaseCfg?.forbidden?.join("、") || "无"}
- 目标负荷：${loadParams?.loadPctMin || 40}-${loadParams?.loadPctMax || 75}%1RM
- 推荐次数：${loadParams?.repsMin || 6}-${loadParams?.repsMax || 10}次
- 组间间歇：${loadParams?.restMin || 60}-${loadParams?.restMax || 120}s

### 编排红线
1.大重量不放在训练末尾
2.下肢不连续高强度蹲+跳
3.旋转后不立刻大重量脊柱负重
4.左右腿单侧必须同组交替

### 技术红线
脊柱中立位/膝不内扣不锁死/优先髋铰链/落地屈膝缓冲/肩袖小幅度/弱侧加组不加重量

### 禁用动作
大重量腿屈伸、颈后推举/下拉、超大重量手臂弯举
`.trim();
}
