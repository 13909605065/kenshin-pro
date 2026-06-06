"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useWizard } from "@/hooks/useWizard";
import { useTraining } from "@/hooks/useTraining";
import { useProfiles } from "@/hooks/useProfiles";
import { useTemplates } from "@/hooks/useTemplates";
import { usePlanHistory } from "@/hooks/usePlanHistory";
import { TrainingTabs } from "./TrainingTabs";
import { GeneratingOverlay } from "./GeneratingOverlay";
import { ErrorAlert } from "./ErrorAlert";
import { TrainingHistory } from "./TrainingHistory";
import { TemplateLibrary } from "./TemplateLibrary";
import { GenerationStatus } from "@/lib/types";
import { TACTICAL_THEME_LABELS, COACH_ROLE_LABELS, LEAGUE_TAG_LABELS, GOAL_LABELS, PHASE_LABELS } from "@/lib/constants";
import { getPlayers } from "@/lib/roster-utils";
import { useLang } from "@/components/providers/LanguageProvider";
import { useScene } from "@/components/providers/SceneProvider";
import { Zap, Edit3, X, Target, Clock, Save, History, Trash2, ChevronDown, Timer, ClipboardList, MapPin, Dumbbell, Minus, Plus, GitCompare, Users } from "lucide-react";
import { OnboardingGuide } from "./OnboardingGuide";
import { PlanCompareModal } from "./PlanCompareModal";
import { useEquipmentInventory } from "@/hooks/useEquipmentInventory";
import { useRouter } from "next/navigation";
import { syncFormDataToSupabase, SupabaseProfile } from "@/hooks/useSupabaseSync";

const GOALS = ["strength","power","speed","agility","mas_endurance","combat"] as const;
const FITNESS_GOALS = [
  { id: "hypertrophy", label: "肌肥大", desc: "增加肌肉围度" },
  { id: "fat_loss", label: "减脂", desc: "降低体脂率" },
  { id: "body_shaping", label: "塑形", desc: "雕刻身体线条" },
  { id: "general_fitness", label: "锻炼身体", desc: "全面提升体质" },
  { id: "strength_fitness", label: "增力", desc: "提升绝对力量" },
  { id: "endurance_fitness", label: "耐力", desc: "提升心肺耐力" },
] as const;
const PHASES = ["preseason","competition","recovery","offseason"] as const;

// Smart filter linkage: goal ↔ phase
const GOAL_TO_PHASE_SUGGEST: Record<string, string> = {
  strength: "preseason",
  power: "competition",
  speed: "preseason",
  agility: "preseason",
  mas_endurance: "offseason",
  combat: "competition",
};
const PHASE_TO_GOAL_HIGHLIGHT: Record<string, string[]> = {
  preseason: ["strength","speed","agility"],
  competition: ["power","combat"],
  recovery: [],
  offseason: ["strength","mas_endurance"],
};
const PHASE_HINT_TEXT: Record<string, string> = {
  preseason: "💡 准备期建议侧重力量、速度和灵敏训练",
  competition: "💡 赛季期建议侧重爆发力和对抗能力",
  recovery: "💡 恢复期以轻量活动和再生为主",
  offseason: "💡 休赛期建议侧重力量和耐力训练",
};

const SUB_POS: Record<string, string[]> = {
  defender: ["中后卫","左后卫","右后卫"],
  midfielder: ["后腰","中前卫","前腰"],
  forward: ["中锋","影锋"],
  wingback: ["左边翼卫","右边翼卫"],
};

const INJURY_GROUPS: Record<string, string[]> = {
  "下肢": ["knee","ankle","achilles","thigh","hip"],
  "上肢": ["wrist","finger"],
  "躯干": ["waist"],
};

function ProfileSummary({ formData, t }: any) {
  const isCoach = formData.role === "coach";
  const isFitness = formData.role === "fitness";
  if (isCoach) {
    const parts = [
      formData.coachCert && (formData.coachCert === "none" ? "NONE" : formData.coachCert.toUpperCase()),
      formData.coachRole && (COACH_ROLE_LABELS as any)[formData.coachRole],
      formData.leagueTag && (LEAGUE_TAG_LABELS as any)[formData.leagueTag],
    ].filter(Boolean);
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
        {parts.map((p, i) => (
          <span key={i} className="px-2 py-0.5 rounded text-[9px] font-medium bg-[#992828]/15 text-[#992828] border border-[#992828]/20">{p}</span>
        ))}
        {parts.length === 0 && <span className="text-[10px] text-gray-400">未设置</span>}
      </div>
    );
  }
  if (isFitness) {
    const stats = [
      formData.age && `${formData.age}岁`,
      formData.height && `${formData.height}cm`,
      formData.weight && `${formData.weight}kg`,
    ].filter(Boolean);
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
        <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-[#992828] text-white">健身</span>
        {formData.gender && (
          <span className="text-[10px] text-gray-400">{formData.gender === "female" ? "♀" : "♂"}</span>
        )}
        {stats.length > 0 && (
          <span className="text-[10px] text-gray-400">{stats.join(" · ")}</span>
        )}
        {stats.length === 0 && !formData.gender && (
          <span className="text-[10px] text-gray-400">完善档案以获得个性化建议</span>
        )}
      </div>
    );
  }
  const posLabel = formData.position ? t(`pos.${formData.position}`) : null;
  const stats = [
    formData.age && `${formData.age}岁`,
    formData.height && `${formData.height}cm`,
    formData.weight && `${formData.weight}kg`,
  ].filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
      {posLabel && (
        <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-[#992828] text-white">{posLabel}</span>
      )}
      {formData.gender && (
        <span className="text-[10px] text-gray-400">{formData.gender === "female" ? "♀" : "♂"}</span>
      )}
      {stats.length > 0 && (
        <span className="text-[10px] text-gray-400">{stats.join(" · ")}</span>
      )}
      {!posLabel && stats.length === 0 && !formData.gender && (
        <span className="text-[10px] text-gray-400">完善档案以获得个性化建议</span>
      )}
    </div>
  );
}

