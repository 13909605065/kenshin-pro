"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrainingModule, PlayerFormData, SessionPlan, TacticalFocus, Microcycle, PositionTraining, NutritionInfo } from "@/lib/types";
import { POSITION_LABELS, GOAL_LABELS, PHASE_LABELS } from "@/lib/constants";

import { FieldDiagram } from "./FieldDiagram";
import { PhysicalTab } from "./tabs/PhysicalTab";
import { ActionBar } from "./ActionBar";
import { WorkoutTimer } from "./WorkoutTimer";
import { CoachSessionTable } from "./CoachSessionTable";
import { AthleteCategoryView } from "./AthleteTrainingView";
import { CoachTacticalBriefing } from "./CoachTacticalBriefing";
import AIAssistant from "./AIAssistant";
import { Printer, Plus, ThumbsUp, ThumbsDown } from "lucide-react";
import { createClient } from "@/lib/supabase/supabase-client";
import MobileTrainingMode from "./MobileTrainingMode";
import { ExerciseEditor } from "./ExerciseEditor";
import type { EditableExercise } from "./ExerciseEditor";

interface Props {
  modules: TrainingModule[];
  formData: PlayerFormData;
  planId: string | null;
  onSaveTemplate?: () => void;
  launchTimer?: boolean;
  onLaunchTimer?: () => void;
}

const ATHLETE_TABS = [
  { id: "physical" as const, label: "体能训练", short: "体能" },
  { id: "nutrition" as const, label: "营养与恢复", short: "营养" },
];

const COACH_TABS = [
  { id: "session" as const, label: "训练教案", short: "教案" },
  { id: "tactical" as const, label: "战术专项", short: "战术" },
  { id: "microcycle" as const, label: "微周期", short: "周期" },
  { id: "nutrition" as const, label: "🥗 营养", short: "营养" },
];

function NutritionTabContent({ modules, role }: { modules: TrainingModule[]; role: string }) {
  const posModule = modules.find((m) => m.module === "position_training") as PositionTraining | undefined;
  const nutrition: NutritionInfo | undefined = posModule?.nutrition;

  if (!nutrition) {
    return (
      <div className="py-8 text-center">
        <span className="text-4xl block mb-3">🥗</span>
        <p className="text-sm text-gray-400">该方案暂未包含营养数据，重新生成即可获取个性化营养建议。</p>
      </div>
    );
  }

  const sections: { key: keyof NutritionInfo; label: string; icon: string }[] = [
    { key: "pre_training", label: "训练前", icon: "🌅" },
    { key: "post_training", label: "训练后", icon: "🔋" },
    { key: "daily_plan", label: "日常饮食", icon: "🍽️" },
    { key: "hydration", label: "补水", icon: "💧" },
    { key: "supplements", label: "补剂", icon: "💊" },
  ];

  return (
    <div className="space-y-3">
      {sections.map(({ key, label, icon }) => {
        const content = nutrition[key];
        if (!content) return null;
        return (
          <div key={key} className="bg-[#1e1e1e]/50 rounded-lg p-4 border-l-2 border-[#992828]">
            <h4 className="text-[#992828] text-xs font-bold mb-2 flex items-center gap-1.5">
              <span>{icon}</span> {label}
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed">{content}</p>
          </div>
        );
      })}
    </div>
  );
}

