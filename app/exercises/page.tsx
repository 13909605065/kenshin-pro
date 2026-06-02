"use client";

import { useState, useMemo } from "react";
import { Search, Dumbbell, ChevronUp, ChevronDown, ArrowUpFromLine } from "lucide-react";
import { STRENGTH_LIBRARY, WARMUP_LIBRARY, DRILL_LIBRARY, COOLDOWN_LIBRARY } from "@/lib/training-library";

// ═══════════════════════════════════════════════
// Category Types
// ═══════════════════════════════════════════════

type BodyPart = "all" | "上肢" | "下肢" | "核心" | "背部" | "全身";
type Equipment = "all" | "杠铃" | "哑铃" | "悬吊" | "自重";
type ExType = "all" | "热身" | "力量" | "技术训练" | "整理";

const BODY_PARTS: BodyPart[] = ["all", "上肢", "下肢", "核心", "背部", "全身"];
const EQUIPMENTS: Equipment[] = ["all", "杠铃", "哑铃", "悬吊", "自重"];
const EX_TYPES: ExType[] = ["all", "热身", "力量", "技术训练", "整理"];

// ═══════════════════════════════════════════════
// Unified Exercise Item
// ═══════════════════════════════════════════════

interface UnifiedExercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  type: ExType;
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
  // Warmup/Cooldown/Drill fields
  duration?: number;
  description?: string;
  category?: string;
  purpose?: string;
  key_points?: string[];
  diagram?: any;
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
// Build unified exercise list
// ═══════════════════════════════════════════════

function buildUnifiedExercises(): UnifiedExercise[] {
  const list: UnifiedExercise[] = [];

  // Strength exercises
  for (const [id, ex] of Object.entries(STRENGTH_LIBRARY)) {
    list.push({
      id,
      name: ex.name,
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
    });
  }

  // Warmups
  for (const [id, w] of Object.entries(WARMUP_LIBRARY)) {
    list.push({
      id,
      name: w.name,
      bodyPart: "全身",
      equipment: detectEquipment(id),
      type: "热身",
      duration: w.duration,
      description: w.description,
      category: w.category,
    });
  }

  // Drills
  for (const [id, d] of Object.entries(DRILL_LIBRARY)) {
    list.push({
      id,
      name: d.name,
      bodyPart: "全身",
      equipment: "自重",
      type: "技术训练",
      duration: d.duration,
      description: d.description,
      purpose: d.purpose,
      key_points: d.key_points,
      image_url: d.image_url,
      diagram: d.diagram,
    });
  }

  // Cooldowns
  for (const [id, c] of Object.entries(COOLDOWN_LIBRARY)) {
    list.push({
      id,
      name: c.name,
      bodyPart: "全身",
      equipment: "自重",
      type: "整理",
      duration: c.duration,
      description: c.description,
    });
  }

  return list;
}

// ═══════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════

