"use client";

import React from "react";

interface DayTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function DayTab({ label, active, onClick }: DayTabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition-colors cursor-pointer ${
        active
          ? "bg-[#58a6ff] text-white border-[#58a6ff]"
          : "bg-[#1a1f2e] border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]"
      }`}
    >
      {label}
    </button>
  );
}
