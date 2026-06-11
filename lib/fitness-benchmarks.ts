/**
 * 体能测试基准库
 *
 * 12+项标准化体能测试的分级阈值、测试规程和位置专项数据。
 *
 * 硬编码阈值来源（循证标定）：
 *   - NSCA CSCS 4th ed. Chapters 12-15: 体能测试规范与分级标准
 *   - Soccer Anatomy (Kirkendall 2011): 足球专项体能基准
 *   - 中国足协体能测试标准 (CFA 2020): 中国职业足球体能门槛
 *   - Hoffman (2006) Norms for Fitness, Performance, and Health
 *   - Reilly et al. (2000) JSS: anthropometric & physiological profiles of elite soccer players
 *
 * KB覆盖机制：调用 setKBThresholds() 可通过知识库数据覆盖默认阈值。
 * 此机制确保当KB发现更新的循证数据时，平台自动采用新值。
 */

/** KB-derived threshold overrides — set via load-guidelines API or manual call */
let _kbThresholds: Record<string, Partial<TestThresholds>> | null = null;
let _kbPositionModifiers: Record<string, Partial<Record<string, TestThresholds>>> | null = null;

export function setKBThresholds(thresholds: Record<string, Partial<TestThresholds>>): void {
  _kbThresholds = thresholds;
}
export function setKBPositionModifiers(modifiers: Record<string, Partial<Record<string, TestThresholds>>>): void {
  _kbPositionModifiers = modifiers;
}
export function getKBThresholds() { return _kbThresholds; }
export function getKBPositionModifiers() { return _kbPositionModifiers; }

import type { Position } from './types';

// ═══════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════

export interface TestThresholds {
  elite: number;
  good: number;
  average: number;
  needsImprovement: number;
}

export interface TestBenchmark {
  id: string;
  testName: string;
  testNameCn: string;
  description: string;
  unit: string;
  protocol: string;
  thresholds: TestThresholds;
  higherIsBetter: boolean;
  positionSpecific?: Partial<Record<Position, TestThresholds>>;
  ageGroupModifiers?: {
    u16: number; // multiplier
    u18: number;
    o35: number;
  };
  testFrequency: string;
  testFrequencyCn: string;
}

export interface TestBattery {
  id: string;
  name: string;
  nameCn: string;
  tests: string[];
  durationMinutes: number;
  requiredEquipment: string[];
  description: string;
}

export interface TestResult {
  id: string;
  testId: string;
  testNameCn: string;
  date: string;
  value: number;
  unit: string;
  classification: 'elite' | 'good' | 'average' | 'needs_improvement';
  classificationCn: string;
  athleteId: string;
  position?: Position;
  notes?: string;
}

export interface TestTrend {
  testId: string;
  testNameCn: string;
  dataPoints: Array<{ date: string; value: number }>;
  trend: 'improving' | 'declining' | 'stable';
  trendCn: string;
  percentChange: number;
  latestClassification: string;
}

// ═══════════════════════════════════════════
// 12项核心体能测试
// ═══════════════════════════════════════════

