/**
 * 位置代谢需求档案 — 基于 Di Salvo 2007, Bradley et al. 2009
 *
 * 提供5个足球位置的完整GPS跑动数据、能量系统占比、
 * 关键体能需求和建议训练方向。
 */

import type { Position, TrainingGoal } from './types';

// ═══════════════════════════════════════════
// 位置代谢档案
// ═══════════════════════════════════════════

export interface PositionMetabolicProfile {
  position: Position;
  labelCn: string;
  /** 总跑动距离 m/90min */
  totalDistance: number;
  /** 高速跑动 >19.8 km/h, m */
  highSpeedDistance: number;
  /** 冲刺跑动 >25.2 km/h, m */
  sprintDistance: number;
  /** 加速次数（>2 m/s²） */
  accelerations: number;
  /** 减速次数（<-2 m/s²） */
  decelerations: number;
  /** 最高速度 km/h */
  maxSpeed: number;
  /** 估计代谢功率 W/kg */
  metabolicPower: number;
  /** 主导能量系统 */
  primaryEnergySystem: 'ATP-PC' | 'glycolytic' | 'oxidative';
  /** 能量系统贡献占比 */
  energyContribution: {
    atpPc: number;
    glycolytic: number;
    oxidative: number;
  };
  /** 关键体能质量（优先级从高到低） */
  keyPhysicalQualities: TrainingGoal[];
  /** GPS 阈值设定 */
  gpsThresholds: {
    highSpeed: number;
    sprint: number;
  };
  /** 训练重点说明 */
  trainingFocus: string;
}

