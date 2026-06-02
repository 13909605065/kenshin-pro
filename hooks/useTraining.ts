"use client";

import { useState, useRef, useCallback } from "react";
import { TrainingModule, PlayerFormData, GenerationStatus } from "@/lib/types";
import { cacheModules, getCachedModules } from "@/lib/storage";

const MODULE_EVENTS = ["module_1", "module_2", "module_3", "module_4", "module_5"];

export function useTraining() {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [currentEventName, setCurrentEventName] = useState<string>("");
  const [planId, setPlanId] = useState<string | null>(null);
  const modulesRef = useRef<TrainingModule[]>([]);
  const formDataRef = useRef<PlayerFormData | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (
      formData: PlayerFormData,
      onStatusChange?: (status: GenerationStatus) => void
    ): Promise<void> => {
      formDataRef.current = formData;
      modulesRef.current = [];
      setModules([]);
      setPlanId(null);

      abortRef.current = new AbortController();

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            lang: localStorage.getItem("kenshin_lang") || "zh",
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error: any = new Error(errorData.message || "API 请求失败");
          error.code = errorData.code || "api-error";
          throw error;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ") && currentEvent) {
              const dataStr = line.slice(6).trim();

              if (currentEvent === "done") {
                setPlanId(Date.now().toString());
                return;
              }

              if (currentEvent === "error") {
                const err = JSON.parse(dataStr);
                const error: any = new Error(err.message);
                error.code = err.code;
                throw error;
              }

              if (MODULE_EVENTS.includes(currentEvent)) {
                try {
                  const module: TrainingModule = JSON.parse(dataStr);
                  modulesRef.current = [...modulesRef.current, module];
                  setModules([...modulesRef.current]);
                  setCurrentEventName(currentEvent);
                  cacheModules(modulesRef.current);
                  onStatusChange?.("streaming");
                } catch (e) {
                  const fallback: any = {
                    module: "parse_error",
                    title: `解析失败 (${currentEvent})`,
                    raw: dataStr,
                    status: "complete",
                  };
                  modulesRef.current = [...modulesRef.current, fallback];
                  setModules([...modulesRef.current]);
                }
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;

        cacheModules(modulesRef.current);

        if (!err.code) {
          err.code = "stream-interrupted";
        }
        throw err;
      }
    },
    []
  );

  const retry = useCallback(async () => {
    if (formDataRef.current) {
      await generate(formDataRef.current);
    }
  }, [generate]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    modulesRef.current = [];
    setModules([]);
    setCurrentEventName("");
    setPlanId(null);
  }, []);

  return {
    modules,
    currentEventName,
    planId,
    generate,
    retry,
    reset,
  };
}
