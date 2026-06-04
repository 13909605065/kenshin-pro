/**
 * lib/ai — AI prompts & streaming service
 *
 * Prompt builders (role-aware):
 *   import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai";
 *
 * Streaming:
 *   import { streamGenerate } from "@/lib/ai";
 */

// --- Prompt re-exports ---
export { buildAthleteSystemPrompt, buildCoachSystemPrompt } from "./system";
export { buildAthletePrompt, LANG_INSTRUCTIONS } from "./athlete";
export { buildCoachPrompt } from "./coach";

import { buildAthleteSystemPrompt, buildCoachSystemPrompt } from "./system";
import { buildAthletePrompt } from "./athlete";
import { buildCoachPrompt } from "./coach";
import { PlayerFormData } from "../types";

/**
 * Build system prompt based on role, with optional scene constraint injected at system level.
 */
export function buildSystemPrompt(data: PlayerFormData, scene?: string): string {
  const base = data.role === "coach" ? buildCoachSystemPrompt() : buildAthleteSystemPrompt();

  // Inject scene constraint at system prompt level (highest priority for LLM)
  if (scene === "pitch") {
    const pitchRule = `\n\n## ⚠️⚠️⚠️ 场景铁律：球场训练 - 以下规则优先级最高 ⚠️⚠️⚠️
你正在为球场训练生成方案。严禁出现任何健身房内容。
- 🔴 禁止输出 upper_ids（上肢力量在球场用SSG对抗替代）
- 🔴 禁止所有 ex-db-* ex-sus-* ex-bench-press ex-cable-* ex-back-squat ex-front-squat ex-deadlift ex-trap-bar-deadlift ex-power-clean ex-leg-press ex-hip-thrust ex-hanging-leg-raise ex-pallof-press ex-face-pull
- 🔴 禁止使用 combo_id（套餐含健身房动作）
- 🟢 lower_ids仅限: ex-nordic-hamstring ex-box-jump ex-bulgarian-split-squat ex-single-leg-rdl
- 🟢 core_ids仅限: ex-plank ex-dead-bug
- 🟢 ability仅限: ex-sled-sprint ex-box-jump ex-nordic-hamstring
- 🟢 多输出 drill_ids（有球训练是球场核心）`;
    return pitchRule + "\n" + base;
  }

  if (scene === "gym") {
    const gymRule = `\n\n## ⚠️⚠️⚠️ 场景铁律：健身房训练 - 以下规则优先级最高 ⚠️⚠️⚠️
你正在为健身房生成方案。严禁出现任何球场内容。
- 🔴 禁止 warm-ball-touch warm-ball-dribble warm-rondo warm-agility-ladder warm-skip-variations warm-accel-drill
- 🔴 禁止所有 drill_ids SSG对抗赛 跑动训练 战术内容 有球技术
- 🔴 热身仅限: warm-hip-open warm-dynamic-stretch warm-glute-activation warm-plank-series warm-side-plank-series warm-single-leg-balance
- 🟢 专注器械力量训练，优先使用 combo_id
- 🟢 全部力量动作可用`;
    return gymRule + "\n" + base;
  }

  return base;
}

/**
 * Build user prompt based on role.
 */
export function buildUserPrompt(data: PlayerFormData, lang: string = "zh", weatherHint?: string, sceneHint?: string): string {
  if (data.role === "coach") {
    return buildCoachPrompt(data, lang, weatherHint, sceneHint);
  }
  return buildAthletePrompt(data, lang, weatherHint, sceneHint);
}

// --- Streaming re-exports ---
export { streamGenerate } from "./ai";
export type { StreamCallbacks, ApiError } from "./ai";
