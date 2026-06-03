"use client";

import type { PlayerFormData } from "@/lib/types";

const COACH_KEY = "coach_profile";
const ATHLETE_KEY = "athlete_profile";

/** Save coach profile to localStorage */
export function saveCoachProfile(data: Partial<PlayerFormData>): void {
  try {
    const coachFields = {
      role: data.role,
      coachCert: data.coachCert,
      coachRole: data.coachRole,
      leagueTag: data.leagueTag,
      tacticalThemes: data.tacticalThemes,
      name: data.name,
    };
    localStorage.setItem(COACH_KEY, JSON.stringify(coachFields));
  } catch {}
}

/** Load saved coach profile */
export function loadCoachProfile(): Partial<PlayerFormData> | null {
  try {
    const raw = localStorage.getItem(COACH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Save athlete profile */
export function saveAthleteProfile(data: Partial<PlayerFormData>): void {
  try {
    const fields = {
      role: data.role,
      name: data.name,
      gender: data.gender,
      position: data.position,
      age: data.age,
      height: data.height,
      weight: data.weight,
      years: data.years,
      injuryHistory: data.injuryHistory,
      goal: data.goal,
      phase: data.phase,
      injurySites: data.injurySites,
      weakness: data.weakness,
    };
    localStorage.setItem(ATHLETE_KEY, JSON.stringify(fields));
  } catch {}
}

/** Load saved athlete profile */
export function loadAthleteProfile(): Partial<PlayerFormData> | null {
  try {
    const raw = localStorage.getItem(ATHLETE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
