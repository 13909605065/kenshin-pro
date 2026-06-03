"use client";

import { useState, useMemo } from "react";
import type { TrainingModule } from "@/lib/types";
import { Check, Timer } from "lucide-react";

// ─── Types ────────────────────────────────────────────────

interface SeqItem {
  id: string;
  step: number;
  name: string;
  load: string;     // 负重: BW / 20 / 40 / 12 14 / —
  sets: string;     // 组数: 1 / 2 / 4 / —
  reps: string;     // 次/米/秒: 15s / 20次 / 12次/侧 / 6次/侧 / /
  rest: string;     // 组间休息: 15s / 2min / / / —
  notes: string;    // 备注: 心肺准备（动员） / 动作准备（激活）
  phase: string;    // 阶段: Warm-up / 主训 / 放松
  done: boolean;
}

// ─── Flatten ──────────────────────────────────────────────

function flattenModules(modules: TrainingModule[]): SeqItem[] {
  const items: SeqItem[] = [];
  let step = 0;

  const add = (phase: string, name: string, load: string, sets: string, reps: string, rest: string, notes: string) => {
    step++;
    items.push({ id: `s${step}`, step, phase, name, load, sets, reps, rest, notes, done: false });
  };

  modules.forEach((mod: any) => {
    // ── Warmup ──
    const warmups = mod.warmup || mod.position_training?.warmup || [];
    if (warmups.length) {
      warmups.forEach((w: any) => {
        const repsStr = w.duration ? `${w.duration}min` : (w.reps ? `${w.reps}次` : "/");
        add("Warm-up", w.name || "热身", w.load || w.equipment || "BW", w.sets || "1", repsStr, w.rest || "/", w.description || w.notes || "");
      });
    }

    // ── Position training drills ──
    const drills = mod.drills || mod.position_training?.drills || [];
    if (drills.length) {
      drills.forEach((d: any) => {
        add("技术训练", d.name, d.equipment || "BW", d.sets || "1", d.duration ? `${d.duration}min` : (d.reps ? `${d.reps}次` : "/"), d.rest || "/", d.description || d.focus || "");
      });
    }

    // ── Strength exercises ──
    const strengthKeys = [
      { key: "upper_limb", phase: "力量-上肢" },
      { key: "lower_limb", phase: "力量-下肢" },
      { key: "core", phase: "力量-核心" },
      { key: "ability", phase: "专项能力" },
    ];

    strengthKeys.forEach(({ key, phase: p }) => {
      const exs = (mod as any)[key] || mod.position_training?.[key] || [];
      exs.forEach((ex: any) => {
        const loadStr = ex.load || (ex.equipment !== "自重" && ex.equipment ? ex.equipment : "BW");
        const repsStr = ex.reps ? `${ex.reps}次` : (ex.duration ? `${ex.duration}` : "/");
        const restStr = ex.rest ? (typeof ex.rest === "number" ? `${ex.rest}s` : ex.rest) : "/";
        add(p, ex.name, loadStr, ex.sets || "?", repsStr, restStr, ex.notes || ex.cue || "");
      });
    });

    // ── Coach activities ──
    const acts = mod.activities || [];
    if (acts.length) {
      acts.forEach((a: any) => {
        add("主训", a.name, "—", "—", `${a.duration}min`, "—", a.description + (a.coaching_points?.length ? " 📌" + a.coaching_points.join("；") : ""));
      });
    }

    // ── Cool down ──
    const cds = mod.cooldown || mod.position_training?.cooldown || [];
    if (cds.length) {
      cds.forEach((c: any) => {
        add("放松", c.name || "整理", "BW", "1", c.duration ? `${c.duration}min` : "/", "/", c.description || "");
      });
    }
  });

  return items;
}

// ─── Component ────────────────────────────────────────────

const COLS = ["阶段", "练习内容", "负重", "组数", "次/米/秒", "组间休息", "备注", "✓"];

export function SequentialTrainingList({ modules }: { modules: TrainingModule[] }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const sequence = useMemo(() => flattenModules(modules), [modules]);

  const total = sequence.length;
  const doneCount = sequence.filter(i => completed.has(i.id)).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const toggle = (id: string) => {
    setCompleted(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  if (total === 0) {
    return <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8 text-center text-gray-500 text-sm">暂无训练项目</div>;
  }

  // Group by phase for visual grouping
  const phases = useMemo(() => {
    const map = new Map<string, SeqItem[]>();
    sequence.forEach(item => {
      const arr = map.get(item.phase) || [];
      arr.push(item);
      map.set(item.phase, arr);
    });
    return Array.from(map.entries());
  }, [sequence]);

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-white">
            {doneCount === total ? "🎉 训练完成" : `训练进度 ${doneCount}/${total}`}
          </span>
          <span className="text-xs text-neon-pink font-bold tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 bg-[#222] rounded-full overflow-hidden">
          <div className="h-full bg-neon-pink rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-x-auto">
        <table className="w-full min-w-[600px]">
          {/* Header */}
          <thead>
            <tr className="text-[11px] text-gray-400 border-b border-[#333]">
              {COLS.map((col, i) => (
                <th key={i} className={`py-2.5 font-medium ${i === 0 ? "pl-4 text-left w-[80px]" : i === 1 ? "text-left" : "text-center"} ${i === COLS.length - 1 ? "pr-4 w-10" : "pr-2"}`}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {phases.map(([phase, items], pi) => (
              <>
                {/* Phase separator row */}
                {pi > 0 && (
                  <tr>
                    <td colSpan={COLS.length} className="py-1">
                      <div className="border-t border-[#222]" />
                    </td>
                  </tr>
                )}

                {items.map((item, idx) => {
                  const isDone = completed.has(item.id);
                  const isFirstInPhase = idx === 0;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className={`cursor-pointer transition ${isDone ? "bg-neon-pink/5" : "hover:bg-[#222]"}`}
                    >
                      {/* 阶段 — show only on first row of phase */}
                      <td className="py-2.5 pl-4 pr-2">
                        {isFirstInPhase && (
                          <span className="text-[11px] font-bold text-gray-300 whitespace-nowrap">{phase}</span>
                        )}
                      </td>

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
                          {item.notes.length > 20 ? item.notes.slice(0, 20) + "…" : item.notes}
                        </span>
                      </td>

                      {/* ✓ */}
                      <td className="py-2.5 pr-4 text-center">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition ${
                          isDone ? "bg-neon-pink border-neon-pink" : "border-[#444]"
                        }`}>
                          {isDone && <Check className="w-3 h-3 text-black" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
