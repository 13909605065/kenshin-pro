// Compare two training plans and check if they're too similar

interface ExerciseLike {
  id?: string;
  name?: string;
}

interface PlanModuleLike {
  upper_limb?: ExerciseLike[];
  lower_limb?: ExerciseLike[];
  core?: ExerciseLike[];
  exercises?: ExerciseLike[];
  warmup?: ExerciseLike[];
  ability_exercises?: ExerciseLike[];
  activities?: ExerciseLike[];
  drills?: ExerciseLike[];
  ssg?: { id?: string; name?: string } | null;
}

export interface DiversityResult {
  similar: boolean;
  similarity: number; // 0-1
  message: string;
  overlappingIds: string[];
}

/**
 * Extract exercise IDs from a training plan for comparison.
 */
function getIds(plan: PlanModuleLike[]): string[] {
  const ids: string[] = [];
  const keys: (keyof PlanModuleLike)[] = [
    "upper_limb",
    "lower_limb",
    "core",
    "exercises",
    "warmup",
    "ability_exercises",
    "activities",
    "drills",
  ];

  plan.forEach((m) => {
    keys.forEach((key) => {
      const items = m[key];
      if (Array.isArray(items)) {
        items.forEach((ex: ExerciseLike) => {
          if (ex.id) ids.push(ex.id);
        });
      }
    });
    // Also check SSG
    if (m.ssg?.id) {
      ids.push(m.ssg.id);
    }
  });

  return ids;
}

/**
 * Compare two training plans and check if they're too similar.
 * Returns similarity ratio and a warning message if > 70% overlap.
 */
export function checkPlanDiversity(
  planA: PlanModuleLike[],
  planB: PlanModuleLike[]
): DiversityResult {
  const idsA = getIds(planA);
  const idsB = getIds(planB);

  const overlappingIds = idsA.filter((id) => idsB.includes(id));
  const overlap = overlappingIds.length;
  const similarity = overlap / Math.max(Math.max(idsA.length, idsB.length), 1);

  if (similarity > 0.7) {
    return {
      similar: true,
      similarity,
      message: `⚠️ 连续方案相似度${Math.round(
        similarity * 100
      )}%，建议更换训练目标或调整周期阶段。`,
      overlappingIds,
    };
  }

  return {
    similar: false,
    similarity,
    message: "方案差异度正常",
    overlappingIds,
  };
}

/**
 * Check diversity between the latest N plans for a player.
 * Returns warnings for any pair with similarity > 70%.
 */
export function checkPlanDiversityBatch(
  plans: { modules: PlanModuleLike[]; createdAt: string; playerName?: string }[]
): { similar: boolean; warnings: string[] } {
  if (plans.length < 2) return { similar: false, warnings: [] };

  const warnings: string[] = [];
  for (let i = 0; i < plans.length - 1; i++) {
    for (let j = i + 1; j < plans.length; j++) {
      const result = checkPlanDiversity(plans[i].modules, plans[j].modules);
      if (result.similar) {
        const labelA = plans[i].playerName || `方案${i + 1}`;
        const labelB = plans[j].playerName || `方案${j + 1}`;
        warnings.push(
          `${labelA} ↔ ${labelB}: ${result.message}`
        );
      }
    }
  }

  return { similar: warnings.length > 0, warnings };
}
