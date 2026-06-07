/**
 * Field Session Validator — keeps text, params, progress, and TRIMP in sync.
 *
 * Core rule: text is the SOURCE OF TRUTH. Structured params are derived from text.
 * If text and params disagree, text wins and params auto-correct.
 */

// ═══════════════════════════════════════════════
// Text Parser: extract structured params from free-text
// ═══════════════════════════════════════════════

export interface ParsedParams {
  sets: number | null;
  durationMin: number | null;
  restSec: number | null;
  groupSize: string | null;
  intensityLabel: string | null;
}

/**
 * Parse Chinese training text like:
 *   "2v4抢圈 3组 4min一组 休息30s"
 *   "间歇跑 6组 2min 间歇60s 高强度"
 *   "力量训练 4组 45s 休息90s"
 */
export function parseText(text: string): ParsedParams {
  const result: ParsedParams = {
    sets: null, durationMin: null, restSec: null,
    groupSize: null, intensityLabel: null,
  };

  // Group size: "4v4", "8v8", "半场", "全场"
  const gsMatch = text.match(/(\d+v\d+|半场|全场|小场|大场)/);
  if (gsMatch) result.groupSize = gsMatch[1];

  // Sets: "3组", "6组", "4-6组"
  const setsMatch = text.match(/(\d+)\s*组/);
  if (setsMatch) result.sets = parseInt(setsMatch[1]);

  // Duration: "4min", "4分钟", "2min一组", "45s", "45秒"
  const durMinMatch = text.match(/(\d+)\s*(?:min|分钟)(?:\/组|一组)?/);
  if (durMinMatch) result.durationMin = parseInt(durMinMatch[1]);
  else {
    const durSecMatch = text.match(/(\d+)\s*(?:s|秒)(?:\/组|一组)?/);
    if (durSecMatch) result.durationMin = Math.round(parseInt(durSecMatch[1]) / 60 * 10) / 10;
  }

  // Rest: "休息30s", "间歇60s", "休息90秒", "间歇2min"
  const restSecMatch = text.match(/(?:休息|间歇)\s*(\d+)\s*(?:s|秒)/);
  if (restSecMatch) result.restSec = parseInt(restSecMatch[1]);
  else {
    const restMinMatch = text.match(/(?:休息|间歇)\s*(\d+)\s*(?:min|分钟)/);
    if (restMinMatch) result.restSec = parseInt(restMinMatch[1]) * 60;
  }

  // Intensity hints
  if (/高|大强度|极限|冲刺/.test(text)) result.intensityLabel = "高";
  else if (/中|中等/.test(text)) result.intensityLabel = "中";
  else if (/低|轻松|恢复/.test(text)) result.intensityLabel = "低";

  return result;
}

// ═══════════════════════════════════════════════
// Validation: compare text vs structured params
// ═══════════════════════════════════════════════

export interface ValidationIssue {
  field: string;
  textValue: string | number;
  paramValue: string | number;
  message: string;
  autoFixed: boolean;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  correctedParams: Partial<ParsedParams>;
}

/**
 * Validate a tactical phase — compare text to structured params.
 * Returns issues and auto-corrected params.
 * Rule: text is always the source of truth.
 */
export function validatePhase(
  text: string,
  params: {
    groupSize: string;
    durationMin: number;
    restSec: number;
    setsPlanned: number;
    setsCompleted: number;
  }
): ValidationResult {
  const parsed = parseText(text);
  const issues: ValidationIssue[] = [];
  const corrected: any = {};

  // 1. Group size
  if (parsed.groupSize && parsed.groupSize !== params.groupSize) {
    issues.push({
      field: "groupSize",
      textValue: parsed.groupSize,
      paramValue: params.groupSize,
      message: `分组人数不匹配：文本显示"${parsed.groupSize}"，参数为"${params.groupSize}"`,
      autoFixed: true,
    });
    corrected.groupSize = parsed.groupSize;
  }

  // 2. Sets (only correct if text has a clear number AND params don't match)
  if (parsed.sets && parsed.sets !== params.setsPlanned) {
    issues.push({
      field: "setsPlanned",
      textValue: parsed.sets,
      paramValue: params.setsPlanned,
      message: `组数不匹配：文本显示"${parsed.sets}组"，参数为"${params.setsPlanned}组"`,
      autoFixed: true,
    });
    corrected.setsPlanned = parsed.sets;
    // Don't auto-override completed sets
    if (params.setsCompleted > parsed.sets) {
      corrected.setsCompleted = parsed.sets;
      issues.push({
        field: "setsCompleted",
        textValue: parsed.sets,
        paramValue: params.setsCompleted,
        message: `完成组数超过计划组数，已自动修正`,
        autoFixed: true,
      });
    }
  }

  // 3. Duration
  if (parsed.durationMin && parsed.durationMin !== params.durationMin) {
    issues.push({
      field: "durationMin",
      textValue: parsed.durationMin,
      paramValue: params.durationMin,
      message: `单组时长不匹配：文本显示"${parsed.durationMin}min"，参数为"${params.durationMin}min"`,
      autoFixed: true,
    });
    corrected.durationMin = parsed.durationMin;
  }

  // 4. Rest
  if (parsed.restSec !== null && parsed.restSec !== params.restSec) {
    issues.push({
      field: "restSec",
      textValue: parsed.restSec,
      paramValue: params.restSec,
      message: `休息时间不匹配：文本显示"${parsed.restSec}s"，参数为"${params.restSec}s"`,
      autoFixed: true,
    });
    corrected.restSec = parsed.restSec;
  }

  return {
    valid: issues.length === 0,
    issues,
    correctedParams: corrected,
  };
}

