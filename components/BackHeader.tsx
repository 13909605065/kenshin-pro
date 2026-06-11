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
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#992828]/20 border border-[#992828]/40 text-[#992828] hover:bg-[#992828]/40 hover:text-white transition shrink-0"
          aria-label="返回"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-white">{title}</h1>
          {subtitle && <p className="text-[10px] text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
