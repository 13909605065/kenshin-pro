/**
 * Plan Validator — deterministic plan validation engine
 *
 * Validates AI output against the offline knowledge base:
 *   1. combo_id → scene-combo-map lookup
 *   2. exercise_ids → library existence check
 *   3. Injury + contraindication filtering
 *   4. Quality scoring (0-100)
 *
 * "真理源" — AI 选型错误时自动覆盖。
 */

import type { SeasonPhase, Position } from './types';
import { ATHLETE_COMBOS, STRENGTH_LIBRARY, WARMUP_LIBRARY, POSITION_EXERCISES, GOAL_EXTRAS, resolveCombo } from './training-library';
import { getComboTarget, validateAICombo } from './scene-combo-map';

// ═══════════════════════════════════════════════
// PUBLIC INTERFACES
// ═══════════════════════════════════════════════

export interface ValidationInput {
  aiComboId: string | null;
  aiExerciseIds: string[];
  scene: string;
  goal: string;
  phase: string; // SeasonPhase
  position?: string | null;
  injuries: string[]; // e.g. ['膝', '腘绳肌']
  disabledExercises: string[];
  playerCount: number;
}

export interface ValidationResult {
  valid: boolean;
  finalComboId: string | null;
  finalExerciseIds: string[];
  score: number; // 0-100
  replacements: { original: string; replaced: string; reason: string }[];
  warnings: string[];
  bookSources: string[];
  missingBooks: string[];
}

interface ScoredReplacement {
  original: string;
  replaced: string;
  reason: string;
}

// ═══════════════════════════════════════════════
// INJURY NAME MAPPING (Chinese → English contraindication keys)
// ═══════════════════════════════════════════════

const INJURY_CN_TO_EN: Record<string, string[]> = {
  '膝': ['knee'],
  '膝盖': ['knee'],
  '膝关节': ['knee'],
  '腘绳肌': ['hamstring'],
  '大腿后侧': ['hamstring'],
  '踝': ['ankle'],
  '脚踝': ['ankle'],
  '跟腱': ['achilles'],
  '腰': ['waist'],
  '下背': ['waist'],
  '腰部': ['waist'],
  '大腿': ['thigh'],
  '髋': ['hip'],
  '髋关节': ['hip'],
  '手指': ['finger'],
  '手腕': ['wrist'],
  '肩': ['shoulder'],
  '肩膀': ['shoulder'],
  '肩关节': ['shoulder'],
  '肘': ['elbow'],
  '肘关节': ['elbow'],
};

/**
 * Map user-facing Chinese injury names to library contraindication keys.
 */
function mapInjuriesToContraindications(injuries: string[]): string[] {
  const keys = new Set<string>();
  for (const inj of injuries) {
    const mapped = INJURY_CN_TO_EN[inj];
    if (mapped) {
      for (const k of mapped) keys.add(k);
    } else {
      // Unknown injury name — assume it maps directly (might be English already)
      keys.add(inj.toLowerCase());
    }
  }
  return Array.from(keys);
}

// ═══════════════════════════════════════════════
// EXERCISE REPLACEMENT HELPERS
// ═══════════════════════════════════════════════

/**
 * Get all safe candidate exercise IDs for a given position and goal,
 * excluding injury-contraindicated and already-used exercises.
 */
function getSafeCandidates(
  position: string | null | undefined,
  goal: string,
  contraKeys: string[],
  alreadyUsed: string[],
  disabledIds: string[]
): string[] {
  const pos = position || 'midfielder';
  const posEx = POSITION_EXERCISES[pos] || POSITION_EXERCISES.midfielder;
  const goalExtras = GOAL_EXTRAS[goal] || [];

  // Collect all candidate IDs from position pools + goal extras
  const allCandidates = [
    ...posEx.upper,
    ...posEx.lower,
    ...posEx.core,
    ...goalExtras,
  ];

  // Uniquify
  const unique = Array.from(new Set(allCandidates));

  return unique.filter(id => {
    // Must exist in library
    const ex = STRENGTH_LIBRARY[id];
    if (!ex) return false;

    // Not already in use
    if (alreadyUsed.includes(id)) return false;

    // Not disabled
    if (disabledIds.includes(id)) return false;

    // No injury contraindication overlap
    if (ex.injury_contraindications) {
      const overlap = ex.injury_contraindications.some(c => contraKeys.includes(c));
      if (overlap) return false;
    }

    return true;
  });
}

/**
 * Find a replacement exercise for an invalid/contraindicated ID.
 */
