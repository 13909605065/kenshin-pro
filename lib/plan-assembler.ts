/**
 * Plan Assembler — fills all parameters from the book-based periodization library
 *
 * Takes a validated combo_id + exercise_ids and produces complete TrainingModule[].
 * All sets/reps/load/rest values come ONLY from periodization.ts tables, never invented.
 *
 * Book sources:
 *   - Periodization parameters: NSCA-CSCS第4版 (periodization.ts)
 *   - Exercise data: training-library.ts (NSCA / Routledge / Soccer Anatomy)
 *   - Combo structures: ATHLETE_COMBOS (training-library.ts)
 */

import type {
  TrainingModule,
  PositionTraining,
  PhasePlan,
  Exercise,
  WarmupItem,
  SeasonPhase,
  AbilityExercise,
  AbilityTraining,
  NutritionInfo,
} from './types';
import type { FitnessProfile } from './fitness-store';
import type { ValidationResult } from './plan-validator';
import {
  ATHLETE_COMBOS,
  resolveCombo,
  STRENGTH_LIBRARY,
  WARMUP_LIBRARY,
  COOLDOWN_LIBRARY,
  POSITION_EXERCISES,
  NUTRITION_TEMPLATES,
  PHASE_TEMPLATES,
  type AthleteCombo,
  type ExerciseRef,
} from './training-library';
import { getPhaseParams, getGoalParams } from './periodization';

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const BOOK_PERIODIZATION = 'NSCA-CSCS第4版';
const BOOK_COMBO = 'ATHLETE_COMBOS (training-library.ts)';
const DEFAULT_POSITION = 'midfielder';

// ═══════════════════════════════════════════════
// SCENE-AWARE EXERCISE FILTERING
// ═══════════════════════════════════════════════

/** Exercise IDs that are NOT safe for pitch (require gym equipment) */
const PITCH_UNSAFE_PATTERNS = [
  /^ex-back-squat/, /^ex-front-squat/, /^ex-deadlift/, /^ex-trap-bar-deadlift/,
  /^ex-romanian-dl/, /^ex-bench-press/, /^ex-standing-press/, /^ex-barbell-row/,
  /^ex-power-clean/, /^ex-hang-clean/, /^ex-dumbbell-/, /^ex-cable-/,
  /^ex-sus-/, /^ex-leg-press/, /^ex-hanging-leg-raise/, /^ex-face-pull/,
  /^ex-hip-thrust/, /^ex-hamstring-curl/, /^ex-lat-pulldown/, /^ex-chest-fly/,
  /^ex-tricep-/, /^ex-bicep-/, /^ex-skull-crusher/,
];

/** Pitch-safe replacement IDs — bodyweight/band/ball only */
const PITCH_SAFE_IDS: Record<string, string[]> = {
  upper: ['ex-pushup', 'ex-band-row', 'ex-mb-chest-pass'],
  lower: ['ex-bulgarian-split-squat', 'ex-nordic-hamstring', 'ex-single-leg-rdl', 'ex-glute-bridge', 'ex-box-jump'],
  core: ['ex-plank', 'ex-dead-bug', 'ex-bird-dog', 'ex-side-plank'],
  ability: ['ex-sprint-start', 'ex-pro-agility', 'ex-hurdle-jump', 'ex-sled-sprint'],
};

function isPitchUnsafe(exerciseId: string): boolean {
  return PITCH_UNSAFE_PATTERNS.some(p => p.test(exerciseId));
}

function findPitchSafeReplacement(
  _unsafeId: string,
  category: 'upper' | 'lower' | 'core' | 'ability',
  alreadyUsed: Set<string>
): string | null {
  const candidates = PITCH_SAFE_IDS[category] || [];
  const available = candidates.filter(id =>
    STRENGTH_LIBRARY[id] && !alreadyUsed.has(id)
  );
  return available[0] || null;
}

