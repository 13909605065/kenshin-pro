"use client";

import { TrainingModule, Position } from "@/lib/types";
import { ExerciseTable } from "./ExerciseTable";
import { Printer, Table2 } from "lucide-react";

interface Props {
  modules: TrainingModule[];
  position: Position | null;
  onUpdateExercise?: (moduleType: string, category: string, index: number, exercise: any) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeSummary(allExercises: any[]) {
  const total = allExercises.length;
  const totalSets = allExercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
  const totalTimeMin = allExercises.reduce((sum, ex) => {
    const rest = ex.rest || 90;
    return sum + ((ex.sets || 0) * (rest + 30)) / 60;
  }, 0);
  const rpeValues = allExercises
    .filter((ex) => ex.rpe != null)
    .map((ex) => ex.rpe as number);
  const avgRPE =
    rpeValues.length > 0
      ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length
      : 0;
  return {
    total,
    totalSets,
    totalTime: Math.round(totalTimeMin),
    avgRPE: Math.round(avgRPE * 10) / 10,
  };
}

function IntensityBar({ avgRPE }: { avgRPE: number }) {
  let label: string;
  let pct: number;
  let barColor: string;

  if (avgRPE >= 9) {
    label = "极高";
    pct = 1;
    barColor = "bg-red-500";
  } else if (avgRPE >= 7) {
    label = "中高";
    pct = 0.75;
    barColor = "bg-orange-500";
  } else if (avgRPE >= 5) {
    label = "中等";
    pct = 0.5;
    barColor = "bg-yellow-500";
  } else if (avgRPE > 0) {
    label = "低";
    pct = 0.25;
    barColor = "bg-green-500";
  } else {
    label = "—";
    pct = 0;
    barColor = "bg-gray-600";
  }

  return (
    <div className="flex items-center gap-2 mt-0.5">
      <span className="text-xs text-gray-500 w-8 shrink-0">强度</span>
      <div className="flex-1 h-2 bg-[#121212] rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 min-w-[90px] text-right">
        {label}
        {avgRPE > 0 && ` (RPE ${avgRPE})`}
      </span>
    </div>
  );
}

function SectionDivider() {
  return <hr className="border-[#1e1e1e]" />;
}

export function PhysicalTab({ modules, position, onUpdateExercise }: Props) {
  const posModule = modules.find((m) => m.module === "position_training");
  const abilityModule = modules.find((m) => m.module === "ability_training");
  const isGoalkeeper = position === "goalkeeper";

  const upper = posModule?.module === "position_training" ? (posModule.upper_limb || []) : [];
  const lower = posModule?.module === "position_training" ? (posModule.lower_limb || []) : [];
  const core = posModule?.module === "position_training" ? (posModule.core || []) : [];
  const abilityExercises =
    abilityModule?.module === "ability_training" ? (abilityModule.exercises || []) : [];

  const allExercises = [...upper, ...lower, ...core, ...abilityExercises];
  const hasAnyContent = allExercises.length > 0;

  if (!hasAnyContent) {
    return <p className="text-sm text-gray-400 py-8 text-center">暂无体能训练内容</p>;
  }

  const summary = computeSummary(allExercises);

  return (
    <div className="space-y-6">
      {/* ── Export buttons ── */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-[#d1d1d1] bg-[#1e1e1e] border border-[#222] hover:brightness-125 rounded-lg transition"
          >
            <Printer className="w-3.5 h-3.5" /> 导出PDF
          </button>
          <button
            onClick={() => {
              const table = document.querySelector(".export-table");
              if (table) {
                (table as HTMLElement).style.position = "static";
                (table as HTMLElement).style.visibility = "visible";
              }
              window.print();
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-[#d1d1d1] bg-[#1e1e1e] border border-[#222] hover:brightness-125 rounded-lg transition"
          >
            <Table2 className="w-3.5 h-3.5" /> 打印表格
          </button>
        </div>
      </div>

      {/* ── Goalkeeper note ── */}
      {isGoalkeeper && (
        <p className="text-xs text-gray-400 bg-[#1e1e1e]/50 rounded-lg p-2">
          守门员仅展示无球训练内容
        </p>
      )}

      {/* ── Training Volume Summary Card ── */}
      <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="text-sm font-bold text-white">训练总量</h3>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="text-gray-400">
            <span className="text-white font-bold">{summary.total}</span> 个动作
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-400">
            <span className="text-white font-bold">{summary.totalSets}</span> 组
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-400">
            约 <span className="text-white font-bold">{summary.totalTime}min</span>
          </span>
        </div>
        <IntensityBar avgRPE={summary.avgRPE} />
      </div>

      {/* ── Upper limb ── */}
      {upper.length > 0 && (
        <>
          <SectionDivider />
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🦾</span>
              <h4 className="text-[#d92525] text-sm font-bold">上肢力量</h4>
              <span className="text-[11px] text-gray-600">({upper.length}个动作)</span>
            </div>
            <ExerciseTable
              exercises={upper}
              onEditExercise={
                onUpdateExercise
                  ? (i, ex) => onUpdateExercise("position_training", "upper_limb", i, ex)
                  : undefined
              }
            />
          </section>
        </>
      )}

      {/* ── Lower limb ── */}
      {lower.length > 0 && (
        <>
          <SectionDivider />
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🦿</span>
              <h4 className="text-[#d92525] text-sm font-bold">下肢力量</h4>
              <span className="text-[11px] text-gray-600">({lower.length}个动作)</span>
            </div>
            <ExerciseTable
              exercises={lower}
              onEditExercise={
                onUpdateExercise
                  ? (i, ex) => onUpdateExercise("position_training", "lower_limb", i, ex)
                  : undefined
              }
            />
          </section>
        </>
      )}

      {/* ── Core ── */}
      {core.length > 0 && (
        <>
          <SectionDivider />
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🎯</span>
              <h4 className="text-[#d92525] text-sm font-bold">核心训练</h4>
              <span className="text-[11px] text-gray-600">({core.length}个动作)</span>
            </div>
            <ExerciseTable
              exercises={core}
              onEditExercise={
                onUpdateExercise
                  ? (i, ex) => onUpdateExercise("position_training", "core", i, ex)
                  : undefined
              }
            />
          </section>
        </>
      )}

      {/* ── Ability ── */}
      {abilityExercises.length > 0 && (
        <>
          <SectionDivider />
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">⚡</span>
              <h4 className="text-[#d92525] text-sm font-bold">定向能力训练</h4>
              <span className="text-[11px] text-gray-600">({abilityExercises.length}个动作)</span>
            </div>
            <ExerciseTable
              exercises={abilityExercises}
              onEditExercise={
                onUpdateExercise
                  ? (i, ex) => onUpdateExercise("ability_training", "exercises", i, ex)
                  : undefined
              }
              showProgression
            />
          </section>
        </>
      )}
    </div>
  );
}
