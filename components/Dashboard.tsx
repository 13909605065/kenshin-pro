"use client";

import { useState, useCallback } from "react";
import { useWizard } from "@/hooks/useWizard";
import { useTraining } from "@/hooks/useTraining";
import { useProfiles } from "@/hooks/useProfiles";
import { useTemplates } from "@/hooks/useTemplates";
import { TrainingTabs } from "./TrainingTabs";
import { GeneratingOverlay } from "./GeneratingOverlay";
import { ErrorAlert } from "./ErrorAlert";
import { GenerationStatus } from "@/lib/types";
import { TACTICAL_THEME_LABELS, COACH_ROLE_LABELS, LEAGUE_TAG_LABELS } from "@/lib/constants";
import { useLang } from "@/lib/i18n/LanguageContext";
import { Zap, Edit3, X, Target, Clock, Activity } from "lucide-react";

const GOALS = ["strength","power","speed","agility","mas_endurance","combat"] as const;
const PHASES = ["preseason","competition","recovery","offseason"] as const;

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
  if (isCoach) {
    const parts = [
      formData.coachCert && (formData.coachCert === "none" ? "NONE" : formData.coachCert.toUpperCase()),
      formData.coachRole && (COACH_ROLE_LABELS as any)[formData.coachRole],
      formData.leagueTag && (LEAGUE_TAG_LABELS as any)[formData.leagueTag],
    ].filter(Boolean);
    return <span className="text-xs text-gray-400">教练 · {parts.join(" / ") || "未设置"}</span>;
  }
  const parts = [
    formData.gender === "female" ? "♀" : "♂",
    formData.position && t(`pos.${formData.position}`),
    formData.age && `${formData.age}岁`,
    formData.height && `${formData.height}cm`,
    formData.weight && `${formData.weight}kg`,
  ].filter(Boolean);
  return <span className="text-xs text-gray-400">{parts.join(" · ")}</span>;
}