/** Filter exercises for pitch scene: replace gym-only exercises with bodyweight alternatives */
function filterExercisesForScene(
  ids: string[],
  scene: string,
  alreadyUsed: Set<string>
): string[] {
  if (scene !== 'pitch') return ids;
  const result: string[] = [];
  for (const id of ids) {
    if (isPitchUnsafe(id)) {
      // Find category by checking which map key matches
      const cat = PITCH_SAFE_IDS.upper.includes(id) ? 'upper' :
                  PITCH_SAFE_IDS.lower.includes(id) ? 'lower' :
                  PITCH_SAFE_IDS.core.includes(id) ? 'core' : 'ability';
      const replacement = findPitchSafeReplacement(id, cat, alreadyUsed);
      if (replacement && !alreadyUsed.has(replacement)) {
        result.push(replacement);
        alreadyUsed.add(replacement);
      }
      // If no replacement found, skip the exercise (don't send barbell to pitch)
    } else {
      result.push(id);
      alreadyUsed.add(id);
    }
  }
  return result;
}

// ═══════════════════════════════════════════════
// PARAMETER COMPUTATION (periodization.ts ONLY)
// ═══════════════════════════════════════════════

/**
 * Compute sets count for an exercise.
 * Source: getPhaseParams(phase).setsRange blended with getGoalParams(goal).setsReps.
 */
function computeSets(ref: ExerciseRef, phase: SeasonPhase, goal: string): number {
  const pp = getPhaseParams(phase);
  const gp = getGoalParams(goal);

  let sets = Math.round((pp.setsRange[0] + pp.setsRange[1]) / 2);

  if (gp) {
    const m = gp.setsReps.match(/^(\d+)-(\d+)/);
    if (m) {
      const goalMid = Math.round((+m[1] + +m[2]) / 2);
      sets = Math.max(pp.setsRange[0], Math.min(pp.setsRange[1], goalMid));
    }
  }

  return Math.max(ref.sets[0], Math.min(ref.sets[1], sets));
}

/**
 * Compute reps count for an exercise.
 * Source: getPhaseParams(phase).repsRange blended with getGoalParams(goal).setsReps.
 */
function computeReps(ref: ExerciseRef, phase: SeasonPhase, goal: string): number {
  const pp = getPhaseParams(phase);
  const gp = getGoalParams(goal);

  let reps = Math.round((pp.repsRange[0] + pp.repsRange[1]) / 2);

  if (gp) {
    const m = gp.setsReps.match(/×(\d+)-(\d+)$/);
    if (m) {
      const goalMid = Math.round((+m[1] + +m[2]) / 2);
      reps = Math.max(pp.repsRange[0], Math.min(pp.repsRange[1], goalMid));
    }
  }

  return Math.max(ref.reps[0], Math.min(ref.reps[1], reps));
}

/**
 * Compute rest interval in seconds.
 * Source: getPhaseParams(phase).restBetweenSets blended with getGoalParams(goal).rest.
 */
