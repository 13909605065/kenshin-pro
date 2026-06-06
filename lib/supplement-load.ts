// Auto-calculate supplement load based on match minutes played

export interface MatchRecord {
  playerName: string;
  minutes: number; // 0-90
  position: string; // midfielder, defender, wingback, forward, goalkeeper
  date: string; // ISO date string
}

export interface SupplementResult {
  needSupplement: boolean;
  runDistance: number; // meters
  strategy: string;
}

/** Average running distance per position for a full 90-minute match (meters) */
const POS_DISTANCE: Record<string, number> = {
  midfielder: 7061,
  defender: 7080,
  wingback: 7012,
  forward: 6960,
  goalkeeper: 4000,
};

/**
 * Calculate supplement load for a player based on match minutes played.
 * Players who play < 45 minutes need additional running volume.
 */
export function calcSupplementLoad(match: MatchRecord): SupplementResult {
  const baseDist = POS_DISTANCE[match.position] || 7000;

  if (match.minutes >= 45) {
    return { needSupplement: false, runDistance: 0, strategy: "正常训练，无需额外补负荷" };
  }

  let ratio = 0;
  if (match.minutes === 0) {
    ratio = 0.65;
  } else if (match.minutes <= 20) {
    ratio = 0.45;
  } else {
    ratio = 0.25;
  }

  const runDistance = Math.round(baseDist * ratio);
  const strategy =
    match.minutes === 0
      ? `未出场，需补${runDistance}m跑量。优先SSG(4v4/5v5)补负荷，无SSG用间歇跑(15s跑/15s走×10-15组)，训练主体后/冷身前进行。`
      : `上场${match.minutes}min，需补${runDistance}m跑量。增加变速跑+加速减速次数。训练主体后/冷身前进行。`;

  return { needSupplement: true, runDistance, strategy };
}

/**
 * Batch calculate supplement loads for multiple match records.
 * Returns a list of results with player names.
 */
export function batchSupplementLoads(
  matches: MatchRecord[]
): (MatchRecord & SupplementResult)[] {
  return matches.map((match) => ({
    ...match,
    ...calcSupplementLoad(match),
  }));
}

/**
 * Calculate total supplement running volume needed for a squad.
 */
export function totalSupplementVolume(matches: MatchRecord[]): {
  totalDistance: number;
  playerCount: number;
} {
  const results = batchSupplementLoads(matches);
  const supplementing = results.filter((r) => r.needSupplement);
  return {
    totalDistance: supplementing.reduce((sum, r) => sum + r.runDistance, 0),
    playerCount: supplementing.length,
  };
}

// ═══════════════════════════════════════════
// Player Load Tracker (负荷追踪器)
// ═══════════════════════════════════════════

export interface TrainingLoadEntry {
  date: string;
  type: 'pitch' | 'gym';
  duration: number;     // minutes
  intensity: '极高' | '高' | '中高' | '中' | '中低' | '低';
  focus: string;
}

export interface MatchLoadEntry {
  date: string;
  minutes: number;
  position: string;
}

export interface WeeklyLoadReport {
  playerId: string;
  playerName: string;
  weekStart: string;
  matchMinutes: number;
  matchLoadAU: number;
  trainingSessions: number;
  trainingLoadAU: number;
  totalLoadAU: number;
  supplementNeeded: boolean;
  supplementRunningMeters: number;
  supplementStrategy: string;
}

const INTENSITY_AU: Record<string, number> = {
  '极高': 12, '高': 9, '中高': 7.5, '中': 6, '中低': 4.5, '低': 3,
};

/** 位置负荷系数 — 中场/翼卫跑动 > 后卫/前锋 > 门将 */
export const POS_LOAD_COEF: Record<string, number> = {
  midfielder: 1.15, wingback: 1.10, forward: 1.05, defender: 1.00, goalkeeper: 0.70,
};

export function getPositionCoef(position: string): number {
  return POS_LOAD_COEF[position] || 1.0;
}

/** 双赛周保护：杯赛主力出场时间上限（分钟） */
export const CUP_MATCH_MAX_MINUTES = 60;
/** 杯赛后禁止大重量下肢训练的时长（小时） */
export const CUP_POST_RESTRICT_HOURS = 48;

/**
 * Estimate training load in AU for a single session.
 * Now includes position coefficient.
 */
