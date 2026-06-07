"use client";

import { useMemo } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Users } from "lucide-react";
import { useState } from "react";
import { getPlayers, type PlayerRecord } from "@/lib/roster-utils";

interface Props {
  /** Full exercise data for cross-referencing */
  exercises?: { id: string; name: string; injury_contraindications?: string[] }[];
}

// Map injury keywords to Chinese labels
const INJURY_KEYWORDS: Record<string, string> = {
  knee: "膝伤", ankle: "踝伤", hip: "髋伤", waist: "腰伤",
  shoulder: "肩伤", elbow: "肘伤", wrist: "腕伤",
  hamstring: "腘绳肌", achilles: "跟腱", foot: "足伤", calf: "小腿",
};

/** Check if a player's injury note or disabled exercises match an exercise's contraindications */
function findConflicts(
  player: PlayerRecord,
  exercises: { id: string; name: string; injury_contraindications?: string[] }[]
): { exerciseId: string; exerciseName: string; reason: string }[] {
  if (player.injuryStatus === "healthy" && (!player.disabledExercises || player.disabledExercises.length === 0)) {
    return [];
  }

  const conflicts: { exerciseId: string; exerciseName: string; reason: string }[] = [];

  for (const ex of exercises) {
    // Check explicit disabled exercises
    if (player.disabledExercises?.some(d =>
      ex.name.includes(d) || d.includes(ex.name) || ex.id.includes(d)
    )) {
      conflicts.push({ exerciseId: ex.id, exerciseName: ex.name, reason: "球员标记禁用" });
      continue;
    }

    // Check injury contraindications
    if (player.injuryStatus !== "healthy" && ex.injury_contraindications?.length) {
      // Match injury keywords from player note against exercise contraindications
      const injuryLower = (player.injuryNote + player.injuryHistory).toLowerCase();
      for (const contra of ex.injury_contraindications) {
        const label = INJURY_KEYWORDS[contra] || contra;
        if (injuryLower.includes(contra) || injuryLower.includes(label)) {
          conflicts.push({ exerciseId: ex.id, exerciseName: ex.name, reason: label || contra });
          break;
        }
      }
    }
  }

  return conflicts;
}

export function RosterInjuryCheck({ exercises }: Props) {
  const [expanded, setExpanded] = useState(true);
  const players = useMemo(() => {
    try { return getPlayers(); } catch { return []; }
  }, []);

  // Filter injured/disabled players
  const injuredPlayers = useMemo(() =>
    players.filter(p => p.injuryStatus !== "healthy" || (p.disabledExercises && p.disabledExercises.length > 0)),
    [players]
  );

  // Find conflicts for each injured player
  const conflictMap = useMemo(() => {
    if (!exercises || exercises.length === 0) return new Map<string, ReturnType<typeof findConflicts>>();
    const map = new Map<string, ReturnType<typeof findConflicts>>();
    for (const p of injuredPlayers) {
      const conflicts = findConflicts(p, exercises);
      if (conflicts.length > 0) map.set(p.id, conflicts);
    }
    return map;
  }, [injuredPlayers, exercises]);

  if (players.length === 0) return null;
  if (injuredPlayers.length === 0) return null;

  const totalInjured = injuredPlayers.length;
  const totalConflicts = Array.from(conflictMap.values()).reduce((s, c) => s + c.length, 0);

  return (
    <div className="bg-[#1e1e1e] border border-[#222] rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#222]/50 transition"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-[#d1d1d1]">球队伤病概览</span>
          {totalInjured > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#992828]/20 text-[#992828]">
              {totalInjured}人有伤
            </span>
          )}
          {totalConflicts > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-500 flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" />
              {totalConflicts}个动作冲突
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {totalInjured === 0 ? (
            <p className="text-xs text-gray-500">全队健康，无伤病球员 🎉</p>
          ) : (
            <>
              {/* Player injury list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {injuredPlayers.map((p) => {
                  const conflicts = conflictMap.get(p.id) || [];
                  const hasConflict = conflicts.length > 0;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                        hasConflict
                          ? "bg-yellow-500/5 border border-yellow-500/20"
                          : "bg-[#111]"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        p.injuryStatus === "out" ? "bg-[#992828]" : p.injuryStatus === "minor" ? "bg-yellow-500" : "bg-gray-500"
                      }`} />
                      <span className="text-gray-300 truncate font-medium">{p.name}</span>
                      <span className="text-gray-500 shrink-0">{p.position}</span>
                      {p.injuryStatus !== "healthy" && (
                        <span className={`text-[10px] shrink-0 ${
                          p.injuryStatus === "out" ? "text-[#992828]" : "text-yellow-500"
                        }`}>
                          {p.injuryStatus === "out" ? "🚑 伤停" : "⚠️ 轻伤"}
                        </span>
                      )}
                      {hasConflict && (
                        <span className="text-[10px] text-yellow-500 shrink-0" title={conflicts.map(c => c.exerciseName).join("、")}>
                          ⚠️{conflicts.length}个冲突
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Conflict details */}
              {totalConflicts > 0 && exercises && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-[10px] text-yellow-500 font-bold mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    动作冲突详情
                  </p>
                  <div className="space-y-1">
                    {injuredPlayers.map((p) => {
                      const conflicts = conflictMap.get(p.id) || [];
                      if (conflicts.length === 0) return null;
                      return (
                        <div key={p.id} className="text-[10px]">
                          <span className="text-gray-300 font-medium">{p.name}</span>
                          <span className="text-gray-600"> — </span>
                          {conflicts.map((c, i) => (
                            <span key={c.exerciseId}>
                              {i > 0 && <span className="text-gray-600">、</span>}
                              <span className="text-yellow-400">{c.exerciseName}</span>
                              <span className="text-gray-500">（{c.reason}）</span>
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