export const POSITION_PROFILES: Record<Position, PositionMetabolicProfile> = {
  goalkeeper: {
    position: 'goalkeeper',
    labelCn: '守门员',
    totalDistance: 4500,
    highSpeedDistance: 50,
    sprintDistance: 15,
    accelerations: 8,
    decelerations: 6,
    maxSpeed: 25,
    metabolicPower: 5.5,
    primaryEnergySystem: 'ATP-PC',
    energyContribution: { atpPc: 60, glycolytic: 25, oxidative: 15 },
    keyPhysicalQualities: ['power', 'agility', 'strength'],
    gpsThresholds: { highSpeed: 18, sprint: 23 },
    trainingFocus: '爆发性扑救+弹跳力+反应速度+核心抗旋转。短距离(<10m)爆发移动为主。',
  },
  defender: {
    position: 'defender',
    labelCn: '中后卫',
    totalDistance: 7080,
    highSpeedDistance: 612,
    sprintDistance: 215,
    accelerations: 45,
    decelerations: 52,
    maxSpeed: 31,
    metabolicPower: 9.5,
    primaryEnergySystem: 'oxidative',
    energyContribution: { atpPc: 20, glycolytic: 30, oxidative: 50 },
    keyPhysicalQualities: ['strength', 'power', 'speed'],
    gpsThresholds: { highSpeed: 19.8, sprint: 25.2 },
    trainingFocus: '对抗力量+头球弹跳+直线速度(回追)+有氧基础。低冲刺需求但关键时刻爆发。',
  },
  midfielder: {
    position: 'midfielder',
    labelCn: '中场中路',
    totalDistance: 7061,
    highSpeedDistance: 875,
    sprintDistance: 248,
    accelerations: 78,
    decelerations: 85,
    maxSpeed: 30,
    metabolicPower: 10.2,
    primaryEnergySystem: 'oxidative',
    energyContribution: { atpPc: 15, glycolytic: 25, oxidative: 60 },
    keyPhysicalQualities: ['mas_endurance', 'agility', 'power'],
    gpsThresholds: { highSpeed: 19.8, sprint: 25.2 },
    trainingFocus: '有氧能力(最高跑动量)+反复变向+加速减速耐受。中场是全队肺，决定比赛节奏。',
  },
  forward: {
    position: 'forward',
    labelCn: '前锋',
    totalDistance: 6960,
    highSpeedDistance: 1184,
    sprintDistance: 446,
    accelerations: 65,
    decelerations: 58,
    maxSpeed: 33,
    metabolicPower: 11.5,
    primaryEnergySystem: 'ATP-PC',
    energyContribution: { atpPc: 35, glycolytic: 40, oxidative: 25 },
    keyPhysicalQualities: ['speed', 'power', 'agility'],
    gpsThresholds: { highSpeed: 19.8, sprint: 25.2 },
    trainingFocus: '爆发力+最大速度+反复冲刺(RSA)+对抗。最高冲刺量和最高速度位置。',
  },
  wingback: {
    position: 'wingback',
    labelCn: '边后卫/翼卫',
    totalDistance: 7012,
    highSpeedDistance: 1054,
    sprintDistance: 402,
    accelerations: 72,
    decelerations: 78,
    maxSpeed: 32,
    metabolicPower: 11.0,
    primaryEnergySystem: 'glycolytic',
    energyContribution: { atpPc: 25, glycolytic: 35, oxidative: 40 },
    keyPhysicalQualities: ['speed', 'mas_endurance', 'power'],
    gpsThresholds: { highSpeed: 19.8, sprint: 25.2 },
    trainingFocus: '高速反复冲刺+上下往返耐力+传中爆发力。现代足球对体能要求最高的位置。',
  },
  center_forward: {
    position: 'center_forward' as Position, labelCn: '中锋',
    totalDistance: 6800, highSpeedDistance: 980, sprintDistance: 380,
    accelerations: 55, decelerations: 50, maxSpeed: 32, metabolicPower: 10.8,
    primaryEnergySystem: 'glycolytic' as const,
    energyContribution: { atpPc: 30, glycolytic: 40, oxidative: 30 },
    keyPhysicalQualities: ['power', 'strength', 'speed'],
    gpsThresholds: { highSpeed: 19.8, sprint: 25.2 },
    trainingFocus: '对抗力量+背身护球+头球弹跳+禁区终结爆发。',
  },
  winger: {
    position: 'winger' as Position, labelCn: '边锋',
    totalDistance: 7100, highSpeedDistance: 1250, sprintDistance: 480,
    accelerations: 78, decelerations: 82, maxSpeed: 34, metabolicPower: 11.8,
    primaryEnergySystem: 'glycolytic' as const,
    energyContribution: { atpPc: 28, glycolytic: 42, oxidative: 30 },
    keyPhysicalQualities: ['speed', 'power', 'mas_endurance'],
    gpsThresholds: { highSpeed: 19.8, sprint: 25.2 },
    trainingFocus: '边路反复冲刺+高速变向+内切射门爆发。最高冲刺频次和最高极速。',
  },
};

// ═══════════════════════════════════════════
// 位置对比与排名
// ═══════════════════════════════════════════

export interface PositionComparison {
  position: Position;
  labelCn: string;
  rank: number;
  value: number;
  metric: keyof PositionMetabolicProfile;
}

type NumericProfileKey = 'totalDistance' | 'highSpeedDistance' | 'sprintDistance' | 'accelerations' | 'decelerations' | 'maxSpeed' | 'metabolicPower';

/**
 * 按指定指标对所有位置排名
 */
