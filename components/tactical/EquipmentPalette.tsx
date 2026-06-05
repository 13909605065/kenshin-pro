"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, X, Check, Package, Users, Map } from "lucide-react";
import { TAC_THEME } from "@/lib/tactical-theme";

// ─── Design tokens ───────────────────────────────────────
const ACCENT = TAC_THEME.accent;
const BLUE = TAC_THEME.blue;
const GREEN = TAC_THEME.success;
const BG = TAC_THEME.bg;
const CARD_BG = TAC_THEME.bgCard;
const BG_HOVER = TAC_THEME.bgHover;
const BORDER = TAC_THEME.border;
const TEXT_DIM = TAC_THEME.textDim;
const TEXT_MAIN = TAC_THEME.textMain;

// ─── Professional SVG equipment icons (2px stroke, linear minimal) ──

function IconBall() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="11" stroke={TEXT_DIM} strokeWidth="2" />
      <path d="M14 3 C9 8 5 8 4 13 M14 3 C19 8 23 8 24 13 M4 13 C3 16 5 20 8 22 M24 13 C25 16 23 20 20 22 M8 22 C11 24 17 24 20 22 M8 22 L14 14 L20 22" stroke={TEXT_DIM} strokeWidth="1.2" />
      <circle cx="14" cy="14" r="2" stroke={TEXT_DIM} strokeWidth="1.5" />
    </svg>
  );
}
function IconCone() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <polygon points="14,6 4,20 24,20" stroke={TEXT_DIM} strokeWidth="2" strokeLinejoin="round" />
      <line x1="10" y1="20" x2="18" y2="20" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
      <line x1="11" y1="13" x2="17" y2="13" stroke={TEXT_DIM} strokeWidth="1" strokeLinecap="round" />
      <line x1="12" y1="16.5" x2="16" y2="16.5" stroke={TEXT_DIM} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
function IconPole() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <line x1="14" y1="3" x2="14" y2="25" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="6" r="2" stroke={TEXT_DIM} strokeWidth="1.5" />
      <line x1="12" y1="22" x2="16" y2="22" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconBucket() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M8 10 L20 10 L18 23 L10 23 Z" stroke={TEXT_DIM} strokeWidth="2" strokeLinejoin="round" />
      <line x1="9" y1="14" x2="19" y2="14" stroke={TEXT_DIM} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
function IconCorner() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <line x1="14" y1="3" x2="14" y2="22" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 6 L20 6 L16 3 L12 3" stroke={TEXT_DIM} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="11" y1="24" x2="17" y2="24" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconGoal() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="10" width="6" height="12" rx="1" stroke={TEXT_DIM} strokeWidth="2" />
      <line x1="10" y1="10" x2="10" y2="22" stroke={TEXT_DIM} strokeWidth="2" />
      <path d="M6 10 L6 8 Q6 5 9 5 L11 5" stroke={TEXT_DIM} strokeWidth="1.5" fill="none" />
      <path d="M6 22 L6 24 Q6 27 9 27 L11 27" stroke={TEXT_DIM} strokeWidth="1.5" fill="none" />
    </svg>
  );
}
function IconHurdle() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <line x1="6" y1="22" x2="6" y2="8" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="22" x2="22" y2="8" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="8" x2="22" y2="8" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="14" x2="22" y2="14" stroke={TEXT_DIM} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
function IconSmallHurdle() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <line x1="8" y1="22" x2="8" y2="12" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="22" x2="20" y2="12" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="12" x2="20" y2="12" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconLadder() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <line x1="8" y1="4" x2="8" y2="24" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="4" x2="20" y2="24" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="8" x2="20" y2="8" stroke={TEXT_DIM} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="13" x2="20" y2="13" stroke={TEXT_DIM} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="18" x2="20" y2="18" stroke={TEXT_DIM} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconLongLadder() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <line x1="8" y1="2" x2="8" y2="26" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="2" x2="20" y2="26" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="7" x2="20" y2="7" stroke={TEXT_DIM} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="12" x2="20" y2="12" stroke={TEXT_DIM} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="17" x2="20" y2="17" stroke={TEXT_DIM} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="22" x2="20" y2="22" stroke={TEXT_DIM} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconRing() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="10" stroke={TEXT_DIM} strokeWidth="2" />
      <circle cx="14" cy="14" r="6" stroke={TEXT_DIM} strokeWidth="1" strokeDasharray="3 2" />
    </svg>
  );
}
function IconWall() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="9" cy="12" r="3" stroke={TEXT_DIM} strokeWidth="1.8" />
      <circle cx="19" cy="12" r="3" stroke={TEXT_DIM} strokeWidth="1.8" />
      <circle cx="9" cy="21" r="3" stroke={TEXT_DIM} strokeWidth="1.8" />
      <circle cx="19" cy="21" r="3" stroke={TEXT_DIM} strokeWidth="1.8" />
      <line x1="4" y1="7" x2="24" y2="7" stroke={TEXT_DIM} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
