"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useScene } from "@/components/providers/SceneProvider";
import { useLang } from "@/components/providers/LanguageProvider";
import { MobileNav } from "@/components/MobileNav";
import { useWizard } from "@/hooks/useWizard";
import { usePlanHistory } from "@/hooks/usePlanHistory";
import { Zap, Dumbbell, History, Clock, ArrowLeft } from "lucide-react";

export default function GymPage() {
  const router = useRouter();
  const { role, setScene } = useScene();
  const { t } = useLang();
  const wizard = useWizard();
  const planHistory = usePlanHistory();
  const { formData } = wizard;
  const isCoach = role === "coach";

  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [workoutRecords, setWorkoutRecords] = useState<any[]>([]);

  useEffect(() => {
    setScene("gym");
    setRecentPlans(planHistory.getPlansByRole(role).slice(0, 5));
    try { setWorkoutRecords(JSON.parse(localStorage.getItem("workout_records") || "[]").slice(0, 10)); } catch {}
  }, []);

  const age = formData.age || 25;
  const weight = formData.weight || 70;
  const height = formData.height || 175;
  const bmi = weight / ((height / 100) ** 2);
  const years = formData.years || 1;
  const goal = formData.goal || "strength";
  const phase = formData.phase || "preseason";
  const isU18 = age < 18;
  const isO35 = age > 35;
  const hasInjury = (formData.injurySites || []).length > 0;

  let trainRec = "";
  if (goal === "strength") trainRec = `${isU18 ? "中低" : "中高"}强度力量训练，${phase === "preseason" ? "基础力量打底" : "维持已有水平"}。3-4个复合动作，组间${isU18 ? "2-3min" : "2min"}。`;
  else if (goal === "power") trainRec = `爆发力训练日。奥举衍生+跳跃类，${isU18 ? "中等重量控速" : "低次数高速度"}，充分动态热身。`;
  else trainRec = `全身力量维持。${isU18 ? "动作质量优先" : "根据感觉调整强度"}。`;
  if (hasInjury) trainRec += " 避开伤病部位，无痛范围训练。";

  let bodyNote = "";
  if (bmi < 18.5) bodyNote = `BMI ${bmi.toFixed(1)}偏瘦，建议增肌，蛋白2.0g/kg。`;
  else if (bmi >= 25) bodyNote = `BMI ${bmi.toFixed(1)}偏高，如体脂高需增加有氧，关节保护优先闭链动作。`;
  if (isU18) bodyNote += " 未成年，禁止>85%1RM，专注动作技术。";
  if (isO35) bodyNote += " 热身10min以上，关注关节活动度。";

  const dietRec = `训练后30min内: 蛋白${Math.round(weight * 0.4)}g + 碳水${Math.round(weight * 0.8)}g。全天蛋白${Math.round(weight * 1.6)}g。${hasInjury ? "伤病恢复期，蛋白增至" + Math.round(weight * 2.0) + "g/天。" : ""}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      <div className="bg-[#0a0a0a] border-b border-[#333] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">健身房</h1>
        <div className="ml-auto"><span className="px-3 py-1.5 rounded-md text-xs font-bold bg-neon-pink text-black">{isCoach ? "教练" : "球员"}</span></div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neon-pink/20 flex items-center justify-center text-lg font-bold text-neon-pink flex-shrink-0">{formData.name?.charAt(0) || "A"}</div>
          <div>
            <p className="text-base font-bold text-white">{formData.name || "健身者"}<span className="text-[11px] text-gray-500 ml-2 font-normal">{formData.position ? t("pos." + formData.position) : ""}</span></p>
            <p className="text-[11px] text-gray-500">{age}岁 · {height}cm · {weight}kg · {years}年</p>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-neon-pink/20 rounded-xl p-5 space-y-4">
          <p className="text-xs text-neon-pink font-bold uppercase tracking-wide">今日训练建议</p>
          <div><p className="text-[10px] text-gray-500 mb-1">训练方向</p><p className="text-sm text-gray-200 leading-relaxed">{trainRec}</p></div>
          {bodyNote ? <div><p className="text-[10px] text-gray-500 mb-1">身体状况</p><p className="text-sm text-gray-200 leading-relaxed">{bodyNote}</p></div> : null}
          {hasInjury ? <div><p className="text-[10px] text-red-400 mb-1">伤病提醒</p><p className="text-sm text-red-300 leading-relaxed">检测到伤病部位，训练时避开直接负重，以康复性训练为主。如有不适立即停止。</p></div> : null}
          <div><p className="text-[10px] text-gray-500 mb-1">营养建议</p><p className="text-sm text-gray-200 leading-relaxed">{dietRec}</p></div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="text-center bg-[#111] rounded-lg p-2"><p className="text-neon-pink font-bold text-lg">{age}</p><p className="text-[10px] text-gray-500">年龄</p></div>
            <div className="text-center bg-[#111] rounded-lg p-2"><p className="text-neon-pink font-bold text-lg">{bmi.toFixed(1)}</p><p className="text-[10px] text-gray-500">BMI</p></div>
            <div className="text-center bg-[#111] rounded-lg p-2"><p className="text-neon-pink font-bold text-lg">{years}年</p><p className="text-[10px] text-gray-500">训练年限</p></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => router.push("/")} className="bg-neon-pink text-black font-bold py-5 rounded-xl text-base flex flex-col items-center gap-2 shadow-lg shadow-neon-pink/20"><Zap className="w-6 h-6" />智能推荐训练</button>
          <button onClick={() => router.push("/exercises")} className="bg-[#1a1a1a] border border-[#444] text-white font-bold py-5 rounded-xl text-base flex flex-col items-center gap-2 hover:bg-[#222]"><Dumbbell className="w-6 h-6" />自由选择动作</button>
        </div>

        {workoutRecords.length > 0 ? (
          <div>
            <h2 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" />最近训练</h2>
            <div className="space-y-2">
              {workoutRecords.slice(0, 5).map((r: any, i: number) => (
                <div key={i} className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 flex items-center justify-between">
                  <div><p className="text-xs text-gray-300">{r.stepsCompleted}项</p><p className="text-[10px] text-gray-600">{new Date(r.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                  <span className="text-xs text-neon-pink font-bold">{Math.floor(r.totalDuration / 60)}min</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {recentPlans.length > 0 ? (
          <div>
            <h2 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2"><History className="w-4 h-4" />最近方案</h2>
            <div className="space-y-2">
              {recentPlans.slice(0, 3).map((p: any) => (
                <button key={p.id} onClick={() => router.push("/")} className="w-full bg-[#1a1a1a] border border-[#333] hover:border-neon-pink/30 rounded-lg px-4 py-3 text-left transition">
                  <p className="text-sm text-white font-medium">{p.playerName}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{p.modules.length}模块 · {new Date(p.createdAt).toLocaleDateString("zh-CN")}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <MobileNav />
    </div>
  );
}
