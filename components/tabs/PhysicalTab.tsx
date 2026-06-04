"use client";

import { TrainingModule, Position } from "@/lib/types";
import { Printer, Pencil } from "lucide-react";

interface Props {
  modules: TrainingModule[];
  position: Position | null;
  onUpdateExercise?: (moduleType: string, category: string, index: number, exercise: any) => void;
}

/* ================================================================
   Excel-Style Structured Table — 上体超级组体能训练
   7 columns: 阶段 | 练习内容 | 负重 | 组数 | 次/米/秒 | 组间休息 | 备注
   ================================================================ */

interface TableRow {
  phase: "warmup" | "main" | "cooldown";
  phaseLabel: string;
  name: string;
  load: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
  // For edit
  moduleType?: string;
  category?: string;
  index?: number;
  exercise?: any;
}

const PHASE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  warmup: { bg: "rgba(34,197,94,0.12)", border: "#22c55e", text: "#22c55e", label: "热身激活" },
  main:   { bg: "rgba(37,99,235,0.15)", border: "#2563eb", text: "#60a5fa", label: "主训练" },
  cooldown: { bg: "rgba(234,179,8,0.12)", border: "#eab308", text: "#eab308", label: "收尾放松" },
};

function formatLoad(ex: any): string {
  if (!ex) return "BW";
  if (ex.load_default && ex.load_default !== "自身体重") return ex.load_default;
  return "BW";
}

function formatSets(ex: any): string {
  if (!ex) return "—";
  if (typeof ex.sets === "number") return String(ex.sets);
  if (Array.isArray(ex.sets)) return `${ex.sets[0]}-${ex.sets[1]}`;
  return String(ex.sets || "—");
}

function formatReps(ex: any): string {
  if (!ex) return "—";
  if (typeof ex.reps === "number") return String(ex.reps);
  if (Array.isArray(ex.reps)) return `${ex.reps[0]}-${ex.reps[1]}`;
  return String(ex.reps || "—");
}

function formatRest(ex: any): string {
  if (!ex || !ex.rest) return "—";
  const s = ex.rest;
  if (s >= 60) return `${Math.floor(s / 60)}min`;
  return `${s}s`;
}

function formatNotes(ex: any, phase: string): string {
  if (ex?.cue_points?.length) return (ex.cue_points as string[]).slice(0, 2).join("；");
  if (phase === "warmup") return "心肺动员";
  if (phase === "main") return "动作激活";
  return "";
}

