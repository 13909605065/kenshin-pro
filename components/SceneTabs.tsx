"use client";

import { useScene } from "@/components/providers/SceneProvider";
import type { Role, Scene } from "@/lib/scene-types";
import { COACH_SCENES, ATHLETE_SCENES } from "@/lib/scene-types";

const SCENE_COLORS: Record<string, string> = {
  pitch: "bg-green-500",
  gym: "bg-orange-500",
  review: "bg-blue-500",
};

const SCENE_BORDERS: Record<string, string> = {
  pitch: "border-green-500/30 shadow-green-500/10",
  gym: "border-orange-500/30 shadow-orange-500/10",
  review: "border-blue-500/30 shadow-blue-500/10",
};

const SCENE_ACTIVE_TEXT: Record<string, string> = {
  pitch: "text-green-400",
  gym: "text-orange-400",
  review: "text-blue-400",
};

export function SceneTabs() {
  const { role, setRole, scene, setScene } = useScene();

  const scenes = role === "coach" ? COACH_SCENES : ATHLETE_SCENES;

  const indicatorColor = SCENE_COLORS[scene] || "bg-[#333]";
  const borderStyle = SCENE_BORDERS[scene] || "border-[#333] shadow-transparent";
  const activeTextColor = SCENE_ACTIVE_TEXT[scene] || "";

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

      {/* Scene indicator bar */}
      <div className={`h-1 rounded-full transition-colors duration-300 ${indicatorColor}`} />

      {/* Scene tabs */}
      <div
        className={`flex gap-1 bg-[#111] rounded-xl p-1 border transition-all duration-300 shadow-lg ${borderStyle}`}
      >
        {scenes.map((s) => (
          <button
            key={s.id}
            onClick={() => setScene(s.id as Scene)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              scene === s.id
                ? `bg-[#222] text-white border border-[#333] ${SCENE_COLORS[s.id] ? "border-b-2 " + SCENE_BORDERS[s.id].split(" ")[0] : ""}`
                : "text-gray-500 hover:text-gray-300"
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
