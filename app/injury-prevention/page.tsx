"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronRight, Trash2, Sparkles, Plus } from "lucide-react";
import { getPlayers, type PlayerRecord } from "@/lib/roster-utils";
import { useSyncVersion } from "@/lib/data-events";
import { MobileNav } from "@/components/MobileNav";
import { useTeam } from "@/lib/team-context";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface PlanExercise {
  exercise_id: string;
  name: string;
  sets: number;
  reps: string;
  load: string;
  rest: string;
  rationale: string;
}

interface PrehabPlan {
  risk_assessment: string;
  exercises: PlanExercise[];
  fifa_11_plus: {
    nordic_curl: boolean;
    plank: boolean;
    side_bridge: boolean;
    single_leg_balance: boolean;
    nordic_level?: string;
  };
  tissue_stage: "acute" | "proliferation" | "remodeling" | "functional" | null;
  load_guidelines: {
    acwr_target: string;
    progression: string;
    weekly_sessions?: number;
    session_duration?: string;
  };
  recovery_recommendations: string[];
}

interface SavedPrehabPlan {
  id: string;
  playerId: string;
  playerName: string;
  generatedAt: string;
  plan: PrehabPlan;
  kbReferences: string | null;
}

interface InjuryRecord {
  body_part: string;
  injury_type: string;
  occurrence_date: string;
  return_date?: string;
  notes?: string;
}

interface HealthScores {
  sleep: number;
  fatigue: number;
  soreness: number;
  stress: number;
  mood: number;
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function SAVED_KEY(teamId: string) { return `kenshin_team_${teamId}_injury_prevention_plans`; }

function loadSaved(teamId: string): SavedPrehabPlan[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY(teamId)) || "[]"); }
  catch { return []; }
}
function saveAll(teamId: string, plans: SavedPrehabPlan[]) {
  try { localStorage.setItem(SAVED_KEY(teamId), JSON.stringify(plans)); }
  catch {}
}

function statusColor(s: string): string {
  if (s === "healthy") return "border-green-500/40 bg-green-500/5";
  if (s === "minor") return "border-yellow-500/40 bg-yellow-500/5";
  return "border-[#992828]/40 bg-[#992828]/5";
}
function statusDot(s: string): string {
  if (s === "healthy") return "bg-green-400";
  if (s === "minor") return "bg-yellow-400";
  return "bg-[#992828]";
}
function statusLabel(s: string): string {
  if (s === "healthy") return "健康";
  if (s === "minor") return "轻伤";
  return "缺阵";
}

function tissueLabel(t: string | null): string {
  switch (t) {
    case "acute": return "急性期 (0-72h)";
    case "proliferation": return "增殖期 (3d-6w)";
    case "remodeling": return "重塑期 (6w-6m)";
    case "functional": return "功能期 (>6m)";
    default: return "无特殊阶段";
  }
}

// ═══════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════

