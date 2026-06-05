"use client";

import React, { useState, useMemo, useCallback } from "react";
import { STRENGTH_LIBRARY, ExerciseRef } from "@/lib/training-library";
import { getPhaseParams, getGoalParams } from "@/lib/periodization";
import { getPlayers, PlayerRecord } from "@/lib/roster-utils";
import { X, Trash2, Users, FileDown, Printer, AlertTriangle, CheckCircle2, RefreshCw, Upload, Search } from "lucide-react";
import { GymDesigner } from "@/components/GymDesigner";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

type PhaseType = "warmup" | "rest" | "main" | "cooldown";
type MuscleGroup = "下肢伸(quad)" | "下肢后链(posterior)" | "上肢推(push)" | "上肢拉(pull)" | "核心(core)" | "其他";

interface PlayerMod {
  load?: string;
  sets?: string;
  reps?: string;
  rest?: string;
}

interface TrainingRow {
  id: string;
  phaseId: string;
  exerciseId?: string;
  customName: string;
  load: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
  playerMods: Record<string, PlayerMod>;
}

interface PhaseSection {
  id: string;
  type: PhaseType;
  label: string;
}

interface ValidationWarning {
  rowId: string;
  field: string;
  message: string;
  severity: "pass" | "warn" | "fail";
}

interface ValidationSummary {
  layoutWarnings: ValidationWarning[];
  paramWarnings: ValidationWarning[];
  injuryWarnings: ValidationWarning[];
}

// ═══════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════

const PHASE_COLORS: Record<PhaseType, { bg: string; border: string; text: string; badge: string }> = {
  warmup: { bg: "rgba(34,197,94,0.12)", border: "#22c55e", text: "#22c55e", badge: "bg-green-500/20 text-green-400" },
  rest: { bg: "rgba(59,130,246,0.10)", border: "#3b82f6", text: "#60a5fa", badge: "bg-blue-500/20 text-blue-400" },
  main: { bg: "rgba(34,197,94,0.15)", border: "#16a34a", text: "#4ade80", badge: "bg-emerald-500/20 text-emerald-400" },
  cooldown: { bg: "rgba(234,179,8,0.12)", border: "#eab308", text: "#eab308", badge: "bg-yellow-500/20 text-yellow-400" },
};

// Muscle group classification — maps exercise ID prefix/name to group
const MUSCLE_GROUP_MAP: Record<string, MuscleGroup> = {
  // 下肢伸 (quad-dominant)
  "ex-back-squat": "下肢伸(quad)",
  "ex-front-squat": "下肢伸(quad)",
  "ex-bulgarian-split-squat": "下肢伸(quad)",
  "ex-barbell-lunge": "下肢伸(quad)",
  "ex-dumbbell-lunges": "下肢伸(quad)",
  "ex-leg-press": "下肢伸(quad)",
  "ex-box-jump": "下肢伸(quad)",
  "ex-box-depth-drop": "下肢伸(quad)",
  "ex-hurdle-jump": "下肢伸(quad)",
  "ex-depth-jump": "下肢伸(quad)",
  "ex-single-leg-box-jump": "下肢伸(quad)",
  "ex-box-drop-jump": "下肢伸(quad)",
  "ex-sled-sprint": "下肢伸(quad)",
  "ex-sprint-start": "下肢伸(quad)",
  // 下肢后链 (posterior chain)
  "ex-deadlift": "下肢后链(posterior)",
  "ex-romanian-dl": "下肢后链(posterior)",
  "ex-single-leg-rdl": "下肢后链(posterior)",
  "ex-hip-thrust": "下肢后链(posterior)",
  "ex-nordic-hamstring": "下肢后链(posterior)",
  "ex-hamstring-bridge": "下肢后链(posterior)",
  "ex-trap-bar-deadlift": "下肢后链(posterior)",
  "ex-kb-swing": "下肢后链(posterior)",
  // 上肢推 (push)
  "ex-bench-press": "上肢推(push)",
  "ex-standing-press": "上肢推(push)",
  "ex-dumbbell-shoulder-press": "上肢推(push)",
  "ex-med-ball-slam": "上肢推(push)",
  "ex-jerk": "上肢推(push)",
  // 上肢拉 (pull)
  "ex-barbell-row": "上肢拉(pull)",
  "ex-pull-up": "上肢拉(pull)",
  "ex-cable-row": "上肢拉(pull)",
  "ex-face-pull": "上肢拉(pull)",
  "ex-power-clean": "上肢拉(pull)",
  "ex-power-clean-high-pull": "上肢拉(pull)",
  "ex-snatch-high-pull": "上肢拉(pull)",
  "ex-kb-clean": "上肢拉(pull)",
  "ex-kb-snatch": "上肢拉(pull)",
  "ex-barbell-snatch": "上肢拉(pull)",
  // 核心
  "ex-plank": "核心(core)",
  "ex-hanging-leg-raise": "核心(core)",
  "ex-pallof-press": "核心(core)",
  "ex-cable-woodchop": "核心(core)",
  "ex-dead-bug": "核心(core)",
  "ex-plank-shoulder-tap": "核心(core)",
  "ex-bird-dog": "核心(core)",
  "ex-adductor-raise": "核心(core)",
  "ex-saw-plank": "核心(core)",
  "ex-hollow-body-hold": "核心(core)",
  "ex-contralateral-raise": "核心(core)",
  "ex-side-plank-hold": "核心(core)",
  "ex-dead-bug-dynamic": "核心(core)",
  "ex-v-up": "核心(core)",
  "ex-mountain-climber": "核心(core)",
  // 其他
  "ex-pro-agility": "其他",
  "ex-t-drill": "其他",
  "ex-lateral-hurdle": "其他",
  "ex-bound-landing": "其他",
};

