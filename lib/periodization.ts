/**
 * 周期化计算器 — NSCA-CSCS 第4版
 *
 * 提供线性/波动(DUP)/板块三种周期化模型的结构化数据，
 * 支持中周期生成和阶段参数查询。
 */

import type { SeasonPhase, TrainingGoal } from './types';

// ═══════════════════════════════════════════
// 周期化阶段参数
// ═══════════════════════════════════════════

export interface PeriodizationPhaseParams {
  phase: SeasonPhase;
  label: string;
  labelCn: string;
  weeks: number;
  intensityPercent: [number, number]; // %1RM 范围
  repsRange: [number, number];
  setsRange: [number, number];
  restBetweenSets: [number, number]; // 秒
  variationStrategy: string;
  weeklyFrequency: number;
  volumeTrend: 'increasing' | 'maintaining' | 'tapering';
}

export interface PeriodizationModel {
  id: 'linear' | 'dup' | 'block';
  name: string;
  nameCn: string;
  description: string;
  descriptionCn: string;
  appliesTo: SeasonPhase[];
  phases: PeriodizationPhaseParams[];
}

export interface MesocycleWeek {
  week: number;
  phase: SeasonPhase;
  goal: TrainingGoal;
  intensity: [number, number];
  reps: [number, number];
  sets: [number, number];
  rest: number; // 秒
  notes: string;
}

export interface MesocyclePlan {
  model: PeriodizationModel;
  startPhase: SeasonPhase;
  totalWeeks: number;
  weeks: MesocycleWeek[];
}

// ═══════════════════════════════════════════
// 阶段参数表
// ═══════════════════════════════════════════

const PHASE_PARAMS: Record<SeasonPhase, PeriodizationPhaseParams> = {
  preseason: {
    phase: 'preseason',
    label: 'Preseason',
    labelCn: '季前准备期',
    weeks: 4,
    intensityPercent: [65, 75],
    repsRange: [8, 12],
    setsRange: [3, 4],
    restBetweenSets: [90, 120],
    variationStrategy: '优先变式动作，打磨技术，纠正体态',
    weeklyFrequency: 3,
    volumeTrend: 'increasing',
  },
  competition: {
    phase: 'competition',
    label: 'Competition',
    labelCn: '赛季比赛期',
    weeks: 0, // 持续整个赛季
    intensityPercent: [75, 85],
    repsRange: [5, 8],
    setsRange: [3, 4],
    restBetweenSets: [120, 180],
    variationStrategy: '标准主项，维持力量，不追求极限',
    weeklyFrequency: 2,
    volumeTrend: 'maintaining',
  },
  recovery: {
    phase: 'recovery',
    label: 'Recovery',
    labelCn: '赛后恢复期',
    weeks: 2,
    intensityPercent: [50, 65],
    repsRange: [10, 15],
    setsRange: [2, 3],
    restBetweenSets: [60, 90],
    variationStrategy: '回归变式，低强度恢复，关节保护',
    weeklyFrequency: 2,
    volumeTrend: 'tapering',
  },
  offseason: {
    phase: 'offseason',
    label: 'Offseason',
    labelCn: '休赛储备期',
    weeks: 12,
    intensityPercent: [80, 95],
    repsRange: [3, 6],
    setsRange: [4, 5],
    restBetweenSets: [180, 240],
    variationStrategy: '极限负重主项，全力爆发，可冲PR',
    weeklyFrequency: 4,
    volumeTrend: 'increasing',
  },
};

// ═══════════════════════════════════════════
// 三种周期化模型
// ═══════════════════════════════════════════

export const PERIODIZATION_MODELS: PeriodizationModel[] = [
  {
    id: 'linear',
    name: 'Linear Periodization',
    nameCn: '线性周期',
    description:
      '强度逐步增加、训练量逐步减少。休赛期→季前→赛季渐进过渡，适合多数球员。',
    descriptionCn:
      '强度逐步增加、训练量逐步减少。休赛期→季前→赛季渐进过渡，适合多数球员。',
    appliesTo: ['offseason', 'preseason', 'competition', 'recovery'],
    phases: [
      {
        ...PHASE_PARAMS.offseason,
        weeks: 12,
        intensityPercent: [50, 95],
        repsRange: [3, 15],
        setsRange: [2, 5],
        restBetweenSets: [60, 240],
      },
      PHASE_PARAMS.preseason,
      PHASE_PARAMS.competition,
      PHASE_PARAMS.recovery,
    ],
  },
  {
    id: 'dup',
    name: 'Daily Undulating Periodization (DUP)',
    nameCn: '波动周期(DUP)',
    description:
      '每日波动：肌肥大日/力量日/爆发日轮换。赛季中维持多质量，适合职业级。',
    descriptionCn:
      '每日波动：肌肥大日/力量日/爆发日轮换。赛季中维持多质量，适合职业级。',
    appliesTo: ['competition', 'preseason'],
    phases: [
      PHASE_PARAMS.competition,
    ],
  },
  {
    id: 'block',
    name: 'Block Periodization',
    nameCn: '板块周期',
    description:
      '2-4周集中负荷→减载。单一能力突破，适合职业级专项训练。',
    descriptionCn:
      '2-4周集中负荷→减载。单一能力突破，适合职业级专项训练。',
    appliesTo: ['preseason', 'offseason'],
    phases: [
      PHASE_PARAMS.preseason,
    ],
  },
];