export const FITNESS_TESTS: TestBenchmark[] = [
  // --- 有氧/耐力 ---
  {
    id: 'yo_yo_ir1',
    testName: 'Yo-Yo Intermittent Recovery Level 1',
    testNameCn: 'Yo-Yo IR1 间歇恢复测试',
    description: '20m折返跑，间歇5s，速度逐级增加。评估足球专项间歇耐力。',
    unit: 'm',
    protocol: '标准Yo-Yo IR1音频。从8.0km/h开始，每级速度递增。两次未达到线=测试结束。',
    thresholds: { elite: 2000, good: 1600, average: 1200, needsImprovement: 800 },
    higherIsBetter: true,
    positionSpecific: {
      midfielder: { elite: 2200, good: 1800, average: 1400, needsImprovement: 1000 },
      wingback: { elite: 2100, good: 1700, average: 1300, needsImprovement: 900 },
      forward: { elite: 1900, good: 1550, average: 1150, needsImprovement: 800 },
      defender: { elite: 1850, good: 1500, average: 1100, needsImprovement: 750 },
      goalkeeper: { elite: 1400, good: 1100, average: 800, needsImprovement: 500 },
    },
    testFrequency: '每6-8周',
    testFrequencyCn: '季前+季中2次',
  },
  {
    id: '30_15_ift',
    testName: '30-15 Intermittent Fitness Test',
    testNameCn: '30-15 IFT 间歇体能测试',
    description: '30s跑+15s休息，速度逐级递增。更贴近足球比赛节奏。',
    unit: 'km/h',
    protocol: '标准30-15 IFT音频。30s跑动/15s被动休息，起始速度8km/h，每级+0.5km/h。',
    thresholds: { elite: 20, good: 18, average: 16, needsImprovement: 14 },
    higherIsBetter: true,
    positionSpecific: {
      midfielder: { elite: 21, good: 19, average: 17, needsImprovement: 15 },
      wingback: { elite: 20.5, good: 18.5, average: 16.5, needsImprovement: 14.5 },
      forward: { elite: 20, good: 18, average: 16, needsImprovement: 14 },
      defender: { elite: 19, good: 17, average: 15, needsImprovement: 13 },
      goalkeeper: { elite: 17, good: 15, average: 13, needsImprovement: 11 },
    },
    testFrequency: '每6-8周',
    testFrequencyCn: '季前+季中2次',
  },
  // --- 速度 ---
  {
    id: 'sprint_10m',
    testName: '10m Sprint',
    testNameCn: '10m 冲刺',
    description: '站立起跑10m计时。评估加速能力（前10m是关键加速段）。',
    unit: 's',
    protocol: '光电计时门。站立起跑，前脚距第一门1m。3次取最好。完全恢复(≥3min)间隔。',
    thresholds: { elite: 1.70, good: 1.80, average: 1.90, needsImprovement: 2.00 },
    higherIsBetter: false,
    positionSpecific: {
      forward: { elite: 1.65, good: 1.75, average: 1.85, needsImprovement: 1.95 },
      wingback: { elite: 1.67, good: 1.77, average: 1.87, needsImprovement: 1.97 },
      defender: { elite: 1.72, good: 1.82, average: 1.92, needsImprovement: 2.02 },
      midfielder: { elite: 1.70, good: 1.80, average: 1.90, needsImprovement: 2.00 },
      goalkeeper: { elite: 1.75, good: 1.85, average: 1.95, needsImprovement: 2.05 },
    },
    testFrequency: '每4-6周',
    testFrequencyCn: '每月或阶段转换时',
  },
  {
    id: 'sprint_30m',
    testName: '30m Sprint',
    testNameCn: '30m 冲刺',
    description: '站立起跑30m计时。评估最大速度能力（10-30m段）。',
    unit: 's',
    protocol: '光电计时门在10m和30m处。3次取最好。完全恢复(≥4min)间隔。',
    thresholds: { elite: 4.00, good: 4.15, average: 4.30, needsImprovement: 4.50 },
    higherIsBetter: false,
    positionSpecific: {
      forward: { elite: 3.85, good: 4.00, average: 4.15, needsImprovement: 4.35 },
      wingback: { elite: 3.90, good: 4.05, average: 4.20, needsImprovement: 4.40 },
      midfielder: { elite: 3.95, good: 4.10, average: 4.25, needsImprovement: 4.45 },
      defender: { elite: 4.00, good: 4.15, average: 4.30, needsImprovement: 4.50 },
      goalkeeper: { elite: 4.10, good: 4.25, average: 4.40, needsImprovement: 4.60 },
    },
    testFrequency: '每4-6周',
    testFrequencyCn: '每月或阶段转换时',
  },
  // --- 跳跃（神经肌肉）---
  {
    id: 'cmj',
    testName: 'Countermovement Jump (CMJ)',
    testNameCn: '反向跳 (CMJ)',
    description: '双手叉腰，快速下蹲后最大垂直起跳。评估下肢爆发力和神经肌肉疲劳。',
    unit: 'cm',
    protocol: '双手叉腰(隔离上肢摆臂影响)。自选下蹲深度(≥90°膝角)。3次取最好。测力台或跳跃垫。',
    thresholds: { elite: 45, good: 38, average: 32, needsImprovement: 26 },
    higherIsBetter: true,
    positionSpecific: {
      goalkeeper: { elite: 50, good: 42, average: 36, needsImprovement: 30 },
      forward: { elite: 47, good: 40, average: 34, needsImprovement: 28 },
      wingback: { elite: 46, good: 39, average: 33, needsImprovement: 27 },
      defender: { elite: 44, good: 37, average: 31, needsImprovement: 25 },
      midfielder: { elite: 43, good: 36, average: 30, needsImprovement: 24 },
    },
    testFrequency: '每周(神经肌肉疲劳监控)',
    testFrequencyCn: '赛季期每周1-2次',
  },
  {
    id: 'sj',
    testName: 'Squat Jump (SJ)',
    testNameCn: '静蹲跳 (SJ)',
    description: '从90°半蹲位静止3s后最大垂直起跳。评估纯向心收缩力。',
    unit: 'cm',
    protocol: '半蹲位(膝≈90°)静置3s后起跳。双手叉腰。3次取最好。测力台或跳跃垫。',
    thresholds: { elite: 42, good: 35, average: 29, needsImprovement: 23 },
    higherIsBetter: true,
    testFrequency: '每4周',
    testFrequencyCn: '每周期转换时',
  },
  // --- 力量 ---
  {
    id: 'squat_1rm',
    testName: 'Back Squat 1RM',
    testNameCn: '深蹲1RM（相对体重）',
    description: '杠铃后蹲1RM/体重。下肢基础力量的金标准。',
    unit: '×BW',
    protocol: '标准NSCA 1RM测试流程。充分热身+逐步加重。5次以内达到1RM。',
    thresholds: { elite: 2.0, good: 1.5, average: 1.0, needsImprovement: 0.5 },
    higherIsBetter: true,
    ageGroupModifiers: { u16: 0.7, u18: 0.85, o35: 0.9 },
    testFrequency: '每4-6周',
    testFrequencyCn: '每周期重测',
  },
  {
    id: 'nordic_curl',
    testName: 'Nordic Hamstring Curl',
    testNameCn: '北欧腘绳肌弯举',
    description: '跪姿缓慢前倾至力竭。评估腘绳肌离心力量——损伤预防核心指标。',
    unit: '次',
    protocol: '搭档固定脚踝。身体笔直缓慢前倾。能控制住的最远角度记为成功。次数=能完成的次数。',
    thresholds: { elite: 12, good: 8, average: 5, needsImprovement: 2 },
    higherIsBetter: true,
    positionSpecific: {
      wingback: { elite: 14, good: 10, average: 6, needsImprovement: 3 },
      forward: { elite: 13, good: 9, average: 5, needsImprovement: 2 },
      midfielder: { elite: 12, good: 8, average: 5, needsImprovement: 2 },
      defender: { elite: 11, good: 7, average: 4, needsImprovement: 2 },
      goalkeeper: { elite: 10, good: 6, average: 4, needsImprovement: 1 },
    },
    ageGroupModifiers: { u16: 0.6, u18: 0.8, o35: 0.85 },
    testFrequency: '每4周',
    testFrequencyCn: '每月(腘绳肌专项监控)',
  },
  // --- 灵敏 ---
  {
    id: 'pro_agility',
    testName: 'Pro Agility (5-10-5)',
    testNameCn: '专业灵敏测试 (5-10-5)',
    description: '中线出发→左5yd→右10yd→回中线。评估变向能力和侧向爆发力。',
    unit: 's',
    protocol: '三条线间距5yd。计时从中线出发开始，到返回中线结束。每侧2次取最好。',
    thresholds: { elite: 4.60, good: 4.80, average: 5.00, needsImprovement: 5.30 },
    higherIsBetter: false,
    positionSpecific: {
      goalkeeper: { elite: 4.50, good: 4.70, average: 4.90, needsImprovement: 5.20 },
      forward: { elite: 4.55, good: 4.75, average: 4.95, needsImprovement: 5.25 },
      wingback: { elite: 4.58, good: 4.78, average: 4.98, needsImprovement: 5.28 },
      midfielder: { elite: 4.62, good: 4.82, average: 5.02, needsImprovement: 5.32 },
      defender: { elite: 4.70, good: 4.90, average: 5.10, needsImprovement: 5.40 },
    },
    testFrequency: '每4周',
    testFrequencyCn: '每月',
  },
  // --- 平衡/本体感觉 ---
  {
    id: 'y_balance',
    testName: 'Y-Balance Test (Lower Quarter)',
    testNameCn: 'Y平衡测试 (下肢)',
    description: '单腿站立，另一腿向三个方向(前/后内/后外)最大伸展。评估动态平衡和损伤风险。',
    unit: '%腿长',
    protocol: '赤脚测试。三次练习+三次正式。取每方向最大。综合分=(前+后内+后外)/(3×腿长)×100。',
    thresholds: { elite: 95, good: 90, average: 85, needsImprovement: 80 },
    higherIsBetter: true,
    testFrequency: '每4周',
    testFrequencyCn: '每月(尤其康复期)',
  },
  // --- 反复冲刺 ---
  {
    id: 'rsa_6x40',
    testName: 'Repeated Sprint Ability (6×40m)',
    testNameCn: '反复冲刺能力 (6×40m)',
    description: '6次40m冲刺(20m折返)，间歇20s。衰减率=最慢/最快-1。评估RSA。',
    unit: '%衰减',
    protocol: '40m=20m+20m折返。间歇20s(被动)。光电计时。计算平均时间和衰减率。',
    thresholds: { elite: 3.0, good: 5.0, average: 7.0, needsImprovement: 10.0 },
    higherIsBetter: false,
    positionSpecific: {
      wingback: { elite: 2.5, good: 4.5, average: 6.5, needsImprovement: 9.0 },
      forward: { elite: 2.8, good: 4.8, average: 6.8, needsImprovement: 9.5 },
      midfielder: { elite: 3.0, good: 5.0, average: 7.0, needsImprovement: 10.0 },
      defender: { elite: 3.5, good: 5.5, average: 7.5, needsImprovement: 10.5 },
      goalkeeper: { elite: 4.0, good: 6.0, average: 8.0, needsImprovement: 11.0 },
    },
    testFrequency: '每6-8周',
    testFrequencyCn: '季前+季中',
  },
  // --- 上肢（GK重点）---
  {
    id: 'bench_press_1rm',
    testName: 'Bench Press 1RM',
    testNameCn: '卧推1RM（相对体重）',
    description: '杠铃卧推1RM/体重。评估上肢推力——GK和对抗位置重点。',
    unit: '×BW',
    protocol: '标准NSCA 1RM测试流程。充分热身+逐步加重。',
    thresholds: { elite: 1.3, good: 1.0, average: 0.8, needsImprovement: 0.5 },
    higherIsBetter: true,
    positionSpecific: {
      goalkeeper: { elite: 1.4, good: 1.1, average: 0.9, needsImprovement: 0.6 },
      defender: { elite: 1.3, good: 1.0, average: 0.8, needsImprovement: 0.5 },
      forward: { elite: 1.2, good: 0.95, average: 0.75, needsImprovement: 0.5 },
    },
    ageGroupModifiers: { u16: 0.5, u18: 0.7, o35: 0.9 },
    testFrequency: '每6周',
    testFrequencyCn: '每周期重测',
  },
];