function findReplacement(
  invalidId: string,
  position: string | null | undefined,
  goal: string,
  contraKeys: string[],
  alreadyUsed: string[],
  disabledIds: string[]
): string | null {
  const candidates = getSafeCandidates(position, goal, contraKeys, alreadyUsed, disabledIds);

  if (candidates.length === 0) {
    // Ultimate fallback: bodyweight exercises that are generally safe
    const safeDefaults = ['ex-plank', 'ex-dead-bug', 'ex-bird-dog', 'ex-glute-bridge'];
    const fallback = safeDefaults.find(id =>
      STRENGTH_LIBRARY[id] &&
      !alreadyUsed.includes(id) &&
      !disabledIds.includes(id)
    );
    return fallback || 'ex-plank';
  }

  return candidates[0];
}

/**
 * Check if an exercise is contraindicated for the given injury keys.
 */
function isContraindicated(exerciseId: string, contraKeys: string[]): boolean {
  const ex = STRENGTH_LIBRARY[exerciseId];
  if (!ex || !ex.injury_contraindications) return false;
  return ex.injury_contraindications.some(c => contraKeys.includes(c));
}

/**
 * Get the reason string for why an exercise was replaced due to injury.
 */
function getContraindicationReason(exerciseId: string, contraKeys: string[]): string {
  const ex = STRENGTH_LIBRARY[exerciseId];
  if (!ex || !ex.injury_contraindications) return '';
  const matched = ex.injury_contraindications.filter(c => contraKeys.includes(c));
  return `动作"${ex.name}"禁忌部位: ${matched.join(', ')}`;
}

// ═══════════════════════════════════════════════
// SCORING ENGINE
// ═══════════════════════════════════════════════

interface ScoreInput {
  comboValid: boolean;
  comboConfidence: number;
  originalExerciseCount: number;
  injuryReplacementCount: number;
  finalExerciseIds: string[];
  position: string | null | undefined;
  phase: SeasonPhase;
}

function calculateScore(input: ScoreInput): number {
  let score = 0;

  // 1. Combo match (40%)
  const comboScore = input.comboValid ? 40 : Math.round(input.comboConfidence * 40);
  score += comboScore;

  // 2. Injury exclusion (25%)
  // Penalize if AI originally included contraindicated exercises
  if (input.originalExerciseCount > 0) {
    const cleanRatio = 1 - (input.injuryReplacementCount / input.originalExerciseCount);
    score += Math.round(cleanRatio * 25);
  } else {
    score += 25; // No exercises = no injury issues
  }

  // 3. Position fit (20%)
  // What fraction of final exercises belong to the position's exercise pool?
  if (input.finalExerciseIds.length > 0) {
    const pos = input.position || 'midfielder';
    const posEx = POSITION_EXERCISES[pos] || POSITION_EXERCISES.midfielder;
    const posPool = new Set([...posEx.upper, ...posEx.lower, ...posEx.core]);
    const matchCount = input.finalExerciseIds.filter(id => posPool.has(id)).length;
    score += Math.round((matchCount / input.finalExerciseIds.length) * 20);
  } else {
    score += 20; // No exercises to check
  }

  // 4. Phase fit (15%)
  // What fraction of final exercises have periodization guidance for this phase?
  if (input.finalExerciseIds.length > 0) {
    const phaseMatch = input.finalExerciseIds.filter(id => {
      const ex = STRENGTH_LIBRARY[id];
      return ex?.periodization && (ex.periodization as Record<string, string>)[input.phase];
    }).length;
    score += Math.round((phaseMatch / input.finalExerciseIds.length) * 15);
  } else {
    score += 15; // No exercises to check
  }

  return Math.min(100, Math.max(0, score));
}

// ═══════════════════════════════════════════════
// CORE VALIDATION FUNCTION
// ═══════════════════════════════════════════════

/**
 * Validate a training plan against the deterministic knowledge base.
 *
 * Checks:
 *   1. Combo ID correctness (via scene-combo-map)
 *   2. Exercise ID existence in libraries
 *   3. Injury contraindication filtering
 *   4. Quality scoring
 *
 * Returns a validated result with corrected IDs, score, and diagnostic info.
 */