// ═══════════════════════════════════════════
// 休赛期4阶段模板
// ═══════════════════════════════════════════

export const OFFSEASON_STAGES = [
  {
    stage: 1,
    weeks: 'W1-2',
    name: 'GPP / 肌耐力',
    intensity: [50, 67] as [number, number],
    reps: [12, 15] as [number, number],
    sets: [2, 3] as [number, number],
    rest: 60,
    description: '全身适应，建立基础肌耐力',
  },
  {
    stage: 2,
    weeks: 'W3-6',
    name: '基础力量',
    intensity: [67, 80] as [number, number],
    reps: [6, 10] as [number, number],
    sets: [3, 4] as [number, number],
    rest: 120,
    description: '渐进增负荷，建立力量基础',
  },
  {
    stage: 3,
    weeks: 'W7-10',
    name: '最大力量 / 爆发力',
    intensity: [80, 95] as [number, number],
    reps: [2, 5] as [number, number],
    sets: [3, 5] as [number, number],
    rest: 240,
    description: '高强度低量，追求极限',
  },
  {
    stage: 4,
    weeks: 'W11-12',
    name: '转换期',
    intensity: [75, 85] as [number, number],
    reps: [3, 6] as [number, number],
    sets: [3, 4] as [number, number],
    rest: 180,
    description: '爆发速度优先，转换到季前状态',
  },
];

// ═══════════════════════════════════════════
// 训练目标→周期化参数速查
// ═══════════════════════════════════════════

export interface GoalPeriodizationParams {
  goal: TrainingGoal | string;
  labelCn: string;
  percent1RM: [number, number];
  setsReps: string;
  rest: string;
  tempo: string;
}

export const GOAL_PERIODIZATION: GoalPeriodizationParams[] = [
  {
    goal: 'strength',
    labelCn: '最大力量',
    percent1RM: [85, 100],
    setsReps: '3-5×1-5',
    rest: '3-5min',
    tempo: '1:0:1',
  },
  {
    goal: 'power',
    labelCn: '爆发力',
    percent1RM: [30, 60],
    setsReps: '3-5×1-5',
    rest: '3-5min',
    tempo: 'explosive',
  },
  {
    goal: 'speed',
    labelCn: '速度',
    percent1RM: [0, 10],
    setsReps: '3-4×3-6',
    rest: '3-5min',
    tempo: 'explosive',
  },
  {
    goal: 'agility',
    labelCn: '灵敏',
    percent1RM: [0, 10],
    setsReps: '3-5×3-8',
    rest: '1-2min',
    tempo: 'explosive',
  },
  {
    goal: 'mas_endurance',
    labelCn: '专项耐力',
    percent1RM: [0, 67],
    setsReps: '2-3×12-20',
    rest: '30-60s',
    tempo: '2:0:1',
  },
  {
    goal: 'combat',
    labelCn: '对抗力量',
    percent1RM: [67, 85],
    setsReps: '3-5×5-10',
    rest: '2-3min',
    tempo: '2:1:1',
  },
];

// ═══════════════════════════════════════════
// 核心函数
// ═══════════════════════════════════════════

/**
 * 获取指定阶段的周期化参数
 */
export function getPhaseParams(phase: SeasonPhase): PeriodizationPhaseParams {
  return PHASE_PARAMS[phase];
}

/**
 * 获取指定目标的周期化参数
 */
export function getGoalParams(goal: TrainingGoal | string): GoalPeriodizationParams | undefined {
  return GOAL_PERIODIZATION.find(g => g.goal === goal);
}

/**
 * 根据年龄应用安全限制
 */
export function applyAgeConstraints(
  params: PeriodizationPhaseParams,
  age: number | null
): PeriodizationPhaseParams {
  if (!age) return params;
  const p = { ...params };

  // <18岁：禁止>85%1RM
  if (age < 18) {
    p.intensityPercent = [
      Math.min(p.intensityPercent[0], 65),
      Math.min(p.intensityPercent[1], 85),
    ] as [number, number];
    p.variationStrategy += ' (U18: 禁>85%1RM，用变式替代主项)';
  }

  // ≥35岁：恢复优先
  if (age >= 35) {
    p.weeklyFrequency = Math.max(1, p.weeklyFrequency - 1);
    p.restBetweenSets = [
      p.restBetweenSets[0] + 30,
      p.restBetweenSets[1] + 30,
    ] as [number, number];
    p.variationStrategy += ' (≥35岁: 恢复优先，关节保护)';
  }

  return p;
}

