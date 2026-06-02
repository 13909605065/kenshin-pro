/**
 * Prompt builders — role-aware
 *
 * Athlete → individual training plan (5 modules)
 * Coach   → session plan (3 modules)
 */
import { PlayerFormData } from "./types";
import { buildAthletePrompt } from "./prompts/athlete";
import { buildCoachPrompt } from "./prompts/coach";
import { buildAthleteSystemPrompt, buildCoachSystemPrompt } from "./prompts/system";

/** Build user prompt based on role */
export function buildUserPrompt(data: PlayerFormData, lang?: string): string {
  const l = lang || "zh";
  if (data.role === "coach") {
    return buildCoachPrompt(data, l);
  }
  return buildAthletePrompt(data, l);
}

/** Build system prompt based on role */
export function buildSystemPrompt(data: PlayerFormData): string {
  if (data.role === "coach") {
    return buildCoachSystemPrompt();
  }
  return buildAthleteSystemPrompt();
}

// Legacy exports for backward compatibility
export { buildAthleteSystemPrompt, buildCoachSystemPrompt } from "./prompts/system";
export { buildAthletePrompt } from "./prompts/athlete";
export { buildCoachPrompt } from "./prompts/coach";
