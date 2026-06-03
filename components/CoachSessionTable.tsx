"use client";

import { useState, useMemo } from "react";
import type { TrainingModule } from "@/lib/types";
import { Check, Clock, Map } from "lucide-react";

// ─── Types ────────────────────────────────────────────────

interface CoachRow {
  id: string;
  step: number;
  section: string;       // 技术专项 / 分队实战 / 冷身放松
  sectionColor: string;
  name: string;          // 训练科目
  duration: string;      // 用时
  setup: string;         // 场地/人员配置
  brief: string;         // 训练简述
  hasDiagram: boolean;
  diagram?: any;
  coachingPoints: string; // 执教要点
  progression: string;   // 进退阶调整
}

const SECTION_COLORS: Record<string, string> = {
  "热身": "#22c55e",
  "技术专项": "#16a34a",
  "分队实战": "#3B82F6",
  "冷身放松": "#eab308",
};

// ─── Columns ──────────────────────────────────────────────

const COLS = [
  "训练科目",
  "用时",
  "场地/人员",
  "训练简述",
  "场地图",
  "执教要点",
  "进退阶",
];

// ─── Flatten ──────────────────────────────────────────────

function flattenCoachPlan(modules: TrainingModule[]): CoachRow[] {
  const rows: CoachRow[] = [];
  let step = 0;

  const add = (
    section: string,
    name: string,
    duration: string,
    setup: string,
    brief: string,
    coachingPoints: string,
    progression: string,
    hasDiagram: boolean,
    diagram?: any
  ) => {
    step++;
    rows.push({
      id: `c${step}`,
      step,
      section,
      sectionColor: SECTION_COLORS[section] || "#666",
      name,
      duration,
      setup,
      brief: brief.length > 30 ? brief.slice(0, 30) + "…" : brief,
      coachingPoints: coachingPoints.length > 25 ? coachingPoints.slice(0, 25) + "…" : coachingPoints,
      progression: progression.length > 20 ? progression.slice(0, 20) + "…" : progression,
      hasDiagram,
      diagram,
    });
  };

  modules.forEach((mod: any) => {
    const session = mod.module === "session_plan" ? mod : null;
    if (!session) return;

    // ── Warmup ──
    if (session.warmup?.length > 0) {
      session.warmup.forEach((w: any) => {
        add("热身", w.name || "热身", `${w.duration || "?"}min`, "全队", w.description || "", w.coaching_points?.join("；") || "", "—", false);
      });
    }

    // ── 技术专项 ──
    if (session.activities?.length > 0) {
      session.activities.forEach((act: any) => {
        add(
          "技术专项",
          act.name || "训练",
          `${act.duration || "?"}min`,
          `${act.area || "全场"} · ${act.groups || "全队"}`,
          act.description || "",
          act.coaching_points?.join("；") || "",
          `⬆${act.progression || "—"} ⬇${act.regression || "—"}`,
          !!act.diagram,
          act.diagram
        );
      });
    }

    // ── 分队实战 ──
    if (session.ssg) {
      add(
        "分队实战",
        session.ssg.name || "SSG",
        `${session.ssg.duration || "?"}min`,
        `${session.ssg.area || "?"} · ${session.ssg.players || "?"}`,
        session.ssg.rules || "",
        session.ssg.coaching_focus?.join("；") || "",
        "—",
        false
      );
    }

    // ── 冷身放松 ──
    if (session.cooldown?.length > 0) {
      session.cooldown.forEach((c: any) => {
        add("冷身放松", c.name || "整理", `${c.duration || "?"}min`, "全队", c.description || "", "—", "—", false);
      });
    }
  });

  return rows;
}

// ─── Component ────────────────────────────────────────────

interface Props {
  modules: TrainingModule[];
  onOpenDiagram?: (diagram: any) => void;
}

