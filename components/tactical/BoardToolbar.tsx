"use client";

import { MousePointer2, Circle, Type, Trash2, ChevronUp, ChevronDown, ZoomIn, ZoomOut, Pen } from "lucide-react";
import { useState } from "react";
import { TAC_THEME } from "@/lib/tactical-theme";

const ACCENT = TAC_THEME.accent;
const BAR_BG = TAC_THEME.bgToolbar;
const BORDER = TAC_THEME.border;
const TEXT_DIM = TAC_THEME.textDim;
const TEXT_MAIN = TAC_THEME.textMain;
const BG_HOVER = TAC_THEME.bgHover;
const ERROR = TAC_THEME.error;
const ACTIVE_BG = "#992828";

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
  { id: "draw_free", label: "绘图", icon: <Pen className="w-3.5 h-3.5" strokeWidth={1.5} /> },
  { id: "erase", label: "删除", icon: <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /> },
];

const COLORS = [TAC_THEME.accent, TAC_THEME.blue, "#121419", "#ffffff", "#eab308", TAC_THEME.success, "#f97316", TAC_THEME.error, "#a855f7"];
const QUICK_FORMATIONS = ["4-2-3-1","5-4-1","4-3-3","4-4-2","3-5-2"];

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
  onExport: () => void; onFormation?: (f: string) => void; onClear: () => void;
  onZoomIn?: () => void; onZoomOut?: () => void;
  lockPlayers?: boolean; onLockPlayersChange?: (v: boolean) => void;
  lockRoutes?: boolean; onLockRoutesChange?: (v: boolean) => void;
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
        {/* ── Group 1: [选择 | 球员] ── */}
        {TOOLS.slice(0, 2).map((t) => {
          const isActive = p.activeTool === t.id;
          const icon = t.iconFn ? t.iconFn() : t.icon;
          return (
            <button
              key={t.id}
              onClick={() => p.onToolChange(t.id)}
              title={t.label}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium flex-shrink-0"
              style={{
                borderRadius: "6px",
                color: isActive ? "#fff" : TEXT_DIM,
                backgroundColor: isActive ? ACTIVE_BG : "transparent",
                border: isActive ? `1px solid ${ACTIVE_BG}` : "1px solid transparent",
                transition: "all 150ms",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = TEXT_MAIN;
                  e.currentTarget.style.backgroundColor = BG_HOVER;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = TEXT_DIM;
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span style={{ color: isActive ? "#fff" : "currentColor" }}>{icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-6 mx-0.5 flex-shrink-0" style={{ backgroundColor: BORDER }} />

        {/* ── Group 2: [跑动 | 传球 | 直线 | 带球] ── */}
        {TOOLS.slice(2, 6).map((t) => {
          const isActive = p.activeTool === t.id;
          const icon = t.iconFn ? t.iconFn() : t.icon;
          return (
            <button
              key={t.id}
              onClick={() => p.onToolChange(t.id)}
              title={t.label}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium flex-shrink-0"
              style={{
                borderRadius: "6px",
                color: isActive ? "#fff" : TEXT_DIM,
                backgroundColor: isActive ? ACTIVE_BG : "transparent",
                border: isActive ? `1px solid ${ACTIVE_BG}` : "1px solid transparent",
                transition: "all 150ms",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = TEXT_MAIN;
                  e.currentTarget.style.backgroundColor = BG_HOVER;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = TEXT_DIM;
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span style={{ color: isActive ? "#fff" : "currentColor" }}>{icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-6 mx-0.5 flex-shrink-0" style={{ backgroundColor: BORDER }} />

        {/* ── Group 3: [文字 | 绘图 | 删除] ── */}
        {TOOLS.slice(6, 9).map((t) => {
          const isActive = p.activeTool === t.id;
          const icon = t.iconFn ? t.iconFn() : t.icon;
          return (
            <button
              key={t.id}
              onClick={() => p.onToolChange(t.id)}
              title={t.label}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium flex-shrink-0"
              style={{
                borderRadius: "6px",
                color: isActive ? "#fff" : TEXT_DIM,
                backgroundColor: isActive ? ACTIVE_BG : "transparent",
                border: isActive ? `1px solid ${ACTIVE_BG}` : "1px solid transparent",
                transition: "all 150ms",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = TEXT_MAIN;
                  e.currentTarget.style.backgroundColor = BG_HOVER;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = TEXT_DIM;
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span style={{ color: isActive ? "#fff" : "currentColor" }}>{icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-6 mx-1 flex-shrink-0" style={{ backgroundColor: BORDER }} />

        {/* ── Formation pills (only when onFormation provided) ── */}
        {p.onFormation && (
          <>
            <div className="flex items-center gap-1 flex-shrink-0">
              {QUICK_FORMATIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => p.onFormation!(f)}
                  title={`阵型 ${f}`}
                  className="px-2 py-1.5 rounded-full text-[11px] font-bold tracking-wide flex-shrink-0"
                  style={{
                    backgroundColor: "#1a1d24",
                    color: TEXT_MAIN,
                    border: `1px solid ${BORDER}`,
                    transition: "all 150ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#22252d";
                    e.currentTarget.style.borderColor = ACCENT;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#1a1d24";
                    e.currentTarget.style.borderColor = BORDER;
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-5 mx-1 flex-shrink-0" style={{ backgroundColor: BORDER }} />
          </>
        )}

        {/* ── Colors ── */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => p.onColorChange(c)}
              title={c}
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{
                backgroundColor: c,
                border: p.activeColor === c ? `1.5px solid ${TEXT_MAIN}` : `1px solid ${BORDER}`,
                boxShadow: c === "#ffffff" ? `inset 0 0 0 1px ${BORDER}` : "none",
                transition: "transform 150ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            />
          ))}
        </div>

        <div className="flex-1 min-w-[4px]" />

        {/* Divider */}
        <div className="w-px h-6 mx-1 flex-shrink-0" style={{ backgroundColor: BORDER }} />

        {/* ── Undo / Redo ── */}
        <button
          onClick={p.onUndo} disabled={!p.canUndo}
          className="p-1.5 flex-shrink-0 disabled:opacity-25 rounded-md"
          style={{ color: TEXT_DIM, borderRadius: "6px", transition: "all 150ms" }}
          onMouseEnter={(e) => { if (p.canUndo) { e.currentTarget.style.color = TEXT_MAIN; e.currentTarget.style.backgroundColor = BG_HOVER; } }}
          onMouseLeave={(e) => { if (p.canUndo) { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.backgroundColor = "transparent"; } }}
          title="撤销"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
        <button
          onClick={p.onRedo} disabled={!p.canRedo}
          className="p-1.5 flex-shrink-0 disabled:opacity-25 rounded-md"
          style={{ color: TEXT_DIM, borderRadius: "6px", transition: "all 150ms" }}
          onMouseEnter={(e) => { if (p.canRedo) { e.currentTarget.style.color = TEXT_MAIN; e.currentTarget.style.backgroundColor = BG_HOVER; } }}
          onMouseLeave={(e) => { if (p.canRedo) { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.backgroundColor = "transparent"; } }}
          title="重做"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px h-6 mx-1 flex-shrink-0" style={{ backgroundColor: BORDER }} />

        {/* ── Layer Lock Toggles (before zoom, always visible) ── */}
        {p.onLockPlayersChange && p.onLockRoutesChange && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => p.onLockPlayersChange?.(!p.lockPlayers)}
              title={p.lockPlayers ? "解锁球员" : "锁定球员"}
              className="px-1 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-0.5"
              style={{
                color: p.lockPlayers ? "#fff" : TEXT_DIM,
                backgroundColor: p.lockPlayers ? ACTIVE_BG : "transparent",
                border: p.lockPlayers ? `1px solid ${ACTIVE_BG}` : `1px solid ${BORDER}`,
                borderRadius: "4px",
              }}
            >{p.lockPlayers ? "🔒" : "🔓"}</button>
            <button
              onClick={() => p.onLockRoutesChange?.(!p.lockRoutes)}
              title={p.lockRoutes ? "解锁线路" : "锁定线路"}
              className="px-1 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-0.5"
              style={{
                color: p.lockRoutes ? "#fff" : TEXT_DIM,
                backgroundColor: p.lockRoutes ? ACTIVE_BG : "transparent",
                border: p.lockRoutes ? `1px solid ${ACTIVE_BG}` : `1px solid ${BORDER}`,
                borderRadius: "4px",
              }}
            >{p.lockRoutes ? "🔒" : "🔓"}</button>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-6 mx-1 flex-shrink-0" style={{ backgroundColor: BORDER }} />

        {/* ── Zoom controls ── */}
        {p.onZoomIn && p.onZoomOut && (
          <div className="flex items-center gap-0.5 rounded-md p-0.5 flex-shrink-0" style={{ backgroundColor: TAC_THEME.bgCard, borderRadius: TAC_THEME.radius }}>
            <button onClick={p.onZoomOut} className="p-1 rounded flex items-center justify-center" style={{ color: TEXT_DIM, borderRadius: "4px", transition: "all 150ms" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = TEXT_MAIN; e.currentTarget.style.backgroundColor = BG_HOVER; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.backgroundColor = "transparent"; }}
              title="缩小">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={p.onZoomIn} className="p-1 rounded flex items-center justify-center" style={{ color: TEXT_DIM, borderRadius: "4px", transition: "all 150ms" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = TEXT_MAIN; e.currentTarget.style.backgroundColor = BG_HOVER; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.backgroundColor = "transparent"; }}
              title="放大">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-6 mx-1 flex-shrink-0" style={{ backgroundColor: BORDER }} />

        {/* ── Clear / Export ── */}
        <button
          onClick={p.onClear}
          className="px-2 py-1.5 text-[10px] font-medium flex-shrink-0 rounded-md"
          style={{ color: TEXT_DIM, borderRadius: "6px", transition: "all 150ms" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = ERROR; e.currentTarget.style.backgroundColor = BG_HOVER; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          清空
        </button>
        <button
          onClick={p.onExport}
          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-md flex-shrink-0"
          style={{ backgroundColor: "transparent", color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: TAC_THEME.radius, transition: "opacity 150ms" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
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