export function calcTrainingLoadAU(entry: TrainingLoadEntry, position?: string): number {
  const auPerMin = INTENSITY_AU[entry.intensity] || 6;
  const sceneFactor = entry.type === 'pitch' ? 1.0 : 0.8;
  const posCoef = position ? getPositionCoef(position) : 1.0;
  return Math.round(entry.duration * auPerMin * sceneFactor * posCoef);
}

/**
 * Estimate match load in AU from minutes played + position.
 * Position-specific metabolic cost per minute.
 */
export function calcMatchLoadAU(minutes: number, position: string): number {
  const posCost: Record<string, number> = {
    midfielder: 8.5, defender: 8.0, wingback: 9.0, forward: 7.5, goalkeeper: 5.0,
  };
  const auPerMin = posCost[position] || 7.5;
  const posCoef = getPositionCoef(position);
  return Math.round(minutes * auPerMin * posCoef);
}

/**
 * Generate a weekly load report for a player.
 * Combines match load + training load → total load + supplement recommendation.
 */
export function generateWeeklyLoadReport(params: {
  playerId: string;
  playerName: string;
  weekStart: string;
  matches: MatchLoadEntry[];
  trainings: TrainingLoadEntry[];
  position: string;
}): WeeklyLoadReport {
  const matchMinutes = params.matches.reduce((s, m) => s + m.minutes, 0);
  const matchLoad = params.matches.reduce((s, m) => s + calcMatchLoadAU(m.minutes, m.position), 0);
  const trainingLoad = params.trainings.reduce((s, t) => s + calcTrainingLoadAU(t), 0);

  // Supplement: if match minutes < 45, need running supplement
  const suppResult = calcSupplementLoad({
    playerName: params.playerName,
    minutes: matchMinutes,
    position: params.position,
    date: params.weekStart,
  });

  return {
    playerId: params.playerId,
    playerName: params.playerName,
    weekStart: params.weekStart,
    matchMinutes,
    matchLoadAU: matchLoad,
    trainingSessions: params.trainings.length,
    trainingLoadAU: trainingLoad,
    totalLoadAU: matchLoad + trainingLoad,
    supplementNeeded: suppResult.needSupplement,
    supplementRunningMeters: suppResult.runDistance,
    supplementStrategy: suppResult.strategy,
  };
}

/**
 * Generate squad-wide load report after a match.
 * Flags players who need load supplementation.
 */
export function squadPostMatchReport(players: Array<{
  id: string;
  name: string;
  position: string;
  minutes: number;
}>, matchDate: string): WeeklyLoadReport[] {
  return players.map(p => generateWeeklyLoadReport({
    playerId: p.id,
    playerName: p.name,
    weekStart: matchDate,
    matches: [{ date: matchDate, minutes: p.minutes, position: p.position }],
    trainings: [],
    position: p.position,
  }));
}

// ═══════════════════════════════════════════
// ACWR — Acute:Chronic Workload Ratio
// 足球体能最核心的安全指标，>1.5 伤风险骤升
// ═══════════════════════════════════════════

export interface ACWRReport {
  playerId: string;
  playerName: string;
  acuteLoad: number;    // 最近 7 天总负荷 (AU)
  chronicLoad: number;  // 最近 28 天平均周负荷 (AU)
  acwr: number;         // acute / chronic
  status: 'safe' | 'warning' | 'danger';
  recommendation: string;
}

/**
 * Calculate ACWR for a player given their daily load history.
 * @param dailyLoads Array of { date, loadAU } for the last 28+ days
 */
export function calculateACWR(
  playerId: string,
  playerName: string,
  dailyLoads: Array<{ date: string; loadAU: number }>
): ACWRReport {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 86400000);

  // Acute: last 7 days total
  const acuteLoad = dailyLoads
    .filter(d => new Date(d.date) >= sevenDaysAgo)
    .reduce((sum, d) => sum + d.loadAU, 0);

  // Chronic: last 28 days average weekly load
  const chronicTotal = dailyLoads
    .filter(d => new Date(d.date) >= twentyEightDaysAgo)
    .reduce((sum, d) => sum + d.loadAU, 0);
  const chronicLoad = chronicTotal / 4; // avg per week

  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

  let status: 'safe' | 'warning' | 'danger';
  let recommendation: string;

  if (acwr < 0.8) {
    status = 'safe';
    recommendation = '负荷偏低，可适当加量。注意从低强度逐步递增。';
  } else if (acwr < 1.2) {
    status = 'safe';
    recommendation = '负荷在最佳窗口。保持当前节奏。';
  } else if (acwr < 1.5) {
    status = 'warning';
    recommendation = '⚠️ 负荷偏高，进入警戒区。未来3天内避免新增高强度训练，优先保证睡眠和营养。';
  } else {
    status = 'danger';
    recommendation = '🚨 负荷严重超标，伤风险极高！立即减量至最低有效剂量，禁止新动作和高强度对抗。';
  }

  return { playerId, playerName, acuteLoad, chronicLoad, acwr, status, recommendation };
}