function EditProfileModal({ formData, updateField, setRole, t, onClose, profiles }: any) {
  const [subPos, setSubPos] = useState("");
  const [autoFillToast, setAutoFillToast] = useState<{name: string, prevData: Record<string, any>} | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="glass-card p-5 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">{t("player.title")}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {formData.role !== "coach" ? (
          <>
            {/* Name — auto-fill from saved profiles */}
            <div className="relative">
              <input type="text" value={formData.name} onChange={(e: any) => updateField("name", e.target.value)}
                onBlur={async (e) => {
                  const name = e.target.value.trim();
                  if (!name) return;
                  const match = profiles.findByName(name);
                  if (match) {
                    const prev = { name: formData.name, gender: formData.gender, position: formData.position, age: formData.age, height: formData.height, weight: formData.weight, years: formData.years, goal: formData.goal, phase: formData.phase, injuryTags: formData.injuryTags, injuryHistory: formData.injuryHistory, weakness: formData.weakness };
                    const fd = match.formData;
                    updateField("name", fd.name);
                    if (fd.gender) updateField("gender", fd.gender);
                    if (fd.position) updateField("position", fd.position);
                    if (fd.age) updateField("age", fd.age);
                    if (fd.height) updateField("height", fd.height);
                    if (fd.weight) updateField("weight", fd.weight);
                    if (fd.years) updateField("years", fd.years);
                    if (fd.goal) updateField("goal", fd.goal);
                    if (fd.phase) updateField("phase", fd.phase);
                    if (fd.injuryTags) updateField("injuryTags", fd.injuryTags);
                    if (fd.injuryHistory) updateField("injuryHistory", fd.injuryHistory);
                    if (fd.weakness) updateField("weakness", fd.weakness);
                    setAutoFillToast({ name: match.name, prevData: prev });
                  }
                  // Fallback: check roster
                  if (!match) {
                    const roster = await getPlayers();
                    const rp = roster.find((p) => p.name === name);
                    if (rp) {
                      const prev = { name: formData.name, age: formData.age, height: formData.height, weight: formData.weight, position: formData.position, injuryTags: formData.injuryTags, injuryHistory: formData.injuryHistory };
                      updateField("name", rp.name);
                      if (rp.age) updateField("age", rp.age);
                      if (rp.height) updateField("height", rp.height);
                      if (rp.weight) updateField("weight", rp.weight);
                      // Map roster position to form position
                      const posMap: Record<string, string> = {
                        "中后卫": "defender", "左后卫": "defender", "右后卫": "defender",
                        "后腰": "midfielder", "中前卫": "midfielder", "前腰": "midfielder",
                        "中锋": "forward", "影锋": "forward", "边锋": "forward",
                        "左边翼卫": "wingback", "右边翼卫": "wingback",
                        "门将": "goalkeeper",
                      };
                      if (posMap[rp.position]) updateField("position", posMap[rp.position]);
                      // Auto-fill injury info with accurate mapping
                      if (rp.injuryStatus !== "healthy") {
                        const statusLabel: Record<string, string> = {
                          "minor": "🟡轻微伤",
                          "out": "🔴重伤",
                        };
                        // Extract injury site from note text (e.g. "右脚踝扭伤" → "ankle")
                        const note = rp.injuryNote || "";
                        const siteMap: [RegExp, string][] = [
                          [/踝|ankle/i, "ankle"], [/膝|knee/i, "knee"],
                          [/髋|hip|groin|腹股沟/i, "hip"], [/肩|shoulder/i, "shoulder"],
                          [/腰|背|waist|back|lumbar/i, "waist"], [/肘|elbow/i, "elbow"],
                          [/腕|wrist/i, "wrist"], [/腿|腘绳|hamstring|thigh|quad/i, "thigh"],
                          [/小腿|calf|shin/i, "calf"], [/跟腱|achilles/i, "achilles"],
                          [/脚|足|foot/i, "foot"],
                        ];
                        const found = siteMap.find(([re]) => re.test(note));
                        const site = found ? found[1] : "thigh";
                        updateField("injuryTags", [site]);
                        updateField("injuryHistory", `${statusLabel[rp.injuryStatus] || "伤病"}: ${note || "花名册记录"}`);
                      }
                      setAutoFillToast({ name: rp.name, prevData: prev });
                    }
                  }
                }}
                placeholder={t("player.name")} maxLength={30} className="input-field text-sm w-full" />
              {profiles.hasProfile(formData.name) && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#992828]">📋 已有档案</span>
              )}
            </div>

            {/* Gender */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => updateField("gender", "male")}
                className={`p-2 rounded-lg text-xs font-medium border transition text-center ${formData.gender==="male"?"border-[#992828] bg-[#992828]/10 text-[#992828]":"border-[#222] text-gray-400"}`}>♂ 男</button>
              <button onClick={() => updateField("gender", "female")}
                className={`p-2 rounded-lg text-xs font-medium border transition text-center ${formData.gender==="female"?"border-[#992828] bg-[#992828]/10 text-[#992828]":"border-[#222] text-gray-400"}`}>♀ 女</button>
            </div>

            {/* Position 3+2 — athletes only, not fitness */}
            {formData.role !== "fitness" && (
            <div>
              <p className="text-[10px] text-gray-400 mb-1.5">{t("player.position")}</p>
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5">
                  {["goalkeeper","defender","midfielder"].map((pos: string) => (
                    <button key={pos} onClick={() => updateField("position", pos)}
                      className={`p-2 rounded-lg text-xs font-medium border transition text-center ${formData.position===pos?"border-[#992828] bg-[#992828]/10 text-[#992828]":"border-[#222] text-gray-400"}`}>{t(`pos.${pos}`)}</button>
                  ))}
                </div>
                <div className="flex justify-center gap-1.5">
                  {["forward","wingback"].map((pos: string) => (
                    <button key={pos} onClick={() => updateField("position", pos)}
                      className={`p-2 rounded-lg text-xs font-medium border transition text-center w-[calc(33.33%-0.25rem)] ${formData.position===pos?"border-[#992828] bg-[#992828]/10 text-[#992828]":"border-[#222] text-gray-400"}`}>{t(`pos.${pos}`)}</button>
                  ))}
                </div>
              </div>
            </div>
            )}

            {/* Sub-position — athletes only, not fitness */}
            {formData.role !== "fitness" && formData.position && SUB_POS[formData.position] && (
              <select value={subPos} onChange={(e: any) => setSubPos(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#222] rounded px-3 py-2 text-sm text-gray-300">
                <option value="">{t("pos."+formData.position)} · 细分（可选）</option>
                {(SUB_POS[formData.position]||[]).map((sp: string) => <option key={sp} value={sp}>{sp}</option>)}
              </select>
            )}

            {/* Age/Height/Weight */}
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={formData.age??""} onChange={(e: any) => updateField("age", e.target.value?Number(e.target.value):null)} placeholder={t("player.age")} className="input-field text-sm" />
              <input type="number" value={formData.height??""} onChange={(e: any) => updateField("height", e.target.value?Number(e.target.value):null)} placeholder={t("player.height")} className="input-field text-sm" />
              <input type="number" value={formData.weight??""} onChange={(e: any) => updateField("weight", e.target.value?Number(e.target.value):null)} placeholder={t("player.weight")} className="input-field text-sm" />
            </div>

            {/* Years */}
            <input type="number" value={formData.years??""} onChange={(e: any) => updateField("years", e.target.value?Number(e.target.value):null)} placeholder={t("player.years")} className="input-field text-sm w-full" />

            {/* Weakness */}
            <input type="text" value={formData.weakness||""} onChange={(e: any) => updateField("weakness", e.target.value)}
              placeholder="我的短板 / 想提升什么（如：核心弱、左脚差、转身慢）" maxLength={100}
              className="input-field text-sm w-full" />
          </>
        ) : (
          /* Coach fields */
          <div className="grid grid-cols-3 gap-2">
            <select value={formData.coachCert||""} onChange={(e: any) => { updateField("coachCert", e.target.value); updateField("coachRole", null); updateField("leagueTag", null); }}
              className="bg-[#1e1e1e] border border-[#222] rounded px-2 py-1 text-xs text-gray-300">
              <option value="" disabled>证书等级</option>
              {["pro","a","b","c","d","none"].map((c: string) => <option key={c} value={c}>{c === "none" ? "NONE" : c.toUpperCase()}</option>)}
            </select>
            <select value={formData.coachRole||""} onChange={(e: any) => updateField("coachRole", e.target.value)}
              className="bg-[#1e1e1e] border border-[#222] rounded px-2 py-1 text-xs text-gray-300" disabled={!formData.coachCert}>
              <option value="" disabled>执教身份</option>
              {["campus","youth","amateur","semi_pro","pro"].map((r: string) => <option key={r} value={r}>{(COACH_ROLE_LABELS as any)[r]}</option>)}
            </select>
            <select value={formData.leagueTag||""} onChange={(e: any) => updateField("leagueTag", e.target.value)}
              className="bg-[#1e1e1e] border border-[#222] rounded px-2 py-1 text-xs text-gray-300" disabled={!formData.coachCert}>
              <option value="" disabled>联赛/梯队</option>
              {["youth_u12","youth_u15","youth_u18","campus_u6_u12","amateur_team","china_league_two","china_league_one","chinese_super_league"].map((l: string) => <option key={l} value={l}>{(LEAGUE_TAG_LABELS as any)[l]}</option>)}
            </select>
          </div>
        )}

        {/* Auto-fill toast with undo */}
        {autoFillToast && (
          <div className="flex items-center justify-between bg-[#992828]/10 border border-[#992828]/20 rounded-lg px-3 py-2">
            <span className="text-xs text-[#992828]">已自动填入「{autoFillToast.name}」的档案</span>
            <button
              onClick={() => {
                if (autoFillToast.prevData) {
                  const prev = autoFillToast.prevData;
                  if (prev.name !== undefined) updateField("name", prev.name);
                  if (prev.gender !== undefined) updateField("gender", prev.gender);
                  if (prev.position !== undefined) updateField("position", prev.position);
                  if (prev.age !== undefined) updateField("age", prev.age);
                  if (prev.height !== undefined) updateField("height", prev.height);
                  if (prev.weight !== undefined) updateField("weight", prev.weight);
                  if (prev.years !== undefined) updateField("years", prev.years);
                  if (prev.goal !== undefined) updateField("goal", prev.goal);
                  if (prev.phase !== undefined) updateField("phase", prev.phase);
                  if (prev.injuryTags !== undefined) updateField("injuryTags", prev.injuryTags);
                  if (prev.injuryHistory !== undefined) updateField("injuryHistory", prev.injuryHistory);
                  if (prev.weakness !== undefined) updateField("weakness", prev.weakness);
                }
                setAutoFillToast(null);
              }}
              className="text-xs text-[#992828] underline hover:text-white transition-colors ml-2 flex-shrink-0"
            >
              撤销
            </button>
          </div>
        )}

        <button onClick={onClose}
          className="w-full py-2 bg-[#992828] text-white font-bold rounded-lg text-sm hover:bg-opacity-90 transition">
          完成
        </button>
      </div>
    </div>
  );
}

