/**
 * 1RM 估算器 — 基于次最大重量推算最大力量
 *
 * 支持 Epley / Brzycki / Lander / Lombardi / O'Conner 五种公式，
 * 含力量分级标准和多RM转换。
 */

// ═══════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════

export type OneRMFormula = 'epley' | 'brzycki' | 'lander' | 'lombardi' | 'o_conner';

export interface OneRMInput {
  /** 使用的重量 (kg) */
  weight: number;
  /** 完成的次数（建议 ≤10 以确保准确性） */
  reps: number;
}

export interface OneRMResult {
  formula: OneRMFormula;
  estimated1RM: number;
  label: string;
}

export interface OneRMBenchmark {
  exercise: string;
  labelCn: string;
  bodyweight: number;
  estimated1RM: number;
  ratio: number;
  classification: StrengthLevel;
  classificationCn: string;
}

export type StrengthLevel = 'novice' | 'intermediate' | 'advanced' | 'elite';

// ═══════════════════════════════════════════
// 五种1RM估算公式
// ═══════════════════════════════════════════

/**
 * Epley 公式 (1985)
 * 1RM = weight × (1 + reps/30)
 * 最常用，reps≤10时准确度较高
 */
function epley(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Brzycki 公式 (1993)
 * 1RM = weight × 36 / (37 - reps)
 * reps<10时精度最高
 */
function brzycki(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps >= 37) return weight * 36; // 边界保护
  return weight * (36 / (37 - reps));
}

/**
 * Lander 公式 (1985)
 * 1RM = 100 × weight / (101.3 - 2.67123 × reps)
 */
function lander(weight: number, reps: number): number {
  if (reps === 1) return weight;
  const denom = 101.3 - 2.67123 * reps;
  if (denom <= 0) return weight * 10;
  return (100 * weight) / denom;
}

/**
 * Lombardi 公式 (1989)
 * 1RM = weight × reps^0.1
 */
function lombardi(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * Math.pow(reps, 0.1);
}

/**
 * O'Conner 公式
 * 1RM = weight × (1 + reps/40)
 */
function oConner(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 40);
}

// 公式注册表
const FORMULAS: Record<OneRMFormula, { fn: (w: number, r: number) => number; label: string }> = {
  epley: { fn: epley, label: 'Epley (1985)' },
  brzycki: { fn: brzycki, label: 'Brzycki (1993)' },
  lander: { fn: lander, label: 'Lander (1985)' },
  lombardi: { fn: lombardi, label: 'Lombardi (1989)' },
  o_conner: { fn: oConner, label: "O'Conner" },
};

// ═══════════════════════════════════════════
// 核心函数
// ═══════════════════════════════════════════

/**
 * 估算1RM（使用指定公式或全部公式平均值）
 */
export function estimate1RM(input: OneRMInput, formula?: OneRMFormula): OneRMResult {
  if (input.reps <= 0 || input.weight <= 0) {
    return { formula: formula || 'epley', estimated1RM: 0, label: '无效输入' };
  }

  if (formula) {
    const f = FORMULAS[formula];
    return {
      formula,
      estimated1RM: Math.round(f.fn(input.weight, input.reps) * 10) / 10,
      label: f.label,
    };
  }

  // 默认使用 Epley（最通用）
  const f = FORMULAS.epley;
  return {
    formula: 'epley',
    estimated1RM: Math.round(f.fn(input.weight, input.reps) * 10) / 10,
    label: f.label,
  };
}

/**
 * 用所有公式估算1RM并取平均值（更稳健）
 */
export function estimate1RMAll(input: OneRMInput): { results: OneRMResult[]; average: number } {
  const results: OneRMResult[] = Object.entries(FORMULAS).map(([key, { fn, label }]) => ({
    formula: key as OneRMFormula,
    estimated1RM: Math.round(fn(input.weight, input.reps) * 10) / 10,
    label,
  }));

  const avg = results.reduce((sum, r) => sum + r.estimated1RM, 0) / results.length;

  return {
    results,
    average: Math.round(avg * 10) / 10,
  };
}

/**
 * 多RM转换：「如果我能做 weight×reps，那我做 targetReps 时能用多少重量」
 */
export function estimateMultipleRepMax(input: OneRMInput, targetReps: number): number {
  const oneRM = estimate1RM(input).estimated1RM;
  // 反向 Epley: weight = 1RM / (1 + reps/30)
  return Math.round((oneRM / (1 + targetReps / 30)) * 10) / 10;
}