// ═══════════════════════════════════════════
// 按位置区分的补负荷策略
// ═══════════════════════════════════════════

interface PositionSupplement {
  primaryMethod: string;
  runningType: string;
  targetIntensity: string;
  specificDrills: string[];
}

const POS_SUPPLEMENT: Record<string, PositionSupplement> = {
  midfielder: {
    primaryMethod: 'SSG 4v4/5v5（小场地比赛）',
    runningType: '间歇变速跑（15s跑/15s走 × 12-15组）',
    targetIntensity: '中高，HR 80-90% HRmax',
    specificDrills: ['4v4 双球门 SSG', '3区变速跑', '转向+加速组合', 'RSA 6×40m'],
  },
  defender: {
    primaryMethod: '加速减速重复跑 + 变向练习',
    runningType: '冲刺-制动-后退循环（10m冲刺/5m制动/5m后退 × 8-10组）',
    targetIntensity: '中，HR 75-85% HRmax',
    specificDrills: ['10-5-5 冲刺制动后退', '侧滑步+转身冲刺', '头球+落地冲刺', '1v1 防守对抗'],
  },
  wingback: {
    primaryMethod: '高速间歇跑 + 变向敏捷',
    runningType: '边路往返冲刺（20m冲刺/10m慢跑回 × 10-12组）',
    targetIntensity: '高，HR 85-95% HRmax',
    specificDrills: ['边路折返冲刺', '传中+回追冲刺', '4v4 宽场地 SSG', 'Yoyo 间歇恢复'],
  },
  forward: {
    primaryMethod: '短距离爆发冲刺 + 射门后回追',
    runningType: '5-15m 爆发冲刺（5组×5次，组间休60s）',
    targetIntensity: '极高，最大努力',
    specificDrills: ['5-15m 爆发起跑', '射门+回追冲刺', '1v1 突破对抗', '反应启动训练'],
  },
  goalkeeper: {
    primaryMethod: '反应敏捷 + 低强度恢复',
    runningType: '低强度技术维持（基本不需要补跑量）',
    targetIntensity: '低，HR <70% HRmax',
    specificDrills: ['侧扑+快速起身', '出击判断+回位', '手抛+脚下技术', '主动恢复拉伸'],
  },
};

export function getPositionSupplement(position: string): PositionSupplement {
  return POS_SUPPLEMENT[position] || POS_SUPPLEMENT.midfielder;
}

// ═══════════════════════════════════════════
// Squad load overview（全队负荷总览）
// ═══════════════════════════════════════════

export interface SquadLoadOverview {
  totalSquadLoad: number;
  averageLoadPerPlayer: number;
  highestLoadPlayer: { name: string; load: number };
  acwrWarnings: ACWRReport[];
  supplementNeeded: number;
}

export function generateSquadOverview(
  loadReports: WeeklyLoadReport[],
  acwrReports: ACWRReport[]
): SquadLoadOverview {
  const totalLoad = loadReports.reduce((s, r) => s + r.totalLoadAU, 0);
  const avgLoad = loadReports.length > 0 ? Math.round(totalLoad / loadReports.length) : 0;
  const highest = loadReports.reduce((max, r) => r.totalLoadAU > max.load ? { name: r.playerName, load: r.totalLoadAU } : max, { name: '—', load: 0 });
  const warnings = acwrReports.filter(r => r.status === 'warning' || r.status === 'danger');
  const suppCount = loadReports.filter(r => r.supplementNeeded).length;

  return {
    totalSquadLoad: totalLoad,
    averageLoadPerPlayer: avgLoad,
    highestLoadPlayer: highest,
    acwrWarnings: warnings,
    supplementNeeded: suppCount,
  };
}

