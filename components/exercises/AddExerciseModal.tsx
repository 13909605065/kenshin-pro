"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Plus, AlertTriangle, Ban, ListChecks, FileText } from "lucide-react";
import { CustomExercise, CustomBodyPart, CustomEquipment } from "@/hooks/useCustomExercises";
import { STRENGTH_LIBRARY } from "@/lib/training-library";

// ─── Similarity detection ──────────────────────────────────

function charJaccard(a: string, b: string): number {
  const aArr = a.replace(/\s/g, "").split("");
  const bArr = b.replace(/\s/g, "").split("");
  const aSet = new Set(aArr);
  const bSet = new Set(bArr);
  let intersection = 0;
  let union = 0;
  const allChars = new Set<string>();
  aArr.forEach(c => allChars.add(c));
  bArr.forEach(c => allChars.add(c));
  union = allChars.size;
  Array.from(aSet).forEach(c => { if (bSet.has(c)) intersection++; });
  return union === 0 ? 0 : intersection / union;
}

function findSimilar(name: string, existing: string[]): { exact: string[]; similar: string[] } {
  const t = name.trim();
  if (!t) return { exact: [], similar: [] };
  const exact: string[] = [];
  const similar: string[] = [];
  for (const n of existing) {
    if (n === t) { exact.push(n); continue; }
    if (t.includes(n) || n.includes(t)) { similar.push(n); continue; }
    if (charJaccard(t, n) >= 0.6) { similar.push(n); }
  }
  return { exact, similar };
}

// ─── Batch import helpers ──────────────────────────────────

interface BatchRow {
  name: string;
  equipment: CustomEquipment;
  bodyPart: CustomBodyPart;
  cues: string;
  progression: string;
  regression: string;
}

/** Fuzzy map a Chinese equipment string to CustomEquipment */
function fuzzyEquipment(raw: string): CustomEquipment {
  const t = raw.trim();
  if (/杠铃|barbell/.test(t)) return "杠铃";
  if (/哑铃|dumbbell/.test(t)) return "哑铃";
  if (/壶铃|kettlebell/.test(t)) return "壶铃";
  if (/弹力带|阻力带|band/.test(t)) return "弹力带";
  if (/药球|med.*ball|medicine/.test(t)) return "药球";
  if (/波速|bosu/.test(t)) return "波速球";
  if (/自重|体重|bodyweight|body/.test(t)) return "自重";
  return "其他";
}

/** Fuzzy map a Chinese body part string to CustomBodyPart */
function fuzzyBodyPart(raw: string): CustomBodyPart {
  const t = raw.trim();
  if (/上半身|上肢|upper|胸|背|肩|臂|手|肱|三头|二头/.test(t)) return "上半身";
  if (/下半身|下肢|lower|腿|膝|髋|臀|glute|腘|小腿|大腿/.test(t)) return "下半身";
  return "全身";
}

/** Parse tab-separated text into BatchRow[] */
function parseBatch(text: string): { rows: BatchRow[]; errors: string[] } {
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l);
  if (lines.length === 0) return { rows: [], errors: ["请粘贴至少一行数据"] };

  const errors: string[] = [];
  let dataLines = lines;

  // Auto-detect header row: if first line contains keywords like 动作/名称/器械/要点
  const first = lines[0];
  const headerKeywords = /动作|名称|器械|要点|进阶|退阶|部位/;
  const hasHeader = headerKeywords.test(first) && lines.length > 1;
  if (hasHeader) {
    dataLines = lines.slice(1);
  }

  const rows: BatchRow[] = [];
  for (let i = 0; i < dataLines.length; i++) {
    const cols = dataLines[i].split(/\t/).map(c => c.trim());
    const name = cols[0] || "";
    if (!name) {
      errors.push(`第${i + 1}行：缺少动作名称，已跳过`);
      continue;
    }
    rows.push({
      name,
      equipment: fuzzyEquipment(cols[1] || ""),
      bodyPart: fuzzyBodyPart(cols[2] || ""),
      cues: cols[3] || "",
      progression: cols[4] || "",
      regression: cols[5] || "",
    });
  }
  return { rows, errors };
}

// ─── Props ─────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (ex: Omit<CustomExercise, "id">) => void;
  onBatchSave: (exercises: Omit<CustomExercise, "id">[]) => void;
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