// ═══════════════════════════════════════════
// 测试组合（Test Batteries）
// ═══════════════════════════════════════════

export const TEST_BATTERIES: TestBattery[] = [
  {
    id: 'preseason_screening',
    name: 'Pre-Season Screening',
    nameCn: '季前全面筛查',
    tests: ['yo_yo_ir1', 'sprint_10m', 'sprint_30m', 'cmj', 'squat_1rm', 'nordic_curl', 'y_balance', 'pro_agility'],
    durationMinutes: 90,
    requiredEquipment: ['光电计时门', '跳跃垫/测力台', '杠铃+片', 'Y平衡套件', 'Yo-Yo音频', '标志盘'],
    description: '季前准备期开始时的全面体能评估，确定每位球员的基线数据。',
  },
  {
    id: 'in_season_monitoring',
    name: 'In-Season Monitoring',
    nameCn: '赛季中监控',
    tests: ['cmj', 'nordic_curl', 'y_balance'],
    durationMinutes: 20,
    requiredEquipment: ['跳跃垫/测力台', '搭档固定', 'Y平衡套件'],
    description: '赛季期精简测试组合。CMJ监控神经肌肉疲劳，Nordic监控腘绳肌状态。',
  },
  {
    id: 'return_to_play',
    name: 'Return to Play',
    nameCn: '回归赛场测试',
    tests: ['cmj', 'y_balance', 'pro_agility', 'sprint_30m', 'nordic_curl'],
    durationMinutes: 40,
    requiredEquipment: ['跳跃垫/测力台', '光电计时门', 'Y平衡套件', '标志盘'],
    description: '伤病康复后回归赛场前的客观标准测试。要求所有指标>90%健侧。',
  },
  {
    id: 'cfa_standard',
    name: 'CFA Fitness Test',
    nameCn: '中国足协体能测试',
    tests: ['yo_yo_ir1', 'sprint_30m', 'sprint_10m'],
    durationMinutes: 30,
    requiredEquipment: ['光电计时门', 'Yo-Yo音频', '标志盘'],
    description: '中国足协标准体能测试组合（CSL/CL1/CL2通用）。',
  },
];

