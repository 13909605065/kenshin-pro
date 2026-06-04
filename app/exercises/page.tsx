"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Dumbbell, ArrowUpFromLine, Plus, Pencil, Trash2, X, CheckSquare, Square, Filter, ListChecks } from "lucide-react";
import { STRENGTH_LIBRARY } from "@/lib/training-library";
import { useCustomExercises, mapCustomBodyPart, mapCustomEquipment, CustomExercise } from "@/hooks/useCustomExercises";
import { AddExerciseModal } from "@/components/exercises/AddExerciseModal";
import { StickFigure } from "@/components/StickFigure";

// ═══════════════════════════════════════════════
// Category Types
// ═══════════════════════════════════════════════

type BodyPart = "all" | "上肢" | "下肢" | "核心" | "背部" | "全身";
type Equipment = "all" | "杠铃" | "哑铃" | "悬吊" | "自重";
type FootballCategory = "all" | "爆发力" | "灵敏" | "速度" | "力量" | "耐力";
type Difficulty = "基础" | "中级" | "进阶";

const BODY_PARTS: BodyPart[] = ["all", "上肢", "下肢", "核心", "背部", "全身"];
const EQUIPMENTS: Equipment[] = ["all", "杠铃", "哑铃", "悬吊", "自重"];
const FOOTBALL_CATEGORIES: FootballCategory[] = ["all", "爆发力", "灵敏", "速度", "力量", "耐力"];

// ═══════════════════════════════════════════════
// Unified Exercise Item
// ═══════════════════════════════════════════════

interface UnifiedExercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  type: "力量" | "热身" | "冷身" | "技术";
  // Strength fields
  sets?: [number, number];
  reps?: [number, number];
  load_default?: string;
  rest?: number;
  rpe?: number;
  heart_rate_zone?: string;
  image_url?: string;
  cue_points?: string[];
  progression?: string;
  regression?: string;
  // Warmup/Cooldown/Drill fields
  duration?: number;
  description?: string;
  category?: string;
  purpose?: string;
  key_points?: string[];
  diagram?: any;
  // Custom exercise
  isCustom?: boolean;
  customDifficulty?: string;
  // Computed
  difficulty?: Difficulty;
  footballCategory?: FootballCategory;
  isFootballRelevant?: boolean;
}

// ═══════════════════════════════════════════════
// Categorization Logic (ID convention based)
// ═══════════════════════════════════════════════

function detectEquipment(id: string): Equipment {
  if (id.startsWith("ex-db-")) return "哑铃";
  if (id.startsWith("ex-sus-")) return "悬吊";
  if (id.match(/ex-(bench|pull-up|back-squat|deadlift|front-squat|overhead|bent-row|romanian|barbell)/)) return "杠铃";
  if (id.match(/ex-(cable|face-pull|pallof|woodchop|tricep|lat-pulldown|leg-press)/)) return "杠铃";
  if (id.match(/ex-(box-jump|plank|hanging|dead-bug|push-up|nordic|lunge|single-leg|jump)/)) return "自重";
  if (id.match(/ex-(sled|power-clean|med-ball|mb-)/)) return "自重";
  if (id.startsWith("warm-") || id.startsWith("cool-")) return "自重";
  if (id.startsWith("drill-")) return "自重";
  return "自重";
}

// Upper limb exercises (by ID pattern)
const UPPER_IDS = new Set([
  "ex-bench-press","ex-pull-up","ex-dumbbell-shoulder-press","ex-cable-row","ex-face-pull",
  "ex-med-ball-slam","ex-mb-rotational-throw","ex-dumbbell-pullover",
  "ex-db-bench-press","ex-db-flye","ex-db-incline-press","ex-db-tricep-extension",
  "ex-db-skull-crusher","ex-db-kickback","ex-db-curl","ex-db-hammer-curl",
  "ex-db-overhead-press","ex-db-close-flye","ex-db-shrug","ex-db-upright-row",
  "ex-db-front-raise","ex-db-rear-flye",
  "ex-sus-side-plank","ex-sus-front-support","ex-sus-bicep-curl","ex-sus-chest-press",
  "ex-sus-tricep-press","ex-sus-face-pull","ex-sus-shoulder-press","ex-sus-y-fly",
  "ex-sus-cable-fly","ex-sus-standing-dip",
]);

