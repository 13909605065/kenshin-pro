"use client";

import { useState, useCallback } from "react";
import { PlayerFormData } from "@/lib/types";

const PROFILES_KEY = "kenshin_profiles";
const ACTIVE_KEY = "kenshin_active_profile";

export interface PlayerProfile {
  id: string;
  name: string;
  createdAt: string;
  formData: PlayerFormData;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<PlayerProfile[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACTIVE_KEY);
  });

  const saveProfiles = useCallback((p: PlayerProfile[]) => {
    setProfiles(p);
    if (typeof window !== "undefined") {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(p));
    }
  }, []);

  const saveProfile = useCallback(
    (name: string, formData: PlayerFormData) => {
      const id = Date.now().toString();
      const profile: PlayerProfile = {
        id,
        name,
        createdAt: new Date().toISOString(),
        formData: { ...formData },
      };
      const updated = [profile, ...profiles].slice(0, 20);
      saveProfiles(updated);
      setActiveId(id);
      localStorage.setItem(ACTIVE_KEY, id);
      return profile;
    },
    [profiles, saveProfiles]
  );

  const loadProfile = useCallback(
    (id: string): PlayerProfile | null => {
      const p = profiles.find((p) => p.id === id);
      if (p) {
        setActiveId(id);
        localStorage.setItem(ACTIVE_KEY, id);
      }
      return p || null;
    },
    [profiles]
  );

  const deleteProfile = useCallback(
    (id: string) => {
      const updated = profiles.filter((p) => p.id !== id);
      saveProfiles(updated);
      if (activeId === id) {
        localStorage.removeItem(ACTIVE_KEY);
        setActiveId(null);
      }
    },
    [profiles, activeId, saveProfiles]
  );

  const getActive = useCallback(() => {
    return profiles.find((p) => p.id === activeId) || null;
  }, [profiles, activeId]);

  return {
    profiles,
    activeId,
    saveProfile,
    loadProfile,
    deleteProfile,
    getActive,
  };
}
