/**
 * 自动渐进负荷引擎 — Auto-Progressive Load Engine
 *
 * 基于训练历史的周期化自动渐进。完全确定性的规则引擎，不依赖AI。
 * 核心原理：渐进超负荷 + RPE熔断 + 周期性减载。
 */

import { getPhaseParams, getGoalParams } from '@/lib/periodization';
import type { SeasonPhase, TrainingGoal } from './types';

// ═══════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════

export interface ProgressionResult {
  newLoad: number;
  adjustment: string;
}

export interface AutoSetsRepsResult {
  sets: number;
  reps: number;
  rest: number; // 秒
  note: string;
}

export interface WeeklyBalanceResult {
  status: 'balanced' | 'warning';
  warnings: string[];
  suggestions: string[];
}

export type ProgressionCurve = 'base' | 'build' | 'maintain';

// ═══════════════════════════════════════════
// 渐进曲线定义
// ═══════════════════════════════════════════

interface CurveStep {
  week: number;
  factor: number; // multiplier on currentLoad
  label: string;
}

const CURVES: Record<ProgressionCurve, CurveStep[]> = {
  base: [
    { week: 1, factor: 1.00, label: '基准周' },
    { week: 2, factor: 1.025, label: '+2.5%渐进' },
    { week: 3, factor: 1.05, label: '+5%峰值' },
    { week: 4, factor: 0.70, label: '减载周(-30%)' },
  ],
  build: [
    { week: 1, factor: 1.00, label: '基准周' },
    { week: 2, factor: 1.03, label: '+3%渐进' },
    { week: 3, factor: 1.06, label: '+6%渐进' },
    { week: 4, factor: 1.08, label: '+8%峰值' },
    { week: 5, factor: 0.70, label: '减载周(-30%)' },
  ],
  maintain: [
    { week: 1, factor: 1.00, label: '基准周' },
    { week: 2, factor: 1.00, label: '维持' },
    { week: 3, factor: 1.00, label: '维持' },
    { week: 4, factor: 0.90, label: '轻减载(-10%)' },
  ],
};

// ═══════════════════════════════════════════
// 中文肌群名映射
// ═══════════════════════════════════════════

const MUSCLE_GROUP_NAMES: Record<string, string> = {
  quadriceps: '股四头肌',
  hamstrings: '腘绳肌',
  glutes: '臀肌',
  calves: '小腿',
  chest: '胸肌',
  back: '背部',
  shoulders: '肩部',
  biceps: '肱二头肌',
  triceps: '肱三头肌',
  core: '核心',
  hip_flexors: '髋屈肌',
  adductors: '内收肌',
};

function cnName(key: string): string {
  return MUSCLE_GROUP_NAMES[key] || key;
}

// ═══════════════════════════════════════════
// 1. getProgression — 周期化自动渐进
// ═══════════════════════════════════════════

/**
 * 根据渐进曲线、当前周数和基础负荷，计算本周目标负荷。
 *
 * RPE熔断机制：如果上周RPE ≥ 9.5，本周不增加负荷（维持上周水平），
 * 避免过度训练。
 *
 * @param curve 渐进曲线类型：base/build/maintain
 * @param week 当前训练周数（1-based）
 * @param currentLoad 当前/基准负荷（kg 或任意负荷单位）
 * @param lastRPE 上周平均RPE（0-10），用于熔断判断
 * @returns 新负荷和中文说明
 */
