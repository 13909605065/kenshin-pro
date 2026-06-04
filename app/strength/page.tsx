"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { StrengthTabSwitcher } from "@/components/exercises/StrengthTabSwitcher";
import { FilterBar } from "@/components/exercises/FilterBar";
import { ExerciseCard } from "@/components/exercises/ExerciseCard";
import { ExerciseDetailPanel } from "@/components/exercises/ExerciseDetailPanel";
import { PlanBuilder } from "@/components/exercises/PlanBuilder";
import { useStrengthPlan } from "@/hooks/useStrengthPlan";
import { EXERCISE_LIBRARY } from "@/lib/exercise-data";
import { ExerciseLibItem, BodyPart, Equipment } from "@/lib/strength-types";
import { ArrowLeft, Dumbbell, Zap } from "lucide-react";

type Tab = "library" | "free";

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
    <div className="min-h-screen bg-[#121212]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#121212]/90 backdrop-blur border-b border-[#1e1e1e]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]"
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
                <Dumbbell className="w-5 h-5 text-[#d92525]" />
                动作库
              </h2>
              <p className="text-sm text-gray-400 mt-1">
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
              <div className="text-center py-16 text-gray-400">
                没有匹配的动作
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
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
                <Zap className="w-5 h-5 text-[#d92525]" />
                自由选择
              </h2>
              <p className="text-sm text-gray-400 mt-1">
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