const LOWER_IDS = new Set([
  "ex-back-squat","ex-deadlift","ex-trap-bar-deadlift","ex-front-squat","ex-bulgarian-split-squat",
  "ex-nordic-hamstring","ex-box-jump","ex-dumbbell-lunges","ex-single-leg-rdl","ex-leg-press",
  "ex-hip-thrust",
  "ex-db-glute-bridge","ex-db-prone-leg-raise","ex-db-sumo-squat","ex-db-step-up",
  "ex-db-single-dl","ex-db-reverse-lunge","ex-db-shallow-squat","ex-db-goblet-squat",
  "ex-db-romanian-dl","ex-db-calf-raise",
  "ex-sus-supine-support","ex-sus-supine-high-knee","ex-sus-calf-squat","ex-sus-lunge",
  "ex-sus-side-squat","ex-sus-squat","ex-sus-pistol-squat","ex-sus-jump-squat",
  "ex-sus-t-balance","ex-sus-side-split",
]);

const CORE_IDS = new Set([
  "ex-plank","ex-hanging-leg-raise","ex-pallof-press","ex-cable-woodchop","ex-dead-bug",
  "ex-db-russian-twist","ex-db-v-up","ex-db-cross-crunch","ex-db-side-bend","ex-db-cross-push",
  "ex-sus-crunch","ex-sus-situp","ex-sus-side-plank-core","ex-sus-oblique-roll",
  "ex-sus-prone-roll","ex-sus-body-saw","ex-sus-plank","ex-sus-side-hold",
  "ex-sus-standing-side-reach","ex-sus-body-saw-full",
]);

const BACK_IDS = new Set([
  "ex-db-one-arm-row","ex-db-bent-row","ex-db-pullover","ex-db-floor-raise","ex-db-plank-row",
  "ex-sus-row","ex-sus-inverted-row","ex-sus-one-arm-row","ex-sus-pull-up","ex-sus-seated-pull",
]);

const FULL_BODY_IDS = new Set([
  "ex-db-snatch","ex-db-thruster","ex-db-woodchop","ex-db-plank-hold","ex-db-bear-crawl",
  "ex-sus-tuck-support","ex-sus-squat-row","ex-sus-rollout-tuck","ex-sus-mountain-climber",
  "ex-sus-seated-climber","ex-power-clean","ex-sled-sprint",
]);

function detectBodyPart(id: string): BodyPart {
  if (UPPER_IDS.has(id)) return "上肢";
  if (LOWER_IDS.has(id)) return "下肢";
  if (CORE_IDS.has(id)) return "核心";
  if (BACK_IDS.has(id)) return "背部";
  if (FULL_BODY_IDS.has(id)) return "全身";
  if (id.startsWith("drill-")) return "全身";
  if (id.startsWith("warm-")) return "全身";
  if (id.startsWith("cool-")) return "全身";
  return "全身";
}

// ═══════════════════════════════════════════════
// Football-Specific Category Detection
// ═══════════════════════════════════════════════

const POWER_IDS = new Set([
  "ex-power-clean","ex-box-jump","ex-med-ball-slam","ex-mb-rotational-throw",
  "ex-sled-sprint","ex-db-snatch","ex-db-thruster","ex-sus-jump-squat",
]);

const AGILITY_IDS = new Set([
  "ex-sus-mountain-climber","ex-sus-seated-climber","ex-sus-lunge","ex-sus-side-squat",
  "ex-sus-t-balance","ex-sus-side-split","ex-sus-pistol-squat","ex-db-reverse-lunge",
]);

const SPEED_IDS = new Set([
  "ex-sled-sprint","ex-box-jump","ex-sus-jump-squat","ex-db-snatch",
]);

const STRENGTH_IDS = new Set([
  "ex-back-squat","ex-deadlift","ex-trap-bar-deadlift","ex-front-squat",
  "ex-bench-press","ex-pull-up","ex-bulgarian-split-squat","ex-nordic-hamstring",
  "ex-hip-thrust","ex-leg-press","ex-db-goblet-squat","ex-db-romanian-dl",
  "ex-sus-squat","ex-sus-pistol-squat",
]);

