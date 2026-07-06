/**
 * 离线方案引擎 — AI不可用时用文库+周期库本地拼方案
 *
 * 基于 NSCA-CSCS 周期化参数 + training-library 动作库
 * 当豆包/DeepSeek API不可用时，自动降级为本地生成。
 */

import { getPhaseParams, getGoalParams } from './periodization';
import { WARMUP_LIBRARY, STRENGTH_LIBRARY, COOLDOWN_LIBRARY, POSITION_EXERCISES, GOAL_EXTRAS, type ExerciseRef } from './training-library';
import type { TrainingModule, Exercise, SeasonPhase, Position } from './types';

// ── Warmup selection ──
const GYM_WARMUP_IDS = ['warm-hip-open', 'warm-glute-activation', 'warm-dynamic-stretch', 'warm-plank-series', 'warm-side-plank-series', 'warm-single-leg-balance', 'warm-nordic-curl'];
const PITCH_NO_BALL_IDS = ['warm-light-jog', 'warm-agility-ladder', 'warm-dynamic-stretch', 'warm-glute-activation', 'warm-nordic-curl', 'warm-plank-series'];
const RECOVERY_WARMUP_IDS = ['warm-light-jog', 'warm-hip-open', 'warm-dynamic-stretch', 'warm-glute-activation', 'warm-plank-series'];

function pickWarmup(scene: string): string[] {
  if (scene === 'gym') return GYM_WARMUP_IDS;
  if (scene === 'recovery') return RECOVERY_WARMUP_IDS;
  // pitch: prefer no-ball for S&C focus
  return PITCH_NO_BALL_IDS;
}

function resolveWarmupItem(id: string) {
  const w = WARMUP_LIBRARY[id];
  return w ? { name: w.name, duration: w.duration, description: w.description } : { name: id, duration: 5, description: '' };
}

// ── Exercise selection by scene + goal ──
function pickExercises(scene: string, goal: string, duration: number, position?: Position | null): { upper: Exercise[]; lower: Exercise[]; core: Exercise[]; ability: Exercise[] } {
  const pp = getGoalParams(goal);
  const sets = pp ? (pp.setsReps.includes('-') ? parseInt(pp.setsReps.split('×')[0].split('-')[0]) : 3) : 3;
  const reps = pp ? (pp.setsReps.includes('-') ? parseInt(pp.setsReps.split('×')[1].split('-')[1] || pp.setsReps.split('×')[1]) : 8) : 8;
  const rest = pp ? parseInt(pp.rest) : 90;

  // Position-based exercise priority
  const posKey = position || 'midfielder';
  const posEx = POSITION_EXERCISES[posKey] || POSITION_EXERCISES.midfielder;
  const extras = GOAL_EXTRAS[goal] || [];

  const buildExercise = (ref: ExerciseRef): Exercise => ({
    name: ref.name,
    sets,
    reps,
    load: ref.load_default || 'BW',
    rest,
    rpe: (pp?.percent1RM?.[1] ?? 75) > 85 ? 8 : (pp?.percent1RM?.[1] ?? 75) > 70 ? 7 : 6,
    heart_rate_zone: 'Zone3',
    cue_points: ref.cue_points || [],
    image_url: (ref as any).image_url,
  });

  // Filter exercises: gym allows full equipment, pitch only bodyweight/band/ball
  // Remove GOAL_EXTRAS lookup — handled via positionExercises instead
  const isPitch = scene === 'pitch';
  const equipmentOk = (ref: ExerciseRef) => {
    if (!isPitch) return true;
    const hasGymEquip = ref.name.includes('杠铃') || ref.name.includes('哑铃') || ref.name.includes('绳索') || ref.name.includes('悬吊');
    return !hasGymEquip;
  };

  const lowerIds = [...posEx.lower, ...extras].filter((id, i, a) => a.indexOf(id) === i);
  const coreIds = [...posEx.core];

  // Determine count based on duration
  const count = duration <= 30 ? 4 : duration <= 45 ? 5 : duration <= 60 ? 6 : 7;

  const lower: Exercise[] = lowerIds
    .map(id => STRENGTH_LIBRARY[id])
    .filter((r): r is ExerciseRef => !!r && equipmentOk(r))
    .slice(0, Math.ceil(count * 0.5))
    .map(buildExercise);

  const core: Exercise[] = coreIds
    .map(id => STRENGTH_LIBRARY[id])
    .filter((r): r is ExerciseRef => !!r)
    .slice(0, Math.ceil(count * 0.3))
    .map(buildExercise);

  const upper: Exercise[] = isPitch ? [] : posEx.upper
    .map(id => STRENGTH_LIBRARY[id])
    .filter((r): r is ExerciseRef => !!r)
    .slice(0, Math.ceil(count * 0.2))
    .map(buildExercise);

  const ability: Exercise[] = extras
    .slice(0, 2)
    .map(id => STRENGTH_LIBRARY[id])
    .filter((r): r is ExerciseRef => !!r && equipmentOk(r))
    .map(e => ({ ...buildExercise(e), progression: '根据RPE调整' }));

  return { upper, lower, core, ability };
}

// ── Cooldown ──
const COOLDOWN_IDS = ['cool-static-stretch', 'cool-foam-roll'];
function resolveCooldown() {
  return COOLDOWN_IDS.map(id => {
    const c = COOLDOWN_LIBRARY[id];
    return c ? { name: c.name, duration: c.duration, description: c.description } : { name: id, duration: 5, description: '' };
  });
}

