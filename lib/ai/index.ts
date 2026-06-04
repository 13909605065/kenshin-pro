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
    return base + "\n## 场景：球场训练。禁止杠铃/哑铃/绳索/TRX器械。仅自重+药球+跳箱。禁止combo_id，逐项指定ID。";
  }

  if (scene === "gym") {
    return base + "\n## 场景：健身房训练。禁止所有有球热身(warm-ball-touch/dribble/rondo)、足球技术、SSG对抗、跑动训练。热身仅限健身房自重动作(9090/伟大拉伸/开合跳/泡沫轴)。专注器械力量。优先combo_id。";
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
