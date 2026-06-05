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
  profile: FitnessProfile
): PositionTraining {
  const pos = position || DEFAULT_POSITION;
  const posEx = POSITION_EXERCISES[pos] || POSITION_EXERCISES[DEFAULT_POSITION];

  const warmupIds = combo?.warmup_ids?.length
    ? combo.warmup_ids
    : ['warm-light-jog', 'warm-dynamic-stretch', 'warm-ball-touch'];
  const warmup = warmupIds
    .map(assembleWarmup)
    .filter((x): x is NonNullable<typeof x> => x != null);

  const upperIds = combo?.upper_ids?.length ? combo.upper_ids : posEx.upper.slice(0, 3);
  const upperLimb: Exercise[] = upperIds
    .map(id => assembleExercise(id, phase, goal, profile))
    .filter((x): x is NonNullable<typeof x> => x != null);

  const lowerIds = combo?.lower_ids?.length ? combo.lower_ids : posEx.lower.slice(0, 3);
  const lowerLimb: Exercise[] = lowerIds
    .map(id => assembleExercise(id, phase, goal, profile))
    .filter((x): x is NonNullable<typeof x> => x != null);

  const coreIds = combo?.core_ids?.length ? combo.core_ids : posEx.core.slice(0, 2);
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
  const pt = buildPositionTraining(combo, phase, goal, position, profile);
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
