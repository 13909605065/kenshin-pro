"use client";

import { useState, useEffect, useRef } from "react";
import { X, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import type { TrainingModule } from "@/lib/types";

interface Props {
  modules: TrainingModule[];
  planId?: string | null;
  onClose: () => void;
}

interface FlatExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  rest: number;
  section: string; // "热身" | "上肢" | "下肢" | "核心" | "冷身" etc
}

function flattenExercises(modules: TrainingModule[]): FlatExercise[] {
  const result: FlatExercise[] = [];

  for (const m of modules) {
    if (m.module === "position_training") {
      const pt = m as any;
      if (pt.warmup?.length) {
        pt.warmup.forEach((w: any) => {
          result.push({ id: w.id || w.name, name: w.name, sets: `${w.duration || 1}min`, reps: "—", rest: 0, section: "🔥 热身" });
        });
      }
      const groups = [
        { key: "upper_limb", label: "💪 上肢" },
        { key: "lower_limb", label: "🦵 下肢" },
        { key: "core", label: "🎯 核心" },
        { key: "ability", label: "⚡ 专项" },
      ];
      groups.forEach(({ key, label }) => {
        const items = pt[key] || [];
        items.forEach((ex: any) => {
          result.push({
            id: ex.id || ex.name,
            name: ex.name,
            sets: ex.sets?.toString() || "3",
            reps: ex.reps?.toString() || "10",
            rest: ex.rest || 90,
            section: label,
          });
        });
      });
      if (pt.cooldown?.length) {
        pt.cooldown.forEach((c: any) => {
          result.push({ id: c.id || c.name, name: c.name, sets: `${c.duration || 1}min`, reps: "—", rest: 0, section: "🧊 冷身" });
        });
      }
    }

    if (m.module === "ability_training") {
      const at = m as any;
      (at.exercises || at.ability_exercises || []).forEach((ex: any) => {
        result.push({
          id: ex.id || ex.name,
          name: ex.name,
          sets: ex.sets?.toString() || "3",
          reps: ex.reps?.toString() || "10",
          rest: ex.rest || 90,
          section: "⚡ 专项能力",
        });
      });
    }
  }

  return result;
}