const ENDURANCE_IDS = new Set([
  "ex-plank","ex-hanging-leg-raise","ex-dead-bug","ex-pallof-press","ex-cable-woodchop",
  "ex-sus-body-saw","ex-sus-plank","ex-sus-supine-support","ex-sus-supine-high-knee",
  "ex-sus-mountain-climber","ex-sus-seated-climber",
]);

function detectFootballCategory(id: string): FootballCategory {
  const n = id.toLowerCase();
  if (POWER_IDS.has(id)) return "爆发力";
  if (SPEED_IDS.has(id)) return "速度";
  if (AGILITY_IDS.has(id)) return "灵敏";
  if (STRENGTH_IDS.has(id)) return "力量";
  if (ENDURANCE_IDS.has(id)) return "耐力";
  // Name-based fallback
  if (/爆发|power|clean|snatch|jerk|plyo|砸击|抛掷/.test(n)) return "爆发力";
  if (/灵敏|agility|ladder|绳梯|变向|转体/.test(n)) return "灵敏";
  if (/速度|speed|sprint|冲刺|加速/.test(n)) return "速度";
  if (/力量|strength|squat|蹲|deadlift|硬拉|press|推|bench/.test(n)) return "力量";
  if (/耐力|endurance|plank|支撑|cardio|有氧/.test(n)) return "耐力";
  return "力量";
}

function detectDifficulty(id: string, name: string): Difficulty {
  const n = name.toLowerCase();
  // Advanced: Olympic lifts, complex multi-joint with high skill
  if (/power.?clean|snatch|jerk|保加利亚|pistol|单腿/.test(n)) return "进阶";
  if (/olympic|高翻|抓举/.test(n)) return "进阶";
  // Beginner: bodyweight basics
  if (/plank|平板|bridge|臀桥|dead.?bug|死虫|crunch|卷腹/.test(n)) return "基础";
  if (/curl|弯举|raise|平举|kickback|臂屈伸/.test(n)) return "基础";
  if (/stretch|拉伸|泡沫|呼吸/.test(n)) return "基础";
  // Intermediate: everything else
  if (id.startsWith("ex-sus-")) return "中级";
  if (/dumbbell|哑铃|杠铃|barbell|squat|蹲|deadlift|硬拉|bench|卧推|press|推举|row|划船|pull.?up|引体/.test(n)) return "中级";
  return "中级";
}

function isFootballRelevant(id: string, name: string): boolean {
  const n = name.toLowerCase();
  const footballKeywords = /足球|football|soccer|变向|敏捷|冲刺|爆发|弹跳|核心|稳定|单腿|平衡|旋转|抗旋|移动|跑动|加速|减速|制动/;
  if (footballKeywords.test(n)) return true;
  if (POWER_IDS.has(id) || AGILITY_IDS.has(id) || SPEED_IDS.has(id)) return true;
  if (id.startsWith("ex-sus-")) return true;
  if (/nordic|plank|side.?plank|单腿/.test(n)) return true;
  return false;
}

// ═══════════════════════════════════════════════
// Build unified exercise list
// ═══════════════════════════════════════════════

function buildUnifiedExercises(): UnifiedExercise[] {
  const list: UnifiedExercise[] = [];

  // Strength exercises
  for (const [id, ex] of Object.entries(STRENGTH_LIBRARY)) {
    const name = ex.name;
    list.push({
      id,
      name,
      bodyPart: detectBodyPart(id),
      equipment: detectEquipment(id),
      type: "力量",
      sets: ex.sets,
      reps: ex.reps,
      load_default: ex.load_default,
      rest: ex.rest,
      rpe: ex.rpe,
      heart_rate_zone: ex.heart_rate_zone,
      image_url: ex.image_url,
      cue_points: ex.cue_points,
      progression: ex.progression,
      difficulty: detectDifficulty(id, name),
      footballCategory: detectFootballCategory(id),
      isFootballRelevant: isFootballRelevant(id, name),
    });
  }

  return list;
}

// ═══════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════