export function validatePlan(input: ValidationInput): ValidationResult {
  const replacements: ScoredReplacement[] = [];
  const warnings: string[] = [];
  const bookSources: string[] = [];
  const missingBooks: string[] = [];

  const phase = input.phase as SeasonPhase;
  const position = input.position as Position | null;

  // ── 1. Validate combo_id ──
  const comboValidation = validateAICombo(
    input.aiComboId,
    input.scene,
    input.goal,
    phase,
    position
  );

  const target = getComboTarget(input.scene, input.goal, phase, position);

  // Determine final combo ID
  let finalComboId: string | null;
  if (comboValidation.shouldOverride) {
    finalComboId = comboValidation.recommended;
    if (input.aiComboId && input.aiComboId !== finalComboId) {
      replacements.push({
        original: input.aiComboId,
        replaced: finalComboId || '(null)',
        reason: comboValidation.reason,
      });
    } else if (!input.aiComboId && finalComboId) {
      warnings.push(`AI未返回combo_id，使用映射表推荐: ${finalComboId}`);
    }
  } else {
    finalComboId = input.aiComboId;
  }

  // Verify final combo exists in ATHLETE_COMBOS
  if (finalComboId && !ATHLETE_COMBOS[finalComboId]) {
    warnings.push(`combo_id "${finalComboId}" 不在ATHLETE_COMBOS中，将使用位置默认练习`);
    // Try to find alternative via scene-combo-map fallback
    if (target.fallbackComboId && ATHLETE_COMBOS[target.fallbackComboId]) {
      finalComboId = target.fallbackComboId;
      warnings.push(`已回退到备用combo: ${finalComboId}`);
    } else {
      finalComboId = null;
      warnings.push('无可用的combo，将使用POSITION_EXERCISES默认值');
    }
  }

  // Collect book sources
  if (target.bookSource && !target.bookSource.startsWith('缺书')) {
    bookSources.push(target.bookSource);
  }
  if (target.bookSource && target.bookSource.startsWith('缺书')) {
    missingBooks.push(target.bookSource);
  }

  // ── 2. Map injury names to contraindication keys ──
  const contraKeys = mapInjuriesToContraindications(input.injuries);

  // ── 3. Validate & filter exercise_ids ──
  let finalExerciseIds: string[] = [];
  let injuryReplacementCount = 0;
  let libraryMissingCount = 0;

  const allLibraries: Set<string> = new Set([
    ...Object.keys(STRENGTH_LIBRARY),
    ...Object.keys(WARMUP_LIBRARY),
  ]);

  for (const id of input.aiExerciseIds) {
    let currentId = id;

    // Check: is it in the disabled list?
    if (input.disabledExercises.includes(id)) {
      const replacement = findReplacement(id, position, input.goal, contraKeys, finalExerciseIds, input.disabledExercises);
      if (replacement) {
        replacements.push({ original: id, replaced: replacement, reason: `动作"${id}"在禁用列表中` });
        currentId = replacement;
      } else {
        warnings.push(`禁用动作"${id}"无法找到替代，已跳过`);
        continue;
      }
    }

    // Check: does it exist in the library?
    if (!allLibraries.has(currentId)) {
      libraryMissingCount++;
      const replacement = findReplacement(currentId, position, input.goal, contraKeys, finalExerciseIds, input.disabledExercises);
      if (replacement) {
        replacements.push({ original: id, replaced: replacement, reason: `ID "${currentId}" 不在动作库中` });
        currentId = replacement;
      } else {
        warnings.push(`无效ID "${currentId}" 无法找到替代，已跳过`);
        continue;
      }
    }

    // Check: injury contraindication (only for STRENGTH_LIBRARY)
    if (isContraindicated(currentId, contraKeys)) {
      injuryReplacementCount++;
      const reason = getContraindicationReason(currentId, contraKeys);
      const replacement = findReplacement(currentId, position, input.goal, contraKeys, finalExerciseIds, input.disabledExercises);
      if (replacement && replacement !== currentId) {
        replacements.push({ original: id, replaced: replacement, reason });
        currentId = replacement;
      } else {
        warnings.push(`动作"${currentId}"有伤病禁忌但无法找到安全替代，已保留（请教练确认）`);
      }
    }

    // Avoid duplicates
    if (!finalExerciseIds.includes(currentId)) {
      finalExerciseIds.push(currentId);
    }
  }

  // If no exercises after filtering, add safe defaults from position pool
  if (finalExerciseIds.length === 0 && input.aiExerciseIds.length > 0) {
    const safeDefaults = getSafeCandidates(position, input.goal, contraKeys, [], input.disabledExercises);
    const picked = safeDefaults.slice(0, Math.min(3, safeDefaults.length));
    for (const sid of picked) {
      replacements.push({ original: '(none)', replaced: sid, reason: '所有输入动作被过滤，使用安全默认值' });
      finalExerciseIds.push(sid);
    }
  }

  // ── 4. Score ──
  const score = calculateScore({
    comboValid: comboValidation.valid,
    comboConfidence: comboValidation.score / 100,
    originalExerciseCount: input.aiExerciseIds.length,
    injuryReplacementCount,
    finalExerciseIds,
    position,
    phase,
  });

  // ── 5. Determine overall validity ──
  const valid = comboValidation.valid && libraryMissingCount === 0;

  // Additional warnings
  if (finalComboId && comboValidation.score < 50) {
    warnings.push(`Combo匹配置信度较低 (${Math.round(comboValidation.score)}%)，建议复核`);
  }
  if (libraryMissingCount > 0) {
    warnings.push(`${libraryMissingCount}个AI动作ID不在动作库中，已自动替换`);
  }
  if (contraKeys.length > 0 && injuryReplacementCount > 0) {
    warnings.push(`已过滤${injuryReplacementCount}个伤病禁忌动作`);
  }

  return {
    valid,
    finalComboId,
    finalExerciseIds,
    score,
    replacements,
    warnings,
    bookSources,
    missingBooks,
  };
}
