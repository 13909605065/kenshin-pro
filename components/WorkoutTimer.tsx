"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { TrainingModule, Exercise, WarmupItem } from "@/lib/types";
import {
  X,
  Play,
  Pause,
  SkipForward,
  Timer,
  Dumbbell,
  Flame,
  Footprints,
  Zap,
  CheckCircle2,
  Minimize2,
  GripHorizontal,
} from "lucide-react";

// ═══════════════════════════════════
// TYPES
// ═══════════════════════════════════

interface WorkoutStep {
  id: string;
  name: string;
  description: string;
  category: "warmup" | "strength" | "technique" | "cooldown";
  mode: "countdown" | "sets" | "free";
  duration: number; // seconds
  sets?: number;
  reps?: number;
  rest?: number; // seconds between sets
  intensity?: string;
}

interface WorkoutRecord {
  date: string;
  totalDuration: number;
  stepsCompleted: number;
  planId?: string;
}

// ═══════════════════════════════════
// AUDIO HELPERS
// ═══════════════════════════════════

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function beep(freq: number, duration: number, vol = 0.15) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function tickSound() {
  beep(800, 0.12, 0.08);
}
function restEndSound() {
  beep(600, 0.1, 0.1);
  setTimeout(() => beep(900, 0.15, 0.12), 120);
}
function completeSound() {
  beep(523, 0.15, 0.12);
  setTimeout(() => beep(659, 0.15, 0.12), 150);
  setTimeout(() => beep(784, 0.3, 0.15), 300);
}

// ═══════════════════════════════════
// FLATTEN MODULES INTO STEPS
// ═══════════════════════════════════

function flattenWorkoutSteps(modules: TrainingModule[]): WorkoutStep[] {
  const steps: WorkoutStep[] = [];

  for (const m of modules) {
    // ═══ ATHLETE: position_training ═══
    if (m.module === "position_training" && "warmup" in m) {
      (m as any).warmup?.forEach((w: WarmupItem, i: number) => {
        steps.push({
          id: `warm-${i}`,
          name: w.name,
          description: w.description || "",
          category: "warmup",
          mode: "countdown",
          duration: (w.duration || 3) * 60,
        });
      });
    }

    // ═══ COACH: session_plan ═══
    if (m.module === "session_plan") {
      const sp = m as any;
      // Warmup
      sp.warmup?.forEach((w: WarmupItem, i: number) => {
        steps.push({
          id: `coach-warm-${i}`,
          name: w.name,
          description: w.description || "",
          category: "warmup",
          mode: "countdown",
          duration: (w.duration || 3) * 60,
        });
      });
      // Activities
      sp.activities?.forEach((act: any, i: number) => {
        steps.push({
          id: `coach-act-${i}`,
          name: act.name,
          description: [
            act.description || "",
            act.area ? `场地: ${act.area}` : "",
            act.groups ? `分组: ${act.groups}` : "",
            act.coaching_points?.join("；") || "",
          ].filter(Boolean).join(" · "),
          category: "technique",
          mode: "countdown",
          duration: (act.duration || 10) * 60,
        });
      });
      // SSG (Small-Sided Game)
      if (sp.ssg) {
        steps.push({
          id: "coach-ssg",
          name: `分队比赛: ${sp.ssg.name}`,
          description: [
            sp.ssg.rules || "",
            `场地: ${sp.ssg.area}`,
            `人数: ${sp.ssg.players}`,
          ].filter(Boolean).join(" · "),
          category: "technique",
          mode: "countdown",
          duration: (sp.ssg.duration || 15) * 60,
        });
      }
      // Cooldown
      sp.cooldown?.forEach((c: WarmupItem, i: number) => {
        steps.push({
          id: `coach-cool-${i}`,
          name: c.name,
          description: c.description || "",
          category: "cooldown",
          mode: "countdown",
          duration: (c.duration || 3) * 60,
        });
      });
    }

    // Strength / Physical exercises
    for (const key of ["upper_limb", "lower_limb", "core", "ability"]) {
      const arr = (m as any)[key] as Exercise[] | undefined;
      arr?.forEach((ex: Exercise, i: number) => {
        steps.push({
          id: `${key}-${i}`,
          name: ex.name,
          description: [
            ex.load || "",
            ex.cue_points?.join("，") || "",
          ]
            .filter(Boolean)
            .join(" · "),
          category: "strength",
          mode: "sets",
          duration: 0,
          sets: ex.sets || 3,
          reps: ex.reps || 10,
          rest: ex.rest || 90,
          intensity: ex.rpe ? `RPE ${ex.rpe}` : "",
        });
      });
    }

    // Cool down (athlete)
    if (m.module === "position_training" && "cooldown" in m) {
      (m as any).cooldown?.forEach((c: WarmupItem, i: number) => {
        steps.push({
          id: `cool-${i}`,
          name: c.name,
          description: c.description || "",
          category: "cooldown",
          mode: "countdown",
          duration: (c.duration || 3) * 60,
        });
      });
    }
  }

  return steps;
}