function EditProfileModal({ formData, updateField, setRole, t, onClose }: any) {
  const [subPos, setSubPos] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="glass-card p-5 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">{t("player.title")}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Role switch */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setRole("athlete")}
            className={`p-2 rounded-lg text-xs font-medium border transition text-center ${formData.role==="athlete"?"border-neon-pink bg-neon-pink/10 text-neon-pink":"border-pitch-600 text-gray-400"}`}>
            {t("player.roleAthlete")}</button>
          <button onClick={() => setRole("coach")}
            className={`p-2 rounded-lg text-xs font-medium border transition text-center ${formData.role==="coach"?"border-neon-pink bg-neon-pink/10 text-neon-pink":"border-pitch-600 text-gray-400"}`}>
            {t("player.roleCoach")}</button>
        </div>

        {formData.role === "athlete" ? (
          <>
            {/* Name */}
            <input type="text" value={formData.name} onChange={(e: any) => updateField("name", e.target.value)}
              placeholder={t("player.name")} maxLength={30} className="input-field text-sm w-full" />

            {/* Gender */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => updateField("gender", "male")}
                className={`p-2 rounded-lg text-xs font-medium border transition text-center ${formData.gender==="male"?"border-neon-pink bg-neon-pink/10 text-neon-pink":"border-pitch-600 text-gray-400"}`}>♂ 男</button>
              <button onClick={() => updateField("gender", "female")}
                className={`p-2 rounded-lg text-xs font-medium border transition text-center ${formData.gender==="female"?"border-neon-pink bg-neon-pink/10 text-neon-pink":"border-pitch-600 text-gray-400"}`}>♀ 女</button>
            </div>

            {/* Position 3+2 */}
            <div>
              <p className="text-[10px] text-gray-500 mb-1.5">{t("player.position")}</p>
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5">
                  {["goalkeeper","defender","midfielder"].map((pos: string) => (
                    <button key={pos} onClick={() => updateField("position", pos)}
                      className={`p-2 rounded-lg text-xs font-medium border transition text-center ${formData.position===pos?"border-neon-pink bg-neon-pink/10 text-neon-pink":"border-pitch-600 text-gray-400"}`}>{t(`pos.${pos}`)}</button>
                  ))}
                </div>
                <div className="flex justify-center gap-1.5">
                  {["forward","wingback"].map((pos: string) => (
                    <button key={pos} onClick={() => updateField("position", pos)}
                      className={`p-2 rounded-lg text-xs font-medium border transition text-center w-[calc(33.33%-0.25rem)] ${formData.position===pos?"border-neon-pink bg-neon-pink/10 text-neon-pink":"border-pitch-600 text-gray-400"}`}>{t(`pos.${pos}`)}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sub-position */}
            {formData.position && SUB_POS[formData.position] && (
              <select value={subPos} onChange={(e: any) => setSubPos(e.target.value)}
                className="w-full bg-pitch-700 border border-pitch-600 rounded px-3 py-2 text-sm text-gray-300">
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
          </>
        ) : (
          /* Coach fields */
          <div className="grid grid-cols-3 gap-2">
            <select value={formData.coachCert||""} onChange={(e: any) => { updateField("coachCert", e.target.value); updateField("coachRole", null); updateField("leagueTag", null); }}
              className="bg-pitch-700 border border-pitch-600 rounded px-2 py-1 text-xs text-gray-300">
              <option value="" disabled>证书等级</option>
              {["pro","a","b","c","d","none"].map((c: string) => <option key={c} value={c}>{c === "none" ? "NONE" : c.toUpperCase()}</option>)}
            </select>
            <select value={formData.coachRole||""} onChange={(e: any) => updateField("coachRole", e.target.value)}
              className="bg-pitch-700 border border-pitch-600 rounded px-2 py-1 text-xs text-gray-300" disabled={!formData.coachCert}>
              <option value="" disabled>执教身份</option>
              {["campus","youth","amateur","semi_pro","pro"].map((r: string) => <option key={r} value={r}>{(COACH_ROLE_LABELS as any)[r]}</option>)}
            </select>
            <select value={formData.leagueTag||""} onChange={(e: any) => updateField("leagueTag", e.target.value)}
              className="bg-pitch-700 border border-pitch-600 rounded px-2 py-1 text-xs text-gray-300" disabled={!formData.coachCert}>
              <option value="" disabled>联赛/梯队</option>
              {["youth_u12","youth_u15","youth_u18","campus_u6_u12","amateur_team","china_league_two","china_league_one","chinese_super_league"].map((l: string) => <option key={l} value={l}>{(LEAGUE_TAG_LABELS as any)[l]}</option>)}
            </select>
          </div>
        )}

        <button onClick={onClose}
          className="w-full py-2 bg-neon-pink text-black font-bold rounded-lg text-sm hover:bg-opacity-90 transition">
          完成
        </button>
      </div>
    </div>
  );
}

export function Dashboard() {
  const wizard = useWizard();
  const training = useTraining();
  const profiles = useProfiles();
  const templates = useTemplates();
  const { formData, updateField, setRole, isStepValid } = wizard;
  const isCoach = formData.role === "coach";

  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [showDone, setShowDone] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [showProfileSave, setShowProfileSave] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [injOpen, setInjOpen] = useState<Record<string,boolean>>({});
  const { t } = useLang();
  const toggleInjury = (g: string) => setInjOpen((p) => ({...p, [g]: !p[g]}));

  const handleGenerate = useCallback(async () => {
    if (!isStepValid) return;
    setStatus("generating"); setErrorCode(null); setShowDone(false);
    const timeout = setTimeout(() => { training.reset(); setStatus("error"); setErrorCode("timeout"); }, 80000);
    try {
      await training.generate(formData, (s) => {
        if (s === "complete") { clearTimeout(timeout); return; }
        setStatus(s);
      });
      clearTimeout(timeout);
      // Only show done animation if we actually got modules
      if (training.modules.length > 0) {
        setShowDone(true);
        setTimeout(() => { setShowDone(false); setStatus("complete"); }, 1500);
      } else {
        setStatus("error");
        setErrorCode("empty-response");
      }
    } catch (err: any) { clearTimeout(timeout); setStatus("error"); setErrorCode(err.code || "api-error"); }
  }, [formData, training, isStepValid]);

  const handleRetry = useCallback(async () => {
    setStatus("generating"); setErrorCode(null);
    await training.retry(); setStatus("complete");
  }, [training]);

  return (
    <div className="space-y-4">
      {/* ====== Idle State ====== */}
      {status === "idle" && (
        <div className="space-y-3">
          {/* Profile Bar — compact */}
          <div className="glass-card px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-neon-pink/20 flex items-center justify-center flex-shrink-0">
                <span className="text-neon-pink text-xs font-bold">{isCoach ? "C" : "A"}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-bold truncate">
                  {formData.name || (isCoach ? "教练" : (formData.position ? t(`pos.${formData.position}`) : t("dashboard.notSet")))}
                </p>
                <ProfileSummary formData={formData} t={t} />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {profiles.profiles.length > 0 && (
                <select onChange={(e: any) => { if(e.target.value) profiles.loadProfile(e.target.value); }}
                  className="bg-pitch-700 border border-pitch-600 rounded px-2 py-1 text-[10px] text-gray-300 max-w-[100px]" defaultValue="">
                  <option value="" disabled>档案</option>
                  {profiles.profiles.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <button onClick={() => setEditOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-pitch-500 text-gray-400 hover:text-white hover:border-pitch-400 transition text-xs">
                <Edit3 className="w-3.5 h-3.5" />编辑
              </button>
            </div>
          </div>

          {/* Goal */}
          {!isCoach && (
            <div className="glass-card p-4 flex items-center gap-4">
              <div className="flex items-center gap-2 flex-shrink-0 min-w-[80px]"><Target className="w-5 h-5 text-neon-pink" /><p className="text-sm font-bold text-white">{t("goal.title")}</p></div>
              <div className="flex flex-wrap gap-2 flex-1">
                {GOALS.map((g) => (
                  <button key={g} onClick={() => updateField("goal", g)} className={`px-4 py-2 rounded-lg text-xs font-medium transition ${formData.goal===g?"bg-neon-pink text-black":"bg-pitch-700 text-gray-400 hover:bg-pitch-600"}`}>{t(`goal.${g}`)}</button>
                ))}
              </div>
            </div>
          )}

          {/* Phase */}
          {!isCoach && (
            <div className="glass-card p-4 flex items-center gap-4">
              <div className="flex items-center gap-2 flex-shrink-0 min-w-[80px]"><Clock className="w-5 h-5 text-neon-pink" /><p className="text-sm font-bold text-white">{t("phase.title")}</p></div>
              <div className="flex flex-wrap gap-2 flex-1">
                {PHASES.map((p) => (
                  <button key={p} onClick={() => updateField("phase", p)} className={`px-4 py-2 rounded-lg text-xs font-medium transition ${formData.phase===p?"bg-neon-pink text-black":"bg-pitch-700 text-gray-400 hover:bg-pitch-600"}`}>{t(`phase.${p}`)}</button>
                ))}
              </div>
            </div>
          )}

          {/* Injury — fold */}
          {!isCoach && (
            <div className="glass-card p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleInjury("_main")}>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-neon-pink" />
                  <p className="text-xs font-bold text-white">{t("injury.title")}</p>
                  {formData.injurySites.length > 0 && <span className="text-[10px] text-neon-red">{formData.injurySites.length}处</span>}
                </div>
                <span className="text-[10px] text-gray-500">{injOpen["_main"] ? "▲" : "▼"}</span>
              </div>
              {injOpen["_main"] && (
                <div className="mt-2 space-y-1.5">
                  {Object.entries(INJURY_GROUPS).map(([group, sites]) => (
                    <div key={group} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 w-8 flex-shrink-0">{group}</span>
                      <div className="flex flex-wrap gap-1">
                        {sites.map((s: string) => {
                          const active = formData.injurySites.includes(s as any);
                          return (
                            <button key={s} onClick={() => { const next = active ? formData.injurySites.filter((x: any) => x!==s) : [...formData.injurySites, s as any]; updateField("injurySites", next as any); }}
                              className={`px-2 py-0.5 rounded text-[10px] transition ${active?"bg-neon-red/20 text-neon-red border border-neon-red/30":"bg-pitch-700 text-gray-500 hover:bg-pitch-600"}`}>{t(`injury.${s}`)}</button>
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

          {/* Coach: Tactical Themes — tag pills */}
          {isCoach && (
            <div className="glass-card p-4">
              <p className="text-sm font-bold text-white mb-3">战术主题</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TACTICAL_THEME_LABELS).map(([k, v]) => {
                  const active = formData.tacticalThemes.includes(k as any);
                  return (
                    <button key={k} onClick={() => { const next = active ? formData.tacticalThemes.filter((x) => x!==k) : [...formData.tacticalThemes, k]; updateField("tacticalThemes", next as any); }}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition border ${
                        active
                          ? "bg-neon-pink border-neon-pink text-black"
                          : "bg-pitch-700 border-pitch-600 text-gray-300 hover:border-pitch-500"
                      }`}>{v}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button onClick={handleGenerate} disabled={!isStepValid}
            className="w-full py-3 bg-neon-pink text-black font-bold rounded-xl text-lg hover:bg-opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <Zap className="w-5 h-5" /> {t("dashboard.generate")}
          </button>

          {/* Save Profile Dialog */}
          {showProfileSave && (
            <div className="glass-card p-3 flex items-center gap-2">
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="档案名称" className="input-field text-sm flex-1"
                onKeyDown={(e) => { if(e.key==="Enter"&&profileName){ profiles.saveProfile(profileName, wizard.formData); setProfileName(""); setShowProfileSave(false); }}} />
              <button onClick={() => { if(profileName){ profiles.saveProfile(profileName, wizard.formData); setProfileName(""); setShowProfileSave(false); }}}
                className="bg-neon-pink text-black text-xs font-bold px-4 py-2 rounded">保存</button>
            </div>
          )}
        </div>
      )}

      {/* ====== Edit Profile Modal ====== */}
      {editOpen && (
        <EditProfileModal
          formData={formData}
          updateField={updateField}
          setRole={setRole}
          t={t}
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
          <div className="w-16 h-16 rounded-full bg-neon-pink/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-neon-pink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-white text-xl font-bold">分析完成</p>
          <p className="text-gray-500 text-sm">正在整理训练方案...</p>
        </div>
      )}

      {/* ====== Error ====== */}
      {errorCode && status === "error" && <ErrorAlert code={errorCode} onRetry={handleRetry} hasPartialContent={training.modules.length > 0} onViewPartial={() => setStatus("stream-interrupted")} />}

      {/* ====== Empty Results Fallback ====== */}
      {(status === "complete" || status === "stream-interrupted") && training.modules.length === 0 && !showDone && (
        <div className="glass-card p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-neon-pink/10 flex items-center justify-center">
            <Zap className="w-8 h-8 text-neon-pink" />
          </div>
          <div>
            <p className="text-white font-bold text-lg mb-1">AI 返回内容为空</p>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              AI 服务未返回有效的训练方案。请检查 API 配置或稍后重试。
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleRetry} className="px-6 py-2.5 bg-neon-pink text-black font-bold rounded-xl text-sm">
              重试生成
            </button>
            <button onClick={() => { training.reset(); setStatus("idle"); setErrorCode(null); }}
              className="px-6 py-2.5 bg-pitch-700 text-gray-300 rounded-xl text-sm hover:bg-pitch-600 transition">
              返回表单
            </button>
          </div>
        </div>
      )}

      {/* ====== Results ====== */}
      {(status === "streaming" || status === "complete" || status === "stream-interrupted") && training.modules.length > 0 && !showDone && (
        <div className="space-y-6">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div>
              {training.fromCache ? (
                <span className="text-sm text-neon-pink font-bold">⚡ 已有方案 · 秒开</span>
              ) : (
                <>
                  <p className="text-white font-bold text-lg">训练方案</p>
                  <p className="text-xs text-gray-500">
                    {status === "streaming" ? `AI 生成中 ${training.modules.length}/5...` : "✓ 生成完成"}
                  </p>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { training.reset(); setStatus("idle"); setErrorCode(null); }}
                className="px-4 py-2 bg-pitch-700 text-gray-300 rounded-lg text-sm hover:bg-pitch-600 transition font-medium">
                ← 新建方案
              </button>
            </div>
          </div>
          <TrainingTabs modules={training.modules} formData={formData} planId={training.planId} onSaveTemplate={() => setShowTemplateSave(true)} />
          <button onClick={() => { training.reset(); setStatus("idle"); setErrorCode(null); }} className="w-full py-2 bg-pitch-700 text-gray-400 rounded-lg text-sm hover:bg-pitch-600 transition">← {t("dashboard.newPlan")}</button>
        </div>
      )}

      {/* Template Save */}
      {showTemplateSave && (
        <div className="glass-card p-3 flex items-center gap-2">
          <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder={t("dashboard.templateName")} className="input-field text-sm flex-1"
            onKeyDown={(e) => { if(e.key==="Enter"&&templateName){ templates.saveTemplate(templateName, wizard.formData, training.modules); setTemplateName(""); setShowTemplateSave(false); }}} />
          <button onClick={() => { if(templateName){ templates.saveTemplate(templateName, wizard.formData, training.modules); setTemplateName(""); setShowTemplateSave(false); }}}
            className="bg-neon-pink text-black text-xs font-bold px-4 py-2 rounded">保存</button>
        </div>
      )}
    </div>
  );
}