// ── Nutrition ──
function pickNutrition(goal: string) {
  const base = { pre_training: '香蕉1根+水500ml（训前30-60min）', post_training: '乳清蛋白25g+快碳50g（训后30min内）', daily_plan: '碳水5-8g/kg，蛋白1.6-2.0g/kg', hydration: '体重×35ml/天，训练额外+800ml', supplements: '肌酸5g/日，维生素D3 2000IU' };
  if (goal === 'strength' || goal === 'power') return { ...base, pre_training: '碳水50g+咖啡因3mg/kg（训前60min）', post_training: '乳清蛋白30g+快碳60g+肌酸5g（训后30min内）' };
  if (goal === 'mas_endurance') return { ...base, daily_plan: '碳水6-8g/kg，蛋白1.6-1.8g/kg', pre_training: '碳水60g+电解质饮料500ml', post_training: '乳清蛋白25g+快碳80g+电解质', supplements: '电解质片+维生素D3 2000IU' };
  return base;
}

// ── Main export: generate offline plan ──
export interface OfflinePlanInput {
  scene: string;
  goal: string;
  phase: SeasonPhase;
  duration: number;
  position?: Position | null;
  playerName?: string;
}

export function generateOfflinePlan(input: OfflinePlanInput): TrainingModule[] {
  const { scene, goal, phase, duration, position, playerName } = input;
  const pp = getPhaseParams(phase);
  const gp = getGoalParams(goal);

  // ── Recovery scene: stretching + foam rolling + breathing ──
  if (scene === 'recovery') {
    const recoveryWarmup = pickWarmup('recovery').map(resolveWarmupItem);
    const recoveryCooldown = [
      { name: '泡沫轴筋膜放松', duration: 10, description: '小腿/大腿前后侧/背部/臀肌，每部位45-60s缓慢滚动，痛点停留' },
      { name: '静态拉伸序列', duration: 10, description: '股四头肌/腘绳肌/臀肌/髋屈肌/小腿/胸椎，每侧20-30s保持，禁止弹震' },
      { name: '腹式呼吸调节', duration: 5, description: '仰卧屈膝，吸气4s→屏息2s→呼气6s，5-8轮，降低心率至Zone1' },
    ];
    const goalLabel = gp?.labelCn || goal;
    const phaseLabel = pp.labelCn;
    const sceneLabel = '恢复再生';
    const title = `${sceneLabel}·${goalLabel}·${phaseLabel}`;
    return [{
      module: 'position_training',
      title: playerName ? `${playerName} · ${title}` : title,
      analysis: `离线恢复模式 | 场景:${sceneLabel} | 目标:${goalLabel} | 阶段:${phaseLabel} | HR Zone1-2(60-70%HRmax) | 纯自重 | 赛后MD+1恢复`,
      warmup: recoveryWarmup,
      upper_limb: [],
      lower_limb: [],
      core: [],
      cooldown: recoveryCooldown,
      nutrition: pickNutrition(goal),
      status: 'complete',
    }];
  }

  const warmup = pickWarmup(scene).map(resolveWarmupItem);
  const { upper, lower, core, ability } = pickExercises(scene, goal, duration, position);
  const cooldown = resolveCooldown();

  const goalLabel = gp?.labelCn || goal;
  const phaseLabel = pp.labelCn;
  const sceneLabel = scene === 'gym' ? '力量房' : scene === 'recovery' ? '恢复再生' : '外场';
  const title = `${sceneLabel}·${goalLabel}·${phaseLabel}`;

  const positionModule: TrainingModule = {
    module: 'position_training',
    title: playerName ? `${playerName} · ${title}` : title,
    analysis: `离线模式生成 | 场景:${sceneLabel} | 目标:${goalLabel} | 阶段:${phaseLabel} | ${pp.intensityPercent[0]}-${pp.intensityPercent[1]}%1RM | ${pp.setsRange[0]}-${pp.setsRange[1]}组×${pp.repsRange[0]}-${pp.repsRange[1]}次 | 间歇${pp.restBetweenSets[0]}-${pp.restBetweenSets[1]}s`,
    warmup,
    upper_limb: upper,
    lower_limb: lower,
    core,
    cooldown,
    nutrition: pickNutrition(goal),
    status: 'complete',
  };

  return [positionModule];
}

export function generateOfflineAbilityModule(input: OfflinePlanInput): TrainingModule | null {
  const { goal, duration, position } = input;
  const extras = GOAL_EXTRAS[goal] || [];
  if (extras.length === 0) return null;

  const gp = getGoalParams(goal);
  const sets = gp ? parseInt(gp.setsReps.split('×')[0]) : 3;
  const reps = gp ? parseInt(gp.setsReps.split('×')[1]) : 8;
  const rest = gp ? parseInt(gp.rest) : 90;

  const exercises = extras.slice(0, duration <= 45 ? 2 : 3).map(id => {
    const ref = STRENGTH_LIBRARY[id];
    if (!ref) return null;
    return {
      name: ref.name, sets, reps, load: ref.load_default || 'BW',
      rest, rpe: 7, heart_rate_zone: 'Zone4',
      cue_points: ref.cue_points || [],
      image_url: (ref as any).image_url,
      progression: '根据RPE逐步进阶',
    };
  }).filter(Boolean);

  if (exercises.length === 0) return null;

  return {
    module: 'ability_training',
    title: '补充能力训练（离线）',
    exercises: exercises as any,
    status: 'complete',
  };
}
