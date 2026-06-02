"use client";

import { useState, useMemo } from "react";
import { ExerciseLibItem, BodyPart, Equipment } from "@/lib/strength-types";
import { EXERCISE_LIBRARY } from "@/lib/exercise-data";
import { FilterBar } from "./FilterBar";
import { ExerciseCard } from "./ExerciseCard";
import { ExerciseDetailPanel } from "./ExerciseDetailPanel";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (ex: ExerciseLibItem) => void;
}

export function ExercisePickerModal({ open, onClose, onSelect }: Props) {
  const [bodyPart, setBodyPart] = useState<BodyPart | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [detailEx, setDetailEx] = useState<ExerciseLibItem | null>(null);

  const filtered = useMemo(() => {
    return EXERCISE_LIBRARY.filter((ex) => {
      if (bodyPart !== "all" && ex.body_part !== bodyPart) return false;
      if (equipment !== "all" && ex.equipment !== equipment) return false;
      return true;
    });
  }, [bodyPart, equipment]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-x-auto sm:top-8 sm:bottom-8 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-2xl sm:w-full z-50 bg-pitch-800 border border-pitch-600 rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-pitch-600 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">选择训练动作</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-pitch-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter */}
        <div className="px-5 py-3 border-b border-pitch-600 flex-shrink-0">
          <FilterBar
            bodyPart={bodyPart}
            equipment={equipment}
            onBodyPartChange={setBodyPart}
            onEquipmentChange={setEquipment}
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              没有匹配的动作
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filtered.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  onView={setDetailEx}
                  onAdd={(e) => { onSelect(e); onClose(); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel overlay */}
        <ExerciseDetailPanel
          exercise={detailEx}
          onClose={() => setDetailEx(null)}
          onAdd={(e) => { onSelect(e); setDetailEx(null); onClose(); }}
        />
      </div>

      {/* Footer hint */}
      <p className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 text-white/30 text-xs">
        点击 Esc 或背景关闭
      </p>
    </>
  );
}
