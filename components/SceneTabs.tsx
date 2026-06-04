"use client";

import { useScene } from "@/components/providers/SceneProvider";
import { useRouter } from "next/navigation";
import { MapPin, Dumbbell } from "lucide-react";

/* Coach: no scene tabs needed.
   Athlete: 球场 / 健身房 — clean toggle cards */

export function SceneTabs() {
  const { role, scene, setScene } = useScene();
  const router = useRouter();

  if (role === "coach") return null;

  return (
    <div className="flex gap-3">
      {/* 球场训练 */}
      <button
        onClick={() => setScene("pitch")}
        className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
          scene === "pitch"
            ? "bg-[#d92525]/10 border-[#d92525]/40 shadow-lg shadow-[#d92525]/5"
            : "bg-[#1e1e1e] border-[#333] hover:border-[#555]"
        }`}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition ${
            scene === "pitch" ? "bg-[#d92525] text-white" : "bg-[#111] text-gray-400"
          }`}
        >
          <MapPin className="w-4.5 h-4.5" />
        </div>
        <div className="text-left">
          <p
            className={`text-sm font-bold transition ${
              scene === "pitch" ? "text-[#d92525]" : "text-white"
            }`}
          >
            球场训练
          </p>
          <p className="text-[10px] text-gray-500">AI 生成个性化方案</p>
        </div>
      </button>

      {/* 健身房 */}
      <button
        onClick={() => router.push("/gym")}
        className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[#333] bg-[#1e1e1e] hover:border-[#555] transition-all"
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#111] text-gray-400">
          <Dumbbell className="w-4.5 h-4.5" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-white">健身房</p>
          <p className="text-[10px] text-gray-500">动作库 + 力量训练</p>
        </div>
      </button>
    </div>
  );
}