export function rankPositions(metric: NumericProfileKey): PositionComparison[] {
  return Object.values(POSITION_PROFILES)
    .map(p => ({ position: p.position, labelCn: p.labelCn, rank: 0, value: p[metric] as number, metric }))
    .sort((a, b) => b.value - a.value)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

/**
 * 获取指定位置的代谢档案
 */
export function getPositionProfile(position: Position): PositionMetabolicProfile {
  return POSITION_PROFILES[position];
}

// ═══════════════════════════════════════════
// 补负荷计算（比赛分钟数不足时的额外跑量）
// ═══════════════════════════════════════════

export interface SupplementLoadResult {
  position: Position;
  matchMinutes: number;
  baseDistance: number;
  supplementDistance: number;
  supplementRatio: number;
  recommendation: string;
}

/**
 * 计算上场时间不足时的补负荷跑量
 * @param position 球员位置
 * @param matchMinutes 实际上场分钟数
 */
export function calcSupplementLoad(position: Position, matchMinutes: number): SupplementLoadResult {
  const profile = getPositionProfile(position);
  const baseDistance = profile.totalDistance;

  let supplementRatio: number;
  if (matchMinutes === 0) supplementRatio = 0.65;
  else if (matchMinutes <= 20) supplementRatio = 0.45;
  else if (matchMinutes < 45) supplementRatio = 0.25;
  else supplementRatio = 0;

  const supplementDistance = Math.round(baseDistance * supplementRatio);
  const recommendation = supplementRatio > 0
    ? `上场${matchMinutes}分钟，需补${supplementDistance}m跑量(${Math.round(supplementRatio * 100)}%基线)`
    : `上场≥45分钟，无需补负荷`;

  return {
    position,
    matchMinutes,
    baseDistance,
    supplementDistance,
    supplementRatio,
    recommendation,
  };
}

// ═══════════════════════════════════════════
// 位置体能需求速查文本（供AI prompt使用）
// ═══════════════════════════════════════════

export function buildPositionProfileText(position: Position): string {
  const p = getPositionProfile(position);
  return [
    `${p.labelCn}: 总距${p.totalDistance}m, 高速${p.highSpeedDistance}m, 冲刺${p.sprintDistance}m`,
    `加速${p.accelerations}次, 减速${p.decelerations}次, 最高速${p.maxSpeed}km/h`,
    `主导能量: ${p.primaryEnergySystem}, 占比 ATP-PC:${p.energyContribution.atpPc}% 糖酵解:${p.energyContribution.glycolytic}% 有氧:${p.energyContribution.oxidative}%`,
    `优先体能: ${p.keyPhysicalQualities.join(' > ')}`,
    `训练重点: ${p.trainingFocus}`,
  ].join(' | ');
}

/**
 * 获取所有位置的跑动数据表格文本（供AI system prompt使用）
 */
export function buildPositionDataTable(): string {
  return `### 位置跑动数据（Di Salvo 2007, m/场）
| 位置 | 总距离 | 高速>19km/h | 冲刺>23km/h |
|------|--------|------------|------------|
| 中后卫 | ${POSITION_PROFILES.defender.totalDistance} | ${POSITION_PROFILES.defender.highSpeedDistance} | ${POSITION_PROFILES.defender.sprintDistance} |
| 边后卫 | ${POSITION_PROFILES.wingback.totalDistance} | ${POSITION_PROFILES.wingback.highSpeedDistance} | ${POSITION_PROFILES.wingback.sprintDistance} |
| 中场中路 | ${POSITION_PROFILES.midfielder.totalDistance} | ${POSITION_PROFILES.midfielder.highSpeedDistance} | ${POSITION_PROFILES.midfielder.sprintDistance} |
| 边前卫 | ${POSITION_PROFILES.forward.totalDistance} | ${POSITION_PROFILES.forward.highSpeedDistance} | ${POSITION_PROFILES.forward.sprintDistance} |
GK: ~4-5km, 爆发性冲刺扑救为主`;
}

/**
 * 基于位置的训练目标推荐
 */
export function recommendGoalsByPosition(position: Position): TrainingGoal[] {
  const p = getPositionProfile(position);
  return p.keyPhysicalQualities;
}

/**
 * 基于位置的每周训练频率建议
 */
export function recommendWeeklyFrequency(position: Position, phase: string): number {
  const baseFreq: Record<Position, number> = {
    goalkeeper: 2,
    defender: 3,
    midfielder: 2, // 比赛跑量大，体能房频率相对低
    forward: 3,
    center_forward: 3,
    winger: 2,
    wingback: 2, // 比赛跑量极大会，体能房频率相对低
  };

  const phaseMod: Record<string, number> = {
    offseason: 1,
    preseason: 0,
    competition: -1,
    recovery: -1,
  };

  return Math.max(1, baseFreq[position] + (phaseMod[phase] || 0));
}