export default function MobileTrainingMode({ modules, planId, onClose }: Props) {
  const exercises = flattenExercises(modules);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});
  const [isResting, setIsResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const totalExercises = exercises.length;
  const current = exercises[currentIdx];
  const progress = ((currentIdx + 1) / Math.max(totalExercises, 1)) * 100;

  // Wake lock to prevent screen sleep
  useEffect(() => {
    let wakeLock: any = null;
    const requestWake = async () => {
      try {
        wakeLock = await (navigator as any).wakeLock?.request?.("screen");
      } catch {}
    };
    requestWake();
    return () => { wakeLock?.release?.(); };
  }, []);

  // Rest timer
  useEffect(() => {
    if (!isResting) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setRestSeconds((prev) => {
        if (prev <= 1) {
          setIsResting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isResting]);

  const completeSet = () => {
    if (!current) return;
    const key = current.id;
    const currentCompleted = completedSets[key] || 0;
    const totalSets = parseInt(current.sets) || 1;

    if (currentCompleted + 1 >= totalSets) {
      // All sets done → move to next exercise
      setCompletedSets((prev) => ({ ...prev, [key]: 0 }));
      if (currentIdx < totalExercises - 1) {
        if (current.rest > 0) {
          setRestSeconds(current.rest);
          setIsResting(true);
        }
        setCurrentIdx((prev) => prev + 1);
      }
    } else {
      // More sets to do
      setCompletedSets((prev) => ({ ...prev, [key]: currentCompleted + 1 }));
      if (current.rest > 0) {
        setRestSeconds(current.rest);
        setIsResting(true);
      }
    }
  };

  const skipExercise = () => {
    if (currentIdx < totalExercises - 1) {
      setCompletedSets((prev) => ({ ...prev, [current?.id || ""]: 0 }));
      setCurrentIdx((prev) => prev + 1);
      setIsResting(false);
    }
  };

  const goBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
      setIsResting(false);
    }
  };

  const saveRecord = () => {
    try {
      const records = JSON.parse(localStorage.getItem("workout_records") || "[]");
      records.unshift({
        date: new Date().toISOString(),
        planId: planId || "unknown",
        exercisesCompleted: currentIdx + 1,
        totalExercises,
        duration: Math.round((Date.now() - (startTimeRef.current || Date.now())) / 60000),
      });
      localStorage.setItem("workout_records", JSON.stringify(records.slice(0, 50)));
    } catch {}
  };

  const startTimeRef = useRef<number>(Date.now());

  // All done
  if (currentIdx >= totalExercises) {
    saveRecord();
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#121212] p-8">
        <CheckCircle2 className="w-20 h-20 text-[#d92525] mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">训练完成！🎉</h1>
        <p className="text-gray-400 text-sm mb-8">共完成 {totalExercises} 项训练</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          <button onClick={onClose}
            className="py-4 bg-[#d92525] text-white font-bold rounded-xl text-sm">
            返回方案
          </button>
          <button onClick={() => { setCurrentIdx(0); setCompletedSets({}); }}
            className="py-4 bg-[#1e1e1e] border border-[#333] text-white font-bold rounded-xl text-sm">
            再来一轮
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const totalSets = parseInt(current.sets) || 1;
  const doneSets = completedSets[current.id] || 0;

  // Rest overlay
  if (isResting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#121212]">
        <p className="text-gray-400 text-sm mb-2">休息一下</p>
        <div className="w-32 h-32 rounded-full border-4 border-[#d92525]/30 flex items-center justify-center mb-4"
          style={{ borderTopColor: "#d92525", animation: "spin 1s linear infinite" }}>
          <span className="text-4xl font-bold text-white">{restSeconds}</span>
        </div>
        <p className="text-[#d92525] text-sm font-bold">下一项：{exercises[currentIdx]?.name}</p>
        <button onClick={() => { setIsResting(false); setRestSeconds(0); }}
          className="mt-6 px-6 py-3 bg-[#1e1e1e] border border-[#333] text-white rounded-xl text-sm">
          跳过休息
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#121212] safe-area-inset">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button onClick={() => { saveRecord(); onClose(); }} className="p-2 text-gray-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 mx-4">
          <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
            <div className="h-full bg-[#d92525] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[10px] text-gray-500 text-center mt-1">{currentIdx + 1}/{totalExercises}</p>
        </div>
        <span className="text-[10px] text-gray-600">{current.section}</span>
      </div>

      {/* Main exercise card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Section label */}
        <p className="text-xs text-[#d92525] font-bold uppercase tracking-wider mb-4">{current.section}</p>

        {/* Exercise name — BIG */}
        <h1 className="text-3xl sm:text-4xl font-black text-white text-center mb-8 leading-tight">
          {current.name}
        </h1>

        {/* Sets/Reps badge */}
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-bold text-white">{current.sets}</p>
            <p className="text-[10px] text-gray-500">组数</p>
          </div>
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-bold text-white">{current.reps}</p>
            <p className="text-[10px] text-gray-500">次数</p>
          </div>
          {current.rest > 0 && (
            <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl px-5 py-3 text-center">
              <p className="text-2xl font-bold text-white">{current.rest}s</p>
              <p className="text-[10px] text-gray-500">间歇</p>
            </div>
          )}
        </div>

        {/* Set progress dots */}
        <div className="flex gap-2 mb-10">
          {Array.from({ length: totalSets }, (_, i) => (
            <div key={i}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition ${
                i < doneSets
                  ? "bg-[#d92525] border-[#d92525] text-white"
                  : "border-[#333] text-gray-600"
              }`}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Complete Set button — BIG */}
        <button onClick={completeSet}
          className="w-full max-w-sm py-5 bg-[#d92525] text-white font-black rounded-2xl text-xl active:scale-95 transition-transform touch-manipulation mb-3"
          style={{ minHeight: 64 }}>
          {doneSets + 1 >= totalSets ? "✅ 完成最后一组" : `完成第 ${doneSets + 1} 组`}
        </button>

        {/* Secondary actions */}
        <div className="flex gap-4 mt-2">
          {currentIdx > 0 && (
            <button onClick={goBack}
              className="px-4 py-3 bg-[#1e1e1e] border border-[#333] text-gray-400 rounded-xl flex items-center gap-1 text-sm active:scale-95 transition">
              <ChevronLeft className="w-4 h-4" />上一项
            </button>
          )}
          <button onClick={skipExercise}
            className="px-4 py-3 bg-[#1e1e1e] border border-[#333] text-gray-400 rounded-xl flex items-center gap-1 text-sm active:scale-95 transition">
            跳过 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Vibration feedback on mount */}
      {typeof navigator !== "undefined" && (navigator as any).vibrate && (
        <div className="hidden" ref={() => { (navigator as any).vibrate?.(10); }} />
      )}
    </div>
  );
}