export function CoachSessionTable({ modules, onOpenDiagram }: Props) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const rows = useMemo(() => flattenCoachPlan(modules), [modules]);
  const total = rows.length;
  const doneCount = rows.filter(r => completed.has(r.id)).length;

  // Compute rowSpans for section column
  const rowSpans = useMemo(() => {
    const spans: number[] = new Array(rows.length).fill(1);
    let i = 0;
    while (i < rows.length) {
      const section = rows[i].section;
      let count = 0;
      let j = i;
      while (j < rows.length && rows[j].section === section) { count++; j++; }
      spans[i] = count;
      i += count;
    }
    return spans;
  }, [rows]);

  if (total === 0) {
    return <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8 text-center text-gray-500 text-sm">暂无训练教案</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-white">📋 训练课表</span>
            <span className="text-[11px] text-gray-400">{total}项训练</span>
            <span className="text-[11px] text-gray-400">{doneCount}/{total} 完成</span>
          </div>
          <div className="flex items-center gap-1.5">
            {rows.length > 0 && rows[0].sectionColor && (
              <>
                {Object.entries(SECTION_COLORS).filter(([k]) => rows.some(r => r.section === k)).map(([label, color]) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-gray-500">{label}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            {/* Sticky header */}
            <thead className="sticky top-0 z-10 bg-[#111]">
              <tr className="text-[11px] text-gray-400 border-b border-[#333]">
                <th className="py-2.5 pl-3 text-left font-medium w-[36px]">#</th>
                <th className="py-2.5 text-left font-medium w-[70px]">模块</th>
                {COLS.map((h, i) => (
                  <th key={i} className={`py-2.5 font-medium ${i <= 2 ? "text-left" : "text-center"} ${i === COLS.length - 1 ? "pr-3" : "pr-2"}`}>
                    {h}
                  </th>
                ))}
                <th className="py-2.5 pr-3 text-center font-medium w-10">✓</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isDone = completed.has(row.id);

                return (
                  <tr
                    key={row.id}
                    onClick={() => setCompleted(prev => {
                      const next = new Set(prev);
                      next.has(row.id) ? next.delete(row.id) : next.add(row.id);
                      return next;
                    })}
                    className={`cursor-pointer transition border-b border-[#1a1a1a] ${isDone ? "bg-neon-pink/5" : "hover:bg-[#222]"}`}
                  >
                    {/* # */}
                    <td className="py-2.5 pl-3">
                      <span className={`text-xs font-bold tabular-nums ${isDone ? "text-neon-pink line-through" : "text-gray-500"}`}>
                        {row.step}
                      </span>
                    </td>

                    {/* 模块 — vertical merge */}
                    {(idx === 0 || rows[idx - 1]?.section !== row.section) && (
                      <td
                        rowSpan={rowSpans[idx]}
                        className="py-2.5 pr-2 align-top"
                        style={{ backgroundColor: row.sectionColor + "15" }}
                      >
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.sectionColor }} />
                          <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: row.sectionColor }}>
                            {row.section}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* 训练科目 */}
                    <td className="py-2.5 pr-2">
                      <p className={`text-sm ${isDone ? "text-gray-500 line-through" : "text-white"}`}>
                        {row.name}
                      </p>
                    </td>

                    {/* 用时 */}
                    <td className="py-2.5 pr-2">
                      <span className={`text-xs whitespace-nowrap ${isDone ? "text-gray-600" : "text-gray-300"}`}>
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {row.duration}
                      </span>
                    </td>

                    {/* 场地/人员 */}
                    <td className="py-2.5 pr-2">
                      <span className={`text-[11px] whitespace-nowrap ${isDone ? "text-gray-600" : "text-gray-400"}`}>
                        {row.setup}
                      </span>
                    </td>

                    {/* 训练简述 */}
                    <td className="py-2.5 pr-2">
                      <span className={`text-[11px] ${isDone ? "text-gray-600" : "text-gray-400"}`}>
                        {row.brief || "—"}
                      </span>
                    </td>

                    {/* 场地图 */}
                    <td className="py-2.5 pr-2 text-center">
                      {row.hasDiagram ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onOpenDiagram?.(row.diagram); }}
                          className="text-[10px] px-2 py-1 rounded bg-[#222] hover:bg-[#333] text-neon-pink transition"
                        >
                          <Map className="w-3.5 h-3.5 inline mr-0.5" />
                          查看
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-600">—</span>
                      )}
                    </td>

                    {/* 执教要点 */}
                    <td className="py-2.5 pr-2">
                      <span className={`text-[10px] ${isDone ? "text-gray-600" : "text-gray-500"}`}>
                        {row.coachingPoints || "—"}
                      </span>
                    </td>

                    {/* 进退阶 */}
                    <td className="py-2.5 pr-2">
                      <span className={`text-[10px] ${isDone ? "text-gray-600" : "text-gray-500"}`}>
                        {row.progression || "—"}
                      </span>
                    </td>

                    {/* ✓ */}
                    <td className="py-2.5 pr-3 text-center">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 mx-auto transition ${
                        isDone ? "bg-neon-pink border-neon-pink" : "border-[#444]"
                      }`}>
                        {isDone && <Check className="w-3 h-3 text-black" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
