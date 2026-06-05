/**
 * Warmup & Cooldown Presets
 *
 * Hardcoded presets based on evidence-based protocols.
 * AI should NEVER select warmup IDs — they are always fixed based on scene.
 *
 * Sources:
 *   - RAMP warmup system (Ian Jeffreys, 《热身运动》/"Warm-Up and Cool-Down")
 *   - FIFA 11+ protocol (Soccer Anatomy / 《足球解剖学》)
 *   - NSCA CSCS 第4版 (Chapter 14: Warm-Up and Stretching)
 *   - 《动态拉伸训练》(Dynamic Stretching) — Mark Kovacs
 *   - 《精准拉伸》(Prescriptive Stretching) — Kristian Berg
 */

// ═══════════════════════════════════════════════
// GYM SCENE — FIFA 11+ full protocol (7 exercises)
// ═══════════════════════════════════════════════
// Every gym session MUST include these 7 FIFA 11+ core exercises.
// Source: FIFA 11+ Manual + Soccer Anatomy Ch.5 "Injury Prevention"
const GYM_WARMUP_IDS = [
  "warm-hip-open",            // FIFA 11+ Part 1: Hip activation (Running exercises)
  "warm-glute-activation",    // FIFA 11+ Part 2: Glute bridge + clam shell
  "warm-dynamic-stretch",     // FIFA 11+ Part 2: Dynamic stretching (no static!)
  "warm-plank-series",        // FIFA 11+ Part 2: Plank L1→L2→L3
  "warm-side-plank-series",   // FIFA 11+ Part 2: Side plank L1→L2→L3
  "warm-single-leg-balance",  // FIFA 11+ Part 2: Single-leg balance L1→L2→L3
  "warm-nordic-curl",         // FIFA 11+ Part 2: Nordic hamstring curl L1→L2→L3
];

// ═══════════════════════════════════════════════
// PITCH SCENE (NO BALL) — RAMP + FIFA 11+
// ═══════════════════════════════════════════════
// Raise (慢跑提体温) → Agility (神经激活) → Dynamic Stretch → Glute Activate → FIFA Core
const PITCH_NO_BALL_WARMUP_IDS = [
  "warm-light-jog",           // RAMP Phase 1: Raise — elevate HR, joint lubrication
  "warm-agility-ladder",      // RAMP Phase 1→2: Neural activation + coordination
  "warm-dynamic-stretch",     // RAMP Phase 3: Mobilize — dynamic ROM, no static stretching
  "warm-glute-activation",    // RAMP Phase 2: Activate — posterior chain engagement
  "warm-nordic-curl",         // FIFA 11+ core: hamstring eccentric strength
  "warm-plank-series",        // FIFA 11+ core: trunk stability progression
];

// ═══════════════════════════════════════════════
// PITCH SCENE (WITH BALL) — 仅在球场热身使用
// ═══════════════════════════════════════════════
const PITCH_BALL_WARMUP_IDS = [
  "warm-ball-touch",
  "warm-ball-dribble",
  "warm-rondo",
];

// ═══════════════════════════════════════════════
// COOLDOWN — Always 3 components
// ═══════════════════════════════════════════════
// Source: 《精准拉伸》+ NSCA CSCS Ch.14 cool-down guidelines
const COOLDOWN_IDS = [
  "cool-static-stretch",      // Static stretching (only appropriate post-session)
  "cool-foam-roll",           // Self-myofascial release
  "cool-breathing",           // Parasympathetic activation + HR recovery
];

/**
 * Get fixed warmup exercise IDs based on training scene.
 * AI never chooses warmup — it is always determined by scene and ball availability.
 */
export function getWarmupIds(
  scene: "gym" | "pitch",
  ballOption?: "ball" | "no-ball"
): string[] {
  if (scene === "gym") {
    return [...GYM_WARMUP_IDS]; // 力量房：永久无球
  }
  // 球场：可选有球热身
  if (ballOption === "ball") {
    return [...PITCH_BALL_WARMUP_IDS];
  }
  return [...PITCH_NO_BALL_WARMUP_IDS];
}

/**
 * Get fixed cooldown exercise IDs. Always the same 3 components.
 */
export function getCooldownIds(): string[] {
  return [...COOLDOWN_IDS];
}

/**
 * Calculate warmup duration based on total session length.
 *
 * RAMP protocol guidelines (Ian Jeffreys):
 *   - Sessions >= 60 min:  15-20 min warmup (returns 15)
 *   - Sessions 45-60 min:  10-15 min warmup (returns 12)
 *   - Sessions <= 45 min:  8-12 min warmup  (returns 10)
 *
 * NSCA CSCS: warmup should be 10-20 min depending on session intensity/duration.
 */
export function getWarmupDuration(totalDuration: number): number {
  if (totalDuration >= 60) return 15;
  if (totalDuration >= 45) return 12;
  return 10;
}

/**
 * Calculate cooldown duration based on total session length.
 *
 * NSCA CSCS Ch.14: cool-down should be 5-10 min
 * Longer sessions benefit from longer cool-down for better recovery priming.
 */
export function getCooldownDuration(totalDuration: number): number {
  if (totalDuration >= 60) return 10;
  if (totalDuration >= 45) return 8;
  return 5;
}

/**
 * Returns the book citation and rationale for why these warmup IDs were chosen.
 */
export function warmupPresetDescription(scene: string): string {
  if (scene === "gym") {
    return (
      "FIFA 11+ 完整协议 (Soccer Anatomy / 《足球解剖学》第5章): " +
      "髋激活 → 臀肌激活 → 动态拉伸 → 平板三级 → 侧桥三级 → 单腿平衡三级 → 北欧腘绳肌弯举。 " +
      "RAMP 系统框架 (Ian Jeffreys, 《热身运动》): 提升体温(Raise) → 激活(Activate) → 动态关节活动(Mobilize) → 神经增强(Potentiate)。 " +
      "每节必练，不得跳过。禁止热身阶段使用静态拉伸 (NSCA CSCS 第4版第14章)。"
    );
  }

  return (
    "RAMP 热身系统 (Ian Jeffreys, 《热身运动》): " +
    "Phase 1 Raise (慢跑提体温) → Phase 2 Activate (臀肌/神经激活) → " +
    "Phase 3 Mobilize (动态拉伸, 《动态拉伸训练》Mark Kovacs) → " +
    "Phase 4 Potentiate (FIFA 11+ 核心: 北欧弯举+平板支撑)。 " +
    "球场可选择有球热身（仅限球场场景，力量房永禁有球）。"
  );
}
