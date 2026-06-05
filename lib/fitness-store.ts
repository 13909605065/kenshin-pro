/**
 * 体能测试数据 — 职业S&C教练核心数据驱动
 *
 * 存储每个球员的客观测试数据，直接驱动AI方案生成的负荷决策。
 * 核心理念：方案基于数据而非训练年限。
 */

export interface FitnessProfile {
  // 力量 — %1RM映射基准
  squat1RM?: number;        // 深蹲1RM (kg)
  bench1RM?: number;        // 卧推1RM (kg)
  deadlift1RM?: number;     // 硬拉1RM (kg)
  powerClean1RM?: number;   // 高翻1RM (kg)

  // 速度 — 光电计时
  sprint10m?: number;       // 10m冲刺 (s), 优秀<1.7
  sprint30m?: number;       // 30m冲刺 (s), 优秀<4.0

  // 爆发力
  verticalJump?: number;    // CMJ反向跳 (cm)
  broadJump?: number;       // 立定跳远 (cm)

  // 有氧耐力
  yoYoIR1?: number;         // Yo-Yo IR1 (m), 优秀>2000
  thirtyFifteenIFT?: number;// 30-15 IFT (km/h), 优秀>20

  // 敏捷
  proAgility?: number;      // 5-10-5折返 (s)

  // 损伤预防
  nordicCurlReps?: number;  // 北欧弯举次数, 优秀≥10

  // 体成分
  bodyFat?: number;         // 体脂率 (%)

  // 元数据
  date?: string;            // 测试日期
  notes?: string;           // 备注
}

const FITNESS_KEY = 'kenshin_fitness_profiles';

export function getFitnessProfiles(): Record<string, FitnessProfile> {
  try { return JSON.parse(localStorage.getItem(FITNESS_KEY) || '{}'); } catch { return {}; }
}

function save(profiles: Record<string, FitnessProfile>) {
  try { localStorage.setItem(FITNESS_KEY, JSON.stringify(profiles)); } catch {}
}

export function getFitnessProfile(playerId: string): FitnessProfile {
  return getFitnessProfiles()[playerId] || {};
}

export function updateFitnessProfile(playerId: string, update: Partial<FitnessProfile>) {
  const all = getFitnessProfiles();
  all[playerId] = { ...(all[playerId] || {}), ...update, date: new Date().toISOString().slice(0, 10) };
  save(all);
}

/** Generate a human-readable fitness summary for AI prompt injection */
export function fitnessSummary(profile: FitnessProfile): string {
  const parts: string[] = [];
  if (profile.squat1RM) parts.push(`深蹲1RM: ${profile.squat1RM}kg`);
  if (profile.bench1RM) parts.push(`卧推1RM: ${profile.bench1RM}kg`);
  if (profile.deadlift1RM) parts.push(`硬拉1RM: ${profile.deadlift1RM}kg`);
  if (profile.powerClean1RM) parts.push(`高翻1RM: ${profile.powerClean1RM}kg`);
  if (profile.sprint10m) parts.push(`10m: ${profile.sprint10m}s`);
  if (profile.sprint30m) parts.push(`30m: ${profile.sprint30m}s`);
  if (profile.verticalJump) parts.push(`CMJ: ${profile.verticalJump}cm`);
  if (profile.yoYoIR1) parts.push(`Yo-Yo IR1: ${profile.yoYoIR1}m`);
  if (profile.thirtyFifteenIFT) parts.push(`30-15 IFT: ${profile.thirtyFifteenIFT}km/h`);
  if (profile.nordicCurlReps != null) parts.push(`北欧弯举: ${profile.nordicCurlReps}次`);
  if (profile.proAgility) parts.push(`Pro-Agility: ${profile.proAgility}s`);
  if (profile.bodyFat != null) parts.push(`体脂: ${profile.bodyFat}%`);
  return parts.join(', ');
}

/** Generate 1RM-to-bodyweight ratio assessment */
export function strengthAssessment(profile: FitnessProfile, bodyWeight: number | null): string {
  if (!bodyWeight || !profile.squat1RM) return '';
  const ratio = profile.squat1RM / bodyWeight;
  if (ratio >= 2.0) return '深蹲/体重 ≥2.0: 精英级 → L3增强式可用';
  if (ratio >= 1.5) return '深蹲/体重 1.5-2.0: 中级 → L2增强式可用';
  return '深蹲/体重 <1.5: 入门级 → L1增强式，优先力量基础';
}

/** Speed assessment */
export function speedAssessment(profile: FitnessProfile): string {
  if (!profile.sprint30m) return '';
  if (profile.sprint30m < 4.0) return '30m<4.0s: 优秀 → 维持速度，RSA训练为主';
  if (profile.sprint30m < 4.3) return '30m 4.0-4.3s: 良好 → 加速技术+最大速度并重';
  return '30m>4.3s: 需提高 → 优先加速技术+力量基础';
}

/** Endurance assessment */
export function enduranceAssessment(profile: FitnessProfile): string {
  if (profile.yoYoIR1 && profile.yoYoIR1 > 2000) return 'Yo-Yo>2000m: 优秀 → 维持有氧基础，高强度间歇为主';
  if (profile.yoYoIR1 && profile.yoYoIR1 > 1600) return 'Yo-Yo 1600-2000m: 良好 → 有氧基础+间歇耐力并重';
  if (profile.yoYoIR1) return 'Yo-Yo<1600m: 需提高 → 优先有氧基础建设';
  if (profile.thirtyFifteenIFT && profile.thirtyFifteenIFT > 20) return '30-15IFT>20: 优秀 → 维持有氧';
  if (profile.thirtyFifteenIFT && profile.thirtyFifteenIFT > 18) return '30-15IFT 18-20: 良好';
  return '';
}

/** Get position benchmark for comparison */
export function positionBenchmark(position: string): string {
  const benchmarks: Record<string, string> = {
    goalkeeper: 'GK: CMJ>40cm, 10m<1.8s, 北欧弯举≥10',
    defender: '中后卫: 30m<4.2s, 深蹲>1.7x体重, Yo-Yo>1800m',
    wingback: '边后卫: 30m<4.0s, Yo-Yo>2000m, CMJ>35cm',
    midfielder: '中场: Yo-Yo>2000m, 30m<4.1s, 深蹲>1.5x体重',
    forward: '前锋: 30m<4.0s, CMJ>40cm, 10m<1.7s',
    center_forward: '中锋: 30m<4.1s, CMJ>38cm, 深蹲>1.5x体重',
    winger: '边锋: 30m<3.9s, CMJ>40cm, 10m<1.65s',
  };
  return benchmarks[position] || '';
}