// ═══════════════════════════════════════════
// 伤病过滤 — 按 injuryStatus 自动匹配替代训练
// ═══════════════════════════════════════════

export type InjuryStatus = 'healthy' | 'minor' | 'out';

export interface InjuryAdjustedTraining {
  playerId: string;
  playerName: string;
  status: InjuryStatus;
  originalScene: string;
  adjustedScene: string | null;
  adjustedIntensity: string;
  substituteActivity: string;
}

/**
 * Given a player's injury status, return the adjusted training assignment.
 * - healthy → normal training
 * - minor → reduced intensity, no contact, technical work only
 * - out → observation/rehab only, no field/gym participation
 */
export function adjustForInjury(
  playerId: string,
  playerName: string,
  status: InjuryStatus,
  plannedScene: 'gym' | 'pitch' | null,
  plannedIntensity: string
): InjuryAdjustedTraining {
  if (status === 'healthy') {
    return {
      playerId, playerName, status,
      originalScene: plannedScene || 'rest',
      adjustedScene: plannedScene,
      adjustedIntensity: plannedIntensity,
      substituteActivity: '正常训练',
    };
  }

  if (status === 'minor') {
    return {
      playerId, playerName, status,
      originalScene: plannedScene || 'rest',
      adjustedScene: plannedScene, // same scene but reduced
      adjustedIntensity: '低',
      substituteActivity: plannedScene === 'gym'
        ? '上肢维持+核心+泳池（禁下肢大重量）'
        : '技术观察+轻传球+无对抗跑动（禁对抗/冲刺/头球）',
    };
  }

  // out
  return {
    playerId, playerName, status,
    originalScene: plannedScene || 'rest',
    adjustedScene: null,
    adjustedIntensity: '-',
    substituteActivity: '康复治疗+录像分析+上肢轻量维持（如有医嘱）',
  };
}

// ═══════════════════════════════════════════
// 准备度 → 训练强度自动调整
// ═══════════════════════════════════════════

export interface ReadinessAdjustment {
  originalIntensity: string;
  adjustedIntensity: string;
  intensityMod: string; // e.g. "-15%"
  recommendation: string;
  overrideDay: boolean; // true = 强制改为恢复日
}

/**
 * Map readiness score (0-100) to training intensity adjustment.
 * - ≥85: full send, +10%
 * - 70-84: normal, as planned
 * - 55-69: reduce 15%, no new exercises
 * - 40-54: reduce 30%, technique only
 * - <40: override → recovery day
 */
export function adjustIntensityByReadiness(
  readinessScore: number,
  originalIntensity: string
): ReadinessAdjustment {
  if (readinessScore >= 85) {
    return {
      originalIntensity, adjustedIntensity: bumpIntensity(originalIntensity, 1),
      intensityMod: '+10%', recommendation: '状态极佳，可冲击上限', overrideDay: false,
    };
  }
  if (readinessScore >= 70) {
    return {
      originalIntensity, adjustedIntensity: originalIntensity,
      intensityMod: '原计划', recommendation: '按计划执行', overrideDay: false,
    };
  }
  if (readinessScore >= 55) {
    return {
      originalIntensity, adjustedIntensity: dropIntensity(originalIntensity, 1),
      intensityMod: '-15%', recommendation: '降量15%，避免新动作和极限重量', overrideDay: false,
    };
  }
  if (readinessScore >= 40) {
    return {
      originalIntensity, adjustedIntensity: '低',
      intensityMod: '-30%', recommendation: '仅技术维持+主动恢复，禁高强度对抗', overrideDay: false,
    };
  }
  return {
    originalIntensity, adjustedIntensity: '-',
    intensityMod: '休息', recommendation: '全天休息或仅拉伸/泡沫轴', overrideDay: true,
  };
}

function bumpIntensity(i: string, steps: number): string {
  const scale = ['-', '低', '中低', '中', '中高', '高', '极高'];
  const idx = scale.indexOf(i);
  return scale[Math.min(idx + steps, scale.length - 1)] || i;
}

function dropIntensity(i: string, steps: number): string {
  const scale = ['-', '低', '中低', '中', '中高', '高', '极高'];
  const idx = scale.indexOf(i);
  return scale[Math.max(idx - steps, 0)] || i;
}
