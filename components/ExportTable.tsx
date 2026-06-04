"use client";

import type { TrainingModule, SessionPlan, PositionTraining, PlayerFormData } from "@/lib/types";
import { POSITION_LABELS, GOAL_LABELS, PHASE_LABELS } from "@/lib/constants";

// ═══════════════════════════════════
// COACH SESSION TABLE
// ═══════════════════════════════════

function CoachTable({ modules }: { modules: TrainingModule[] }) {
  const session = modules.find((m) => m.module === "session_plan") as SessionPlan | undefined;
  const tactical = modules.find((m) => m.module === "tactical_focus") as any;
  const micro = modules.find((m) => m.module === "microcycle") as any;
  if (!session) return <p className="text-gray-500 p-8 text-center">暂无教练方案数据</p>;

  const date = new Date().toLocaleDateString("zh-CN");

  return (
    <div className="export-table bg-white text-black p-6" style={{ maxWidth: "210mm", margin: "0 auto" }}>
      {/* Header */}
      <div className="text-center mb-4 border-b-2 border-black pb-3">
        <h1 className="text-xl font-bold mb-1">{session.title}</h1>
        <p className="text-sm text-gray-600">
          {session.duration}分钟 · {session.player_count}人 · {date}
        </p>
      </div>

      {/* Equipment */}
      {session.equipment.length > 0 && (
        <div className="mb-4 p-3 border border-gray-300 rounded text-sm">
          <strong>器材清单：</strong> {session.equipment.join("、")}
        </div>
      )}

      {/* Warmup Table */}
      <h2 className="text-base font-bold mb-2 mt-4">一、引导热身 ({session.warmup.reduce((s: number, w: any) => s + w.duration, 0)}min)</h2>
      <table className="w-full border-collapse mb-4 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-2 py-1 text-left">序号</th>
            <th className="border border-gray-400 px-2 py-1 text-left">练习名称</th>
            <th className="border border-gray-400 px-2 py-1">时长</th>
            <th className="border border-gray-400 px-2 py-1 text-left">说明</th>
          </tr>
        </thead>
        <tbody>
          {session.warmup.map((w: any, i: number) => (
            <tr key={i}>
              <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
              <td className="border border-gray-300 px-2 py-1">{w.name}</td>
              <td className="border border-gray-300 px-2 py-1 text-center">{w.duration}min</td>
              <td className="border border-gray-300 px-2 py-1 text-xs text-gray-600">{w.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Activities Table */}
      <h2 className="text-base font-bold mb-2">二、主体训练 ({session.activities.reduce((s: number, a: any) => s + a.duration, 0)}min)</h2>
      <table className="w-full border-collapse mb-4 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-2 py-1 text-left">序号</th>
            <th className="border border-gray-400 px-2 py-1 text-left">练习名称</th>
            <th className="border border-gray-400 px-2 py-1">时长</th>
            <th className="border border-gray-400 px-2 py-1">分组</th>
            <th className="border border-gray-400 px-2 py-1">场地</th>
            <th className="border border-gray-400 px-2 py-1 text-left">指导要点</th>
            <th className="border border-gray-400 px-2 py-1">进阶</th>
            <th className="border border-gray-400 px-2 py-1">退阶</th>
          </tr>
        </thead>
        <tbody>
          {session.activities.map((act: any, i: number) => (
            <tr key={i}>
              <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
              <td className="border border-gray-300 px-2 py-1 font-medium">{act.name}</td>
              <td className="border border-gray-300 px-2 py-1 text-center">{act.duration}min</td>
              <td className="border border-gray-300 px-2 py-1 text-center">{act.groups}</td>
              <td className="border border-gray-300 px-2 py-1 text-center text-xs">{act.area}</td>
              <td className="border border-gray-300 px-2 py-1 text-xs">{act.coaching_points?.join("；")}</td>
              <td className="border border-gray-300 px-2 py-1 text-xs">{act.progression}</td>
              <td className="border border-gray-300 px-2 py-1 text-xs">{act.regression}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* SSG */}
      {session.ssg && (
        <div className="mb-4">
          <h2 className="text-base font-bold mb-2">三、分队比赛：{session.ssg.name} ({session.ssg.duration}min)</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1">人数</th>
                <th className="border border-gray-400 px-2 py-1">场地</th>
                <th className="border border-gray-400 px-2 py-1 text-left">规则</th>
                <th className="border border-gray-400 px-2 py-1 text-left">指导焦点</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-1 text-center">{session.ssg.players}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{session.ssg.area}</td>
                <td className="border border-gray-300 px-2 py-1 text-xs">{session.ssg.rules}</td>
                <td className="border border-gray-300 px-2 py-1 text-xs">{session.ssg.coaching_focus?.join("；")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Cooldown */}
      {session.cooldown.length > 0 && (
        <>
          <h2 className="text-base font-bold mb-2">四、冷身整理 ({session.cooldown.reduce((s: number, c: any) => s + c.duration, 0)}min)</h2>
          <table className="w-full border-collapse mb-4 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1 text-left">练习名称</th>
                <th className="border border-gray-400 px-2 py-1">时长</th>
                <th className="border border-gray-400 px-2 py-1 text-left">说明</th>
              </tr>
            </thead>
            <tbody>
              {session.cooldown.map((c: any, i: number) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-2 py-1">{c.name}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{c.duration}min</td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-gray-600">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Tactical focus (if exists) */}
      {tactical && (
        <div className="mb-4">
          <h2 className="text-base font-bold mb-2 mt-4">战术专项：{tactical.title}</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1 text-left">练习</th>
                <th className="border border-gray-400 px-2 py-1">时长</th>
                <th className="border border-gray-400 px-2 py-1">分组</th>
                <th className="border border-gray-400 px-2 py-1 text-left">指导要点</th>
              </tr>
            </thead>
            <tbody>
              {tactical.drills?.map((d: any, i: number) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-2 py-1">{d.name}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{d.duration}min</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{d.groups}</td>
                  <td className="border border-gray-300 px-2 py-1 text-xs">{d.coaching_points?.join("；")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Microcycle */}
      {micro && micro.days?.length > 0 && (
        <div className="mb-4">
          <h2 className="text-base font-bold mb-2 mt-4">微周期计划（比赛日：{micro.match_day}）</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1">日期</th>
                <th className="border border-gray-400 px-2 py-1 text-left">重点</th>
                <th className="border border-gray-400 px-2 py-1">强度</th>
                <th className="border border-gray-400 px-2 py-1">时长</th>
                <th className="border border-gray-400 px-2 py-1 text-left">训练类型</th>
              </tr>
            </thead>
            <tbody>
              {micro.days.map((d: any, i: number) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-2 py-1 text-center font-medium">{d.day}</td>
                  <td className="border border-gray-300 px-2 py-1">{d.focus}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{d.intensity}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{d.duration}min</td>
                  <td className="border border-gray-300 px-2 py-1 text-xs">{d.session_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-6 border-t pt-2">
        Kenshinpro 足球训练助手 · {date}
      </p>
    </div>
  );
}

// ═══════════════════════════════════
// ATHLETE TABLE
// ═══════════════════════════════════

function AthleteTable({ modules, formData }: { modules: TrainingModule[]; formData: PlayerFormData }) {
  const posModule = modules.find((m) => m.module === "position_training") as PositionTraining | undefined;
  const abilityModule = modules.find((m) => m.module === "ability_training") as any;
  if (!posModule) return <p className="text-gray-500 p-8 text-center">暂无运动员方案数据</p>;

  const safeWarmup = Array.isArray(posModule.warmup) ? posModule.warmup : [];
  const safeCooldown = Array.isArray(posModule.cooldown) ? posModule.cooldown : [];
  const safeUpper = Array.isArray((posModule as any).upper_limb) ? (posModule as any).upper_limb : [];
  const safeLower = Array.isArray((posModule as any).lower_limb) ? (posModule as any).lower_limb : [];
  const safeCore = Array.isArray((posModule as any).core) ? (posModule as any).core : [];
  const safeAbility = Array.isArray(abilityModule?.exercises) ? abilityModule.exercises : [];

  const date = new Date().toLocaleDateString("zh-CN");
  const totalMin = [...safeWarmup, ...safeCooldown]
    .reduce((s: number, w: any) => s + (w.duration || 0), 0);

  return (
    <div className="export-table bg-white text-black p-6" style={{ maxWidth: "210mm", margin: "0 auto" }}>
      {/* Header */}
      <div className="text-center mb-4 border-b-2 border-black pb-3">
        <h1 className="text-xl font-bold mb-1">
          个人训练方案：{POSITION_LABELS[formData.position!]} · {GOAL_LABELS[formData.goal!]} · {PHASE_LABELS[formData.phase!]}
        </h1>
        <p className="text-sm text-gray-600">
          {formData.name} · {formData.gender === "female" ? "♀" : "♂"} · {formData.age}岁 · {formData.height}cm · {formData.weight}kg · {date}
        </p>
      </div>

      {/* Analysis */}
      {posModule.analysis && (
        <div className="mb-4 p-3 border border-gray-300 rounded text-sm bg-gray-50">
          <strong>个性化分析：</strong>{posModule.analysis}
        </div>
      )}

      {/* Warmup */}
      <h2 className="text-base font-bold mb-2">一、热身 ({safeWarmup.reduce((s: number, w: any) => s + (w.duration||0), 0)}min)</h2>
      <table className="w-full border-collapse mb-4 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-2 py-1">序号</th>
            <th className="border border-gray-400 px-2 py-1 text-left">名称</th>
            <th className="border border-gray-400 px-2 py-1">时长</th>
            <th className="border border-gray-400 px-2 py-1 text-left">说明</th>
          </tr>
        </thead>
        <tbody>
          {safeWarmup.map((w: any, i: number) => (
            <tr key={i}>
              <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
              <td className="border border-gray-300 px-2 py-1">{w.name}</td>
              <td className="border border-gray-300 px-2 py-1 text-center">{w.duration}min</td>
              <td className="border border-gray-300 px-2 py-1 text-xs text-gray-600">{w.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Strength Exercises */}
      <h2 className="text-base font-bold mb-2">二、力量训练</h2>
      {([
        ["upper_limb", safeUpper, "上肢"],
        ["lower_limb", safeLower, "下肢"],
        ["core", safeCore, "核心"],
        ["ability", safeAbility, "专项能力"],
      ] as const).map(([key, exs, label]) => {
        if (!exs || !Array.isArray(exs) || exs.length === 0) return null;
        return (
          <div key={key} className="mb-3">
            <h3 className="text-sm font-bold mb-1">{label}</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-2 py-1">序号</th>
                  <th className="border border-gray-400 px-2 py-1 text-left">动作</th>
                  <th className="border border-gray-400 px-2 py-1">组数</th>
                  <th className="border border-gray-400 px-2 py-1">次数</th>
                  <th className="border border-gray-400 px-2 py-1">间歇</th>
                  <th className="border border-gray-400 px-2 py-1">负荷</th>
                  <th className="border border-gray-400 px-2 py-1 text-left">要点</th>
                </tr>
              </thead>
              <tbody>
                {exs.map((ex: any, i: number) => (
                  <tr key={i}>
                    <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
                    <td className="border border-gray-300 px-2 py-1 font-medium">{ex.name}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{ex.sets}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{ex.reps}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{ex.rest}s</td>
                    <td className="border border-gray-300 px-2 py-1 text-center text-xs">{ex.load || ex.rpe ? `RPE ${ex.rpe}` : "-"}</td>
                    <td className="border border-gray-300 px-2 py-1 text-xs">{ex.cue_points?.join("；")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Cooldown */}
      {safeCooldown.length > 0 && (
        <>
          <h2 className="text-base font-bold mb-2">三、冷身 ({safeCooldown.reduce((s: number, c: any) => s + (c.duration||0), 0)}min)</h2>
          <table className="w-full border-collapse mb-4 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1 text-left">名称</th>
                <th className="border border-gray-400 px-2 py-1">时长</th>
                <th className="border border-gray-400 px-2 py-1 text-left">说明</th>
              </tr>
            </thead>
            <tbody>
              {safeCooldown.map((c: any, i: number) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-2 py-1">{c.name}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{c.duration}min</td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-gray-600">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className="text-xs text-gray-500 text-center mt-6 border-t pt-2">
        总训练时长约 {totalMin}min · Kenshinpro · {date}
      </p>
    </div>
  );
}

// ═══════════════════════════════════
// EXPORT + PRINT BUTTON
// ═══════════════════════════════════

interface ExportTableProps {
  modules: TrainingModule[];
  formData: PlayerFormData;
}

export function ExportTable({ modules, formData }: ExportTableProps) {
  const isCoach = formData.role === "coach";

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 text-[11px] py-1.5 px-3 rounded-lg border transition-all duration-150 bg-[#1e1e1e] border-[#222] text-[#d1d1d1] hover:border-[#555] hover:bg-[#222]"
        title="导出为表格/打印"
      >
        📄 导出表格
      </button>

      {/* Hidden print-only content */}
      <div className="hidden print:block">
        {isCoach ? (
          <CoachTable modules={modules} />
        ) : (
          <AthleteTable modules={modules} formData={formData} />
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .export-table, .export-table * { visibility: visible; }
          .export-table { position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
    </>
  );
}
