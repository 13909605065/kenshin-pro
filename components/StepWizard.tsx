"use client";

import { useWizard } from "@/hooks/useWizard";
import { PlayerInfoStep } from "./PlayerInfoStep";
import { TrainingGoalStep } from "./TrainingGoalStep";
import { SeasonPhaseStep } from "./SeasonPhaseStep";
import { InjuryStep } from "./InjuryStep";
import { GeneratingOverlay } from "./GeneratingOverlay";
import { TrainingTabs } from "./TrainingTabs";
import { ErrorAlert } from "./ErrorAlert";
import { useTraining } from "@/hooks/useTraining";
import { useProfiles } from "@/hooks/useProfiles";
import { useTemplates } from "@/hooks/useTemplates";
import { GenerationStatus } from "@/lib/types";
import { TACTICAL_THEME_OPTIONS } from "@/lib/constants";
import { ArrowLeft, ArrowRight, Zap, Check, Save, Bookmark } from "lucide-react";
import { useState, useCallback } from "react";

const ATHLETE_STEPS = ["球员信息", "训练目标", "赛季阶段", "伤病情况"];
const COACH_STEPS = ["教练信息", "战术主题"];

export function StepWizard() {
  const wizard = useWizard();
  const training = useTraining();
  const profiles = useProfiles();
  const templates = useTemplates();
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [showProfileSave, setShowProfileSave] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const { currentStep, formData, errors, nextStep, prevStep, setRole } = wizard;
  const isCoach = formData.role === "coach";
  const STEP_NAMES = isCoach ? COACH_STEPS : ATHLETE_STEPS;
  const totalSteps = isCoach ? 2 : 4;

  const handleSubmit = useCallback(async () => {
    setStatus("generating");
    setErrorCode(null);

    try {
      await training.generate(formData, (newStatus) => {
        setStatus(newStatus);
      });
      setStatus("complete");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setStatus("error");
      setErrorCode(err.code || "api-error");
    }
  }, [formData, training]);

  const handleRetry = useCallback(async () => {
    setStatus("generating");
    setErrorCode(null);
    await training.retry();
    setStatus("complete");
  }, [training]);

  const slogan = wizard.formData.role === "coach"
    ? "Always say something"
    : "Just do it";

  return (
    <div className="space-y-6">
      {/* Motivational Slogan */}
      {status === "idle" && (
        <div className="text-center py-4">
          <p className="text-5xl sm:text-7xl font-black text-white/5 select-none tracking-wide uppercase">
            {slogan}
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEP_NAMES.map((name, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`step-indicator ${
                  analysisComplete || i < currentStep
                    ? "step-done"
                    : i === currentStep
                    ? "step-active"
                    : "step-pending"
                }`}
              >
                {analysisComplete || i < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={`text-xs mt-1 hidden sm:block ${
                  analysisComplete || i <= currentStep ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {name}
              </span>
            </div>
            {i < STEP_NAMES.length - 1 && (
              <div
                className={`w-8 sm:w-16 h-0.5 mx-1 mt-[-16px] ${
                  analysisComplete || i < currentStep ? "bg-[#992828]" : "bg-[#222]"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {errorCode && status === "error" && (
        <ErrorAlert
          code={errorCode}
          onRetry={handleRetry}
          hasPartialContent={training.modules.length > 0}
          onViewPartial={() => setStatus("stream-interrupted")}
        />
      )}

      {/* Stream interrupted */}
      {status === "stream-interrupted" && training.modules.length > 0 && (
        <div className="space-y-6">
          <ErrorAlert code="stream-interrupted" onRetry={handleRetry} />
          <TrainingTabs
            modules={training.modules}
            formData={formData}
            planId={training.planId}
            onSaveTemplate={() => { setShowTemplateSave(true); }}
          />
        </div>
      )}

      {/* Generating overlay */}
      {status === "generating" && (
        <div className="space-y-4">
          <GeneratingOverlay currentModule={training.currentEventName} isCoach={isCoach} />
          <div className="text-center">
            <button onClick={() => window.location.reload()} className="text-xs text-gray-400 hover:text-white transition">
              ← 取消并回到主页
            </button>
          </div>
        </div>
      )}

      {/* Streaming results */}
      {(status === "streaming" || status === "complete") &&
        training.modules.length > 0 && (
          <div className="space-y-6">
            <TrainingTabs
              modules={training.modules}
              formData={formData}
              planId={training.planId}
            />
          </div>
        )}

      {/* Profile Selector + Save */}
      {status === "idle" && profiles.profiles.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {profiles.profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                const loaded = profiles.loadProfile(p.id);
                if (loaded) wizard.reset();
                // After reset, apply loaded data
                Object.entries(loaded!.formData).forEach(([k, v]) => {
                  if (v !== null && v !== undefined && v !== "") {
                    wizard.updateField(k as any, v as any);
                  }
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                profiles.activeId === p.id
                  ? "border-[#992828] text-[#992828] bg-[#992828]/10"
                  : "border-[#222] text-gray-400 hover:border-[#992828]"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Profile Save Dialog */}
      {showProfileSave && (
        <div className="glass-card p-4 flex items-center gap-3">
          <input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="档案名称（如：张三前锋）"
            className="input-field flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && profileName) {
                profiles.saveProfile(profileName, wizard.formData);
                setProfileName("");
                setShowProfileSave(false);
              }
            }}
          />
          <button
            onClick={() => {
              if (profileName) {
                profiles.saveProfile(profileName, wizard.formData);
                setProfileName("");
                setShowProfileSave(false);
              }
            }}
            className="btn-primary text-sm py-2 px-4"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Template Save Dialog */}
      {showTemplateSave && status === "complete" && (
        <div className="glass-card p-4 flex items-center gap-3">
          <input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="模板名称（如：赛前爆发力训练）"
            className="input-field flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && templateName) {
                templates.saveTemplate(templateName, wizard.formData, training.modules);
                setTemplateName("");
                setShowTemplateSave(false);
              }
            }}
          />
          <button
            onClick={() => {
              if (templateName) {
                templates.saveTemplate(templateName, wizard.formData, training.modules);
                setTemplateName("");
                setShowTemplateSave(false);
              }
            }}
            className="btn-primary text-sm py-2 px-4"
          >
            <Bookmark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Wizard Steps */}
      {status === "idle" && (
        <div className="glass-card p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Step {currentStep + 1}/{totalSteps}</span>
            <button
              onClick={() => {
                setShowProfileSave(true);
                setProfileName(profiles.getActive()?.name || "");
              }}
              className="text-xs text-gray-400 hover:text-[#992828] transition flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              保存档案
            </button>
          </div>

          {/* Step 0: Player Info (both roles) */}
          {currentStep === 0 && (
            <PlayerInfoStep
              formData={formData}
              errors={errors}
              onChange={wizard.updateField}
              onSetRole={setRole}
            />
          )}

          {/* Step 1: Goal (athlete) or Tactical Themes (coach) */}
          {currentStep === 1 && !isCoach && (
            <TrainingGoalStep
              selected={formData.goal}
              onChange={(goal) => wizard.updateField("goal", goal)}
              error={errors.goal}
            />
          )}
          {currentStep === 1 && isCoach && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">选择战术主题</h2>
              <p className="text-sm text-gray-400">可多选</p>
              <div className="grid grid-cols-4 gap-2">
                {TACTICAL_THEME_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      const current = formData.tacticalThemes;
                      const next = current.includes(t.value)
                        ? current.filter((s) => s !== t.value)
                        : [...current, t.value];
                      wizard.updateField("tacticalThemes", next as any);
                    }}
                    className={`p-3 rounded-lg text-sm font-medium border transition-all text-center ${
                      formData.tacticalThemes.includes(t.value)
                        ? "border-[#992828] bg-[#992828]/10 text-[#992828]"
                        : "border-[#222] text-gray-400 hover:border-[#992828]"
                    }`}
                  >
                    <span className="block text-xl mb-1">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
              {errors.tacticalThemes && (
                <p className="text-[#992828] text-sm">{errors.tacticalThemes}</p>
              )}
            </div>
          )}
          {/* Step 2: Season Phase */}
          {currentStep === 2 && !isCoach && (
            <SeasonPhaseStep
              selected={formData.phase}
              onChange={(phase) => wizard.updateField("phase", phase)}
              error={errors.phase}
            />
          )}

          {/* Step 3: Injury Analysis */}
          {currentStep === 3 && !isCoach && (
            <InjuryStep
              selected={formData.injurySites}
              onToggle={wizard.toggleInjurySite}
              injuryHistory={formData.injuryHistory}
              onHistoryChange={(val) => wizard.updateField("injuryHistory", val)}
            />
          )}

          {/* Analysis Complete Screen */}
          {analysisComplete && !isCoach && (
            <div className="mt-8 pt-6 border-t border-[#222] text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[#992828]/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-[#992828]" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white">分析完成</h2>
              <p className="text-sm text-gray-400">所有信息已收集完毕，可以查看训练方案</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setAnalysisComplete(false)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  上一步
                </button>
                <button onClick={handleSubmit} className="btn-primary flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  查看训练方案
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          {!analysisComplete && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#222]">
            {currentStep > 0 ? (
              <button onClick={prevStep} className="btn-secondary flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                上一步
              </button>
            ) : (
              <div />
            )}

            {currentStep === 3 && !isCoach ? (
              <button
                onClick={() => setAnalysisComplete(true)}
                className="btn-primary flex items-center gap-2"
              >
                完成分析
                <Check className="w-4 h-4" />
              </button>
            ) : currentStep < totalSteps - 1 ? (
              <button
                onClick={nextStep}
                disabled={!wizard.isStepValid}
                className="btn-primary flex items-center gap-2"
              >
                下一步
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} className="btn-primary flex items-center gap-2">
                <Zap className="w-4 h-4" />
                生成训练方案
              </button>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
