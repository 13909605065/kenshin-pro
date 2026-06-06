"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  Users, Download, RotateCw, X, GripHorizontal, MapPin,
  ArrowRight, Minus, Plus,
} from "lucide-react";
import { EXERCISE_LIBRARY, BODY_PART_LABELS } from "@/lib/exercise-data";
import type { ExerciseLibItem } from "@/lib/strength-types";

/* ───────────────────────────────────────────
   Constants
   ─────────────────────────────────────────── */

const SCALE = 50; // 1m = 50px in viewBox
const GYM_W = 20; // meters
const GYM_H = 15; // meters
const VB_W = GYM_W * SCALE; // 1000
const VB_H = GYM_H * SCALE; // 750

/* ───────────────────────────────────────────
   Types
   ─────────────────────────────────────────── */

interface StationDef {
  id: string;
  label: string;
  x: number; // meters
  y: number; // meters
  w: number; // meters
  h: number; // meters
  type: StationType;
  color: string;
}

type StationType = "squat" | "bench" | "dumbbell" | "cable" | "bodyweight" | "open" | "medball";

interface StationState extends StationDef {
  // runtime positioning (may differ from preset after drag)
  px: number; // current x in meters
  py: number; // current y in meters
}

interface PlacedExercise {
  exerciseId: string;
  stationId: string;
}

interface DragState {
  stationId: string | null;
  offsetXM: number; // offset from station corner to mouse in meters
  offsetYM: number;
}

/* ───────────────────────────────────────────
   Preset Equipment Stations
   ─────────────────────────────────────────── */

const PRESET_STATIONS: StationDef[] = [
  { id: "squat_1", label: "深蹲架①", x: 0.5, y: 0.5, w: 2.5, h: 2.5, type: "squat", color: "#4a90d9" },
  { id: "squat_2", label: "深蹲架②", x: 0.5, y: 4, w: 2.5, h: 2.5, type: "squat", color: "#4a90d9" },
  { id: "bench_1", label: "卧推架①", x: 8, y: 0.5, w: 3, h: 2.5, type: "bench", color: "#e8913a" },
  { id: "bench_2", label: "卧推架②", x: 12, y: 0.5, w: 3, h: 2.5, type: "bench", color: "#e8913a" },
  { id: "dumbbell", label: "哑铃区", x: 0.5, y: 7.5, w: 4, h: 3, type: "dumbbell", color: "#50b86c" },
  { id: "cable_1", label: "龙门架①", x: 10, y: 4, w: 3, h: 3, type: "cable", color: "#9b59b6" },
  { id: "cable_2", label: "龙门架②", x: 14, y: 4, w: 3, h: 3, type: "cable", color: "#9b59b6" },
  { id: "pull_up", label: "引体架", x: 4.5, y: 0.5, w: 2.5, h: 1.5, type: "bodyweight", color: "#e74c3c" },
  { id: "open", label: "自由区域", x: 5, y: 7.5, w: 8, h: 5.5, type: "open", color: "#555555" },
  { id: "med_ball", label: "药球区", x: 16.5, y: 0.5, w: 2.5, h: 2.5, type: "medball", color: "#f39c12" },
];

const STATION_TYPE_LABELS: Record<StationType, string> = {
  squat: "深蹲架",
  bench: "卧推架",
  dumbbell: "哑铃",
  cable: "龙门架",
  bodyweight: "自重",
  open: "自由区",
  medball: "药球",
};

/* ───────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────── */

function getExercise(id: string): ExerciseLibItem | undefined {
  return EXERCISE_LIBRARY.find((e) => e.id === id);
}

function getExerciseName(id: string): string {
  return getExercise(id)?.name || id;
}

/** Map equipment type to preferred station type */
function mapEquipmentToStationType(equipment: string): StationType | null {
  const map: Record<string, StationType> = {
    barbell: "squat",
    dumbbell: "dumbbell",
    cable: "cable",
    bodyweight: "bodyweight",
    machine: "cable",
    kettlebell: "dumbbell",
    med_ball: "medball",
    band: "open",
    bosu: "open",
    bench: "bench",
    other: "open",
  };
  return map[equipment] || null;
}

/* ───────────────────────────────────────────
   Sub-component: Station on the SVG
   ─────────────────────────────────────────── */