export function PhysicalTab({ modules, position, onUpdateExercise }: Props) {
  const posModule = modules.find((m) => m.module === "position_training");
  const abilityModule = modules.find((m) => m.module === "ability_training");
  const isGoalkeeper = position === "goalkeeper";

  // ── Build flat table rows ──
  const rows: TableRow[] = [];

  // Warmup
  const warmups = posModule?.module === "position_training" ? (posModule.warmup || []) : [];
  warmups.forEach((w: any) => {
    rows.push({
      phase: "warmup", phaseLabel: "热身激活",
      name: w.name || "热身",
      load: "BW", sets: `${w.duration || "—"}`, reps: `${w.duration || "—"}min`,
      rest: "30s", notes: w.description || w.cue || "心肺动员",
    });
  });

  // Main: upper + lower + core + ability
  const upper = posModule?.module === "position_training" ? (posModule.upper_limb || []) : [];
  const lower = posModule?.module === "position_training" ? (posModule.lower_limb || []) : [];
  const core = posModule?.module === "position_training" ? (posModule.core || []) : [];
  const ability = abilityModule?.module === "ability_training" ? (abilityModule.exercises || []) : [];

  const mainGroups = [
    { items: upper, label: "上肢力量", cat: "upper_limb", mod: "position_training" as const },
    { items: lower, label: "下肢力量", cat: "lower_limb", mod: "position_training" as const },
    { items: core, label: "核心训练", cat: "core", mod: "position_training" as const },
    { items: ability, label: "专项能力", cat: "exercises", mod: "ability_training" as const },
  ];

  // Compute total main exercises for the header
  let totalMainTime = 0;

  mainGroups.forEach(({ items, cat, mod }) => {
    items.forEach((ex: any, i: number) => {
      const s = typeof ex.sets === "number" ? ex.sets : Array.isArray(ex.sets) ? ex.sets[0] : 3;
      const r = ex.rest || 90;
      totalMainTime += (s * (r + 30)) / 60;
      rows.push({
        phase: "main", phaseLabel: "主训练",
        name: ex.name || "—",
        load: formatLoad(ex), sets: formatSets(ex), reps: formatReps(ex),
        rest: formatRest(ex), notes: formatNotes(ex, "main"),
        moduleType: mod, category: cat, index: i, exercise: ex,
      });
    });
  });

  // Cooldown
  const cooldowns = posModule?.module === "position_training" ? (posModule.cooldown || []) : [];
  cooldowns.forEach((c: any) => {
    rows.push({
      phase: "cooldown", phaseLabel: "收尾放松",
      name: c.name || "整理",
      load: "BW", sets: "1", reps: `${c.duration || "5"}min`,
      rest: "—", notes: c.description || "静态拉伸",
    });
  });

  const totalAllTime = Math.round(Math.max(totalMainTime, 1));

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">暂无体能训练内容</p>;
  }

  // ── Compute merged cell spans per phase ──
  const phaseSpans: { phase: string; label: string; start: number; count: number }[] = [];
  let currentPhase = "";
  rows.forEach((r, i) => {
    if (r.phase !== currentPhase) {
      currentPhase = r.phase;
      phaseSpans.push({ phase: r.phase, label: r.phaseLabel, start: i, count: 1 });
    } else {
      phaseSpans[phaseSpans.length - 1].count++;
    }
  });

  return (
    <div className="space-y-4">
      {/* ── Header: Title + Total Time ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">
            {isGoalkeeper ? "守门员体能训练" : "上体超级组体能训练"}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {rows.length} 项动作 · 总时长约 {totalAllTime}min
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-[#d1d1d1] bg-[#1e1e1e] border border-[#222] hover:brightness-125 rounded-lg transition">
            <Printer className="w-3.5 h-3.5" /> 导出PDF
          </button>
        </div>
      </div>

      {/* ── Excel-Style Table ── */}
      <div className="overflow-x-auto rounded-xl border border-[#222] max-h-[70vh]">
        <table className="w-full text-[11px] border-collapse">
          {/* Column headers */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#1a1a1a] border-b border-[#333]">
              <th className="text-left py-1.5 px-2 text-gray-500 font-medium w-[72px] shrink-0">阶段</th>
              <th className="text-left py-1.5 px-2 text-gray-500 font-medium min-w-[120px]">练习内容</th>
              <th className="text-left py-1.5 px-2 text-gray-500 font-medium w-[60px]">负重</th>
              <th className="text-left py-1.5 px-2 text-gray-500 font-medium w-[40px]">组数</th>
              <th className="text-left py-1.5 px-2 text-gray-500 font-medium w-[60px]">次数</th>
              <th className="text-left py-1.5 px-2 text-gray-500 font-medium w-[52px]">间歇</th>
              <th className="text-left py-1.5 px-2 text-gray-500 font-medium min-w-[100px]">备注</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const colors = PHASE_COLORS[row.phase];
              const span = phaseSpans.find(s => s.start <= idx && s.start + s.count > idx);
              const isFirstInPhase = span?.start === idx;

              return (
                <tr key={idx}
                  className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/80 transition-colors group"
                  style={isFirstInPhase ? { borderTopColor: colors.border, borderTopWidth: "1px" } : undefined}
                >
                  {isFirstInPhase && (
                    <td
                      rowSpan={span!.count}
                      className="py-1 px-2 font-bold text-[10px] align-middle w-[72px]"
                      style={{
                        backgroundColor: colors.bg,
                        borderRight: `2px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    >
                      <div className="text-center">
                        <div className="text-[9px] opacity-60 mb-0.5">{span?.phase === "warmup" ? "❶" : span?.phase === "main" ? "❷" : "❸"}</div>
                        {colors.label}
                      </div>
                    </td>
                  )}
                  <td className="py-1 px-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[#d1d1d1] font-medium truncate max-w-[200px]">{row.name}</span>
                      {row.moduleType && onUpdateExercise && (
                        <button
                          onClick={() => onUpdateExercise(row.moduleType!, row.category!, row.index!, row.exercise)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[#333] shrink-0" title="编辑">
                          <Pencil className="w-2.5 h-2.5 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-1 px-2 text-gray-500">{row.load}</td>
                  <td className="py-1 px-2 text-white font-mono font-bold">{row.sets}</td>
                  <td className="py-1 px-2 text-gray-500">{row.reps}</td>
                  <td className="py-1 px-2 text-gray-500">{row.rest}</td>
                  <td className="py-1 px-2 text-gray-600">{row.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Key Metrics Summary ── */}
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-600">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:"#22c55e"}}/> 热身</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:"#2563eb"}}/> 主训练 {totalAllTime}min</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:"#eab308"}}/> 放松</span>
        {isGoalkeeper && <span className="text-gray-500 ml-4">· 守门员仅展示无球训练内容</span>}
      </div>
    </div>
  );
}