function computeRest(_ref: ExerciseRef, phase: SeasonPhase, goal: string): number {
  const pp = getPhaseParams(phase);
  const gp = getGoalParams(goal);

  let rest = Math.round((pp.restBetweenSets[0] + pp.restBetweenSets[1]) / 2);

  if (gp) {
    const parts = gp.rest.split('-').map(s => parseInt(s, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      rest = Math.round((parts[0] * 60 + parts[1] * 60) / 2);
    } else if (parts.length === 1 && !isNaN(parts[0])) {
      rest = parts[0] * 60;
    }
    rest = Math.max(30, Math.min(300, rest));
  }

  return rest;
}

/**
 * Compute load string.
 * If 1RM data is available in fitness profile, produce absolute kg + percentage.
 * Otherwise, use the percent range from periodization tables.
 * Source: getPhaseParams(phase).intensityPercent + getGoalParams(goal).percent1RM.
 */
function computeLoad(
  ref: ExerciseRef,
  phase: SeasonPhase,
  goal: string,
  profile: FitnessProfile
): string {
  const pp = getPhaseParams(phase);
  const gp = getGoalParams(goal);

  let pctMin: number;
  let pctMax: number;
  if (gp && gp.percent1RM[1] > 0) {
    pctMin = gp.percent1RM[0];
    pctMax = gp.percent1RM[1];
  } else {
    pctMin = pp.intensityPercent[0];
    pctMax = pp.intensityPercent[1];
  }
  const pctMid = Math.round((pctMin + pctMax) / 2);

  const rm1 = get1RMForExercise(ref.id, profile);
  if (rm1 && pctMid > 0) {
    const abs = Math.round(rm1 * pctMid / 100);
    return `${abs}kg (${pctMid}% 1RM)`;
  }

  if (ref.load_default && ref.load_default.includes('%')) {
    return `${pctMin}-${pctMax}% 1RM`;
  }
  return ref.load_default || `${pctMin}-${pctMax}% 1RM`;
}

/**
 * Map an exercise ID to the most relevant 1RM metric from the fitness profile.
 */
function get1RMForExercise(exerciseId: string, profile: FitnessProfile): number | null {
  if (/squat|split|lunge|bulgarian|pistol|thruster|goblet|sumo/.test(exerciseId)) {
    return profile.squat1RM || null;
  }
  if (/bench|press|push|tricep|dip|skull/.test(exerciseId)) {
    return profile.bench1RM || null;
  }
  if (/deadlift|rdl|romanian|hinge|pull/i.test(exerciseId)) {
    return profile.deadlift1RM || null;
  }
  if (/clean|snatch|jerk/.test(exerciseId)) {
    return profile.powerClean1RM || null;
  }
  if (/thrust|bridge|hip/.test(exerciseId)) {
    return profile.squat1RM || null;
  }
  return null;
}

// ═══════════════════════════════════════════════
// EXERCISE ASSEMBLY
// ═══════════════════════════════════════════════

/**
 * Assemble a fully-parameterized Exercise from library + periodization data.
 * Every field is sourced from a book table, never invented.
 */
function assembleExercise(
  id: string,
  phase: SeasonPhase,
  goal: string,
  profile: FitnessProfile
): (Exercise & { bookSource: string }) | null {
  const ref = STRENGTH_LIBRARY[id];
  if (!ref) return null;

  const sets = computeSets(ref, phase, goal);
  const reps = computeReps(ref, phase, goal);
  const load = computeLoad(ref, phase, goal, profile);
  const rest = computeRest(ref, phase, goal);

  let src = `${BOOK_PERIODIZATION} → ${ref.name}`;
  if (ref.periodization && (ref.periodization as Record<string, string>)[phase]) {
    src = `${BOOK_PERIODIZATION} (exercise periodization) → ${ref.name}`;
  }

  return {
    name: ref.name,
    sets,
    reps,
    load,
    rest,
    rpe: ref.rpe,
    heart_rate_zone: ref.heart_rate_zone,
    image_url: ref.image_url,
    cue_points: ref.cue_points,
    bookSource: src,
  } as Exercise & { bookSource: string };
}

/**
 * Assemble a warmup item from the warmup library.
 */
function assembleWarmup(id: string): (WarmupItem & { bookSource: string }) | null {
  const w = WARMUP_LIBRARY[id];
  if (!w) return null;
  return {
    name: w.name,
    duration: w.duration,
    description: w.description,
    category: w.category,
    bookSource: `${BOOK_COMBO} → warmup: ${w.name}`,
  } as WarmupItem & { bookSource: string };
}

/**
 * Assemble a cooldown item from the cooldown library.
 */
function assembleCooldown(id: string): (WarmupItem & { bookSource: string }) | null {
  const c = COOLDOWN_LIBRARY[id];
  if (!c) return null;
  return {
    name: c.name,
    duration: c.duration,
    description: c.description,
    category: 'no_ball' as const,
    bookSource: `${BOOK_COMBO} → cooldown: ${c.name}`,
  } as WarmupItem & { bookSource: string };
}

// ═══════════════════════════════════════════════
// MODULE BUILDERS
// ═══════════════════════════════════════════════

function buildPositionTraining(
  combo: AthleteCombo | null,
  phase: SeasonPhase,
  goal: string,
  position: string | null | undefined,
  profile: FitnessProfile,
  scene: string
): PositionTraining {
  const pos = position || DEFAULT_POSITION;
  const posEx = POSITION_EXERCISES[pos] || POSITION_EXERCISES[DEFAULT_POSITION];

  const usedIds = new Set<string>();

  const warmupIds = combo?.warmup_ids?.length
    ? combo.warmup_ids
    : ['warm-light-jog', 'warm-dynamic-stretch', 'warm-ball-touch'];
  const warmup = warmupIds
    .map(assembleWarmup)
    .filter((x): x is NonNullable<typeof x> => x != null);

  const rawUpperIds = combo?.upper_ids?.length ? combo.upper_ids : posEx.upper.slice(0, 3);
  const upperIds = filterExercisesForScene(rawUpperIds, scene, usedIds);
  const upperLimb: Exercise[] = upperIds
    .map(id => assembleExercise(id, phase, goal, profile))
    .filter((x): x is NonNullable<typeof x> => x != null);

  const rawLowerIds = combo?.lower_ids?.length ? combo.lower_ids : posEx.lower.slice(0, 3);
  const lowerIds = filterExercisesForScene(rawLowerIds, scene, usedIds);
  const lowerLimb: Exercise[] = lowerIds
    .map(id => assembleExercise(id, phase, goal, profile))
    .filter((x): x is NonNullable<typeof x> => x != null);

  const rawCoreIds = combo?.core_ids?.length ? combo.core_ids : posEx.core.slice(0, 2);
  const coreIds = filterExercisesForScene(rawCoreIds, scene, usedIds);
  const core: Exercise[] = coreIds
    .map(id => assembleExercise(id, phase, goal, profile))
    .filter((x): x is NonNullable<typeof x> => x != null);

  const cooldownIds = combo?.cooldown_ids?.length
    ? combo.cooldown_ids
    : ['cool-static-stretch', 'cool-foam-roll'];
  const cooldown = cooldownIds
    .map(assembleCooldown)
    .filter((x): x is NonNullable<typeof x> => x != null);

  const nutritionGoal = combo?.nutrition_goal || goal || 'default';
  const nutrition: NutritionInfo =
    NUTRITION_TEMPLATES[nutritionGoal] || NUTRITION_TEMPLATES.default;

  const pp = getPhaseParams(phase);
  const comboLabel = combo?.label || '';
  const title = comboLabel
    ? `${comboLabel} · ${pp.labelCn} · ${goal}`
    : `${pos} · ${goal} · ${pp.labelCn}`;

  const gp = getGoalParams(goal);
  const parts: string[] = [];
  if (pp) parts.push(`${pp.labelCn}: ${pp.intensityPercent[0]}-${pp.intensityPercent[1]}%1RM, ${pp.setsRange[0]}-${pp.setsRange[1]}组×${pp.repsRange[0]}-${pp.repsRange[1]}次, 间歇${pp.restBetweenSets[0]}-${pp.restBetweenSets[1]}s`);
  if (gp) parts.push(`目标: ${gp.labelCn} (${gp.percent1RM[0]}-${gp.percent1RM[1]}%1RM, ${gp.setsReps}, 间歇${gp.rest})`);
  parts.push(`策略: ${pp.variationStrategy}`);

  return {
    module: 'position_training',
    title,
    analysis: parts.join(' | '),
    warmup,
    upper_limb: upperLimb,
    lower_limb: lowerLimb,
    core,
    cooldown,
    nutrition,
    status: 'complete',
  };
}

function buildAbilityTraining(
  validatedIds: string[],
  phase: SeasonPhase,
  goal: string,
  profile: FitnessProfile,
  usedIds: Set<string>
): AbilityTraining | null {
  const uniqueIds = validatedIds.filter(id => !usedIds.has(id));
  if (uniqueIds.length === 0) return null;

  const pp = getPhaseParams(phase);

  const exercises: AbilityExercise[] = uniqueIds
    .map(id => {
      const ref = STRENGTH_LIBRARY[id];
      if (!ref) return null;
      const sets = computeSets(ref, phase, goal);
      const reps = computeReps(ref, phase, goal);
      const rest = computeRest(ref, phase, goal);
      return {
        name: ref.name,
        sets,
        reps,
        load: computeLoad(ref, phase, goal, profile),
        rest,
        rpe: ref.rpe,
        heart_rate_zone: ref.heart_rate_zone,
        image_url: ref.image_url,
        cue_points: ref.cue_points,
        progression: ref.progression || '根据RPE逐步进阶',
      } as AbilityExercise;
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  if (exercises.length === 0) return null;

  return {
    module: 'ability_training',
    title: `补充能力训练 · ${pp.labelCn}`,
    exercises,
    status: 'complete',
  };
}

function buildPhasePlan(phase: SeasonPhase): PhasePlan {
  const template = PHASE_TEMPLATES[phase] || PHASE_TEMPLATES.competition;
  return {
    module: 'phase_plan',
    title: template.title,
    weekly_frequency: template.weekly_frequency,
    session_duration: template.session_duration,
    intensity_distribution: template.intensity_distribution,
    recovery_strategy: `${template.recovery_strategy} | 来源: ${BOOK_PERIODIZATION}`,
    status: 'complete',
  };
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

/**
 * Assemble a complete training plan from validated combo + exercises.
 *
 * Takes the ValidationResult from plan-validator.ts and fills ALL parameters
 * from the book-based periodization library. No values are invented — everything
 * comes from deterministic lookup tables in periodization.ts and training-library.ts.
 *
 * @param validation  Result from validatePlan() in plan-validator.ts
 * @param profile     Athlete fitness test data (1RM, speed, endurance, etc.)
 * @param phase       Season phase for periodization lookup
 * @param goal        Training goal for periodization lookup
 * @param scene       Training scene ('gym' | 'pitch')
 * @param position    Player position (optional; defaults to 'midfielder')
 * @returns           Complete TrainingModule[] ready for rendering
 */
export function assemblePlan(
  validation: ValidationResult,
  profile: FitnessProfile,
  phase: SeasonPhase,
  goal: string,
  scene: string,
  position?: string | null
): TrainingModule[] {
  const modules: TrainingModule[] = [];

  // ── 1. Resolve combo ──
  const combo = validation.finalComboId ? resolveCombo(validation.finalComboId) : null;

  // ── 2. Position Training module ──
  const pt = buildPositionTraining(combo, phase, goal, position, profile, scene);
  modules.push(pt);

  // ── 3. Ability Training module (from validated exercise IDs, excluding already-used) ──
  const usedInPosition = new Set([
    ...(combo?.upper_ids || []),
    ...(combo?.lower_ids || []),
    ...(combo?.core_ids || []),
  ]);
  const allAbilityIds = Array.from(new Set([
    ...(combo?.ability_ids || []),
    ...validation.finalExerciseIds,
  ]));
  const at = buildAbilityTraining(allAbilityIds, phase, goal, profile, usedInPosition);
  if (at) {
    modules.push(at);
  }

  // ── 4. Phase Plan module ──
  modules.push(buildPhasePlan(phase));

  return modules;
}

/**
 * Quick check: does it make sense to use the assembler for this scene+goal?
 */
export function shouldUseAssembler(scene: string, _goal: string): boolean {
  if (scene === 'rehab') return false;
  return true;
}

// ═══════════════════════════════════════════════
// COACH SESSION PLAN — 分钟级时间轴训练课教案
// ═══════════════════════════════════════════════

import type { SessionPlan, SessionActivity, SSGInfo } from './types';

/**
 * Build a minute-by-minute training session plan from a validated combo.
 * This is what the head coach can hold and execute on the pitch.
 */
export function buildCoachSessionPlan(
  combo: AthleteCombo | null,
  phase: SeasonPhase,
  goal: string,
  scene: string,
  position: string | null | undefined,
  playerCount: number,
  duration: number
): SessionPlan {
  const pos = position || 'midfielder';
  const pp = getPhaseParams(phase);
  const gp = getGoalParams(goal);
  const sceneLabel = scene === 'gym' ? '力量房' : '外场';
  const goalLabel = gp?.labelCn || goal;

  let elapsed = 0;
  const usedIds = new Set<string>();

  // ── WARMUP (15-18% of total) ──
  const warmupMins = Math.min(20, Math.round(duration * 0.18));
  const warmupIds = combo?.warmup_ids?.slice(0, 5) || ['warm-hip-open', 'warm-glute-activation', 'warm-dynamic-stretch', 'warm-plank-series', 'warm-nordic-curl'];
  const warmup = warmupIds.map(id => {
    const w = WARMUP_LIBRARY[id];
    return { name: w?.name || id, duration: w?.duration || 3, description: w?.description || '', category: (w?.category || 'no_ball') as 'no_ball' | 'with_ball' };
  });
  elapsed += warmupMins;

  // ── MAIN ACTIVITIES ──
  const remaining = duration - elapsed - Math.round(duration * 0.1);
  const mainMins = Math.round(remaining * 0.70);

  const activities: SessionActivity[] = [];
  const defaultActivity = (name: string, dur: number, desc: string, progs: string[], regs: string[]): SessionActivity => ({
    name, duration: dur,
    area: scene === 'pitch' ? '半场' : '力量房',
    groups: `${playerCount}人轮换`,
    description: desc,
    coaching_points: progs,
    progression: progs[0] || '',
    regression: regs[0] || '',
  });

  // Lower body block
  const rawLowerIds = combo?.lower_ids?.slice(0, 3) || [];
  const lowerIds = filterExercisesForScene(rawLowerIds, scene, usedIds);
  if (lowerIds.length > 0) {
    const descParts = lowerIds.map(id => {
      const ref = STRENGTH_LIBRARY[id];
      const e = ref ? assembleExercise(id, phase, goal, {} as FitnessProfile) : null;
      return e ? `${e.name} ${e.sets}×${e.reps} @${e.load} 间歇${e.rest}s` : id;
    });
    const cueParts = lowerIds.map(id => {
      const ref = STRENGTH_LIBRARY[id];
      return ref?.cue_points?.[0] || '';
    }).filter(Boolean);
    activities.push(defaultActivity(
      '下肢力量', Math.round(mainMins * 0.4),
      descParts.join(' | '),
      cueParts.length > 0 ? cueParts : ['控制离心3-5s', '保持核心稳定'],
      ['降负荷20%', '减少组数1组']
    ));
  }

  // Upper body block
  const rawUpperIds = combo?.upper_ids?.slice(0, 2) || [];
  const upperIds = filterExercisesForScene(rawUpperIds, scene, usedIds);
  if (upperIds.length > 0) {
    const descParts = upperIds.map(id => {
      const ref = STRENGTH_LIBRARY[id];
      const e = ref ? assembleExercise(id, phase, goal, {} as FitnessProfile) : null;
      return e ? `${e.name} ${e.sets}×${e.reps} @${e.load}` : id;
    });
    const cueParts = upperIds.map(id => {
      const ref = STRENGTH_LIBRARY[id];
      return ref?.cue_points?.[0] || '';
    }).filter(Boolean);
    activities.push(defaultActivity(
      '上肢力量', Math.round(mainMins * 0.25),
      descParts.join(' | '),
      cueParts.length > 0 ? cueParts : ['肩胛骨收紧', '控制节奏'],
      ['降负荷20%', '减少组数1组']
    ));
  }

  // Core block
  const rawCoreIds = combo?.core_ids?.slice(0, 2) || [];
  const coreIds = filterExercisesForScene(rawCoreIds, scene, usedIds);
  if (coreIds.length > 0) {
    const descParts = coreIds.map(id => {
      const ref = STRENGTH_LIBRARY[id];
      const e = ref ? assembleExercise(id, phase, goal, {} as FitnessProfile) : null;
      return e ? `${e.name} ${e.sets}×${e.reps}` : id;
    });
    const cueParts = coreIds.map(id => {
      const ref = STRENGTH_LIBRARY[id];
      return ref?.cue_points?.[0] || '';
    }).filter(Boolean);
    activities.push(defaultActivity(
      '核心训练', Math.round(mainMins * 0.2),
      descParts.join(' | '),
      cueParts.length > 0 ? cueParts : ['腹式呼吸', '骨盆中立位'],
      ['减少持续时间', '退阶到静态保持']
    ));
  }

  // Ability/conditioning
  const abilityMins = remaining - mainMins;
  if (abilityMins >= 5 && combo?.ability_ids?.length) {
    const rawAbility = filterExercisesForScene(combo.ability_ids.slice(0, 3), scene, usedIds);
    if (rawAbility.length > 0) {
      const descParts = rawAbility.map(id => {
        const ref = STRENGTH_LIBRARY[id];
        const e = ref ? assembleExercise(id, phase, goal, {} as FitnessProfile) : null;
        return e ? `${e.name} ${e.sets}×${e.reps}` : id;
      });
      activities.push(defaultActivity(
        '专项能力', abilityMins,
        descParts.join(' | '),
        ['全力执行', '保持技术质量'],
        ['降速10%', '增加间歇']
      ));
    }
  }

  elapsed += mainMins + abilityMins;

  // ── SSG (small-sided game) ──
  const isPitch = scene === 'pitch';
  const halfPlayers = Math.min(playerCount, 10);
  const ssg: SSGInfo = {
    id: 'ssg-session',
    name: isPitch ? `${halfPlayers}v${halfPlayers} 小场地` : '无SSG',
    focus: isPitch ? '攻防转换+体能维持' : '力量房无SSG',
    duration: isPitch ? Math.min(15, Math.round(duration * 0.12)) : 0,
    area: isPitch ? '30×20m' : '',
    players: isPitch ? `${halfPlayers}v${halfPlayers}` : '',
    rules: isPitch ? '2脚触球限制，自由轮转，进球即换人' : '',
    coaching_focus: isPitch ? ['攻防转换速度', '丢球后立即反抢', '快速决策'] : [],
  };

  // ── COOLDOWN ──
  const cooldownIds = combo?.cooldown_ids?.slice(0, 2) || ['cool-static-stretch', 'cool-foam-roll'];
  const cooldown = cooldownIds.map(id => {
    const c = COOLDOWN_LIBRARY[id];
    return { name: c?.name || id, duration: c?.duration || 5, description: c?.description || '', category: 'no_ball' as const };
  });

  // ── Equipment ──
  const equipment: string[] = scene === 'gym'
    ? ['杠铃', '哑铃', '药球', '跳箱', '弹力带', '泡沫轴']
    : ['标志盘', '锥桶', '分队背心', '足球', '弹力带', '泡沫轴'];

  return {
    module: 'session_plan',
    title: `${pos} · ${sceneLabel} · ${goalLabel} · ${pp.labelCn}`,
    duration,
    player_count: playerCount,
    equipment,
    warmup,
    activities,
    ssg,
    cooldown,
    status: 'complete',
  };
}
