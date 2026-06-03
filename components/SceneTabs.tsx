"use client";

import { useScene } from "@/components/providers/SceneProvider";
import type { Role, Scene } from "@/lib/scene-types";
import { COACH_SCENES, ATHLETE_SCENES } from "@/lib/scene-types";

export function SceneTabs() {
  const { role, setRole, scene, setScene } = useScene();

  const scenes = role === "coach" ? COACH_SCENES : ATHLETE_SCENES;

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

      {/* Scene tabs */}
      <div className="flex gap-1 bg-[#111] rounded-xl p-1">
        {scenes.map((s) => (
          <button
            key={s.id}
            onClick={() => setScene(s.id as Scene)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              scene === s.id
                ? "bg-[#222] text-white border border-[#333]"
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