// ═══════════════════════════════════════════════
// TRIMP Calculator — consistent with actual session data
// ═══════════════════════════════════════════════

export interface TRIMPInput {
  durationMin: number;      // actual training minutes
  avgHR: number;            // average heart rate
  maxHR: number;            // max heart rate (default 200-age)
  restingHR: number;        // resting heart rate (default 50)
  intensityPercent: number; // estimated %HRmax
  setsCompleted: number;    // actual sets done
  setsPlanned: number;      // planned sets
}

export interface TRIMPOutput {
  trimp: number;
  intensity: "low" | "moderate" | "high" | "very_high";
  completionRate: number;
  equivalentLoadMin: number;
}

/**
 * Calculate TRIMP using Banister's formula, adjusted for completion rate.
 * Always uses ACTUAL data (setsCompleted, actual duration), not planned.
 */
export function calcTRIMPFromSession(input: TRIMPInput): TRIMPOutput {
  const { durationMin, avgHR, maxHR, restingHR, intensityPercent, setsCompleted, setsPlanned } = input;

  // Actual training time based on completed sets
  const actualDuration = setsPlanned > 0
    ? durationMin * (setsCompleted / setsPlanned)
    : durationMin;

  // Heart rate ratio
  const hrRatio = (avgHR - restingHR) / (maxHR - restingHR);

  // Banister TRIMP
  const trimp = Math.round(
    actualDuration * hrRatio * 0.64 * Math.exp(1.92 * hrRatio)
  );

  // Intensity bands
  const intensity =
    trimp > 120 ? "very_high" :
    trimp > 80 ? "high" :
    trimp > 40 ? "moderate" :
    "low";

  return {
    trimp,
    intensity,
    completionRate: setsPlanned > 0 ? Math.round((setsCompleted / setsPlanned) * 100) : 100,
    equivalentLoadMin: Math.round(trimp / (hrRatio * 0.64 * Math.exp(1.92 * hrRatio))),
  };
}

// ═══════════════════════════════════════════════
// Text → Structured converter (for auto-fill)
// ═══════════════════════════════════════════════

export interface StructuredPhase {
  text: string;
  groupSize: string;
  durationMin: number;
  restSec: number;
  setsPlanned: number;
  intensityLabel: string;
  intensityPercent: number;
}

const INTENSITY_PERCENT: Record<string, number> = {
  "低": 55, "中": 70, "偏高": 80, "高": 85, "过高": 95,
};

/**
 * Convert free-text tactical description into a fully structured phase.
 * Auto-fills all numeric fields from text parsing.
 */
export function textToPhase(text: string, existing?: Partial<StructuredPhase>): StructuredPhase {
  const parsed = parseText(text);

  const intensityLabel = parsed.intensityLabel || existing?.intensityLabel || "中";
  const intensityPercent = INTENSITY_PERCENT[intensityLabel] || 70;

  return {
    text: text,
    groupSize: parsed.groupSize || existing?.groupSize || "半场",
    durationMin: parsed.durationMin || existing?.durationMin || 4,
    restSec: parsed.restSec || existing?.restSec || 60,
    setsPlanned: parsed.sets || existing?.setsPlanned || 1,
    intensityLabel,
    intensityPercent,
  };
}
