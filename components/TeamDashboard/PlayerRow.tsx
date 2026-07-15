"use client";

import React from "react";

interface PlayerRowProps {
  name: string;
  position?: string;
  rpe: number | null;
  srpe: number | null;
  sleep: number | null;
  fatigue: number | null;
  soreness: number | null;
  sessionType: string | null;
  injuryStatus: string | null;
  notes?: string;
}

function rpeColor(rpe: number | null): string {
  if (rpe === null) return "bg-[#21262d] text-[#8b949e]";
  if (rpe <= 2) return "bg-[#1a3a2a] text-[#2ea043]";
  if (rpe <= 5) return "bg-[#1a2a3a] text-[#58a6ff]";
  if (rpe <= 7) return "bg-[#3a2f1a] text-[#d29922]";
  return "bg-[#3a1a1a] text-[#992828]";
}

function sessionLabel(t: string | null): string {
  if (!t) return "";
  if (t === "match") return "⚽";
  if (t === "training") return "训";
  return "";
}

export default function PlayerRow({
  name, position, rpe, srpe, sleep, fatigue, soreness, sessionType, injuryStatus, notes,
}: PlayerRowProps) {
  const hasWarning = (fatigue && fatigue >= 4) || (soreness && soreness >= 4) || injuryStatus;

  return (
    <div className={`flex items-center gap-2 py-2 px-1 border-b border-[#21262d] text-xs ${hasWarning ? "bg-[#3a1a1a]/20" : ""}`}>
      {/* Name + Position */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {injuryStatus && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#992828]" title={injuryStatus} />
          )}
          <span className="font-semibold text-white text-xs truncate">{name}</span>
          {sessionType && (
            <span className="text-[10px] px-1 rounded bg-[#21262d] text-[#8b949e]">{sessionLabel(sessionType)}</span>
          )}
        </div>
        {notes && <div className="text-[10px] text-[#8b949e] truncate mt-0.5">{notes}</div>}
      </div>

      {/* RPE badge */}
      <div className={`text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[32px] text-center ${rpeColor(rpe)}`}>
        {rpe ?? "-"}
      </div>

      {/* sRPE */}
      <div className="w-10 text-right text-[10px] text-[#8b949e] font-mono">
        {srpe ? `${srpe}` : "-"}
      </div>

      {/* Wellness dots */}
      <div className="flex items-center gap-1.5 w-14 justify-end">
        <span className="text-[10px] text-[#58a6ff]">{sleep ?? "-"}</span>
        <span className="text-[10px] text-[#d29922]">{fatigue ?? "-"}</span>
        <span className="text-[10px] text-[#992828]">{soreness ?? "-"}</span>
      </div>
    </div>
  );
}
