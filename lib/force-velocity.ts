/**
 * 力-速曲线 (Force-Velocity Profile) 评估
 *
 * 基于 Samozino/Jimenez-Reyes 方法学，通过不同负荷下的跳跃高度
 * 推算理论最大力(F0)、理论最大速度(V0)、最大功率(Pmax)和力速不平衡百分比。
 *
 * 参考文献：Samozino et al. 2008, Jimenez-Reyes et al. 2017
 */

// ═══════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════

export interface FVProfile {
  /** 理论最大力 N/kg */
  f0: number;
  /** 理论最大速度 m/s */
  v0: number;
  /** 最大功率 W/kg */
  pmax: number;
  /** F-V 斜率 */
  sfv: number;
  /** 力速不平衡百分比（负=力缺陷，正=速度缺陷） */
  fvImbalance: number;
  /** 档案类型 */
  profileType: 'force_deficit' | 'velocity_deficit' | 'balanced';
  profileTypeCn: string;
  /** 跳跃高度 cm */
  jumpHeight: number;
  /** 最佳 F0 */
  optimalF0: number;
  /** 最佳 V0 */
  optimalV0: number;
  /** 训练建议 */
  trainingRecommendation: string;
}

export interface FVInput {
  /** 体重 kg */
  bodyMass: number;
  /** 腿部蹬伸距离 m（约等于腿长×0.7 或直接测量） */
  pushOffDistance: number;
  /** 不同外加负荷下的跳跃高度 [{load: kg, height: cm}] */
  jumpHeightsAtLoads: Array<{ load: number; height: number }>;
}

// ═══════════════════════════════════════════
// 常数
// ═══════════════════════════════════════════

const GRAVITY = 9.81; // m/s²

// 足球运动员各位置的参考F0值 N/kg
const F0_REFERENCES: Record<string, { f0: number; v0: number; pmax: number }> = {
  goalkeeper: { f0: 32, v0: 3.0, pmax: 24 },
  defender: { f0: 34, v0: 2.9, pmax: 25 },
  midfielder: { f0: 32, v0: 3.1, pmax: 25 },
  forward: { f0: 33, v0: 3.2, pmax: 26 },
  wingback: { f0: 33, v0: 3.1, pmax: 26 },
  default: { f0: 33, v0: 3.1, pmax: 25 },
};

// ═══════════════════════════════════════════
// 核心计算
// ═══════════════════════════════════════════

/**
 * 从跳跃高度计算起跳速度
 * v_takeoff = sqrt(2 × g × h)
 */
function takeoffVelocity(jumpHeightM: number): number {
  return Math.sqrt(2 * GRAVITY * Math.max(0.001, jumpHeightM));
}

/**
 * 计算平均推力
 * F = m × (g + v²/(2×h_push))
 * 其中 h_push = pushOffDistance
 */
function meanForce(bodyMass: number, pushOffDistance: number, jumpHeightM: number): number {
  const v = takeoffVelocity(jumpHeightM);
  // 平均加速度 = v²/(2×h_push)
  const a = (v * v) / (2 * pushOffDistance);
  return bodyMass * (GRAVITY + a);
}

/**
 * 线性回归：y = a + b×x
 * 返回 { slope: b, intercept: a, r2: correlation coefficient }
 */
function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0, r2: 0 };

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
  const sumX2 = xs.reduce((sum, x) => sum + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R²
  const yMean = sumY / n;
  const ssReg = xs.reduce((sum, x) => sum + Math.pow(intercept + slope * x - yMean, 2), 0);
  const ssTot = ys.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const r2 = ssTot > 0 ? ssReg / ssTot : 0;

  return { slope, intercept, r2 };
}

/**
 * 计算力速曲线档案
 */