export function getProgression(
  curve: ProgressionCurve,
  week: number,
  currentLoad: number,
  lastRPE?: number | null
): ProgressionResult {
  const steps = CURVES[curve];
  const maxWeek = steps.length;

  // 循环周期：超过最大周数则取模（重复周期）
  const effectiveWeek = ((week - 1) % maxWeek) + 1;
  const step = steps.find(s => s.week === effectiveWeek) || steps[maxWeek - 1];

  // RPE熔断：上周RPE ≥ 9.5 → 不增
  if (lastRPE != null && lastRPE >= 9.5 && step.factor > 1.0) {
    return {
      newLoad: Math.round(currentLoad * 100) / 100,
      adjustment: `上周RPE ${lastRPE}（≥9.5），本周维持${currentLoad}不增，避免过度训练`,
    };
  }

  const newLoad = Math.round(currentLoad * step.factor * 100) / 100;

  // 减载周的RPE描述不同
  if (step.factor < 1.0) {
    const reduction = Math.round((1 - step.factor) * 100);
    return {
      newLoad,
      adjustment: `第${effectiveWeek}周${step.label}：${currentLoad} → ${newLoad}（-${reduction}%）`,
    };
  }

  if (step.factor === 1.0) {
    return {
      newLoad,
      adjustment: `第${effectiveWeek}周${step.label}：维持${newLoad}`,
    };
  }

  const increase = Math.round((step.factor - 1) * 100);
  return {
    newLoad,
    adjustment: `第${effectiveWeek}周${step.label}：${currentLoad} → ${newLoad}（+${increase}%）`,
  };
}

// ═══════════════════════════════════════════
// 2. getAutoSetsReps — 自动组数次数组间休息
// ═══════════════════════════════════════════

/**
 * 根据训练阶段、目标和当前周数，自动计算组数、次数和组间休息。
 *
 * 使用 periodization 模块的 getPhaseParams + getGoalParams 获取基准参数，
 * 再基于渐进曲线调整。
 *
 * @param phase 训练阶段（preseason/competition/recovery/offseason）
 * @param goal 训练目标（strength/power/speed/agility/mas_endurance/combat）
 * @param week 当前训练周数（1-based）
 * @param lastRPE 上周平均RPE（可选，用于熔断）
 * @returns 组数、次数、休息秒数和中文说明
 */
export function getAutoSetsReps(
  phase: string,
  goal: string,
  week: number,
  lastRPE?: number | null
): AutoSetsRepsResult {
  const phaseParams = getPhaseParams(phase as SeasonPhase);
  const goalParams = getGoalParams(goal as TrainingGoal);

  // 从阶段参数获取基础范围
  let sets = Math.round((phaseParams.setsRange[0] + phaseParams.setsRange[1]) / 2);
  let reps = Math.round((phaseParams.repsRange[0] + phaseParams.repsRange[1]) / 2);
  let rest = phaseParams.restBetweenSets[0];

  // 目标参数优先（如果存在）
  if (goalParams) {
    // 解析目标参数中的 setsReps，如 "3-5×1-5"
    const srMatch = goalParams.setsReps.match(/(\d+)-(\d+).(\d+)-(\d+)/);
    if (srMatch) {
      sets = Math.round((parseInt(srMatch[1]) + parseInt(srMatch[2])) / 2);
      reps = Math.round((parseInt(srMatch[3]) + parseInt(srMatch[4])) / 2);
    }
    // 解析休息时间，如 "3-5min"
    const restMatch = goalParams.rest.match(/(\d+)-(\d+)min/);
    if (restMatch) {
      rest = parseInt(restMatch[1]) * 60; // 转秒，取低值
    } else {
      const singleMatch = goalParams.rest.match(/(\d+)/);
      if (singleMatch) {
        rest = parseInt(singleMatch[1]);
      }
    }
  }

  // 渐进调整：根据周数微调组数
  const curveType: ProgressionCurve =
    phase === 'offseason' ? 'build' :
    phase === 'competition' ? 'maintain' : 'base';

  const steps = CURVES[curveType];
  const maxWeek = steps.length;
  const effectiveWeek = ((week - 1) % maxWeek) + 1;
  const step = steps.find(s => s.week === effectiveWeek) || steps[maxWeek - 1];

  // 渐进周微增组数，减载周微减
  let adjustedSets = sets;
  if (step.factor > 1.05) {
    adjustedSets = Math.min(sets + 1, phaseParams.setsRange[1]);
  } else if (step.factor < 1.0) {
    adjustedSets = Math.max(sets - 1, phaseParams.setsRange[0]);
  }

  // RPE熔断
  if (lastRPE != null && lastRPE >= 9.5) {
    adjustedSets = Math.max(sets - 1, phaseParams.setsRange[0]);
  }

  // 构建中文说明
  const goalLabel = goalParams?.labelCn || goal;
  const phaseLabel = phaseParams.labelCn;
  const rpeNote = lastRPE != null && lastRPE >= 9.5
    ? ` | RPE熔断：上周RPE ${lastRPE}，减1组`
    : '';

  const note =
    `${phaseLabel} · ${goalLabel} | ` +
    `基准 ${phaseParams.setsRange[0]}-${phaseParams.setsRange[1]}组 × ${phaseParams.repsRange[0]}-${phaseParams.repsRange[1]}次 ` +
    `| 第${effectiveWeek}周调整至 ${adjustedSets}组 × ${reps}次 ` +
    `| 组间休息 ${rest}s` +
    rpeNote;

  return {
    sets: adjustedSets,
    reps,
    rest,
    note,
  };
}

