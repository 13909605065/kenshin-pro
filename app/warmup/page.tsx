"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Canvas, Rect, Circle, Line, Group, IText, Triangle, FabricImage,
  type FabricObject,
} from "fabric";
import {
  Save, Download, Trash2, Plus, ChevronDown, ChevronUp,
  Zap, Clock, FileText, Loader2,
} from "lucide-react";

/* ───────────────────────────────────────────
   Types
   ─────────────────────────────────────────── */

interface Segment {
  id: string;
  name: string;
  duration: number; // minutes
}

interface WarmupDesign {
  id: string;
  name: string;
  duration: number;
  /** Warmup description — free text, coach types whatever */
  description: string;
  hasEquipmentFreeVariant?: boolean;
  segments: Segment[];
  canvasJSON: object;
  notes: string;
  equipmentCount: Record<string, number>;
  injuryNotes: string;
  createdAt: string;
  updatedAt: string;
}

/* ───────────────────────────────────────────
   Constants
   ─────────────────────────────────────────── */

const CANVAS_W = 1050;
const CANVAS_H = 680;

const LIBRARY_KEY = "kenshin_warmup_library";
const CALENDAR_KEY = "kenshin_warmup_calendar";

/** Cone PNG files — randomly picked on each add for color variety */
const CONE_PNGS = ["橙色标志盘.png", "红色标志盘.png", "黄色标志盘.png", "蓝色标志盘.png"];

/** Pitch background image path */
const PITCH_PNG = "/equipment/场地.png";

/** @deprecated — cone/pole/hoop/hurdle now use PNGs.
 *  Remaining entries still used by shape factories (ladder, band, player, arrow). */
const EQUIPMENT_COLORS: Record<string, string> = {
  cone: "#f97316",
  pole: "#d92525",
  ladder: "#fbbf24",
  hoop: "#ffffff",
  hurdle: "#facc15",
  band: "#c084fc",
  player: "#3b82f6",
  arrow: "#d92525",
};

const EQUIPMENT_LABEL_CN: Record<string, string> = {
  cone: "标志盘",
  pole: "标志杆",
  ladder: "绳梯",
  hoop: "敏捷圈",
  hurdle: "栏架",
  band: "弹力带",
  player: "球员站位",
};

/** Count equipment types from a fabric canvas JSON snapshot */
function countEquipmentFromJSON(canvasJSON: Record<string, unknown>): Record<string, number> {
  const counts: Record<string, number> = { cone: 0, pole: 0, ladder: 0, hoop: 0, hurdle: 0, band: 0, player: 0 };
  const objects = (canvasJSON as { objects?: Array<Record<string, unknown>> }).objects;
  if (!objects) return counts;

  for (const obj of objects) {
    if (obj.selectable === false) continue;

    const objType = obj.type as string | undefined;
    const src = obj.src as string | undefined;

    // Image-based equipment (PNG) — NEW
    if (objType === "image" && src) {
      if (src.includes("标志盘")) { counts.cone++; continue; }
      if (src.includes("角旗杆")) { counts.pole++; continue; }
      if (src.includes("圆形环")) { counts.hoop++; continue; }
      if (src.includes("栏架")) { counts.hurdle++; continue; }
      continue;
    }

    const fill = obj.fill as string | undefined;
    const stroke = obj.stroke as string | undefined;
    const width = obj.width as number | undefined;

    // Cone: Circle with orange fill (legacy shape)
    if (objType === "circle" && fill === "#f97316") {
      counts.cone++; continue;
    }
    // Pole: Rect with red fill, narrow (legacy shape)
    if (objType === "rect" && fill === "#d92525" && width !== undefined && width < 15) {
      counts.pole++; continue;
    }
    // Hoop: Circle with white stroke, transparent fill (legacy shape)
    if (objType === "circle" && stroke === "#ffffff" && fill === "transparent") {
      counts.hoop++; continue;
    }
    // Groups — inspect sub-objects to identify type
    if (objType === "group") {
      const subObjects = (obj as { objects?: Array<Record<string, unknown>> }).objects;
      if (!subObjects || subObjects.length === 0) continue;

      const firstFillable = subObjects.find((o: Record<string, unknown>) => typeof o.fill === "string");
      const firstLine = subObjects.find((o: Record<string, unknown>) => o.type === "line" || typeof o.stroke === "string");

      const subFill = firstFillable?.fill as string | undefined;
      const subStroke = firstLine?.stroke as string | undefined;

      if (subFill === "#fbbf24") counts.ladder++;
      else if (subFill === "#facc15") counts.hurdle++;
      else if (subFill === "#3b82f6") counts.player++;
      else if (subStroke === "#c084fc") counts.band++;
    }
  }
  return counts;
}