export default function ExercisesPage() {
  const allExercises = useMemo(() => buildUnifiedExercises(), []);
  const [bodyPart, setBodyPart] = useState<BodyPart>("all");
  const [equipment, setEquipment] = useState<Equipment>("all");
  const [exType, setExType] = useState<ExType>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Filter
  const filtered = useMemo(() => {
    return allExercises.filter((ex) => {
      if (bodyPart !== "all" && ex.bodyPart !== bodyPart) return false;
      if (equipment !== "all" && ex.equipment !== equipment) return false;
      if (exType !== "all" && ex.type !== exType) return false;
      if (search && !ex.name.includes(search) && !ex.id.includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allExercises, bodyPart, equipment, exType, search]);

  // Count by category
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allExercises.length };
    for (const bp of BODY_PARTS) if (bp !== "all") c[bp] = allExercises.filter(e => e.bodyPart === bp).length;
    return c;
  }, [allExercises]);

  // Scroll handler
  if (typeof window !== "undefined") {
    window.onscroll = () => setShowScrollTop(window.scrollY > 400);
  }

  return (
    <div className="min-h-screen bg-pitch-900">
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">训练动作库</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filtered.length} / {allExercises.length} 个动作
            </p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索动作名称..."
              className="w-48 sm:w-64 bg-pitch-800 border border-pitch-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-pink transition"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          {/* Body Part Tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {BODY_PARTS.map((bp) => (
              <button
                key={bp}
                onClick={() => setBodyPart(bp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  bodyPart === bp
                    ? "bg-neon-pink text-black"
                    : "bg-pitch-800 text-gray-400 hover:text-white hover:bg-pitch-700"
                }`}
              >
                {bp === "all" ? "全部" : bp}
                <span className="ml-1 opacity-60">{counts[bp] || 0}</span>
              </button>
            ))}
          </div>

          {/* Equipment Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">器材</span>
            <div className="flex gap-1">
              {EQUIPMENTS.map((eq) => (
                <button
                  key={eq}
                  onClick={() => setEquipment(eq)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    equipment === eq
                      ? "bg-pitch-600 text-white"
                      : "bg-pitch-800/50 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {eq === "all" ? "全部器材" : eq}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">类型</span>
            <div className="flex gap-1">
              {EX_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setExType(t)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    exType === t
                      ? "bg-pitch-600 text-white"
                      : "bg-pitch-800/50 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {t === "all" ? "全部类型" : t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Exercise Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">没有匹配的动作</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                isExpanded={expandedId === ex.id}
                onToggle={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-20 right-4 z-30 p-2.5 bg-neon-pink text-black rounded-full shadow-lg hover:scale-110 transition"
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
  exercise,
  isExpanded,
  onToggle,
}: {
  exercise: UnifiedExercise;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isStrength = exercise.type === "力量";
  const isWarmup = exercise.type === "热身";
  const isDrill = exercise.type === "技术训练";
  const isCooldown = exercise.type === "整理";

  return (
    <div
      className={`glass-card overflow-hidden transition-all duration-200 cursor-pointer ${
        isExpanded ? "ring-1 ring-neon-pink/50 col-span-2 sm:col-span-2 lg:col-span-3 xl:col-span-3" : "hover:ring-1 hover:ring-pitch-600"
      }`}
      onClick={onToggle}
    >
      {/* Image / Placeholder */}
      <div className="aspect-[4/3] bg-pitch-800 relative overflow-hidden">
        {exercise.image_url ? (
          <img
            src={exercise.image_url}
            alt={exercise.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Dumbbell className="w-8 h-8 text-gray-700" />
          </div>
        )}
        {/* Type badge */}
        <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
          isStrength ? "bg-neon-pink/80 text-black" :
          isWarmup ? "bg-yellow-500/80 text-black" :
          isDrill ? "bg-blue-500/80 text-white" :
          "bg-green-500/80 text-black"
        }`}>
          {exercise.type}
        </span>
        {/* Equipment badge */}
        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] bg-black/50 text-gray-300">
          {exercise.equipment}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-white font-bold text-sm truncate">{exercise.name}</h3>

        {isStrength && exercise.sets && exercise.reps && (
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
            <span className="bg-pitch-700 px-1.5 py-0.5 rounded">
              {exercise.sets[0]}-{exercise.sets[1]}×{exercise.reps[0]}-{exercise.reps[1]}
            </span>
            {exercise.rpe && (
              <span className="bg-pitch-700 px-1.5 py-0.5 rounded">RPE {exercise.rpe}</span>
            )}
          </div>
        )}

        {isWarmup && exercise.duration && (
          <p className="text-[11px] text-gray-400 mt-1">{exercise.duration}分钟</p>
        )}

        {isDrill && exercise.duration && (
          <p className="text-[11px] text-gray-400 mt-1">{exercise.duration}分钟</p>
        )}

        {isCooldown && exercise.duration && (
          <p className="text-[11px] text-gray-400 mt-1">{exercise.duration}分钟</p>
        )}

        {/* Expand indicator */}
        <div className="flex items-center justify-center mt-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-pitch-700 pt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Description */}
          {exercise.description && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">说明</p>
              <p className="text-sm text-gray-300">{exercise.description}</p>
            </div>
          )}

          {/* Purpose (drills) */}
          {exercise.purpose && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">训练目的</p>
              <p className="text-sm text-gray-300">{exercise.purpose}</p>
            </div>
          )}

          {/* Strength params */}
          {isStrength && (
            <div className="grid grid-cols-3 gap-2">
              {exercise.load_default && (
                <div className="bg-pitch-800 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500">负荷</p>
                  <p className="text-xs text-white font-medium">{exercise.load_default}</p>
                </div>
              )}
              {exercise.rest && (
                <div className="bg-pitch-800 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500">间歇</p>
                  <p className="text-xs text-white font-medium">{exercise.rest}s</p>
                </div>
              )}
              {exercise.heart_rate_zone && (
                <div className="bg-pitch-800 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500">心率区间</p>
                  <p className="text-xs text-white font-medium">{exercise.heart_rate_zone}</p>
                </div>
              )}
            </div>
          )}

          {/* Cue Points */}
          {exercise.cue_points && exercise.cue_points.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">动作要点</p>
              <ul className="space-y-0.5">
                {exercise.cue_points.map((cue, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                    <span className="text-neon-pink mt-0.5">•</span>
                    {cue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Points (drills) */}
          {exercise.key_points && exercise.key_points.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">技术要点</p>
              <ul className="space-y-0.5">
                {exercise.key_points.map((kp, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                    <span className="text-neon-pink mt-0.5">•</span>
                    {kp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Progression */}
          {exercise.progression && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">进阶变式</p>
              <p className="text-xs text-gray-300 flex items-center gap-1">
                <ChevronUp className="w-3 h-3 text-green-400" />
                {exercise.progression}
              </p>
            </div>
          )}

          {/* Diagram (drills) */}
          {exercise.diagram && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">场地设置</p>
              <div className="bg-pitch-800 rounded-lg p-2 grid grid-cols-2 gap-1 text-xs text-gray-400">
                <span>布局: {exercise.diagram.layout}</span>
                <span>标志盘: {exercise.diagram.cone_count}个</span>
                <span>间距: {exercise.diagram.cone_spacing}</span>
                {exercise.diagram.total_distance && <span>总距: {exercise.diagram.total_distance}</span>}
              </div>
            </div>
          )}

          {/* ID */}
          <p className="text-[10px] text-gray-700 font-mono">{exercise.id}</p>
        </div>
      )}
    </div>
  );
}
