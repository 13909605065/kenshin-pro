"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
    // Warmup
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

    // Cool down
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
  const steps = flattenWorkoutSteps(modules);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<"active" | "rest" | "done" | "paused">(
    "active"
  );
  const [timer, setTimer] = useState(0); // seconds remaining
  const [elapsed, setElapsed] = useState(0); // total seconds
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);

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

  // ═══ ADVANCE ═══
  const advanceStep = useCallback(() => {
    if (currentStep + 1 >= steps.length) {
      completeSound();
      setCompleted(true);
      // Save record
      try {
        const records: WorkoutRecord[] = JSON.parse(
          localStorage.getItem("workout_records") || "[]"
        );
        records.unshift({
          date: new Date().toISOString(),
          totalDuration: elapsed + 1,
          stepsCompleted: steps.length,
          planId,
        });
        localStorage.setItem("workout_records", JSON.stringify(records.slice(0, 50)));
      } catch {}
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

  // ═══ COMPLETED SCREEN ═══
  if (completed) {
    return (
      <div className="fixed inset-0 z-50 bg-pitch-900 flex flex-col items-center justify-center p-6">
        <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">训练完成！</h1>
        <p className="text-gray-400 mb-1">总时长 {fmt(elapsed)}</p>
        <p className="text-gray-400 mb-6">
          完成 {steps.length} 项练习
        </p>
        <button
          onClick={onClose}
          className="px-8 py-3 bg-neon-pink text-black font-bold rounded-xl hover:bg-neon-pink/90 transition"
        >
          返回方案
        </button>
        <p className="text-[10px] text-gray-600 mt-4">
          训练记录已保存
        </p>
      </div>
    );
  }

  if (!step) {
    return (
      <div className="fixed inset-0 z-50 bg-pitch-900 flex items-center justify-center">
        <p className="text-gray-500">该方案暂无跟练内容</p>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    );
  }

  // ═══ ACTIVE WORKOUT SCREEN ═══
  return (
    <div className="fixed inset-0 z-50 bg-pitch-900 flex flex-col select-none">
      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-pitch-700 flex-shrink-0">
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {catIcon(step.category)}
            <span className="text-xs text-gray-400 font-medium">
              {catLabel(step.category)}
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {currentStep + 1}/{totalSteps}
        </span>
        <span className="text-xs text-gray-600 font-mono ml-1">
          总 {fmt(elapsed)}
        </span>
      </div>

      {/* PROGRESS BAR */}
      <div className="h-1 bg-pitch-800 flex-shrink-0">
        <div
          className="h-full bg-neon-pink transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Exercise name */}
        <h2 className="text-white text-xl font-bold text-center mb-1">
          {step.name}
        </h2>

        {/* Set counter for strength */}
        {step.mode === "sets" && (
          <p className="text-neon-pink text-sm font-medium mb-1">
            第 {currentSet} 组 / 共 {step.sets} 组
          </p>
        )}

        {/* Reps / details */}
        {step.mode === "sets" && step.reps && (
          <p className="text-gray-400 text-sm mb-4">
            {step.reps}次 · {step.intensity || ""}
          </p>
        )}
        {step.description && (
          <p className="text-gray-500 text-xs text-center mb-6 max-w-xs">
            {step.description}
          </p>
        )}

        {/* TIMER DISPLAY */}
        <div
          className={`w-44 h-44 rounded-full flex items-center justify-center border-4 mb-6 ${
            phase === "rest"
              ? "border-yellow-500/50 bg-yellow-500/10"
              : phase === "paused"
              ? "border-gray-500/50 bg-gray-500/10"
              : "border-neon-pink/50 bg-neon-pink/10"
          }`}
        >
          <div className="text-center">
            {step.mode === "countdown" && phase === "active" && (
              <>
                <div className="text-4xl font-bold text-white font-mono tracking-tight">
                  {fmt(timer)}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">剩余时间</div>
              </>
            )}
            {step.mode === "sets" && phase === "rest" && (
              <>
                <div className="text-4xl font-bold text-yellow-400 font-mono tracking-tight">
                  {fmt(timer)}
                </div>
                <div className="text-[10px] text-yellow-500/70 mt-1">
                  组间休息
                </div>
              </>
            )}
            {step.mode === "sets" && phase === "active" && (
              <>
                <div className="text-3xl font-bold text-white font-mono">
                  {step.reps}次
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  第{currentSet}组 · {step.sets}组共计
                </div>
              </>
            )}
            {step.mode === "free" && (
              <>
                <div className="text-4xl font-bold text-white font-mono tracking-tight">
                  {fmt(elapsed)}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">已用时间</div>
              </>
            )}
            {phase === "paused" && (
              <div className="text-sm text-gray-500 mt-1">已暂停</div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="px-4 py-4 border-t border-pitch-700 flex-shrink-0 space-y-3">
        {/* Primary action */}
        <div className="flex gap-3">
          {step.mode === "sets" && phase === "active" && (
            <button
              onClick={handleCompleteSet}
              className="flex-1 py-3 bg-neon-pink text-black font-bold rounded-xl text-sm hover:bg-neon-pink/90 transition active:scale-95"
            >
              ✓ 完成本组
            </button>
          )}
          {(step.mode === "countdown" || step.mode === "free") && (
            <button
              onClick={handleSkip}
              className="flex-1 py-3 bg-neon-pink text-black font-bold rounded-xl text-sm hover:bg-neon-pink/90 transition active:scale-95"
            >
              <span className="flex items-center justify-center gap-2">
                <SkipForward className="w-4 h-4" />
                跳过此项
              </span>
            </button>
          )}
          {phase === "rest" && (
            <button
              onClick={handleSkipRest}
              className="flex-1 py-3 bg-neon-pink text-black font-bold rounded-xl text-sm hover:bg-neon-pink/90 transition active:scale-95"
            >
              跳过休息
            </button>
          )}
          <button
            onClick={handlePause}
            className={`px-4 py-3 rounded-xl text-sm font-medium border transition active:scale-95 ${
              phase === "paused"
                ? "border-neon-pink text-neon-pink bg-neon-pink/10"
                : "border-pitch-600 text-gray-400 hover:text-white"
            }`}
          >
            {phase === "paused" ? (
              <Play className="w-5 h-5" />
            ) : (
              <Pause className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
