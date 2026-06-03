"use client";

import { useScene } from "@/components/providers/SceneProvider";
import type { Role, Scene } from "@/lib/scene-types";
import { COACH_SCENES, ATHLETE_SCENES } from "@/lib/scene-types";

/** Indicator bar color above the scene tabs */
const SCENE_INDICATOR: Record<string, string> = {
  pitch: "bg-green-500",
  gym: "bg-orange-500",
  review: "bg-blue-500",
};

/** Container border + shadow glow for the active scene */
const SCENE_GLOW: Record<string, string> = {
  pitch: "border-green-500/30 shadow-green-500/10",
  gym: "border-orange-500/30 shadow-orange-500/10",
  review: "border-blue-500/30 shadow-blue-500/10",
};

/** Bottom border color on the active tab button */
const SCENE_TAB_ACCENT: Record<string, string> = {
  pitch: "border-b-green-500",
  gym: "border-b-orange-500",
  review: "border-b-blue-500",
};

export function SceneTabs() {
  const { role, setRole, scene, setScene } = useScene();

  const scenes = role === "coach" ? COACH_SCENES : ATHLETE_SCENES;

  const indicator = SCENE_INDICATOR[scene] || "bg-[#333]";
  const glow = SCENE_GLOW[scene] || "border-[#333] shadow-transparent";
  const tabAccent = SCENE_TAB_ACCENT[scene] || "";

  return (
    <div className="space-y-2">
      {/* Role toggle */}
      <div className="flex gap-1 bg-[#111] rounded-xl p-1">
        {(["coach", "athlete"] as Role[]).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              role === r
                ? "bg-neon-pink text-black shadow-lg shadow-neon-pink/20"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {r === "coach" ? "👔 教练" : "👤 运动员"}
          </button>
        ))}
      </div>

      {/* Scene indicator bar — green/orange/blue based on active scene */}
      <div className={`h-1 rounded-full transition-colors duration-300 ${indicator}`} />

      {/* Scene tabs with scene-colored border glow */}
      <div
        className={`flex gap-1 bg-[#111] rounded-xl p-1 border transition-all duration-300 shadow-lg ${glow}`}
      >
        {scenes.map((s) => (
          <button
            key={s.id}
            onClick={() => setScene(s.id as Scene)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border-b-2 ${
              scene === s.id
                ? `bg-[#222] text-white border border-[#333] ${tabAccent}`
                : "text-gray-500 hover:text-gray-300 border-b-transparent"
            }`}
          >
            <span className="mr-1">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