export default function InjuryPreventionPage() {
  const router = useRouter();
  const syncVersion = useSyncVersion();
  const { teamId } = useTeam();

  // ── Data ──
  const players = useMemo(() => getPlayers(), [syncVersion, teamId]);
  const [savedPlans, setSavedPlans] = useState<SavedPrehabPlan[]>([]);
  useEffect(() => { setSavedPlans(loadSaved(teamId)); }, [teamId, syncVersion]);

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<"overview" | "generator" | "saved">("overview");

  // ── Generator state ──
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRecord | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<PrehabPlan | null>(null);
  const [kbRefs, setKbRefs] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["risk", "exercises", "fifa"]));
  const [playerSelectorOpen, setPlayerSelectorOpen] = useState(false);
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set());

  const toggleSection = (s: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  // ── Generate plan ──
  const handleGenerate = useCallback(async (player: PlayerRecord) => {
    setSelectedPlayer(player);
    setGeneratedPlan(null);
    setKbRefs(null);
    setGenError(null);
    setGenLoading(true);

    try {
      const res = await fetch("/api/injury-prevention/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: player.name,
          position: player.position || "",
          injuryStatus: player.injuryStatus || "healthy",
          injuryNote: player.injuryNote || "",
          injuryHistory: player.injuryHistory || "",
          disabledExercises: player.disabledExercises || [],
          injuries: [] as InjuryRecord[],
          healthScores: null as HealthScores | null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "生成失败");
      setGeneratedPlan(data.plan);
      setKbRefs(data.kbReferences || null);
    } catch (e: any) {
      setGenError(e.message || "未知错误");
    } finally {
      setGenLoading(false);
    }
  }, []);

  // ── Save plan ──
  const handleSavePlan = useCallback(() => {
    if (!generatedPlan || !selectedPlayer) return;
    const newPlan: SavedPrehabPlan = {
      id: "prehab_" + Date.now().toString(36),
      playerId: selectedPlayer.id || selectedPlayer.name,
      playerName: selectedPlayer.name,
      generatedAt: new Date().toISOString(),
      plan: generatedPlan,
      kbReferences: kbRefs,
    };
    const updated = [newPlan, ...savedPlans];
    setSavedPlans(updated);
    saveAll(teamId, updated);
    setActiveTab("saved");
  }, [generatedPlan, selectedPlayer, kbRefs, savedPlans, teamId]);

  // ── Delete saved plan ──
  const handleDeletePlan = useCallback((id: string) => {
    if (!confirm("确认删除该预防计划？")) return;
    const updated = savedPlans.filter(p => p.id !== id);
    setSavedPlans(updated);
    saveAll(teamId, updated);
  }, [savedPlans, teamId]);

  const playerPlans = useMemo(() => {
    const map: Record<string, SavedPrehabPlan[]> = {};
    savedPlans.forEach(p => {
      if (!map[p.playerName]) map[p.playerName] = [];
      map[p.playerName].push(p);
    });
    return map;
  }, [savedPlans]);

  // ═══════════════════════════════════════════════
  // Render helpers
  // ═══════════════════════════════════════════════

  const sectionClass = "bg-[#0d0d0d] border border-[#222] rounded-xl p-4 mb-3";
  const btnClass = "px-3 py-1.5 rounded-lg text-xs font-medium transition";
  const accentBtn = `${btnClass} bg-[#992828] text-white hover:bg-[#b91c1c]`;
  const ghostBtn = `${btnClass} text-gray-400 hover:text-white hover:bg-[#1e1e1e]`;

  return (
    <div className="min-h-screen bg-[#121212] pb-20">
      {/* ═══ Sticky Header ═══ */}
      <header className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur border-b border-[#222]">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-3">
          <button onClick={() => router.push("/")}
            className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[#992828]" />
            伤病预防
          </h1>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 ml-auto bg-[#1a1a1a] rounded-lg p-0.5">
            {(["overview", "generator", "saved"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md text-[10px] font-medium transition ${
                  activeTab === tab ? "bg-[#992828] text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {tab === "overview" ? "风险总览" : tab === "generator" ? "生成计划" : "已保存"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* ═══════════════════════════════════════════════
            TAB 1: 风险总览
            ═══════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <>
            {/* Injury summary */}
            {(() => {
              const healthy = players.filter(p => !p.injuryStatus || p.injuryStatus === "healthy").length;
              const minor = players.filter(p => p.injuryStatus === "minor").length;
              const out = players.filter(p => p.injuryStatus === "out").length;
              return (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className={`${sectionClass} text-center`}>
                    <div className="text-2xl font-bold text-green-400">{healthy}</div>
                    <div className="text-[10px] text-gray-500">健康</div>
                  </div>
                  <div className={`${sectionClass} text-center`}>
                    <div className="text-2xl font-bold text-yellow-400">{minor}</div>
                    <div className="text-[10px] text-gray-500">轻伤</div>
                  </div>
                  <div className={`${sectionClass} text-center`}>
                    <div className="text-2xl font-bold text-[#992828]">{out}</div>
                    <div className="text-[10px] text-gray-500">缺阵</div>
                  </div>
                </div>
              );
            })()}

            {/* Player cards */}
            {players.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无球员数据</p>
                <p className="text-xs mt-1">请先在花名册中添加球员</p>
              </div>
            ) : (
              <div className="space-y-2">
                {players.map(player => {
                  const isInjured = player.injuryStatus && player.injuryStatus !== "healthy";
                  const hasHistory = player.injuryHistory && player.injuryHistory.trim();
                  const riskLevel = !player.injuryStatus || player.injuryStatus === "healthy"
                    ? (hasHistory ? "medium" : "low") : player.injuryStatus === "minor" ? "medium" : "high";
                  const riskColor = riskLevel === "low" ? "text-green-400" : riskLevel === "medium" ? "text-yellow-400" : "text-[#992828]";

                  return (
                    <div key={player.id || player.name}
                      className={`${sectionClass} ${statusColor(player.injuryStatus || "healthy")} flex items-center gap-3`}>
                      {/* Dot */}
                      <div className={`w-3 h-3 rounded-full shrink-0 ${statusDot(player.injuryStatus || "healthy")}`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{player.name}</span>
                          {player.number && <span className="text-[10px] text-gray-500">#{player.number}</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${riskColor} bg-[#1e1e1e]`}>
                            {riskLevel === "low" ? "低风险" : riskLevel === "medium" ? "中风险" : "高风险"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {player.position && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-gray-400">{player.position}</span>
                          )}
                          <span className="text-[10px] text-gray-500">{statusLabel(player.injuryStatus || "healthy")}</span>
                          {isInjured && player.injuryNote && (
                            <span className="text-[10px] text-[#992828] truncate max-w-[200px]">{player.injuryNote}</span>
                          )}
                        </div>
                        {hasHistory && (
                          <p className="text-[9px] text-gray-600 mt-0.5 truncate">伤病史：{player.injuryHistory}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <button onClick={() => { handleGenerate(player); setActiveTab("generator"); }}
                        className={`${accentBtn} shrink-0 text-[10px]`}>
                        生成计划
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════
            TAB 2: 计划生成
            ═══════════════════════════════════════════════ */}
        {activeTab === "generator" && (
          <div className="space-y-4">
            {/* Player selector */}
            <div className={sectionClass}>
              <label className="text-xs text-gray-400 block mb-2">选择球员</label>
              <div className="relative">
                <button
                  onClick={() => setPlayerSelectorOpen(!playerSelectorOpen)}
                  className="w-full flex items-center justify-between bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white hover:border-[#555] transition"
                >
                  {selectedPlayer ? (
                    <span>{selectedPlayer.name} <span className="text-gray-500 text-xs">#{selectedPlayer.number || "-"} {selectedPlayer.position || ""}</span></span>
                  ) : (
                    <span className="text-gray-500">选择球员...</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition ${playerSelectorOpen ? "rotate-180" : ""}`} />
                </button>
                {playerSelectorOpen && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[#1a1a1a] border border-[#333] rounded-lg max-h-48 overflow-y-auto shadow-xl">
                    {players.map(p => (
                      <button
                        key={p.id || p.name}
                        onClick={() => { setSelectedPlayer(p); setPlayerSelectorOpen(false); setGeneratedPlan(null); setGenError(null); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#252525] transition flex items-center gap-2"
                      >
                        <div className={`w-2 h-2 rounded-full ${statusDot(p.injuryStatus || "healthy")}`} />
                        {p.name}
                        <span className="text-[10px] text-gray-500 ml-auto">{p.position || ""}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Player profile */}
              {selectedPlayer && (
                <div className="mt-3 p-3 rounded-lg bg-[#111] border border-[#222] space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">状态：</span>
                    <span className={selectedPlayer.injuryStatus === "healthy" ? "text-green-400" : "text-[#992828]"}>
                      {statusLabel(selectedPlayer.injuryStatus || "healthy")}
                    </span>
                  </div>
                  {selectedPlayer.injuryNote && (
                    <div><span className="text-gray-400">伤病备注：</span><span className="text-gray-300">{selectedPlayer.injuryNote}</span></div>
                  )}
                  {selectedPlayer.injuryHistory && (
                    <div><span className="text-gray-400">伤病史：</span><span className="text-gray-300">{selectedPlayer.injuryHistory}</span></div>
                  )}
                  {selectedPlayer.disabledExercises && selectedPlayer.disabledExercises.length > 0 && (
                    <div><span className="text-gray-400">禁用动作：</span><span className="text-[#992828]">{selectedPlayer.disabledExercises.join("、")}</span></div>
                  )}
                </div>
              )}
            </div>

            {/* Generate button */}
            {selectedPlayer && !genLoading && !generatedPlan && (
              <button onClick={() => handleGenerate(selectedPlayer)} className={`w-full ${accentBtn} py-3 flex items-center justify-center gap-2`}>
                <Sparkles className="w-4 h-4" />
                基于知识库生成预防计划
              </button>
            )}

            {/* Loading */}
            {genLoading && (
              <div className={`${sectionClass} text-center py-8`}>
                <div className="w-6 h-6 border-2 border-[#992828]/30 border-t-[#992828] rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">AI 正在检索知识库并分析...</p>
                <p className="text-[10px] text-gray-600 mt-1">38本运动科学著作 · 1130万字</p>
              </div>
            )}

            {/* Error */}
            {genError && (
              <div className="p-4 rounded-xl bg-[#992828]/5 border border-[#992828]/20 text-sm text-[#992828]">
                {genError}
                <button onClick={() => selectedPlayer && handleGenerate(selectedPlayer)} className="block mt-2 text-xs underline hover:text-white">重试</button>
              </div>
            )}

            {/* Generated plan */}
            {generatedPlan && (
              <div className="space-y-3">
                {/* KB reference badge */}
                {kbRefs && (
                  <div className="px-3 py-1.5 rounded-lg bg-green-500/5 border border-green-500/20 text-[10px] text-green-400">
                    📖 {kbRefs}
                  </div>
                )}

                {/* Section: Risk Assessment */}
                <div className={sectionClass}>
                  <button onClick={() => toggleSection("risk")} className="w-full flex items-center justify-between text-left">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                      风险评估
                    </span>
                    <ChevronRight className={`w-4 h-4 text-gray-500 transition ${expandedSections.has("risk") ? "rotate-90" : ""}`} />
                  </button>
                  {expandedSections.has("risk") && (
                    <p className="mt-2 text-xs text-gray-300 leading-relaxed">{generatedPlan.risk_assessment}</p>
                  )}
                </div>

                {/* Section: FIFA 11+ */}
                <div className={sectionClass}>
                  <button onClick={() => toggleSection("fifa")} className="w-full flex items-center justify-between text-left">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      FIFA 11+ 必练项
                    </span>
                    <ChevronRight className={`w-4 h-4 text-gray-500 transition ${expandedSections.has("fifa") ? "rotate-90" : ""}`} />
                  </button>
                  {expandedSections.has("fifa") && (
                    <div className="mt-2 space-y-1.5">
                      {[
                        { key: "nordic_curl", label: "北欧弯举", val: generatedPlan.fifa_11_plus.nordic_curl, extra: generatedPlan.fifa_11_plus.nordic_level },
                        { key: "plank", label: "平板支撑三级", val: generatedPlan.fifa_11_plus.plank },
                        { key: "side_bridge", label: "侧桥三级", val: generatedPlan.fifa_11_plus.side_bridge },
                        { key: "single_leg_balance", label: "单腿平衡三级", val: generatedPlan.fifa_11_plus.single_leg_balance },
                      ].map(item => (
                        <div key={item.key} className="flex items-center gap-2 text-xs">
                          {item.val ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-gray-600" />}
                          <span className="text-gray-300">{item.label}</span>
                          {item.extra && <span className="text-[10px] text-gray-500">({item.extra})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section: Exercises */}
                <div className={sectionClass}>
                  <button onClick={() => toggleSection("exercises")} className="w-full flex items-center justify-between text-left">
                    <span className="text-sm font-bold text-white">🦾 推荐动作（{generatedPlan.exercises.length}个）</span>
                    <ChevronRight className={`w-4 h-4 text-gray-500 transition ${expandedSections.has("exercises") ? "rotate-90" : ""}`} />
                  </button>
                  {expandedSections.has("exercises") && (
                    <div className="mt-2 space-y-2">
                      {generatedPlan.exercises.map((ex, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-[#111] border border-[#222]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{ex.name}</span>
                            <span className="text-[10px] text-gray-500">{ex.exercise_id}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                            <span>{ex.sets}组 × {ex.reps}</span>
                            <span>|</span>
                            <span>{ex.load}</span>
                            <span>|</span>
                            <span>间歇{ex.rest}</span>
                          </div>
                          <p className="text-[9px] text-gray-600 mt-1">{ex.rationale}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section: Tissue Stage */}
                {generatedPlan.tissue_stage && (
                  <div className={sectionClass}>
                    <button onClick={() => toggleSection("tissue")} className="w-full flex items-center justify-between text-left">
                      <span className="text-sm font-bold text-white">🩻 组织愈合阶段</span>
                      <ChevronRight className={`w-4 h-4 text-gray-500 transition ${expandedSections.has("tissue") ? "rotate-90" : ""}`} />
                    </button>
                    {expandedSections.has("tissue") && (
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          generatedPlan.tissue_stage === "acute" ? "bg-[#992828]/10 text-[#992828]" :
                          generatedPlan.tissue_stage === "functional" ? "bg-green-500/10 text-green-400" :
                          "bg-yellow-500/10 text-yellow-400"
                        }`}>
                          {tissueLabel(generatedPlan.tissue_stage)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Section: Load Guidelines */}
                <div className={sectionClass}>
                  <button onClick={() => toggleSection("load")} className="w-full flex items-center justify-between text-left">
                    <span className="text-sm font-bold text-white">📊 负荷指南</span>
                    <ChevronRight className={`w-4 h-4 text-gray-500 transition ${expandedSections.has("load") ? "rotate-90" : ""}`} />
                  </button>
                  {expandedSections.has("load") && (
                    <div className="mt-2 space-y-1 text-xs text-gray-300">
                      <p>ACWR目标：<span className="text-white font-medium">{generatedPlan.load_guidelines.acwr_target}</span></p>
                      <p>渐进策略：<span className="text-white font-medium">{generatedPlan.load_guidelines.progression}</span></p>
                      {generatedPlan.load_guidelines.weekly_sessions && (
                        <p>每周训练：<span className="text-white font-medium">{generatedPlan.load_guidelines.weekly_sessions}次</span></p>
                      )}
                      {generatedPlan.load_guidelines.session_duration && (
                        <p>每次时长：<span className="text-white font-medium">{generatedPlan.load_guidelines.session_duration}</span></p>
                      )}
                    </div>
                  )}
                </div>

                {/* Section: Recovery */}
                {generatedPlan.recovery_recommendations.length > 0 && (
                  <div className={sectionClass}>
                    <button onClick={() => toggleSection("recovery")} className="w-full flex items-center justify-between text-left">
                      <span className="text-sm font-bold text-white">🍎 恢复建议</span>
                      <ChevronRight className={`w-4 h-4 text-gray-500 transition ${expandedSections.has("recovery") ? "rotate-90" : ""}`} />
                    </button>
                    {expandedSections.has("recovery") && (
                      <ul className="mt-2 space-y-1">
                        {generatedPlan.recovery_recommendations.map((r, i) => (
                          <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                            <span className="text-[#992828] shrink-0">•</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button onClick={handleSavePlan} className={`${accentBtn} flex items-center gap-1.5`}>
                    <Plus className="w-3 h-3" /> 保存计划
                  </button>
                  <button onClick={() => selectedPlayer && handleGenerate(selectedPlayer)} className={`${ghostBtn} flex items-center gap-1.5`}>
                    <Sparkles className="w-3 h-3" /> 重新生成
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            TAB 3: 已保存计划
            ═══════════════════════════════════════════════ */}
        {activeTab === "saved" && (
          <>
            {savedPlans.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无保存的预防计划</p>
                <p className="text-xs mt-1">在「生成计划」中为球员生成并保存</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(playerPlans).map(([playerName, plans]) => (
                  <div key={playerName} className={sectionClass}>
                    <h3 className="text-sm font-bold text-white mb-2">{playerName} <span className="text-[10px] text-gray-500">({plans.length}个计划)</span></h3>
                    <div className="space-y-2">
                      {plans.slice(0, 5).map(plan => {
                        const isExpanded = expandedPlanIds.has(plan.id);
                        return (
                          <PlanCard
                            key={plan.id}
                            plan={plan}
                            expanded={isExpanded}
                            onToggle={() => {
                              setExpandedPlanIds(prev => {
                                const next = new Set(prev);
                                next.has(plan.id) ? next.delete(plan.id) : next.add(plan.id);
                                return next;
                              });
                            }}
                            onDelete={() => handleDeletePlan(plan.id)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      <MobileNav />
    </div>
  );
}

// ═══════════════════════════════════════════════
// Saved Plan Card (Tab 3)
// ═══════════════════════════════════════════════

function PlanCard({ plan, expanded, onToggle, onDelete }: {
  plan: SavedPrehabPlan;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const p = plan.plan;
  return (
    <div className="p-3 rounded-lg bg-[#111] border border-[#222]">
      <div className="flex items-center justify-between">
        <button onClick={onToggle} className="flex items-center gap-2 text-left flex-1 min-w-0">
          <ChevronRight className={`w-3.5 h-3.5 text-gray-500 transition shrink-0 ${expanded ? "rotate-90" : ""}`} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {p.tissue_stage ? `${tissueLabel(p.tissue_stage)} · ` : ""}
              {p.exercises.length}个动作
            </p>
            <p className="text-[9px] text-gray-600">
              {new Date(plan.generatedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </button>
        <button onClick={onDelete} className="p-1 text-gray-600 hover:text-[#992828] transition shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 pl-5 border-t border-[#222] pt-3">
          <p className="text-[10px] text-gray-400">{p.risk_assessment}</p>
          <div className="space-y-1">
            {p.exercises.map((ex, i) => (
              <div key={i} className="text-[10px] text-gray-300">
                <span className="text-white font-medium">{ex.name}</span>
                <span className="text-gray-500"> — {ex.sets}组×{ex.reps} {ex.load} 间歇{ex.rest}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
