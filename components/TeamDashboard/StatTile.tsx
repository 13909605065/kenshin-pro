"use client";

import React from "react";

interface StatTileProps {
  label: string;
  value: string | number;
  color?: "green" | "amber" | "red" | "default";
  sub?: string;
}

const colorMap = {
  green: "text-[#2ea043]",
  amber: "text-[#d29922]",
  red: "text-[#992828]",
  default: "text-white",
};

export default function StatTile({ label, value, color = "default", sub }: StatTileProps) {
  return (
    <div className="bg-[#1a1f2e] border border-[#30363d] rounded-xl p-3 text-center min-w-0">
      <div className={`text-xl font-bold ${colorMap[color]}`}>{value}</div>
      <div className="text-[10px] text-[#8b949e] uppercase tracking-wide mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-[#8b949e] mt-0.5">{sub}</div>}
    </div>
  );
}
