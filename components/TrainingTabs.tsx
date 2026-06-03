"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TrainingModule, PlayerFormData, SessionPlan, TacticalFocus, Microcycle } from "@/lib/types";
import { POSITION_LABELS, GOAL_LABELS, PHASE_LABELS } from "@/lib/constants";
import { writeDrillContext } from "@/lib/tactics-bridge";
import { FieldDiagram } from "./FieldDiagram";
import { WarmupTab } from "./tabs/WarmupTab";
import { TechniqueTab } from "./tabs/TechniqueTab";
import { PhysicalTab } from "./tabs/PhysicalTab";
import { TacticalTab } from "./tabs/TacticalTab";
import { NutritionTab } from "./tabs/NutritionTab";
import { ActionBar } from "./ActionBar";
import { WorkoutTimer } from "./WorkoutTimer";
import { SequentialTrainingList } from "./SequentialTrainingList";
import { CoachSessionTable } from "./CoachSessionTable";
import { AthleteSequentialView, AthleteCategoryView } from "./AthleteTrainingView";

interface Props {
  modules: TrainingModule[];
  formData: PlayerFormData;
  planId: string | null;
  onSaveTemplate?: () => void;
}

const ATHLETE_TABS = [
  { id: "warmup" as const, label: "热身", short: "热身" },
  { id: "technique" as const, label: "技术训练", short: "技术" },
  { id: "physical" as const, label: "体能训练", short: "体能" },
  { id: "tactical" as const, label: "战术要点", short: "战术" },
  { id: "nutrition" as const, label: "饮食与恢复", short: "饮食" },
];

const COACH_TABS = [
  { id: "session" as const, label: "训练教案", short: "教案" },
  { id: "tactical" as const, label: "战术专项", short: "战术" },
  { id: "microcycle" as const, label: "微周期", short: "周期" },
];

