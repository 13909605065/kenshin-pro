"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string; // default: router.back()
}

export function BackHeader({ title, subtitle, backTo }: BackHeaderProps) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-10 bg-[#111]/95 backdrop-blur border-b border-[#222]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => backTo ? router.push(backTo) : router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#333] text-gray-400 hover:text-white hover:border-[#555] transition shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