/** Transform canvas JSON to equipment-free variant (body-weight markers) */
function transformCanvasToEquipmentFree(canvasJSON: Record<string, unknown>): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(canvasJSON)) as { objects?: Array<Record<string, unknown>> };
  if (!cloned.objects) return cloned;

  const newObjects: Array<Record<string, unknown>> = [];

  for (const obj of cloned.objects) {
    // Keep pitch markings unchanged
    if (obj.selectable === false) {
      newObjects.push(obj); continue;
    }

    const objType = obj.type as string | undefined;
    const src = obj.src as string | undefined;

    // Image-based equipment → floor markers (NEW PNG handling)
    if (objType === "image" && src) {
      if (src.includes("标志盘")) {
        newObjects.push({
          ...obj, type: "circle", radius: 8, fill: "#ef4444", stroke: "", strokeWidth: 0, src: undefined,
        });
        continue;
      }
      if (src.includes("角旗杆")) {
        newObjects.push({
          ...obj,
          type: "rect", width: 30, height: 3,
          fill: "rgba(255,255,255,0.6)", stroke: "",
          rx: 0, ry: 0, src: undefined,
          top: (obj.top as number || 0) + 30,
        });
        continue;
      }
      if (src.includes("圆形环")) {
        newObjects.push({
          ...obj, type: "circle", radius: 18, fill: "transparent",
          stroke: "#ffffff", strokeWidth: 2,
          strokeDashArray: [6, 4], src: undefined,
        });
        continue;
      }
      if (src.includes("栏架")) {
        newObjects.push({
          ...obj,
          type: "rect", width: 40, height: 3,
          fill: "rgba(255,255,255,0.5)", stroke: "", src: undefined,
          top: (obj.top as number || 0) + 15,
        });
        continue;
      }
      newObjects.push(obj); continue;
    }

    const fill = obj.fill as string | undefined;
    const stroke = obj.stroke as string | undefined;
    const width = obj.width as number | undefined;

    // Cone → small floor dot
    if (objType === "circle" && fill === "#f97316") {
      newObjects.push({ ...obj, radius: 8, fill: "#ef4444", stroke: "", strokeWidth: 0 });
      continue;
    }
    // Pole → tape line on ground
    if (objType === "rect" && fill === "#d92525" && width !== undefined && width < 15) {
      newObjects.push({
        ...obj,
        width: 30, height: 3,
        fill: "rgba(255,255,255,0.6)", stroke: "",
        rx: 0, ry: 0,
        top: (obj.top as number || 0) + 30,
      });
      continue;
    }
    // Hoop → dashed ground circle
    if (objType === "circle" && stroke === "#ffffff" && fill === "transparent") {
      newObjects.push({ ...obj, strokeDashArray: [6, 4], strokeWidth: 2 });
      continue;
    }
    // Groups
    if (objType === "group") {
      const subObjects = (obj as { objects?: Array<Record<string, unknown>> }).objects;
      if (!subObjects || subObjects.length === 0) { newObjects.push(obj); continue; }

      const firstFillable = subObjects.find((o: Record<string, unknown>) => typeof o.fill === "string");
      const firstLine = subObjects.find((o: Record<string, unknown>) => o.type === "line" || typeof o.stroke === "string");
      const subFill = firstFillable?.fill as string | undefined;
      const subStroke = firstLine?.stroke as string | undefined;

      // Ladder (yellow) → tape marks
      if (subFill === "#fbbf24") {
        const transSubs = subObjects.map((sub: Record<string, unknown>) => {
          if (sub.type === "rect") {
            return { ...sub, height: 3, fill: "rgba(255,255,255,0.5)", stroke: "", strokeWidth: 0 };
          }
          return sub;
        });
        newObjects.push({ ...obj, objects: transSubs });
        continue;
      }
      // Hurdle (yellow) → flat floor lines
      if (subFill === "#facc15") {
        const transSubs = subObjects.map((sub: Record<string, unknown>) => {
          if (sub.type === "rect") {
            if ((sub.height as number) <= 4) return sub; // base plate stays
            return { ...sub, height: 3, fill: "rgba(255,255,255,0.5)", stroke: "", strokeWidth: 0, top: (sub.top as number || 0) + 15 };
          }
          return sub;
        });
        newObjects.push({ ...obj, objects: transSubs });
        continue;
      }
      // Band (purple lines) → remove
      if (subStroke === "#c084fc") continue;
    }
    // Default: keep as-is (players, arrows, etc.)
    newObjects.push(obj);
  }

  cloned.objects = newObjects;
  return cloned;
}

/* ───────────────────────────────────────────
   Fabric object factories
   ─────────────────────────────────────────── */

async function createCone(): Promise<FabricImage> {
  const file = CONE_PNGS[Math.floor(Math.random() * CONE_PNGS.length)];
  const img = await FabricImage.fromURL(`/equipment/${file}`);
  img.set({
    left: CANVAS_W / 2 - 20 + (Math.random() - 0.5) * 100,
    top: CANVAS_H / 2 - 20 + (Math.random() - 0.5) * 80,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
  });
  img.scaleToWidth(40);
  return img;
}

