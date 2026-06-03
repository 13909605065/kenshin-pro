/**
 * AI Service — client-side SSE stream parsing and training generation
 */

import { TrainingModule, PlayerFormData, GenerationStatus } from "../types";

/** Module event names matched from the streaming response */
const MODULE_EVENTS = ["module_1", "module_2", "module_3", "module_4", "module_5"];

/** Error shape returned by the API */
export interface ApiError extends Error {
  code?: string;
  waitSeconds?: number;
}

/** Callbacks for streaming generation progress */
export interface StreamCallbacks {
  onModule?: (module: TrainingModule, eventName: string) => void;
  onDone?: (planId: string) => void;
  onError?: (error: ApiError) => void;
  onStatusChange?: (status: GenerationStatus) => void;
}

/**
 * Parse SSE stream from /api/generate.
 * Handles streaming, module parsing, and error recovery.
 */
export async function streamGenerate(
  formData: PlayerFormData,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  scene?: string
): Promise<TrainingModule[]> {
  const modules: TrainingModule[] = [];

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        lang: typeof window !== "undefined" ? localStorage.getItem("kenshin_lang") || "zh" : "zh",
        scene: scene || undefined,
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || "API 请求失败") as ApiError;
      error.code = errorData.code || "api-error";
      error.waitSeconds = errorData.waitSeconds;
      callbacks.onError?.(error);
      throw error;
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ") && currentEvent) {
          const dataStr = line.slice(6).trim();

          if (currentEvent === "done") {
            const planId = Date.now().toString();
            callbacks.onDone?.(planId);
            return modules;
          }

          if (currentEvent === "error") {
            const err = JSON.parse(dataStr);
            const error = new Error(err.message) as ApiError;
            error.code = err.code;
            callbacks.onError?.(error);
            throw error;
          }

          if (MODULE_EVENTS.includes(currentEvent)) {
            const eventName = currentEvent;
            currentEvent = ""; // Reset to avoid re-processing stale event
            try {
              const module: TrainingModule = JSON.parse(dataStr);
              modules.push(module);
              callbacks.onModule?.(module, eventName);
              callbacks.onStatusChange?.("streaming");
            } catch {
              // Parse failure → fallback module
              const fallback: TrainingModule = {
                module: "parse_error",
                title: `解析失败 (${eventName})`,
                raw: dataStr,
                status: "complete",
              } as any;
              modules.push(fallback);
              callbacks.onModule?.(fallback, eventName);
            }
          }
        }
      }
    }

    return modules;
  } catch (err: any) {
    if (err.name === "AbortError") return modules;

    if (!err.code) {
      err.code = "stream-interrupted";
    }
    callbacks.onError?.(err);
    throw err;
  }
}