export default function ExercisesPage() {
  const { exercises: customExercises, addExercise, updateExercise, deleteExercise } = useCustomExercises();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustom, setEditingCustom] = useState<CustomExercise | null>(null);

  const builtInExercises = useMemo(() => buildUnifiedExercises(), []);

  // Convert custom exercises to UnifiedExercise format
  const customUnified = useMemo(() => {
    return customExercises.map((ce) => {
      const ue: UnifiedExercise = {
        id: ce.id,
        name: ce.name,
        bodyPart: mapCustomBodyPart(ce.body_part),
        equipment: mapCustomEquipment(ce.equipment),
        type: "力量",
        sets: (ce.sets_min && ce.sets_max ? [ce.sets_min, ce.sets_max] : [3, 4]) as [number, number],
        reps: (ce.reps_min && ce.reps_max ? [ce.reps_min, ce.reps_max] : [8, 12]) as [number, number],
        rest: ce.rest_min || 60,
        description: ce.description,
        cue_points: ce.cue_points,
        progression: ce.progression,
        regression: ce.regression,
        image_url: ce.image_url,
        isCustom: true as const,
        customDifficulty: ce.difficulty,
        difficulty: (ce.difficulty === "高级" ? "进阶" : ce.difficulty === "初级" ? "基础" : "中级") as Difficulty,
        footballCategory: "力量" as FootballCategory,
        isFootballRelevant: true,
      };
      return ue;
    });
  }, [customExercises]);

  // Merge built-in + custom
  const allExercises = useMemo(
    () => [...builtInExercises, ...customUnified],
    [builtInExercises, customUnified]
  );

  const [bodyPart, setBodyPart] = useState<BodyPart>("all");
  const [equipment, setEquipment] = useState<Equipment>("all");
  const [footballCat, setFootballCat] = useState<FootballCategory>("all");
  const [exerciseType, setExerciseType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter
  const filtered = useMemo(() => {
    return allExercises.filter((ex) => {
      if (bodyPart !== "all" && ex.bodyPart !== bodyPart) return false;
      if (equipment !== "all" && ex.equipment !== equipment) return false;
      if (footballCat !== "all" && ex.footballCategory !== footballCat) return false;
      if (exerciseType !== "all" && ex.type !== exerciseType) return false;
      if (search && !ex.name.includes(search) && !ex.id.includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allExercises, bodyPart, equipment, footballCat, exerciseType, search]);

  // Category counts pre-computed

  // Batch select handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const filteredIds = filtered.map(e => e.id);
    setSelectedIds(new Set(filteredIds));
  }, [filtered]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  // Handlers
  const handleSaveCustom = (ex: Omit<CustomExercise, "id">) => {
    if (editingCustom) {
      updateExercise(editingCustom.id, ex);
      setEditingCustom(null);
    } else {
      addExercise(ex);
    }
  };

  const handleEditCustom = (id: string) => {
    const found = customExercises.find((e) => e.id === id);
    if (found) {
      setEditingCustom(found);
      setModalOpen(true);
    }
  };

  const handleDeleteCustom = (id: string) => {
    if (typeof window !== "undefined" && window.confirm("确定删除这个自定义动作吗？")) {
      deleteExercise(id);
      if (selectedId === id) setSelectedId(null);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleAddToPlan = () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : [];
    if (ids.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem("exercises_selected_for_plan", JSON.stringify(ids));
      }
    }
    window.location.href = "/strength";
  };

  const handleAddSingleToPlan = (ex: UnifiedExercise) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("exercises_selected_for_plan", JSON.stringify([ex.id]));
    }
    window.location.href = "/strength";
  };

  // Scroll handler
  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const showBatchBar = selectedIds.size > 0;

  return (
    <div className="min-h-screen bg-[#121212]">
      <div className="max-w-7xl mx-auto px-4 py-4 pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <a href="/" className="text-gray-500 hover:text-white text-sm transition-colors duration-150">←</a>
          <h1 className="text-lg font-bold text-[#d1d1d1]">动作库</h1>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索动作名称..."
              className="w-full bg-[#121212] border border-[#222] rounded-xl pl-10 pr-12 py-2.5 text-sm text-[#d1d1d1] placeholder-gray-500 focus:outline-none focus:border-[#d92525] transition-colors duration-150"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-600 mt-1.5 ml-1">
            <Filter className="w-3 h-3 inline mr-1" />
            找到 <span className="text-gray-400 font-medium">{filtered.length}</span> 个动作
          </p>
        </div>

        {/* Recommendation hint */}
        <div className="text-[11px] text-gray-500 mb-4 flex items-center gap-1.5 bg-[#1e1e1e] border border-[#222] rounded-lg px-3 py-2">
          <span className="text-[#d92525] text-lg leading-none">⚽</span>
          <span>足球专项动作已标注，教练可根据训练目标筛选</span>
        </div>

        {/* ═══ Filter Cards ═══ */}
        <div className="space-y-3 mb-5">
          {/* Card 1: Body Part */}
          <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wider">身体分区 Body Part</p>
            <div className="flex flex-wrap gap-1.5">
              {BODY_PARTS.map((bp) => (
                <button
                  key={bp}
                  onClick={() => setBodyPart(bp)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                    bodyPart === bp
                      ? "bg-[#d92525] text-white"
                      : "text-gray-400 hover:text-white hover:bg-[#222]"
                  }`}
                >
                  {bp === "all" ? "全部" : bp}
                </button>
              ))}
            </div>
          </div>

          {/* Card 2: Equipment */}
          <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wider">器械 Equipment</p>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENTS.map((eq) => (
                <button
                  key={eq}
                  onClick={() => setEquipment(eq)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                    equipment === eq
                      ? "bg-[#d92525] text-white"
                      : "text-gray-400 hover:text-white hover:bg-[#222]"
                  }`}
                >
                  {eq === "all" ? "全部" : eq}
                </button>
              ))}
            </div>
          </div>

          {/* Card 3: Football-Specific (NEW) */}
          <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wider">
              <span className="mr-1">⚽</span>足球专项 Football-Specific
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FOOTBALL_CATEGORIES.map((fc) => (
                <button
                  key={fc}
                  onClick={() => setFootballCat(fc)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                    footballCat === fc
                      ? "bg-[#d92525] text-white"
                      : "text-gray-400 hover:text-white hover:bg-[#222]"
                  }`}
                >
                  {fc === "all" ? "全部" : fc}
                </button>
              ))}
            </div>
          </div>

          {/* Card 4: Exercise Type */}
          <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wider">类型 Type</p>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "力量", "热身", "冷身", "技术"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setExerciseType(t)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                    exerciseType === t
                      ? "bg-[#d92525] text-white"
                      : "text-gray-400 hover:text-white hover:bg-[#222]"
                  }`}
                >
                  {t === "all" ? "全部" : t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Select All / Deselect All */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={allSelected ? deselectAll : selectAll}
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white transition-colors duration-150"
            >
              {allSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#d92525]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {allSelected ? "取消全选" : "全选"}
            </button>
          </div>
        )}

        {/* Exercise Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">没有匹配的动作</p>
            <p className="text-xs mt-1 text-gray-600">试试调整筛选条件</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                selected={selectedIds.has(ex.id)}
                onSelect={() => setSelectedId(ex.id)}
                onToggleSelect={() => toggleSelect(ex.id)}
                onEdit={ex.isCustom ? () => handleEditCustom(ex.id) : undefined}
                onDelete={ex.isCustom ? () => handleDeleteCustom(ex.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Batch Action Bar */}
      {showBatchBar && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#1e1e1e] border-t border-[#d92525]/30 px-4 py-3 flex items-center justify-between shadow-lg shadow-black/50">
          <div className="flex items-center gap-3">
            <ListChecks className="w-5 h-5 text-[#d92525]" />
            <span className="text-sm text-[#d1d1d1]">
              已选 <span className="text-[#d92525] font-bold">{selectedIds.size}</span> 个动作
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={deselectAll}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#222] transition-all duration-150"
            >
              清空
            </button>
            <button
              onClick={handleAddToPlan}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#d92525] text-white hover:bg-[#e03030] transition-all duration-150 hover:shadow-lg hover:shadow-[#d92525]/20"
            >
              添加到训练方案
            </button>
          </div>
        </div>
      )}

      {/* Detail side panel */}
      {selectedId && (
        <ExerciseDetailSheet
          exercise={filtered.find(e => e.id === selectedId)!}
          onClose={() => setSelectedId(null)}
          onAddToPlan={handleAddSingleToPlan}
        />
      )}

      {/* Add/Edit Custom Exercise Modal */}
      <AddExerciseModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCustom(null); }}
        onSave={handleSaveCustom}
        editingExercise={editingCustom}
      />

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-4 z-30 p-2.5 bg-[#d92525] text-white rounded-full shadow-lg hover:scale-110 transition"
        >
          <ArrowUpFromLine className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Exercise Card
// ═══════════════════════════════════════════════

function ExerciseCard({
  exercise, selected, onSelect, onToggleSelect, onEdit, onDelete,
}: {
  exercise: UnifiedExercise;
  selected: boolean;
  onSelect: () => void;
  onToggleSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isStrength = exercise.type === "力量";

  return (
    <div
      className={`relative bg-[#1e1e1e] border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ease-out group ${
        selected
          ? "border-[#d92525] shadow-lg shadow-[#d92525]/10 -translate-y-1"
          : "border-[#222] hover:-translate-y-1 hover:border-[#d92525] hover:shadow-lg hover:shadow-[#d92525]/10"
      }`}
      onClick={onSelect}
    >
      {/* Checkbox — always visible top-right */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        className={`absolute top-2 right-2 z-10 p-0.5 rounded transition-all duration-150 ${
          selected
            ? "text-[#d92525]"
            : "text-gray-600 opacity-0 group-hover:opacity-100 hover:text-white"
        }`}
      >
        {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
      </button>

      {/* Image area */}
      <div className="aspect-square bg-[#111] flex items-center justify-center p-2 relative">
        <StickFigure name={exercise.name} size={56} compact={true} />

        {/* Football badge */}
        {exercise.isFootballRelevant && (
          <span className="absolute bottom-1.5 left-1.5 text-[14px] leading-none drop-shadow-lg" title="足球专项相关">
            ⚽
          </span>
        )}

        {/* Difficulty badge */}
        {exercise.difficulty && (
          <span
            className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
              exercise.difficulty === "进阶"
                ? "bg-[#d92525]/20 text-[#d92525] border border-[#d92525]/30"
                : exercise.difficulty === "中级"
                ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                : "bg-green-500/20 text-green-500 border border-green-500/30"
            }`}
          >
            {exercise.difficulty}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <h3 className="text-[#d1d1d1] font-bold text-xs truncate">{exercise.name}</h3>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          <span className={`px-1 py-0 rounded text-[9px] font-medium ${
            isStrength ? "bg-[#d92525]/20 text-[#d92525] border border-[#d92525]/20" : "bg-[#222] text-gray-400"
          }`}>
            {exercise.type}
          </span>
          {exercise.footballCategory && exercise.footballCategory !== "力量" && (
            <span className="px-1 py-0 rounded text-[9px] text-gray-500 bg-[#222]">{exercise.footballCategory}</span>
          )}
          <span className="text-[9px] text-gray-500">{exercise.equipment}</span>
        </div>
        {isStrength && exercise.sets && exercise.reps && (
          <p className="text-[10px] text-gray-500 mt-0.5">{exercise.sets[0]}-{exercise.sets[1]}x{exercise.reps[0]}-{exercise.reps[1]}</p>
        )}
        {exercise.duration && (
          <p className="text-[10px] text-gray-500 mt-0.5">{exercise.duration}分钟</p>
        )}
        {exercise.isCustom && (
          <div className="flex gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
            {onEdit && <button onClick={onEdit} className="px-1.5 py-0.5 rounded text-[9px] bg-[#1e1e1e] text-gray-400 hover:text-white"><Pencil className="w-2.5 h-2.5 inline"/> 编辑</button>}
            {onDelete && <button onClick={onDelete} className="px-1.5 py-0.5 rounded text-[9px] bg-[#1e1e1e] text-red-400 hover:text-red-300"><Trash2 className="w-2.5 h-2.5 inline"/> 删除</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Exercise Detail Side Panel
// ═══════════════════════════════════════════════

function ExerciseDetailSheet({
  exercise, onClose, onAddToPlan,
}: {
  exercise: UnifiedExercise;
  onClose: () => void;
  onAddToPlan: (ex: UnifiedExercise) => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-[#1e1e1e] border-l border-[#222] z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#1e1e1e]/95 backdrop-blur border-b border-[#222] p-4 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-[#d1d1d1] truncate pr-2">{exercise.name}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors duration-150 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Stick Figure */}
          <div className="max-w-[200px] mx-auto bg-[#111] rounded-xl p-4">
            <StickFigure name={exercise.name} size={160} showMuscles={true} />
          </div>

          {/* External image (if loads) */}
          {exercise.image_url && (
            <div className="w-full aspect-video bg-[#111] rounded-xl overflow-hidden">
              <img
                src={exercise.image_url}
                alt={exercise.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded bg-[#d92525]/10 border border-[#d92525]/20 text-xs text-[#d92525] font-medium">
              {exercise.bodyPart}
            </span>
            <span className="px-2 py-1 rounded bg-[#222] text-xs text-gray-400">
              {exercise.equipment}
            </span>
            {exercise.difficulty && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                exercise.difficulty === "进阶"
                  ? "bg-[#d92525]/10 border border-[#d92525]/20 text-[#d92525]"
                  : exercise.difficulty === "中级"
                  ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
                  : "bg-green-500/10 border border-green-500/20 text-green-500"
              }`}>
                {exercise.difficulty}
              </span>
            )}
            {exercise.isFootballRelevant && (
              <span className="px-2 py-1 rounded bg-[#d92525]/10 border border-[#d92525]/20 text-xs text-[#d92525] font-medium">
                ⚽ 足球专项
              </span>
            )}
            {exercise.footballCategory && (
              <span className="px-2 py-1 rounded bg-[#222] text-xs text-gray-400">
                {exercise.footballCategory}
              </span>
            )}
          </div>

          {/* Sets/Reps info for strength */}
          {exercise.type === "力量" && exercise.sets && exercise.reps && (
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-[#111] rounded-lg px-3 py-2 flex-1 text-center">
                <p className="text-[10px] text-gray-500 mb-0.5">组数</p>
                <p className="text-[#d1d1d1] font-bold">{exercise.sets[0]}-{exercise.sets[1]} 组</p>
              </div>
              <div className="bg-[#111] rounded-lg px-3 py-2 flex-1 text-center">
                <p className="text-[10px] text-gray-500 mb-0.5">次数</p>
                <p className="text-[#d1d1d1] font-bold">{exercise.reps[0]}-{exercise.reps[1]} 次</p>
              </div>
              {exercise.rest && (
                <div className="bg-[#111] rounded-lg px-3 py-2 flex-1 text-center">
                  <p className="text-[10px] text-gray-500 mb-0.5">组间歇</p>
                  <p className="text-[#d1d1d1] font-bold">{exercise.rest}s</p>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {exercise.description && (
            <div>
              <p className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider font-medium">动作说明</p>
              <p className="text-sm text-gray-400 leading-relaxed">{exercise.description}</p>
            </div>
          )}

          {/* Cue Points */}
          {exercise.cue_points && exercise.cue_points.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider font-medium">动作要点</p>
              <ol className="space-y-1.5">
                {exercise.cue_points.map((c: string, i: number) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-1.5">
                    <span className="text-[#d92525] font-bold shrink-0">{i + 1}.</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Load Default */}
          {exercise.load_default && (
            <div>
              <p className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider font-medium">参考负荷</p>
              <span className="px-2 py-1 rounded bg-[#111] text-sm text-gray-300 border border-[#222]">
                {exercise.load_default}
              </span>
            </div>
          )}

          {/* RPE & Heart Rate */}
          {(exercise.rpe || exercise.heart_rate_zone) && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              {exercise.rpe && <span className="bg-[#111] px-2 py-1 rounded border border-[#222]">RPE {exercise.rpe}</span>}
              {exercise.heart_rate_zone && <span className="bg-[#111] px-2 py-1 rounded border border-[#222]">{exercise.heart_rate_zone}</span>}
            </div>
          )}

          {/* Progression */}
          {exercise.progression && (
            <div className="bg-[#111] rounded-xl p-3 border border-[#222]">
              <p className="text-xs text-[#d92525] font-bold mb-1">进阶变式</p>
              <p className="text-xs text-gray-400">{exercise.progression}</p>
            </div>
          )}

          {/* Regression */}
          {exercise.regression && (
            <div className="bg-[#111] rounded-xl p-3 border border-[#222]">
              <p className="text-xs text-blue-400 font-bold mb-1">退阶变式</p>
              <p className="text-xs text-gray-400">{exercise.regression}</p>
            </div>
          )}

          {/* Add to Plan Button */}
          <button
            onClick={() => onAddToPlan(exercise)}
            className="w-full bg-[#d92525] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-[#e03030] transition-all duration-150 hover:shadow-lg hover:shadow-[#d92525]/20"
          >
            <Plus className="w-4 h-4" />
            添加到训练方案
          </button>
        </div>
      </div>
    </>
  );
}