async function createPole(): Promise<FabricImage> {
  const img = await FabricImage.fromURL("/equipment/角旗杆.png");
  img.set({
    left: CANVAS_W / 2 - 5 + (Math.random() - 0.5) * 100,
    top: CANVAS_H / 2 - 35 + (Math.random() - 0.5) * 80,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
  });
  img.scaleToWidth(30);
  return img;
}

function createLadder(): Group {
  const railLeft = new Rect({
    left: 0, top: 0, width: 4, height: 80,
    fill: EQUIPMENT_COLORS.ladder, stroke: "#d97706", strokeWidth: 0.5,
  });
  const railRight = new Rect({
    left: 40, top: 0, width: 4, height: 80,
    fill: EQUIPMENT_COLORS.ladder, stroke: "#d97706", strokeWidth: 0.5,
  });
  const rungs: Rect[] = [];
  for (let i = 0; i < 6; i++) {
    rungs.push(new Rect({
      left: 2, top: 6 + i * 14, width: 40, height: 3,
      fill: EQUIPMENT_COLORS.ladder, stroke: "#d97706", strokeWidth: 0.5,
    }));
  }
  const g = new Group([railLeft, railRight, ...rungs], {
    left: CANVAS_W / 2 - 22 + (Math.random() - 0.5) * 100,
    top: CANVAS_H / 2 - 40 + (Math.random() - 0.5) * 80,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
  });
  return g;
}

async function createHoop(): Promise<FabricImage> {
  const img = await FabricImage.fromURL("/equipment/圆形环.png");
  img.set({
    left: CANVAS_W / 2 - 25 + (Math.random() - 0.5) * 100,
    top: CANVAS_H / 2 - 25 + (Math.random() - 0.5) * 80,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
  });
  img.scaleToWidth(50);
  return img;
}

async function createHurdle(): Promise<FabricImage> {
  const file = Math.random() > 0.5 ? "小栏架.png" : "高栏架.png";
  const img = await FabricImage.fromURL(`/equipment/${file}`);
  img.set({
    left: CANVAS_W / 2 - 40 + (Math.random() - 0.5) * 100,
    top: CANVAS_H / 2 - 30 + (Math.random() - 0.5) * 80,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
  });
  img.scaleToWidth(80);
  return img;
}

function createBand(): Group {
  // Wavy resistance band using a series of line segments
  const segments: Line[] = [];
  const points = 7;
  const segWidth = 80 / (points - 1);
  const amp = 10;
  for (let i = 0; i < points - 1; i++) {
    const x1 = i * segWidth;
    const y1 = Math.sin((i / (points - 1)) * Math.PI * 2.5) * amp;
    const x2 = (i + 1) * segWidth;
    const y2 = Math.sin(((i + 1) / (points - 1)) * Math.PI * 2.5) * amp;
    segments.push(new Line([x1, y1, x2, y2], {
      stroke: EQUIPMENT_COLORS.band,
      strokeWidth: 4,
      strokeLineCap: "round",
      strokeLineJoin: "round",
    }));
  }
  const g = new Group(segments, {
    left: CANVAS_W / 2 - 40 + (Math.random() - 0.5) * 100,
    top: CANVAS_H / 2 + (Math.random() - 0.5) * 80,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
  });
  return g;
}

let playerCounter = 1;
function createPlayer(num?: number): Group {
  const n = num ?? playerCounter++;
  const circle = new Circle({
    left: -14, top: -14, radius: 14,
    fill: EQUIPMENT_COLORS.player,
    stroke: "#1d4ed8",
    strokeWidth: 1.5,
  });
  const text = new IText(String(n), {
    left: -6, top: -8,
    fontSize: 14,
    fontWeight: "bold",
    fill: "#ffffff",
    fontFamily: "Inter, system-ui, sans-serif",
  });
  const g = new Group([circle, text], {
    left: CANVAS_W / 2 - 14 + (Math.random() - 0.5) * 100,
    top: CANVAS_H / 2 - 14 + (Math.random() - 0.5) * 80,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
  });
  return g;
}

function createArrow(): Group {
  const shaft = new Line([0, 0, 50, 0], {
    stroke: EQUIPMENT_COLORS.arrow,
    strokeWidth: 3,
    strokeLineCap: "round",
  });
  const head = new Triangle({
    left: 44, top: -8,
    width: 16, height: 16,
    fill: EQUIPMENT_COLORS.arrow,
    angle: 90,
  });
  const g = new Group([shaft, head], {
    left: CANVAS_W / 2 - 28 + (Math.random() - 0.5) * 100,
    top: CANVAS_H / 2 - 8 + (Math.random() - 0.5) * 80,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
  });
  return g;
}