function CoachSessionView({ module: m }: { module: SessionPlan }) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      {/* Session header */}
      <div className="bg-[#1e1e1e]/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-lg">{m.title}</h3>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="bg-[#1e1e1e] rounded-lg p-2">
            <div className="text-[#992828] font-bold text-xl">{m.duration}</div>
            <div className="text-[10px] text-gray-400">分钟</div>
          </div>
          <div className="bg-[#1e1e1e] rounded-lg p-2">
            <div className="text-[#992828] font-bold text-xl">{m.player_count}</div>
            <div className="text-[10px] text-gray-400">球员</div>
          </div>
          <div className="bg-[#1e1e1e] rounded-lg p-2">
            <div className="text-[#992828] font-bold text-xl">{m.warmup.length}</div>
            <div className="text-[10px] text-gray-400">热身项</div>
          </div>
          <div className="bg-[#1e1e1e] rounded-lg p-2">
            <div className="text-[#992828] font-bold text-xl">{m.activities.length}</div>
            <div className="text-[10px] text-gray-400">练习项</div>
          </div>
        </div>
        {m.equipment.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {m.equipment.map((eq, i) => (
              <span key={i} className="text-[10px] bg-[#222] px-2 py-0.5 rounded text-gray-300">{eq}</span>
            ))}
          </div>
        )}
      </div>

      {/* Warmup */}
      {m.warmup.length > 0 && (
        <div className="border-b border-[#1e1e1e]/30 pb-4 mb-4">
          <h4 className="text-[#992828] text-sm font-bold mb-2">🔥 引导热身 ({m.warmup.reduce((s,w) => s+w.duration, 0)}min)</h4>
          <div className="space-y-2">
            {m.warmup.map((w, i) => (
              <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="font-medium text-white text-sm">{w.name}</span>
                  <span className="text-xs text-gray-400">{w.duration}min</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{w.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activities */}
      {m.activities.length > 0 && (
        <div className="border-b border-[#1e1e1e]/30 pb-4 mb-4">
          <h4 className="text-[#992828] text-sm font-bold mb-2">⚽ 主体训练 ({m.activities.reduce((s,a) => s+a.duration, 0)}min)</h4>
          <div className="space-y-3">
            {m.activities.map((act, i) => (
              <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-4 border-l-2 border-[#992828]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white">{i+1}. {act.name}</span>
                  <span className="text-xs text-[#992828]">{act.duration}min</span>
                </div>
                <div className="flex gap-3 text-[10px] text-gray-400 mb-2">
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
                    <span className="text-[10px] text-gray-400">指导要点:</span>
                    <ul className="list-disc list-inside text-xs text-gray-300 mt-1 space-y-0.5">
                      {act.coaching_points.map((cp, j) => <li key={j}>{cp}</li>)}
                    </ul>
                  </div>
                )}
                <div className="flex gap-4 text-[10px]">
                  <span className="text-green-400">⬆ 进阶: {act.progression}</span>
                  <span className="text-yellow-400">⬇ 退阶: {act.regression}</span>
                </div>
                <div className="flex justify-end mt-2 pt-2 border-t border-[#222]/50">
                  <button
                    className="hidden items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-[#992828] bg-[#992828]/10 border border-[#992828]/20 opacity-50"
                    title="战术板已移至TT项目"
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
        <div className="border-b border-[#1e1e1e]/30 pb-4 mb-4">
          <h4 className="text-[#992828] text-sm font-bold mb-2">🏟️ 分队比赛: {m.ssg.name}</h4>
          <div className="bg-[#1e1e1e]/50 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-3 mb-3 text-center">
              <div><div className="text-white font-bold">{m.ssg.duration}min</div><div className="text-[10px] text-gray-400">时长</div></div>
              <div><div className="text-white font-bold">{m.ssg.area}</div><div className="text-[10px] text-gray-400">场地</div></div>
              <div><div className="text-white font-bold">{m.ssg.players}</div><div className="text-[10px] text-gray-400">人数</div></div>
            </div>
            <p className="text-xs text-gray-400 mb-2">规则: {m.ssg.rules}</p>
            <div className="flex flex-wrap gap-1">
              {m.ssg.coaching_focus.map((cf, i) => (
                <span key={i} className="text-[10px] bg-[#992828]/10 text-[#992828] px-2 py-0.5 rounded">{cf}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cooldown */}
      {m.cooldown.length > 0 && (
        <div>
          <h4 className="text-[#992828] text-sm font-bold mb-2">🧊 冷身整理 ({m.cooldown.reduce((s,c) => s+c.duration, 0)}min)</h4>
          <div className="space-y-2">
            {m.cooldown.map((c, i) => (
              <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="font-medium text-white text-sm">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.duration}min</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{c.description}</p>
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
      <div className="bg-[#1e1e1e]/50 rounded-lg p-4">
        <h3 className="text-white font-bold text-lg">{m.title}</h3>
        <span className="text-xs text-[#992828] bg-[#992828]/10 px-2 py-0.5 rounded">{m.tactical_theme}</span>
      </div>

      {/* Tactical Analysis Bullet Points */}
      {m.tactical_analysis && m.tactical_analysis.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[#992828] text-xs font-bold uppercase tracking-wider">战术核心分析</h4>
          {m.tactical_analysis.map((point, i) => (
            <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-3 flex gap-3">
              <span className="text-[#992828] font-bold flex-shrink-0">{i + 1}.</span>
              <p className="text-sm text-gray-200 leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formation & Pressing/Defensive Shape */}
      {(m.formation_notes || m.pressing_triggers || m.defensive_shape) && (
        <div className="bg-[#1e1e1e]/50 rounded-lg p-4 space-y-3">
          {m.formation_notes && (
            <div>
              <span className="text-xs text-[#992828] font-bold">阵型体系</span>
              <p className="text-xs text-gray-300 mt-1">{m.formation_notes}</p>
            </div>
          )}
          {m.pressing_triggers && (
            <div>
              <span className="text-xs text-[#992828] font-bold">压迫触发</span>
              <p className="text-xs text-gray-300 mt-1">{m.pressing_triggers}</p>
            </div>
          )}
          {m.defensive_shape && (
            <div>
              <span className="text-xs text-[#992828] font-bold">防守阵型</span>
              <p className="text-xs text-gray-300 mt-1">{m.defensive_shape}</p>
            </div>
          )}
        </div>
      )}

      {/* Phases of Play Grid */}
      {(m.build_up_phase || m.midfield_transition || m.final_third || m.defensive_block) && (
        <div>
          <h4 className="text-[#992828] text-xs font-bold uppercase tracking-wider mb-2">比赛阶段</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {m.build_up_phase && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3 border-l-2 border-blue-400">
                <span className="text-[10px] text-blue-400 font-bold">组织推进</span>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">{m.build_up_phase}</p>
              </div>
            )}
            {m.midfield_transition && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3 border-l-2 border-yellow-400">
                <span className="text-[10px] text-yellow-400 font-bold">中场过渡</span>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">{m.midfield_transition}</p>
              </div>
            )}
            {m.final_third && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3 border-l-2 border-green-400">
                <span className="text-[10px] text-green-400 font-bold">前场终结</span>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">{m.final_third}</p>
              </div>
            )}
            {m.defensive_block && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3 border-l-2 border-red-400">
                <span className="text-[10px] text-red-400 font-bold">防守阵块</span>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">{m.defensive_block}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attacking & Counter */}
      {(m.attacking_patterns || m.counter_structure) && (
        <div className="bg-[#1e1e1e]/50 rounded-lg p-4 space-y-3">
          {m.attacking_patterns && (
            <div>
              <span className="text-xs text-[#992828] font-bold">进攻模式</span>
              <p className="text-xs text-gray-300 mt-1">{m.attacking_patterns}</p>
            </div>
          )}
          {m.counter_structure && (
            <div>
              <span className="text-xs text-[#992828] font-bold">反击结构</span>
              <p className="text-xs text-gray-300 mt-1">{m.counter_structure}</p>
            </div>
          )}
        </div>
      )}

      {/* Transition & Set Pieces */}
      {(m.transition_moments || m.set_piece_offense || m.set_piece_defense) && (
        <div className="bg-[#1e1e1e]/50 rounded-lg p-4 space-y-3">
          {m.transition_moments && (
            <div>
              <span className="text-xs text-[#992828] font-bold">攻守转换</span>
              <p className="text-xs text-gray-300 mt-1">{m.transition_moments}</p>
            </div>
          )}
          {(m.set_piece_offense || m.set_piece_defense) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {m.set_piece_offense && (
                <div className="bg-[#1e1e1e]/50 rounded p-2 border-l-2 border-green-500">
                  <span className="text-[10px] text-green-400 font-bold">进攻定位球</span>
                  <p className="text-[11px] text-gray-300 mt-1">{m.set_piece_offense}</p>
                </div>
              )}
              {m.set_piece_defense && (
                <div className="bg-[#1e1e1e]/50 rounded p-2 border-l-2 border-red-500">
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
          <h4 className="text-[#992828] text-xs font-bold uppercase tracking-wider mb-2">球员战术角色</h4>
          <div className="space-y-1.5">
            {m.player_roles.map((role, i) => (
              <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-2.5 flex items-start gap-2">
                <span className="text-[#992828] text-sm flex-shrink-0">&#9733;</span>
                <p className="text-xs text-gray-200 leading-relaxed">{role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider before drills */}
      {(m.tactical_analysis || m.formation_notes || m.build_up_phase) && m.drills.length > 0 && (
        <div className="border-t border-[#222] pt-2">
          <h4 className="text-[#992828] text-xs font-bold uppercase tracking-wider mb-3">训练练习</h4>
        </div>
      )}

      {m.drills.length > 0 && (
        <div className="space-y-3">
          {m.drills.map((drill, i) => (
            <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-4 border-l-2 border-[#992828]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white">{i+1}. {drill.name}</span>
                <span className="text-xs text-[#992828]">{drill.duration}min</span>
              </div>
              <div className="flex gap-3 text-[10px] text-gray-400 mb-2">
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
                  <span className="text-[10px] text-gray-400">指导要点:</span>
                  <ul className="list-disc list-inside text-xs text-gray-300 mt-1 space-y-0.5">
                    {drill.coaching_points.map((cp, j) => <li key={j}>{cp}</li>)}
                  </ul>
                </div>
              )}
              <div className="flex gap-4 text-[10px]">
                <span className="text-green-400">⬆ 进阶: {drill.progression}</span>
                <span className="text-yellow-400">⬇ 退阶: {drill.regression}</span>
              </div>
              <div className="flex justify-end mt-2 pt-2 border-t border-[#222]/50">
                <button
                  className="hidden items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-[#992828] bg-[#992828]/10 border border-[#992828]/20 opacity-50"
                  title="战术板已移至TT项目"
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
    "中": "bg-yellow-500", "中高": "bg-orange-500", "高": "bg-[#992828]", "极高": "bg-[#992828]",
  };
  return (
    <div className="space-y-4">
      <div className="bg-[#1e1e1e]/50 rounded-lg p-4">
        <h3 className="text-white font-bold text-lg">{m.title}</h3>
        <p className="text-xs text-gray-400">比赛日: <span className="text-[#992828]">{m.match_day}</span></p>
      </div>
      <div className="space-y-2">
        {m.days.map((d, i) => (
          <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-3 flex items-center gap-3">
            <div className="flex-shrink-0 w-16">
              <span className="text-xs text-gray-400">{d.day}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">{d.focus}</p>
              <p className="text-[10px] text-gray-400">{d.session_type} · {d.duration}min</p>
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


function FeedbackInline({ planId }: { planId: string | null }) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const supabase = createClient();
  const sendFeedback = async (rating: "up" | "down") => {
    if (feedback === rating || !planId) return;
    setFeedback(rating);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("feedback").upsert({ plan_id: planId, user_id: user.id, rating });
  };
  return (
    <div className="flex items-center justify-center gap-2">
      <button onClick={() => sendFeedback("up")}
        className={`p-2 rounded-lg transition ${
          feedback === "up" ? "bg-[#992828]/20 text-[#992828]" : "text-gray-400 hover:text-gray-300 hover:bg-[#222]"
        }`}>
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button onClick={() => sendFeedback("down")}
        className={`p-2 rounded-lg transition ${
          feedback === "down" ? "bg-red-500/20 text-red-400" : "text-gray-400 hover:text-gray-300 hover:bg-[#222]"
        }`}>
        <ThumbsDown className="w-4 h-4" />
      </button>
    </div>
  );
}

export function TrainingTabs({ modules, formData, planId, onSaveTemplate, launchTimer, onLaunchTimer }: Props) {
  const router = useRouter();
  const isCoach = formData.role === "coach";
  const tabs = isCoach ? COACH_TABS : ATHLETE_TABS;
  const [activeTab, setActiveTab] = useState<string>(tabs[0].id);
  const [showTimer, setShowTimer] = useState(false);
  const [showMobileMode, setShowMobileMode] = useState(false);

  // Editable modules state — deep copy on init
  const [editableModules, setEditableModules] = useState<TrainingModule[]>(() =>
    JSON.parse(JSON.stringify(modules))
  );
  // Reset editableModules when modules prop changes (new plan generated)
  const [prevModulesRef, setPrevModulesRef] = useState(modules);
  if (modules !== prevModulesRef) {
    setPrevModulesRef(modules);
    setEditableModules(JSON.parse(JSON.stringify(modules)));
  }

  // Exercise editor state
  const [editingExercise, setEditingExercise] = useState<{
    moduleType: string;
    category: string;
    index: number;
    exercise: EditableExercise;
  } | null>(null);

  const handleUpdateExercise = (
    moduleType: string,
    category: string,
    index: number,
    updated: EditableExercise
  ) => {
    setEditableModules((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as TrainingModule[];
      const mod = next.find((m: any) => m.module === moduleType);
      if (mod) {
        const arr = (mod as any)[category];
        if (arr && arr[index]) {
          arr[index] = { ...arr[index], ...updated };
        }
      }
      return next;
    });
  };

  const handleOpenExerciseEditor = (
    moduleType: string,
    category: string,
    index: number,
    exercise: any
  ) => {
    setEditingExercise({
      moduleType,
      category,
      index,
      exercise: {
        name: exercise.name || "",
        sets: exercise.sets || 0,
        reps: exercise.reps || 0,
        load: exercise.load || "",
        rest: exercise.rest || 0,
        rpe: exercise.rpe || 0,
      },
    });
  };

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

  // Auto-launch timer when coming from Dashboard pitch "计时跟练" / "开始训练"
  useEffect(() => {
    if (launchTimer) {
      setShowTimer(true);
      onLaunchTimer?.();
    }
  }, [launchTimer, onLaunchTimer]);

  // Coach module lookup — use editableModules
  const sessionPlan = editableModules.find(m => m.module === "session_plan") as SessionPlan | undefined;
  const tacticalFocus = editableModules.find(m => m.module === "tactical_focus") as TacticalFocus | undefined;
  const microcycle = editableModules.find(m => m.module === "microcycle") as Microcycle | undefined;
  // Athlete module lookup
  const posModule = editableModules.find(m => m.module === "position_training") as import("@/lib/types").PositionTraining | undefined;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_180px] lg:gap-4">

      {/* ===== LEFT COLUMN: Main Content ===== */}
      <div className="flex flex-col min-w-0">
      {/* Top: Summary Card */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#992828]/20 flex items-center justify-center">
            <span className="text-[#992828] font-bold text-sm">
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
        </div>
      </div>

      {/* Personalization Analysis — athlete only */}
      {!isCoach && posModule?.analysis && (
        <div className="mb-4 bg-[#992828]/5 border border-[#992828]/20 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">🔍</span>
            <div>
              <p className="text-[10px] text-[#992828] font-bold mb-1 uppercase tracking-wider">个性化诊断分析</p>
              <p className="text-sm text-gray-200 leading-relaxed">{posModule.analysis}</p>
            </div>
          </div>
        </div>
      )}

      {/* Athlete category view — simplified mobile-friendly cards */}
      {!isCoach && (
        <div className="flex-1 mb-4 lg:hidden">
          <AthleteCategoryView modules={editableModules}/>
        </div>
      )}

      {/* Tab view — all roles */}
      <>
      {/* Action bar */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-gray-500">AI 生成结果</span>
        <button
          onClick={() => {
            const bridgeData = { modules: editableModules, formData, savedAt: new Date().toISOString() };
            localStorage.setItem('kenshin_ai_to_planning', JSON.stringify(bridgeData));
            router.push('/planning');
          }}
          className="text-[10px] px-3 py-1.5 bg-[#1a1a1a] border border-[#333] hover:border-[#992828] text-gray-400 hover:text-[#992828] rounded-lg transition"
        >
          📋 推送到周期方案
        </button>
      </div>
      {/* Tab Bar */}
      <div className="flex flex-wrap justify-center gap-x-1 border-b border-[#1e1e1e] mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all duration-150 whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[#992828] text-[#992828] bg-[#291a1a]"
                : "border-transparent text-gray-400 hover:text-gray-300 hover:bg-[#291a1a]"
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
              <CoachSessionTable modules={[sessionPlan]} />
            )}
            {activeTab === "session" && !sessionPlan && (
              <p className="text-sm text-gray-400 py-8 text-center">暂无训练教案内容</p>
            )}
            {activeTab === "tactical" && tacticalFocus && (
              <CoachTacticalBriefing module={tacticalFocus} />
            )}
            {activeTab === "tactical" && !tacticalFocus && (
              <p className="text-sm text-gray-400 py-8 text-center">暂无战术专项内容</p>
            )}
            {activeTab === "microcycle" && microcycle && (
              <CoachMicrocycleView module={microcycle} />
            )}
            {activeTab === "microcycle" && !microcycle && (
              <div className="space-y-3 py-4">
                <p className="text-xs text-gray-400 mb-3 text-center">暂无AI生成的微周期，以下为预设模板参考：</p>
                {([
                  { day: "赛前3天", intensity: "中高", color: "bg-orange-500", borderColor: "border-orange-500", focus: "高强度战术演练与位置专项" },
                  { day: "赛前2天", intensity: "中等", color: "bg-yellow-500", borderColor: "border-yellow-500", focus: "团队配合与半场攻防" },
                  { day: "赛前1天", intensity: "低", color: "bg-green-500", borderColor: "border-green-500", focus: "轻度激活与定位球复习" },
                  { day: "比赛日", intensity: "比赛", color: "bg-[#992828]", borderColor: "border-[#992828]", focus: "比赛执行与临场调整" },
                  { day: "赛后1天", intensity: "恢复", color: "bg-gray-500", borderColor: "border-gray-500", focus: "主动恢复与伤病评估" },
                ] as const).map((t, i) => (
                  <div key={i} className={`bg-[#1e1e1e]/50 rounded-lg p-4 border-l-2 ${t.borderColor}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-sm">{t.day}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${t.color}`}>{t.intensity}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{t.focus}</p>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "nutrition" && (
              <NutritionTabContent modules={editableModules} role="coach" />
            )}
          </>
        ) : (
          <>
            {activeTab === "physical" && (
              <PhysicalTab
                modules={editableModules}
                position={formData.position}
                onUpdateExercise={handleOpenExerciseEditor}
              />
            )}
            {activeTab === "nutrition" && (
              <NutritionTabContent modules={editableModules} role="coach" />
            )}
          </>
        )}
      </div>
      </>

      {/* Bottom bar — mobile only */}
      <div className="lg:hidden sticky bottom-0 bg-[#121212]/95 backdrop-blur pt-3 border-t border-[#1e1e1e] mt-4 space-y-2">
        <ActionBar
          modules={editableModules}
          formData={formData}
          planId={planId}
          onSaveTemplate={onSaveTemplate}
        />
      </div>

      {/* Desktop bottom bar — without feedback (it's in the sidebar) */}
      <div className="hidden lg:block sticky bottom-0 bg-[#121212]/95 backdrop-blur pt-3 border-t border-[#1e1e1e] mt-4 space-y-2">
        <ActionBar
          modules={editableModules}
          formData={formData}
          planId={planId}
          onSaveTemplate={onSaveTemplate}
          hideFeedback
        />
      </div>
    </div>

    {/* ===== RIGHT COLUMN: Desktop Feedback Sidebar ===== */}
    <div className="hidden lg:block">
      <div className="sticky top-20 space-y-3">
        {/* Feedback Card */}
        <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-4 text-center">
          <p className="text-[11px] text-gray-400 mb-3">方案评价</p>
          <FeedbackInline planId={planId} />
          <p className="text-[9px] text-gray-600 mt-3 leading-relaxed">你的反馈会帮助<br/>AI 为你优化方案</p>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-3 flex flex-col gap-1.5">
          <button onClick={() => window.print()} className="w-full text-[11px] py-2 px-3 rounded-lg bg-[#121212] border border-[#222] text-gray-400 hover:text-white hover:border-[#555] transition flex items-center gap-2">
            <Printer className="w-3.5 h-3.5" /> 导出PDF
          </button>
          <button onClick={() => window.location.reload()} className="w-full text-[11px] py-2 px-3 rounded-lg bg-[#992828] text-white font-medium hover:bg-[#7a1e1e] transition flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> 新方案
          </button>
        </div>
      </div>
    </div>
  </div>

  {/* Full-screen Workout Timer overlay */}
  {showTimer && (
    <WorkoutTimer
      modules={editableModules}
      planId={planId || undefined}
      onClose={() => setShowTimer(false)}
    />
  )}
  {showMobileMode && (
    <MobileTrainingMode
      modules={editableModules}
      planId={planId}
      onClose={() => setShowMobileMode(false)}
    />
  )}

  {/* Exercise Editor Modal */}
  {editingExercise && (
    <ExerciseEditor
      exercise={editingExercise.exercise}
      onSave={(updated) => {
        handleUpdateExercise(
          editingExercise.moduleType,
          editingExercise.category,
          editingExercise.index,
          updated
        );
        setEditingExercise(null);
      }}
      onCancel={() => setEditingExercise(null)}
    />
  )}

  <AIAssistant />
  );
}