// ─── Component ─────────────────────────────────────────────

export function AddExerciseModal({ open, onClose, onSave, onBatchSave, editingExercise }: Props) {
  const isEditing = !!editingExercise;

  // ─── Mode ────────────────────────────────────────────
  const [mode, setMode] = useState<"single" | "batch">("single");

  // ─── Single mode state ───────────────────────────────
  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState<CustomBodyPart>("全身");
  const [equipment, setEquipment] = useState<CustomEquipment>("自重");
  const [cuePointsText, setCuePointsText] = useState("");
  const [progression, setProgression] = useState("");
  const [regression, setRegression] = useState("");
  const [imageBase64, setImageBase64] = useState<string>("");

  // ─── Batch mode state ────────────────────────────────
  const [batchText, setBatchText] = useState("");
  const [batchPreview, setBatchPreview] = useState<BatchRow[]>([]);
  const [batchErrors, setBatchErrors] = useState<string[]>([]);
  const [batchParsed, setBatchParsed] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ─── Build existing names list (built-in + custom) ────
  const existingNames = useMemo(() => {
    const names: string[] = [];
    for (const ex of Object.values(STRENGTH_LIBRARY)) {
      names.push(ex.name);
    }
    try {
      const custom = JSON.parse(localStorage.getItem("kenshin_custom_exercises") || "[]");
      custom.forEach((ce: any) => {
        if (!editingExercise || ce.id !== editingExercise.id) {
          names.push(ce.name);
        }
      });
    } catch {}
    return names;
  }, [editingExercise]);

  // ─── Single: real-time similarity check ──────────────
  const dupCheck = useMemo(() => {
    if (!name.trim()) return { exact: [] as string[], similar: [] as string[] };
    return findSimilar(name, existingNames);
  }, [name, existingNames]);

  // ─── Batch: dup check for all parsed rows ────────────
  const batchDupCheck = useMemo(() => {
    return batchPreview.map(row => findSimilar(row.name, existingNames));
  }, [batchPreview, existingNames]);

  // ─── Reset on open / mode switch ─────────────────────
  useEffect(() => {
    if (editingExercise) {
      setName(editingExercise.name);
      setBodyPart(editingExercise.body_part);
      setEquipment(editingExercise.equipment);
      setCuePointsText((editingExercise.cue_points || []).join("\n"));
      setProgression(editingExercise.progression || "");
      setRegression(editingExercise.regression || "");
      setErrorMsg(null);
      setMode("single");
    } else {
      setName("");
      setBodyPart("全身");
      setEquipment("自重");
      setCuePointsText("");
      setProgression("");
      setRegression("");
      setImageBase64("");
      setBatchText("");
      setBatchPreview([]);
      setBatchErrors([]);
      setBatchParsed(false);
    }
  }, [editingExercise, open]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ─── Single submit ───────────────────────────────────
  const handleSubmit = () => {
    if (!name.trim()) {
      setErrorMsg("请输入动作名称");
      return;
    }
    const dup = findSimilar(name, existingNames);
    if (dup.exact.length > 0 && !isEditing) {
      setErrorMsg(`动作「${dup.exact[0]}」已存在，请勿重复添加`);
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

  // ─── Batch: parse preview ────────────────────────────
  const handleBatchParse = () => {
    const { rows, errors } = parseBatch(batchText);
    setBatchPreview(rows);
    setBatchErrors(errors);
    setBatchParsed(true);
    if (rows.length === 0 && errors.length === 0) {
      setErrorMsg("未能解析到任何动作，请检查格式");
    } else {
      setErrorMsg(null);
    }
  };

  // ─── Batch: submit all ───────────────────────────────
  const handleBatchSubmit = () => {
    if (batchPreview.length === 0) {
      setErrorMsg("没有可导入的动作");
      return;
    }
    // Filter out exact duplicates
    const toImport: Omit<CustomExercise, "id">[] = [];
    const skipped: string[] = [];
    for (let i = 0; i < batchPreview.length; i++) {
      const row = batchPreview[i];
      const dup = batchDupCheck[i];
      if (dup.exact.length > 0) {
        skipped.push(row.name);
        continue;
      }
      toImport.push({
        name: row.name,
        body_part: row.bodyPart,
        equipment: row.equipment,
        difficulty: "中级",
        description: "",
        cue_points: row.cues ? row.cues.split(/[,，;；]/).map(s => s.trim()).filter(s => s) : [],
        progression: row.progression,
        regression: row.regression,
      });
    }
    if (toImport.length === 0) {
      setErrorMsg(`全部${skipped.length}个动作均已存在，未导入`);
      return;
    }
    onBatchSave(toImport);
    if (skipped.length > 0) {
      setErrorMsg(`已导入${toImport.length}个，跳过${skipped.length}个重复：${skipped.join("、")}`);
      setTimeout(() => setErrorMsg(null), 4000);
      // Don't close — let user see the result
    } else {
      onClose();
    }
  };

  if (!open) return null;

  const inputClass = "w-full bg-[#1e1e1e] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#992828] transition-colors";
  const labelClass = "text-xs text-gray-400 font-medium mb-1 block";
  const selectClass = "w-full bg-[#1e1e1e] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#992828] transition-colors appearance-none cursor-pointer";

  return (
    <>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-4 sm:inset-x-auto sm:top-4 sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg sm:w-full z-50 bg-[#1e1e1e] border border-[#222] rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222] flex-shrink-0">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? "编辑动作" : "添加动作"}
          </h2>
          <div className="flex items-center gap-1">
            {/* Mode tabs — only when not editing */}
            {!isEditing && (
              <div className="flex bg-[#111] rounded-lg p-0.5 mr-2">
                <button
                  onClick={() => { setMode("single"); setErrorMsg(null); }}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition ${mode === "single" ? "bg-[#992828] text-white" : "text-gray-400 hover:text-white"}`}
                >
                  单个添加
                </button>
                <button
                  onClick={() => { setMode("batch"); setErrorMsg(null); setBatchParsed(false); }}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition ${mode === "batch" ? "bg-[#992828] text-white" : "text-gray-400 hover:text-white"}`}
                >
                  批量导入
                </button>
              </div>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* ═══════════════════════════════════════════════
              SINGLE MODE
              ═══════════════════════════════════════════════ */}
          {mode === "single" && (
            <>
              <div>
                <label className={labelClass}>动作名称 <span className="text-[#992828]">*</span></label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="例：杠铃反向弓步" className={inputClass} />
                {dupCheck.exact.length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-[#992828]/10 border border-[#992828]/30 flex items-start gap-2">
                    <Ban className="w-3.5 h-3.5 text-[#992828] mt-0.5 shrink-0" />
                    <div className="text-xs text-[#992828]">
                      <span className="font-bold">重复动作：</span>
                      动作库中已存在「{dupCheck.exact.join("」、「")}」
                    </div>
                  </div>
                )}
                {dupCheck.similar.length > 0 && dupCheck.exact.length === 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-yellow-400">
                      <span className="font-bold">可能重复：</span>
                      与「{dupCheck.similar.slice(0, 5).join("」、「")}」
                      {dupCheck.similar.length > 5 && `等${dupCheck.similar.length}个`} 高度相似
                    </div>
                  </div>
                )}
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
            </>
          )}

          {/* ═══════════════════════════════════════════════
              BATCH MODE
              ═══════════════════════════════════════════════ */}
          {mode === "batch" && (
            <>
              {/* Format hint */}
              <div className="p-3 rounded-lg bg-[#111] border border-[#333] text-[10px] text-gray-500 space-y-1">
                <p className="text-gray-400 font-medium flex items-center gap-1">
                  <FileText className="w-3 h-3" /> 粘贴表格数据（从 Excel / Sheets 复制）
                </p>
                <p>列顺序：<span className="text-gray-300">动作名称</span> → 器械 → 身体部位 → 动作要点 → 进阶 → 退阶</p>
                <p>每行一个动作，列之间用 <span className="text-gray-300">Tab</span> 分隔（从 Excel 粘贴自动生成）</p>
                <p className="text-gray-600">器械/部位可留空，系统自动识别</p>
              </div>

              {/* Paste area */}
              <div>
                <label className={labelClass}>粘贴数据</label>
                <textarea
                  value={batchText}
                  onChange={e => { setBatchText(e.target.value); setBatchParsed(false); }}
                  placeholder={"杠铃深蹲\t杠铃\t下半身\t背部挺直,核心收紧\t单腿深蹲\t箱式深蹲\n哑铃弯举\t哑铃\t上半身\t顶峰收缩,控制离心\t锤式弯举\t\n悬吊划船\t悬吊\t上半身\t肩胛收紧\t单臂划船\t"}
                  rows={8}
                  className={`${inputClass} resize-none font-mono text-xs`}
                />
              </div>

              {/* Parse button */}
              {!batchParsed && (
                <button
                  onClick={handleBatchParse}
                  disabled={!batchText.trim()}
                  className="w-full py-2 bg-[#222] border border-[#444] text-gray-300 text-xs font-medium rounded-lg hover:bg-[#333] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  解析预览
                </button>
              )}

              {/* Batch errors */}
              {batchErrors.length > 0 && (
                <div className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-[10px] text-yellow-400">
                  {batchErrors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}

              {/* Preview table */}
              {batchParsed && batchPreview.length > 0 && (
                <div>
                  <label className={labelClass}>
                    <ListChecks className="w-3 h-3 inline mr-1" />
                    预览 — 共 <span className="text-white font-bold">{batchPreview.length}</span> 个动作
                  </label>
                  <div className="overflow-x-auto rounded-lg border border-[#333] max-h-60">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[#111] text-gray-400 text-[10px]">
                          <th className="text-left px-2 py-1.5 font-medium">#</th>
                          <th className="text-left px-2 py-1.5 font-medium">动作名称</th>
                          <th className="text-left px-2 py-1.5 font-medium">器械</th>
                          <th className="text-left px-2 py-1.5 font-medium">部位</th>
                          <th className="text-left px-2 py-1.5 font-medium">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchPreview.map((row, i) => {
                          const dup = batchDupCheck[i];
                          return (
                            <tr key={i} className={`border-t border-[#222] ${dup.exact.length > 0 ? "bg-[#992828]/5" : "bg-[#1a1a1a]"}`}>
                              <td className="px-2 py-1.5 text-gray-500">{i + 1}</td>
                              <td className="px-2 py-1.5 text-white">{row.name}</td>
                              <td className="px-2 py-1.5 text-gray-300">{row.equipment}</td>
                              <td className="px-2 py-1.5 text-gray-300">{row.bodyPart}</td>
                              <td className="px-2 py-1.5">
                                {dup.exact.length > 0 ? (
                                  <span className="text-[10px] text-[#992828] font-medium">重复，将跳过</span>
                                ) : dup.similar.length > 0 ? (
                                  <span className="text-[10px] text-yellow-400 font-medium">相似「{dup.similar[0]}」</span>
                                ) : (
                                  <span className="text-[10px] text-green-400 font-medium">✓ 新动作</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Reparse */}
              {batchParsed && (
                <button
                  onClick={() => { setBatchParsed(false); setBatchPreview([]); setBatchErrors([]); }}
                  className="w-full py-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition"
                >
                  重新解析
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#222] flex-shrink-0">
          {errorMsg && errorMsg.includes("已导入") ? (
            <p className="text-xs text-green-400">{errorMsg}</p>
          ) : errorMsg ? (
            <p className="text-xs text-[#992828]">{errorMsg}</p>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]">取消</button>
            {mode === "single" ? (
              <button onClick={handleSubmit} className="px-5 py-2 bg-[#992828] text-white text-sm font-bold rounded-lg hover:opacity-90 transition flex items-center gap-1.5">
                <Plus className="w-4 h-4" />{isEditing ? "保存" : "保存"}
              </button>
            ) : batchParsed && batchPreview.length > 0 ? (
              <button onClick={handleBatchSubmit} className="px-5 py-2 bg-[#992828] text-white text-sm font-bold rounded-lg hover:opacity-90 transition flex items-center gap-1.5">
                <Plus className="w-4 h-4" />导入 {batchPreview.filter((_, i) => batchDupCheck[i].exact.length === 0).length} 个动作
              </button>
            ) : (
              <button onClick={handleBatchParse} disabled={!batchText.trim()} className="px-5 py-2 bg-[#992828] text-white text-sm font-bold rounded-lg hover:opacity-90 transition flex items-center gap-1.5 disabled:opacity-40">
                解析预览
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
