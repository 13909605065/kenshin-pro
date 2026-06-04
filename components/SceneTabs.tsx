"use client";

import { useScene } from "@/components/providers/SceneProvider";
import { useRouter } from "next/navigation";
import { MapPin, Dumbbell, Heart } from "lucide-react";

/* Scene tabs: 场地训练 / 体能房 / 伤病防控 — 四大板块场景选择 */

export function SceneTabs() {
  const { role, scene, setScene } = useScene();
  const router = useRouter();

  if (role === "coach") return null;

  return (
    <div className="flex gap-2">
      {/* ⚽ 场地训练 — green accent */}
      <button
        onClick={() => setScene("pitch")}
        className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-xl border transition-all ${
          scene === "pitch"
            ? "bg-[#22c55e]/10 border-[#22c55e]/40 shadow-lg shadow-[#22c55e]/5"
            : "bg-[#1e1e1e] border-[#333] hover:border-[#555]"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition ${
            scene === "pitch" ? "bg-[#22c55e] text-white" : "bg-[#111] text-gray-400"
          }`}
        >
          <MapPin className="w-4 h-4" />
        </div>
        <div className="text-left min-w-0">
          <p className={`text-xs font-bold transition truncate ${scene === "pitch" ? "text-[#22c55e]" : "text-white"}`}>
            场地训练
          </p>
          <p className="text-[10px] text-gray-400 truncate">板块二·球场</p>
        </div>
      </button>

      {/* 🏋️ 体能房 — red accent (brand) */}
      <button
        onClick={() => setScene("gym")}
        className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-xl border transition-all ${
          scene === "gym"
            ? "bg-[#d92525]/10 border-[#d92525]/40 shadow-lg shadow-[#d92525]/5"
            : "bg-[#1e1e1e] border-[#333] hover:border-[#555]"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition ${
            scene === "gym" ? "bg-[#d92525] text-white" : "bg-[#111] text-gray-400"
          }`}
        >
          <Dumbbell className="w-4 h-4" />
        </div>
        <div className="text-left min-w-0">
          <p className={`text-xs font-bold transition truncate ${scene === "gym" ? "text-[#d92525]" : "text-white"}`}>
            体能房
          </p>
          <p className="text-[10px] text-gray-400 truncate">板块三·力量</p>
        </div>
      </button>

      {/* 🩺 伤病防控 — amber accent */}
      <button
        onClick={() => setScene("rehab")}
        className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-xl border transition-all ${
          scene === "rehab"
            ? "bg-[#f59e0b]/10 border-[#f59e0b]/40 shadow-lg shadow-[#f59e0b]/5"
            : "bg-[#1e1e1e] border-[#333] hover:border-[#555]"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition ${
            scene === "rehab" ? "bg-[#f59e0b] text-white" : "bg-[#111] text-gray-400"
          }`}
        >
          <Heart className="w-4 h-4" />
        </div>
        <div className="text-left min-w-0">
          <p className={`text-xs font-bold transition truncate ${scene === "rehab" ? "text-[#f59e0b]" : "text-white"}`}>
            伤病防控
          </p>
          <p className="text-[10px] text-gray-400 truncate">板块四·康复</p>
        </div>
      </button>
    </div>
  );
}
