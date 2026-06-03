"use client";

import { useState, useRef, useCallback } from "react";
import { TrainingModule, PlayerFormData, GenerationStatus } from "@/lib/types";
import { cacheModules } from "@/lib/storage";
import { streamGenerate } from "@/lib/services";
import { fingerprint, findCached, saveToCache } from "@/lib/cache";

export function useTraining() {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [currentEventName, setCurrentEventName] = useState<string>("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
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
      setFromCache(false);

      // 1. Check cache first
      const fp = fingerprint(formData);
      const cached = findCached(fp);
      if (cached) {
        setFromCache(true);
        modulesRef.current = cached.modules;
        setModules([...cached.modules]);
        setPlanId(`cached_${Date.now()}`);
        onStatusChange?.("complete");
        return;
      }

      // 2. No cache — call AI
      abortRef.current = new AbortController();

      await streamGenerate(
        formData,
        {
          onModule(module, eventName) {
            modulesRef.current = [...modulesRef.current, module];
            setModules([...modulesRef.current]);
            setCurrentEventName(eventName);
            cacheModules(modulesRef.current);
            onStatusChange?.("streaming");
          },
          onDone(id) {
            setPlanId(id);
            // Save to cache on complete
            if (modulesRef.current.length > 0) {
              saveToCache(fp, formData, modulesRef.current);
            }
            onStatusChange?.("complete");
          },
        },
        abortRef.current.signal
      );

      // Fallback save
      if (modulesRef.current.length > 0) {
        saveToCache(fp, formData, modulesRef.current);
      }
      setPlanId((prev) => prev || Date.now().toString());
    },
    []
  );

  const retry = useCallback(async () => {
    if (formDataRef.current) {
      // Force skip cache on retry
      const data = formDataRef.current;
      setModules([]);
      setPlanId(null);
      setFromCache(false);
      abortRef.current = new AbortController();
      await streamGenerate(
        data,
        {
          onModule(module, eventName) {
            modulesRef.current = [...modulesRef.current, module];
            setModules([...modulesRef.current]);
            setCurrentEventName(eventName);
            cacheModules(modulesRef.current);
          },
          onDone(id) { setPlanId(id); },
        },
        abortRef.current.signal
      );
      setPlanId((prev) => prev || Date.now().toString());
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    modulesRef.current = [];
    setModules([]);
    setCurrentEventName("");
    setPlanId(null);
    setFromCache(false);
  }, []);

  /** Load pre-built modules (e.g., from saved plan history) */
  const loadModules = useCallback(
    (loaded: TrainingModule[], fData?: PlayerFormData) => {
      if (fData) {
        formDataRef.current = fData;
      }
      modulesRef.current = [...loaded];
      setModules([...loaded]);
      setPlanId(`loaded_${Date.now()}`);
      setFromCache(false);
      setCurrentEventName("");
    },
    []
  );

  return {
    modules,
    currentEventName,
    planId,
    fromCache,
    generate,
    retry,
    reset,
    loadModules,
  };
}