// ─── Icon mapping ────────────────────────────────────────

function getEquipmentIcon(name: string) {
  switch (name) {
    case "足球": return <IconBall />;
    case "橙色标志盘": case "红色标志盘": case "黄色标志盘": case "蓝色标志盘": case "绿色标志盘": return <IconCone />;
    case "标志杆": return <IconPole />;
    case "标志桶": return <IconBucket />;
    case "角旗杆": return <IconCorner />;
    case "球门": return <IconGoal />;
    case "高栏架": return <IconHurdle />;
    case "小栏架": return <IconSmallHurdle />;
    case "绳梯": return <IconLadder />;
    case "长绳梯": return <IconLongLadder />;
    case "敏捷环": return <IconRing />;
    case "人墙": return <IconWall />;
    default: return <IconBall />;
  }
}

// Color tag for cones
function getConeColor(name: string) {
  if (name.includes("橙色")) return "#f97316";
  if (name.includes("红色")) return ACCENT;
  if (name.includes("黄色")) return "#eab308";
  if (name.includes("蓝色")) return BLUE;
  if (name.includes("绿色")) return GREEN;
  return null;
}

// ─── Data ────────────────────────────────────────────────

interface Item { name: string; filename: string; }

const EQUIPMENT: Item[] = [
  { name: "足球", filename: "足球" },
  { name: "橙色标志盘", filename: "橙色标志盘" },
  { name: "红色标志盘", filename: "红色标志盘" },
  { name: "黄色标志盘", filename: "黄色标志盘" },
  { name: "蓝色标志盘", filename: "蓝色标志盘" },
  { name: "绿色标志盘", filename: "绿色标志盘" },
  { name: "标志杆", filename: "标志杆" },
  { name: "标志桶", filename: "标志桶" },
  { name: "角旗杆", filename: "角旗杆" },
  { name: "球门", filename: "球门" },
  { name: "高栏架", filename: "高栏架" },
  { name: "小栏架", filename: "小栏架" },
  { name: "绳梯", filename: "绳梯" },
  { name: "长绳梯", filename: "长绳梯" },
  { name: "敏捷环", filename: "圆形环" },
  { name: "人墙", filename: "人墙" },
];

const FIELD_LIST = ["default", "场地", "场地2", "场地3", "场地4", "场地5", "场地6", "场地7", "场地8", "场地9", "场地10", "场地11", "场地12", "场地13", "场地14"];

// ─── Accordion helpers ───────────────────────────────────

type AccordionSection = "equipment" | "players" | "fields";

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      className="w-3.5 h-3.5 transition-transform duration-200"
      style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", color: TEXT_DIM }}
    />
  );
}

// ─── Component ───────────────────────────────────────────

interface Props {
  activeTool?: string;
  onFieldSelect?: (filename: string) => void;
  onPlaceEquipment?: (filename: string, name: string) => void;
  /** External control: when provided, internal collapsed state is ignored */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function EquipmentPalette({ onFieldSelect, onPlaceEquipment, collapsed: externalCollapsed, onToggleCollapsed: externalToggle }: Props) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // Use external state if provided, otherwise use internal
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const setCollapsed = (v: boolean) => {
    if (externalToggle) { if (v !== collapsed) externalToggle(); }
    else { setInternalCollapsed(v); }
  };
  const [openSections, setOpenSections] = useState<Record<AccordionSection, boolean>>({
    equipment: true,
    players: false,
    fields: false,
  });
  const [activeEquipment, setActiveEquipment] = useState<string | null>(null);
  const [previewField, setPreviewField] = useState<string | null>(null);

