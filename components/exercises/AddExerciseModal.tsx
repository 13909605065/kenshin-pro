"use client";

import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { CustomExercise, CustomBodyPart, CustomEquipment } from "@/hooks/useCustomExercises";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (ex: Omit<CustomExercise, "id">) => void;
  editingExercise?: CustomExercise | null;
}

const BODY_PART_OPTIONS: { value: CustomBodyPart; label: string }[] = [
  { value: "上半身", label: "上半身" },
  { value: "下半身", label: "下半身" },
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

export function AddExerciseModal({ open, onClose, onSave, editingExercise }: Props) {
  const isEditing = !!editingExercise;

  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState<CustomBodyPart>("全身");
  const [equipment, setEquipment] = useState<CustomEquipment>("自重");
  const [cuePointsText, setCuePointsText] = useState("");
  const [progression, setProgression] = useState("");
  const [regression, setRegression] = useState("");
  const [imageBase64, setImageBase64] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingExercise) {
      setName(editingExercise.name);
      setBodyPart(editingExercise.body_part);
      setEquipment(editingExercise.equipment);
      setCuePointsText((editingExercise.cue_points || []).join("\n"));
      setProgression(editingExercise.progression || "");
      setRegression(editingExercise.regression || "");
      setErrorMsg(null);
    } else {
      setName("");
      setBodyPart("全身");
      setEquipment("自重");
      setCuePointsText("");
      setProgression("");
      setRegression("");
      setImageBase64("");
    }
  }, [editingExercise, open]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setErrorMsg("请输入动作名称");
      return;
    }

    const ex: Omit<CustomExercise, "id"> = {
      name: name.trim(),
      body_part: bodyPart,
      equipment: equipment,
      difficulty: "中级",
      description: "",
      cue_points: cuePointsText.split("\n").map(l => l.trim()).filter(l => l),
      progression: progression.trim(),
      regression: regression.trim(),
      image_url: imageBase64 || undefined,
    };

    onSave(ex);
    onClose();
  };

  if (!open) return null;

  const inputClass = "w-full bg-[#1e1e1e] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#992828] transition-colors";
  const labelClass = "text-xs text-gray-400 font-medium mb-1 block";
  const selectClass = "w-full bg-[#1e1e1e] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#992828] transition-colors appearance-none cursor-pointer";

  return (
    <>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-4 sm:inset-x-auto sm:top-6 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md sm:w-full z-50 bg-[#1e1e1e] border border-[#222] rounded-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222] flex-shrink-0">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? "编辑动作" : "添加动作"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className={labelClass}>动作名称 <span className="text-[#992828]">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="例：杠铃反向弓步" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>身体部位</label>
              <select value={bodyPart} onChange={e => setBodyPart(e.target.value as CustomBodyPart)} className={selectClass}>
                {BODY_PART_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>器械</label>
              <select value={equipment} onChange={e => setEquipment(e.target.value as CustomEquipment)} className={selectClass}>
                {EQUIPMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>动作要点（每行一个）</label>
            <textarea value={cuePointsText} onChange={e => setCuePointsText(e.target.value)}
              placeholder={"例：\n保持核心收紧\n膝关节与脚尖方向一致\n控制离心阶段"}
              rows={4} className={`${inputClass} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>进阶变式</label>
              <input type="text" value={progression} onChange={e => setProgression(e.target.value)} placeholder="更难的变式..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>退阶变式</label>
              <input type="text" value={regression} onChange={e => setRegression(e.target.value)} placeholder="更易的变式..." className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>动作图片（可选）</label>
            <label className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-[#333] rounded-lg text-xs text-gray-400 hover:text-white hover:border-[#555] cursor-pointer transition">
              📷 上传图片
              <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
            </label>
            {imageBase64 && (
              <div className="mt-2 relative">
                <img src={imageBase64} className="w-full max-h-32 object-cover rounded-lg" alt="预览" />
                <button onClick={() => setImageBase64("")} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded text-white text-xs">✕</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#222] flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]">取消</button>
          <button onClick={handleSubmit} className="px-5 py-2 bg-[#992828] text-white text-sm font-bold rounded-lg hover:opacity-90 transition flex items-center gap-1.5">
            <Plus className="w-4 h-4" />{isEditing ? "保存" : "保存"}
          </button>
        </div>
        {errorMsg && <p className="text-sm text-[#992828] px-5 pb-3">{errorMsg}</p>}
      </div>
    </>
  );
}
