"use client";

import { useScene } from "@/components/providers/SceneProvider";
import type { Role, Scene } from "@/lib/scene-types";
import { COACH_SCENES, ATHLETE_SCENES } from "@/lib/scene-types";

export function SceneTabs() {
  const { role, setRole, scene, setScene } = useScene();
  const scenes = role === "coach" ? COACH_SCENES : ATHLETE_SCENES;

  return (
    <div className="space-y-1">
      {/* Role + scenes in one compact row */}
      <div className="flex gap-0.5 bg-[#111] rounded-lg p-0.5">
        {(["coach", "athlete"] as Role[]).map((r) => (
          <button key={r} onClick={() => setRole(r)}
            className={"flex-1 py-1 rounded-md text-[11px] font-bold " + (role===r ? "bg-neon-pink text-black" : "text-gray-500 hover:text-gray-300")}>
            {r==="coach"?"教练":"运动员"}
          </button>
        ))}
      </div>
      {/* Scene tabs */}
      <div className="flex gap-0.5 bg-[#111] rounded-lg p-0.5">
        {scenes.map((s) => (
          <button key={s.id} onClick={() => setScene(s.id as Scene)}
            className={"flex-1 py-1 rounded-md text-[10px] font-medium border-b-2 " + (scene===s.id ? "bg-[#222] text-white border-[#333] " + (IND[s.id] ? "border-"+IND[s.id].split("-")[1]+"-500" : "") : "text-gray-500 border-transparent")}>
            {s.icon}{s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
