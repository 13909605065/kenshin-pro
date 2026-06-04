"use client";

import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { CustomExercise, CustomBodyPart, CustomEquipment, CustomDifficulty } from "@/hooks/useCustomExercises";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (ex: Omit<CustomExercise, "id">) => void;
  editingExercise?: CustomExercise | null;
}

const BODY_PART_OPTIONS: { value: CustomBodyPart; label: string }[] = [
  { value: "下肢", label: "下肢" },
  { value: "上肢推", label: "上肢推" },
  { value: "上肢拉", label: "上肢拉" },
  { value: "核心", label: "核心" },
  { value: "全身", label: "全身" },
];

const EQUIPMENT_OPTIONS: { value: CustomEquipment; label: string }[] = [
  { value: "杠铃", label: "杠铃" },
  { value: "哑铃", label: "哑铃" },
  { value: "壶铃", label: "壶铃" },
  { value: "自重", label: "自重" },
  { value: "弹力带", label: "弹力带" },
  { value: "药球", label: "药球" },
  { value: "波速球", label: "波速球" },
  { value: "其他", label: "其他" },
];

const DIFFICULTY_OPTIONS: { value: CustomDifficulty; label: string }[] = [
  { value: "初级", label: "初级" },
  { value: "中级", label: "中级" },
  { value: "高级", label: "高级" },
];