// ═══════════════════════════════════
// WORKOUT TIMER COMPONENT
// ═══════════════════════════════════

interface Props {
  modules: TrainingModule[];
  planId?: string;
  onClose: () => void;
}

export function WorkoutTimer({ modules, planId, onClose }: Props) {
  const steps = useMemo(() => flattenWorkoutSteps(modules), [modules]);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<"active" | "rest" | "done" | "paused">(
    "active"
  );
  const [timer, setTimer] = useState(0); // seconds remaining
  const [elapsed, setElapsed] = useState(0); // total seconds
  const [completed, setCompleted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Drag state
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  // ═══ WAKE LOCK ═══
  useEffect(() => {
    if ("wakeLock" in navigator) {
      (navigator as any).wakeLock
        .request("screen")
        .then((wl: any) => (wakeLockRef.current = wl))
        .catch(() => {});
    }
    return () => {
      wakeLockRef.current?.release?.();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ═══ INIT TIMER FOR CURRENT STEP ═══
  useEffect(() => {
    if (!step || completed) return;

    if (step.mode === "countdown") {
      setTimer(step.duration);
    } else if (step.mode === "sets" && phase === "rest") {
      const restTime = step.rest || 90;
      setTimer(restTime);
    } else if (step.mode === "free") {
      setTimer(0); // counting up
    }
  }, [currentStep, currentSet, phase, step, completed]);

  // ═══ TIMER TICK ═══
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (completed) return;

    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1);

      if (phase === "paused") return;

      if (step?.mode === "countdown" || (step?.mode === "sets" && phase === "rest")) {
        setTimer((t) => {
          const next = t - 1;
          // Tick sound in last 3 seconds
          if (next <= 3 && next > 0) tickSound();
          // Timer done
          if (next <= 0) {
            if (phase === "rest") {
              restEndSound();
              // Move to next set or next step
              if (step.mode === "sets" && step.sets && currentSet < step.sets) {
                setCurrentSet((s) => s + 1);
                setPhase("active");
              } else {
                advanceStep();
              }
            } else {
              // countdown done
              restEndSound();
              advanceStep();
            }
          }
          return next;
        });
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, currentStep, currentSet, step, completed]);

  // ═══ SAVE ═══
  const saveRecord = (stepsDone: number, totalDuration: number) => {
    try {
      const records: WorkoutRecord[] = JSON.parse(localStorage.getItem("workout_records") || "[]");
      records.unshift({
        date: new Date().toISOString(),
        totalDuration,
        stepsCompleted: stepsDone,
        planId,
      });
      localStorage.setItem("workout_records", JSON.stringify(records.slice(0, 50)));
    } catch {}
  };

  // Save progress periodically
  useEffect(() => {
    const id = setInterval(() => {
      if (!completed && elapsed > 0) {
        saveRecord(currentStep, elapsed);
      }
    }, 30000); // every 30s
    return () => clearInterval(id);
  }, [elapsed, currentStep, completed]);

  // Save on exit
  useEffect(() => {
    return () => {
      if (!completed && elapsed > 10) {
        saveRecord(currentStep, elapsed);
      }
    };
  }, []);

  // ═══ ADVANCE ═══
  const advanceStep = useCallback(() => {
    if (currentStep + 1 >= steps.length) {
      completeSound();
      setCompleted(true);
      saveRecord(steps.length, elapsed + 1);
      return;
    }
    setCurrentStep((s) => s + 1);
    setCurrentSet(1);
    setPhase("active");
  }, [currentStep, steps.length, elapsed, planId]);

  // ═══ ACTIONS ═══
  const handleCompleteSet = () => {
    if (!step || step.mode !== "sets") return;
    if (step.sets && currentSet < step.sets) {
      // Enter rest
      setPhase("rest");
    } else {
      // Last set done → next step
      advanceStep();
    }
  };

  const handleSkipRest = () => {
    if (step?.mode === "sets" && step.sets && currentSet < step.sets) {
      setCurrentSet((s) => s + 1);
      setPhase("active");
    } else {
      advanceStep();
    }
  };

  const handleSkip = () => advanceStep();
  const handlePause = () => setPhase((p) => (p === "paused" ? "active" : "paused"));

  // ═══ FORMAT TIME ═══
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ═══ CATEGORY ICON ═══
  const catIcon = (cat: string) => {
    switch (cat) {
      case "warmup":
        return <Flame className="w-5 h-5 text-orange-400" />;
      case "strength":
        return <Dumbbell className="w-5 h-5 text-neon-pink" />;
      case "technique":
        return <Footprints className="w-5 h-5 text-blue-400" />;
      case "cooldown":
        return <Zap className="w-5 h-5 text-green-400" />;
      default:
        return <Timer className="w-5 h-5 text-gray-400" />;
    }
  };

  const catLabel = (cat: string) => {
    switch (cat) {
      case "warmup":
        return "热身";
      case "strength":
        return "力量";
      case "technique":
        return "技术";
      case "cooldown":
        return "冷身";
      default:
        return "";
    }
  };

  // Next exercise preview
  const nextStep = currentStep + 1 < steps.length ? steps[currentStep + 1] : null;

  // ═══ COMPLETED SCREEN (floating popup) ═══
  if (completed) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white mb-2">训练完成！</h1>
            <p className="text-gray-400 text-sm mb-1">总时长 {fmt(elapsed)}</p>
            <p className="text-gray-400 text-sm mb-4">完成 {steps.length} 项练习</p>
            <button
              onClick={onClose}
              className="px-8 py-2.5 bg-[#d92525] text-white font-bold rounded-xl hover:bg-[#b91d1d] transition text-sm"
            >
              返回方案
            </button>
            <p className="text-[10px] text-gray-600 mt-3">训练记录已保存</p>
          </div>
        </div>
      </div>
    );
  }

  if (!step) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-[#1e1e1e] border border-[#333] rounded-xl p-4 shadow-xl max-w-xs">
        <p className="text-gray-500 text-sm">该方案暂无跟练内容</p>
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
  };

  const handleMouseUp = () => setDragging(false);

  // ═══ ACTIVE WORKOUT — FLOATING POPUP ═══
  if (minimized) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 bg-[#1e1e1e] border border-[#333] rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-3 cursor-pointer select-none hover:border-[#d92525]/50 transition"
        onClick={() => setMinimized(false)}
      >
        <div className={phase === "rest" ? "text-yellow-400" : phase === "paused" ? "text-gray-500" : "text-[#d92525]"}>
          <Timer className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white font-medium truncate max-w-[120px]">{step.name}</p>
          <p className="text-[10px] text-gray-500">
            {step.mode === "countdown" ? fmt(timer) : `${currentSet}/${step.sets}组`} · {currentStep + 1}/{totalSteps}
          </p>
        </div>
        <span className="text-[10px] text-gray-600">{fmt(elapsed)}</span>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-gray-600 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={popupRef}
      className="fixed bottom-4 right-4 z-50 bg-[#1e1e1e] border border-[#333] rounded-2xl shadow-2xl max-w-sm w-full select-none overflow-hidden"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* DRAG HEADER */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-[#333] cursor-grab active:cursor-grabbing bg-[#1a1a1a]"
        onMouseDown={handleMouseDown}
      >
        <GripHorizontal className="w-3.5 h-3.5 text-gray-600" />
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {catIcon(step.category)}
          <span className="text-[10px] text-gray-400 font-medium">{catLabel(step.category)}</span>
        </div>
        <span className="text-[10px] text-gray-500 font-mono">{currentStep + 1}/{totalSteps}</span>
        <span className="text-[10px] text-gray-600 font-mono">总 {fmt(elapsed)}</span>
        <button onClick={() => setMinimized(true)} className="text-gray-600 hover:text-gray-400 ml-1">
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onClose} className="text-gray-600 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* PROGRESS BAR */}
      <div className="h-0.5 bg-[#222]">
        <div className="h-full bg-[#d92525] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* MAIN CONTENT */}
      <div className="px-4 py-4 flex flex-col items-center">
        {/* Exercise name */}
        <h2 className="text-white text-base font-bold text-center mb-1">{step.name}</h2>

        {/* Set counter */}
        {step.mode === "sets" && (
          <p className="text-[#d92525] text-xs font-medium mb-1">
            第 {currentSet} 组 / 共 {step.sets} 组
          </p>
        )}

        {/* Reps / details */}
        {step.mode === "sets" && step.reps && (
          <p className="text-gray-400 text-xs mb-2">{step.reps}次 · {step.intensity || ""}</p>
        )}
        {step.description && (
          <p className="text-gray-500 text-[10px] text-center mb-3 max-w-[200px] leading-relaxed line-clamp-2">
            {step.description}
          </p>
        )}

        {/* TIMER RING */}
        <div
          className={`w-28 h-28 rounded-full flex items-center justify-center border-3 mb-3 ${
            phase === "rest"
              ? "border-yellow-500/40 bg-yellow-500/10"
              : phase === "paused"
              ? "border-gray-500/40 bg-gray-500/10"
              : "border-[#d92525]/40 bg-[#d92525]/10"
          }`}
        >
          <div className="text-center">
            {step.mode === "countdown" && phase === "active" && (
              <>
                <div className="text-3xl font-bold text-white font-mono tracking-tight">{fmt(timer)}</div>
                <div className="text-[9px] text-gray-500 mt-0.5">剩余</div>
              </>
            )}
            {step.mode === "sets" && phase === "rest" && (
              <>
                <div className="text-3xl font-bold text-yellow-400 font-mono tracking-tight">{fmt(timer)}</div>
                <div className="text-[9px] text-yellow-500/70 mt-0.5">组间休息</div>
              </>
            )}
            {step.mode === "sets" && phase === "active" && (
              <>
                <div className="text-2xl font-bold text-white font-mono">{step.reps}次</div>
                <div className="text-[9px] text-gray-500 mt-0.5">第{currentSet}组/共{step.sets}组</div>
              </>
            )}
            {step.mode === "free" && (
              <>
                <div className="text-3xl font-bold text-white font-mono tracking-tight">{fmt(elapsed)}</div>
                <div className="text-[9px] text-gray-500 mt-0.5">已用</div>
              </>
            )}
            {phase === "paused" && (
              <div className="text-xs text-gray-500">已暂停</div>
            )}
          </div>
        </div>

        {/* Next exercise preview */}
        {nextStep && (
          <div className="w-full bg-[#111] rounded-lg px-3 py-2 mb-3">
            <span className="text-[9px] text-gray-600">下一项</span>
            <p className="text-[11px] text-gray-400 truncate">{nextStep.name}</p>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="px-4 pb-4 space-y-2">
        <div className="flex gap-2">
          {step.mode === "sets" && phase === "active" && (
            <button onClick={handleCompleteSet}
              className="flex-1 py-2.5 bg-[#d92525] text-white font-bold rounded-xl text-xs hover:bg-[#b91d1d] transition active:scale-95">
              ✓ 完成本组
            </button>
          )}
          {(step.mode === "countdown" || step.mode === "free") && (
            <button onClick={handleSkip}
              className="flex-1 py-2.5 bg-[#d92525] text-white font-bold rounded-xl text-xs hover:bg-[#b91d1d] transition active:scale-95 flex items-center justify-center gap-1">
              <SkipForward className="w-3.5 h-3.5" /> 跳过
            </button>
          )}
          {phase === "rest" && (
            <button onClick={handleSkipRest}
              className="flex-1 py-2.5 bg-[#d92525] text-white font-bold rounded-xl text-xs hover:bg-[#b91d1d] transition active:scale-95">
              跳过休息
            </button>
          )}
          <button onClick={handlePause}
            className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition active:scale-95 ${
              phase === "paused" ? "border-[#d92525] text-[#d92525] bg-[#d92525]/10" : "border-[#333] text-gray-400 hover:text-white"
            }`}>
            {phase === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