// ═══════════════════════════════════════════
// 核心函数
// ═══════════════════════════════════════════

/**
 * 获取指定测试的分级阈值
 */
export function getTestBenchmark(testId: string): TestBenchmark | undefined {
  return FITNESS_TESTS.find(t => t.id === testId);
}

/**
 * 对测试结果进行分级
 */
export function classifyTestResult(
  testId: string,
  value: number,
  position?: Position,
  age?: number
): { classification: TestResult['classification']; classificationCn: string } {
  const test = getTestBenchmark(testId);
  if (!test) return { classification: 'average', classificationCn: '中等' };

  // 获取适合的阈值（KB覆盖优先）
  let thresholds = test.thresholds;
  if (_kbThresholds?.[testId]) {
    thresholds = { ...thresholds, ..._kbThresholds[testId] };
  }
  if (position && test.positionSpecific?.[position]) {
    let posThresholds = test.positionSpecific[position]!;
    if (_kbPositionModifiers?.[testId]?.[position]) {
      posThresholds = { ...posThresholds, ..._kbPositionModifiers[testId]![position]! };
    }
    thresholds = posThresholds;
  }

  // 年龄修正
  let adjustedValue = value;
  if (age && test.ageGroupModifiers) {
    let modifier = 1;
    if (age < 16) modifier = test.ageGroupModifiers.u16;
    else if (age < 18) modifier = test.ageGroupModifiers.u18;
    else if (age >= 35) modifier = test.ageGroupModifiers.o35;

    if (test.higherIsBetter) adjustedValue = value / modifier;
    else adjustedValue = value * modifier;
  }

  const labels: Record<string, string> = {
    elite: '优秀',
    good: '良好',
    average: '中等',
    needsImprovement: '需提高',
  };

  if (test.higherIsBetter) {
    if (adjustedValue >= thresholds.elite) return { classification: 'elite', classificationCn: labels.elite };
    if (adjustedValue >= thresholds.good) return { classification: 'good', classificationCn: labels.good };
    if (adjustedValue >= thresholds.average) return { classification: 'average', classificationCn: labels.average };
    return { classification: 'needs_improvement', classificationCn: labels.needsImprovement };
  } else {
    if (adjustedValue <= thresholds.elite) return { classification: 'elite', classificationCn: labels.elite };
    if (adjustedValue <= thresholds.good) return { classification: 'good', classificationCn: labels.good };
    if (adjustedValue <= thresholds.average) return { classification: 'average', classificationCn: labels.average };
    return { classification: 'needs_improvement', classificationCn: labels.needsImprovement };
  }
}

