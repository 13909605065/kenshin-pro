"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  PlayerFormData,
  InjurySite,
  UserRole,
} from "@/lib/types";

const SAVE_KEY = "kenshin_player_data";

const DEFAULT_DATA: PlayerFormData = {
  role: "coach",
  name: "",
  gender: "male",
  position: null,
  age: null,
  height: null,
  weight: null,
  years: null,
  injuryHistory: "",
  goal: null,
  phase: null,
  injurySites: [],
  weakness: "",
  coachCert: null,
  coachRole: null,
  leagueTag: null,
  tacticalThemes: [],
  equipmentAvailable: [],
  trainingDuration: 60,
};

function validateStep1(data: PlayerFormData): Partial<Record<keyof PlayerFormData, string>> {
  const errors: Partial<Record<keyof PlayerFormData, string>> = {};
  if (data.role === "coach") {
    if (!data.coachCert) errors.coachCert = "请选择教练证书等级";
    if (!data.coachRole) errors.coachRole = "请选择执教身份";
    if (!data.leagueTag) errors.leagueTag = "请选择执教联赛或梯队";
    return errors;
  }
  if (data.role === "fitness") {
    if (data.age === null || data.age === undefined) errors.age = "请输入年龄";
    else if (data.age < 12 || data.age > 80) errors.age = "年龄范围 12-80 岁";
    if (data.weight === null || data.weight === undefined) errors.weight = "请输入体重";
    else if (data.weight < 30 || data.weight > 200) errors.weight = "体重范围 30-200kg";
    if (data.height === null || data.height === undefined) errors.height = "请输入身高";
    else if (data.height < 120 || data.height > 230) errors.height = "身高范围 120-230cm";
    if (data.years === null || data.years === undefined) errors.years = "请输入训练年限";
    else if (data.years < 0 || data.years > 50) errors.years = "训练年限范围 0-50 年";
    if (!data.goal) errors.goal = "请选择健身目标";
    return errors;
  }
  if (!data.position) errors.position = "请选择场上位置";
  if (data.age === null || data.age === undefined) errors.age = "请输入年龄";
  else if (data.age < 12 || data.age > 60) errors.age = "年龄范围 12-60 岁";
  if (data.weight === null || data.weight === undefined) errors.weight = "请输入体重";
  else if (data.weight < 30 || data.weight > 150) errors.weight = "体重范围 30-150kg";
  if (data.height === null || data.height === undefined) errors.height = "请输入身高";
  else if (data.height < 120 || data.height > 220) errors.height = "身高范围 120-220cm";
  if (data.years === null || data.years === undefined) errors.years = "请输入训练年限";
  else if (data.years < 0 || data.years > 40) errors.years = "训练年限范围 0-40 年";
  return errors;
}

function validateStep2(data: PlayerFormData): Partial<Record<keyof PlayerFormData, string>> {
  if (data.role === "coach") {
    if (!data.tacticalThemes.length) return { tacticalThemes: "请选择至少一个战术主题" };
    return {};
  }
  if (data.role === "fitness") return {};
  if (!data.goal) return { goal: "请选择训练目标" };
  return {};
}

function validateStep3(data: PlayerFormData): Partial<Record<keyof PlayerFormData, string>> {
  if (data.role === "coach") return {};
  if (data.role === "fitness") return {};
  if (!data.phase) return { phase: "请选择赛季阶段" };
  return {};
}

const STEP_VALIDATORS = [validateStep1, validateStep2, validateStep3];

export function useWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<PlayerFormData>({ ...DEFAULT_DATA });
  const [errors, setErrors] = useState<Partial<Record<keyof PlayerFormData, string>>>({});
  const [mounted, setMounted] = useState(false);

  // Load saved data from localStorage after mount (avoid hydration mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Clear stale equipment data from old version
        saved.equipmentAvailable = [];
        saved.weakness = saved.weakness || "";
        setFormData((prev) => ({ ...prev, ...saved }));
        const savedStep = parseInt(localStorage.getItem("kenshin_wizard_step") || "0");
        if (savedStep > 0) setCurrentStep(savedStep);
      }
    } catch {}
    setMounted(true);
  }, []);

  const totalSteps = 4;

  const updateField = useCallback(
    <K extends keyof PlayerFormData>(key: K, value: PlayerFormData[K]) => {
      setFormData((prev) => {
        const next = { ...prev, [key]: value };
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  const toggleInjurySite = useCallback(
    (site: InjurySite) => {
      setFormData((prev) => {
        if (prev.role === "coach") return prev;
        return {
          ...prev,
          injurySites: prev.injurySites.includes(site)
            ? prev.injurySites.filter((s) => s !== site)
            : [...prev.injurySites, site],
        };
      });
    },
    []
  );

  const setRole = useCallback((role: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      role,
      // Clear athlete fields when switching to coach or fitness
      ...(role === "coach" || role === "fitness" ? { injurySites: [], injuryHistory: "", position: null, goal: null, phase: null } : {}),
      // Clear coach fields when switching to athlete or fitness
      ...(role === "athlete" || role === "fitness" ? { coachCert: null, coachRole: null, leagueTag: null, tacticalThemes: [] } : {}),
    }));
    setErrors({});
  }, []);

  /** Bulk-load profile data — used for Supabase profile restore */
  const loadProfile = useCallback((fd: Partial<PlayerFormData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...fd };
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    setErrors({});
  }, []);

  const nextStep = useCallback(() => {
    const validator = STEP_VALIDATORS[currentStep];
    if (validator) {
      const stepErrors = validator(formData);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
    }
    setErrors({});
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [currentStep, formData]);

  const prevStep = useCallback(() => {
    setErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setFormData({ ...DEFAULT_DATA });
    setErrors({});
  }, []);

  const isStepValid = useMemo(() => {
    const validator = STEP_VALIDATORS[currentStep];
    if (!validator) return true;
    return Object.keys(validator(formData)).length === 0;
  }, [currentStep, formData]);

  return {
    currentStep,
    totalSteps,
    formData,
    errors,
    mounted,
    updateField,
    toggleInjurySite,
    setRole,
    loadProfile,
    nextStep,
    prevStep,
    reset,
    isStepValid,
  };
}
