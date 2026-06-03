"use client";

import { MousePointer2, Circle, Type, Trash2, Spline, Waves, Minus, ArrowUpRight, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";

interface ToolDef {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "选择", shortLabel: "选择", icon: <MousePointer2 className="w-4 h-4" /> },
  { id: "place_player", label: "球员", shortLabel: "球员", icon: <Circle className="w-4 h-4" strokeWidth={2.5} /> },
  { id: "draw_run", label: "跑动", shortLabel: "跑动", icon: <Minus className="w-4 h-4" strokeWidth={2.5} /> },
  { id: "draw_pass", label: "传球", shortLabel: "传球", icon: <ArrowUpRight className="w-4 h-4" strokeWidth={2} /> },
  { id: "draw_curve", label: "直线", shortLabel: "直线", icon: <Spline className="w-4 h-4" strokeWidth={2} /> },
  { id: "draw_dribble", label: "带球", shortLabel: "带球", icon: <Waves className="w-4 h-4" strokeWidth={2} /> },
  { id: "add_text", label: "文字", shortLabel: "文字", icon: <Type className="w-4 h-4" strokeWidth={2} /> },
  { id: "erase", label: "删除", shortLabel: "删除", icon: <Trash2 className="w-4 h-4" strokeWidth={2} /> },
];

const COLORS = ["#FF2D55","#3B82F6","#000000","#FFFFFF","#FFD700","#00FF88","#FF6B00","#FF4444","#A855F7"];
const FORMATIONS = ["4-3-3","4-4-2","3-5-2","4-2-3-1","3-4-3"];

export const ROUTE_STYLES: Record<string, { strokeDash: number[] | null; width: number; label: string }> = {
  draw_run:     { strokeDash: null,    width: 4,   label: "实线跑动" },
  draw_pass:    { strokeDash: [4,4],   width: 3,   label: "点线传球" },
  draw_curve:   { strokeDash: null,    width: 3,   label: "自由直线" },
  draw_dribble: { strokeDash: [12,6],  width: 3.5, label: "曲线带球" },
};

interface Props {
  activeTool: string; onToolChange: (t: string) => void;
  activeColor: string; onColorChange: (c: string) => void;
  canUndo: boolean; canRedo: boolean;
  onUndo: () => void; onRedo: () => void;
  onExport: () => void; onFormation: (f: string) => void; onClear: () => void;
}

export function BoardToolbar(p: Props) {
  const route = ROUTE_STYLES[p.activeTool];
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="bg-pitch-700 border-t border-pitch-600 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-1">
          <button onClick={() => setCollapsed(false)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
            title="展开工具栏">
            <ChevronUp className="w-3.5 h-3.5" />
            <span className="text-[10px]">工具栏</span>
          </button>
          {route && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <svg width="28" height="6"><line x1="2" y1="3" x2="24" y2="3" stroke={p.activeColor} strokeWidth={route.width} strokeDasharray={route.strokeDash?.join(",")||"none"} strokeLinecap="round" /></svg>
              {route.label}
            </div>
          )}
          <span className="text-[10px] text-gray-600">{TOOLS.find(t=>t.id===p.activeTool)?.label||""}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-pitch-700 border-t border-pitch-600 flex-shrink-0">
      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(true)}
        className="w-full flex items-center justify-center h-4 text-gray-500 hover:text-white hover:bg-pitch-600 transition"
        title="折叠工具栏">
        <ChevronDown className="w-3 h-3" />
      </button>
      {/* Tool row — icon + label for clarity */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 overflow-x-auto flex-wrap">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => p.onToolChange(t.id)}
            title={t.label}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0 ${
              p.activeTool === t.id
                ? "bg-neon-pink text-white shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-pitch-600"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}

        <div className="w-px h-6 bg-pitch-600 mx-1 flex-shrink-0" />

        {/* Colors — compact row */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {COLORS.map((c) => (
            <button key={c} onClick={() => p.onColorChange(c)}
              title={c}
              className={`w-6 h-6 rounded-full border-2 transition hover:scale-110 flex-shrink-0 ${
                p.activeColor===c ? "border-white scale-110 ring-1 ring-white/30" : "border-pitch-500 hover:border-gray-400"
              }`}
              style={{backgroundColor:c}} />
          ))}
        </div>

        <div className="w-px h-6 bg-pitch-600 mx-1 flex-shrink-0" />

        {/* Formation + actions */}
        <select onChange={(e)=>{if(e.target.value){p.onFormation(e.target.value);e.target.value="";}}}
          className="bg-pitch-600 border border-pitch-500 rounded px-2 py-1.5 text-xs text-gray-300 flex-shrink-0" defaultValue="">
          <option value="" disabled>阵型</option>
          {FORMATIONS.map((f)=><option key={f} value={f}>{f}</option>)}
        </select>

        <div className="flex-1 min-w-[4px]" />

        <button onClick={p.onUndo} disabled={!p.canUndo}
          className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition flex-shrink-0" title="撤销">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
        </button>
        <button onClick={p.onRedo} disabled={!p.canRedo}
          className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition flex-shrink-0" title="重做">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
        </button>
        <button onClick={p.onClear}
          className="px-2 py-1.5 text-xs text-gray-400 hover:text-neon-red transition flex-shrink-0 rounded hover:bg-pitch-600">
          清空
        </button>
        <button onClick={p.onExport}
          className="flex items-center gap-1 px-3 py-1.5 bg-neon-pink text-black text-xs font-bold rounded-lg hover:bg-opacity-90 transition flex-shrink-0">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span className="hidden sm:inline">导出</span>
        </button>
      </div>

      {/* Route style indicator (compact) */}
      {route && (
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-pitch-800/50 border-t border-pitch-600 text-[10px] text-gray-400">
          <svg width="36" height="8"><line x1="2" y1="4" x2="32" y2="4" stroke={p.activeColor} strokeWidth={route.width} strokeDasharray={route.strokeDash?.join(",")||"none"} strokeLinecap="round" /></svg>
          当前：{route.label}
        </div>
      )}
    </div>
  );
}