function getMuscleGroup(exerciseId: string): MuscleGroup {
  return MUSCLE_GROUP_MAP[exerciseId] || "其他";
}

// Parameter check thresholds (from periodization tables)
interface ParamCheck {
  category: MuscleGroup;
  loadMin: number;
  loadMax: number;
  minSets: number;
  maxSets: number;
  minReps: number;
  maxReps: number;
  minRest: number; // seconds
  warnings: string[];
}

const PARAM_CHECKS: ParamCheck[] = [
  {
    category: "下肢伸(quad)",
    loadMin: 70, loadMax: 85,
    minSets: 3, maxSets: 4,
    minReps: 4, maxReps: 8,
    minRest: 120,
    warnings: ["rest<120s", "load>85%", "reps>8"],
  },
  {
    category: "下肢后链(posterior)",
    loadMin: 70, loadMax: 85,
    minSets: 3, maxSets: 4,
    minReps: 4, maxReps: 8,
    minRest: 120,
    warnings: ["rest<120s", "load>85%", "reps>8"],
  },
  {
    category: "上肢推(push)",
    loadMin: 65, loadMax: 80,
    minSets: 3, maxSets: 4,
    minReps: 6, maxReps: 10,
    minRest: 90,
    warnings: ["rest<60s"],
  },
  {
    category: "上肢拉(pull)",
    loadMin: 65, loadMax: 80,
    minSets: 3, maxSets: 4,
    minReps: 6, maxReps: 10,
    minRest: 90,
    warnings: ["rest<60s"],
  },
];

const PARAM_CHECK_FOR_OTHER: ParamCheck = {
  category: "其他",
  loadMin: 0, loadMax: 100,
  minSets: 2, maxSets: 6,
  minReps: 1, maxReps: 30,
  minRest: 45,
  warnings: [],
};

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function parseLoadPercent(load: string): number | null {
  const m = load.match(/(\d+)\s*%/);
  if (m) return parseInt(m[1], 10);
  if (load === "BW" || load === "自身体重") return 0;
  return null;
}

function parseRestSeconds(rest: string): number | null {
  const m = rest.match(/(\d+)\s*s/);
  if (m) return parseInt(m[1], 10);
  const mm = rest.match(/(\d+)\s*min/);
  if (mm) return parseInt(mm[1], 10) * 60;
  if (rest === "—") return null;
  const n = parseInt(rest, 10);
  if (!isNaN(n)) return n;
  return null;
}

function formatLoadRef(ex: ExerciseRef): string {
  if (ex.load_default && ex.load_default !== "自身体重") return ex.load_default;
  return "BW";
}

function formatSetsRef(ex: ExerciseRef): string {
  if (Array.isArray(ex.sets)) return `${ex.sets[0]}-${ex.sets[1]}`;
  return String(ex.sets || "3");
}

function formatRepsRef(ex: ExerciseRef): string {
  if (Array.isArray(ex.reps)) return `${ex.reps[0]}-${ex.reps[1]}`;
  return String(ex.reps || "10");
}

function formatRestRef(ex: ExerciseRef): string {
  const s = ex.rest || 90;
  if (s >= 120) return `${Math.floor(s / 60)}min`;
  if (s >= 60) return `${(s / 60).toFixed(1)}min`;
  return `${s}s`;
}

// ═══════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════

