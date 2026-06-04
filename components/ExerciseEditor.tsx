"use client";

import { useState } from "react";
import { X } from "lucide-react";

export interface EditableExercise {
  name: string;
  sets: number;
  reps: number;
  load: string;
  rest: number;
  rpe: number;
}

interface Props {
  exercise: EditableExercise;
  onSave: (updated: EditableExercise) => void;
  onCancel: () => void;
}

export function ExerciseEditor({ exercise, onSave, onCancel }: Props) {
  const [form, setForm] = useState<EditableExercise>({ ...exercise });

  const handleChange = (field: keyof EditableExercise, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-[#1e1e1e] border border-[#333] rounded-xl p-5 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-sm">编辑训练动作</h3>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-white rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field
            label="动作名称"
            value={form.name}
            onChange={(v) => handleChange("name", v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="组数"
              value={form.sets}
              onChange={(v) => handleChange("sets", Number(v))}
              type="number"
              min={1}
            />
            <Field
              label="次数"
              value={form.reps}
              onChange={(v) => handleChange("reps", Number(v))}
              type="number"
              min={1}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="负荷"
              value={form.load}
              onChange={(v) => handleChange("load", v)}
            />
            <Field
              label="间歇(s)"
              value={form.rest}
              onChange={(v) => handleChange("rest", Number(v))}
              type="number"
              min={0}
            />
          </div>
          <Field
            label="RPE (1-10)"
            value={form.rpe}
            onChange={(v) => handleChange("rpe", Number(v))}
            type="number"
            min={1}
            max={10}
          />
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-xs bg-[#222] border border-[#444] text-gray-300 hover:bg-[#2a2a2a] transition"
          >
            取消
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex-1 py-2 rounded-lg text-xs bg-[#d92525] text-white font-bold hover:bg-[#b91d1d] transition active:scale-[0.98]"
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-[10px] text-gray-400 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#d92525] focus:outline-none transition"
      />
    </div>
  );
}