  const toggleSection = (section: AccordionSection) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFieldClick = (field: string) => setPreviewField(field);

  const handleDragStart = (e: React.DragEvent, item: Item) => {
    e.dataTransfer.setData("application/equipment", JSON.stringify({
      src: `/equipment/${item.filename}.png`,
      name: item.name,
    }));
    e.dataTransfer.effectAllowed = "copy";
  };

  // ─── Collapsed floating bar ──────────────────────────

  if (collapsed) {
    return (
      <div className="relative flex flex-shrink-0">
        {/* Thin floating bar */}
        <div
          className="flex flex-col items-center gap-3 py-3 px-1.5 rounded-r-lg shadow-lg z-20"
          style={{
            backgroundColor: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderLeft: "none",
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
          }}
        >
          {/* Expand button */}
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-opacity-80"
            style={{ backgroundColor: BG_HOVER, color: TEXT_DIM }}
            onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; }}
            title="展开器材面板"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Section toggles as icon buttons */}
          <button
            onClick={() => { setCollapsed(false); setOpenSections({ equipment: true, players: false, fields: false }); }}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
            style={{ color: TEXT_DIM }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = BG_HOVER; e.currentTarget.style.color = ACCENT; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = TEXT_DIM; }}
            title="教具"
          >
            <Package className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setCollapsed(false); setOpenSections({ equipment: false, players: true, fields: false }); }}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
            style={{ color: TEXT_DIM }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = BG_HOVER; e.currentTarget.style.color = ACCENT; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = TEXT_DIM; }}
            title="球员"
          >
            <Users className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setCollapsed(false); setOpenSections({ equipment: false, players: false, fields: true }); }}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
            style={{ color: TEXT_DIM }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = BG_HOVER; e.currentTarget.style.color = ACCENT; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = TEXT_DIM; }}
            title="场地"
          >
            <Map className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Expanded sidebar ────────────────────────────────

  const isEquipmentActive = (filename: string) => {
    return activeEquipment === filename;
  };

  const mkEquipItem = (item: Item) => {
    const coneColor = getConeColor(item.name);
    const isActive = isEquipmentActive(item.filename);
    return (
      <div
        key={item.filename}
        draggable
        onDragStart={(e) => {
          handleDragStart(e, item);
          setActiveEquipment(item.filename);
        }}
        className="flex flex-col items-center gap-0.5 py-1 px-0.5 rounded-md cursor-grab transition-all duration-150 group"
        style={{
          borderRadius: "6px",
          backgroundColor: isActive ? `${ACCENT}1a` : "transparent",
          border: isActive ? `1px solid ${ACCENT}66` : "1px solid transparent",
          transform: isActive ? "scale(1.02)" : "scale(1)",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = BG_HOVER;
          }
          e.currentTarget.style.transform = "scale(1.05)";
          const svg = e.currentTarget.querySelector("svg");
          if (svg) {
            svg.querySelectorAll("[stroke]").forEach(el => {
              const s = el.getAttribute("stroke");
              if (s === TEXT_DIM) el.setAttribute("stroke", ACCENT);
            });
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "transparent";
          }
          e.currentTarget.style.transform = isActive ? "scale(1.02)" : "scale(1)";
          const svg = e.currentTarget.querySelector("svg");
          if (svg) {
            svg.querySelectorAll("[stroke]").forEach(el => {
              const s = el.getAttribute("stroke");
              if (s === ACCENT) el.setAttribute("stroke", TEXT_DIM);
            });
          }
        }}
        title={"拖拽放置 · 点击 ⊕ 快捷添加"}
      >
        <div className="relative">
          {getEquipmentIcon(item.name)}
          {/* Quick-add button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveEquipment(item.filename);
              onPlaceEquipment?.(item.filename, item.name);
            }}
            className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] leading-none opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: ACCENT, color: "#fff" }}
            title="点击添加"
          >+</button>
          {coneColor && (
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full border"
              style={{ backgroundColor: coneColor, borderColor: CARD_BG }} />
          )}
        </div>
        <span className="text-[10px] leading-tight text-center w-full truncate px-0.5"
          style={{ color: isActive ? ACCENT : TEXT_DIM }}>
          {item.name}
        </span>
      </div>
    );
  };

  // ─── JSX ──────────────────────────────────────────────

  return (
    <div className="relative flex flex-shrink-0">
      {/* Floating collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-3 z-20 flex items-center justify-center w-5 h-8 rounded-r-md transition-colors shadow-md"
        style={{
          left: 116,
          backgroundColor: CARD_BG,
          border: `1px solid ${BORDER}`,
          color: TEXT_DIM,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; }}
        title="折叠器材面板"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>

      {/* Sidebar */}
      <div
        className="w-[120px] flex flex-col flex-shrink-0 transition-all duration-200"
        style={{ backgroundColor: BG, borderRight: `1px solid ${BORDER}` }}
      >
        {/* ── Top collapse toggle ── */}
        <button
          onClick={() => setCollapsed(true)}
          className="flex items-center justify-center w-full py-1.5 transition-colors"
          style={{ color: TEXT_DIM, borderBottom: `1px solid ${BORDER}` }}
          onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT; e.currentTarget.style.backgroundColor = BG_HOVER; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.backgroundColor = "transparent"; }}
          title="完全折叠面板"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Scrollable content — pb-24 keeps last items visible above floating toolbar */}
        <div className="flex-1 overflow-y-auto py-1.5 space-y-1 pb-24">
          {/* ═══════════ 教具 Card ═══════════ */}
          <div
            className="mx-1"
            style={{
              borderRadius: TAC_THEME.radius,
              border: `1px solid ${BORDER}`,
            }}
          >
            <button
              onClick={() => toggleSection("equipment")}
              className="flex items-center justify-between w-full px-2 py-2 transition-colors sticky top-0 z-10"
              style={{ color: TEXT_MAIN, backgroundColor: CARD_BG, borderRadius: TAC_THEME.radius }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = BG_HOVER; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = CARD_BG; }}
            >
              <span className="text-[10px] font-semibold tracking-wide">教具</span>
              <Chevron open={openSections.equipment} />
            </button>
            {openSections.equipment && (
              <div className="px-1.5 pb-1.5" style={{ backgroundColor: CARD_BG, borderRadius: `0 0 ${TAC_THEME.radius} ${TAC_THEME.radius}` }}>
                <div className="grid grid-cols-2 gap-0.5">
                  {EQUIPMENT.map(mkEquipItem)}
                </div>
              </div>
            )}
          </div>

          {/* ═══════════ 球员 Card ═══════════ */}
          <div
            className="mx-1"
            style={{
              borderRadius: TAC_THEME.radius,
              border: `1px solid ${BORDER}`,
            }}
          >
            <button
              onClick={() => toggleSection("players")}
              className="flex items-center justify-between w-full px-2 py-2 transition-colors sticky top-0 z-10"
              style={{ color: TEXT_MAIN, backgroundColor: CARD_BG, borderRadius: TAC_THEME.radius }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = BG_HOVER; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = CARD_BG; }}
            >
              <span className="text-[10px] font-semibold tracking-wide">球员</span>
              <Chevron open={openSections.players} />
            </button>
            {openSections.players && (
              <div className="px-2 pb-2" style={{ backgroundColor: CARD_BG, borderRadius: `0 0 ${TAC_THEME.radius} ${TAC_THEME.radius}` }}>
                <div className="flex gap-2">
                  <button
                    className="flex-1 flex items-center justify-center py-1.5 rounded-md cursor-pointer transition-all duration-150 hover:scale-105"
                    style={{
                      border: `2px solid ${TAC_THEME.accent}`,
                      backgroundColor: "transparent",
                      borderRadius: TAC_THEME.radius,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${TAC_THEME.accent}1a`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    title={TAC_THEME.accent}
                    onClick={() => {
                      const toolbarColorBtn = document.querySelector(`[title="${TAC_THEME.accent}"]`) as HTMLButtonElement;
                      if (toolbarColorBtn) toolbarColorBtn.click();
                    }}
                  >
                    <span className="text-[10px] font-bold" style={{ color: TAC_THEME.accent }}>球员</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════ 场地 Card ═══════════ */}
          <div
            className="mx-1"
            style={{
              borderRadius: TAC_THEME.radius,
              border: `1px solid ${BORDER}`,
            }}
          >
            <button
              onClick={() => toggleSection("fields")}
              className="flex items-center justify-between w-full px-2 py-2 transition-colors sticky top-0 z-10"
              style={{ color: TEXT_MAIN, backgroundColor: CARD_BG, borderRadius: TAC_THEME.radius }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = BG_HOVER; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = CARD_BG; }}
            >
              <span className="text-[10px] font-semibold tracking-wide">场地</span>
              <Chevron open={openSections.fields} />
            </button>
            {openSections.fields && (
              <div className="px-1.5 pb-1.5" style={{ backgroundColor: CARD_BG, borderRadius: `0 0 ${TAC_THEME.radius} ${TAC_THEME.radius}` }}>
                <div className="grid grid-cols-2 gap-1.5">
                  {FIELD_LIST.map((field) => (
                    <button
                      key={field}
                      onClick={() => handleFieldClick(field)}
                      className="relative w-full aspect-[4/3] rounded-md overflow-hidden transition-all duration-150 hover:scale-105"
                      style={{
                        border: `1px solid ${previewField === field ? ACCENT : BORDER}`,
                        borderRadius: "4px",
                      }}
                      title={field === "default" ? "标准全场" : field}
                    >
                      {field === "default" ? (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: TAC_THEME.grass }}>
                          <svg width="32" height="24" viewBox="0 0 32 24" fill="none" opacity="0.3">
                            <rect x="1" y="1" width="30" height="22" stroke="#fff" strokeWidth="1" fill="none" />
                            <line x1="16" y1="1" x2="16" y2="23" stroke="#fff" strokeWidth="0.5" />
                            <circle cx="16" cy="12" r="3" stroke="#fff" strokeWidth="0.5" fill="none" />
                          </svg>
                        </div>
                      ) : (
                        <img
                          src={`/equipment/${field}.png`}
                          alt={field}
                          className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                        />
                      )}
                      <span
                        className="absolute bottom-0.5 right-1.5 text-[8px] font-medium"
                        style={{ color: previewField === field ? ACCENT : TEXT_DIM }}
                      >
                        {field === "default" ? "标准" : field.replace("场地", "")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Field Preview Modal ── */}
      {previewField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewField(null)}>
          <div className="rounded-xl overflow-hidden max-w-lg w-full shadow-2xl"
            style={{ backgroundColor: CARD_BG, borderRadius: "8px" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: `1px solid ${BORDER}` }}>
              <h3 className="text-sm font-medium" style={{ color: TEXT_MAIN }}>
                {previewField === "default" ? "标准全场" : previewField}
              </h3>
              <button onClick={() => setPreviewField(null)} className="hover:opacity-70 transition-opacity">
                <X className="w-4 h-4" style={{ color: TEXT_DIM }} />
              </button>
            </div>
            {previewField === "default" ? (
              <div className="w-full aspect-[1050/680] flex items-center justify-center"
                style={{ backgroundColor: TAC_THEME.grass, maxHeight: "60vh" }}>
                <span className="text-sm" style={{ color: TEXT_DIM }}>标准 11 人制足球场</span>
              </div>
            ) : (
              <img src={`/equipment/${previewField}.png`} alt={previewField}
                className="w-full object-contain" style={{ maxHeight: "60vh" }} />
            )}
            <div className="flex gap-2 p-3" style={{ borderTop: `1px solid ${BORDER}` }}>
              <button
                onClick={() => {
                  if (previewField) onFieldSelect?.(previewField);
                  setPreviewField(null);
                }}
                className="flex-1 py-2 rounded-md text-xs font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-1"
                style={{ backgroundColor: ACCENT, color: "#fff", borderRadius: "6px" }}
              >
                <Check className="w-3.5 h-3.5" />使用此场地
              </button>
              <button
                onClick={() => setPreviewField(null)}
                className="px-4 py-2 rounded-md text-xs transition-colors"
                style={{ backgroundColor: CARD_BG, color: TEXT_DIM, borderRadius: "6px" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = BG_HOVER; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = CARD_BG; }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
