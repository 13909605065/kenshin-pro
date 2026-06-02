/**
 * lib/prompts — modular AI prompt system (role-aware)
 *
 * Usage:
 *   import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
 *   // or from "@/lib/prompt" (same API)
 *
 * Editing a specific section:
 *   - system.ts: buildAthleteSystemPrompt(), buildCoachSystemPrompt()
 *   - athlete.ts: buildAthletePrompt()
 *   - coach.ts: buildCoachPrompt()
 */

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
export function buildUserPrompt(data: PlayerFormData, lang: string = "zh"): string {
  if (data.role === "coach") {
    return buildCoachPrompt(data, lang);
  }
  return buildAthletePrompt(data, lang);
}
