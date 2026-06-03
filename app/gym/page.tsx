"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useScene } from "@/components/providers/SceneProvider";
import { useLang } from "@/components/providers/LanguageProvider";
import { MobileNav } from "@/components/MobileNav";
import { useWizard } from "@/hooks/useWizard";
import { usePlanHistory } from "@/hooks/usePlanHistory";
import { getPlayers } from "@/lib/roster-utils";
import { Zap, Dumbbell, History, Clock, ArrowLeft } from "lucide-react";

export default function GymPage() {
  const router = useRouter();
  const { role, scene, setScene } = useScene();
  const { t } = useLang();
  const wizard = useWizard();
  const planHistory = usePlanHistory();
  const { formData } = wizard;

  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [workoutRecords, setWorkoutRecords] = useState<any[]>([]);

  useEffect(() => {
    setScene("gym");
    const plans = planHistory.getPlansByRole(role);
    setRecentPlans(plans.slice(0, 5));
    try {
      const records = JSON.parse(localStorage.getItem("workout_records") || "[]");
      setWorkoutRecords(records.slice(0, 10));
    } catch {}
  }, []);

  const isCoach = role === "coach";

  const goGenerate = () => {
    if (isCoach) {
      router.push("/?scene=planning");
    } else {
      router.push("/?scene=gym&generate=1");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-[#333] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5"/></button>
        <h1 className="text-lg font-bold">健身房</h1>
        <div className="ml-auto flex bg-[#111] rounded-lg p-0.5">
          <button onClick={() => router.push("/")}
            className="px-3 py-1.5 rounded-md text-xs font-bold bg-neon-pink text-black">
            {isCoach ? "教练" : "球员"}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile */}
        <div className="flex items-center gap-4 p-4">
          <div className="w-16 h-16 rounded-full bg-neon-pink/20 flex items-center justify-center text-2xl font-bold text-neon-pink flex-shrink-0">
            {formData.name?.charAt(0) || (isCoach ? "C" : "A")}
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-white truncate">{formData.name || "健身者"}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {!isCoach && formData.position && <span className="text-xs text-gray-400">{t("pos." + formData.position)}</span>}
              {formData.age && <span className="text-xs text-gray-400">{formData.age}岁</span>}
              {formData.height && <span className="text-xs text-gray-400">{formData.height}cm</span>}
              {formData.weight && <span className="text-xs text-gray-400">{formData.weight}kg</span>}
              {isCoach && <span className="text-xs text-gray-400">力量教练</span>}
              {formData.goal && <span className="text-xs text-neon-pink font-bold">{t("goal." + formData.goal)}</span>}
            </div>
          </div>
        </div>

        {/* Suggestion */}
        <div className="bg-[#1a1a1a] border border-neon-pink/20 rounded-xl p-5">
          <p className="text-xs text-neon-pink font-bold mb-2 uppercase tracking-wide">今日推荐</p>
          <p className="text-base text-gray-200 leading-relaxed">
            {!isCoach && formData.goal === "strength" ? "下肢爆发力 + 核心稳定。力量期建议3-4个复合动作，组间2min。" :
             !isCoach && formData.goal === "power" ? "爆发力训练日。奥举+跳跃类，低次数高速度，充分热身。" :
             !isCoach && formData.goal === "speed" ? "速度力量转换。轻中重量快速完成，配合灵敏训练。" :
             !isCoach && formData.phase === "preseason" ? "季前准备期。基础力量打底，每周3次，逐周加重。" :
             "力量维持+专项转化。保持已有力量水平，结合运动专项需求。"}
          </p>
        </div>

        {/* Main actions */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={goGenerate}
            className="bg-neon-pink text-black font-bold py-5 rounded-xl text-base flex flex-col items-center gap-2 shadow-lg shadow-neon-pink/20">
            <Zap className="w-6 h-6"/> 智能推荐训练
          </button>
          <button onClick={() => router.push("/exercises")}
            className="bg-[#1a1a1a] border border-[#444] text-white font-bold py-5 rounded-xl text-base flex flex-col items-center gap-2 hover:bg-[#222]">
            <Dumbbell className="w-6 h-6"/> 自由选择动作
          </button>
        </div>

        {/* Recent workouts */}
        {workoutRecords.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4"/> 最近训练
            </h2>
            <div className="space-y-2">
              {workoutRecords.slice(0, 5).map((r, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-300">{r.stepsCompleted}项完成</p>
                    <p className="text-[10px] text-gray-600">{new Date(r.date).toLocaleDateString("zh-CN", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
                  </div>
                  <span className="text-xs text-neon-pink font-bold">{Math.floor(r.totalDuration/60)}min</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent plans */}
        {recentPlans.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
              <History className="w-4 h-4"/> 最近方案
            </h2>
            <div className="space-y-2">
              {recentPlans.slice(0, 3).map((p) => (
                <button key={p.id} onClick={() => router.push("/")}
                  className="w-full bg-[#1a1a1a] border border-[#333] hover:border-neon-pink/30 rounded-lg px-4 py-3 text-left transition">
                  <p className="text-sm text-white font-medium">{p.playerName}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{p.modules.length}模块 · {new Date(p.createdAt).toLocaleDateString("zh-CN")}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <MobileNav/>
    </div>
  );
}
