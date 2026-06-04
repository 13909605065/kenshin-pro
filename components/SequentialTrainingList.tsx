"use client";

import { useState, useMemo } from "react";
import type { TrainingModule } from "@/lib/types";
import { Check, Timer, Image, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────

interface SeqItem {
  id: string;
  step: number;
  name: string;
  load: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
  phase: string;       // 分区标签（仅首行显示）
  phaseColor: string;  // 色块颜色
  imageUrl?: string;
}

const PHASE_COLORS: Record<string, string> = {
  "Warm-up": "#22c55e",
  "过渡": "#3B82F6",
  "主训": "#16a34a",
  "放松": "#eab308",
};

// ─── Flatten ──────────────────────────────────────────────

function flattenModules(modules: TrainingModule[]): { phases: string[]; rows: (SeqItem | { type: "break"; label: string })[] } {
  const rows: (SeqItem | { type: "break"; label: string })[] = [];
  let step = 0;

  const add = (phase: string, color: string, name: string, load: string, sets: string, reps: string, rest: string, notes: string, imageUrl?: string) => {
    step++;
    rows.push({ id: `s${step}`, step, phase, phaseColor: color, name, load, sets, reps, rest, notes, imageUrl });
  };

  modules.forEach((mod: any) => {
    // ── Warmup ──
    const warmups = mod.warmup || mod.position_training?.warmup || [];
    if (warmups.length) {
      warmups.forEach((w: any) => {
        const repsStr = w.duration ? `${w.duration}min` : (w.reps ? `${w.reps}次` : "/");
        const restStr = w.rest ? String(w.rest) : "/";
        add("Warm-up", PHASE_COLORS["Warm-up"], w.name || "热身", w.load || w.equipment || "BW", w.sets || "1", repsStr, restStr, w.description || "");
      });
    }

    // ── Transition ──
    if (warmups.length > 0) {
      rows.push({ type: "break", label: "队员休息 + 教练布置训练任务" });
    }

    // ── 主训 ──
    let mainCount = 0;

    // Find position training drills
    const drills = mod.drills || mod.position_training?.drills || [];
    drills.forEach((d: any) => {
      mainCount++;
      add("主训", PHASE_COLORS["主训"], d.name, d.equipment || "BW", d.sets || "1", d.duration ? `${d.duration}min` : (d.reps ? `${d.reps}次` : "/"), d.rest || "/", d.description || d.focus || "", d.imageUrl || d.diagram?.image_url);
    });

    // Strength exercises
    const strengthKeys = ["upper_limb", "lower_limb", "core", "ability"] as const;
    strengthKeys.forEach((key) => {
      const exs = mod[key] || mod.position_training?.[key] || [];
      exs.forEach((ex: any) => {
        mainCount++;
        const loadStr = ex.load || ex.equipment || "BW";
        const repsStr = ex.reps ? `${ex.reps}次` : (ex.duration ? `${ex.duration}` : "/");
        const restStr = ex.rest ? (typeof ex.rest === "number" ? (ex.rest >= 60 ? `${ex.rest / 60}min` : `${ex.rest}s`) : ex.rest) : "/";
        add("主训", PHASE_COLORS["主训"], ex.name, loadStr, ex.sets || "?", repsStr, restStr, ex.notes || ex.cue || "", ex.imageUrl);
      });
    });

    // Coach activities
    const acts = mod.activities || [];
    acts.forEach((a: any) => {
      mainCount++;
      add("主训", PHASE_COLORS["主训"], a.name, "—", "—", `${a.duration}min`, "—", a.description || "", a.diagram?.image_url);
    });

    // ── 放松 ──
    const cds = mod.cooldown || mod.position_training?.cooldown || [];
    if (cds.length) {
      cds.forEach((c: any) => {
        add("放松", PHASE_COLORS["放松"], c.name || "整理", "BW", "1", c.duration ? `${c.duration}min` : "/", "/", c.description || "");
      });
    }

    // Aggregate phase names
    const phases: string[] = [];
    if (warmups.length) phases.push(`Warm-up (${warmups.length}项)`);
    if (mainCount > 0) phases.push(`主训 (${mainCount}项)`);
    if (cds.length) phases.push(`放松 (${cds.length}项)`);
  });

  // Compute phase row spans
  const phases = computePhases(rows);
  return { phases, rows };
}

function computePhases(rows: (SeqItem | { type: "break"; label: string })[]): string[] {
  const p: string[] = [];
  let current = "";
  let count = 0;
  rows.forEach((r) => {
    if ("type" in r && r.type === "break") {
      if (current) p.push(`${current} (${count}项)`);
      p.push("过渡");
      current = "";
      count = 0;
      return;
    }
    const item = r as SeqItem;
    if (item.phase !== current) {
      if (current) p.push(`${current} (${count}项)`);
      current = item.phase;
      count = 0;
    }
    count++;
  });
  if (current) p.push(`${current} (${count}项)`);
  return p;
}

// ─── Component ────────────────────────────────────────────

const HEADERS = ["练习内容", "负重", "组数", "次/米/秒", "组间休息", "备注"];

export function SequentialTrainingList({ modules }: { modules: TrainingModule[] }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [imageModal, setImageModal] = useState<{ name: string; url: string } | null>(null);

  const { rows } = useMemo(() => flattenModules(modules), [modules]);
  const items = rows.filter((r): r is SeqItem => !("type" in r));
  const total = items.length;
  const doneCount = items.filter(i => completed.has(i.id)).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const toggle = (id: string) => {
    setCompleted(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  // Compute rowSpans for phase column
  const rowSpans = useMemo(() => {
    const spans: (number | null)[] = new Array(rows.length).fill(null);
    let i = 0;
    while (i < rows.length) {
      const r = rows[i];
      if ("type" in r && r.type === "break") {
        spans[i] = 1;
        i++;
        continue;
      }
      const phase = (r as SeqItem).phase;
      let count = 0;
      let j = i;
      while (j < rows.length && !("type" in rows[j]) && (rows[j] as SeqItem).phase === phase) {
        count++;
        j++;
      }
      spans[i] = count;
      i += count;
    }
    return spans;
  }, [rows]);

  if (total === 0) {
    return <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8 text-center text-gray-500 text-sm">暂无训练项目</div>;
  }

  return (
    <div className="space-y-4">
      {/* Segmented progress bar */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-white">
            {doneCount === total ? "训练完成" : `训练进度 ${doneCount}/${total}`}
          </span>
          <span className="text-xs text-[#d92525] font-bold tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 bg-[#222] rounded-full overflow-hidden">
          <div className="h-full bg-[#d92525] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        {/* Phase segments */}
        <div className="flex items-center justify-between mt-2 gap-1">
          {(() => {
            const phaseColors: Record<string, string> = { "Warm-up": "#22c55e", "主训": "#3B82F6", "放松": "#eab308" };
            const counts: Record<string, number> = {};
            items.forEach(i => { counts[i.phase] = (counts[i.phase] || 0) + 1; });
            return Object.entries(counts).map(([phase, count]) => (
              <div key={phase} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: phaseColors[phase] || "#666" }} />
                <span className="text-[9px] text-gray-500">{phase} {count}项</span>
              </div>
            ));
          })()}
          <span className="text-[9px] text-gray-600">{total}项</span>
        </div>
      </div>

      {/* Single table */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            {/* Sticky header */}
            <thead className="sticky top-0 z-10 bg-[#111]">
              <tr className="text-[11px] text-gray-400 border-b border-[#333]">
                <th className="py-2.5 pl-4 text-left font-medium w-[90px]">阶段</th>
                {HEADERS.map((h, i) => (
                  <th key={i} className={`py-2.5 font-medium ${i === 0 ? "text-left" : "text-center"} ${i === HEADERS.length - 1 ? "pr-4" : "pr-2"}`}>
                    {h}
                  </th>
                ))}
                <th className="py-2.5 pr-4 text-center font-medium w-10">✓</th>
                <th className="py-2.5 pr-4 text-center font-medium w-20">动作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                // Break row
                if ("type" in row && row.type === "break") {
                  return (
                    <tr key={`break-${idx}`} className="bg-[#0d1b2e]">
                      <td className="py-3 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-[#3B82F6]" />
                          <span className="text-[11px] font-bold text-[#3B82F6]">过渡</span>
                        </div>
                      </td>
                      <td colSpan={HEADERS.length + 2} className="py-3 text-center">
                        <span className="text-xs text-gray-400">{row.label}</span>
                      </td>
                    </tr>
                  );
                }

                // Training row
                const item = row as SeqItem;
                const isDone = completed.has(item.id);
                const span = rowSpans[idx];
                const isPhaseHead = span !== null;

                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer transition border-b border-[#1a1a1a] ${isDone ? "bg-[#2a1515]" : "hover:bg-[#271919]"}`}
                    onClick={() => toggle(item.id)}
                  >
                    {/* 阶段 — vertical merge, color block */}
                    {isPhaseHead && span && (
                      <td
                        rowSpan={span}
                        className="pl-4 pr-2 py-2.5 align-top"
                        style={{ backgroundColor: item.phaseColor + "15" }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.phaseColor }} />
                          <span className="text-[11px] font-bold" style={{ color: item.phaseColor }}>{item.phase}</span>
                        </div>
                      </td>
                    )}

                    {/* 练习内容 */}
                    <td className="py-2.5 pr-2">
                      <p className={`text-sm ${isDone ? "text-gray-500 line-through" : "text-white"}`}>
                        {item.step}. {item.name}
                      </p>
                    </td>

                    {/* 负重 */}
                    <td className="py-2.5 pr-2 text-center">
                      <span className={`text-xs ${isDone ? "text-gray-600" : "text-gray-300"}`}>{item.load}</span>
                    </td>

                    {/* 组数 */}
                    <td className="py-2.5 pr-2 text-center">
                      <span className={`text-xs tabular-nums ${isDone ? "text-gray-600" : "text-white"}`}>{item.sets}</span>
                    </td>

                    {/* 次/米/秒 */}
                    <td className="py-2.5 pr-2 text-center">
                      <span className={`text-xs whitespace-nowrap ${isDone ? "text-gray-600" : "text-gray-300"}`}>{item.reps}</span>
                    </td>

                    {/* 组间休息 */}
                    <td className="py-2.5 pr-2 text-center">
                      <span className={`text-xs whitespace-nowrap ${isDone ? "text-gray-600" : "text-gray-400"}`}>
                        {item.rest !== "/" && item.rest !== "—" && <Timer className="w-3 h-3 inline mr-0.5" />}
                        {item.rest}
                      </span>
                    </td>

                    {/* 备注 */}
                    <td className="py-2.5 pr-2">
                      <span className={`text-[10px] ${isDone ? "text-gray-600" : "text-gray-500"}`}>
                        {item.notes.length > 15 ? item.notes.slice(0, 15) + "…" : item.notes || "—"}
                      </span>
                    </td>

                    {/* ✓ */}
                    <td className="py-2.5 pr-2 text-center">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 mx-auto transition ${
                        isDone ? "bg-[#d92525] border-[#d92525]" : "border-[#444]"
                      }`}>
                        {isDone && <Check className="w-3 h-3 text-black" />}
                      </div>
                    </td>

                    {/* 动作图 */}
                    <td className="py-2.5 pr-4 text-center">
                      {item.imageUrl ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setImageModal({ name: item.name, url: item.imageUrl! }); }}
                          className="text-[10px] px-2 py-1 rounded bg-[#222] hover:bg-[#333] text-gray-300 transition"
                        >
                          <Image className="w-3.5 h-3.5 inline mr-0.5" />
                          查看
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image modal */}
      {imageModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setImageModal(null)}>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
              <span className="text-sm font-bold text-white truncate">{imageModal.name}</span>
              <button onClick={() => setImageModal(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <img src={imageModal.url} alt={imageModal.name} className="w-full rounded-lg" loading="lazy" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
