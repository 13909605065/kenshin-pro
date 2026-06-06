"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { GymDesigner } from "@/components/GymDesigner";

export default function GymPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#121212]">
      <header className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <a href="/" className="text-[#992828] font-black text-sm" style={{ letterSpacing: "-0.5px" }}>
            KENSHIN<span className="text-[#d1d1d1] font-light">PRO</span>
          </a>
          <span className="text-gray-400 text-xs hidden sm:inline">/</span>
          <span className="text-white text-sm font-semibold flex items-center gap-1.5">
            <Dumbbell className="w-4 h-4 text-[#992828]" />
            力量房
          </span>
        </div>
      </header>
      <GymDesigner />
    </div>
  );
}