export function computeFVProfile(input: FVInput): FVProfile {
  const { bodyMass, pushOffDistance, jumpHeightsAtLoads } = input;

  if (jumpHeightsAtLoads.length < 2) {
    // 数据不足，返回默认档案
    return {
      f0: 33,
      v0: 3.1,
      pmax: 25,
      sfv: -10.6,
      fvImbalance: 0,
      profileType: 'balanced',
      profileTypeCn: '均衡',
      jumpHeight: jumpHeightsAtLoads[0]?.height || 30,
      optimalF0: 33,
      optimalV0: 3.1,
      trainingRecommendation: '需要至少2组不同负荷的跳跃数据来计算F-V曲线',
    };
  }

  // 计算每组数据的力和速度
  const forces: number[] = [];
  const velocities: number[] = [];

  for (const trial of jumpHeightsAtLoads) {
    const totalMass = bodyMass + trial.load;
    const heightM = trial.height / 100; // cm → m
    const v = takeoffVelocity(heightM);
    const f = meanForce(totalMass, pushOffDistance, heightM);

    velocities.push(v);
    forces.push(f / bodyMass); // 标准化为 N/kg
  }

  // F = F0 - b×V  →  force = intercept + slope × velocity
  // slope 应该是负数
  const reg = linearRegression(velocities, forces);

  const f0 = Math.max(0, reg.intercept); // V=0 时的力 N/kg
  const v0 = reg.slope !== 0 ? Math.max(0, -reg.intercept / reg.slope) : 3.0; // F=0 时的速度 m/s
  const pmax = (f0 * v0) / 4; // 最大功率 = F0×V0/4
  const sfv = reg.slope; // F-V 斜率

  // 最佳档案（假设 FV 曲线为直线，最佳 Pmax 出现在 F0/2 和 V0/2 处）
  const optimalF0 = f0;
  const optimalV0 = v0;

  // 计算 Sfv 的最佳值（基于 Pmax 和推杆距离）
  const sFVopt = -(f0 / v0);

  // 力速不平衡 = (实际Sfv - 最佳Sfv) / 最佳Sfv × 100
  const fvImbalance = sFVopt !== 0 ? ((sfv - sFVopt) / Math.abs(sFVopt)) * 100 : 0;

  // 判断档案类型
  let profileType: FVProfile['profileType'] = 'balanced';
  let profileTypeCn = '均衡';
  if (fvImbalance > 20) {
    profileType = 'velocity_deficit';
    profileTypeCn = '速度缺陷';
  } else if (fvImbalance < -20) {
    profileType = 'force_deficit';
    profileTypeCn = '力量缺陷';
  }

  // 训练建议
  let trainingRecommendation: string;
  if (profileType === 'force_deficit') {
    trainingRecommendation = '偏力型：重点发展最大力量（深蹲/硬拉>85%1RM）和发力率(RFD)，减少速度训练比例';
  } else if (profileType === 'velocity_deficit') {
    trainingRecommendation = '偏速型：重点发展速度和爆发力（增强式/冲刺/轻载弹道训练<30%1RM），减少大重量训练比例';
  } else {
    trainingRecommendation = '力速均衡：维持当前训练配比，力量和速度训练各占50%';
  }

  // 取最佳跳跃高度
  const bestJump = Math.max(...jumpHeightsAtLoads.map(t => t.height));

  return {
    f0: Math.round(f0 * 10) / 10,
    v0: Math.round(v0 * 100) / 100,
    pmax: Math.round(pmax * 10) / 10,
    sfv: Math.round(sfv * 10) / 10,
    fvImbalance: Math.round(fvImbalance * 10) / 10,
    profileType,
    profileTypeCn,
    jumpHeight: bestJump,
    optimalF0: Math.round(optimalF0 * 10) / 10,
    optimalV0: Math.round(optimalV0 * 100) / 100,
    trainingRecommendation,
  };
}

/**
 * 获取位置参考值
 */
export function getFVReference(position: string) {
  return F0_REFERENCES[position] || F0_REFERENCES.default;
}

/**
 * 从跳跃高度和30m冲刺时间粗略估算F-V档案
 *（当无法直接测量F-V曲线时的代理估算）
 */
export function estimateFromJumpAndSprint(
  _bodyMass: number,
  jumpHeightCm: number,
  sprint30mSec: number,
  position: string = 'default'
): FVProfile {
  const ref = getFVReference(position);

  // 跳跃高度→估计F0
  const heightRatio = jumpHeightCm / 40; // 40cm 作为基准跳跃高度
  const estimatedF0 = ref.f0 * Math.min(1.3, Math.max(0.7, heightRatio));

  // 30m时间→估计V0
  const speedRatio = 4.0 / Math.max(3.5, sprint30mSec); // 4.0s 作为基准
  const estimatedV0 = ref.v0 * Math.min(1.3, Math.max(0.7, speedRatio));

  const pmax = (estimatedF0 * estimatedV0) / 4;

  return {
    f0: Math.round(estimatedF0 * 10) / 10,
    v0: Math.round(estimatedV0 * 100) / 100,
    pmax: Math.round(pmax * 10) / 10,
    sfv: -estimatedF0 / estimatedV0,
    fvImbalance: 0,
    profileType: 'balanced',
    profileTypeCn: '均衡（估算值）',
    jumpHeight: jumpHeightCm,
    optimalF0: estimatedF0,
    optimalV0: estimatedV0,
    trainingRecommendation: '此为估算值，建议进行多负荷跳跃测试以获取精确F-V曲线',
  };
}

/**
 * 力-速区间分类（用于训练处方）
 */
export function classifyFVZone(percent1RM: number): {
  zone: string;
  zoneCn: string;
  speedMs: [number, number];
  exampleExercise: string;
} {
  if (percent1RM >= 85) return { zone: 'max_strength', zoneCn: '最大力量', speedMs: [0, 0.5], exampleExercise: '深蹲、硬拉' };
  if (percent1RM >= 60) return { zone: 'strength_speed', zoneCn: '力量-速度', speedMs: [0.5, 1.0], exampleExercise: '奥举、六角杠跳' };
  if (percent1RM >= 30) return { zone: 'speed_strength', zoneCn: '速度-力量', speedMs: [1.0, 1.5], exampleExercise: '药球抛掷、跳箱' };
  return { zone: 'max_speed', zoneCn: '最大速度', speedMs: [1.5, 3.5], exampleExercise: '冲刺、增强式' };
}