// ═══════════════════════════════════════════
// 3. getWeeklyBalance — 肌群负荷平衡检查
// ═══════════════════════════════════════════

/**
 * 检查各肌群的训练负荷是否均衡。
 *
 * - 某肌群负荷 > 平均值的150% → 警告（过度集中，有损伤风险）
 * - 某肌群负荷 < 平均值的50% → 建议增加训练
 *
 * @param muscleGroupLoads 各肌群的周训练组数/负荷量，如 { quadriceps: 12, hamstrings: 5, ... }
 * @returns 平衡状态、警告列表和建议列表（均为中文）
 */
export function getWeeklyBalance(
  muscleGroupLoads: Record<string, number>
): WeeklyBalanceResult {
  const entries = Object.entries(muscleGroupLoads);
  if (entries.length === 0) {
    return { status: 'balanced', warnings: [], suggestions: [] };
  }

  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const avg = total / entries.length;

  const warnings: string[] = [];
  const suggestions: string[] = [];

  for (const [group, load] of entries) {
    const name = cnName(group);
    const ratio = load / avg;

    if (ratio > 1.5) {
      warnings.push(
        `${name}负荷过高（${load}组，${Math.round(ratio * 100)}% 平均值），` +
        `增加对侧肌群训练以避免失衡和损伤`
      );
    }

    if (ratio < 0.5) {
      suggestions.push(
        `${name}负荷不足（${load}组，仅${Math.round(ratio * 100)}% 平均值），` +
        `建议增加至少 ${Math.round(avg * 0.5 - load)} 组`
      );
    }
  }

  // 额外检查：腘绳肌 vs 股四头肌比例（前交叉韧带损伤风险）
  const quads = muscleGroupLoads.quadriceps || 0;
  const hams = muscleGroupLoads.hamstrings || 0;
  if (quads > 0 && hams > 0) {
    const hqRatio = hams / quads;
    if (hqRatio < 0.6) {
      warnings.push(
        `腘绳肌/股四头肌比例过低（${(hqRatio * 100).toFixed(0)}%），` +
        `ACL损伤风险↑。建议腘绳肌至少达到股四头肌的60%（即≥${Math.round(quads * 0.6)}组）`
      );
    }
  }

  // 额外检查：推/拉比例
  const pushGroups = ['chest', 'shoulders', 'triceps'];
  const pullGroups = ['back', 'biceps', 'hamstrings'];
  const pushLoad = pushGroups.reduce((s, g) => s + (muscleGroupLoads[g] || 0), 0);
  const pullLoad = pullGroups.reduce((s, g) => s + (muscleGroupLoads[g] || 0), 0);
  if (pushLoad > 0 && pullLoad > 0) {
    const ratio = pullLoad / pushLoad;
    if (ratio < 0.8) {
      suggestions.push(
        `推/拉比例失衡（${(ratio * 100).toFixed(0)}%），` +
        `建议增加背部/拉类训练至推类训练的≥80%`
      );
    }
  }

  return {
    status: warnings.length > 0 ? 'warning' : 'balanced',
    warnings,
    suggestions,
  };
}
