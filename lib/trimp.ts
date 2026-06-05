/**
 * 训练冲量 (TRIMP) 计算器
 *
 * 基于心率的训练负荷量化方法，支持 Banister / Edwards / Lucia 三种模型。
 * 参考文献：Banister 1991, Edwards 1993, Lucia 2003
 */

// ═══════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════

export interface HeartRateZone {
  zone: 1 | 2 | 3 | 4 | 5;
  minPercent: number;
  maxPercent: number;
  labelCn: string;
  durationMinutes: number;
  averageHR: number;
}

export interface HeartRateProfile {
  restingHR: number;
  maxHR: number;
  age: number;
  athlete?: string;
}

export interface TRIMPResult {
  banisterTRIMP: number;
  edwardsTRIMP: number;
  luciaTRIMP: number;
  zones: HeartRateZone[];
  totalDuration: number;
  averageHR: number;
  trimpRate: number; // TRIMP/min
  intensityClassification: 'recovery' | 'low' | 'moderate' | 'high' | 'very_high';
  classificationCn: string;
}

export interface WeeklyTRIMP {
  weekStart: string;
  dailyTRIMP: number[];
  totalTRIMP: number;
  averageTRIMP: number;
  monotony: number; // 训练单调性 = mean/SD
  strain: number;   // 训练压力 = total × monotony
}

// ═══════════════════════════════════════════
// 心率区间定义
// ═══════════════════════════════════════════

export const HR_ZONE_DEFINITIONS: Omit<HeartRateZone, 'durationMinutes' | 'averageHR'>[] = [
  { zone: 1, minPercent: 50, maxPercent: 60, labelCn: '恢复区 (Zone 1)' },
  { zone: 2, minPercent: 60, maxPercent: 70, labelCn: '有氧基础 (Zone 2)' },
  { zone: 3, minPercent: 70, maxPercent: 80, labelCn: '有氧效率 (Zone 3)' },
  { zone: 4, minPercent: 80, maxPercent: 90, labelCn: '无氧阈 (Zone 4)' },
  { zone: 5, minPercent: 90, maxPercent: 100, labelCn: '最大冲刺 (Zone 5)' },
];

// Banister 男性加权因子
const BANISTER_MALE_WEIGHTS: Record<number, number> = { 1: 1.0, 2: 1.23, 3: 1.67, 4: 2.33, 5: 3.33 };

// Banister 女性加权因子
const BANISTER_FEMALE_WEIGHTS: Record<number, number> = { 1: 1.0, 2: 1.18, 3: 1.54, 4: 2.10, 5: 2.86 };

// Lucia 三区模型权重（用于 calcLuciaTRIMP 内联逻辑）
// VT1: HR zones 1-2, VT2: HR zones 3-4, >VT2: HR zone 5

// ═══════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════

/**
 * 根据心率和档案确定所在区间
 */
export function getHeartRateZone(bpm: number, profile: HeartRateProfile): 1 | 2 | 3 | 4 | 5 {
  const percent = ((bpm - profile.restingHR) / (profile.maxHR - profile.restingHR)) * 100;
  if (percent <= 60) return 1;
  if (percent <= 70) return 2;
  if (percent <= 80) return 3;
  if (percent <= 90) return 4;
  return 5;
}

/**
 * 估算最大心率（多种公式）
 */
export function estimateMaxHR(age: number, formula: 'fox' | 'tanaka' | 'gellish' | 'gulati' = 'tanaka'): number {
  switch (formula) {
    case 'fox': return 220 - age; // Fox (最通用但偏差大)
    case 'tanaka': return Math.round(208 - 0.7 * age); // Tanaka (更准确)
    case 'gellish': return Math.round(207 - 0.7 * age); // Gellish
    case 'gulati': return Math.round(206 - 0.88 * age); // Gulati (女性)
  }
}

// ═══════════════════════════════════════════
// TRIMP 计算
// ═══════════════════════════════════════════

/**
 * 计算 Banister TRIMP
 * TRIMP = Σ(duration × HR_reserve_ratio × weighting_factor × 0.64 × e^(1.92 × HR_reserve_ratio))
 */
function calcBanisterTRIMP(zones: HeartRateZone[], gender: 'male' | 'female' = 'male'): number {
  const weights = gender === 'female' ? BANISTER_FEMALE_WEIGHTS : BANISTER_MALE_WEIGHTS;
  let total = 0;

  for (const zone of zones) {
    const hrRatio = (zone.maxPercent + zone.minPercent) / 200; // 区间中点的HR reserve ratio
    const factor = weights[zone.zone] || 1;
    // Banister 原始公式
    total += zone.durationMinutes * hrRatio * 0.64 * Math.exp(1.92 * hrRatio) * factor;
  }

  return Math.round(total * 10) / 10;
}

/**
 * 计算 Edwards TRIMP
 * TRIMP = Σ(duration × zone_number)
 */
function calcEdwardsTRIMP(zones: HeartRateZone[]): number {
  return zones.reduce((sum, z) => sum + z.durationMinutes * z.zone, 0);
}

/**
 * 计算 Lucia TRIMP
 * 使用三区模型（基于通气阈而非固定百分比）
 * Zone 1: <VT1 → HR zones 1-2 → weight 1
 * Zone 2: VT1-VT2 → HR zones 3-4 → weight 2
 * Zone 3: >VT2 → HR zone 5 → weight 3
 */
function calcLuciaTRIMP(zones: HeartRateZone[]): number {
  let total = 0;
  for (const zone of zones) {
    let weight: number;
    if (zone.zone <= 2) weight = 1;
    else if (zone.zone <= 4) weight = 2;
    else weight = 3;
    total += zone.durationMinutes * weight;
  }
  return total;
}

