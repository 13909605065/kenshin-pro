"use client";

import { useState } from "react";
import { PlanExercise, ExerciseLibItem } from "@/lib/strength-types";
import { PlanExerciseRow } from "./PlanExerciseRow";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { Plus, Save, Trash2, Clock } from "lucide-react";

interface Props {
  exercises: PlanExercise[];
  planName: string;
  isSaving: boolean;
  onAddExercise: (ex: ExerciseLibItem) => void;
  onUpdateExercise: (index: number, updates: Partial<PlanExercise>) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemoveExercise: (index: number) => void;
  onClearPlan: () => void;
  onSavePlan: (name?: string) => void;
  onNameChange: (name: string) => void;
}

export function PlanBuilder({
  exercises,
  planName,
  isSaving,
  onAddExercise,
  onUpdateExercise,
  onMoveUp,
  onMoveDown,
  onRemoveExercise,
  onClearPlan,
  onSavePlan,
  onNameChange,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const totalRest = exercises.reduce((sum, ex) => sum + ex.rest, 0);
  const estimatedMin = Math.round(
    exercises.reduce((sum, ex) => sum + ex.sets * ex.reps * 3 + ex.rest, 0) / 60
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={planName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="输入计划名称..."
            maxLength={40}
            className="w-full bg-transparent text-lg font-bold text-white placeholder-gray-600 focus:outline-none border-b border-transparent focus:border-[#d92525] transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          {exercises.length > 0 && (
            <>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{estimatedMin}分钟
              </span>
              <span className="text-xs text-gray-600">{exercises.length} 个动作</span>
            </>
          )}
        </div>
      </div>

      {/* Exercise list */}
      {exercises.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[#222] rounded-xl">
          <p className="text-gray-400 text-sm">还没有添加动作</p>
          <p className="text-gray-600 text-xs mt-1">点击「添加动作」开始构建计划</p>
        </div>
      ) : (
        <div className="space-y-2">
          {exercises.map((ex, i) => (
            <PlanExerciseRow
              key={`${ex.id}-${i}`}
              exercise={ex}
              index={i}
              total={exercises.length}
              onUpdate={(updates) => onUpdateExercise(i, updates)}
              onMoveUp={() => onMoveUp(i)}
              onMoveDown={() => onMoveDown(i)}
              onRemove={() => onRemoveExercise(i)}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setPickerOpen(true)}
          className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
        >
          <Plus className="w-4 h-4" />
          添加动作
        </button>

        {exercises.length > 0 && (
          <>
            <button
              onClick={() => onSavePlan()}
              disabled={isSaving}
              className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "保存中..." : "保存计划"}
            </button>
            <button
              onClick={onClearPlan}
              className="text-xs text-gray-400 hover:text-neon-red transition flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              清空
            </button>
          </>
        )}
      </div>

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onAddExercise}
      />
    </div>
  );
}