function StationRect({
  station,
  isDragTarget,
  assignedExercises,
  groupLabels,
  onMouseDown,
  onClickStation,
  onRemoveExercise,
}: {
  station: StationState;
  isDragTarget: boolean;
  assignedExercises: string[];
  groupLabels: string[];
  onMouseDown: (e: React.MouseEvent, stationId: string) => void;
  onClickStation: (stationId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
}) {
  const x = station.px * SCALE;
  const y = station.py * SCALE;
  const w = station.w * SCALE;
  const h = station.h * SCALE;
  const cx = x + w / 2;
  const cy = y + h / 2;

  return (
    <g className="cursor-pointer">
      {/* Station rect */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={station.color}
        fillOpacity={isDragTarget ? 0.35 : 0.15}
        stroke={isDragTarget ? "#992828" : station.color}
        strokeWidth={isDragTarget ? 2.5 : 1.5}
        strokeDasharray={station.type === "open" ? "8 4" : "none"}
        onClick={(e) => { e.stopPropagation(); onClickStation(station.id); }}
        onMouseDown={(e) => onMouseDown(e, station.id)}
        style={{ cursor: "grab" }}
      />

      {/* Drag handle indicator top-left */}
      <rect
        x={x + 4}
        y={y + 4}
        width={18}
        height={14}
        rx={3}
        fill={station.color}
        fillOpacity={0.4}
        onMouseDown={(e) => onMouseDown(e, station.id)}
        style={{ cursor: "grab" }}
      />
      <GripHorizontal
        size={10}
        x={x + 8}
        y={y + 6}
        color="white"
        opacity={0.6}
        onMouseDown={(e: any) => onMouseDown(e, station.id)}
        style={{ cursor: "grab", pointerEvents: "none" }}
      />

      {/* Station label */}
      <text
        x={cx}
        y={cy - (assignedExercises.length > 0 ? 10 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={13}
        fontWeight={600}
        style={{ pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
      >
        {station.label}
      </text>

      {/* Assigned exercise labels */}
      {assignedExercises.map((eid, i) => (
        <g key={eid}>
          <rect
            x={x + 6}
            y={cy + 2 + i * 20}
            width={w - 12}
            height={18}
            rx={4}
            fill="#1a1a1a"
            fillOpacity={0.85}
            stroke={station.color}
            strokeWidth={0.5}
          />
          <text
            x={x + 12}
            y={cy + 14 + i * 20}
            fill="#ccc"
            fontSize={10}
            style={{ pointerEvents: "none" }}
          >
            {getExerciseName(eid).length > 8
              ? getExerciseName(eid).slice(0, 7) + "…"
              : getExerciseName(eid)}
          </text>
          {/* Remove button */}
          <rect
            x={x + w - 20}
            y={cy + 4 + i * 20}
            width={14}
            height={14}
            rx={3}
            fill="transparent"
            onClick={(ev) => { ev.stopPropagation(); onRemoveExercise(eid); }}
            style={{ cursor: "pointer" }}
          />
          <text
            x={x + w - 13}
            y={cy + 14 + i * 20}
            fill="#999"
            fontSize={10}
            fontWeight={700}
            onClick={(ev: any) => { ev.stopPropagation(); onRemoveExercise(eid); }}
            style={{ cursor: "pointer" }}
          >
            ×
          </text>
        </g>
      ))}

      {/* Group rotation indicators */}
      {groupLabels.length > 0 && (
        <g>
          {groupLabels.map((label, i) => {
            const gx = x + w - 14;
            const gy = y + 4 + i * 18;
            return (
              <g key={label}>
                <circle
                  cx={gx}
                  cy={gy}
                  r={7}
                  fill="#992828"
                  stroke="#fff"
                  strokeWidth={0.8}
                />
                <text
                  x={gx}
                  y={gy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={8}
                  fontWeight={700}
                  style={{ pointerEvents: "none" }}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
}

/* ───────────────────────────────────────────
   Main Layout Component
   ─────────────────────────────────────────── */

export function GymLayout({
  selectedIds,
}: {
  selectedIds: string[];
}) {
  // Station positions (editable by drag)
  const [stations, setStations] = useState<StationState[]>(() =>
    PRESET_STATIONS.map((s) => ({ ...s, px: s.x, py: s.y })),
  );

  // Exercises placed on stations: stationId -> exerciseId[]
  const [placements, setPlacements] = useState<Record<string, string[]>>({});

  // Currently selected exercise from the unplaced list
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);

  // Drag state for station repositioning
  const [drag, setDrag] = useState<DragState | null>(null);

  // People count
  const [peopleCount, setPeopleCount] = useState<number>(12);

  // SVG ref for coordinate transform and PNG export
  const svgRef = useRef<SVGSVGElement>(null);

  // Reset placements when selectedIds change (removed exercises)
  useEffect(() => {
    setPlacements((prev) => {
      const next: Record<string, string[]> = {};
      let changed = false;
      for (const [sid, eids] of Object.entries(prev)) {
        const filtered = eids.filter((eid) => selectedIds.includes(eid));
        if (filtered.length > 0) next[sid] = filtered;
        if (filtered.length !== eids.length) changed = true;
      }
      // If nothing changed and no new keys, return prev to avoid re-render
      if (!changed && Object.keys(next).length === Object.keys(prev).length) return prev;
      return next;
    });
    setActiveExerciseId(null);
  }, [selectedIds]);

  // Compute unplaced exercise IDs
  const placedExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const eids of Object.values(placements)) {
      for (const eid of eids) ids.add(eid);
    }
    return ids;
  }, [placements]);

  const unplacedIds = useMemo(
    () => selectedIds.filter((id) => !placedExerciseIds.has(id)),
    [selectedIds, placedExerciseIds],
  );

  // Stations that have exercises assigned
  const activeStations = useMemo(
    () => stations.filter((s) => (placements[s.id]?.length || 0) > 0),
    [stations, placements],
  );

  // Group calculation
  const groupInfo = useMemo(() => {
    const n = activeStations.length;
    if (n === 0 || peopleCount === 0) return { groupCount: 0, groups: [] as { label: string; stationIds: string[] }[] };

    // Groups = number of active stations (each station is a rotation point)
    const groupCount = Math.min(n, Math.max(1, Math.ceil(peopleCount / 4)));
    const peoplePerGroup = Math.ceil(peopleCount / groupCount);

    const groups: { label: string; stationIds: string[] }[] = [];
    for (let g = 0; g < groupCount; g++) {
      // Rotate starting station per group
      const label = String.fromCharCode(65 + g); // A, B, C, ...
      const stationIds: string[] = [];
      for (let i = 0; i < n; i++) {
        const idx = (g + i) % n;
        stationIds.push(activeStations[idx].id);
      }
      groups.push({ label, stationIds });
    }

    return { groupCount, groups, peoplePerGroup };
  }, [activeStations, peopleCount]);

  // Which groups start at each station
  const stationGroupMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const g of groupInfo.groups) {
      const startStation = g.stationIds[0];
      if (!map[startStation]) map[startStation] = [];
      map[startStation].push(g.label);
    }
    return map;
  }, [groupInfo]);

  // ── Handlers ──

  // Click an unplaced exercise to select it
  const handleSelectExercise = useCallback((id: string) => {
    setActiveExerciseId((prev) => (prev === id ? null : id));
  }, []);

  // Click a station to assign the active exercise
  const handleClickStation = useCallback(
    (stationId: string) => {
      if (!activeExerciseId) return;
      setPlacements((prev) => {
        const existing = prev[stationId] || [];
        // Don't duplicate
        if (existing.includes(activeExerciseId)) return prev;
        // Remove from any other station
        const next: Record<string, string[]> = {};
        for (const [sid, eids] of Object.entries(prev)) {
          const filtered = eids.filter((eid) => eid !== activeExerciseId);
          if (filtered.length > 0 || sid === stationId) {
            next[sid] = sid === stationId ? [...filtered, activeExerciseId] : filtered;
          }
        }
        if (!next[stationId]) next[stationId] = [activeExerciseId];
        return next;
      });
      setActiveExerciseId(null);
    },
    [activeExerciseId],
  );

  // Remove exercise from station
  const handleRemoveExercise = useCallback((exerciseId: string) => {
    setPlacements((prev) => {
      const next: Record<string, string[]> = {};
      for (const [sid, eids] of Object.entries(prev)) {
        const filtered = eids.filter((eid) => eid !== exerciseId);
        if (filtered.length > 0) next[sid] = filtered;
      }
      return next;
    });
  }, []);

  // Station drag handlers
  const handleStationMouseDown = useCallback(
    (e: React.MouseEvent, stationId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const svg = svgRef.current;
      if (!svg) return;

      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgPt = pt.matrixTransform(ctm.inverse());

      const st = stations.find((s) => s.id === stationId);
      if (!st) return;

      const mx = svgPt.x / SCALE;
      const my = svgPt.y / SCALE;

      setDrag({
        stationId,
        offsetXM: mx - st.px,
        offsetYM: my - st.py,
      });
    },
    [stations],
  );

  // Global mouse move for station dragging
  useEffect(() => {
    if (!drag) return;

    const handleMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;

      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgPt = pt.matrixTransform(ctm.inverse());

      const newXM = svgPt.x / SCALE - drag.offsetXM;
      const newYM = svgPt.y / SCALE - drag.offsetYM;

      // Clamp within gym bounds
      const st = stations.find((s) => s.id === drag.stationId);
      if (!st) return;

      const clampedX = Math.max(0, Math.min(GYM_W - st.w, newXM));
      const clampedY = Math.max(0, Math.min(GYM_H - st.h, newYM));

      setStations((prev) =>
        prev.map((s) =>
          s.id === drag.stationId ? { ...s, px: clampedX, py: clampedY } : s,
        ),
      );
    };

    const handleUp = () => {
      setDrag(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [drag, stations]);

  // Reset stations to preset positions
  const handleResetStations = useCallback(() => {
    setStations(PRESET_STATIONS.map((s) => ({ ...s, px: s.x, py: s.y })));
  }, []);

  // Clear all placements
  const handleClearPlacements = useCallback(() => {
    setPlacements({});
    setActiveExerciseId(null);
  }, []);

  // Auto-place: try to assign each exercise to a matching station type
  const handleAutoPlace = useCallback(() => {
    const next: Record<string, string[]> = {};
    const stationByType: Record<string, string[]> = {};
    for (const s of stations) {
      if (!stationByType[s.type]) stationByType[s.type] = [];
      stationByType[s.type].push(s.id);
    }

    // Count assignments per station for load balancing
    const counts: Record<string, number> = {};
    for (const s of stations) counts[s.id] = 0;

    for (const eid of unplacedIds) {
      const ex = getExercise(eid);
      if (!ex) continue;
      const preferredType = mapEquipmentToStationType(ex.equipment);
      // Find stations of preferred type
      const candidates = preferredType
        ? (stationByType[preferredType] || [])
        : [];

      // If no matching station, try open area
      const fallback = stationByType["open"] || [];
      const targetList = candidates.length > 0 ? candidates : fallback;

      if (targetList.length === 0) continue;

      // Pick least-loaded station
      targetList.sort((a, b) => (counts[a] || 0) - (counts[b] || 0));
      const target = targetList[0];

      if (!next[target]) next[target] = [];
      next[target].push(eid);
      counts[target] = (counts[target] || 0) + 1;
    }

    setPlacements((prev) => {
      const merged: Record<string, string[]> = {};
      const allStationIds = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));
      for (let i = 0; i < allStationIds.length; i++) {
        const sid = allStationIds[i];
        const prevList = prev[sid] || [];
        const nextList = next[sid] || [];
        merged[sid] = [...prevList, ...nextList];
      }
      return merged;
    });
  }, [unplacedIds, stations]);

  // ── PNG Export ──
  const handleExportPNG = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clone SVG and inline styles
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // Add white background for export
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("x", "0");
    bgRect.setAttribute("y", "0");
    bgRect.setAttribute("width", String(VB_W));
    bgRect.setAttribute("height", String(VB_H));
    bgRect.setAttribute("fill", "#121212");
    clone.insertBefore(bgRect, clone.firstChild);

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // 2x resolution for retina
      canvas.width = VB_W * 2;
      canvas.height = VB_H * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); return; }
      ctx.scale(2, 2);
      ctx.fillStyle = "#121212";
      ctx.fillRect(0, 0, VB_W, VB_H);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) { URL.revokeObjectURL(url); return; }
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `训练站布局_${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  // ── Rotation arrow data ──
  const rotationArrows = useMemo(() => {
    if (groupInfo.groups.length === 0 || activeStations.length < 2) return [];
    // Draw arrows connecting stations in rotation order for group A
    const firstGroup = groupInfo.groups[0];
    const arrows: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const orderedStations = firstGroup.stationIds
      .map((sid) => stations.find((s) => s.id === sid))
      .filter((s): s is StationState => !!s);

    for (let i = 0; i < orderedStations.length; i++) {
      const from = orderedStations[i];
      const to = orderedStations[(i + 1) % orderedStations.length];
      const fx = (from.px + from.w / 2) * SCALE;
      const fy = (from.py + from.h / 2) * SCALE;
      const tx = (to.px + to.w / 2) * SCALE;
      const ty = (to.py + to.h / 2) * SCALE;
      arrows.push({ x1: fx, y1: fy, x2: tx, y2: ty });
    }
    return arrows;
  }, [groupInfo, activeStations, stations]);

  // Is any station the current drag target for assignment
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

  // ── Render ──
  return (
    <div className="bg-[#121212] rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 border-b border-[#222] bg-[#1a1a1a]">
        <MapPin className="w-4 h-4 text-[#992828] shrink-0" />
        <span className="text-sm font-bold text-white shrink-0">训练站布局</span>
        <span className="text-[10px] text-gray-500">
          已放置 {placedExerciseIds.size}/{selectedIds.length} 个动作 · {activeStations.length} 个站点
        </span>

        <div className="flex-1" />

        {/* People count */}
        <div className="flex items-center gap-2 shrink-0">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[10px] text-gray-500">人数:</span>
          <button
            onClick={() => setPeopleCount((n) => Math.max(1, n - 1))}
            className="p-1 text-gray-400 hover:text-white rounded"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            value={peopleCount}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1) setPeopleCount(v);
            }}
            className="w-14 px-2 py-1 bg-[#121212] border border-[#333] rounded text-xs text-white text-center focus:outline-none focus:border-[#992828]"
            min={1}
            max={60}
          />
          <button
            onClick={() => setPeopleCount((n) => Math.min(60, n + 1))}
            className="p-1 text-gray-400 hover:text-white rounded"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Group info */}
        {groupInfo.groupCount > 0 && (
          <span className="text-[10px] text-gray-400 shrink-0">
            {groupInfo.groupCount}组 × ~{groupInfo.peoplePerGroup}人
          </span>
        )}

        {/* Actions */}
        <button
          onClick={handleResetStations}
          className="flex items-center gap-1 px-2 py-1.5 text-[10px] text-gray-400 hover:text-white bg-[#121212] border border-[#333] rounded-lg transition shrink-0"
          title="重置器材位置"
        >
          <RotateCw className="w-3 h-3" />
          重置位置
        </button>
        <button
          onClick={handleExportPNG}
          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold text-white bg-[#992828] hover:bg-[#b91c1c] rounded-lg transition shrink-0"
        >
          <Download className="w-3 h-3" />
          导出PNG
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 p-3">
        {/* SVG Floor Plan */}
        <div className="flex-1 min-w-0">
          <div className="bg-[#0d0d0d] border border-[#222] rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              style={{ display: "block" }}
              onMouseMove={(e) => {
                if (activeExerciseId && svgRef.current) {
                  const svg = svgRef.current;
                  const pt = svg.createSVGPoint();
                  pt.x = e.clientX;
                  pt.y = e.clientY;
                  const ctm = svg.getScreenCTM();
                  if (!ctm) return;
                  const svgPt = pt.matrixTransform(ctm.inverse());
                  // Find station under cursor
                  const mx = svgPt.x / SCALE;
                  const my = svgPt.y / SCALE;
                  const found = stations.find(
                    (s) => mx >= s.px && mx <= s.px + s.w && my >= s.py && my <= s.py + s.h,
                  );
                  setHoveredStation(found?.id || null);
                }
              }}
              onClick={() => {
                if (activeExerciseId && hoveredStation) {
                  handleClickStation(hoveredStation);
                } else {
                  setActiveExerciseId(null);
                }
              }}
            >
              <defs>
                {/* Grid pattern */}
                <pattern
                  id="gridPattern"
                  width={SCALE}
                  height={SCALE}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`}
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth={1}
                  />
                </pattern>
                {/* Sub-grid (every 5m) */}
                <pattern
                  id="gridMajor"
                  width={SCALE * 5}
                  height={SCALE * 5}
                  patternUnits="userSpaceOnUse"
                >
                  <rect width={SCALE * 5} height={SCALE * 5} fill="url(#gridPattern)" />
                  <path
                    d={`M ${SCALE * 5} 0 L 0 0 0 ${SCALE * 5}`}
                    fill="none"
                    stroke="#252525"
                    strokeWidth={1.5}
                  />
                </pattern>
                {/* Arrow marker */}
                <marker
                  id="arrowHead"
                  viewBox="0 0 10 10"
                  refX={5}
                  refY={5}
                  markerWidth={6}
                  markerHeight={6}
                  orient="auto-start-reverse"
                >
                  <path d="M 0 2 L 8 5 L 0 8 Z" fill="#992828" />
                </marker>
              </defs>

              {/* Background */}
              <rect x={0} y={0} width={VB_W} height={VB_H} fill="#0d0d0d" />

              {/* Grid */}
              <rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#gridMajor)" />

              {/* Outer wall */}
              <rect
                x={2}
                y={2}
                width={VB_W - 4}
                height={VB_H - 4}
                fill="none"
                stroke="#333"
                strokeWidth={4}
                rx={4}
              />

              {/* Wall label */}

              {/* Dimension labels */}
              <text
                x={VB_W / 2}
                y={12}
                textAnchor="middle"
                fill="#555"
                fontSize={11}
                style={{ pointerEvents: "none" }}
              >
                20m
              </text>
              <text
                x={VB_W / 2}
                y={VB_H - 4}
                textAnchor="middle"
                fill="#555"
                fontSize={11}
                style={{ pointerEvents: "none" }}
              >
                20m
              </text>
              <text
                x={8}
                y={VB_H / 2}
                textAnchor="middle"
                fill="#555"
                fontSize={11}
                transform={`rotate(-90, 8, ${VB_H / 2})`}
                style={{ pointerEvents: "none" }}
              >
                15m
              </text>
              <text
                x={VB_W - 8}
                y={VB_H / 2}
                textAnchor="middle"
                fill="#555"
                fontSize={11}
                transform={`rotate(90, ${VB_W - 8}, ${VB_H / 2})`}
                style={{ pointerEvents: "none" }}
              >
                15m
              </text>

              {/* Entrance marker */}
              <g transform={`translate(${VB_W / 2 - 30}, 4)`}>
                <rect x={0} y={0} width={60} height={8} rx={2} fill="none" stroke="#44aa44" strokeWidth={2} />
                <text x={30} y={-3} textAnchor="middle" fill="#44aa44" fontSize={9} style={{ pointerEvents: "none" }}>
                  入口
                </text>
              </g>

              {/* Rotation arrows */}
              {rotationArrows.map((arrow, i) => (
                <g key={`arrow-${i}`}>
                  {/* Curved arrow path */}
                  <path
                    d={(() => {
                      const dx = arrow.x2 - arrow.x1;
                      const dy = arrow.y2 - arrow.y1;
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      const midX = (arrow.x1 + arrow.x2) / 2;
                      const midY = (arrow.y1 + arrow.y2) / 2;
                      // Offset perpendicular to direction
                      const perpX = -dy / (dist || 1) * 30;
                      const perpY = dx / (dist || 1) * 30;
                      return `M ${arrow.x1} ${arrow.y1} Q ${midX + perpX} ${midY + perpY} ${arrow.x2} ${arrow.y2}`;
                    })()}
                    fill="none"
                    stroke="#992828"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    markerEnd="url(#arrowHead)"
                    opacity={0.6}
                  />
                </g>
              ))}

              {/* Station rectangles */}
              {stations.map((st) => {
                const assigned = placements[st.id] || [];
                const groupsAtStation = stationGroupMap[st.id] || [];
                const isTarget =
                  hoveredStation === st.id ||
                  (activeExerciseId !== null && hoveredStation === st.id);
                return (
                  <StationRect
                    key={st.id}
                    station={st}
                    isDragTarget={!!drag && drag.stationId === st.id}
                    assignedExercises={assigned}
                    groupLabels={groupsAtStation}
                    onMouseDown={handleStationMouseDown}
                    onClickStation={handleClickStation}
                    onRemoveExercise={handleRemoveExercise}
                  />
                );
              })}

              {/* Hover highlight when selecting exercise to place */}
              {activeExerciseId && (
                <text
                  x={VB_W / 2}
                  y={VB_H - 20}
                  textAnchor="middle"
                  fill="#992828"
                  fontSize={12}
                  style={{ pointerEvents: "none" }}
                >
                  点击站点放置「{getExerciseName(activeExerciseId)}」
                </text>
              )}

              {/* Scale indicator */}
              <g transform={`translate(${VB_W - 110}, ${VB_H - 30})`}>
                <rect x={0} y={0} width={100} height={20} rx={3} fill="#1a1a1a" fillOpacity={0.8} />
                <line x1={8} y1={10} x2={8 + SCALE} y2={10} stroke="#888" strokeWidth={3} />
                <line x1={8} y1={6} x2={8} y2={14} stroke="#888" strokeWidth={1.5} />
                <line x1={8 + SCALE} y1={6} x2={8 + SCALE} y2={14} stroke="#888" strokeWidth={1.5} />
                <text x={8 + SCALE / 2} y={19} textAnchor="middle" fill="#888" fontSize={9}>
                  1m
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Right sidebar: Exercise placement */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
          {/* Unplaced exercises */}
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden flex flex-col max-h-[300px] lg:max-h-none lg:flex-1">
            <div className="p-2.5 border-b border-[#222] flex items-center justify-between">
              <span className="text-xs font-bold text-white">待放置动作</span>
              <span className="text-[10px] text-gray-500">{unplacedIds.length}个</span>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5">
              {unplacedIds.length === 0 && placedExerciseIds.size > 0 ? (
                <p className="text-[10px] text-gray-500 text-center py-8">
                  全部动作已放置
                </p>
              ) : unplacedIds.length === 0 && placedExerciseIds.size === 0 ? (
                <p className="text-[10px] text-gray-500 text-center py-8">
                  先从动作库选择训练动作
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {unplacedIds.map((eid) => {
                    const ex = getExercise(eid);
                    const isActive = activeExerciseId === eid;
                    return (
                      <button
                        key={eid}
                        onClick={() => handleSelectExercise(eid)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-left transition border ${
                          isActive
                            ? "bg-[#992828]/10 border-[#992828]/40 text-white"
                            : "bg-[#121212] border-transparent hover:border-[#333] text-gray-300"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-medium block truncate">
                            {ex?.name || eid}
                          </span>
                          {ex && (
                            <span className="text-[9px] text-gray-500">
                              {BODY_PART_LABELS[ex.body_part] || ex.body_part} · {ex.equipment}
                            </span>
                          )}
                        </div>
                        {isActive && (
                          <MapPin className="w-3.5 h-3.5 text-[#992828] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="p-2 border-t border-[#222] space-y-1.5">
              <button
                onClick={handleAutoPlace}
                disabled={unplacedIds.length === 0}
                className="w-full py-1.5 text-[10px] font-medium text-gray-300 bg-[#121212] border border-[#333] rounded-lg hover:bg-[#252525] hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                自动分配到站点
              </button>
              <button
                onClick={handleClearPlacements}
                disabled={placedExerciseIds.size === 0}
                className="w-full py-1.5 text-[10px] font-medium text-gray-400 hover:text-[#992828] bg-transparent border border-[#333]/50 rounded-lg hover:border-[#992828]/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                清除全部放置
              </button>
            </div>
          </div>

          {/* Rotation legend */}
          {groupInfo.groups.length > 0 && (
            <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden">
              <div className="p-2.5 border-b border-[#222]">
                <span className="text-xs font-bold text-white">轮换顺序</span>
              </div>
              <div className="p-2 space-y-1.5 max-h-[200px] overflow-y-auto">
                {groupInfo.groups.map((group) => (
                  <div key={group.label} className="flex items-center gap-2 p-2 bg-[#121212] rounded-lg">
                    <div className="w-5 h-5 rounded-full bg-[#992828] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {group.label}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap min-w-0">
                      {group.stationIds.map((sid, i) => {
                        const st = stations.find((s) => s.id === sid);
                        return (
                          <span key={sid} className="flex items-center gap-0.5">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{
                                backgroundColor: st ? st.color + "22" : "#222",
                                color: st?.color || "#888",
                              }}
                            >
                              {st?.label || sid}
                            </span>
                            {i < group.stationIds.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden">
            <div className="p-2.5 border-b border-[#222]">
              <span className="text-xs font-bold text-white">器材图例</span>
            </div>
            <div className="p-2 flex flex-wrap gap-1.5">
              {Object.entries(STATION_TYPE_LABELS).map(([type, label]) => {
                const st = PRESET_STATIONS.find((s) => s.type === type);
                const color = st?.color || "#888";
                return (
                  <span
                    key={type}
                    className="text-[9px] px-2 py-1 rounded font-medium inline-flex items-center gap-1"
                    style={{ backgroundColor: color + "22", color }}
                  >
                    <span
                      className="w-2 h-2 rounded-sm inline-block"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
