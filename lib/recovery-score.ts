/**
 * Recovery / Readiness Score Calculator
 *
 * Takes objective recovery data and outputs a 🟢🟡🔴 decision for
 * the coach on whether an athlete is ready to train at full intensity.
 *
 * Sources:
 *   - NSCA CSCS 第4版, Chapter 12: "Recovery Strategies"
 *   - NSCA Essentials of Sport Science: "Monitoring Training Load"
 *   - ACWR (Acute:Chronic Workload Ratio) — Gabbett 2016
 *   - Heart Rate Variability & Resting HR monitoring guidelines
 */

import type { ACWRResult } from "./acwr";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface RecoveryInput {
  /** Session RPE from last completed session (6-10 scale) */
  lastSessionRPE: number | null;
  /** ISO date string of last session, e.g. "2026-06-04" */
  lastSessionDate: string | null;
  /** Hours of sleep last night */
  sleepHours: number | null;
  /** Subjective sleep quality (1=terrible, 5=excellent) */
  sleepQuality: number | null;
  /** Morning resting heart rate (bpm) */
  morningHR: number | null;
  /** Baseline resting HR (7-day rolling average or known baseline, bpm) */
  restingHR: number | null;
  /** Subjective muscle soreness (1=none, 5=extremely sore) */
  muscleSoreness: number | null;
  /** Subjective stress level (1=calm, 5=highly stressed) */
  stressLevel: number | null;
  /** Acute:Chronic Workload Ratio (ACWR). Can be passed directly or as ACWRResult. */
  acwr: number | ACWRResult | null;
  /** Hours elapsed since last training session ended */
  hoursSinceLastSession: number | null;
}

export interface RecoveryResult {
  /** Overall recovery score (0-100) */
  score: number;
  /** Traffic-light readiness level */
  level: "green" | "yellow" | "red";
  /** Human-readable training recommendation */
  recommendation: string;
  /** Load modifier: 1.0 = train normally, 0.8 = reduce 20%, 0.5 = half load */
  loadModifier: number;
  /** List of specific adjustments the coach should make */
  adjustments: string[];
}

// ═══════════════════════════════════════════════
// SCORING LOGIC
// ═══════════════════════════════════════════════

/**
 * Calculate recovery/readiness score.
 *
 * Starts at 100 points and deducts based on risk factors.
 * The scoring logic is based on NSCA monitoring guidelines:
 *
 * Key thresholds:
 *   - Sleep < 7h → -15 pts, reduced intensity
 *   - Morning HR > restingHR + 7 bpm → -20 pts (sympathetic overdrive)
 *   - Muscle soreness >= 4 → -15 pts, reduce volume
 *   - ACWR > 1.5 → RED, 50% load reduction (Gabbett danger zone)
 *   - ACWR > 1.3 → YELLOW, 20% reduction
 *   - Hours since last session < 24 → -10 pts (insufficient recovery window)
 *   - Last session RPE >= 9 → -10 pts (high-intensity session needs extra recovery)
 *
 * Output thresholds:
 *   - Score >= 80: GREEN — normal training
 *   - Score 60-79: YELLOW — reduce volume/intensity by ~20%
 *   - Score < 60: RED — active recovery or complete rest only
 */
