"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play,
  Pause,
  Flag,
  RotateCcw,
  Undo2,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  Zap,
  FileText,
  X,
  Plus,
  Minus,
  StickyNote,
  AlertTriangle,
  CheckCircle2,
  Timer,
  TrendingUp,
  History,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { POSITION_PROFILES, type PositionMetabolicProfile } from "@/lib/position-profiles";
import { POSITION_LABELS } from "@/lib/constants";
import type { Position } from "@/lib/types";
import type { PlayerRecord as RosterPlayer } from "@/lib/roster-utils";
import { getPlayers } from "@/lib/roster-utils";
import { saveSessionLog, type TrainingSessionLog } from "@/lib/training-log";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

type MatchType = "联赛" | "杯赛" | "友谊赛" | "加时赛";
type PlayerStatus = "field" | "bench" | "subbed_off";
type MatchPhase = "pre_match" | "first_half" | "half_time" | "second_half" | "extra_time" | "penalties" | "full_time";

interface MatchPlayer {
  id: string;
  name: string;
  number: string;
  position: Position | string;
  status: PlayerStatus;
  timeOnField: number; // accumulated seconds
  currentStintStart: number | null; // match clock when entered current stint
  entries: { in: number; out: number | null }[]; // all in/out timestamps
  notes: string;
}

interface SubEvent {
  id: string;
  matchTime: number;
  playerIn: string; // player name
  playerOut: string;
  timestamp: number; // real time
}

interface MatchState {
  matchType: MatchType;
  phase: MatchPhase;
  clockRunning: boolean;
  matchTime: number; // seconds elapsed in current phase
  totalTime: number; // total seconds across all phases
  score: { home: number; away: number };
  matchName: string; // e.g., "上海联队 vs 北京青年"
  homeTeam: string;
  awayTeam: string;
  players: MatchPlayer[];
  events: SubEvent[];
  undoStack: SubEvent[];
  startedAt: string | null;
}

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════

const MATCH_TYPES: MatchType[] = ["联赛", "杯赛", "友谊赛", "加时赛"];
const HALF_DURATION = 45 * 60; // 45 minutes
const EXTRA_HALF_DURATION = 15 * 60; // 15 minutes
const STORAGE_KEY = "kenshin_match_state";

// Position to m/min mapping (based on Di Salvo 2007 totalDistance / 90min)
function getMetersPerMin(position: string): number {
  const key = position as Position;
  const profile: PositionMetabolicProfile | undefined = POSITION_PROFILES[key];
  if (!profile) return 78; // default midfielder pace
  return Math.round(profile.totalDistance / 90);
}

// Group m/min for display
function getPositionGroupLabel(position: string): string {
  const key = position as Position;
  // Groupings per spec: 边锋/边后卫, 中场, 中后卫/前锋
  if (key === "winger" || key === "wingback") return "边路";
  if (key === "midfielder") return "中场";
  if (key === "defender" || key === "forward" || key === "center_forward") return "后卫/前锋";
  return "门将";
}

function getHighIntensityPercent(phase: MatchPhase): number {
  if (phase === "extra_time") return 0.12;
  if (phase === "second_half") return 0.15;
  return 0.18; // first half
}

// ═══════════════════════════════════════════
// Distance Estimation
// ═══════════════════════════════════════════

interface DistanceEstimate {
  total: number;
  highIntensity: number;
  mPerMin: number;
}

function estimateDistance(
  player: MatchPlayer,
  phase: MatchPhase,
  scoreDiff: number
): DistanceEstimate {
  const mPerMin = getMetersPerMin(player.position);
  const minutes = player.timeOnField / 60;

  // Dynamic adjustment: leading → -5%, trailing → +5%
  let adjustment = 1.0;
  if (scoreDiff > 0) adjustment = 0.95; // trailing, push harder
  else if (scoreDiff < 0) adjustment = 1.05; // leading, conserve slightly

  // Wait, re-reading spec: "leading → -5%, trailing → +5%"
  // This means if our team is winning (leading), players run slightly less (-5%)
  // If losing (trailing), they run more (+5%)
  // scoreDiff = home - away. If we are home team and leading, scoreDiff > 0 → -5%
  // But we need team context. Let me simplify: trailing means losing → +5%
  // We'll use `isTrailing` flag instead.
  // Actually, let me think about this more carefully.
  // "Dynamic: leading → -5%, trailing → +5%"
  // Leading = winning = lower intensity → 0.95x
  // Trailing = losing = higher intensity → 1.05x
  // The adjustment should be: if trailing (+effort), if leading (-effort)
  // We'll pass isTrailing separately. For now just use adjustment.

  const highIntensityPct = getHighIntensityPercent(phase);
  const total = Math.round(minutes * mPerMin * adjustment);
  const highIntensity = Math.round(total * highIntensityPct);

  return { total, highIntensity, mPerMin };
}

function estimateDistanceForPlayer(
  player: MatchPlayer,
  phase: MatchPhase,
  isTrailing: boolean
): DistanceEstimate {
  const mPerMin = getMetersPerMin(player.position);
  const minutes = player.timeOnField / 60;
  let adjustment = 1.0;
  if (isTrailing) adjustment = 1.05;
  else adjustment = 0.95;

  const highIntensityPct = getHighIntensityPercent(phase);
  const total = Math.round(minutes * mPerMin * adjustment);
  const highIntensity = Math.round(total * highIntensityPct);

  return { total, highIntensity, mPerMin };
}

// Load status color
type LoadStatus = "normal" | "fatigue" | "very_high" | "low";

function getLoadStatus(player: MatchPlayer, phase: MatchPhase): LoadStatus {
  const minutes = player.timeOnField / 60;
  if (phase === "extra_time") {
    if (minutes > 30) return "very_high";
    if (minutes > 20) return "fatigue";
  }
  if (minutes > 80) return "very_high";
  if (minutes > 65) return "fatigue";
  if (minutes < 15 && player.status === "field") return "low";
  return "normal";
}

