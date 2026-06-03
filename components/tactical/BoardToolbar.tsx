"use client";

import { MousePointer2, Circle, Type, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";

// ─── Design tokens ───────────────────────────────────────
const ACCENT = "#c82630";
const BAR_BG = "#16181e";
const BORDER = "#2a2d35";
const TEXT_DIM = "#6b6f78";
const TEXT_MAIN = "#c8ccd4";

// ─── Inline line-style icons ─────────────────────────────

function iconRun() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="16,7 11,3 11,11" fill="currentColor" />
    </svg>
  );
}
function iconPass() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
      <polygon points="16,7 11,3 11,11" fill="currentColor" />
    </svg>
  );
}
function iconStraight() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <polygon points="16,7 11,3.5 11,10.5" fill="currentColor" />
    </svg>
  );
}
function iconDribble() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <path d="M2 6 Q5 0 9 7 Q13 14 16 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="3 2" />
      <polygon points="16,7 11,3 11,11" fill="currentColor" />
    </svg>
  );
}

// ─── Tool definitions ────────────────────────────────────

interface ToolDef {
  id: string;
  label: string;
  icon?: React.ReactNode;
  iconFn?: () => React.ReactNode;
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "选择", icon: <MousePointer2 className="w-3.5 h-3.5" /> },
  { id: "place_player", label: "球员", icon: <Circle className="w-3.5 h-3.5" strokeWidth={2} /> },
  { id: "draw_run", label: "跑动", iconFn: iconRun },
  { id: "draw_pass", label: "传球", iconFn: iconPass },
  { id: "draw_curve", label: "直线", iconFn: iconStraight },
  { id: "draw_dribble", label: "带球", iconFn: iconDribble },
  { id: "add_text", label: "文字", icon: <Type className="w-3.5 h-3.5" strokeWidth={1.5} /> },
  { id: "erase", label: "删除", icon: <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /> },
];

const COLORS = ["#c82630","#2563eb","#121419","#ffffff","#eab308","#279e46","#f97316","#ef4444","#a855f7"];
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

  // ─── Collapsed mode ──────────────────────────────────

  if (collapsed) {
    return (
      <div className="flex-shrink-0" style={{ backgroundColor: BAR_BG, borderTop: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 px-3 py-1">
          <button onClick={() => setCollapsed(false)}
            className="flex items-center gap-1 text-[10px] transition-colors"
            style={{ color: TEXT_DIM }}
            onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; }}
          >
            <ChevronUp className="w-3 h-3" />
            <span>工具栏</span>
          </button>
          {route && (
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: TEXT_DIM }}>
              <svg width="24" height="4">
                <line x1="2" y1="2" x2="22" y2="2" stroke={p.activeColor} strokeWidth={route.width}
                  strokeDasharray={route.strokeDash?.join(",") || "none"} strokeLinecap="round" />
              </svg>
              {route.label}
            </div>
          )}
          <span className="text-[10px]" style={{ color: TEXT_DIM }}>
            {TOOLS.find(t => t.id === p.activeTool)?.label || ""}
          </span>
        </div>
      </div>
    );
  }

  // ─── Full toolbar ────────────────────────────────────

  return (
    <div className="flex-shrink-0" style={{ backgroundColor: BAR_BG, borderTop: `1px solid ${BORDER}` }}>
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(true)}
        className="w-full flex items-center justify-center h-4 transition-colors"
        style={{ color: TEXT_DIM }}
        onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; }}
      >
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Tool row */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 overflow-x-auto">
        {TOOLS.map((t) => {
          const isActive = p.activeTool === t.id;
          const icon = t.iconFn ? t.iconFn() : t.icon;
          return (
            <button
              key={t.id}
              onClick={() => p.onToolChange(t.id)}
              title={t.label}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors flex-shrink-0"
              style={{
                borderRadius: "6px",
                color: isActive ? ACCENT : TEXT_DIM,
                backgroundColor: "transparent",
                border: isActive ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = TEXT_MAIN;
                  e.currentTarget.style.backgroundColor = "#1e2128";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = TEXT_DIM;
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span style={{ color: isActive ? ACCENT : "currentColor" }}>{icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}

        {/* Separator */}
        <div className="w-px h-5 mx-1 flex-shrink-0" style={{ backgroundColor: BORDER }} />

        {/* Colors */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => p.onColorChange(c)}
              title={c}
              className="w-5 h-5 rounded-full transition-transform hover:scale-110 flex-shrink-0"
              style={{
                backgroundColor: c,
                border: p.activeColor === c ? `2px solid ${TEXT_MAIN}` : `2px solid ${BORDER}`,
                boxShadow: c === "#ffffff" ? `inset 0 0 0 1px ${BORDER}` : "none",
              }}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-5 mx-1 flex-shrink-0" style={{ backgroundColor: BORDER }} />

        {/* Formation */}
        <select
          onChange={(e) => { if (e.target.value) { p.onFormation(e.target.value); e.target.value = ""; } }}
          className="text-[10px] font-medium rounded-md px-2 py-1.5 flex-shrink-0 cursor-pointer transition-colors"
          style={{
            borderRadius: "6px",
            backgroundColor: "transparent",
            border: `1.5px solid ${BORDER}`,
            color: TEXT_DIM,
          }}
          defaultValue=""
        >
          <option value="" disabled>阵型</option>
          {FORMATIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        <div className="flex-1 min-w-[4px]" />

        {/* Actions */}
        <button
          onClick={p.onUndo} disabled={!p.canUndo}
          className="p-1.5 flex-shrink-0 transition-colors disabled:opacity-25 rounded-md"
          style={{ color: TEXT_DIM, borderRadius: "6px" }}
          onMouseEnter={(e) => { if (p.canUndo) e.currentTarget.style.color = TEXT_MAIN; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; }}
          title="撤销"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
        <button
          onClick={p.onRedo} disabled={!p.canRedo}
          className="p-1.5 flex-shrink-0 transition-colors disabled:opacity-25 rounded-md"
          style={{ color: TEXT_DIM, borderRadius: "6px" }}
          onMouseEnter={(e) => { if (p.canRedo) e.currentTarget.style.color = TEXT_MAIN; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; }}
          title="重做"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </button>
        <button
          onClick={p.onClear}
          className="px-2 py-1.5 text-[10px] font-medium flex-shrink-0 rounded-md transition-colors"
          style={{ color: TEXT_DIM, borderRadius: "6px" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.backgroundColor = "#1e2128"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          清空
        </button>
        <button
          onClick={p.onExport}
          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-md transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ backgroundColor: ACCENT, color: "#fff", borderRadius: "6px" }}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="hidden sm:inline">导出</span>
        </button>
      </div>

      {/* Route style indicator */}
      {route && (
        <div className="flex items-center gap-1.5 px-3 py-0.5 text-[10px]"
          style={{ backgroundColor: "rgba(0,0,0,0.2)", borderTop: `1px solid ${BORDER}`, color: TEXT_DIM }}>
          <svg width="32" height="6">
            <line x1="2" y1="3" x2="28" y2="3" stroke={p.activeColor} strokeWidth={route.width}
              strokeDasharray={route.strokeDash?.join(",") || "none"} strokeLinecap="round" />
          </svg>
          当前：{route.label}
        </div>
      )}
    </div>
  );
}