/**
 * 主计算函数：给定心率区间分布，计算所有 TRIMP 变体
 */
export function calcTRIMP(
  zones: HeartRateZone[],
  _profile: HeartRateProfile,
  gender: 'male' | 'female' = 'male'
): TRIMPResult {
  const banisterTRIMP = calcBanisterTRIMP(zones, gender);
  const edwardsTRIMP = calcEdwardsTRIMP(zones);
  const luciaTRIMP = calcLuciaTRIMP(zones);
  const totalDuration = zones.reduce((sum, z) => sum + z.durationMinutes, 0);
  const averageHR = zones.reduce((sum, z) => sum + z.averageHR * z.durationMinutes, 0) / Math.max(1, totalDuration);

  const trimpRate = totalDuration > 0 ? banisterTRIMP / totalDuration : 0;

  // 强度分类
  let intensityClassification: TRIMPResult['intensityClassification'] = 'low';
  let classificationCn = '低强度';

  if (trimpRate > 8) {
    intensityClassification = 'very_high';
    classificationCn = '极高强度';
  } else if (trimpRate > 6) {
    intensityClassification = 'high';
    classificationCn = '高强度';
  } else if (trimpRate > 4) {
    intensityClassification = 'moderate';
    classificationCn = '中等强度';
  } else if (trimpRate > 2) {
    intensityClassification = 'low';
    classificationCn = '低强度';
  } else {
    intensityClassification = 'recovery';
    classificationCn = '恢复性';
  }

  return {
    banisterTRIMP,
    edwardsTRIMP,
    luciaTRIMP,
    zones,
    totalDuration,
    averageHR: Math.round(averageHR),
    trimpRate: Math.round(trimpRate * 10) / 10,
    intensityClassification,
    classificationCn,
  };
}

/**
 * 根据平均心率、时长和感知强度粗略估算区间分布
 */
export function estimateZonesFromSession(
  profile: HeartRateProfile,
  avgHR: number,
  durationMinutes: number,
  perceivedIntensity: 1 | 2 | 3 | 4 | 5
): HeartRateZone[] {
  const zone = getHeartRateZone(avgHR, profile);

  // 根据感知强度在目标区间附近扩散
  const spread = perceivedIntensity <= 2 ? 0.5 : perceivedIntensity >= 4 ? 2 : 1;

  const zones: HeartRateZone[] = [];
  const defs = HR_ZONE_DEFINITIONS;

  for (const def of defs) {
    const distance = Math.abs(def.zone - zone);
    let duration = 0;

    if (distance === 0) duration = durationMinutes * 0.5;
    else if (distance <= spread) duration = durationMinutes * (0.5 / Math.max(1, spread));

    if (duration > 0) {
      zones.push({
        ...def,
        durationMinutes: Math.round(duration),
        averageHR: Math.round(profile.restingHR + (profile.maxHR - profile.restingHR) * (def.minPercent + def.maxPercent) / 200),
      });
    }
  }

  // 确保总时长等于输入
  const totalAllocated = zones.reduce((sum, z) => sum + z.durationMinutes, 0);
  if (totalAllocated > 0 && zones.length > 0) {
    const ratio = durationMinutes / totalAllocated;
    zones.forEach(z => { z.durationMinutes = Math.round(z.durationMinutes * ratio); });
  }

  return zones;
}

// ═══════════════════════════════════════════
// 累积负荷计算
// ═══════════════════════════════════════════

/**
 * 计算7天/14天/28天累积 TRIMP
 */
export function calcTRIMPCumulative(dailyTRIMPs: number[]): {
  acute7d: number;
  chronic14d: number;
  chronic28d: number;
  acwr7v28: number;
} {
  const last7 = dailyTRIMPs.slice(-7);
  const last14 = dailyTRIMPs.slice(-14);
  const last28 = dailyTRIMPs.slice(-28);

  const acute7d = last7.reduce((a, b) => a + b, 0);
  const chronic14d = last14.length > 0 ? last14.reduce((a, b) => a + b, 0) / (last14.length / 7) : acute7d;
  const chronic28d = last28.length > 0 ? last28.reduce((a, b) => a + b, 0) / (last28.length / 7) : acute7d;

  const acwr7v28 = chronic28d > 0 ? acute7d / chronic28d : 1;

  return {
    acute7d,
    chronic14d: Math.round(chronic14d),
    chronic28d: Math.round(chronic28d),
    acwr7v28: Math.round(acwr7v28 * 100) / 100,
  };
}

/**
 * 计算周负荷指标
 */
export function calcWeeklyMetrics(weeklyTRIMPs: number[]): WeeklyTRIMP {
  const total = weeklyTRIMPs.reduce((a, b) => a + b, 0);
  const avg = weeklyTRIMPs.length > 0 ? total / weeklyTRIMPs.length : 0;
  const variance = weeklyTRIMPs.length > 1
    ? weeklyTRIMPs.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / (weeklyTRIMPs.length - 1)
    : 0;
  const sd = Math.sqrt(variance);
  const monotony = sd > 0 ? avg / sd : 0;
  const strain = total * monotony;

  return {
    weekStart: new Date().toISOString().slice(0, 10),
    dailyTRIMP: weeklyTRIMPs,
    totalTRIMP: Math.round(total),
    averageTRIMP: Math.round(avg),
    monotony: Math.round(monotony * 100) / 100,
    strain: Math.round(strain),
  };
}