const LOAD_COLORS: Record<LoadStatus, { bg: string; dot: string; label: string }> = {
  normal: { bg: "bg-green-500/10", dot: "bg-green-400", label: "正常" },
  fatigue: { bg: "bg-yellow-500/10", dot: "bg-yellow-400", label: "疲劳" },
  very_high: { bg: "bg-red-500/10", dot: "bg-red-400", label: "极高" },
  low: { bg: "bg-blue-500/10", dot: "bg-blue-400", label: "低" },
};

const FATIGUE_LEVELS = [
  { key: "low", color: "text-blue-400", bg: "bg-blue-500/20", label: "低", dot: "🔵" },
  { key: "normal", color: "text-green-400", bg: "bg-green-500/20", label: "正常", dot: "🟢" },
  { key: "high", color: "text-yellow-400", bg: "bg-yellow-500/20", label: "高", dot: "🟡" },
  { key: "very_high", color: "text-red-400", bg: "bg-red-500/20", label: "极高", dot: "🔴" },
] as const;

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function generateId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ═══════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════

export default function MatchPage() {
  const [state, setState] = useState<MatchState | null>(null);
  const [setupTab, setSetupTab] = useState<"squad" | "starting11">("squad");
  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>([]);
  const [selectedSquadIds, setSelectedSquadIds] = useState<Set<string>>(new Set());
  const [starting11Ids, setStarting11Ids] = useState<Set<string>>(new Set());
  const [showNotesInput, setShowNotesInput] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showHalfReport, setShowHalfReport] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load roster on mount
  useEffect(() => {
    const players = getPlayers();
    setRosterPlayers(players);
  }, []);

  // Try to restore state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as MatchState;
        if (parsed.phase !== "full_time" && parsed.phase !== "pre_match") {
          setState(parsed);
        }
      }
    } catch {}
  }, []);

  // Persist state
  useEffect(() => {
    if (state) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {}
    }
  }, [state]);

  // Clear message after timeout
  useEffect(() => {
    if (savedMessage) {
      const t = setTimeout(() => setSavedMessage(null), 2500);
      return () => clearTimeout(t);
    }
  }, [savedMessage]);

  // Timer
  useEffect(() => {
    if (state?.clockRunning) {
      timerRef.current = setInterval(() => {
        setState((prev) => {
          if (!prev) return prev;
          return { ...prev, matchTime: prev.matchTime + 1, totalTime: prev.totalTime + 1 };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state?.clockRunning]);

  // Auto half-time trigger
  useEffect(() => {
    if (!state || state.clockRunning !== true) return;
    if (
      state.phase === "first_half" &&
      state.matchTime >= HALF_DURATION
    ) {
      // Auto-pause at 45:00
      setState((prev) => prev ? { ...prev, clockRunning: false } : prev);
    }
    if (
      state.phase === "second_half" &&
      state.matchTime >= HALF_DURATION
    ) {
      setState((prev) => prev ? { ...prev, clockRunning: false } : prev);
    }
    if (
      state.phase === "extra_time" &&
      state.matchTime >= EXTRA_HALF_DURATION
    ) {
      setState((prev) => prev ? { ...prev, clockRunning: false } : prev);
    }
  }, [state?.matchTime, state?.phase, state?.clockRunning]);

  // ── Actions ──

  const startMatch = useCallback(() => {
    if (starting11Ids.size !== 11) return;
    const squadIds = Array.from(selectedSquadIds);
    const players: MatchPlayer[] = squadIds.map((id, idx) => {
      const rp = rosterPlayers.find((p) => p.id === id)!;
      const isStarting = starting11Ids.has(id);
      return {
        id: rp.id,
        name: rp.name,
        number: rp.number || String(idx + 1),
        position: rp.position || "midfielder",
        status: isStarting ? "field" : "bench",
        timeOnField: 0,
        currentStintStart: isStarting ? 0 : null,
        entries: isStarting ? [{ in: 0, out: null }] : [],
        notes: rp.notes || "",
      } as MatchPlayer;
    });

    const matchName = homeTeamName && awayTeamName
      ? `${homeTeamName} vs ${awayTeamName}`
      : "比赛";

    setState({
      matchType: "联赛",
      phase: "first_half",
      clockRunning: false,
      matchTime: 0,
      totalTime: 0,
      score: { home: 0, away: 0 },
      matchName,
      homeTeam: homeTeamName,
      awayTeam: awayTeamName,
      players,
      events: [],
      undoStack: [],
      startedAt: new Date().toISOString(),
    });
  }, [starting11Ids, selectedSquadIds, rosterPlayers, homeTeamName, awayTeamName]);

  const toggleClock = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      return { ...prev, clockRunning: !prev.clockRunning };
    });
  }, []);

  const handleHalfTime = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const newPhase: MatchPhase =
        prev.phase === "first_half"
          ? "half_time"
          : prev.phase === "second_half"
          ? "full_time"
          : prev.phase;
      return { ...prev, phase: newPhase, clockRunning: false };
    });
    if (state?.phase === "first_half") {
      setShowHalfReport(true);
    }
    if (state?.phase === "second_half") {
      setShowFullReport(true);
    }
  }, [state?.phase]);

  const startSecondHalf = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      // Accumulate matchTime from first half into totalTime, reset matchTime for 2nd half
      return {
        ...prev,
        phase: "second_half",
        matchTime: 0,
        clockRunning: false,
      };
    });
    setShowHalfReport(false);
  }, []);

  const handleExtraTime = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phase: "extra_time",
        matchTime: 0,
        clockRunning: false,
      };
    });
  }, []);

  const subPlayer = useCallback(
    (playerId: string) => {
      setState((prev) => {
        if (!prev) return prev;
        const player = prev.players.find((p) => p.id === playerId);
        if (!player) return prev;

        if (player.status === "field") {
          // Sub OFF
          const updatedPlayer: MatchPlayer = {
            ...player,
            status: "subbed_off",
            currentStintStart: null,
            entries: player.entries.map((e, i) =>
              i === player.entries.length - 1 ? { ...e, out: prev.totalTime } : e
            ),
            timeOnField:
              player.timeOnField + (prev.totalTime - (player.currentStintStart ?? prev.totalTime)),
          };
          const event: SubEvent = {
            id: generateId(),
            matchTime: prev.totalTime,
            playerIn: "—",
            playerOut: player.name,
            timestamp: Date.now(),
          };
          return {
            ...prev,
            players: prev.players.map((p) => (p.id === playerId ? updatedPlayer : p)),
            events: [...prev.events, event],
            undoStack: [...prev.undoStack.slice(-2), event],
          };
        } else if (player.status === "bench") {
          // Sub ON
          const updatedPlayer: MatchPlayer = {
            ...player,
            status: "field",
            currentStintStart: prev.totalTime,
            entries: [...player.entries, { in: prev.totalTime, out: null }],
          };
          const event: SubEvent = {
            id: generateId(),
            matchTime: prev.totalTime,
            playerIn: player.name,
            playerOut: "—",
            timestamp: Date.now(),
          };
          return {
            ...prev,
            players: prev.players.map((p) => (p.id === playerId ? updatedPlayer : p)),
            events: [...prev.events, event],
            undoStack: [...prev.undoStack.slice(-2), event],
          };
        }
        return prev;
      });
    },
    []
  );

  const undoLastSub = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.undoStack.length === 0) return prev;
      const lastEvent = prev.undoStack[prev.undoStack.length - 1];

      return {
        ...prev,
        players: prev.players.map((p) => {
          if (lastEvent.playerIn !== "—" && p.name === lastEvent.playerIn) {
            // Revert sub ON back to bench
            const entries = [...p.entries];
            entries.pop();
            return {
              ...p,
              status: "bench" as PlayerStatus,
              currentStintStart: null,
              entries,
            };
          }
          if (lastEvent.playerOut !== "—" && p.name === lastEvent.playerOut) {
            // Revert sub OFF back to field
            const entries = p.entries.map((e, i) =>
              i === p.entries.length - 1 ? { ...e, out: null } : e
            );
            return {
              ...p,
              status: "field" as PlayerStatus,
              currentStintStart: prev.totalTime,
              entries,
            };
          }
          return p;
        }),
        events: prev.events.filter((e) => e.id !== lastEvent.id),
        undoStack: prev.undoStack.slice(0, -1),
      };
    });
  }, []);

  const updateScore = useCallback((team: "home" | "away", delta: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const newScore = {
        ...prev.score,
        [team]: Math.max(0, prev.score[team] + delta),
      };
      return { ...prev, score: newScore };
    });
  }, []);

  const savePlayerNote = useCallback(
    (playerId: string, note: string) => {
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === playerId ? { ...p, notes: p.notes ? `${p.notes}; ${note}` : note } : p
          ),
        };
      });
      setShowNotesInput(null);
      setNoteText("");
    },
    []
  );

  const finishMatch = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      // Finalize all field players
      const updatedPlayers = prev.players.map((p) => {
        if (p.status === "field" && p.currentStintStart !== null) {
          return {
            ...p,
            timeOnField: p.timeOnField + (prev.totalTime - p.currentStintStart),
            currentStintStart: null,
            entries: p.entries.map((e, i) =>
              i === p.entries.length - 1 ? { ...e, out: prev.totalTime } : e
            ),
          };
        }
        return p;
      });

      // Save to training log
      const log: TrainingSessionLog = {
        id: generateId(),
        date: new Date().toISOString().slice(0, 10),
        planId: `match_${generateId().slice(0, 8)}`,
        scene: "match",
        goal: prev.matchType,
        duration: Math.round(prev.totalTime / 60),
        matchDay: prev.matchType,
        playerName: prev.matchName,
        exercises: [],
        summary: {
          totalExercises: prev.players.length,
          completedExercises: prev.players.filter((p) => p.timeOnField > 0).length,
          completionRate: 1,
          averageRPE: 0,
          totalVolumeLoad: Math.round(
            prev.players.reduce((sum, p) => {
              const est = estimateDistanceForPlayer(
                p,
                prev.phase,
                prev.score.home < prev.score.away
              );
              return sum + est.total;
            }, 0)
          ),
          notes: `比赛: ${prev.matchName} | ${prev.matchType} | ${prev.events.length}次换人`,
        },
        createdAt: new Date().toISOString(),
      };
      try {
        saveSessionLog(log);
        setSavedMessage("比赛数据已保存");
      } catch {}

      // Notify load management page to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('training-log-updated'));
      }

      return {
        ...prev,
        phase: "full_time" as MatchPhase,
        clockRunning: false,
        players: updatedPlayers,
      };
    });
    setShowFullReport(true);
  }, []);

  const resetMatch = useCallback(() => {
    setState(null);
    setStarting11Ids(new Set());
    setSelectedSquadIds(new Set());
    setHomeTeamName("");
    setAwayTeamName("");
    setShowHalfReport(false);
    setShowFullReport(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  // Toggle player in squad
  const toggleSquadPlayer = useCallback((id: string) => {
    setSelectedSquadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setStarting11Ids((s) => {
          const ns = new Set(s);
          ns.delete(id);
          return ns;
        });
      } else {
        if (next.size >= 23) return prev;
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleStarting11 = useCallback((id: string) => {
    if (!selectedSquadIds.has(id)) return;
    setStarting11Ids((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 11) return prev;
        next.add(id);
      }
      return next;
    });
  }, [selectedSquadIds]);

  // Auto-select starting 11 from first 11 squad members
  const autoSelectStarting11 = useCallback(() => {
    const squad = Array.from(selectedSquadIds).slice(0, 11);
    setStarting11Ids(new Set(squad));
  }, [selectedSquadIds]);

  // ── Computed ──

  const fieldPlayers = useMemo(
    () => state?.players.filter((p) => p.status === "field") ?? [],
    [state?.players]
  );
  const benchPlayers = useMemo(
    () => state?.players.filter((p) => p.status === "bench") ?? [],
    [state?.players]
  );
  const subbedPlayers = useMemo(
    () => state?.players.filter((p) => p.status === "subbed_off") ?? [],
    [state?.players]
  );

  const isTrailing = state ? state.score.home < state.score.away : false;
  const scoreDiff = state ? state.score.home - state.score.away : 0;

  const avgMinutes = useMemo(() => {
    const played = state?.players.filter((p) => p.timeOnField > 0 || p.status === "field") ?? [];
    if (played.length === 0) return 0;
    const total = played.reduce((s, p) => s + p.timeOnField, 0) / 60;
    return Math.round(total / played.length);
  }, [state?.players]);

  const avgDistance = useMemo(() => {
    const played = state?.players.filter((p) => p.timeOnField > 0 || p.status === "field") ?? [];
    if (played.length === 0) return 0;
    const total = played.reduce((s, p) => {
      const est = estimateDistanceForPlayer(p, state?.phase ?? "first_half", isTrailing);
      return s + est.total;
    }, 0);
    return Math.round(total / played.length);
  }, [state?.players, state?.phase, isTrailing]);

  const subEvents = useMemo(() => state?.events ?? [], [state?.events]);

  // Half-time report data
  const halfTimeReport = useMemo(() => {
    if (!state) return null;
    const played = state.players.filter((p) => p.timeOnField > 20 * 60 || p.status === "field");
    const ranked = [...played]
      .map((p) => ({
        ...p,
        dist: estimateDistanceForPlayer(p, state.phase, isTrailing),
      }))
      .sort((a, b) => b.dist.highIntensity - a.dist.highIntensity);
    return {
      topRunners: ranked.slice(0, 3),
      fatigueFlags: ranked.filter((p) => getLoadStatus(p, state.phase) === "very_high"),
      suggestions: [],
    };
  }, [state, isTrailing]);

  // ── Render ──

  // PRE-MATCH SETUP
  if (!state || state.phase === "pre_match") {
    return (
      <div className="min-h-screen bg-[#0d0d0d] pb-10">
        <div className="sticky top-0 z-10 bg-[#0d0d0d]/95 backdrop-blur border-b border-[#222] px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div>
              <a href="/" className="text-gray-400 hover:text-white text-xs transition-colors">← 返回</a>
              <h1 className="text-sm font-bold text-white">比赛模式</h1>
              <p className="text-[10px] text-gray-500">赛前准备</p>
            </div>
            {state && (
              <button
                onClick={resetMatch}
                className="text-[10px] text-gray-500 hover:text-[#992828] flex items-center gap-1"
              >
                <X className="w-3 h-3" /> 取消
              </button>
            )}
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
          {/* Match name */}
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4 space-y-3">
            <div className="flex gap-2 items-center">
              <input
                value={homeTeamName}
                onChange={(e) => setHomeTeamName(e.target.value)}
                placeholder="主队名称"
                className="flex-1 bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-[#992828] outline-none"
              />
              <span className="text-gray-600 text-sm font-bold">VS</span>
              <input
                value={awayTeamName}
                onChange={(e) => setAwayTeamName(e.target.value)}
                placeholder="客队名称"
                className="flex-1 bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-[#992828] outline-none"
              />
            </div>
          </div>

          {/* Match type selector */}
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4">
            <p className="text-[11px] text-gray-400 mb-2 font-medium">比赛类型</p>
            <div className="flex gap-2">
              {MATCH_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    setState((prev) =>
                      prev
                        ? { ...prev, matchType: t }
                        : {
                            matchType: t,
                            phase: "pre_match",
                            clockRunning: false,
                            matchTime: 0,
                            totalTime: 0,
                            score: { home: 0, away: 0 },
                            matchName: "",
                            homeTeam: "",
                            awayTeam: "",
                            players: [],
                            events: [],
                            undoStack: [],
                            startedAt: null,
                          }
                    )
                  }
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                    state?.matchType === t
                      ? "bg-[#992828] text-white"
                      : "bg-[#0d0d0d] text-gray-400 hover:text-white border border-[#333]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Squad selection */}
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  onClick={() => setSetupTab("squad")}
                  className={`text-xs font-medium px-2 py-1 rounded cursor-pointer transition ${
                    setupTab === "squad"
                      ? "bg-[#992828]/20 text-[#992828]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  大名单 ({selectedSquadIds.size}/23)
                </div>
                <div
                  onClick={() => selectedSquadIds.size > 0 && setSetupTab("starting11")}
                  className={`text-xs font-medium px-2 py-1 rounded cursor-pointer transition ${
                    setupTab === "starting11"
                      ? "bg-[#992828]/20 text-[#992828]"
                      : "text-gray-400 hover:text-white"
                  } ${selectedSquadIds.size === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  首发 ({starting11Ids.size}/11)
                </div>
              </div>
              {setupTab === "starting11" && (
                <button
                  onClick={autoSelectStarting11}
                  className="text-[10px] text-[#992828] hover:underline"
                  disabled={selectedSquadIds.size === 0}
                >
                  一键首发
                </button>
              )}
            </div>

            {rosterPlayers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-gray-500 mb-2">花名册为空</p>
                <a
                  href="/roster"
                  className="text-[10px] text-[#992828] hover:underline"
                >
                  去导入球员
                </a>
              </div>
            ) : setupTab === "squad" ? (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {rosterPlayers.map((rp) => {
                  const isSelected = selectedSquadIds.has(rp.id);
                  return (
                    <button
                      key={rp.id}
                      onClick={() => toggleSquadPlayer(rp.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition ${
                        isSelected
                          ? "bg-[#992828]/10 border border-[#992828]/30"
                          : "bg-[#0d0d0d] border border-transparent hover:border-[#333]"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? "bg-[#992828] border-[#992828]"
                            : "border-gray-600"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs text-white flex-1 truncate">
                        {rp.name}
                        {rp.injuryStatus !== "healthy" && (
                          <span className="ml-1 text-[10px] text-yellow-400">
                            {rp.injuryStatus === "out" ? "🚑" : "⚠️"}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {rp.number || "—"} · {POSITION_LABELS[rp.position as Position] || rp.position || "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {rosterPlayers
                  .filter((rp) => selectedSquadIds.has(rp.id))
                  .map((rp) => {
                    const isStarting = starting11Ids.has(rp.id);
                    return (
                      <button
                        key={rp.id}
                        onClick={() => toggleStarting11(rp.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition ${
                          isStarting
                            ? "bg-green-500/10 border border-green-500/30"
                            : "bg-[#0d0d0d] border border-transparent hover:border-[#333]"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
                            isStarting
                              ? "bg-green-500 border-green-500"
                              : "border-gray-600"
                          }`}
                        >
                          {isStarting && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-xs text-white flex-1 truncate">{rp.name}</span>
                        <span className="text-[10px] text-gray-500">
                          {rp.number || "—"} · {POSITION_LABELS[rp.position as Position] || rp.position || "—"}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Start button */}
          <button
            onClick={startMatch}
            disabled={starting11Ids.size !== 11}
            className="w-full py-4 bg-[#992828] hover:bg-[#7a1e1e] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-base font-bold transition flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Play className="w-5 h-5" />
            {starting11Ids.size !== 11
              ? `还需选择 ${11 - starting11Ids.size} 名首发`
              : "开始比赛"}
          </button>
        </div>
      </div>
    );
  }

  // FULL-TIME SUMMARY
  if (state.phase === "full_time" && showFullReport) {
    const allPlayers = [...state.players].sort((a, b) => b.timeOnField - a.timeOnField);
    const totalEstDistance = allPlayers.reduce((sum, p) => {
      const est = estimateDistanceForPlayer(p, state.phase, isTrailing);
      return sum + est.total;
    }, 0);

    return (
      <div className="min-h-screen bg-[#0d0d0d] pb-10">
        <div className="sticky top-0 z-10 bg-[#0d0d0d]/95 backdrop-blur border-b border-[#222] px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div>
              <a href="/" className="text-gray-400 hover:text-white text-xs transition-colors">← 返回</a>
              <h1 className="text-sm font-bold text-white">比赛结束</h1>
              <p className="text-[10px] text-gray-500">
                {state.matchName} · {formatTime(state.totalTime)}
              </p>
            </div>
            <button
              onClick={() => {
                setShowFullReport(false);
                resetMatch();
              }}
              className="px-3 py-1.5 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-lg text-xs font-medium transition"
            >
              新比赛
            </button>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 mt-4 space-y-3">
          {/* Score card */}
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-6">
              <div>
                <p className="text-[10px] text-gray-500">{state.homeTeam || "主队"}</p>
                <p className="text-4xl font-black text-white">{state.score.home}</p>
              </div>
              <span className="text-gray-600 text-lg">-</span>
              <div>
                <p className="text-[10px] text-gray-500">{state.awayTeam || "客队"}</p>
                <p className="text-4xl font-black text-white">{state.score.away}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <span className="text-[10px] text-gray-500">{state.matchType}</span>
              <span className="text-[10px] text-gray-500">总时间 {formatTime(state.totalTime)}</span>
              <span className="text-[10px] text-gray-500">{state.events.length}次换人</span>
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-500">估计总跑动</p>
              <p className="text-lg font-bold text-white">{totalEstDistance.toLocaleString()}m</p>
              <p className="text-[8px] text-gray-600">估算值</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-500">上场球员</p>
              <p className="text-lg font-bold text-white">
                {state.players.filter((p) => p.timeOnField > 0).length}
              </p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-500">人均时间</p>
              <p className="text-lg font-bold text-white">{avgMinutes}&apos;</p>
            </div>
          </div>

          {/* Player list */}
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-[#222]">
              <p className="text-[11px] text-gray-400 font-medium">球员数据</p>
            </div>
            <div className="divide-y divide-[#222] max-h-[50vh] overflow-y-auto">
              {allPlayers.map((p) => {
                const est = estimateDistanceForPlayer(p, state.phase, isTrailing);
                const minutesPlayed = Math.round(p.timeOnField / 60);
                const fatigueLevel =
                  minutesPlayed >= 85
                    ? "very_high"
                    : minutesPlayed >= 65
                    ? "high"
                    : minutesPlayed >= 30
                    ? "normal"
                    : "low";
                const fl = FATIGUE_LEVELS.find((f) => f.key === fatigueLevel)!;
                return (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2.5">
                    <span className={`text-sm ${fl.dot}`}>{fl.dot}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">
                        {p.name}
                        <span className="ml-1 text-[10px] text-gray-500">
                          #{p.number}
                        </span>
                      </p>
                      {p.notes && (
                        <p className="text-[10px] text-gray-500 truncate">{p.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-white font-mono">{minutesPlayed}&apos;</p>
                      <p className="text-[10px] text-gray-500">
                        ~{est.total}m
                        <span className="text-[8px] text-gray-600 ml-0.5">估算</span>
                      </p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${fl.bg} ${fl.color}`}>
                      {fl.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saved message */}
          {savedMessage && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
              <p className="text-[10px] text-green-400">{savedMessage}</p>
            </div>
          )}

          {/* ── 补负荷提醒（按位置区分策略）── */}
          {(() => {
            const underloaded = allPlayers
              .map(p => ({ ...p, minutesPlayed: Math.round(p.timeOnField / 60) }))
              .filter(p => p.minutesPlayed < 45);
            if (underloaded.length === 0) return null;
            return (
              <div className="bg-[#992828]/5 border border-[#992828]/30 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#992828]" />
                  <h3 className="text-sm font-bold text-[#992828]">补负荷提醒</h3>
                  <span className="text-[10px] text-gray-500">{underloaded.filter(p => p.position !== 'goalkeeper').length}人需补跑量</span>
                </div>
                {underloaded.map(p => {
                  const posMap: Record<string, string> = { midfielder: '中场', defender: '后卫', wingback: '翼卫', forward: '前锋', goalkeeper: '门将' };
                  const pos = posMap[p.position] || '其他';
                  const baseDist: Record<string, number> = { midfielder: 7061, defender: 7080, wingback: 7012, forward: 6960, goalkeeper: 4000 };
                  const bd = baseDist[p.position] || 7000;
                  let ratio = p.minutesPlayed === 0 ? 0.65 : p.minutesPlayed <= 20 ? 0.45 : 0.25;
                  const needMeters = Math.round(bd * ratio);
                  const isGk = p.position === 'goalkeeper';
                  return (
                    <details key={p.id} className="bg-[#1a1a1a] rounded-lg group">
                      <summary className="flex items-center gap-3 p-3 cursor-pointer">
                        <span className="text-xs text-white font-medium w-16 truncate">{p.name}</span>
                        <span className="text-[10px] text-gray-500">{pos} · {p.minutesPlayed}min</span>
                        <div className="flex-1" />
                        <span className={`text-xs font-bold ${isGk ? 'text-yellow-500' : 'text-[#992828]'}`}>
                          {isGk ? '技术维持' : `${needMeters}m`}
                        </span>
                        <ChevronDown className="w-3 h-3 text-gray-600 group-open:rotate-180 transition" />
                      </summary>
                      <div className="px-3 pb-3 space-y-1.5 border-t border-[#222] pt-2">
                        {isGk ? (
                          <p className="text-[10px] text-gray-400">门将无需补跑量。维持侧扑+出击+脚下技术训练即可。</p>
                        ) : (
                          <>
                            <p className="text-[10px] text-gray-400">
                              <span className="text-gray-500">主练：</span>
                              {p.position === 'midfielder' ? 'SSG 4v4 + 间歇变速跑' :
                               p.position === 'defender' ? '加速制动+变向组合' :
                               p.position === 'wingback' ? '边路往返冲刺' :
                               p.position === 'forward' ? '5-15m 爆发冲刺' : '通用跑动'}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {p.position === 'midfielder' ? 'HR 80-90% · 训练主体后' :
                               p.position === 'defender' ? 'HR 75-85% · 训练主体中段' :
                               p.position === 'wingback' ? 'HR 85-95% · 分组轮换' :
                               p.position === 'forward' ? '最大努力 · 训练主体前段' : ''}
                            </p>
                          </>
                        )}
                      </div>
                    </details>
                  );
                })}
                {/* ── 补负荷操作 ── */}
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500">补负荷不一定要全放在一天。可以赛后立刻跑完，也可以分摊到后面1-2天慢慢消化。</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        const suppData = underloaded.filter(p => p.position !== 'goalkeeper').map(p => {
                          const bd = { midfielder: 7061, defender: 7080, wingback: 7012, forward: 6960 }[p.position] || 7000;
                          const ratio = p.minutesPlayed === 0 ? 0.65 : p.minutesPlayed <= 20 ? 0.45 : 0.25;
                          return { name: p.name, position: p.position, minutes: p.minutesPlayed, supplementMeters: Math.round(bd * ratio) };
                        });
                        localStorage.setItem('kenshin_supplement_now', JSON.stringify({ date: new Date().toISOString().slice(0,10), players: suppData, mode: 'immediate' }));
                        window.location.href = '/load';
                      }}
                      className="w-full py-2.5 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-lg text-xs font-bold transition"
                    >
                      ⚡ 赛后立刻全部补完
                    </button>
                    <button
                      onClick={() => {
                        const suppData = underloaded.filter(p => p.position !== 'goalkeeper').map(p => {
                          const bd = { midfielder: 7061, defender: 7080, wingback: 7012, forward: 6960 }[p.position] || 7000;
                          const ratio = p.minutesPlayed === 0 ? 0.65 : p.minutesPlayed <= 20 ? 0.45 : 0.25;
                          return { name: p.name, position: p.position, minutes: p.minutesPlayed, supplementMeters: Math.round(bd * ratio), dailyMeters: Math.round(bd * ratio / 2) };
                        });
                        localStorage.setItem('kenshin_supplement_bridge', JSON.stringify({ date: new Date().toISOString().slice(0,10), players: suppData, mode: 'spread' }));
                        window.location.href = '/planning';
                      }}
                      className="w-full py-2.5 bg-[#1a1a1a] border border-[#333] hover:border-[#992828] text-gray-400 hover:text-[#992828] rounded-lg text-xs font-bold transition"
                    >
                      📋 分摊到后面 1-2 天
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          <button
            onClick={() => {
              setShowFullReport(false);
              resetMatch();
            }}
            className="w-full py-3.5 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4" />
            完成并返回
          </button>
        </div>
      </div>
    );
  }

  // HALF-TIME REPORT OVERLAY
  if (showHalfReport && halfTimeReport && state.phase === "half_time") {
    return (
      <div className="min-h-screen bg-[#0d0d0d] pb-10">
        <div className="sticky top-0 z-10 bg-[#0d0d0d]/95 backdrop-blur border-b border-[#222] px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-sm font-bold text-white">中场报告</h1>
              <p className="text-[10px] text-gray-500">自动生成</p>
            </div>
            <button
              onClick={startSecondHalf}
              className="px-3 py-1.5 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-lg text-xs font-medium transition"
            >
              开始下半场
            </button>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 mt-4 space-y-3">
          {/* Score */}
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-6">
              <div>
                <p className="text-[10px] text-gray-500">{state.homeTeam || "主队"}</p>
                <p className="text-3xl font-black text-white">{state.score.home}</p>
              </div>
              <span className="text-gray-600 text-lg">-</span>
              <div>
                <p className="text-[10px] text-gray-500">{state.awayTeam || "客队"}</p>
                <p className="text-3xl font-black text-white">{state.score.away}</p>
              </div>
            </div>
          </div>

          {/* Top runners */}
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4">
            <h3 className="text-[11px] text-gray-400 font-medium mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> 高强度跑动 Top 3
            </h3>
            <div className="space-y-2">
              {halfTimeReport.topRunners.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-4">{i + 1}.</span>
                  <span className="text-xs text-white flex-1">{p.name}</span>
                  <span className="text-[10px] text-gray-400">
                    ~{p.dist.highIntensity}m 高强度
                  </span>
                </div>
              ))}
              {halfTimeReport.topRunners.length === 0 && (
                <p className="text-[10px] text-gray-600">数据不足</p>
              )}
            </div>
          </div>

          {/* Fatigue flags */}
          {halfTimeReport.fatigueFlags.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
              <h3 className="text-[11px] text-red-400 font-medium mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> 异常疲劳预警
              </h3>
              <div className="space-y-2">
                {halfTimeReport.fatigueFlags.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="text-xs text-red-300 flex-1">{p.name}</span>
                    <span className="text-[10px] text-red-400">
                      {Math.round(p.timeOnField / 60)}分钟 负荷极高
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4">
            <h3 className="text-[11px] text-gray-400 font-medium mb-2">系统建议</h3>
            <div className="space-y-1">
              {halfTimeReport.topRunners.length > 0 && (
                <p className="text-[10px] text-gray-300">
                  建议60分钟起关注换人窗口，{halfTimeReport.topRunners[0]?.name || ""}
                  跑动强度最高
                </p>
              )}
              {subEvents.length < 3 && (
                <p className="text-[10px] text-gray-300">
                  下半场可使用 {5 - Math.min(subEvents.length, 5)} 次换人名额
                </p>
              )}
              <p className="text-[10px] text-gray-500">
                下半场高强度占比预计降至15%（典型半场衰减）
              </p>
            </div>
          </div>

          {savedMessage && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
              <p className="text-[10px] text-green-400">{savedMessage}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // IN-MATCH VIEW
  // ═══════════════════════════════════════════

  const phaseLabel: Record<MatchPhase, string> = {
    pre_match: "赛前",
    first_half: "上半场",
    half_time: "中场休息",
    second_half: "下半场",
    extra_time: "加时赛",
    penalties: "点球",
    full_time: "全场结束",
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-10 select-none">
      {/* ── TOP BAR ── */}
      <div className="sticky top-0 z-20 bg-[#0d0d0d]/95 backdrop-blur border-b border-[#222]">
        <div className="max-w-lg mx-auto px-3 py-2">
          {/* Row 1: Clock + Phase */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <a href="/" className="text-gray-400 hover:text-white text-[10px] transition-colors mr-1">←</a>
              <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-[#1a1a1a] rounded">
                {phaseLabel[state.phase]}
              </span>
              <span className="text-[10px] text-gray-600">{state.matchType}</span>
            </div>
            <button
              onClick={resetMatch}
              className="text-[10px] text-gray-500 hover:text-[#992828] flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> 退出
            </button>
          </div>

          {/* Row 2: Clock + Score */}
          <div className="flex items-center justify-between">
            {/* Timer */}
            <button
              onClick={toggleClock}
              className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] rounded-lg px-3 py-1.5 transition"
            >
              {state.clockRunning ? (
                <Pause className="w-4 h-4 text-[#992828]" />
              ) : (
                <Play className="w-4 h-4 text-green-400" />
              )}
              <span className="text-xl font-mono font-bold text-white tabular-nums">
                {formatTime(state.matchTime)}
              </span>
            </button>

            {/* Score */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateScore("home", -1)}
                className="w-6 h-6 rounded bg-[#1a1a1a] hover:bg-[#222] flex items-center justify-center text-gray-400 text-xs"
              >
                −
              </button>
              <span className="text-lg font-bold text-white tabular-nums min-w-[2ch] text-center">
                {state.score.home}
              </span>
              <span className="text-gray-600 text-sm">:</span>
              <span className="text-lg font-bold text-white tabular-nums min-w-[2ch] text-center">
                {state.score.away}
              </span>
              <button
                onClick={() => updateScore("away", 1)}
                className="w-6 h-6 rounded bg-[#1a1a1a] hover:bg-[#222] flex items-center justify-center text-gray-400 text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Row 3: Stats */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> 均时 {avgMinutes}&apos;
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> 均距 ~{avgDistance}m
            </span>
            <span className="text-[8px] text-gray-600">估算</span>
            <span className="ml-auto flex items-center gap-1">
              <Users className="w-3 h-3" /> {fieldPlayers.length}+{benchPlayers.length}
            </span>
          </div>

          {/* Row 4: Action buttons */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleHalfTime}
              className="flex-1 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-lg text-xs text-white font-medium transition flex items-center justify-center gap-1"
            >
              <Flag className="w-3 h-3" />
              {state.phase === "first_half"
                ? "中场休息"
                : state.phase === "second_half"
                ? "结束比赛"
                : state.phase === "extra_time"
                ? "结束加时"
                : "暂停"}
            </button>
            {(state.phase === "half_time" && state.matchTime === 0) ||
            (state.phase === "second_half" && state.matchTime >= HALF_DURATION) ? (
              <button
                onClick={handleExtraTime}
                className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-lg text-xs text-yellow-400 transition flex items-center gap-1"
              >
                <Zap className="w-3 h-3" /> 加时
              </button>
            ) : null}
            <button
              onClick={undoLastSub}
              disabled={state.undoStack.length === 0}
              className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-40 border border-[#333] rounded-lg text-xs text-gray-400 transition flex items-center gap-1"
            >
              <Undo2 className="w-3 h-3" /> 撤销
            </button>
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div className="max-w-lg mx-auto px-3 mt-3 space-y-3">
        {/* ── FIELD PLAYERS ── */}
        <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between">
            <p className="text-[11px] text-gray-400 font-medium">
              场上 ({fieldPlayers.length})
            </p>
            <span className="text-[9px] text-gray-600">点击球员换下</span>
          </div>
          <div className="divide-y divide-[#222]">
            {fieldPlayers.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-[10px] text-gray-600">无场上球员</p>
              </div>
            ) : (
              fieldPlayers.map((p) => {
                const load = getLoadStatus(p, state.phase);
                const lc = LOAD_COLORS[load];
                const est = estimateDistanceForPlayer(p, state.phase, isTrailing);
                const stintMinutes = Math.round(
                  (state.totalTime - (p.currentStintStart ?? state.totalTime)) / 60
                );
                return (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    bg="white"
                    loadColor={lc}
                    rightContent={
                      <div className="text-right shrink-0 min-w-[60px]">
                        <p className="text-xs text-white font-mono">
                          {stintMinutes}&apos;
                        </p>
                        <p className="text-[10px] text-gray-500">
                          ~{est.total}m
                        </p>
                      </div>
                    }
                    onTap={() => subPlayer(p.id)}
                    onNoteTap={() => {
                      setShowNotesInput(p.id);
                      setNoteText("");
                    }}
                    isTrailing={isTrailing}
                    phase={state.phase}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* ── BENCH PLAYERS ── */}
        <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between">
            <p className="text-[11px] text-gray-400 font-medium">
              替补席 ({benchPlayers.length})
            </p>
            <span className="text-[9px] text-gray-600">点击球员换上</span>
          </div>
          <div className="divide-y divide-[#222]">
            {benchPlayers.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-[10px] text-gray-600">替补席已空</p>
              </div>
            ) : (
              benchPlayers.map((p) => {
                const est = estimateDistanceForPlayer(p, state.phase, isTrailing);
                return (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    bg="grey"
                    rightContent={
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-500">未上场</p>
                        <p className="text-[9px] text-gray-600">
                          ~{est.mPerMin}m/min
                        </p>
                      </div>
                    }
                    onTap={() => subPlayer(p.id)}
                    onNoteTap={() => {
                      setShowNotesInput(p.id);
                      setNoteText("");
                    }}
                    isTrailing={isTrailing}
                    phase={state.phase}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* ── SUBBED OFF ── */}
        {subbedPlayers.length > 0 && (
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-blue-500/10 flex items-center justify-between">
              <p className="text-[11px] text-blue-300 font-medium">
                已换下 ({subbedPlayers.length})
              </p>
            </div>
            <div className="divide-y divide-blue-500/10">
              {subbedPlayers.map((p) => {
                const est = estimateDistanceForPlayer(p, state.phase, isTrailing);
                const totalMin = Math.round(p.timeOnField / 60);
                return (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    bg="blue"
                    rightContent={
                      <div className="text-right shrink-0 min-w-[60px]">
                        <p className="text-xs text-blue-300 font-mono">{totalMin}&apos;</p>
                        <p className="text-[10px] text-gray-500">~{est.total}m</p>
                      </div>
                    }
                    onTap={() => {}} // No action for subbed players
                    onNoteTap={() => {
                      setShowNotesInput(p.id);
                      setNoteText("");
                    }}
                    isTrailing={isTrailing}
                    phase={state.phase}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── SUB EVENTS LOG ── */}
        {subEvents.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-[#222]">
              <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                <History className="w-3 h-3" /> 换人记录
              </p>
            </div>
            <div className="divide-y divide-[#222] max-h-40 overflow-y-auto">
              {subEvents
                .slice()
                .reverse()
                .map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2 px-3 py-1.5 text-[10px]">
                    <span className="text-gray-500 font-mono">
                      {formatTime(ev.matchTime)}
                    </span>
                    {ev.playerOut !== "—" && (
                      <span className="text-red-400 flex items-center gap-0.5">
                        <ArrowDownRight className="w-2.5 h-2.5" />
                        {ev.playerOut}
                      </span>
                    )}
                    {ev.playerIn !== "—" && ev.playerOut !== "—" && (
                      <span className="text-gray-600">/</span>
                    )}
                    {ev.playerIn !== "—" && (
                      <span className="text-green-400 flex items-center gap-0.5">
                        <ArrowUpRight className="w-2.5 h-2.5" />
                        {ev.playerIn}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Quick finish button for 2nd half */}
        {state.phase === "second_half" && (
          <button
            onClick={finishMatch}
            className="w-full py-3.5 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Flag className="w-4 h-4" />
            结束比赛
          </button>
        )}

        {/* Saved message toast */}
        {savedMessage && (
          <div className="fixed bottom-4 left-4 right-4 flex justify-center z-30 pointer-events-none">
            <div className="bg-green-500 text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg">
              {savedMessage}
            </div>
          </div>
        )}
      </div>

      {/* ── NOTES MODAL ── */}
      {showNotesInput && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setShowNotesInput(null)}
        >
          <div
            className="bg-[#1a1a1a] border border-[#333] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-white">快速备注</p>
              <button
                onClick={() => setShowNotesInput(null)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && noteText.trim()) {
                  savePlayerNote(showNotesInput, noteText.trim());
                }
              }}
              placeholder="如：左膝不适、70min降速"
              className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-[#992828] outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              {["抽筋", "疲劳", "伤病", "射门"].map((kw) => (
                <button
                  key={kw}
                  onClick={() => savePlayerNote(showNotesInput, kw)}
                  className="flex-1 py-1.5 rounded-lg bg-[#0d0d0d] border border-[#333] text-[10px] text-gray-400 hover:text-white hover:border-[#555] transition"
                >
                  {kw}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                if (noteText.trim()) savePlayerNote(showNotesInput, noteText.trim());
              }}
              disabled={!noteText.trim()}
              className="w-full py-2.5 bg-[#992828] hover:bg-[#7a1e1e] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-xs font-bold transition"
            >
              保存备注
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// PlayerRow Component
// ═══════════════════════════════════════════

function PlayerRow({
  player,
  bg,
  loadColor,
  rightContent,
  onTap,
  onNoteTap,
  isTrailing,
  phase,
}: {
  player: MatchPlayer;
  bg: "white" | "grey" | "blue";
  loadColor?: { bg: string; dot: string; label: string };
  rightContent: React.ReactNode;
  onTap: () => void;
  onNoteTap: () => void;
  isTrailing: boolean;
  phase: MatchPhase;
}) {
  const bgClass =
    bg === "white"
      ? "bg-[#0d0d0d] active:bg-[#992828]/10"
      : bg === "blue"
      ? "bg-blue-500/5 active:bg-blue-500/15"
      : "bg-[#0d0d0d]/50 active:bg-[#333]/50";

  return (
    <button
      onClick={onTap}
      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition ${bgClass}`}
    >
      {/* Load dot (only for field players) */}
      {loadColor && (
        <div className={`w-2 h-2 rounded-full shrink-0 ${loadColor.dot}`} />
      )}

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-xs text-white font-medium truncate">{player.name}</p>
          <span className="text-[10px] text-gray-500 shrink-0">#{player.number}</span>
          {/* Note indicator */}
          {player.notes && (
            <span className="text-[10px] text-yellow-400 shrink-0" title={player.notes}>
              📝
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500">
            {POSITION_LABELS[player.position as Position] || getPositionGroupLabel(player.position)}
          </span>
          {loadColor && (
            <span className={`text-[9px] px-1 rounded ${loadColor.bg} text-gray-300`}>
              {loadColor.label}
            </span>
          )}
        </div>
      </div>

      {/* Notes button (16x16 touch target implied) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNoteTap();
        }}
        className="p-1.5 text-gray-600 hover:text-yellow-400 transition shrink-0"
        title="快速备注"
      >
        <StickyNote className="w-4 h-4" />
      </button>

      {/* Right content */}
      {rightContent}
    </button>
  );
}