/**
 * 获取推荐的测试组合
 */
export function getRecommendedTestBattery(
  phase: string,
  _position?: Position
): TestBattery {
  switch (phase) {
    case 'preseason':
    case 'offseason':
      return TEST_BATTERIES.find(b => b.id === 'preseason_screening')!;
    case 'competition':
      return TEST_BATTERIES.find(b => b.id === 'in_season_monitoring')!;
    case 'recovery':
      return TEST_BATTERIES.find(b => b.id === 'return_to_play')!;
    default:
      return TEST_BATTERIES[0];
  }
}

/**
 * 计算测试趋势
 */
export function calculateTestTrend(
  testId: string,
  results: Array<{ date: string; value: number }>,
  position?: Position
): TestTrend {
  const test = getTestBenchmark(testId);
  if (!test || results.length < 2) {
    return {
      testId,
      testNameCn: test?.testNameCn || testId,
      dataPoints: results,
      trend: 'stable',
      trendCn: '稳定',
      percentChange: 0,
      latestClassification: '中等',
    };
  }

  const sorted = [...results].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const percentChange = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;

  let trend: TestTrend['trend'] = 'stable';
  let trendCn = '稳定';
  const improvementThreshold = test.higherIsBetter ? 2 : -2;

  if (percentChange > Math.abs(improvementThreshold)) {
    trend = test.higherIsBetter ? 'improving' : 'declining';
    trendCn = test.higherIsBetter ? '上升 ↑' : '下降 ↓';
  } else if (percentChange < -Math.abs(improvementThreshold)) {
    trend = test.higherIsBetter ? 'declining' : 'improving';
    trendCn = test.higherIsBetter ? '下降 ↓' : '上升 ↑';
  }

  const latest = classifyTestResult(testId, last, position);
  return {
    testId,
    testNameCn: test.testNameCn,
    dataPoints: results,
    trend,
    trendCn,
    percentChange: Math.round(percentChange * 10) / 10,
    latestClassification: latest.classificationCn,
  };
}

/**
 * 生成体能测试数据表文本（供AI system prompt使用）
 */
export function buildFitnessBenchmarkTable(): string {
  const lines = ['### 体能测试基准（CSCS + Soccer）',
    '| 测试 | 优秀 | 良好 | 需提高 |',
    '|------|------|------|--------|'];

  const keyTests = ['yo_yo_ir1', '30_15_ift', 'sprint_10m', 'sprint_30m', 'squat_1rm', 'nordic_curl'];
  for (const id of keyTests) {
    const t = FITNESS_TESTS.find(x => x.id === id);
    if (t) {
      lines.push(`| ${t.testNameCn} | ${t.higherIsBetter ? '>' : '<'}${t.thresholds.elite}${t.unit} | ${t.thresholds.good}${t.unit} | ${t.thresholds.needsImprovement}${t.unit} |`);
    }
  }

  return lines.join('\n');
}

/**
 * 获取所有测试ID列表
 */
export function getAllTestIds(): string[] {
  return FITNESS_TESTS.map(t => t.id);
}

/**
 * 获取所有测试组合
 */
export function getAllTestBatteries(): TestBattery[] {
  return TEST_BATTERIES;
}
