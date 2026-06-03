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
 * Build system prompt based on role.
 */
export function buildSystemPrompt(data: PlayerFormData): string {
  if (data.role === "coach") {
    return buildCoachSystemPrompt();
  }
  return buildAthleteSystemPrompt();
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
