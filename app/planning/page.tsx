"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Zap, Loader2, ChevronRight } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { MICROCYCLE_TEMPLATES, type MicrocycleRef } from "@/lib/training-library";

interface PeriodDef {
  id: string;
  name: string;
  description: string;
  focus: string;
  icon: string;
  microcycleId: string;
}

const PERIODS: PeriodDef[] = [
  {
    id: "preseason",
    name: "季前储备",
    description: "赛季前6-8周，建立有氧基础与力量储备，逐步提升训练负荷",
    focus: "有氧耐力基础 + 最大力量 + 基础技术复习 + FIFA 11+ 损伤预防",
    icon: "🏋️",
    microcycleId: "microcycle-1game",
  },
  {
    id: "competition",
    name: "赛中维持",
    description: "赛季进行中，维持竞技状态，围绕比赛日安排训练节奏",
    focus: "爆发力/速度维持 + 战术磨合 + 恢复优先 + 负荷管理(ACWR)",
    icon: "⚽",
    microcycleId: "microcycle-1game",
  },
  {
    id: "recovery",
    name: "赛后恢复",
    description: "赛季末或密集赛程后，主动恢复、损伤修复、心理放松",
    focus: "主动恢复(泳池/单车) + 软组织放松 + 轻技术 + 心理恢复",
    icon: "🧊",
    microcycleId: "microcycle-2game",
  },
  {
    id: "offseason",
    name: "休赛补强",
    description: "休赛期8-12周，针对短板补强、身体重塑、为新赛季储备",
    focus: "肌肉量/力量增长 + 速度/敏捷提升 + 个人技术打磨 + 伤病康复",
    icon: "💪",
    microcycleId: "microcycle-1game",
  },
];

export default function PlanningPage() {
  const router = useRouter();
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<MicrocycleRef | null>(null);

  const handleGenerate = async (period: PeriodDef) => {
    setGenerating(period.id);
    setGenerated(null);
    setPlanResult(null);

    // Simulate AI generation delay, then resolve from local microcycle templates
    // In production this would call /api/generate with coach role + period context
    await new Promise((r) => setTimeout(r, 800));

    const template = MICROCYCLE_TEMPLATES[period.microcycleId];
    if (template) {
      setPlanResult(template);
      setGenerated(period.id);
    }
    setGenerating(null);
  };

  return (
    <div className="min-h-screen bg-[#121212] p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/")}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">训练周期规划</h1>
        <span className="text-xs text-gray-400">按周/月规划整队周期训练</span>
      </div>

      {/* Period Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {PERIODS.map((period) => (
          <div
            key={period.id}
            className="bg-[#1e1e1e] rounded-xl border border-[#222]/50 hover:border-[#d92525]/40 transition-all group"
          >
            <div className="p-4">
              {/* Period header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{period.icon}</span>
                <h2 className="text-white font-bold text-base">{period.name}</h2>
              </div>

              {/* Description */}
              <p className="text-gray-400 text-xs mb-3 leading-relaxed">
                {period.description}
              </p>

              {/* Focus */}
              <div className="bg-[#121212] rounded-lg p-3 mb-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
                  训练重点
                </p>
                <p className="text-gray-300 text-xs leading-relaxed">
                  {period.focus}
                </p>
              </div>

              {/* Generate button */}
              <button
                onClick={() => handleGenerate(period)}
                disabled={generating === period.id}
                className="w-full py-2.5 bg-[#d92525] hover:bg-[#d92525]/90 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating === period.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    一键生成周期计划
                  </>
                )}
              </button>
            </div>

            {/* Generated result */}
            {generated === period.id && planResult && (
              <div className="border-t border-[#222] p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[#d92525] text-sm font-bold">
                    已生成：{planResult.label}
                  </h3>
                  <span className="text-[10px] text-gray-500">
                    比赛日 {planResult.match_day}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mb-3">
                  {planResult.description}
                </p>
                <div className="space-y-1.5">
                  {planResult.days.map((day, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-[#121212] rounded-lg px-3 py-2"
                    >
                      <span className="text-[10px] text-white font-medium w-16 shrink-0">
                        {day.day}
                      </span>
                      <span className="text-xs text-gray-400 truncate flex-1">
                        {day.focus}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          day.intensity === "极高" || day.intensity === "高"
                            ? "bg-[#d92525]/20 text-[#d92525]"
                            : day.intensity === "中" || day.intensity === "中高" || day.intensity === "中低"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-green-500/10 text-green-400"
                        }`}
                      >
                        {day.intensity}
                      </span>
                      <span className="text-[10px] text-gray-500 w-8 text-right">
                        {day.duration}&apos;
                      </span>
                    </div>
                  ))}
                </div>

                {/* Quick link to generate full plan on home */}
                <button
                  onClick={() => router.push("/")}
                  className="mt-3 w-full py-2 bg-[#121212] hover:bg-[#222] text-gray-300 rounded-lg text-xs flex items-center justify-center gap-1 transition"
                >
                  返回首页生成完整训练方案
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <MobileNav />
    </div>
  );
}
