/**
 * lib/services — unified API layer
 *
 * All external calls (AI generation, Supabase queries, uploads)
 * go through here. Hooks only manage UI state.
 */

export { streamGenerate } from "./ai";
export type { StreamCallbacks, ApiError } from "./ai";