function PlayerSelectModal({
  open,
  onClose,
  players,
  selected,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  players: PlayerRecord[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-40" onClick={onClose} />
      <div className="fixed inset-4 sm:inset-x-auto sm:top-12 sm:bottom-12 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg sm:w-full z-50 bg-[#1e1e1e] border border-[#222] rounded-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222] flex-shrink-0">
          <h3 className="text-base font-bold text-white">选择球员</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {players.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">花名册为空，请先在花名册中添加球员</p>
          ) : (
            players.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border ${
                  selected.includes(p.id)
                    ? "bg-[#d92525]/10 border-[#d92525]/30"
                    : "bg-[#121212] border-transparent hover:border-[#333]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => onToggle(p.id)}
                  className="accent-[#d92525] w-4 h-4 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium truncate">{p.name}</span>
                    <span className="text-[10px] text-gray-500">#{p.number}</span>
                    <span className="text-[10px] text-gray-500">{p.position}</span>
                  </div>
                  {p.injuryStatus !== "healthy" && (
                    <p className="text-[10px] text-yellow-400 mt-0.5">&#9888; {p.injuryNote || "有伤"}</p>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
        <div className="px-5 py-3 border-t border-[#222] flex items-center justify-between">
          <span className="text-xs text-gray-500">已选 {selected.length}/{players.length} 人</span>
          <button onClick={onClose} className="px-4 py-1.5 bg-[#d92525] text-white text-sm font-medium rounded-lg hover:brightness-110 transition">
            确认
          </button>
        </div>
      </div>
    </>
  );
}

function ExercisePickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (ex: ExerciseRef) => void;
}) {
  const [search, setSearch] = useState("");
  const [bodyFilter, setBodyFilter] = useState<MuscleGroup | "all">("all");

  const exercises = useMemo(() => {
    let list = Object.values(STRENGTH_LIBRARY);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q));
    }
    if (bodyFilter !== "all") {
      list = list.filter((e) => getMuscleGroup(e.id) === bodyFilter);
    }
    return list;
  }, [search, bodyFilter]);

  const groups: MuscleGroup[] = ["下肢伸(quad)", "下肢后链(posterior)", "上肢推(push)", "上肢拉(pull)", "核心(core)", "其他"];

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/95 z-40" onClick={onClose} />
      <div className="fixed inset-4 sm:inset-x-auto sm:top-8 sm:bottom-8 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-2xl sm:w-full z-50 bg-[#1e1e1e] border border-[#222] rounded-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222] flex-shrink-0">
          <h3 className="text-lg font-bold text-white">选择训练动作</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + Filter */}
        <div className="px-5 py-3 border-b border-[#222] space-y-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索动作名称..."
              className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-[#333] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d92525]"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setBodyFilter("all")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                bodyFilter === "all" ? "bg-[#d92525] text-white" : "bg-[#121212] text-gray-400 hover:text-white"
              }`}
            >
              全部
            </button>
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setBodyFilter(g)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                  bodyFilter === g ? "bg-[#d92525] text-white" : "bg-[#121212] text-gray-400 hover:text-white"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {exercises.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">没有匹配的动作</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {exercises.map((ex) => {
                const mg = getMuscleGroup(ex.id);
                const mgColor = mg === "下肢伸(quad)" ? "text-green-400" : mg === "下肢后链(posterior)" ? "text-blue-400" : mg === "上肢推(push)" ? "text-orange-400" : mg === "上肢拉(pull)" ? "text-purple-400" : "text-gray-400";
                return (
                  <button
                    key={ex.id}
                    onClick={() => onSelect(ex)}
                    className="text-left p-3 rounded-xl bg-[#121212] border border-[#222] hover:border-[#d92525]/50 hover:bg-[#1a1a1a] transition group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{ex.name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {formatSetsRef(ex)}组 × {formatRepsRef(ex)}次 · 间歇{formatRestRef(ex)}
                        </p>
                      </div>
                      <span className={`text-[10px] shrink-0 ${mgColor}`}>{mg}</span>
                    </div>
                    {ex.cue_points && ex.cue_points.length > 0 && (
                      <p className="text-[10px] text-gray-600 mt-1.5 line-clamp-1">{ex.cue_points.slice(0, 2).join(" · ")}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p className="px-5 py-2 text-white/20 text-[10px] text-center border-t border-[#222]">
          点击选择动作添加到主训练区
        </p>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════

export default function GroupTrainingPage() {
  // --- Top bar state ---
  const [trainDate, setTrainDate] = useState(new Date().toISOString().slice(0, 10));
  const [playerCount, setPlayerCount] = useState(12);
  const [totalDuration, setTotalDuration] = useState(90);
  const [theme, setTheme] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"group" | "individual">("group");
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);

  // --- Table state ---
  const [phases, setPhases] = useState<PhaseSection[]>([
    { id: uid(), type: "warmup", label: "热身激活" },
    { id: uid(), type: "main", label: "主训练" },
    { id: uid(), type: "cooldown", label: "整理放松" },
  ]);
  const [rows, setRows] = useState<TrainingRow[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // --- Text input modal for warmup/cooldown ---
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPhaseId, setTextInputPhaseId] = useState<string | null>(null);
  const [textInputValue, setTextInputValue] = useState("");

  // --- Player personalization ---
  const [editingPlayerMod, setEditingPlayerMod] = useState<{ rowId: string; playerId: string } | null>(null);
  const [playerModValue, setPlayerModValue] = useState("");

  // --- Data ---
  const players = useMemo(() => getPlayers(), []);
  const selectedPlayers = useMemo(() => players.filter((p) => selectedPlayerIds.includes(p.id)), [players, selectedPlayerIds]);

  // --- Helpers ---
  const togglePlayer = useCallback((id: string) => {
    setSelectedPlayerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const addRow = (phaseId: string, exerciseId?: string, customName?: string) => {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;

    const newRow: TrainingRow = {
      id: uid(),
      phaseId,
      exerciseId,
      customName: customName || "",
      load: "",
      sets: "",
      reps: "",
      rest: "",
      notes: "",
      playerMods: {},
    };

    if (exerciseId && phase.type === "main") {
      const ex = STRENGTH_LIBRARY[exerciseId];
      if (ex) {
        newRow.load = formatLoadRef(ex);
        newRow.sets = formatSetsRef(ex);
        newRow.reps = formatRepsRef(ex);
        newRow.rest = formatRestRef(ex);
        newRow.notes = ex.cue_points?.slice(0, 2).join("；") || "";
      }
    }

    setRows((prev) => [...prev, newRow]);
  };

  const addTextRow = (phaseId: string) => {
    setTextInputPhaseId(phaseId);
    setTextInputValue("");
    setShowTextInput(true);
  };

  const confirmTextRow = () => {
    if (!textInputPhaseId || !textInputValue.trim()) return;
    addRow(textInputPhaseId, undefined, textInputValue.trim());
    setShowTextInput(false);
    setTextInputPhaseId(null);
  };

  const deleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const updateCell = (rowId: string, field: keyof TrainingRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
  };

  const addPhase = (type: PhaseType) => {
    const labels: Record<PhaseType, string> = {
      warmup: "热身激活",
      rest: "课间休息",
      main: "主训练",
      cooldown: "整理放松",
    };
    setPhases((prev) => [...prev, { id: uid(), type, label: labels[type] }]);
  };

  const deletePhase = (phaseId: string) => {
    setPhases((prev) => prev.filter((p) => p.id !== phaseId));
    setRows((prev) => prev.filter((r) => r.phaseId !== phaseId));
  };

  // --- Validation ---
  const validation = useMemo((): ValidationSummary => {
    const layoutWarnings: ValidationWarning[] = [];
    const paramWarnings: ValidationWarning[] = [];
    const injuryWarnings: ValidationWarning[] = [];

    // Only validate main training rows
    const mainRows = rows.filter((r) => {
      const phase = phases.find((p) => p.id === r.phaseId);
      return phase?.type === "main" && r.exerciseId;
    });

    if (mainRows.length >= 3) {
      // Layout check: muscle group sequence
      const groups = mainRows.map((r) => getMuscleGroup(r.exerciseId!));

      // Check 1: 拮抗穿插 — push/pull alternating is recommended
      let alternatingOk = true;
      for (let i = 1; i < groups.length; i++) {
        const prev = groups[i - 1];
        const curr = groups[i];
        const isPush = (g: MuscleGroup) => g === "上肢推(push)" || g === "下肢伸(quad)";
        const isPull = (g: MuscleGroup) => g === "上肢拉(pull)" || g === "下肢后链(posterior)";
        if (isPush(prev) && isPush(curr)) alternatingOk = false;
        if (isPull(prev) && isPull(curr)) alternatingOk = false;
      }

      // Check 2: 上下分段 — all lower then all upper
      let lowerUpperSplitDetected = false;
      let sawUpper = false;
      for (const g of groups) {
        if (g === "上肢推(push)" || g === "上肢拉(pull)") sawUpper = true;
        if ((g === "下肢伸(quad)" || g === "下肢后链(posterior)") && sawUpper) {
          lowerUpperSplitDetected = true;
        }
      }
      if (lowerUpperSplitDetected) {
        layoutWarnings.push({
          rowId: "",
          field: "layout",
          message: "上下分段布局（先下肢后上肢），康复场景可用",
          severity: "warn",
        });
      }

      // Check 3: 同肌群堆量 — >=3 same muscle group in a row
      for (let i = 0; i < groups.length - 2; i++) {
        if (groups[i] === groups[i + 1] && groups[i] === groups[i + 2] && groups[i] !== "核心(core)" && groups[i] !== "其他") {
          layoutWarnings.push({
            rowId: mainRows[i + 2].id,
            field: "exerciseId",
            message: `同肌群堆量（连续3个${groups[i]}），建议穿插拮抗肌群`,
            severity: "fail",
          });
          break;
        }
      }
    }

    // Parameter checks per exercise
    mainRows.forEach((row) => {
      const mg = getMuscleGroup(row.exerciseId!);
      const check = PARAM_CHECKS.find((c) => c.category === mg) || PARAM_CHECK_FOR_OTHER;

      const loadPct = parseLoadPercent(row.load);
      if (loadPct !== null && loadPct > check.loadMax) {
        paramWarnings.push({
          rowId: row.id,
          field: "load",
          message: `负荷${loadPct}%超过建议上限${check.loadMax}%`,
          severity: "warn",
        });
      }

      const restSec = parseRestSeconds(row.rest);
      if (restSec !== null && restSec < check.minRest) {
        paramWarnings.push({
          rowId: row.id,
          field: "rest",
          message: `间歇${restSec}s过短，建议≥${check.minRest}s`,
          severity: restSec < check.minRest * 0.5 ? "fail" : "warn",
        });
      }
    });

    // Injury checks
    selectedPlayers.forEach((player) => {
      if (player.injuryStatus === "healthy") return;

      const hasKneeInjury =
        player.injuryNote.includes("膝") ||
        player.injuryHistory.includes("膝") ||
        player.injuryHistory.includes("ACL") ||
        player.injuryHistory.includes("MCL") ||
        player.disabledExercises.some((e) => e.includes("蹲") || e.includes("跳"));

      const hasBackInjury =
        player.injuryNote.includes("腰") ||
        player.injuryNote.includes("背") ||
        player.injuryHistory.includes("腰") ||
        player.injuryHistory.includes("椎");

      mainRows.forEach((row) => {
        if (!row.exerciseId) return;
        const mg = getMuscleGroup(row.exerciseId);

        if (hasKneeInjury && mg === "下肢伸(quad)") {
          injuryWarnings.push({
            rowId: row.id,
            field: "exerciseId",
            message: `${player.name}有膝伤，${STRENGTH_LIBRARY[row.exerciseId]?.name || row.exerciseId}对膝关节负荷较大，建议减载或替代`,
            severity: "warn",
          });
        }

        if (hasBackInjury && (row.exerciseId === "ex-deadlift" || row.exerciseId === "ex-romanian-dl" || row.exerciseId === "ex-single-leg-rdl")) {
          injuryWarnings.push({
            rowId: row.id,
            field: "exerciseId",
            message: `${player.name}有腰/背伤，${STRENGTH_LIBRARY[row.exerciseId]?.name || row.exerciseId}对腰椎负荷大，建议减载或替代`,
            severity: "warn",
          });
        }
      });
    });

    return { layoutWarnings, paramWarnings, injuryWarnings };
  }, [rows, phases, selectedPlayers]);

  const allWarnings = [...validation.layoutWarnings, ...validation.paramWarnings, ...validation.injuryWarnings];
  const passCount = rows.filter((r) => {
    const phase = phases.find((p) => p.id === r.phaseId);
    return phase?.type === "main" && r.exerciseId && !allWarnings.some((w) => w.rowId === r.id);
  }).length;
  const warnCount = allWarnings.filter((w) => w.severity === "warn").length;
  const failCount = allWarnings.filter((w) => w.severity === "fail").length;

  // --- AI Auto-fix ---
  const autoFix = () => {
    setRows((prev) =>
      prev.map((row) => {
        if (!row.exerciseId) return row;
        const phase = phases.find((p) => p.id === row.phaseId);
        if (phase?.type !== "main") return row;

        const mg = getMuscleGroup(row.exerciseId);
        const check = PARAM_CHECKS.find((c) => c.category === mg) || PARAM_CHECK_FOR_OTHER;
        const ex = STRENGTH_LIBRARY[row.exerciseId];

        const newRow = { ...row };
        const loadPct = parseLoadPercent(row.load);
        if (loadPct !== null && loadPct > check.loadMax) {
          newRow.load = `${check.loadMax}% 1RM`;
        }
        const restSec = parseRestSeconds(row.rest);
        if (restSec !== null && restSec < check.minRest) {
          newRow.rest = `${Math.floor(check.minRest / 60)}min`;
        }
        return newRow;
      })
    );
  };

  // --- Export ---
  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const data: (string | number)[][] = [];

      // Header
      data.push(["阶段", "练习内容", "负重", "组数", "次/米/秒", "组间休息", "备注"]);

      phases.forEach((phase) => {
        const phaseRows = rows.filter((r) => r.phaseId === phase.id);
        if (phaseRows.length === 0 && phase.type === "main") {
          data.push([phase.label, "", "", "", "", "", ""]);
        }
        phaseRows.forEach((row) => {
          data.push([
            phase.label,
            row.exerciseId ? STRENGTH_LIBRARY[row.exerciseId]?.name || row.customName : row.customName,
            row.load,
            row.sets,
            row.reps,
            row.rest,
            row.notes,
          ]);
        });
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "训练表");
      XLSX.writeFile(wb, `小组训练_${trainDate}.xlsx`);
    } catch (e) {
      console.error("Excel export error:", e);
    }
  };

  const exportPDF = () => {
    window.print();
  };

  // --- Load sync ---
  const syncToCalendar = () => {
    try {
      const existing = JSON.parse(localStorage.getItem("kenshin_training_logs") || "[]");
      const session = {
        id: uid(),
        date: trainDate,
        type: "group_training",
        theme,
        playerCount,
        totalDuration,
        playerIds: selectedPlayerIds,
        rows: rows.map((r) => ({
          exerciseId: r.exerciseId,
          customName: r.customName,
          load: r.load,
          sets: r.sets,
          reps: r.reps,
          rest: r.rest,
          notes: r.notes,
        })),
        syncedAt: new Date().toISOString(),
      };
      existing.push(session);
      localStorage.setItem("kenshin_training_logs", JSON.stringify(existing));
      alert("已同步到训练日历");
    } catch (e) {
      console.error("Sync error:", e);
    }
  };

  // --- Compute main rows for the exercise picker ---
  const mainPhase = phases.find((p) => p.type === "main");

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* ===== Top Bar ===== */}
      <div className="sticky top-0 z-30 bg-[#121212]/95 backdrop-blur border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-3">
          {/* Back + Title */}
          <div className="flex items-center gap-3 mb-2">
            <a href="/" className="text-gray-400 hover:text-white transition-colors text-sm touch-target min-w-[44px] min-h-[44px] flex items-center">← 返回</a>
            <h1 className="text-sm font-bold text-white">小组训练</h1>
          </div>
          {/* Row 1: Basic Info */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date */}
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-gray-500 shrink-0">日期</label>
              <input
                type="date"
                value={trainDate}
                onChange={(e) => setTrainDate(e.target.value)}
                className="bg-[#1e1e1e] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#d92525] w-[130px]"
              />
            </div>

            {/* Player count */}
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-gray-500 shrink-0">人数</label>
              <input
                type="number"
                min={1}
                value={playerCount}
                onChange={(e) => setPlayerCount(parseInt(e.target.value) || 1)}
                className="bg-[#1e1e1e] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#d92525] w-[60px]"
              />
            </div>

            {/* Duration */}
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-gray-500 shrink-0">时长(min)</label>
              <input
                type="number"
                min={1}
                value={totalDuration}
                onChange={(e) => setTotalDuration(parseInt(e.target.value) || 1)}
                className="bg-[#1e1e1e] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#d92525] w-[60px]"
              />
            </div>

            {/* Theme */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[150px]">
              <label className="text-[10px] text-gray-500 shrink-0">主题</label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="如：下肢力量+核心、单人膝伤康复"
                className="bg-[#1e1e1e] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#d92525] flex-1"
              />
            </div>

            {/* Select Players */}
            <button
              onClick={() => setShowPlayerModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] border border-[#333] rounded-lg text-xs text-gray-300 hover:text-white hover:border-[#555] transition"
            >
              <Users className="w-3.5 h-3.5" />
              {selectedPlayerIds.length > 0 ? `已选${selectedPlayerIds.length}人` : "选择球员"}
            </button>

            {/* Mode Toggle */}
            <div className="flex bg-[#1e1e1e] rounded-lg p-0.5">
              <button
                onClick={() => setMode("group")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  mode === "group" ? "bg-[#d92525] text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                小组统一
              </button>
              <button
                onClick={() => setMode("individual")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  mode === "individual" ? "bg-[#d92525] text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                个体个性化
              </button>
            </div>
          </div>

          {/* Validation summary */}
          {rows.filter((r) => {
            const phase = phases.find((p) => p.id === r.phaseId);
            return phase?.type === "main" && r.exerciseId;
          }).length >= 3 && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {passCount}项通过
              </span>
              {warnCount > 0 && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {warnCount}项预警
                </span>
              )}
              {failCount > 0 && (
                <span className="flex items-center gap-1 text-[#d92525]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {failCount}项不合规
                </span>
              )}
              {(warnCount > 0 || failCount > 0) && (
                <button
                  onClick={autoFix}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#d92525]/20 text-[#d92525] rounded-md hover:bg-[#d92525]/30 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  一键AI优化
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== Main Area ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 pb-20 lg:pb-6">
        {/* Action buttons */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] border border-[#222] rounded-lg text-xs text-gray-300 hover:text-white hover:brightness-125 transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              导出Excel
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] border border-[#222] rounded-lg text-xs text-gray-300 hover:text-white hover:brightness-125 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              导出PDF
            </button>
            <button
              onClick={syncToCalendar}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] border border-[#222] rounded-lg text-xs text-gray-300 hover:text-white hover:brightness-125 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              同步到训练日历
            </button>
          </div>

          {/* Add phase buttons */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => addPhase("warmup")} className="px-2.5 py-1 rounded-lg text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition">
              +热身
            </button>
            <button onClick={() => addPhase("rest")} className="px-2.5 py-1 rounded-lg text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition">
              +课间休息
            </button>
            <button onClick={() => addPhase("main")} className="px-2.5 py-1 rounded-lg text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition">
              +主训练
            </button>
            <button onClick={() => addPhase("cooldown")} className="px-2.5 py-1 rounded-lg text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition">
              +放松
            </button>
          </div>
        </div>

        {/* ===== Training Table ===== */}
        <div className="overflow-x-auto rounded-xl border border-[#222]">
          <table className="w-full text-[11px] border-collapse">
            {/* Column Headers */}
            <thead className="sticky top-[104px] z-10">
              <tr className="bg-[#1a1a1a] border-b border-[#333]">
                <th className="text-left py-2 px-2 text-gray-500 font-medium w-[80px] shrink-0">分区色块</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium min-w-[130px]">练习内容</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium w-[80px]">负重</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium w-[50px]">组数</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium w-[80px]">次/米/秒</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium w-[70px]">组间休息</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium min-w-[130px]">备注</th>
                {mode === "individual" && selectedPlayers.length > 0 && (
                  <th className="text-left py-2 px-2 text-gray-500 font-medium min-w-[120px]">球员个性化</th>
                )}
                <th className="text-left py-2 px-2 text-gray-500 font-medium w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {phases.map((phase) => {
                const phaseRows = rows.filter((r) => r.phaseId === phase.id);
                const colors = PHASE_COLORS[phase.type];
                const phaseLabelEmoji = phase.type === "warmup" ? "\u{1F7E2}" : phase.type === "rest" ? "\u{1F535}" : phase.type === "main" ? "\u{1F7E2}" : "\u{1F7E1}";

                return (
                  <React.Fragment key={phase.id}>
                    {/* Phase Header */}
                    <tr className="border-b border-[#1a1a1a]" style={{ backgroundColor: colors.bg }}>
                      <td
                        colSpan={mode === "individual" && selectedPlayers.length > 0 ? 9 : 8}
                        className="py-2 px-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: colors.border }}
                            />
                            <input
                              value={phase.label}
                              onChange={(e) =>
                                setPhases((prev) =>
                                  prev.map((p) => (p.id === phase.id ? { ...p, label: e.target.value } : p))
                                )
                              }
                              className="bg-transparent text-xs font-bold text-white border-none outline-none focus:ring-1 focus:ring-[#d92525]/50 rounded px-1 -ml-1 min-w-[80px]"
                            />
                            <span className="text-[10px] text-gray-600">({phaseRows.length}项)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Add row button */}
                            {phase.type === "main" ? (
                              <button
                                onClick={() => {
                                  setActivePhaseId(phase.id);
                                  setShowExerciseModal(true);
                                }}
                                className="px-2 py-0.5 rounded text-[10px] bg-[#d92525]/10 text-[#d92525] hover:bg-[#d92525]/20 transition"
                              >
                                +添加动作
                              </button>
                            ) : (
                              <button
                                onClick={() => addTextRow(phase.id)}
                                className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition"
                              >
                                +添加行
                              </button>
                            )}
                            <button
                              onClick={() => deletePhase(phase.id)}
                              className="p-0.5 text-gray-600 hover:text-[#d92525] transition"
                              title="删除阶段"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Phase Rows */}
                    {phaseRows.length === 0 && phase.type !== "main" && (
                      <tr className="border-b border-[#1a1a1a]">
                        <td
                          colSpan={mode === "individual" && selectedPlayers.length > 0 ? 9 : 8}
                          className="py-3 px-3 text-center text-[10px] text-gray-600"
                        >
                          点击"+添加行"添加{phase.type === "warmup" ? "热身" : phase.type === "rest" ? "休息" : "放松"}内容
                        </td>
                      </tr>
                    )}
                    {phaseRows.length === 0 && phase.type === "main" && (
                      <tr className="border-b border-[#1a1a1a]">
                        <td
                          colSpan={mode === "individual" && selectedPlayers.length > 0 ? 9 : 8}
                          className="py-3 px-3 text-center text-[10px] text-gray-600"
                        >
                          点击"+添加动作"从动作库选择训练动作
                        </td>
                      </tr>
                    )}
                    {phaseRows.map((row, rowIdx) => {
                      const rowWarnings = allWarnings.filter((w) => w.rowId === row.id);
                      const hasWarning = rowWarnings.some((w) => w.severity === "warn");
                      const hasFail = rowWarnings.some((w) => w.severity === "fail");
                      const ex = row.exerciseId ? STRENGTH_LIBRARY[row.exerciseId] : null;
                      const mg = row.exerciseId ? getMuscleGroup(row.exerciseId) : "其他";

                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/80 transition-colors group ${
                            hasFail ? "bg-[#d92525]/5" : hasWarning ? "bg-yellow-500/5" : ""
                          }`}
                        >
                          {/* 分区色块 — only for first row */}
                          {rowIdx === 0 ? (
                            <td
                              rowSpan={phaseRows.length}
                              className="py-1 px-2 font-bold text-[10px] align-middle w-[80px]"
                              style={{
                                backgroundColor: colors.bg,
                                borderRight: `2px solid ${colors.border}`,
                                color: colors.text,
                              }}
                            >
                              <div className="text-center">
                                <div className="text-[9px] opacity-60 mb-0.5">{phaseLabelEmoji}</div>
                                {phase.label}
                              </div>
                            </td>
                          ) : null}

                          {/* 练习内容 */}
                          <td className="py-1.5 px-2 relative">
                            <div className="flex items-center gap-1">
                              {ex ? (
                                <>
                                  <span className="text-[#d1d1d1] font-medium truncate max-w-[180px]">{ex.name}</span>
                                  <span className="text-[9px] text-gray-600 bg-[#1a1a1a] px-1 rounded">{mg}</span>
                                </>
                              ) : (
                                <span
                                  className="text-[#d1d1d1] truncate max-w-[200px] cursor-text hover:bg-[#1a1a1a] rounded px-1 -ml-1"
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateCell(row.id, "customName", e.currentTarget.textContent || "")}
                                >
                                  {row.customName || "—"}
                                </span>
                              )}
                              {rowWarnings.length > 0 && (
                                <div className="relative group/tip">
                                  <AlertTriangle
                                    className={`w-3 h-3 shrink-0 ${hasFail ? "text-[#d92525]" : "text-yellow-400"}`}
                                  />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#333] text-[10px] text-white rounded whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition pointer-events-none z-20 max-w-[250px] whitespace-normal">
                                    {rowWarnings.map((w, i) => (
                                      <div key={i}>{w.message}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 负重 */}
                          <td
                            className={`py-1.5 px-2 cursor-text hover:bg-[#1a1a1a] rounded ${
                              rowWarnings.some((w) => w.field === "load") ? "text-[#d92525]" : "text-gray-400"
                            }`}
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateCell(row.id, "load", e.currentTarget.textContent || "")}
                          >
                            {row.load || "—"}
                          </td>

                          {/* 组数 */}
                          <td className="py-1.5 px-2 text-white font-mono font-bold cursor-text hover:bg-[#1a1a1a] rounded"
                            contentEditable suppressContentEditableWarning
                            onBlur={(e) => updateCell(row.id, "sets", e.currentTarget.textContent || "")}>
                            {row.sets || "—"}
                          </td>

                          {/* 次/米/秒 */}
                          <td className="py-1.5 px-2 text-gray-400 cursor-text hover:bg-[#1a1a1a] rounded"
                            contentEditable suppressContentEditableWarning
                            onBlur={(e) => updateCell(row.id, "reps", e.currentTarget.textContent || "")}>
                            {row.reps || "—"}
                          </td>

                          {/* 组间休息 */}
                          <td
                            className={`py-1.5 px-2 cursor-text hover:bg-[#1a1a1a] rounded ${
                              rowWarnings.some((w) => w.field === "rest") ? "text-[#d92525]" : "text-gray-400"
                            }`}
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateCell(row.id, "rest", e.currentTarget.textContent || "")}
                          >
                            {row.rest || "—"}
                          </td>

                          {/* 备注 */}
                          <td className="py-1.5 px-2 text-gray-600 cursor-text hover:bg-[#1a1a1a] rounded max-w-[150px] truncate"
                            contentEditable suppressContentEditableWarning
                            onBlur={(e) => updateCell(row.id, "notes", e.currentTarget.textContent || "")}>
                            {row.notes || "—"}
                          </td>

                          {/* 球员个性化 — individual mode */}
                          {mode === "individual" && selectedPlayers.length > 0 && (
                            <td className="py-1.5 px-2">
                              <div className="flex items-center gap-1 flex-wrap">
                                {selectedPlayers.map((player) => {
                                  const mod = row.playerMods[player.id];
                                  const hasMod = mod && (mod.load || mod.sets || mod.reps || mod.rest);
                                  return (
                                    <button
                                      key={player.id}
                                      onClick={() => {
                                        setEditingPlayerMod({ rowId: row.id, playerId: player.id });
                                        setPlayerModValue(
                                          mod
                                            ? `负荷:${mod.load || row.load} 组:${mod.sets || row.sets} 次:${mod.reps || row.reps} 间歇:${mod.rest || row.rest}`
                                            : `负荷:${row.load} 组:${row.sets} 次:${row.reps} 间歇:${row.rest}`
                                        );
                                      }}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition border ${
                                        hasMod
                                          ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                                          : "bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500"
                                      }`}
                                      title={player.name}
                                    >
                                      {player.name.charAt(0)}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          )}

                          {/* Delete */}
                          <td className="py-1.5 px-2">
                            <button
                              onClick={() => deleteRow(row.id)}
                              className="opacity-0 group-hover:opacity-100 transition p-0.5 text-gray-600 hover:text-[#d92525]"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* If no phases */}
        {phases.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-sm mb-2">暂无训练阶段</p>
            <p className="text-xs">使用上方按钮添加训练阶段</p>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-gray-600">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500/40"/> 热身</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500/40"/> 课间休息</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40"/> 主训练</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500/40"/> 放松</span>
        </div>
      </div>

      {/* ===== Modals ===== */}
      <PlayerSelectModal
        open={showPlayerModal}
        onClose={() => setShowPlayerModal(false)}
        players={players}
        selected={selectedPlayerIds}
        onToggle={togglePlayer}
      />

      <ExercisePickerModal
        open={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSelect={(ex) => {
          if (activePhaseId) {
            addRow(activePhaseId, ex.id);
          }
          setShowExerciseModal(false);
        }}
      />

      {/* Text input modal for warmup/cooldown */}
      {showTextInput && (
        <>
          <div className="fixed inset-0 bg-black/80 z-40" onClick={() => setShowTextInput(false)} />
          <div className="fixed inset-x-4 top-1/3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-96 z-50 bg-[#1e1e1e] border border-[#222] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">添加练习内容</h3>
            <input
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmTextRow()}
              placeholder="输入练习名称..."
              autoFocus
              className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#d92525] mb-3"
            />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowTextInput(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition">
                取消
              </button>
              <button onClick={confirmTextRow} className="px-4 py-1.5 bg-[#d92525] text-white text-xs font-medium rounded-lg hover:brightness-110 transition">
                添加
              </button>
            </div>
          </div>
        </>
      )}

      {/* Player mod modal */}
      {editingPlayerMod && (
        <>
          <div className="fixed inset-0 bg-black/80 z-40" onClick={() => setEditingPlayerMod(null)} />
          <div className="fixed inset-x-4 top-1/4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-96 z-50 bg-[#1e1e1e] border border-[#222] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">
              个性化调整 — {players.find((p) => p.id === editingPlayerMod.playerId)?.name || "球员"}
            </h3>
            <p className="text-[10px] text-gray-500 mb-3">
              格式: 负荷:80%1RM 组:3 次:8 间歇:2min
            </p>
            <input
              type="text"
              value={playerModValue}
              onChange={(e) => setPlayerModValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const row = rows.find((r) => r.id === editingPlayerMod.rowId);
                  if (!row) return;
                  const parts = playerModValue.split(/\s+/);
                  const mod: PlayerMod = {};
                  parts.forEach((p) => {
                    if (p.startsWith("负荷:")) mod.load = p.replace("负荷:", "");
                    else if (p.startsWith("组:")) mod.sets = p.replace("组:", "");
                    else if (p.startsWith("次:")) mod.reps = p.replace("次:", "");
                    else if (p.startsWith("间歇:")) mod.rest = p.replace("间歇:", "");
                  });
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === editingPlayerMod.rowId
                        ? { ...r, playerMods: { ...r.playerMods, [editingPlayerMod.playerId]: mod } }
                        : r
                    )
                  );
                  setEditingPlayerMod(null);
                }
                if (e.key === "Escape") setEditingPlayerMod(null);
              }}
              placeholder="负荷:75%1RM 组:3 次:6 间歇:2min"
              autoFocus
              className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#d92525] mb-3"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  // Clear this player's mods
                  setRows((prev) =>
                    prev.map((r) => {
                      if (r.id !== editingPlayerMod.rowId) return r;
                      const mods = { ...r.playerMods };
                      delete mods[editingPlayerMod.playerId];
                      return { ...r, playerMods: mods };
                    })
                  );
                  setEditingPlayerMod(null);
                }}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-[#d92525] transition"
              >
                清整个性化
              </button>
              <button onClick={() => setEditingPlayerMod(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition">
                取消
              </button>
              <button
                onClick={() => {
                  const row = rows.find((r) => r.id === editingPlayerMod.rowId);
                  if (!row) return;
                  const parts = playerModValue.split(/\s+/);
                  const mod: PlayerMod = {};
                  parts.forEach((p) => {
                    if (p.startsWith("负荷:")) mod.load = p.replace("负荷:", "");
                    else if (p.startsWith("组:")) mod.sets = p.replace("组:", "");
                    else if (p.startsWith("次:")) mod.reps = p.replace("次:", "");
                    else if (p.startsWith("间歇:")) mod.rest = p.replace("间歇:", "");
                  });
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === editingPlayerMod.rowId
                        ? { ...r, playerMods: { ...r.playerMods, [editingPlayerMod.playerId]: mod } }
                        : r
                    )
                  );
                  setEditingPlayerMod(null);
                }}
                className="px-4 py-1.5 bg-[#d92525] text-white text-xs font-medium rounded-lg hover:brightness-110 transition"
              >
                保存
              </button>
            </div>
          </div>
        </>
      )}

      {/* Print-optimized CSS */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .overflow-x-auto, .overflow-x-auto * { visibility: visible; }
          .overflow-x-auto { position: absolute; left: 0; top: 0; width: 100%; }
          header, .sticky, button, nav { display: none !important; }
          table { font-size: 9px; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════
          力量房训练设计器
          ═══════════════════════════════════════════════ */}
      <section className="mt-10 border-t border-[#222] pt-8">
        <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          🏋️ 力量房训练设计
        </h2>
        <p className="text-xs text-gray-500 mb-4">从动作库挑选力量训练动作，AI 自动校验方案合理性</p>
        <GymDesigner />
      </section>
    </div>
  );
}

