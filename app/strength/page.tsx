"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { StrengthTabSwitcher } from "@/components/exercises/StrengthTabSwitcher";
import { FilterBar } from "@/components/exercises/FilterBar";
import { ExerciseCard } from "@/components/exercises/ExerciseCard";
import { ExerciseDetailPanel } from "@/components/exercises/ExerciseDetailPanel";
import { PlanBuilder } from "@/components/exercises/PlanBuilder";
import { useStrengthPlan } from "@/hooks/useStrengthPlan";
import { EXERCISE_LIBRARY, STRENGTH_TEMPLATES } from "@/lib/exercise-data";
import { ExerciseLibItem, BodyPart, Equipment, StrengthTemplate } from "@/lib/strength-types";
import { ArrowLeft, Zap, BookOpen } from "lucide-react";

type Tab = "library" | "free" | "templates";

export default function StrengthPage() {
  const router = useRouter();
  const plan = useStrengthPlan();

  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [detailEx, setDetailEx] = useState<ExerciseLibItem | null>(null);

  // Library filters
  const [bodyPart, setBodyPart] = useState<BodyPart | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");

  const filteredLibrary = useMemo(() => {
    return EXERCISE_LIBRARY.filter((ex) => {
      if (bodyPart !== "all" && ex.body_part !== bodyPart) return false;
      if (equipment !== "all" && ex.equipment !== equipment) return false;
      return true;
    });
  }, [bodyPart, equipment]);

  return (
    <div className="min-h-screen bg-pitch-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-pitch-900/90 backdrop-blur border-b border-pitch-700">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-pitch-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-white">力量训练计划</h1>
          </div>
          <StrengthTabSwitcher active={activeTab} onChange={setActiveTab} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* ===== Tab 1: Exercise Library ===== */}
        {activeTab === "library" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-neon-pink" />
                动作库
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                浏览器械力量训练动作，查看要点与进退阶方案
              </p>
            </div>

            <FilterBar
              bodyPart={bodyPart}
              equipment={equipment}
              onBodyPartChange={setBodyPart}
              onEquipmentChange={setEquipment}
            />

            {filteredLibrary.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                没有匹配的动作
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredLibrary.map((ex) => (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    onView={setDetailEx}
                    onAdd={plan.addExercise}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== Tab 2: Free Selection ===== */}
        {activeTab === "free" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-neon-pink" />
                自由选择
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                从动作库中自由选择，自定义组数、次数和负荷参数
              </p>
            </div>
            <PlanBuilder
              exercises={plan.exercises}
              planName={plan.planName}
              isSaving={plan.isSaving}
              onAddExercise={plan.addExercise}
              onUpdateExercise={plan.updateExercise}
              onMoveUp={plan.moveUp}
              onMoveDown={plan.moveDown}
              onRemoveExercise={plan.removeExercise}
              onClearPlan={plan.clearPlan}
              onSavePlan={plan.savePlan}
              onNameChange={plan.setPlanName}
            />
          </div>
        )}

        {/* ===== Tab 3: Templates ===== */}
        {activeTab === "templates" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-neon-pink" />
                推荐模板
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                选择预设训练模板，自动生成完整计划，也可自由调整
              </p>
            </div>

            {/* Template cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {STRENGTH_TEMPLATES.map((tmpl) => {
                const isActive = plan.planName === tmpl.name;
                return (
                  <div
                    key={tmpl.id}
                    className={`glass-card-hover p-5 cursor-pointer transition-all ${
                      isActive ? "border-neon-pink bg-neon-pink/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-white font-bold">{tmpl.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          tmpl.difficulty === "advanced"
                            ? "bg-neon-red/10 text-neon-red border border-neon-red/20"
                            : tmpl.difficulty === "intermediate"
                            ? "bg-neon-gold/10 text-neon-gold border border-neon-gold/20"
                            : "bg-neon-pink/10 text-neon-pink border border-neon-pink/20"
                        }`}
                      >
                        {tmpl.difficulty === "advanced"
                          ? "高级"
                          : tmpl.difficulty === "intermediate"
                          ? "中级"
                          : "初级"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{tmpl.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {tmpl.exercises.length} 个动作
                      </span>
                      <button
                        onClick={() => plan.loadTemplate(tmpl)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? "bg-neon-pink/20 text-neon-pink border border-neon-pink"
                            : "bg-pitch-700 border border-pitch-600 text-gray-300 hover:border-neon-pink hover:text-neon-pink"
                        }`}
                      >
                        {isActive ? "已加载" : "使用模板"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Plan builder (when template loaded) */}
            {plan.exercises.length > 0 && (
              <div className="pt-6 border-t border-pitch-700">
                <PlanBuilder
                  exercises={plan.exercises}
                  planName={plan.planName}
                  isSaving={plan.isSaving}
                  onAddExercise={plan.addExercise}
                  onUpdateExercise={plan.updateExercise}
                  onMoveUp={plan.moveUp}
                  onMoveDown={plan.moveDown}
                  onRemoveExercise={plan.removeExercise}
                  onClearPlan={plan.clearPlan}
                  onSavePlan={plan.savePlan}
                  onNameChange={plan.setPlanName}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Exercise Detail Panel (shared across tabs) */}
      <ExerciseDetailPanel
        exercise={detailEx}
        onClose={() => setDetailEx(null)}
        onAdd={plan.addExercise}
      />
    </div>
  );
}