const DRAFT_KEY = "kenshin_dashboard_draft";

export function Dashboard({ supabaseProfile, userId }: { supabaseProfile?: SupabaseProfile | null; userId?: string | null }) {
  const wizard = useWizard();
  const training = useTraining();
  const profiles = useProfiles();
  const templates = useTemplates();
  const planHistory = usePlanHistory();
  const { formData, updateField, setRole: setWizardRole, isStepValid, loadProfile: wizardLoadProfile } = wizard;
  const { role, scene, setRole, setScene } = useScene();
  const isCoach = role === "coach";
  const isFitness = role === "fitness";

  // Sync wizard role with scene identity (only when identity changes)
  useEffect(() => {
    if (formData.role !== role) setWizardRole(role);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Auto-clear goals invalid for current scene
  useEffect(() => {
    if (isCoach || isFitness) return;
    if (scene === "pitch") {
      setAthleteGoals(prev => prev.filter(g => g !== "combat"));
    } else if (scene === "gym") {
      setAthleteGoals(prev => prev.filter(g => g !== "speed" && g !== "mas_endurance"));
    }
  }, [scene, isCoach, isFitness]);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [showDone, setShowDone] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [coachInput, setCoachInput] = useState("");
  const [launchTimer, setLaunchTimer] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-detect tactical themes from coach input keywords
  useEffect(() => {
    if (!isCoach || !coachInput.trim()) return;

    const keywordToTheme: Record<string, string> = {
      '防反': 'counterattack',
      '防守': 'defending',
      '反击': 'counterattack',
      '压迫': 'pressing',
      '进攻': 'positional_attack',
      '传控': 'possession',
      '边路': 'crossing',
      '定位球': 'set_pieces',
    };

    const matched: string[] = [];
    for (const [keyword, theme] of Object.entries(keywordToTheme)) {
      if (coachInput.includes(keyword) && !formData.tacticalThemes.includes(theme as any)) {
        matched.push(theme);
      }
    }

    if (matched.length > 0) {
      updateField('tacticalThemes', [...formData.tacticalThemes, ...matched] as any);
    }
  }, [coachInput, isCoach]);

  const [profileName, setProfileName] = useState("");
  const [showProfileSave, setShowProfileSave] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [injOpen, setInjOpen] = useState<Record<string,boolean>>({});
  const [planHistoryOpen, setPlanHistoryOpen] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [showManualSave, setShowManualSave] = useState(false);
  const [manualSaveName, setManualSaveName] = useState("");
  const [fitnessGoals, setFitnessGoals] = useState<string[]>([]);
  const [athleteGoals, setAthleteGoals] = useState<string[]>([]);
  const { t } = useLang();
  const router = useRouter();
  const toggleInjury = (g: string) => setInjOpen((p) => ({...p, [g]: !p[g]}));

  // Onboarding guide
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("kenshin_onboarding_done")) {
      setShowOnboarding(true);
    }
  }, []);

  // Equipment inventory
  const equipmentInv = useEquipmentInventory();

  // Plan compare
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const toggleCompareId = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  // Initialize fitnessGoals from saved formData.goal
  useEffect(() => {
    if (isFitness && formData.goal && fitnessGoals.length === 0) {
      setFitnessGoals([formData.goal as string]);
    }
  }, [isFitness, formData.goal]);

  // Initialize athleteGoals from saved formData.goal (single→multi migration)
  useEffect(() => {
    if (!isCoach && !isFitness && formData.goal && athleteGoals.length === 0) {
      setAthleteGoals([formData.goal as string]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCoach, isFitness, formData.goal]);

  // Restore form draft from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.coachInput) setCoachInput(draft.coachInput);
        if (draft.fitnessGoals) setFitnessGoals(draft.fitnessGoals);
        if (draft.athleteGoals) setAthleteGoals(draft.athleteGoals);
      }
    } catch {}
  }, []);

  // Auto-save form draft to localStorage (debounced 1s)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          coachInput,
          fitnessGoals,
          athleteGoals,
          ts: Date.now(),
        }));
      } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [coachInput, fitnessGoals, athleteGoals]);

  // Restore Supabase profile formData on mount (overrides localStorage)
  useEffect(() => {
    if (supabaseProfile?.form_data && wizard.mounted) {
      const fd = supabaseProfile.form_data;
      wizardLoadProfile(fd);
      // Restore athleteGoals from profile if present
      if ((fd as any).athleteGoals && Array.isArray((fd as any).athleteGoals)) {
        setAthleteGoals((fd as any).athleteGoals);
      } else if (fd.goal && !isCoach && !isFitness) {
        setAthleteGoals([fd.goal as string]);
      }
      // Restore fitnessGoals from profile if present
      if ((fd as any).fitnessGoals && Array.isArray((fd as any).fitnessGoals)) {
        setFitnessGoals((fd as any).fitnessGoals);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseProfile, wizard.mounted]);

  // Sync fitnessGoals to formData.goal for validation
  const updateFitnessGoals = useCallback((goals: string[]) => {
    setFitnessGoals(goals);
    updateField("goal", goals.length > 0 ? (goals[0] as any) : null);
  }, [updateField]);

  const fitnessNutritionUnlocked = status === "complete" || status === "stream-interrupted";

  /** Plans saved for the current player name (case-insensitive) */
  const playerPlans = useMemo(
    () => planHistory.getPlansForPlayer(formData.name || ""),
    [planHistory, formData.name]
  );

  /** Sync current formData to Supabase profiles table (fire-and-forget) */
  const syncToSupabase = useCallback(() => {
    if (!userId) return;
    const fdToSync: any = { ...formData };
    if (!isCoach && !isFitness && athleteGoals.length > 0) fdToSync.athleteGoals = athleteGoals;
    if (isFitness && fitnessGoals.length > 0) fdToSync.fitnessGoals = fitnessGoals;
    syncFormDataToSupabase(userId, fdToSync).catch(() => {});
  }, [userId, formData, isCoach, isFitness, athleteGoals, fitnessGoals]);

  const handleGenerate = useCallback(async () => {
    if (!formData.position && !isCoach && !isFitness) { setValidationError("请先编辑档案，填写场上位置"); setTimeout(()=>setValidationError(null),3000); return; }
    if (isFitness && fitnessGoals.length === 0) { setValidationError("请先选择健身目标"); setTimeout(()=>setValidationError(null),3000); return; }
    if (!isCoach && !isFitness && athleteGoals.length === 0) { setValidationError("请先选择训练目标"); setTimeout(()=>setValidationError(null),3000); return; }
    // Inject fitnessGoals array into formData for AI context
    if (isFitness && fitnessGoals.length > 0) {
      (formData as any).fitnessGoals = fitnessGoals;
    }
    // Inject athleteGoals array into formData for AI context
    if (!isCoach && !isFitness && athleteGoals.length > 0) {
      (formData as any).athleteGoals = athleteGoals;
    }
    // Inject coachInput into formData as weakness/notes for AI context
    if (coachInput.trim()) {
      (formData as any).coachInput = coachInput.trim();
    }
    // Inject equipment inventory counts
    const eqSummary = equipmentInv.getSummaryForSelected(formData.equipmentAvailable || []);
    if (eqSummary) {
      (formData as any).equipmentInventorySummary = eqSummary;
    }
    setStatus("generating"); setErrorCode(null); setShowDone(false); setSavedPlanId(null);

    // Match context — moved to Tactical project

    const timeout = setTimeout(() => { training.reset(); setStatus("error"); setErrorCode("timeout"); }, 80000);
    try {
      await training.generate(formData, (s) => {
        if (s === "complete") { clearTimeout(timeout); return; }
        setStatus(s);
      }, scene);
      clearTimeout(timeout);
      // Only show done animation if we actually got modules
      if (training.modules.length > 0) {
        // Auto-save to plan history with player name
        const name = formData.name?.trim() || (isCoach ? "教练" : "未命名球员");
        const saved = planHistory.savePlan(name, formData, training.modules);
        setSavedPlanId(saved.id);
        // Sync formData to Supabase for next login restore (fire-and-forget)
        syncToSupabase();
        setShowDone(true);
        setTimeout(() => { setShowDone(false); setStatus("complete"); }, 1500);
      } else {
        setStatus("error");
        setErrorCode("empty-response");
      }
    } catch (err: any) { clearTimeout(timeout); setStatus("error"); setErrorCode(err.code || "api-error"); }
  }, [formData, training, isStepValid, planHistory, isCoach]);

  const handleRetry = useCallback(async () => {
    setStatus("generating"); setErrorCode(null);
    await training.retry(); setStatus("complete");
  }, [training]);

  return (
    <div className="space-y-3">

      {/* Scene-aware quick actions — one row, max 2 buttons */}
      {status === "idle" && (
        <div className="flex gap-2 flex-wrap">
          {/* === COACH === */}
          {isCoach && (
            <>
              {/* 训练场: timer + roster */}
              {scene === "pitch" && (
                <>
                  <button onClick={() => { if (training.modules.length > 0) { setLaunchTimer(true); setStatus("complete"); } else { setValidationError("请先进「备课」生成训练方案"); setTimeout(()=>setValidationError(null),3000); } }} className="flex-1 min-w-[100px] bg-[#992828]/10 border border-[#992828]/20 rounded-lg p-2.5 text-left hover:bg-[#992828]/20 transition">
                    <Timer className="w-5 h-5 text-[#992828] mb-1" />
                    <p className="text-xs font-bold text-white">计时跟练</p>
                    <p className="text-[10px] text-gray-400">执行教案</p>
                  </button>
                  <button onClick={() => window.location.href = "/roster"} className="flex-1 min-w-[100px] bg-[#992828]/10 border border-[#992828]/20 rounded-lg p-2.5 text-left hover:bg-[#992828]/20 transition">
                    <ClipboardList className="w-5 h-5 text-[#992828] mb-1" />
                    <p className="text-xs font-bold text-white">花名册</p>
                    <p className="text-[10px] text-gray-400">人数+伤病</p>
                  </button>
                </>
              )}
            </>
          )}

          {/* === ATHLETE: 跟练按钮已统一在方案底部，这里不再显示 === */}
        </div>
      )}


      {/* ====== Idle State ====== */}
      {status === "idle" && (
        <div className="space-y-3">
          {/* Profile Bar */}
          <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl px-3 sm:px-4 py-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="w-8 h-8 rounded-full bg-[#992828]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#992828] text-xs font-bold">{isCoach ? "C" : isFitness ? "F" : "A"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm sm:text-base font-bold truncate">
                  {formData.name || (isCoach ? "教练" : isFitness ? "健身者" : t("dashboard.notSet"))}
                </p>
                <ProfileSummary formData={formData} t={t} />
              </div>
              <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                {/* Identity switch */}
                <div className="flex bg-[#111] rounded-lg p-0.5">
                  <button onClick={() => setRole("coach")}
                    className={"px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition " + (role==="coach"?"bg-[#992828] text-white":"bg-[#1e1e1e] text-[#777]")}>
                    教练
                  </button>
                  <button onClick={() => setRole("athlete")}
                    className={"px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition " + (role==="athlete"?"bg-[#992828] text-white":"bg-[#1e1e1e] text-[#777]")}>
                    球员
                  </button>
                  <button onClick={() => setRole("fitness")}
                    className={"px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition " + (role==="fitness"?"bg-[#992828] text-white":"bg-[#1e1e1e] text-[#777]")}>
                    健身
                  </button>
                </div>
                {/* Scene switch — athlete only */}
                {!isCoach && !isFitness && (
                  <div className="flex bg-[#111] rounded-lg p-0.5">
                    <button onClick={() => setScene("pitch")}
                      className={"px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs font-bold transition flex items-center gap-0.5 " + (scene==="pitch"?"bg-[#992828] text-white":"bg-[#1e1e1e] text-[#777]")}>
                      <MapPin className="w-3 h-3" /><span className="hidden sm:inline">球场</span>
                    </button>
                    <button onClick={() => router.push("/gym")}
                      className="px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs font-bold bg-[#1e1e1e] text-[#777] transition flex items-center gap-0.5">
                      <Dumbbell className="w-3 h-3" /><span className="hidden sm:inline">健身</span>
                    </button>
                  </div>
                )}
                <button onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg border border-[#333] text-gray-400 hover:text-white hover:border-[#555] transition text-[10px] sm:text-xs font-medium">
                  <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />编辑
                </button>
              </div>
            </div>
          </div>

          {/* Goal — for athlete or fitness */}
          {!isCoach && (
            <>
              {/* Selected Items Preview Bar */}
              {((isFitness ? fitnessGoals.length > 0 : isCoach ? formData.goal : athleteGoals.length > 0) || (!isFitness && !isCoach && formData.phase) || formData.injurySites.length > 0) && (
                <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl px-4 py-3">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-gray-400 mr-1">已选：</span>
                    {isFitness ? fitnessGoals.map((gid) => {
                      const g = FITNESS_GOALS.find(fg => fg.id === gid);
                      return (
                        <span key={gid} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#992828]/15 text-[#992828] border border-[#992828]/20">
                          {g?.label || gid}
                          <button onClick={() => updateFitnessGoals(fitnessGoals.filter(x => x !== gid))} className="p-2 hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                        </span>
                      );
                    }) : athleteGoals.map((gid) => (
                      <span key={gid} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#992828]/15 text-[#992828] border border-[#992828]/20">
                        {GOAL_LABELS[gid] || t(`goal.${gid}`)}
                        <button onClick={() => {
                          const next = athleteGoals.filter(x => x !== gid);
                          setAthleteGoals(next);
                          updateField("goal", next.length > 0 ? (next[0] as any) : null);
                        }} className="p-2 hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    {!isFitness && formData.phase && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#992828]/15 text-[#992828] border border-[#992828]/20">
                        {PHASE_LABELS[formData.phase] || t(`phase.${formData.phase}`)}
                        <button onClick={() => updateField("phase", null)} className="p-2 hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {formData.injurySites.map((s: string) => (
                      <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#992828]/15 text-[#992828] border border-[#992828]/20">
                        {t(`injury.${s}`)}
                        <button onClick={() => updateField("injurySites", formData.injurySites.filter(x => x !== s) as any)} className="p-2 hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Scene selector — athlete picks scene FIRST before goals */}
              {!isCoach && !isFitness && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-gray-500 mr-1">训练场景：</span>
                  <button onClick={() => setScene("pitch")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${scene === "pitch" ? "bg-[#992828] text-white" : "bg-[#1e1e1e] text-[#777] border border-[#222] hover:border-[#444]"}`}>
                    <MapPin className="w-3.5 h-3.5" /> 球场
                  </button>
                  <button onClick={() => setScene("gym")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${scene === "gym" ? "bg-[#992828] text-white" : "bg-[#1e1e1e] text-[#777] border border-[#222] hover:border-[#444]"}`}>
                    <Dumbbell className="w-3.5 h-3.5" /> 体能房
                  </button>
                  <span className="text-[10px] text-gray-600 ml-2">
                    {scene === "pitch" ? "有球训练 · 速度/灵敏" : "体能训练 · 力量/对抗"}
                  </span>
                </div>
              )}

              {/* Gym scene — show gym-specific panel instead of goals */}
              {!isCoach && !isFitness && scene === "gym" ? (
                <div className="bg-[#1e1e1e] border border-[#992828]/20 rounded-2xl p-5 space-y-4">
                  <p className="text-xs text-[#992828] font-bold uppercase tracking-wide">🏋️ 体能房训练</p>
                  {(() => {
                    const age = formData.age || 25;
                    const weight = formData.weight || 70;
                    const height = formData.height || 175;
                    const bmi = weight / ((height / 100) ** 2);
                    const years = formData.years || 1;
                    const isU18 = age < 18;
                    const isO35 = age > 35;
                    const hasInjury = (formData.injurySites || []).length > 0;
                    return (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center bg-[#121212] rounded-lg p-2"><p className="text-[#992828] font-bold text-lg">{age}</p><p className="text-[10px] text-gray-400">年龄</p></div>
                          <div className="text-center bg-[#121212] rounded-lg p-2"><p className="text-[#992828] font-bold text-lg">{bmi.toFixed(1)}</p><p className="text-[10px] text-gray-400">BMI</p></div>
                          <div className="text-center bg-[#121212] rounded-lg p-2"><p className="text-[#992828] font-bold text-lg">{years}年</p><p className="text-[10px] text-gray-400">训练年限</p></div>
                        </div>
                        {isU18 && <p className="text-xs text-amber-400">未成年，禁止大重量(&gt;85%1RM)，专注动作质量</p>}
                        {isO35 && <p className="text-xs text-amber-400">热身延长至20min，关节保护优先</p>}
                        {hasInjury && <p className="text-xs text-red-400">检测到伤病部位，训练时避开直接负重</p>}
                      </>
                    );
                  })()}
                  <div className="text-xs text-gray-400">
                    选择下方训练目标后生成健身房方案。可用目标：力量、爆发力、灵敏、对抗。
                  </div>
                </div>
              ) : null}

              {/* Position Quick-Select — athlete only, not fitness */}
              {!isFitness && (
                <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-[#992828]" />
                    <p className="text-xs font-bold text-white">{t("player.position")}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { label: "门将", value: "goalkeeper" },
                      { label: "边后卫", value: "wingback" },
                      { label: "中后卫", value: "defender" },
                      { label: "中场", value: "midfielder" },
                      { label: "边锋", value: "forward" },
                      { label: "中锋", value: "forward" },
                    ] as const).map(({ label, value }) => {
                      const isSelected = formData.position === value;
                      return (
                        <button
                          key={label}
                          onClick={() => updateField("position", value)}
                          className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-all duration-150 border ${
                            isSelected
                              ? "bg-[#992828] text-white border-[#992828]"
                              : "bg-[#1e1e1e] text-[#777] border-[#222] hover:border-[#992828]/30"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={isFitness ? "" : "grid grid-cols-2 gap-3"}>
                {/* Left: Training Goals */}
                <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3"><Target className="w-5 h-5 text-[#992828]" /><p className="text-sm font-bold text-white">{isFitness ? "健身目标" : t("goal.title")}</p></div>
                  <div className="space-y-2">
                    {isFitness ? (
                      <div className="grid grid-cols-3 gap-2">
                        {FITNESS_GOALS.map((g) => {
                          const isSelected = fitnessGoals.includes(g.id);
                          return (
                            <button key={g.id} onClick={() => {
                              const next = isSelected ? fitnessGoals.filter(x => x !== g.id) : [...fitnessGoals, g.id];
                              updateFitnessGoals(next);
                            }}
                              className={`text-left rounded-lg p-3 transition-all duration-150 border ${
                                isSelected
                                  ? "bg-[#281a1a] border-[#992828]/40"
                                  : "bg-[#1e1e1e] border-[#222] hover:border-[#992828]/20"
                              }`}>
                              <span className={`block text-sm font-bold ${isSelected ? "text-[#992828]" : "text-[#999]"}`}>{g.label}</span>
                              <span className={`block text-[10px] mt-0.5 ${isSelected ? "text-[#992828]/70" : "text-[#666]"}`}>{g.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : GOALS.filter(g => {
                        // Scene-aware goal filtering
                        if (!isCoach && !isFitness) {
                          if (scene === "pitch" && g === "combat") return false; // 对抗需要搭档，球场单人不可练
                          if (scene === "gym" && (g === "speed" || g === "mas_endurance")) return false; // 速度需要跑道 耐力不符合足球专项
                        }
                        return true;
                      }).map((g) => {
                      const isSelected = athleteGoals.includes(g);
                      const isHighlighted = formData.phase ? PHASE_TO_GOAL_HIGHLIGHT[formData.phase]?.includes(g) : false;
                      return (
                        <button key={g} onClick={() => {
                          const next = isSelected ? athleteGoals.filter(x => x !== g) : [...athleteGoals, g];
                          setAthleteGoals(next);
                          updateField("goal", next.length > 0 ? (next[0] as any) : null);
                          // Auto-suggest phase based on first selected goal
                          if (!formData.phase && next.length > 0 && GOAL_TO_PHASE_SUGGEST[next[0]]) {
                            updateField("phase", GOAL_TO_PHASE_SUGGEST[next[0]] as any);
                          }
                        }}
                          className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 border ${
                            isSelected
                              ? "bg-[#992828] text-white border-[#992828]"
                              : isHighlighted
                                ? "bg-[#1e1e1e] text-gray-300 border-[#992828]/40"
                                : "bg-[#1e1e1e] text-gray-400 border-transparent hover:border-[#992828]/30"
                          }`}>
                          {GOAL_LABELS[g] || t(`goal.${g}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Season Phase — athletes only */}
                {!isFitness && (
                <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3"><Clock className="w-5 h-5 text-[#992828]" /><p className="text-sm font-bold text-white">{t("phase.title")}</p></div>
                  <div className="space-y-2">
                    {PHASES.map((p) => {
                      const isSelected = formData.phase === p;
                      return (
                        <button key={p} onClick={() => updateField("phase", p)}
                          className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 border ${
                            isSelected
                              ? "bg-[#992828] text-white border-[#992828]"
                              : "bg-[#1e1e1e] text-gray-400 border-transparent hover:border-[#992828]/30"
                          }`}>
                          {PHASE_LABELS[p] || t(`phase.${p}`)}
                        </button>
                      );
                    })}
                  </div>
                  {/* Smart filter hint */}
                  {formData.phase && PHASE_HINT_TEXT[formData.phase] && (
                    <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">{PHASE_HINT_TEXT[formData.phase]}</p>
                  )}
                </div>
                )}
              </div>
            </>
          )}

          {/* Injury — collapsible accordion */}
          {!isCoach && (
            <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-4">
              <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleInjury("_main")}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚠️</span>
                  <p className="text-xs font-bold text-white">伤病情况</p>
                  {formData.injurySites.length > 0 && <span className="text-[10px] text-[#992828]">{formData.injurySites.length}处</span>}
                </div>
                <span className="text-[10px] text-gray-400 transition-transform duration-200" style={{transform: injOpen["_main"] ? "rotate(180deg)" : "rotate(0deg)"}}>▼</span>
              </div>
              {injOpen["_main"] && (
                <div className="mt-2 space-y-1.5">
                  {Object.entries(INJURY_GROUPS).map(([group, sites]) => (
                    <div key={group} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 w-8 flex-shrink-0">{group}</span>
                      <div className="flex flex-wrap gap-1">
                        {sites.map((s: string) => {
                          const active = formData.injurySites.includes(s as any);
                          return (
                            <button key={s} onClick={() => { const next = active ? formData.injurySites.filter((x: any) => x!==s) : [...formData.injurySites, s as any]; updateField("injurySites", next as any); }}
                              className={`px-3 py-1.5 min-h-[44px] rounded text-[10px] transition-all duration-150 ${active?"bg-[#992828]/15 text-[#992828] border border-[#992828]/20":"bg-[#1e1e1e] text-gray-400 hover:bg-[#222]"}`}>{t(`injury.${s}`)}</button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <textarea value={formData.injuryHistory} onChange={(e) => updateField("injuryHistory", e.target.value)} placeholder={t("player.injuryPlaceholder")} className="input-field text-[10px] mt-1 h-10 resize-none w-full" maxLength={200} />
                </div>
              )}
            </div>
          )}

          {/* Fitness: Nutrition Card */}
          {isFitness && (
            <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-4">
              <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                🥗 营养方案
                {!fitnessNutritionUnlocked && <span className="text-[10px] text-gray-400 font-normal">— 生成训练后解锁</span>}
              </h3>
              {fitnessNutritionUnlocked && training.modules.length > 0 ? (
                <div className="space-y-2">
                  {(() => {
                    const posModule = training.modules.find((m: any) => m.module === "position_training") as any;
                    if (posModule?.nutrition) {
                      const n = posModule.nutrition;
                      const sections = [
                        { key: "pre_training", label: "🌅 训练前" },
                        { key: "post_training", label: "🔋 训练后" },
                        { key: "daily_plan", label: "🍽️ 日常饮食" },
                        { key: "hydration", label: "💧 补水" },
                        { key: "supplements", label: "💊 补剂" },
                      ] as const;
                      return (
                        <>
                          {sections.map(({ key, label }) => {
                            const content = n[key];
                            if (!content) return null;
                            return (
                              <div key={key} className="bg-[#121212] rounded-lg p-2.5 border-l-2 border-[#992828]">
                                <p className="text-[10px] text-[#992828] font-bold mb-1">{label}</p>
                                <p className="text-[11px] text-[#d1d1d1]">{content}</p>
                              </div>
                            );
                          })}
                        </>
                      );
                    }
                    return <p className="text-xs text-gray-400">该方案暂未包含营养数据，重新生成即可获取个性化营养建议。</p>;
                  })()}
                </div>
              ) : (
                <p className="text-xs text-gray-400">完成训练方案生成后，AI 将根据你的健身目标自动生成个性化营养建议。</p>
              )}
            </div>
          )}

          {/* Coach: Tactical Themes — tag pills */}
          {isCoach && (
            <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-3">
              <p className="text-sm font-bold text-white mb-2">战术主题</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(TACTICAL_THEME_LABELS).map(([k, v]) => {
                  const active = formData.tacticalThemes.includes(k as any);
                  return (
                    <button key={k} onClick={() => { const next = active ? formData.tacticalThemes.filter((x) => x!==k) : [...formData.tacticalThemes, k]; updateField("tacticalThemes", next as any); }}
                      className={`px-3 py-1.5 min-h-[36px] rounded text-sm font-medium transition-all duration-150 border ${
                        active
                          ? "bg-[#992828] border-[#992828] text-white"
                          : "bg-[#1e1e1e] border-transparent text-[#777]"
                      }`}>{v}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Equipment selector — coach only */}
          {isCoach && (
            <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-3">
                {"可选器材（不选则AI自动推荐）"}
                {formData.equipmentAvailable?.length > 0 && (
                  <span className="text-[#992828] ml-2">{formData.equipmentAvailable.length} 项已选</span>
                )}
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                {[
                  { n:"标志盘",  color:"#e8780a" },
                  { n:"标志桶",  color:"#e8780a" },
                  { n:"标志杆",  color:"#e8c800" },
                  { n:"号坎",    color:"#4a90d9" },
                  { n:"足球",    color:"#ffffff" },
                  { n:"小球门",  color:"#ffffff" },
                  { n:"标准门",  color:"#ffffff" },
                  { n:"小栏架",  color:"#e8780a" },
                  { n:"高栏架",  color:"#e8780a" },
                  { n:"绳梯",    color:"#c8960c" },
                  { n:"敏捷圈",  color:"#4a90d9" },
                  { n:"弹力带",  color:"#e8780a" },
                  { n:"药球",    color:"#992828" },
                  { n:"瑜伽球",  color:"#4a90d9" },
                  { n:"泡沫轴",  color:"#888888" },
                ].map(({ n, color }) => {
                  const act = formData.equipmentAvailable?.includes(n);
                  const iconColor = act ? "#992828" : color;
                  const count = equipmentInv.getCount(n);
                  return (
                    <div key={n} className={`flex flex-col items-center justify-center rounded-lg transition-all duration-150 border py-1.5 relative ${
                      act
                        ? "bg-[#261818] border-[#992828]/30"
                        : "bg-[#1e1e1e] border-[#222] hover:border-[#333]"
                    }`}>
                      <button
                        onClick={() => {
                          const next = act ? formData.equipmentAvailable.filter((x: string) => x !== n) : [...(formData.equipmentAvailable || []), n];
                          updateField("equipmentAvailable", next);
                          if (!act) {
                            equipmentInv.ensureDefault(n);
                          } else {
                            equipmentInv.remove(n);
                          }
                        }}
                        className="flex flex-col items-center justify-center gap-1 w-full"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {n === "标志盘" && <ellipse cx="12" cy="14" rx="9" ry="5" fill={iconColor} opacity={act ? 1 : 0.7} />}
                          {n === "标志桶" && <polygon points="12,4 5,20 19,20" fill={iconColor} opacity={act ? 1 : 0.7} />}
                          {n === "标志杆" && <><rect x="10" y="5" width="4" height="16" rx="2" fill={iconColor} opacity={act ? 1 : 0.7} /><circle cx="12" cy="4" r="3" fill={iconColor} opacity={act ? 1 : 0.7} /></>}
                          {n === "号坎" && <path d="M8 3L16 3L17 7L14 8L12 6.5L10 8L7 7ZM7 7L7 21L10 21L10 12L12 13.5L14 12L14 21L17 21L17 7" fill={iconColor} opacity={act ? 1 : 0.7} />}
                          {n === "足球" && <><circle cx="12" cy="12" r="9" fill={iconColor} opacity={act ? 1 : 0.25} stroke={iconColor} strokeWidth="1.5" /><path d="M12 3L14 7L12 9L10 7ZM12 21L14 17L12 15L10 17ZM3 12L7 10L9 12L7 14ZM21 12L17 10L15 12L17 14Z" fill={iconColor} opacity={act ? 1 : 0.8} /></>}
                          {n === "小球门" && <><rect x="2" y="10" width="20" height="3" rx="1.5" fill={iconColor} opacity={act ? 1 : 0.7} /><rect x="2" y="10" width="3" height="12" rx="1.5" fill={iconColor} opacity={act ? 1 : 0.7} /><rect x="19" y="10" width="3" height="12" rx="1.5" fill={iconColor} opacity={act ? 1 : 0.7} /></>}
                          {n === "标准门" && <><rect x="1" y="3" width="22" height="3" rx="1.5" fill={iconColor} opacity={act ? 1 : 0.7} /><rect x="1" y="3" width="3" height="19" rx="1.5" fill={iconColor} opacity={act ? 1 : 0.7} /><rect x="20" y="3" width="3" height="19" rx="1.5" fill={iconColor} opacity={act ? 1 : 0.7} /></>}
                          {n === "小栏架" && <><rect x="2" y="7" width="20" height="3" rx="1.5" fill={iconColor} opacity={act ? 1 : 0.7} /><rect x="3" y="10" width="3" height="12" rx="1" fill={iconColor} opacity={act ? 1 : 0.7} /><rect x="18" y="10" width="3" height="12" rx="1" fill={iconColor} opacity={act ? 1 : 0.7} /></>}
                          {n === "高栏架" && <><rect x="2" y="4" width="20" height="3" rx="1.5" fill={iconColor} opacity={act ? 1 : 0.7} /><rect x="3" y="7" width="3" height="15" rx="1" fill={iconColor} opacity={act ? 1 : 0.7} /><rect x="18" y="7" width="3" height="15" rx="1" fill={iconColor} opacity={act ? 1 : 0.7} /></>}
                          {n === "绳梯" && <><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke={iconColor} strokeWidth="1.5" opacity={act ? 1 : 0.7} /><line x1="3" y1="9" x2="21" y2="9" stroke={iconColor} strokeWidth="1.5" opacity={act ? 1 : 0.7} /><line x1="3" y1="14" x2="21" y2="14" stroke={iconColor} strokeWidth="1.5" opacity={act ? 1 : 0.7} /></>}
                          {n === "敏捷圈" && <circle cx="12" cy="12" r="7" fill="none" stroke={iconColor} strokeWidth="2.5" opacity={act ? 1 : 0.7} />}
                          {n === "弹力带" && <path d="M4 18 C8 6, 16 18, 20 6" fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" opacity={act ? 1 : 0.7} />}
                          {n === "药球" && <circle cx="12" cy="13" r="8" fill={iconColor} opacity={act ? 1 : 0.7} />}
                          {n === "瑜伽球" && <circle cx="12" cy="12" r="9" fill={iconColor} opacity={act ? 1 : 0.2} stroke={iconColor} strokeWidth="2" />}
                          {n === "泡沫轴" && <rect x="4" y="7" width="16" height="10" rx="5" fill={iconColor} opacity={act ? 1 : 0.7} />}
                        </svg>
                        <span className={`text-[10px] font-medium ${act ? "text-[#992828]" : "text-[#777]"}`}>{n}</span>
                      </button>
                      {/* Count controls — only shown when selected */}
                      {act && (
                        <div className="flex items-center gap-0.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); const c = equipmentInv.getCount(n); if (c > 1) equipmentInv.setCount(n, c - 1); }}
                            className="p-0.5 text-[#992828] hover:text-white transition-colors"
                            aria-label={`减少${n}数量`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] text-white font-bold min-w-[14px] text-center">{count || equipmentInv.getCount(n) || "?"}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); const c = equipmentInv.getCount(n); equipmentInv.setCount(n, (c || 0) + 1); }}
                            className="p-0.5 text-[#992828] hover:text-white transition-colors"
                            aria-label={`增加${n}数量`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Plan History — idle state */}
          {playerPlans.length > 0 && (
            <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[#992828]" />
                  方案历史
                  {formData.name && (
                    <span className="text-xs text-gray-400 font-normal">· {formData.name}</span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {compareIds.length === 2 && (
                    <button
                      onClick={() => setCompareOpen(true)}
                      className="flex items-center gap-1 px-2 py-1 bg-[#992828]/10 border border-[#992828]/20 text-[#992828] rounded text-[10px] font-medium hover:bg-[#992828]/20 transition"
                    >
                      <GitCompare className="w-3 h-3" />对比选中方案
                    </button>
                  )}
                  <span className="text-[10px] text-gray-400">{playerPlans.length}条记录</span>
                </div>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {playerPlans.slice(0, 8).map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between p-2 rounded hover:bg-[#1e1e1e]/50 transition group">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(plan.id)}
                        onChange={() => toggleCompareId(plan.id)}
                        className="w-4 h-4 accent-[#992828] flex-shrink-0"
                        aria-label={`对比 ${plan.playerName}`}
                      />
                      <button
                        onClick={() => {
                          training.loadModules(plan.modules, plan.formData);
                          setStatus("complete");
                          setErrorCode(null);
                        }}
                        className="text-left flex-1 min-w-0"
                      >
                        <p className="text-xs text-gray-200 truncate">{plan.playerName}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(plan.createdAt).toLocaleString("zh-CN", {
                            month: "numeric", day: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })}
                          {" · "}{plan.modules.length}模块
                        </p>
                      </button>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); planHistory.deletePlan(plan.id); if (compareIds.includes(plan.id)) setCompareIds(prev => prev.filter(id => id !== plan.id)); }}
                      className="text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 p-1 flex-shrink-0"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coach Input — coach only */}
          {isCoach && (
          <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-4 space-y-3">
            {/* Phase quick-select */}
            <div className="flex gap-1 flex-wrap items-center">
              <span className="text-[10px] text-gray-400 mr-1">阶段:</span>
              {PHASES.map(p => (
                <button key={p} onClick={() => updateField("phase", p)}
                  className={`px-3 py-1.5 min-h-[36px] rounded text-[10px] transition-all duration-150 ${formData.phase===p?"bg-[#992828] text-white":"bg-[#1e1e1e] text-gray-400 hover:text-white hover:bg-[#222]"}`}>{PHASE_LABELS[p] || t("phase."+p)}</button>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#992828]" />
                <span className="text-xs text-gray-400">训练人数</span>
                <input type="number" min={1} max={50} defaultValue={formData.playerCount || 11}
                  onChange={(e) => updateField("playerCount", parseInt(e.target.value) || undefined)}
                  className="w-16 px-2 py-1.5 bg-[#121212] border border-[#222] rounded-md text-white text-sm text-center focus:border-[#992828] focus:outline-none" />
              </div>
            </div>
            <textarea
              value={coachInput} onChange={(e) => setCoachInput(e.target.value)}
              placeholder={"今天练什么？\n例：周三对XX队，他们边路快，练防守宽度…"}
              rows={3}
              className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-[#992828] focus:outline-none resize-y min-h-[80px]"
            />
          </div>
          )}

          {/* Training Duration Selector — all roles */}
          <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3"><Timer className="w-5 h-5 text-[#992828]" /><p className="text-sm font-bold text-white">训练时长</p></div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={15}
                max={180}
                step={5}
                value={formData.trainingDuration ?? ""}
                onChange={(e) => updateField("trainingDuration", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="60"
                className="w-20 bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-sm text-white text-center focus:border-[#992828] focus:outline-none"
              />
              <span className="text-sm text-gray-400">分钟</span>
              <div className="flex gap-1.5 ml-2">
                {[45, 60, 90].map((mins) => {
                  const isSelected = (formData.trainingDuration || 60) === mins;
                  return (
                    <button key={mins} onClick={() => updateField("trainingDuration", mins)}
                      className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-all duration-150 border ${
                        isSelected
                          ? "bg-[#992828] text-white border-[#992828]"
                          : "bg-[#1e1e1e] text-[#999] border-[#222] hover:border-[#992828]/30"
                      }`}>{mins}min</button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hint text when generate is disabled */}
          {!isStepValid && !isFitness && (
            <p className="text-center text-xs text-amber-400/90 bg-amber-400/5 border border-amber-400/20 rounded-lg py-2 px-3">
              {isCoach ? "请先点击「编辑」完善教练档案" : "请先填写场上位置"}
            </p>
          )}
          {!isCoach && !isFitness && isStepValid && athleteGoals.length === 0 && (
            <p className="text-center text-xs text-amber-400/90 bg-amber-400/5 border border-amber-400/20 rounded-lg py-2 px-3">
              请先选择训练目标
            </p>
          )}
          {isFitness && fitnessGoals.length === 0 && (
            <p className="text-center text-xs text-amber-400/90 bg-amber-400/5 border border-amber-400/20 rounded-lg py-2 px-3">
              请先选择健身目标
            </p>
          )}

          {/* Validation error */}
          {validationError && (
            <div className="px-4 py-2 bg-[#992828]/10 border border-[#992828]/30 rounded-lg text-sm text-[#992828]">
              {validationError}
            </div>
          )}

          {/* Generate Button */}
          <button onClick={handleGenerate} disabled={isCoach ? !isStepValid : isFitness ? fitnessGoals.length === 0 : (!isStepValid || athleteGoals.length === 0)}
            className={`w-full bg-[#992828] text-white font-bold rounded-xl text-lg hover:scale-[1.02] hover:shadow-lg hover:shadow-[#992828]/30 transition-all duration-200 disabled:bg-[#333] disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2 ${isFitness ? "py-3.5" : "py-5"}`}>
            <Zap className="w-5 h-5" /> {isCoach ? (isStepValid ? "生成训练方案" : "请完善训练配置") : isFitness ? (fitnessGoals.length > 0 ? "生成个人训练方案" : "请选择健身目标") : (isStepValid && athleteGoals.length > 0 ? "生成训练方案" : "请完善训练配置")}
          </button>

          {/* Template Library — quick access */}
          <button onClick={() => setShowTemplates(true)}
            className="w-full py-2.5 text-center text-xs text-gray-400 hover:text-[#992828] transition-colors">
            📁 从模板库套用方案
          </button>

          {/* Save Profile Dialog */}
          {showProfileSave && (
            <div className="bg-[#1e1e1e] border border-[#222] rounded-2xl p-3 flex items-center gap-2">
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="档案名称" className="input-field text-sm flex-1"
                onKeyDown={(e) => { if(e.key==="Enter"&&profileName){ profiles.saveProfile(profileName, wizard.formData); syncToSupabase(); setProfileName(""); setShowProfileSave(false); }}} />
              <button onClick={() => { if(profileName){ profiles.saveProfile(profileName, wizard.formData); syncToSupabase(); setProfileName(""); setShowProfileSave(false); }}}
                className="bg-[#992828] text-white text-xs font-bold px-4 py-2 rounded">保存</button>
            </div>
          )}
        </div>
      )}

      {/* ====== Edit Profile Modal ====== */}
      {editOpen && (
        <EditProfileModal
          formData={formData}
          updateField={updateField}
          setRole={setWizardRole}
          t={t}
          profiles={profiles}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* ====== Generating ====== */}
      {status === "generating" && !showDone && (
        <GeneratingOverlay
          currentModule={training.currentEventName}
          isCoach={isCoach}
          moduleCount={training.modules.length}
          onCancel={() => { training.reset(); setStatus("idle"); }}
        />
      )}

      {/* ====== Completion flash ====== */}
      {showDone && (
        <div className="glass-card p-12 flex flex-col items-center justify-center space-y-6 animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-[#992828]/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#992828]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-white text-xl font-bold">分析完成</p>
          <p className="text-gray-400 text-sm">正在整理训练方案...</p>
        </div>
      )}

      {/* ====== Error ====== */}
      {errorCode && status === "error" && <ErrorAlert code={errorCode} onRetry={handleRetry} hasPartialContent={training.modules.length > 0} onViewPartial={() => setStatus("stream-interrupted")} />}

      {/* ====== Empty Results Fallback ====== */}
      {(status === "complete" || status === "stream-interrupted") && training.modules.length === 0 && !showDone && (
        <div className="glass-card p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#992828]/10 flex items-center justify-center">
            <Zap className="w-8 h-8 text-[#992828]" />
          </div>
          <div>
            <p className="text-white font-bold text-lg mb-1">AI 返回内容为空</p>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              AI 服务未返回有效的训练方案。请检查 API 配置或稍后重试。
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleRetry} className="px-6 py-2.5 bg-[#992828] text-white font-bold rounded-xl text-sm">
              重试生成
            </button>
            <button onClick={() => { training.reset(); setStatus("idle"); setErrorCode(null); }}
              className="px-6 py-2.5 bg-[#1e1e1e] text-gray-300 rounded-xl text-sm hover:bg-[#222] transition">
              返回表单
            </button>
          </div>
        </div>
      )}

      {/* ====== Results ====== */}
      {(status === "streaming" || status === "complete" || status === "stream-interrupted") && training.modules.length > 0 && !showDone && (
        <div className="space-y-6">
          {/* Top bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              {training.fromCache ? (
                <span className="text-sm text-[#992828] font-bold">⚡ 已有方案 · 秒开</span>
              ) : (
                <>
                  <p className="text-white font-bold text-lg">训练方案</p>
                  <p className="text-xs text-gray-400">
                    {status === "streaming" ? `AI 生成中 ${training.modules.length}/${isCoach ? 3 : 5}...` : "✓ 生成完成"}
                  </p>
                  {savedPlanId && status === "complete" && (
                    <p className="text-[10px] text-[#992828] mt-0.5">✓ 已自动保存到方案历史</p>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2 items-center">
              {/* Save current plan button */}
              {status === "complete" && (
                <button
                  onClick={() => { setManualSaveName(formData.name?.trim() || ""); setShowManualSave(true); }}
                  className="flex items-center gap-1 px-3 py-2 bg-[#992828]/10 border border-[#992828]/30 text-[#992828] rounded-lg text-xs hover:bg-[#992828]/20 transition font-medium"
                >
                  <Save className="w-3.5 h-3.5" />保存当前方案
                </button>
              )}
              {/* Plan history dropdown */}
              {playerPlans.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setPlanHistoryOpen(!planHistoryOpen)}
                    className="flex items-center gap-1 px-3 py-2 bg-[#1e1e1e] border border-[#222] text-gray-300 rounded-lg text-xs hover:border-[#992828] transition"
                  >
                    <History className="w-3.5 h-3.5" />
                    方案历史 ({playerPlans.length})
                    <ChevronDown className={`w-3 h-3 transition ${planHistoryOpen ? "rotate-180" : ""}`} />
                  </button>
                  {planHistoryOpen && (
                    <div className="absolute right-0 top-full mt-1 w-80 max-h-60 overflow-y-auto glass-card p-2 z-50 space-y-1">
                      {compareIds.length === 2 && (
                        <button
                          onClick={() => { setCompareOpen(true); setPlanHistoryOpen(false); }}
                          className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-[#992828]/10 border border-[#992828]/20 text-[#992828] rounded text-xs font-medium hover:bg-[#992828]/20 transition mb-1"
                        >
                          <GitCompare className="w-3.5 h-3.5" />对比选中方案
                        </button>
                      )}
                      {playerPlans.map((plan) => (
                        <div key={plan.id} className="flex items-center justify-between p-2 rounded hover:bg-[#1e1e1e]/50 transition group">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={compareIds.includes(plan.id)}
                              onChange={() => toggleCompareId(plan.id)}
                              className="w-4 h-4 accent-[#992828] flex-shrink-0"
                              aria-label={`对比 ${plan.playerName}`}
                            />
                            <button
                              onClick={() => {
                                training.loadModules(plan.modules, plan.formData);
                                setPlanHistoryOpen(false);
                                setStatus("complete");
                              }}
                              className="text-left flex-1 min-w-0"
                            >
                              <p className="text-xs text-gray-200 truncate">
                                {plan.playerName}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {new Date(plan.createdAt).toLocaleString("zh-CN", {
                                  month: "numeric", day: "numeric",
                                  hour: "2-digit", minute: "2-digit"
                                })}
                                {" · "}{plan.modules.length}模块
                              </p>
                            </button>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); planHistory.deletePlan(plan.id); if (compareIds.includes(plan.id)) setCompareIds(prev => prev.filter(id => id !== plan.id)); }}
                            className="text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 p-1"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => { training.reset(); setStatus("idle"); setErrorCode(null); setSavedPlanId(null); }}
                className="px-4 py-2 bg-[#1e1e1e] text-gray-300 rounded-lg text-sm hover:bg-[#222] transition font-medium">
                ← 新建方案
              </button>
            </div>
          </div>

          {/* Manual save dialog */}
          {showManualSave && (
            <div className="glass-card p-3 flex items-center gap-2">
              <input
                value={manualSaveName}
                onChange={(e) => setManualSaveName(e.target.value)}
                placeholder="方案名称（如：季前力量方案v2）"
                className="input-field text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualSaveName.trim()) {
                    planHistory.savePlan(manualSaveName.trim(), formData, training.modules);
                    syncToSupabase();
                    setManualSaveName("");
                    setShowManualSave(false);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (manualSaveName.trim()) {
                    planHistory.savePlan(manualSaveName.trim(), formData, training.modules);
                    syncToSupabase();
                    setManualSaveName("");
                    setShowManualSave(false);
                  }
                }}
                className="bg-[#992828] text-white text-xs font-bold px-4 py-2 rounded"
              >
                保存
              </button>
              <button
                onClick={() => { setShowManualSave(false); setManualSaveName(""); }}
                className="text-gray-400 hover:text-white text-xs px-2"
              >
                取消
              </button>
            </div>
          )}

          <TrainingTabs modules={training.modules} formData={formData} planId={training.planId} onSaveTemplate={() => setShowTemplateSave(true)} launchTimer={launchTimer} onLaunchTimer={() => setLaunchTimer(false)} />
          <button onClick={() => { training.reset(); setStatus("idle"); setErrorCode(null); setSavedPlanId(null); }} className="w-full py-2 bg-[#1e1e1e] text-gray-400 rounded-lg text-sm hover:bg-[#222] transition">← {t("dashboard.newPlan")}</button>
          {!isCoach && <TrainingHistory />}
        </div>
      )}

      {/* Template Save */}
      {showTemplateSave && (
        <div className="glass-card p-3 flex items-center gap-2">
          <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder={t("dashboard.templateName")} className="input-field text-sm flex-1"
            onKeyDown={(e) => { if(e.key==="Enter"&&templateName){ templates.saveTemplate(templateName, wizard.formData, training.modules); setTemplateName(""); setShowTemplateSave(false); }}} />
          <button onClick={() => { if(templateName){ templates.saveTemplate(templateName, wizard.formData, training.modules); setTemplateName(""); setShowTemplateSave(false); }}}
            className="bg-[#992828] text-white text-xs font-bold px-4 py-2 rounded">保存</button>
        </div>
      )}

      {/* Template Library Modal */}
      {showTemplates && (
        <TemplateLibrary
          templates={templates.templates}
          onApply={(tpl) => {
            // Pre-fill form data
            Object.entries(tpl.form_data).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                updateField(key as any, value as any);
              }
            });
            // Load modules directly
            training.loadModules(tpl.plan_content, tpl.form_data);
            setStatus("complete");
            setShowTemplates(false);
          }}
          onDelete={(id) => templates.deleteTemplate(id)}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Onboarding Guide */}
      {showOnboarding && status === "idle" && (
        <OnboardingGuide
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      {/* Plan Compare Modal */}
      {compareOpen && compareIds.length === 2 && (() => {
        const planA = planHistory.loadPlan(compareIds[0]);
        const planB = planHistory.loadPlan(compareIds[1]);
        if (!planA || !planB) return null;
        return (
          <PlanCompareModal
            planA={{
              name: planA.playerName,
              modules: planA.modules,
              date: new Date(planA.createdAt).toLocaleString("zh-CN", {
                month: "numeric", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              }),
            }}
            planB={{
              name: planB.playerName,
              modules: planB.modules,
              date: new Date(planB.createdAt).toLocaleString("zh-CN", {
                month: "numeric", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              }),
            }}
            onClose={() => { setCompareOpen(false); setCompareIds([]); }}
          />
        );
      })()}
    </div>
  );
}