/**
 * 根据目标次数推荐训练重量
 */
export function recommendLoad(oneRM: number, targetReps: number): number {
  return Math.round((oneRM / (1 + targetReps / 30)) * 10) / 10;
}

// ═══════════════════════════════════════════
// 力量分级（NSCA 标准）
// ═══════════════════════════════════════════

export interface StrengthStandard {
  exercise: string;
  labelCn: string;
  gender: 'male' | 'female';
  levels: Record<StrengthLevel, number>; // ratio (1RM/BW) 阈值
}

/**
 * 男性力量分级阈值（1RM/BW比率）
 * 来源：NSCA Essentials of Strength Training & Conditioning
 */
const MALE_STRENGTH_STANDARDS: Omit<StrengthStandard, 'gender'>[] = [
  {
    exercise: 'back_squat',
    labelCn: '杠铃深蹲',
    levels: { novice: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.25 },
  },
  {
    exercise: 'bench_press',
    labelCn: '杠铃卧推',
    levels: { novice: 0.50, intermediate: 0.90, advanced: 1.30, elite: 1.70 },
  },
  {
    exercise: 'deadlift',
    labelCn: '传统硬拉',
    levels: { novice: 1.00, intermediate: 1.50, advanced: 2.00, elite: 2.50 },
  },
  {
    exercise: 'power_clean',
    labelCn: '高翻',
    levels: { novice: 0.50, intermediate: 0.80, advanced: 1.10, elite: 1.40 },
  },
];

const FEMALE_STRENGTH_STANDARDS: Omit<StrengthStandard, 'gender'>[] = [
  {
    exercise: 'back_squat',
    labelCn: '杠铃深蹲',
    levels: { novice: 0.50, intermediate: 0.90, advanced: 1.30, elite: 1.70 },
  },
  {
    exercise: 'bench_press',
    labelCn: '杠铃卧推',
    levels: { novice: 0.30, intermediate: 0.55, advanced: 0.80, elite: 1.05 },
  },
  {
    exercise: 'deadlift',
    labelCn: '传统硬拉',
    levels: { novice: 0.70, intermediate: 1.10, advanced: 1.50, elite: 1.90 },
  },
  {
    exercise: 'power_clean',
    labelCn: '高翻',
    levels: { novice: 0.35, intermediate: 0.55, advanced: 0.75, elite: 0.95 },
  },
];

/**
 * 对指定动作进行力量分级
 */
export function classifyStrength(
  exercise: string,
  oneRM: number,
  bodyweight: number,
  gender: 'male' | 'female' = 'male'
): OneRMBenchmark {
  const ratio = oneRM / bodyweight;
  const standards = gender === 'female' ? FEMALE_STRENGTH_STANDARDS : MALE_STRENGTH_STANDARDS;
  const standard = standards.find(s => s.exercise === exercise);

  if (!standard) {
    return {
      exercise,
      labelCn: exercise,
      bodyweight,
      estimated1RM: oneRM,
      ratio: Math.round(ratio * 100) / 100,
      classification: 'intermediate',
      classificationCn: '中级',
    };
  }

  const { levels } = standard;
  let classification: StrengthLevel = 'novice';
  if (ratio >= levels.elite) classification = 'elite';
  else if (ratio >= levels.advanced) classification = 'advanced';
  else if (ratio >= levels.intermediate) classification = 'intermediate';

  const labels: Record<StrengthLevel, string> = {
    novice: '新手',
    intermediate: '中级',
    advanced: '高级',
    elite: '精英',
  };

  return {
    exercise,
    labelCn: standard.labelCn,
    bodyweight,
    estimated1RM: oneRM,
    ratio: Math.round(ratio * 100) / 100,
    classification,
    classificationCn: labels[classification],
  };
}

/**
 * 获取指定动作和性别的分级阈值
 */
export function getStrengthStandards(exercise: string, gender: 'male' | 'female' = 'male') {
  const standards = gender === 'female' ? FEMALE_STRENGTH_STANDARDS : MALE_STRENGTH_STANDARDS;
  return standards.find(s => s.exercise === exercise) || null;
}

/**
 * 获取所有动作的力量标准
 */
export function getAllStrengthStandards(gender: 'male' | 'female' = 'male') {
  return (gender === 'female' ? FEMALE_STRENGTH_STANDARDS : MALE_STRENGTH_STANDARDS).map(s => ({
    ...s,
    gender,
  }));
}