function CoachSessionView({ module: m }: { module: SessionPlan }) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      {/* Session header */}
      <div className="bg-pitch-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-lg">{m.title}</h3>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="bg-pitch-800 rounded-lg p-2">
            <div className="text-neon-pink font-bold text-xl">{m.duration}</div>
            <div className="text-[10px] text-gray-500">分钟</div>
          </div>
          <div className="bg-pitch-800 rounded-lg p-2">
            <div className="text-neon-pink font-bold text-xl">{m.player_count}</div>
            <div className="text-[10px] text-gray-500">球员</div>
          </div>
          <div className="bg-pitch-800 rounded-lg p-2">
            <div className="text-neon-pink font-bold text-xl">{m.warmup.length}</div>
            <div className="text-[10px] text-gray-500">热身项</div>
          </div>
          <div className="bg-pitch-800 rounded-lg p-2">
            <div className="text-neon-pink font-bold text-xl">{m.activities.length}</div>
            <div className="text-[10px] text-gray-500">练习项</div>
          </div>
        </div>
        {m.equipment.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {m.equipment.map((eq, i) => (
              <span key={i} className="text-[10px] bg-pitch-600 px-2 py-0.5 rounded text-gray-300">{eq}</span>
            ))}
          </div>
        )}
      </div>

      {/* Warmup */}
      {m.warmup.length > 0 && (
        <div className="border-b border-pitch-700/30 pb-4 mb-4">
          <h4 className="text-neon-pink text-sm font-bold mb-2">🔥 引导热身 ({m.warmup.reduce((s,w) => s+w.duration, 0)}min)</h4>
          <div className="space-y-2">
            {m.warmup.map((w, i) => (
              <div key={i} className="bg-pitch-700/50 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="font-medium text-white text-sm">{w.name}</span>
                  <span className="text-xs text-gray-400">{w.duration}min</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{w.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activities */}
      {m.activities.length > 0 && (
        <div className="border-b border-pitch-700/30 pb-4 mb-4">
          <h4 className="text-neon-pink text-sm font-bold mb-2">⚽ 主体训练 ({m.activities.reduce((s,a) => s+a.duration, 0)}min)</h4>
          <div className="space-y-3">
            {m.activities.map((act, i) => (
              <div key={i} className="bg-pitch-700/50 rounded-lg p-4 border-l-2 border-neon-pink">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white">{i+1}. {act.name}</span>
                  <span className="text-xs text-neon-pink">{act.duration}min</span>
                </div>
                <div className="flex gap-3 text-[10px] text-gray-500 mb-2">
                  <span>场地: {act.area}</span>
                  <span>分组: {act.groups}</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{act.description}</p>
                {act.diagram && (
                  <div className="mb-3">
                    <FieldDiagram diagram={act.diagram} />
                  </div>
                )}
                {act.coaching_points.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[10px] text-gray-500">指导要点:</span>
                    <ul className="list-disc list-inside text-xs text-gray-300 mt-1 space-y-0.5">
                      {act.coaching_points.map((cp, j) => <li key={j}>{cp}</li>)}
                    </ul>
                  </div>
                )}
                <div className="flex gap-4 text-[10px]">
                  <span className="text-green-400">⬆ 进阶: {act.progression}</span>
                  <span className="text-yellow-400">⬇ 退阶: {act.regression}</span>
                </div>
                <div className="flex justify-end mt-2 pt-2 border-t border-pitch-600/50">
                  <button
                    onClick={() => { writeDrillContext(act); router.push("/tactics"); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-neon-pink bg-neon-pink/10 hover:bg-neon-pink/20 transition border border-neon-pink/20 hover:border-neon-pink/40"
                    title="在战术板上打开此练习"
                  >
                    📋 在战术板打开
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SSG */}
      {m.ssg && (
        <div className="border-b border-pitch-700/30 pb-4 mb-4">
          <h4 className="text-neon-pink text-sm font-bold mb-2">🏟️ 分队比赛: {m.ssg.name}</h4>
          <div className="bg-pitch-700/50 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-3 mb-3 text-center">
              <div><div className="text-white font-bold">{m.ssg.duration}min</div><div className="text-[10px] text-gray-500">时长</div></div>
              <div><div className="text-white font-bold">{m.ssg.area}</div><div className="text-[10px] text-gray-500">场地</div></div>
              <div><div className="text-white font-bold">{m.ssg.players}</div><div className="text-[10px] text-gray-500">人数</div></div>
            </div>
            <p className="text-xs text-gray-400 mb-2">规则: {m.ssg.rules}</p>
            <div className="flex flex-wrap gap-1">
              {m.ssg.coaching_focus.map((cf, i) => (
                <span key={i} className="text-[10px] bg-neon-pink/10 text-neon-pink px-2 py-0.5 rounded">{cf}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cooldown */}
      {m.cooldown.length > 0 && (
        <div>
          <h4 className="text-neon-pink text-sm font-bold mb-2">🧊 冷身整理 ({m.cooldown.reduce((s,c) => s+c.duration, 0)}min)</h4>
          <div className="space-y-2">
            {m.cooldown.map((c, i) => (
              <div key={i} className="bg-pitch-700/50 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="font-medium text-white text-sm">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.duration}min</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CoachTacticalView({ module: m }: { module: TacticalFocus }) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="bg-pitch-700/50 rounded-lg p-4">
        <h3 className="text-white font-bold text-lg">{m.title}</h3>
        <span className="text-xs text-neon-pink bg-neon-pink/10 px-2 py-0.5 rounded">{m.tactical_theme}</span>
      </div>

      {/* Tactical Analysis Bullet Points */}
      {m.tactical_analysis && m.tactical_analysis.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-neon-pink text-xs font-bold uppercase tracking-wider">战术核心分析</h4>
          {m.tactical_analysis.map((point, i) => (
            <div key={i} className="bg-pitch-700/50 rounded-lg p-3 flex gap-3">
              <span className="text-neon-pink font-bold flex-shrink-0">{i + 1}.</span>
              <p className="text-sm text-gray-200 leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formation & Pressing/Defensive Shape */}
      {(m.formation_notes || m.pressing_triggers || m.defensive_shape) && (
        <div className="bg-pitch-700/50 rounded-lg p-4 space-y-3">
          {m.formation_notes && (
            <div>
              <span className="text-xs text-neon-pink font-bold">阵型体系</span>
              <p className="text-xs text-gray-300 mt-1">{m.formation_notes}</p>
            </div>
          )}
          {m.pressing_triggers && (
            <div>
              <span className="text-xs text-neon-pink font-bold">压迫触发</span>
              <p className="text-xs text-gray-300 mt-1">{m.pressing_triggers}</p>
            </div>
          )}
          {m.defensive_shape && (
            <div>
              <span className="text-xs text-neon-pink font-bold">防守阵型</span>
              <p className="text-xs text-gray-300 mt-1">{m.defensive_shape}</p>
            </div>
          )}
        </div>
      )}

      {/* Phases of Play Grid */}
      {(m.build_up_phase || m.midfield_transition || m.final_third || m.defensive_block) && (
        <div>
          <h4 className="text-neon-pink text-xs font-bold uppercase tracking-wider mb-2">比赛阶段</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {m.build_up_phase && (
              <div className="bg-pitch-700/50 rounded-lg p-3 border-l-2 border-blue-400">
                <span className="text-[10px] text-blue-400 font-bold">组织推进</span>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">{m.build_up_phase}</p>
              </div>
            )}
            {m.midfield_transition && (
              <div className="bg-pitch-700/50 rounded-lg p-3 border-l-2 border-yellow-400">
                <span className="text-[10px] text-yellow-400 font-bold">中场过渡</span>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">{m.midfield_transition}</p>
              </div>
            )}
            {m.final_third && (
              <div className="bg-pitch-700/50 rounded-lg p-3 border-l-2 border-green-400">
                <span className="text-[10px] text-green-400 font-bold">前场终结</span>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">{m.final_third}</p>
              </div>
            )}
            {m.defensive_block && (
              <div className="bg-pitch-700/50 rounded-lg p-3 border-l-2 border-red-400">
                <span className="text-[10px] text-red-400 font-bold">防守阵块</span>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">{m.defensive_block}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attacking & Counter */}
      {(m.attacking_patterns || m.counter_structure) && (
        <div className="bg-pitch-700/50 rounded-lg p-4 space-y-3">
          {m.attacking_patterns && (
            <div>
              <span className="text-xs text-neon-pink font-bold">进攻模式</span>
              <p className="text-xs text-gray-300 mt-1">{m.attacking_patterns}</p>
            </div>
          )}
          {m.counter_structure && (
            <div>
              <span className="text-xs text-neon-pink font-bold">反击结构</span>
              <p className="text-xs text-gray-300 mt-1">{m.counter_structure}</p>
            </div>
          )}
        </div>
      )}

      {/* Transition & Set Pieces */}
      {(m.transition_moments || m.set_piece_offense || m.set_piece_defense) && (
        <div className="bg-pitch-700/50 rounded-lg p-4 space-y-3">
          {m.transition_moments && (
            <div>
              <span className="text-xs text-neon-pink font-bold">攻守转换</span>
              <p className="text-xs text-gray-300 mt-1">{m.transition_moments}</p>
            </div>
          )}
          {(m.set_piece_offense || m.set_piece_defense) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {m.set_piece_offense && (
                <div className="bg-pitch-800/50 rounded p-2 border-l-2 border-green-500">
                  <span className="text-[10px] text-green-400 font-bold">进攻定位球</span>
                  <p className="text-[11px] text-gray-300 mt-1">{m.set_piece_offense}</p>
                </div>
              )}
              {m.set_piece_defense && (
                <div className="bg-pitch-800/50 rounded p-2 border-l-2 border-red-500">
                  <span className="text-[10px] text-red-400 font-bold">防守定位球</span>
                  <p className="text-[11px] text-gray-300 mt-1">{m.set_piece_defense}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Player Roles */}
      {m.player_roles && m.player_roles.length > 0 && (
        <div>
          <h4 className="text-neon-pink text-xs font-bold uppercase tracking-wider mb-2">球员战术角色</h4>
          <div className="space-y-1.5">
            {m.player_roles.map((role, i) => (
              <div key={i} className="bg-pitch-700/50 rounded-lg p-2.5 flex items-start gap-2">
                <span className="text-neon-pink text-sm flex-shrink-0">&#9733;</span>
                <p className="text-xs text-gray-200 leading-relaxed">{role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider before drills */}
      {(m.tactical_analysis || m.formation_notes || m.build_up_phase) && m.drills.length > 0 && (
        <div className="border-t border-pitch-600 pt-2">
          <h4 className="text-neon-pink text-xs font-bold uppercase tracking-wider mb-3">训练练习</h4>
        </div>
      )}

      {m.drills.length > 0 && (
        <div className="space-y-3">
          {m.drills.map((drill, i) => (
            <div key={i} className="bg-pitch-700/50 rounded-lg p-4 border-l-2 border-neon-pink">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white">{i+1}. {drill.name}</span>
                <span className="text-xs text-neon-pink">{drill.duration}min</span>
              </div>
              <div className="flex gap-3 text-[10px] text-gray-500 mb-2">
                <span>场地: {drill.area}</span>
                <span>分组: {drill.groups}</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{drill.description}</p>
              {drill.diagram && (
                <div className="mb-3">
                  <FieldDiagram diagram={drill.diagram} />
                </div>
              )}
              {drill.coaching_points.length > 0 && (
                <div className="mb-2">
                  <span className="text-[10px] text-gray-500">指导要点:</span>
                  <ul className="list-disc list-inside text-xs text-gray-300 mt-1 space-y-0.5">
                    {drill.coaching_points.map((cp, j) => <li key={j}>{cp}</li>)}
                  </ul>
                </div>
              )}
              <div className="flex gap-4 text-[10px]">
                <span className="text-green-400">⬆ 进阶: {drill.progression}</span>
                <span className="text-yellow-400">⬇ 退阶: {drill.regression}</span>
              </div>
              <div className="flex justify-end mt-2 pt-2 border-t border-pitch-600/50">
                <button
                  onClick={() => { writeDrillContext(drill); router.push("/tactics"); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-neon-pink bg-neon-pink/10 hover:bg-neon-pink/20 transition border border-neon-pink/20 hover:border-neon-pink/40"
                  title="在战术板上打开此练习"
                >
                  📋 在战术板打开
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CoachMicrocycleView({ module: m }: { module: Microcycle }) {
  const intensityColors: Record<string, string> = {
    "极低": "bg-gray-500", "低": "bg-green-500", "中低": "bg-green-400",
    "中": "bg-yellow-500", "中高": "bg-orange-500", "高": "bg-neon-pink", "极高": "bg-neon-red",
  };
  return (
    <div className="space-y-4">
      <div className="bg-pitch-700/50 rounded-lg p-4">
        <h3 className="text-white font-bold text-lg">{m.title}</h3>
        <p className="text-xs text-gray-400">比赛日: <span className="text-neon-pink">{m.match_day}</span></p>
      </div>
      <div className="space-y-2">
        {m.days.map((d, i) => (
          <div key={i} className="bg-pitch-700/50 rounded-lg p-3 flex items-center gap-3">
            <div className="flex-shrink-0 w-16">
              <span className="text-xs text-gray-400">{d.day}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">{d.focus}</p>
              <p className="text-[10px] text-gray-500">{d.session_type} · {d.duration}min</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${intensityColors[d.intensity] || "bg-gray-500"}`} />
              <span className="text-[10px] text-gray-400">{d.intensity}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrainingTabs({ modules, formData, planId, onSaveTemplate }: Props) {
  const router = useRouter();
  const isCoach = formData.role === "coach";
  const tabs = isCoach ? COACH_TABS : ATHLETE_TABS;
  const [activeTab, setActiveTab] = useState<string>(tabs[0].id);
  const [showTimer, setShowTimer] = useState(false);
  const [viewMode, setViewMode] = useState<"sequential" | "tabs">(isCoach ? "tabs" : "sequential");
  const touchStartX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    const currentIdx = tabs.findIndex((t) => t.id === activeTab);
    if (diff > 0 && currentIdx < tabs.length - 1) {
      setActiveTab(tabs[currentIdx + 1].id);
    } else if (diff < 0 && currentIdx > 0) {
      setActiveTab(tabs[currentIdx - 1].id);
    }
  }, [activeTab, tabs]);

  // Coach module lookup
  const sessionPlan = modules.find(m => m.module === "session_plan") as SessionPlan | undefined;
  const tacticalFocus = modules.find(m => m.module === "tactical_focus") as TacticalFocus | undefined;
  const microcycle = modules.find(m => m.module === "microcycle") as Microcycle | undefined;
  // Athlete module lookup
  const posModule = modules.find(m => m.module === "position_training") as import("@/lib/types").PositionTraining | undefined;

  return (
    <div className="flex flex-col">
      {/* Top: Summary Card */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neon-pink/20 flex items-center justify-center">
            <span className="text-neon-pink font-bold text-sm">
              {isCoach ? "教" : (formData.position ? POSITION_LABELS[formData.position][0] : "?")}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">
              {isCoach
                ? (sessionPlan?.title || "教练方案")
                : (formData.position ? POSITION_LABELS[formData.position] : "球员方案")
              }
            </p>
            {!isCoach && (
              <p className="text-xs text-gray-400 truncate">
                {formData.age ?? "?"}岁 · {formData.height ?? "?"}cm · {formData.weight ?? "?"}kg
                {formData.goal && ` · ${GOAL_LABELS[formData.goal]}`}
                {formData.phase && ` · ${PHASE_LABELS[formData.phase]}`}
              </p>
            )}
            {isCoach && sessionPlan && (
              <p className="text-xs text-gray-400 truncate">
                {sessionPlan.duration}分钟 · {sessionPlan.player_count}人 · {sessionPlan.activities.length + 1}项练习
              </p>
            )}
          </div>
          {/* Athlete start training button */}
          {!isCoach && (
            <button
              onClick={() => setShowTimer(true)}
              className="mt-3 w-full py-2.5 bg-neon-pink text-black font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-neon-pink/90 transition active:scale-[0.98]"
            >
              <span className="text-base">▶</span> 开始训练
            </button>
          )}
        </div>
      </div>

      {/* Personalization Analysis — athlete only */}
      {!isCoach && posModule?.analysis && (
        <div className="mb-4 bg-neon-pink/5 border border-neon-pink/20 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">🔍</span>
            <div>
              <p className="text-[10px] text-neon-pink font-bold mb-1 uppercase tracking-wider">个性化诊断分析</p>
              <p className="text-sm text-gray-200 leading-relaxed">{posModule.analysis}</p>
            </div>
          </div>
        </div>
      )}

      {/* View toggle — athlete dual view */}
      {!isCoach && (
        <div className="flex justify-center mb-3">
          <div className="flex bg-[#111] rounded-lg p-0.5">
            <button onClick={() => setViewMode("sequential")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${viewMode==="sequential"?"bg-neon-pink text-black":"text-gray-400 hover:text-white"}`}>
              📋 顺序跟练
            </button>
            <button onClick={() => setViewMode("tabs")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${viewMode==="tabs"?"bg-neon-pink text-black":"text-gray-400 hover:text-white"}`}>
              📑 分类数据
            </button>
          </div>
        </div>
      )}

      {/* Athlete sequential — clean card view */}
      {!isCoach && viewMode === "sequential" && (
        <div className="flex-1">
          <AthleteSequentialView modules={modules} formData={formData}/>
        </div>
      )}

      {/* Athlete category — table + export */}
      {!isCoach && viewMode === "tabs" && (
        <div className="flex-1">
          <AthleteCategoryView modules={modules}/>
        </div>
      )}

      {/* Tab view — coach only */}
      {isCoach && (
      <>
      {/* Tab Bar */}
      <div className="flex flex-wrap justify-center gap-x-1 border-b border-pitch-700 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "border-neon-pink text-neon-pink"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="sm:hidden">{tab.short}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {isCoach ? (
          <>
            {activeTab === "session" && sessionPlan && (
              <CoachSessionTable modules={[sessionPlan]} onOpenDiagram={(d) => {
                if (d) { writeDrillContext(d as any); router.push("/tactics"); }
              }} />
            )}
            {activeTab === "session" && !sessionPlan && (
              <p className="text-sm text-gray-500 py-8 text-center">暂无训练教案内容</p>
            )}
            {activeTab === "tactical" && tacticalFocus && (
              <CoachTacticalView module={tacticalFocus} />
            )}
            {activeTab === "tactical" && !tacticalFocus && (
              <p className="text-sm text-gray-500 py-8 text-center">暂无战术专项内容</p>
            )}
            {activeTab === "microcycle" && microcycle && (
              <CoachMicrocycleView module={microcycle} />
            )}
            {activeTab === "microcycle" && !microcycle && (
              <p className="text-sm text-gray-500 py-8 text-center">暂无微周期内容</p>
            )}
          </>
        ) : (
          <>
            {activeTab === "warmup" && (
              <WarmupTab modules={modules} position={formData.position} />
            )}
            {activeTab === "technique" && (
              <TechniqueTab modules={modules} />
            )}
            {activeTab === "physical" && (
              <PhysicalTab modules={modules} position={formData.position} />
            )}
            {activeTab === "tactical" && (
              <TacticalTab modules={modules} />
            )}
            {activeTab === "nutrition" && (
              <NutritionTab modules={modules} />
            )}
          </>
        )}
      </div>
      </>
      )}

      {/* Bottom: Fixed Action Bar */}
      <div className="sticky bottom-0 bg-pitch-900/95 backdrop-blur pt-4 border-t border-pitch-700 mt-4">
        <ActionBar
          modules={modules}
          formData={formData}
          planId={planId}
          onSaveTemplate={onSaveTemplate}
        />
      </div>

      {/* Full-screen Workout Timer overlay */}
      {showTimer && (
        <WorkoutTimer
          modules={modules}
          planId={planId || undefined}
          onClose={() => setShowTimer(false)}
        />
      )}
    </div>
  );
}