function parseCuePoints(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export function AddExerciseModal({ open, onClose, onSave, editingExercise }: Props) {
  const isEditing = !!editingExercise;

  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState<CustomBodyPart>("全身");
  const [equipment, setEquipment] = useState<CustomEquipment>("自重");
  const [difficulty, setDifficulty] = useState<CustomDifficulty>("中级");
  const [description, setDescription] = useState("");
  const [setsMin, setSetsMin] = useState<number | undefined>(undefined);
  const [setsMax, setSetsMax] = useState<number | undefined>(undefined);
  const [repsMin, setRepsMin] = useState<number | undefined>(undefined);
  const [repsMax, setRepsMax] = useState<number | undefined>(undefined);
  const [restMin, setRestMin] = useState<number | undefined>(undefined);
  const [restMax, setRestMax] = useState<number | undefined>(undefined);
  const [cuePointsText, setCuePointsText] = useState("");
  const [progression, setProgression] = useState("");
  const [regression, setRegression] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (editingExercise) {
      setName(editingExercise.name);
      setBodyPart(editingExercise.body_part);
      setEquipment(editingExercise.equipment);
      setDifficulty(editingExercise.difficulty);
      setDescription(editingExercise.description || "");
      setSetsMin(editingExercise.sets_min);
      setSetsMax(editingExercise.sets_max);
      setRepsMin(editingExercise.reps_min);
      setRepsMax(editingExercise.reps_max);
      setRestMin(editingExercise.rest_min);
      setRestMax(editingExercise.rest_max);
      setCuePointsText((editingExercise.cue_points || []).join("\n"));
      setProgression(editingExercise.progression || "");
      setRegression(editingExercise.regression || "");
      setImageUrl(editingExercise.image_url || "");
      setErrorMsg(null);
    } else {
      setName("");
      setBodyPart("全身");
      setEquipment("自重");
      setDifficulty("中级");
      setDescription("");
      setSetsMin(undefined);
      setSetsMax(undefined);
      setRepsMin(undefined);
      setRepsMax(undefined);
      setRestMin(undefined);
      setRestMax(undefined);
      setCuePointsText("");
      setProgression("");
      setRegression("");
      setImageUrl("");
    }
  }, [editingExercise, open]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setErrorMsg("请输入动作名称");
      return;
    }

    const ex: Omit<CustomExercise, "id"> = {
      name: name.trim(),
      body_part: bodyPart,
      equipment: equipment,
      difficulty: difficulty,
      description: description.trim(),
      sets_min: setsMin,
      sets_max: setsMax,
      reps_min: repsMin,
      reps_max: repsMax,
      rest_min: restMin,
      rest_max: restMax,
      cue_points: parseCuePoints(cuePointsText),
      progression: progression.trim(),
      regression: regression.trim(),
      image_url: imageUrl.trim() || undefined,
    };

    onSave(ex);
    onClose();
  };

  if (!open) return null;

  const inputClass =
    "w-full bg-[#1e1e1e] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d92525] transition-colors";
  const labelClass = "text-xs text-gray-400 font-medium mb-1 block";
  const selectClass =
    "w-full bg-[#1e1e1e] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d92525] transition-colors appearance-none cursor-pointer";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-x-auto sm:top-6 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg sm:w-full z-50 bg-[#1e1e1e] border border-[#222] rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222] flex-shrink-0">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? "编辑自定义动作" : "添加自定义动作"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 动作名称 */}
          <div>
            <label className={labelClass}>
              动作名称 <span className="text-[#d92525]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：杠铃反向弓步"
              className={inputClass}
            />
          </div>

          {/* 身体部位 + 器械 + 难度 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>身体部位</label>
              <select
                value={bodyPart}
                onChange={(e) => setBodyPart(e.target.value as CustomBodyPart)}
                className={selectClass}
              >
                {BODY_PART_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>器械</label>
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value as CustomEquipment)}
                className={selectClass}
              >
                {EQUIPMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>难度</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as CustomDifficulty)}
                className={selectClass}
              >
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className={labelClass}>描述</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简短描述动作..."
              className={inputClass}
            />
          </div>

          {/* 组数 + 次数 + 间歇 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>组数范围</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={setsMin ?? ""}
                  onChange={(e) =>
                    setSetsMin(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="3"
                  min={1}
                  max={20}
                  className={`${inputClass} w-full text-center`}
                />
                <span className="text-gray-400 text-xs">-</span>
                <input
                  type="number"
                  value={setsMax ?? ""}
                  onChange={(e) =>
                    setSetsMax(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="5"
                  min={1}
                  max={20}
                  className={`${inputClass} w-full text-center`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>次数范围</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={repsMin ?? ""}
                  onChange={(e) =>
                    setRepsMin(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="8"
                  min={1}
                  max={100}
                  className={`${inputClass} w-full text-center`}
                />
                <span className="text-gray-400 text-xs">-</span>
                <input
                  type="number"
                  value={repsMax ?? ""}
                  onChange={(e) =>
                    setRepsMax(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="12"
                  min={1}
                  max={100}
                  className={`${inputClass} w-full text-center`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>间歇秒数</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={restMin ?? ""}
                  onChange={(e) =>
                    setRestMin(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="60"
                  min={0}
                  max={600}
                  className={`${inputClass} w-full text-center`}
                />
                <span className="text-gray-400 text-xs">-</span>
                <input
                  type="number"
                  value={restMax ?? ""}
                  onChange={(e) =>
                    setRestMax(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="90"
                  min={0}
                  max={600}
                  className={`${inputClass} w-full text-center`}
                />
              </div>
            </div>
          </div>

          {/* 要点 */}
          <div>
            <label className={labelClass}>动作要点（每行一个）</label>
            <textarea
              value={cuePointsText}
              onChange={(e) => setCuePointsText(e.target.value)}
              placeholder={"例：\n保持核心收紧\n膝关节与脚尖方向一致\n控制离心阶段"}
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* 进阶 + 退阶 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>进阶动作</label>
              <input
                type="text"
                value={progression}
                onChange={(e) => setProgression(e.target.value)}
                placeholder="更难的变式..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>退阶动作</label>
              <input
                type="text"
                value={regression}
                onChange={(e) => setRegression(e.target.value)}
                placeholder="更易的变式..."
                className={inputClass}
              />
            </div>
          </div>

          {/* 图片URL */}
          <div>
            <label className={labelClass}>图片URL（可选）</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#222] flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-[#d92525] text-white text-sm font-bold rounded-lg hover:opacity-90 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {isEditing ? "保存修改" : "保存"}
          </button>
        </div>
        {errorMsg && (
          <p className="text-sm text-[#d92525] mt-2">{errorMsg}</p>
        )}
      </div>
    </>
  );
}