/** Set the pitch background image on a Fabric canvas.
 *  Replaces the old drawPitch() which drew all lines/arcs with Fabric shapes. */
async function setPitchBackground(canvas: Canvas): Promise<void> {
  try {
    const img = await FabricImage.fromURL(PITCH_PNG);
    img.set({
      left: 0,
      top: 0,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
    });
    img.scaleToWidth(CANVAS_W);
    img.scaleToHeight(CANVAS_H);
    canvas.backgroundImage = img;
    canvas.renderAll();
  } catch (e) {
    console.error("Failed to load pitch background:", e);
    // Fallback: the green backgroundColor from canvas init stays visible
  }
}

/* ───────────────────────────────────────────
   LocalStorage helpers
   ─────────────────────────────────────────── */

function loadLibrary(): WarmupDesign[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLibrary(library: WarmupDesign[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  } catch (e) {
    console.error("Failed to save warmup library:", e);
  }
}

function generateId(): string {
  return "warmup_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

/* ───────────────────────────────────────────
   Sub-components
   ─────────────────────────────────────────── */

/** Left toolbar — equipment buttons */
function Toolbar({
  onAddObject,
}: {
  onAddObject: (factory: () => FabricObject | Promise<FabricObject>) => void;
}) {
  const tools = [
    { label: "标志盘", emoji: "🟤", factory: createCone },
    { label: "标志杆", emoji: "🔴", factory: createPole },
    { label: "绳梯", emoji: "🪜", factory: createLadder },
    { label: "敏捷圈", emoji: "⭕", factory: createHoop },
    { label: "栏架", emoji: "🚧", factory: createHurdle },
    { label: "弹力带", emoji: "〰️", factory: createBand },
    { label: "球员站位", emoji: "👤", factory: () => createPlayer() },
    { label: "行进箭头", emoji: "➡️", factory: createArrow },
  ];

  return (
    <div className="flex flex-col gap-1 p-2 bg-[#1e1e1e] border border-[#222] rounded-xl">
      <span className="text-[10px] text-gray-500 font-semibold px-2 pt-1 pb-1 text-center">
        器材
      </span>
      {tools.map((tool) => (
        <button
          key={tool.label}
          onClick={() => onAddObject(tool.factory)}
          title={tool.label}
          className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-gray-300 hover:bg-[#252525] hover:text-white transition active:scale-95"
        >
          <span className="text-xl leading-none">{tool.emoji}</span>
          <span className="text-[9px] font-medium text-gray-400 leading-tight text-center">
            {tool.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Config panel — right side */
function ConfigPanel({
  name, setName,
  duration, setDuration,
  description, setDescription,
  notes, setNotes,
  injuryEnabled, setInjuryEnabled,
  injuryNotesText, setInjuryNotesText,
}: {
  name: string; setName: (v: string) => void;
  duration: number; setDuration: (v: number) => void;
  description: string; setDescription: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  injuryEnabled: boolean; setInjuryEnabled: (v: boolean) => void;
  injuryNotesText: string; setInjuryNotesText: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 bg-[#1e1e1e] border border-[#222] rounded-xl">
      <span className="text-xs text-gray-400 font-semibold">热身配置</span>

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-500 font-medium">热身名称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: MD-3 球场热身"
          className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d92525] transition"
        />
      </div>

      {/* Duration slider */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-500 font-medium">
          总时长: <span className="text-[#d92525] font-bold">{duration} 分钟</span>
        </label>
        <input
          type="range"
          min={5}
          max={25}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full accent-[#d92525] h-2"
        />
        <div className="flex justify-between text-[9px] text-gray-500">
          <span>5min</span>
          <span>15min</span>
          <span>25min</span>
        </div>
      </div>

      {/* Warmup description — free text */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-500 font-medium">热身描述</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="如: 2min弹力带 5min动态拉伸 8min有球敏捷 3min北欧弯举"
          className="w-full bg-[#121212] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-[#d92525]"
        />
      </div>

      {/* Injury player notes */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={injuryEnabled}
            onChange={(e) => setInjuryEnabled(e.target.checked)}
            className="w-4 h-4 accent-[#d92525] rounded"
          />
          <span className="text-xs text-gray-300">标注伤病球员替代动作</span>
        </label>
        {injuryEnabled && (
          <textarea
            value={injuryNotesText}
            onChange={(e) => setInjuryNotesText(e.target.value)}
            placeholder="伤病球员替代说明（将标注在场地布置图上）..."
            rows={3}
            className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d92525] transition resize-none"
          />
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-500 font-medium">备注</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="热身要点、注意事项..."
          rows={3}
          className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d92525] transition resize-none"
        />
      </div>
    </div>
  );
}

/** Segment editor */
function SegmentEditor({
  segments, setSegments,
  totalDuration, setTotalDuration,
}: {
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
  totalDuration: number;
  setTotalDuration: (v: number) => void;
}) {
  const segmentTotal = segments.reduce((s, seg) => s + seg.duration, 0);

  const addSegment = () => {
    const remaining = Math.max(1, totalDuration - segmentTotal);
    const newDuration = segments.length === 0
      ? Math.round(totalDuration / 3)
      : Math.min(remaining, Math.round(totalDuration / (segments.length + 1)));
    setSegments((prev) => [
      ...prev,
      {
        id: "seg_" + Date.now(),
        name: `环节 ${prev.length + 1}`,
        duration: Math.max(1, newDuration),
      },
    ]);
  };

  const removeSegment = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSegmentName = (id: string, name: string) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const updateSegmentDuration = (id: string, dur: number) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, duration: Math.max(1, dur) } : s))
    );
  };

  // Auto-scale segments when total duration changes
  const handleTotalChange = (newTotal: number) => {
    setTotalDuration(newTotal);
    if (segments.length > 0 && totalDuration > 0) {
      const ratio = newTotal / totalDuration;
      setSegments((prev) =>
        prev.map((s) => ({
          ...s,
          duration: Math.max(1, Math.round(s.duration * ratio)),
        }))
      );
    }
  };

  return (
    <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          时间轴分段
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${
            segmentTotal === totalDuration ? "text-green-400" : "text-[#d92525]"
          }`}>
            合计 {segmentTotal} / {totalDuration}分钟
          </span>
          <button
            onClick={addSegment}
            className="flex items-center gap-1 px-2 py-1 bg-[#d92525]/10 text-[#d92525] rounded-md text-xs font-medium hover:bg-[#d92525]/20 transition"
          >
            <Plus className="w-3 h-3" /> 添加环节
          </button>
        </div>
      </div>

      {segments.length === 0 && (
        <p className="text-xs text-gray-500 py-4 text-center">
          尚未添加热身环节，点击「添加环节」创建分段
        </p>
      )}

      <div className="flex flex-col gap-2">
        {segments.map((seg, idx) => (
          <div
            key={seg.id}
            className="flex items-center gap-2 p-2 bg-[#121212] rounded-lg border border-[#222]"
          >
            <span className="text-[10px] text-gray-500 w-5 text-center font-mono">
              {idx + 1}
            </span>
            <input
              type="text"
              value={seg.name}
              onChange={(e) => updateSegmentName(seg.id, e.target.value)}
              className="flex-1 px-2 py-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none border-b border-transparent focus:border-[#d92525] transition"
              placeholder="环节名称"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={seg.duration}
                min={1}
                max={totalDuration}
                onChange={(e) => updateSegmentDuration(seg.id, Number(e.target.value))}
                className="w-12 px-1.5 py-1 bg-[#1e1e1e] border border-[#333] rounded text-center text-xs text-white focus:outline-none focus:border-[#d92525]"
              />
              <span className="text-[10px] text-gray-500">min</span>
            </div>
            <button
              onClick={() => removeSegment(seg.id)}
              className="p-1 text-gray-500 hover:text-[#d92525] transition"
              title="删除环节"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Warmup Library Panel */
function WarmupLibrary({
  onLoad,
}: {
  onLoad: (design: WarmupDesign) => void;
}) {
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState<WarmupDesign[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLibrary(loadLibrary());
  }, [refreshKey]);

  const handleDelete = (id: string) => {
    const updated = library.filter((d) => d.id !== id);
    setLibrary(updated);
    saveLibrary(updated);
  };

  // Expose refresh via global event
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("warmup-library-refresh", handler);
    return () => window.removeEventListener("warmup-library-refresh", handler);
  }, []);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] border border-[#222] rounded-xl text-sm text-gray-300 hover:bg-[#252525] transition w-full lg:w-auto"
      >
        <FileText className="w-4 h-4" />
        热身库 ({library.length})
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="mt-2 bg-[#1e1e1e] border border-[#222] rounded-xl p-4">
          {library.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">
              暂无保存的热身方案
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {library.map((design) => (
                <div
                  key={design.id}
                  className="flex items-center justify-between p-3 bg-[#121212] rounded-lg border border-[#222] hover:border-[#444] transition group"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-white font-medium truncate">
                        {design.name || "未命名热身"}
                      </span>
                      {design.hasEquipmentFreeVariant && (
                        <span className="text-[10px] shrink-0" title="无器材变体">🔧</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {design.duration}min · {design.description.includes('') ? "" : ""}
                      {" · "}{design.segments.length}环节
                    </span>
                    {design.equipmentCount && Object.values(design.equipmentCount).some((c) => c > 0) && (
                      <span className="text-[9px] text-gray-500 truncate">
                        {Object.entries(design.equipmentCount)
                          .filter(([, c]) => c > 0)
                          .map(([key, count]) => `${EQUIPMENT_LABEL_CN[key] || key}×${count}`)
                          .join(" · ")}
                      </span>
                    )}
                    <span className="text-[9px] text-gray-600">
                      {design.updatedAt ? new Date(design.updatedAt).toLocaleDateString("zh-CN") : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => onLoad(design)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#252525] rounded transition"
                      title="加载"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(design.id)}
                      className="p-1.5 text-gray-400 hover:text-[#d92525] hover:bg-[#252525] rounded transition"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────
   Main page
   ─────────────────────────────────────────── */

export default function WarmupPage() {
  // Canvas refs
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scale for responsiveness
  const [scale, setScale] = useState(1);

  // Warmup config state
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(12);
  const [description, setDescription] = useState("");
  const [hasEquipmentFreeVariant, setHasEquipmentFreeVariant] = useState(false);
  const [notes, setNotes] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [currentLoadedId, setCurrentLoadedId] = useState<string | null>(null);
  const [injuryEnabled, setInjuryEnabled] = useState(false);
  const [injuryNotesText, setInjuryNotesText] = useState("");
  const [equipmentCount, setEquipmentCount] = useState<Record<string, number>>({});
  const injuryLabelRef = useRef<Group | null>(null);

  // Library refresh trigger
  const triggerLibraryRefresh = () => {
    window.dispatchEvent(new Event("warmup-library-refresh"));
  };

  // Update scale on resize
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const maxW = containerRef.current.clientWidth - 24; // padding
        const maxH = Math.max(400, window.innerHeight - 380);
        const sx = maxW / CANVAS_W;
        const sy = maxH / CANVAS_H;
        setScale(Math.min(sx, sy, 1));
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasElRef.current || fabricRef.current) return;

    const canvas = new Canvas(canvasElRef.current, {
      width: CANVAS_W,
      height: CANVAS_H,
      backgroundColor: "#1a8b3a",
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: true,
    });

    fabricRef.current = canvas;

    // Set pitch background image (replaces old drawPitch())
    setPitchBackground(canvas);

    // Equipment count tracking
    const refreshEquipCount = () => {
      try {
        const json = canvas.toJSON() as Record<string, unknown>;
        setEquipmentCount(countEquipmentFromJSON(json));
      } catch { /* ignore serialization errors */ }
    };
    canvas.on("object:added", refreshEquipCount);
    canvas.on("object:removed", refreshEquipCount);
    refreshEquipCount();

    // Delete key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && fabricRef.current) {
        // Don't delete if user is typing in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        const active = fabricRef.current.getActiveObject();
        if (active) {
          fabricRef.current.remove(active);
          fabricRef.current.discardActiveObject();
          fabricRef.current.renderAll();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Double-click to remove
    canvas.on("mouse:dblclick", (opt) => {
      const target = (opt as { target?: FabricObject }).target;
      if (target) {
        canvas.remove(target);
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Injury label on canvas — add/remove based on toggle
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Remove previous label if any
    if (injuryLabelRef.current) {
      try { canvas.remove(injuryLabelRef.current); } catch { /* already removed */ }
      injuryLabelRef.current = null;
    }

    // Add new label if injury mode is on and notes exist
    if (injuryEnabled && injuryNotesText.trim()) {
      const labelW = 240;
      const labelH = 30;
      const padX = 6;
      const padY = 4;

      const bg = new Rect({
        left: CANVAS_W - labelW - 10,
        top: CANVAS_H - labelH - 8,
        width: labelW,
        height: labelH,
        fill: "#dc2626",
        rx: 4,
        ry: 4,
        selectable: true,
        evented: true,
      });
      const text = new IText("\u{1F3A5} 伤病: " + injuryNotesText, {
        left: CANVAS_W - labelW - 10 + padX,
        top: CANVAS_H - labelH - 8 + padY,
        fontSize: 11,
        fill: "#ffffff",
        fontFamily: "Inter, system-ui, sans-serif",
        selectable: true,
        evented: true,
      });
      const group = new Group([bg, text], {
        left: 0,
        top: 0,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
      canvas.add(group);
      injuryLabelRef.current = group;
    }

    canvas.renderAll();
  }, [injuryEnabled, injuryNotesText]);

  // Add object to canvas (supports both sync and async factories)
  const handleAddObject = useCallback(async (factory: () => FabricObject | Promise<FabricObject>) => {
    if (!fabricRef.current) return;
    try {
      const obj = await factory();
      fabricRef.current.add(obj);
      fabricRef.current.setActiveObject(obj);
      fabricRef.current.renderAll();
    } catch (e) {
      console.error("Failed to create equipment object:", e);
    }
  }, []);

  // Save to localStorage
  const handleSave = useCallback(() => {
    if (!fabricRef.current) return;
    setSaveStatus("saving");

    try {
      const canvasJSON = fabricRef.current.toJSON();
      const now = new Date().toISOString();

      const design: WarmupDesign = {
        id: currentLoadedId || generateId(),
        name,
        duration,
        description,
        hasEquipmentFreeVariant,
        segments,
        canvasJSON: canvasJSON as object,
        notes,
        equipmentCount: countEquipmentFromJSON(canvasJSON as Record<string, unknown>),
        injuryNotes: injuryEnabled ? injuryNotesText : "",
        createdAt: now,
        updatedAt: now,
      };

      const library = loadLibrary();
      const existingIdx = library.findIndex((d) => d.id === design.id);

      if (existingIdx >= 0) {
        design.createdAt = library[existingIdx].createdAt;
        library[existingIdx] = design;
      } else {
        library.unshift(design);
        setCurrentLoadedId(design.id);
      }

      saveLibrary(library);
      setSaveStatus("saved");
      triggerLibraryRefresh();

      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error("Save failed:", e);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, [name, duration, description, hasEquipmentFreeVariant, segments, notes, currentLoadedId, injuryEnabled, injuryNotesText]);

  // Export PNG
  const handleExport = useCallback(() => {
    if (!fabricRef.current) return;
    const dataURL = fabricRef.current.toDataURL({
      format: "png",
      multiplier: 2,
    });

    const link = document.createElement("a");
    link.download = `${name || "warmup"}_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [name]);

  // Create equipment-free variant
  const handleCreateEquipmentFreeVariant = useCallback(() => {
    if (!fabricRef.current) return;
    setSaveStatus("saving");

    try {
      const canvasJSON = fabricRef.current.toJSON() as Record<string, unknown>;
      const variantJSON = transformCanvasToEquipmentFree(canvasJSON);
      const now = new Date().toISOString();

      const variantName = name ? `${name} [无器材]` : `球场热身 [无器材]`;

      const design: WarmupDesign = {
        id: generateId(),
        name: variantName,
        duration,
        description,
        hasEquipmentFreeVariant: true,
        segments,
        canvasJSON: variantJSON as object,
        notes: notes ? `${notes}\n\n[无器材变体 — 器材已替换为地面标记]` : "[无器材变体 — 器材已替换为地面标记]",
        equipmentCount: countEquipmentFromJSON(variantJSON),
        injuryNotes: injuryEnabled ? injuryNotesText : "",
        createdAt: now,
        updatedAt: now,
      };

      const library = loadLibrary();
      library.unshift(design);
      saveLibrary(library);

      // Also mark current design as having a variant
      if (currentLoadedId) {
        const mainIdx = library.findIndex((d) => d.id === currentLoadedId);
        if (mainIdx >= 0) {
          library[mainIdx] = { ...library[mainIdx], hasEquipmentFreeVariant: true };
          saveLibrary(library);
          setHasEquipmentFreeVariant(true);
        }
      }

      setSaveStatus("saved");
      triggerLibraryRefresh();
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error("Failed to create equipment-free variant:", e);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, [name, duration, description, segments, notes, currentLoadedId, injuryEnabled, injuryNotesText]);

  // Load from library
  const handleLoad = useCallback((design: WarmupDesign) => {
    if (!fabricRef.current) return;

    setName(design.name);
    setDuration(design.duration);
    setDescription(design.description);
    setHasEquipmentFreeVariant(design.hasEquipmentFreeVariant || false);
    setSegments(design.segments);
    setNotes(design.notes);
    setInjuryNotesText(design.injuryNotes || "");
    setInjuryEnabled(!!design.injuryNotes);
    setEquipmentCount(design.equipmentCount || {});
    setCurrentLoadedId(design.id);

    // Load canvas state
    const canvas = fabricRef.current;
    canvas.loadFromJSON(design.canvasJSON).then(() => {
      // For old designs without a pitch background image, add one
      if (!canvas.backgroundImage) {
        setPitchBackground(canvas);
      } else {
        canvas.renderAll();
      }
    }).catch((err) => {
      console.error("Failed to load canvas JSON:", err);
      // Clear canvas and set pitch background as fallback
      canvas.clear();
      setPitchBackground(canvas);
    });
  }, []);

  // New blank design
  const handleNew = useCallback(() => {
    if (!fabricRef.current) return;
    setName("");
    setDuration(12);
    setDescription("ball");
    setHasEquipmentFreeVariant(false);
    setSegments([]);
    setNotes("");
    setInjuryEnabled(false);
    setInjuryNotesText("");
    setEquipmentCount({});
    setCurrentLoadedId(null);
    injuryLabelRef.current = null;

    const canvas = fabricRef.current;
    canvas.clear();
    // Restore pitch background after clear
    setPitchBackground(canvas);
  }, []);

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-[#d92525] font-black text-sm"
              style={{ letterSpacing: "-0.5px" }}
            >
              KENSHIN<span className="text-[#d1d1d1] font-light">PRO</span>
            </a>
            <span className="text-gray-400 text-xs hidden sm:inline">/</span>
            <span className="text-white text-sm font-semibold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#d92525]" />
              热身设计
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNew}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#1e1e1e] rounded-lg transition"
            >
              新建
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d92525] text-white text-xs font-semibold rounded-lg hover:bg-[#b91c1c] transition disabled:opacity-50"
            >
              {saveStatus === "saving" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saveStatus === "saved" ? "已保存" : saveStatus === "error" ? "保存失败" : "保存"}
            </button>
            <button
              onClick={handleCreateEquipmentFreeVariant}
              disabled={saveStatus === "saving"}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] border border-[#333] text-gray-300 text-xs font-semibold rounded-lg hover:bg-[#252525] hover:border-[#d92525]/50 transition disabled:opacity-50"
              title="基于当前场地布置创建无器材版本（器材替换为地面标记）"
            >
              📦 创建无器材变体
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] border border-[#333] text-gray-300 text-xs font-semibold rounded-lg hover:bg-[#252525] transition"
            >
              <Download className="w-3.5 h-3.5" />
              导出PNG
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 pb-20 lg:pb-4">
        {/* Desktop layout: toolbar | canvas | config */}
        <div className="flex gap-3">
          {/* Left: Toolbar (hidden on mobile, shown as horizontal bar below) */}
          <div className="hidden lg:block flex-shrink-0">
            <Toolbar onAddObject={handleAddObject} />
          </div>

          {/* Center: Canvas + segments */}
          <div className="flex-1 min-w-0">
            {/* Mobile toolbar (horizontal scroll) */}
            <div className="lg:hidden mb-3 overflow-x-auto">
              <div className="flex gap-1 min-w-max p-2 bg-[#1e1e1e] border border-[#222] rounded-xl">
                {([
                  { label: "标志盘", emoji: "🟤", factory: createCone },
                  { label: "标志杆", emoji: "🔴", factory: createPole },
                  { label: "绳梯", emoji: "🪜", factory: createLadder },
                  { label: "敏捷圈", emoji: "⭕", factory: createHoop },
                  { label: "栏架", emoji: "🚧", factory: createHurdle },
                  { label: "弹力带", emoji: "〰️", factory: createBand },
                  { label: "球员", emoji: "👤", factory: () => createPlayer() },
                  { label: "箭头", emoji: "➡️", factory: createArrow },
                ] as const).map((tool) => (
                  <button
                    key={tool.label}
                    onClick={() => handleAddObject(tool.factory)}
                    className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-gray-300 hover:bg-[#252525] hover:text-white transition active:scale-95 flex-shrink-0"
                  >
                    <span className="text-lg leading-none">{tool.emoji}</span>
                    <span className="text-[9px] text-gray-400 leading-tight">
                      {tool.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas container */}
            <div
              ref={containerRef}
              className="bg-[#1e1e1e] border border-[#222] rounded-xl overflow-hidden flex items-center justify-center p-2"
              style={{ minHeight: 400 }}
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                }}
              >
                <canvas ref={canvasElRef} />
              </div>
            </div>

            {/* Segment editor */}
            <div className="mt-3">
              <SegmentEditor
                segments={segments}
                setSegments={setSegments}
                totalDuration={duration}
                setTotalDuration={setDuration}
              />
            </div>

            {/* Equipment checklist */}
            {Object.values(equipmentCount).some((c) => c > 0) && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#1e1e1e] border border-[#222] rounded-lg">
                <span className="text-xs text-gray-400 shrink-0">📋 器材清单:</span>
                <span className="text-xs text-gray-300">
                  {Object.entries(equipmentCount)
                    .filter(([, c]) => c > 0)
                    .map(([key, count]) => `${EQUIPMENT_LABEL_CN[key] || key}×${count}`)
                    .join(" · ")}
                </span>
              </div>
            )}
          </div>

          {/* Right: Config panel */}
          <div className="hidden lg:block flex-shrink-0 w-64">
            <ConfigPanel
              name={name}
              setName={setName}
              duration={duration}
              setDuration={setDuration}
              description={description}
              setDescription={setDescription}
              notes={notes}
              setNotes={setNotes}
              injuryEnabled={injuryEnabled}
              setInjuryEnabled={setInjuryEnabled}
              injuryNotesText={injuryNotesText}
              setInjuryNotesText={setInjuryNotesText}
            />
          </div>
        </div>

        {/* Mobile config panel (below canvas) */}
        <div className="lg:hidden mt-3">
          <ConfigPanel
            name={name}
            setName={setName}
            duration={duration}
            setDuration={setDuration}
            description={description}
            setDescription={setDescription}
            notes={notes}
            setNotes={setNotes}
            injuryEnabled={injuryEnabled}
            setInjuryEnabled={setInjuryEnabled}
            injuryNotesText={injuryNotesText}
            setInjuryNotesText={setInjuryNotesText}
          />
        </div>

        {/* Warmup library */}
        <WarmupLibrary onLoad={handleLoad} />
      </main>
    </div>
  );
}
