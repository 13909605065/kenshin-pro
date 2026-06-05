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
  if (!session) return <p className="text-gray-400 p-8 text-center">暂无教练方案数据</p>;

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

      <p className="text-xs text-gray-400 text-center mt-6 border-t pt-2">
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
  if (!posModule) return <p className="text-gray-400 p-8 text-center">暂无运动员方案数据</p>;

  const safeWarmup = Array.isArray(posModule.warmup) ? posModule.warmup : [];
  const safeCooldown = Array.isArray(posModule.cooldown) ? posModule.cooldown : [];
  const safeUpper = Array.isArray((posModule as any).upper_limb) ? (posModule as any).upper_limb : [];
  const safeLower = Array.isArray((posModule as any).lower_limb) ? (posModule as any).lower_limb : [];
  const safeCore = Array.isArray((posModule as any).core) ? (posModule as any).core : [];
  const safeAbility = Array.isArray(abilityModule?.exercises) ? abilityModule.exercises : [];

  const date = new Date().toLocaleDateString("zh-CN");

  // Helpers for pro format
  const isBodyweight = (ex: any): boolean => {
    const name: string = (ex.name || "").toLowerCase();
    const load = ex.load;
    if (load && String(load).trim() !== "" && String(load) !== "BW") return false;
    const bwPatterns = [
      "plank", "push-up", "pull-up", "chin-up", "bodyweight", "box-jump",
      "depth-jump", "lateral-hurdle", "bound-landing", "box-drop-jump",
      "sprint", "t-drill", "z-slide", "pro-agility", "bird-dog",
      "dead-bug", "v-up", "mountain-climber", "hollow-body",
      "side-plank", "adductor-raise", "saw-plank", "contralateral",
      "hamstring-bridge", "hanging-leg-raise", "nordic",
      "single-leg-balance", "single-leg-box-jump", "skip",
      "agility-ladder", "light-jog", "rondo", "ball-touch", "ball-dribble",
      "spider-man", "world-greatest", "neural", "plyo-primer", "accel-drill",
      "ankle-knee", "glute-activation", "hip-open", "dynamic-stretch",
      "band-activation", "mini-band-walk", "static-stretch", "foam-roll",
      "breathing", "pallof", "cable-woodchop", "face-pull",
    ];
    return bwPatterns.some((p) => name.includes(p));
  };

  const formatLoad = (ex: any): string => {
    if (isBodyweight(ex)) return "BW";
    if (ex.rpe) return `RPE ${ex.rpe}`;
    if (ex.load) return String(ex.load);
    return "-";
  };

  const formatReps = (ex: any): string => {
    if (ex.duration) return `${ex.duration}min`;
    if (ex.reps) return String(ex.reps);
    return "-";
  };

  const formatRest = (ex: any): string => {
    if (ex.rest) return `${ex.rest}s`;
    return "-";
  };

  const autoNotes = (ex: any, section: string): string => {
    const parts: string[] = [];
    const name: string = (ex.name || "").toLowerCase();
    // Injury prevention
    if (name.includes("nordic") || name.includes("plank") || name.includes("side-plank") || name.includes("single-leg-balance") || name.includes("bird-dog") || name.includes("dead-bug")) {
      parts.push("损伤预防");
    }
    // Muscle group target
    if (name.includes("squat") || name.includes("deadlift") || name.includes("lunge") || name.includes("rdl") || name.includes("hip-thrust") || name.includes("leg-press")) {
      parts.push("下肢力量");
    } else if (name.includes("bench") || name.includes("press") || name.includes("pull-up") || name.includes("row") || name.includes("curl") || name.includes("flye")) {
      parts.push("上肢力量");
    } else if (name.includes("plank") || name.includes("dead-bug") || name.includes("pallof") || name.includes("chop") || name.includes("russian")) {
      parts.push("核心稳定");
    } else if (name.includes("clean") || name.includes("snatch") || name.includes("jerk") || name.includes("box-jump") || name.includes("depth")) {
      parts.push("爆发力");
    } else if (name.includes("sprint") || name.includes("agility") || name.includes("t-drill") || name.includes("sled")) {
      parts.push("速度/敏捷");
    }
    // Position adaptation
    if (formData.position) {
      const posLabel = POSITION_LABELS[formData.position] || "";
      if (posLabel) parts.push(`${posLabel}适配`);
    }
    if (section === "cooldown") parts.push("恢复再生");
    return parts.join("；") || "-";
  };

  // Merge all main exercises
  const mainExercises: { group: string; ex: any }[] = [];
  safeUpper.forEach((ex: any) => mainExercises.push({ group: "上肢", ex }));
  safeLower.forEach((ex: any) => mainExercises.push({ group: "下肢", ex }));
  safeCore.forEach((ex: any) => mainExercises.push({ group: "核心", ex }));
  safeAbility.forEach((ex: any) => mainExercises.push({ group: "专项能力", ex }));

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

      {/* Pro 3-Section Unified Table */}
      <table className="w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "11%" }} />
          <col style={{ width: "24%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "21%" }} />
        </colgroup>
        <thead>
          <tr className="bg-gray-200" style={{ backgroundColor: "#e5e7eb" }}>
            <th className="border border-gray-400 px-1.5 py-1.5 text-center font-bold text-[11px]">阶段分类</th>
            <th className="border border-gray-400 px-1.5 py-1.5 text-left font-bold text-[11px]">训练内容</th>
            <th className="border border-gray-400 px-1.5 py-1.5 text-center font-bold text-[11px]">负重(kg/BW)</th>
            <th className="border border-gray-400 px-1.5 py-1.5 text-center font-bold text-[11px]">组数</th>
            <th className="border border-gray-400 px-1.5 py-1.5 text-center font-bold text-[11px]">次数/时长</th>
            <th className="border border-gray-400 px-1.5 py-1.5 text-center font-bold text-[11px]">间歇</th>
            <th className="border border-gray-400 px-1.5 py-1.5 text-left font-bold text-[11px]">执教备注</th>
          </tr>
        </thead>
        <tbody>
          {/* Section 1: 准备激活 (Green) */}
          {safeWarmup.length > 0 && (
            <>
              <tr style={{ backgroundColor: "#d4edda" }}>
                <td colSpan={7} className="border border-gray-400 px-2 py-1 font-bold text-xs text-center">
                  准备激活（热身 · FIFA 11+ · {safeWarmup.reduce((s: number, w: any) => s + (w.duration || 0), 0)}min）
                </td>
              </tr>
              {safeWarmup.map((w: any, i: number) => (
                <tr key={`warm-${i}`} style={{ backgroundColor: "#e8f5e9" }}>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">准备激活</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-[10px]">{w.name}</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">BW</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">-</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">{w.duration || "-"}min</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">-</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-[10px]">{autoNotes(w, "warmup")}</td>
                </tr>
              ))}
            </>
          )}

          {/* Section 2: 主体负荷 (Deep Blue) */}
          {mainExercises.length > 0 && (
            <>
              <tr style={{ backgroundColor: "#1a3a5c", color: "#ffffff" }}>
                <td colSpan={7} className="border border-gray-400 px-2 py-1 font-bold text-xs text-center">
                  主体负荷（力量训练 · {mainExercises.length}个动作）
                </td>
              </tr>
              {mainExercises.map(({ group, ex }, i) => (
                <tr key={`main-${i}`} style={{ backgroundColor: "#dce8f5" }}>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">{group}</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-[10px] font-medium">{ex.name}</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">{formatLoad(ex)}</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">{ex.sets || "-"}</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">{formatReps(ex)}</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">{formatRest(ex)}</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-[10px]">{autoNotes(ex, "main")}</td>
                </tr>
              ))}
            </>
          )}

          {/* Section 3: 整理放松 (Yellow) */}
          {safeCooldown.length > 0 && (
            <>
              <tr style={{ backgroundColor: "#fff3cd" }}>
                <td colSpan={7} className="border border-gray-400 px-2 py-1 font-bold text-xs text-center">
                  整理放松（冷身 · 静态拉伸+筋膜放松 · {safeCooldown.reduce((s: number, c: any) => s + (c.duration || 0), 0)}min）
                </td>
              </tr>
              {safeCooldown.map((c: any, i: number) => (
                <tr key={`cool-${i}`} style={{ backgroundColor: "#fff8e1" }}>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">整理放松</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-[10px]">{c.name}</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">BW</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">-</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">{c.duration || "-"}min</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-center text-[10px]">-</td>
                  <td className="border border-gray-300 px-1.5 py-1 text-[10px]">{autoNotes(c, "cooldown")}</td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>

      <p className="text-xs text-gray-400 text-center mt-6 border-t pt-2">
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
      <style global>{`
        @media print {
          body * { visibility: hidden; }
          .export-table, .export-table * { visibility: visible; }
          .export-table { position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: A4; margin: 12mm; }
          /* Force color backgrounds to print */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </>
  );
}
