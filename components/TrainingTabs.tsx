"use client";

import { useState, useRef, useCallback } from "react";
import { TrainingModule, PlayerFormData } from "@/lib/types";
import { POSITION_LABELS, GOAL_LABELS, PHASE_LABELS } from "@/lib/constants";
import { WarmupTab } from "./tabs/WarmupTab";
import { TechniqueTab } from "./tabs/TechniqueTab";
import { PhysicalTab } from "./tabs/PhysicalTab";
import { TacticalTab } from "./tabs/TacticalTab";
import { NutritionTab } from "./tabs/NutritionTab";
import { ActionBar } from "./ActionBar";

interface Props {
  modules: TrainingModule[];
  formData: PlayerFormData;
  planId: string | null;
  onSaveTemplate?: () => void;
}

const TABS = [
  { id: "warmup" as const, label: "热身" },
  { id: "technique" as const, label: "技术训练" },
  { id: "physical" as const, label: "体能训练" },
  { id: "tactical" as const, label: "战术要点" },
  { id: "nutrition" as const, label: "饮食与恢复" },
];

type TabId = typeof TABS[number]["id"];

export function TrainingTabs({ modules, formData, planId, onSaveTemplate }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("warmup");
  const touchStartX = useRef(0);
  const isCoach = formData.role === "coach";

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;

    const currentIdx = TABS.findIndex((t) => t.id === activeTab);
    if (diff > 0 && currentIdx < TABS.length - 1) {
      setActiveTab(TABS[currentIdx + 1].id);
    } else if (diff < 0 && currentIdx > 0) {
      setActiveTab(TABS[currentIdx - 1].id);
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col min-h-[70vh]">
      {/* Top: Player Summary Card (fixed) */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neon-pink/20 flex items-center justify-center">
            <span className="text-neon-pink font-bold text-sm">
              {isCoach ? "教" : (formData.position ? POSITION_LABELS[formData.position][0] : "?" )}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">
              {isCoach
                ? "教练方案"
                : (formData.position ? POSITION_LABELS[formData.position] : "球员方案")
              }
            </p>
            {!isCoach && (
              <p className="text-xs text-gray-400 truncate">
                {formData.age ?? "?"}岁 · {formData.height ?? "?"}cm · {formData.weight ?? "?"}kg
                {formData.goal && ` · ${GOAL_LABELS[formData.goal]}`}
                {formData.phase && ` · ${PHASE_LABELS[formData.phase]}`}
              </p>
            )}
            {isCoach && (
              <p className="text-xs text-gray-400 truncate">
                {formData.tacticalThemes.length > 0
                  ? `战术主题: ${formData.tacticalThemes.length}个`
                  : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Tab Bar */}
      <div className="flex overflow-x-auto border-b border-pitch-700 mb-4 -mx-1 px-1 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "border-neon-pink text-neon-pink"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area (swipeable) */}
      <div
        className="flex-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeTab === "warmup" && (
          <WarmupTab modules={modules} position={formData.position} />
        )}
        {activeTab === "technique" && (
          <TechniqueTab modules={modules} />
        )}
        {activeTab === "physical" && (
          <PhysicalTab modules={modules} position={formData.position} />
        )}
        {activeTab === "tactical" && (
          <TacticalTab modules={modules} />
        )}
        {activeTab === "nutrition" && (
          <NutritionTab modules={modules} />
        )}
      </div>

      {/* Bottom: Fixed Action Bar */}
      <div className="sticky bottom-0 bg-pitch-900/95 backdrop-blur pt-4 border-t border-pitch-700 mt-4">
        <ActionBar
          modules={modules}
          formData={formData}
          planId={planId}
          onSaveTemplate={onSaveTemplate}
        />
      </div>
    </div>
  );
}
