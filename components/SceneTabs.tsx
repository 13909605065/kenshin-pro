"use client";

import { useScene } from "@/components/providers/SceneProvider";
import type { Scene } from "@/lib/scene-types";
import { ATHLETE_SCENES } from "@/lib/scene-types";

/* Coach: no tabs — one page does everything.
   Athlete: 球场 / 健身房 */

export function SceneTabs() {
  const { role, scene, setScene } = useScene();

  // Coach doesn't need scene tabs at all
  if (role === "coach") return null;

  const scenes = ATHLETE_SCENES;
  return (
    <div className="flex gap-0.5 bg-[#111] rounded-lg p-0.5">
      {scenes.map((s) => (
        <button key={s.id} onClick={() => setScene(s.id as Scene)}
          className={"flex-1 py-1.5 rounded-md text-[10px] font-medium " + (scene===s.id ? "bg-[#222] text-white" : "text-gray-500 hover:text-gray-300")}>
          {s.icon}{s.label}
        </button>
      ))}
    </div>
  );
}