export function calcRecoveryScore(input: RecoveryInput): RecoveryResult {
  let score = 100;
  const adjustments: string[] = [];

  // Extract acwr number from either raw number or ACWRResult
  const acwrValue: number | null =
    input.acwr === null || input.acwr === undefined
      ? null
      : typeof input.acwr === "number"
        ? input.acwr
        : input.acwr.acwr;

  // ── Sleep ───────────────────────────────────────────
  if (input.sleepHours !== null && input.sleepHours < 7) {
    score -= 15;
    adjustments.push(
      `睡眠不足 (${input.sleepHours}h < 7h)，建议降低训练强度 20%，优先确保今晚睡眠`
    );
  }

  if (input.sleepQuality !== null && input.sleepQuality <= 2) {
    score -= 10;
    adjustments.push(
      `睡眠质量差 (${input.sleepQuality}/5)，深度恢复可能不足，关注训练中的主观疲劳`
    );
  }

  // ── Heart Rate (sympathetic overdrive indicator) ────
  if (
    input.morningHR !== null &&
    input.restingHR !== null &&
    input.morningHR > input.restingHR + 7
  ) {
    score -= 20;
    adjustments.push(
      `晨脉偏高 (${input.morningHR}bpm > 基线${input.restingHR}+7bpm)，⚠️ 恢复不充分，交感神经过度活跃。建议调整为低强度训练或主动恢复日`
    );
  }

  // ── Muscle Soreness ────────────────────────────────
  if (input.muscleSoreness !== null && input.muscleSoreness >= 4) {
    score -= 15;
    adjustments.push(
      `肌肉酸痛严重 (${input.muscleSoreness}/5)，减少训练量 30-40%，避免高强度离心动作，重点关注泡沫轴放松`
    );
  } else if (input.muscleSoreness !== null && input.muscleSoreness >= 3) {
    score -= 5;
    adjustments.push(
      `轻度肌肉酸痛 (${input.muscleSoreness}/5)，可正常训练但注意热身充分`
    );
  }

  // ── Stress ──────────────────────────────────────────
  if (input.stressLevel !== null && input.stressLevel >= 4) {
    score -= 15;
    adjustments.push(
      `压力水平高 (${input.stressLevel}/5)，心理应激可能影响恢复和训练质量，考虑缩短训练时间`
    );
  } else if (input.stressLevel !== null && input.stressLevel >= 3) {
    score -= 5;
    adjustments.push(
      `中度压力 (${input.stressLevel}/5)，注意训练中情绪和注意力变化`
    );
  }

  // ── ACWR ────────────────────────────────────────────
  // ACWR > 1.5 → RED flag (Gabbett danger zone), overrides to RED
  if (acwrValue !== null && acwrValue > 1.5) {
    score -= 30;
    adjustments.push(
      `ACWR 危险 (${acwrValue.toFixed(1)} > 1.5)，受伤风险显著升高，建议本周减量 50%，重点恢复`
    );
  } else if (acwrValue !== null && acwrValue > 1.3) {
    score -= 20;
    adjustments.push(
      `ACWR 偏高 (${acwrValue.toFixed(1)} > 1.3)，训练负荷偏大，建议本周减量 20%，关注恢复状况`
    );
  } else if (acwrValue !== null && acwrValue < 0.8) {
    score -= 5;
    adjustments.push(
      `ACWR 偏低 (${acwrValue.toFixed(1)} < 0.8)，训练负荷可能不足，可适当增加训练量`
    );
  }

  // ── Time Since Last Session ─────────────────────────
  if (input.hoursSinceLastSession !== null && input.hoursSinceLastSession < 24) {
    score -= 10;
    adjustments.push(
      `距离上次训练仅 ${input.hoursSinceLastSession}h，恢复时间不足 24h，建议本次以技术/战术为主，避免高强度负荷`
    );
  }

  // ── Last Session RPE ────────────────────────────────
  if (input.lastSessionRPE !== null && input.lastSessionRPE >= 9) {
    score -= 10;
    adjustments.push(
      `上次训练 RPE 很高 (${input.lastSessionRPE}/10)，高强度训练后需更充分恢复，考虑降低本次训练负荷`
    );
  }

  // ── Clamp score ─────────────────────────────────────
  score = Math.max(0, Math.min(100, Math.round(score)));

  // ── Determine level & load modifier ─────────────────
  let level: "green" | "yellow" | "red";
  let loadModifier: number;
  let recommendation: string;

  if (score >= 80) {
    level = "green";
    loadModifier = 1.0;
    recommendation = "正常训练，按计划执行。保持恢复手段（营养、睡眠、泡沫轴）。";
  } else if (score >= 60) {
    level = "yellow";
    loadModifier = 0.8;
    recommendation =
      "训练负荷降低约 20%。减少总训练量或降低强度，增加恢复手段。避免新的高强度刺激。";
  } else {
    level = "red";
    loadModifier = 0.5;
    recommendation =
      "主动恢复日。仅进行低强度技术练习、泡沫轴放松、静态拉伸、呼吸训练。不安排高强度或大负荷训练。重点关注睡眠和营养。";
  }

  return {
    score,
    level,
    recommendation,
    loadModifier,
    adjustments,
  };
}

/**
 * Return the emoji for a given recovery level.
 */
export function getRecoveryEmoji(level: string): string {
  switch (level) {
    case "green":
      return "\u{1F7E2}"; // 🟢 green circle
    case "yellow":
      return "\u{1F7E1}"; // 🟡 yellow circle
    case "red":
      return "\u{1F534}";  // 🔴 red circle
    default:
      return "⚪";     // ⚪ white circle (unknown)
  }
}