/**
 * 生成中周期计划
 * @param startPhase 起始阶段
 * @param totalWeeks 总周数
 * @param modelType 周期化模型
 * @param age 运动员年龄（用于安全约束）
 */
export function generateMesocycle(
  startPhase: SeasonPhase,
  totalWeeks: number = 12,
  modelType: 'linear' | 'dup' | 'block' = 'linear',
  age: number | null = null
): MesocyclePlan {
  const model = PERIODIZATION_MODELS.find(m => m.id === modelType)!;
  const phaseOrder: SeasonPhase[] = ['offseason', 'preseason', 'competition', 'recovery'];

  const startIdx = phaseOrder.indexOf(startPhase);
  const weeks: MesocycleWeek[] = [];

  let currentWeek = 1;
  let phaseIdx = startIdx;

  while (currentWeek <= totalWeeks) {
    const phase = phaseOrder[phaseIdx % phaseOrder.length];
    const params = applyAgeConstraints(getPhaseParams(phase), age);

    // 确定该阶段要覆盖的周数
    const phaseWeeks = phase === 'competition'
      ? Math.max(2, totalWeeks - currentWeek + 1)
      : Math.min(params.weeks || 4, totalWeeks - currentWeek + 1);

    for (let w = 0; w < phaseWeeks; w++) {
      const progressRatio = params.weeks > 1 ? w / (params.weeks - 1) : 0;
      const intensityStart = params.intensityPercent[0];
      const intensityEnd = params.intensityPercent[1];

      // 线性周期：强度渐增
      const midIntensity = intensityStart + (intensityEnd - intensityStart) * progressRatio;

      // 确定训练目标
      let goal: TrainingGoal;
      switch (phase) {
        case 'offseason': goal = 'strength'; break;
        case 'preseason': goal = 'power'; break;
        case 'competition': goal = w % 3 === 0 ? 'power' : w % 3 === 1 ? 'strength' : 'speed'; break;
        case 'recovery': goal = 'strength'; break;
      }

      weeks.push({
        week: currentWeek,
        phase,
        goal,
        intensity: [Math.round(midIntensity - 5), Math.round(midIntensity + 5)] as [number, number],
        reps: params.repsRange,
        sets: params.setsRange,
        rest: params.restBetweenSets[0],
        notes: params.variationStrategy,
      });

      currentWeek++;
      if (currentWeek > totalWeeks) break;
    }

    phaseIdx++;
    // 防止无限循环
    if (phaseIdx >= startIdx + 4) break;
  }

  return {
    model,
    startPhase,
    totalWeeks,
    weeks: weeks.slice(0, totalWeeks),
  };
}

/**
 * 获取休赛期4阶段模板
 */
export function getOffseasonTemplate() {
  return OFFSEASON_STAGES;
}

/**
 * 提供速度周期化建议
 */
export function getSpeedPeriodization(schedule: 'offseason' | 'preseason' | 'competition' | 'dense') {
  const templates: Record<string, { frequency: string; focus: string }> = {
    offseason: { frequency: '2-3次/周', focus: '加速技术+最大速度基础' },
    preseason: { frequency: '2次/周', focus: '全部四维度+RSA引入' },
    competition: { frequency: '1-2次/周', focus: 'RSA通过比赛维持' },
    dense: { frequency: '比赛即训练', focus: '最小有效剂量维持' },
  };
  return templates[schedule] || templates.competition;
}

/**
 * 提供增强式训练进阶建议
 */
export function getPlyometricLevel(
  squat1RMToBodyweight: number,
  age: number
): { level: 1 | 2 | 3 | 4; contacts: [number, number]; description: string } {
  if (age < 16) return { level: 1, contacts: [60, 80], description: 'L1入门：跳箱(低箱)、踝跳、跳绳' };
  if (age < 18) return { level: Math.min(2, squat1RMToBodyweight >= 1.5 ? 2 : 1) as 1 | 2, contacts: [80, 100], description: 'U18禁L3以上' };

  if (squat1RMToBodyweight >= 2.0) return { level: 3, contacts: [80, 120], description: 'L3高级：深度跳(30-60cm)、跨栏跳、单腿跳' };
  if (squat1RMToBodyweight >= 1.5) return { level: 2, contacts: [80, 100], description: 'L2中级：连续跳箱、立定跳远、药球抛掷' };
  return { level: 1, contacts: [60, 80], description: 'L1入门：跳箱(低箱)、踝跳、跳绳' };
}
