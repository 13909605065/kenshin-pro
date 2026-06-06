"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { TacticalFocus } from "@/lib/types";
import { Map, Users, Shield, Zap, Flag, ChevronDown, ChevronUp, Undo2, Trash2, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  module: TacticalFocus;
  onOpenBoard?: () => void;
}

/* ============================================================
   Types for canvas drawing state
   ============================================================ */

interface CanvasPlayer {
  x: number; y: number; number: string; color: string;
}

interface CanvasArrow {
  from: { x: number; y: number }; to: { x: number; y: number }; color: string; dashed: boolean;
}

interface TabCanvasState {
  players: CanvasPlayer[];
  arrows: CanvasArrow[];
  playerCounter: number;
}

type DiagramTab = "formation" | "press" | "transition";

/* ============================================================
   Constants
   ============================================================ */

const CARD_CLASS = "bg-[#1e1e1e] border border-[#222] rounded-xl p-4 hover:border-[#992828]/30 transition-colors duration-200";

const TAB_LABELS: Record<DiagramTab, string> = {
  formation: "阵型",
  press: "压迫",
  transition: "转换",
};

const DIAGRAM_CAPTIONS: Record<DiagramTab, string> = {
  formation: "后场4人+中场4人防线间距20-25m",
  press: "压迫触发: 回传门将 / 中场持球 / 边后卫背身",
  transition: "转换触发: 丢球后6秒反抢 / 夺球后3秒纵深",
};

/* ============================================================
   Inline SVG Field — small interactive canvas
   ============================================================ */

function InlineFieldCanvas({
  tab,
  state,
  onStateChange,
  fadeIn,
}: {
  tab: DiagramTab;
  state: TabCanvasState;
  onStateChange: (s: TabCanvasState) => void;
  fadeIn: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawMode, setDrawMode] = useState<"none" | "addPlayer" | "drawArrow">("none");
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);

  // Reset drawing state when tab changes
  useEffect(() => {
    setDrawMode("none");
    setArrowStart(null);
  }, [tab]);

  const fieldW = 300;
  const fieldH = 200;
  const marginX = 15;
  const marginY = 10;

  // Convert SVG client coords to field coords (0-1 normalized)
  const toField = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0.5, y: 0.5 };
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }, []);

  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    if (drawMode === "none") return;
    const pt = toField(e.clientX, e.clientY);

    if (drawMode === "addPlayer") {
      const num = state.playerCounter + 1;
      onStateChange({
        ...state,
        players: [...state.players, { x: pt.x, y: pt.y, number: String(num), color: "#992828" }],
        playerCounter: num,
      });
    }

    if (drawMode === "drawArrow") {
      if (!arrowStart) {
        setArrowStart(pt);
      } else {
        const newArrow: CanvasArrow = { from: arrowStart, to: pt, color: "#992828", dashed: false };
        onStateChange({ ...state, arrows: [...state.arrows, newArrow] });
        setArrowStart(null);
      }
    }
  }, [drawMode, arrowStart, state, onStateChange, toField]);

  const handleUndo = () => {
    if (state.arrows.length > 0) {
      onStateChange({ ...state, arrows: state.arrows.slice(0, -1) });
    } else if (state.players.length > 0) {
      onStateChange({ ...state, players: state.players.slice(0, -1), playerCounter: state.playerCounter - 1 });
    }
  };

  const handleClear = () => {
    onStateChange({ ...state, players: [], arrows: [] });
  };

  // Convert normalized (0-1) to SVG pixel coords
  const toSvg = (nx: number, ny: number) => ({
    x: marginX + nx * (fieldW - marginX * 2),
    y: marginY + ny * (fieldH - marginY * 2),
  });

  return (
    <div className="relative">
      {/* Floating mini-toolbar */}
      <div className="absolute -top-9 right-1 z-10 flex items-center gap-0.5 bg-[#121212] border border-[#333] rounded-lg p-0.5 shadow-lg">
        <button
          onClick={() => { setDrawMode(drawMode === "addPlayer" ? "none" : "addPlayer"); setArrowStart(null); }}
          className={`px-1.5 py-1 rounded text-[10px] transition ${
            drawMode === "addPlayer" ? "bg-[#992828] text-white" : "text-gray-400 hover:text-white hover:bg-[#291a1a]"
          }`}
          title="添加球员"
        >
          👤 +
        </button>
        <button
          onClick={() => { setDrawMode(drawMode === "drawArrow" ? "none" : "drawArrow"); setArrowStart(null); }}
          className={`px-1.5 py-1 rounded text-[10px] transition ${
            drawMode === "drawArrow" ? "bg-[#992828] text-white" : "text-gray-400 hover:text-white hover:bg-[#291a1a]"
          }`}
          title="画线"
        >
          ↗
        </button>
        <button
          onClick={handleUndo}
          className="px-1.5 py-1 rounded text-[10px] text-gray-400 hover:text-white hover:bg-[#291a1a] transition"
          title="撤销"
        >
          <Undo2 className="w-3 h-3" />
        </button>
        <button
          onClick={handleClear}
          className="px-1.5 py-1 rounded text-[10px] text-gray-400 hover:text-red-400 hover:bg-[#291a1a] transition"
          title="清空"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        <span className="w-px h-3 bg-[#333] mx-0.5" />
      </div>

      {/* SVG canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${fieldW} ${fieldH}`}
        className={`w-full h-full cursor-crosshair transition-opacity duration-200 ${fadeIn ? "opacity-100" : "opacity-0"}`}
        style={{ background: "#0a0a0a", borderRadius: "8px" }}
        onClick={handleSvgClick}
      >
        {/* Field lines */}
        <rect x={marginX} y={marginY} width={fieldW - marginX * 2} height={fieldH - marginY * 2} fill="none" stroke="#2d6b2d" strokeWidth="1" />
        <line x1={fieldW / 2} y1={marginY} x2={fieldW / 2} y2={fieldH - marginY} stroke="#2d6b2d" strokeWidth="0.5" />
        <circle cx={fieldW / 2} cy={fieldH / 2} r={35} fill="none" stroke="#2d6b2d" strokeWidth="0.5" />

        {/* Default formation for this tab — only shown when no custom players */}
        {state.players.length === 0 && tab === "formation" && (
          <>
            {/* Back 4 */}
            {[{x:60,y:45},{x:130,y:35},{x:170,y:35},{x:240,y:45}].map((p,i) => (
              <g key={"d"+i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#992828" stroke="#fff" strokeWidth="1"/>
                <text x={p.x} y={p.y+1} textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">{i+2}</text>
              </g>
            ))}
            {/* Mid 4 */}
            {[{x:55,y:90},{x:105,y:85},{x:195,y:85},{x:245,y:90}].map((p,i) => (
              <g key={"m"+i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#992828" stroke="#fff" strokeWidth="1"/>
                <text x={p.x} y={p.y+1} textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">{i+6}</text>
              </g>
            ))}
            {/* FW 2 */}
            {[{x:110,y:145},{x:190,y:145}].map((p,i) => (
              <g key={"f"+i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#992828" stroke="#fff" strokeWidth="1"/>
                <text x={p.x} y={p.y+1} textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">{i+9}</text>
              </g>
            ))}
            {/* GK */}
            <g>
              <circle cx="150" cy="18" r="5" fill="#992828" stroke="#fff" strokeWidth="1"/>
              <text x="150" y="19" textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">1</text>
            </g>
          </>
        )}

        {/* Default press arrows */}
        {state.players.length === 0 && tab === "press" && (
          <>
            <defs>
              <marker id="press-arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                <path d="M0,0 L10,5 L0,10z" fill="#992828"/>
              </marker>
            </defs>
            {/* Back 4 positions */}
            {[{x:60,y:45},{x:130,y:35},{x:170,y:35},{x:240,y:45}].map((p,i) => (
              <g key={"d"+i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#992828" stroke="#fff" strokeWidth="1"/>
                <text x={p.x} y={p.y+1} textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">{i+2}</text>
              </g>
            ))}
            {/* Mid 4 */}
            {[{x:55,y:90},{x:105,y:85},{x:195,y:85},{x:245,y:90}].map((p,i) => (
              <g key={"m"+i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#992828" stroke="#fff" strokeWidth="1"/>
                <text x={p.x} y={p.y+1} textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">{i+6}</text>
              </g>
            ))}
            {/* FW 2 */}
            {[{x:110,y:145},{x:190,y:145}].map((p,i) => (
              <g key={"f"+i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#992828" stroke="#fff" strokeWidth="1"/>
                <text x={p.x} y={p.y+1} textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">{i+9}</text>
              </g>
            ))}
            <g><circle cx="150" cy="18" r="5" fill="#992828" stroke="#fff" strokeWidth="1"/><text x="150" y="19" textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">1</text></g>
            {/* Press arrows */}
            <line x1={60} y1={45} x2={80} y2={65} stroke="#992828" strokeWidth="1.5" strokeDasharray="4,2" markerEnd="url(#press-arrow-head)"/>
            <line x1={240} y1={45} x2={220} y2={65} stroke="#992828" strokeWidth="1.5" strokeDasharray="4,2" markerEnd="url(#press-arrow-head)"/>
          </>
        )}

        {/* Default transition diagram */}
        {state.players.length === 0 && tab === "transition" && (
          <>
            {/* Back 4 deeper */}
            {[{x:60,y:55},{x:130,y:45},{x:170,y:45},{x:240,y:55}].map((p,i) => (
              <g key={"d"+i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#992828" stroke="#fff" strokeWidth="1"/>
                <text x={p.x} y={p.y+1} textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">{i+2}</text>
              </g>
            ))}
            {/* Mid 4 pushed up */}
            {[{x:55,y:75},{x:105,y:65},{x:195,y:65},{x:245,y:75}].map((p,i) => (
              <g key={"m"+i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#992828" stroke="#fff" strokeWidth="1"/>
                <text x={p.x} y={p.y+1} textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">{i+6}</text>
              </g>
            ))}
            {[{x:110,y:145},{x:190,y:145}].map((p,i) => (
              <g key={"f"+i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#992828" stroke="#fff" strokeWidth="1"/>
                <text x={p.x} y={p.y+1} textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">{i+9}</text>
              </g>
            ))}
            <g><circle cx="150" cy="18" r="5" fill="#992828" stroke="#fff" strokeWidth="1"/><text x="150" y="19" textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">1</text></g>
            <defs>
              <marker id="trans-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                <path d="M0,0 L10,5 L0,10z" fill="#FFD700"/>
              </marker>
            </defs>
            <line x1={55} y1={75} x2={80} y2={95} stroke="#FFD700" strokeWidth="1.5" strokeDasharray="4,2" markerEnd="url(#trans-arrow)"/>
            <line x1={245} y1={75} x2={220} y2={95} stroke="#FFD700" strokeWidth="1.5" strokeDasharray="4,2" markerEnd="url(#trans-arrow)"/>
          </>
        )}

        {/* Custom players */}
        {state.players.map((p, i) => {
          const svgPt = toSvg(p.x, p.y);
          return (
            <g key={`cp-${i}`}>
              <circle cx={svgPt.x} cy={svgPt.y} r="6" fill={p.color} stroke="#fff" strokeWidth="1.2" />
              <text x={svgPt.x} y={svgPt.y + 1.2} textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="bold">{p.number}</text>
            </g>
          );
        })}

        {/* Custom arrows */}
        {state.arrows.map((a, i) => {
          const from = toSvg(a.from.x, a.from.y);
          const to = toSvg(a.to.x, a.to.y);
          return (
            <g key={`ca-${i}`}>
              <defs>
                <marker id={`arrow-${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                  <path d="M0,0 L10,5 L0,10z" fill={a.color} />
                </marker>
              </defs>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={a.color} strokeWidth="1.5"
                strokeDasharray={a.dashed ? "4,2" : "none"} markerEnd={`url(#arrow-${i})`} />
            </g>
          );
        })}

        {/* Arrow start indicator when drawing */}
        {arrowStart && drawMode === "drawArrow" && (() => {
          const pt = toSvg(arrowStart.x, arrowStart.y);
          return <circle cx={pt.x} cy={pt.y} r="4" fill="#992828" opacity="0.6" />;
        })()}
      </svg>
    </div>
  );
}

/* ============================================================
   Accordion Section
   ============================================================ */

function AccordionSection({
  title,
  emoji,
  defaultOpen,
  children,
}: {
  title: string;
  emoji: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  return (
    <div className="border-b border-[#222] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 text-[11px] text-gray-400 hover:text-white transition-colors duration-150"
      >
        <span className="flex items-center gap-1.5">
          <span>{emoji}</span>
          <span className="font-medium">{title}</span>
        </span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${open ? "max-h-40 pb-2" : "max-h-0"}`}
      >
        <div className="text-[10px] text-[#d1d1d1] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/* ============================================================
   Main Component
   ============================================================ */

export function CoachTacticalBriefing({ module, onOpenBoard }: Props) {
  const router = useRouter();
  const [activeDiagram, setActiveDiagram] = useState<DiagramTab>("formation");
  const [fading, setFading] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);

  // Canvas state cached per tab
  const [canvasStates, setCanvasStates] = useState<Record<DiagramTab, TabCanvasState>>({
    formation: { players: [], arrows: [], playerCounter: 0 },
    press: { players: [], arrows: [], playerCounter: 0 },
    transition: { players: [], arrows: [], playerCounter: 0 },
  });

  const updateCanvasState = (tab: DiagramTab, s: TabCanvasState) => {
    setCanvasStates((prev) => ({ ...prev, [tab]: s }));
  };

  const switchTab = (tab: DiagramTab) => {
    if (tab === activeDiagram) return;
    setFading(true);
    setTimeout(() => {
      setActiveDiagram(tab);
      setFading(false);
    }, 80);
  };

  // Check if any tactical analysis point mentions gym/strength
  const hasStrengthContent = module.tactical_analysis?.some((p) =>
    /力量|力量训练|gym|核心|体能|抗阻|负重|卧推|深蹲|硬拉|爆发力/i.test(p)
  );

  // Sync to session plan (via localStorage bridge)
  const handleSyncToSession = () => {
    const state = canvasStates[activeDiagram];
    const data = {
      type: "tactical_briefing_sync",
      tab: activeDiagram,
      players: state.players,
      arrows: state.arrows,
      caption: DIAGRAM_CAPTIONS[activeDiagram],
      title: `${module.title} - ${TAB_LABELS[activeDiagram]}`,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem("tac_briefing_sync", JSON.stringify(data));
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* === Header bar === */}
      <div className="flex items-center justify-between bg-[#1e1e1e] border border-[#222] rounded-xl px-4 py-3 hover:border-[#992828]/30 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#992828]" />
          <div>
            <p className="text-sm font-bold text-white">{module.title}</p>
            <span className="text-[10px] text-[#992828] bg-[#992828]/10 px-2 py-0.5 rounded">{module.tactical_theme}</span>
          </div>
        </div>
        <button
          onClick={onOpenBoard}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#992828]/10 border border-[#992828]/20 rounded-lg text-[10px] text-[#992828] hover:bg-[#992828]/20 transition-colors duration-150"
        >
          <Map className="w-3.5 h-3.5" /> 打开战术板
        </button>
      </div>

      {/* === 3-column body === */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* ── LEFT COLUMN: Core Tactical Points + Player Roles ── */}
        <div className="lg:col-span-1 space-y-3">
          {/* Core Tactical Points */}
          <div className={CARD_CLASS}>
            <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#992828]" /> 核心战术
            </h3>
            <div className="space-y-2">
              {module.tactical_analysis?.slice(0, 4).map((point, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#992828] font-bold text-[10px] mt-0.5 flex-shrink-0">{i + 1}</span>
                  <p className="text-xs text-[#d1d1d1] leading-relaxed">{point}</p>
                </div>
              ))}
              {(!module.tactical_analysis || module.tactical_analysis.length === 0) && (
                <p className="text-xs text-gray-600">暂无战术要点</p>
              )}
            </div>

            {/* Gym/strength quick-jump */}
            {hasStrengthContent && (
              <button
                onClick={() => router.push("/exercises")}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] text-[#992828] bg-[#992828]/10 border border-[#992828]/20 hover:bg-[#992828]/20 transition-colors duration-150"
              >
                💪 添加力量动作
              </button>
            )}
          </div>

          {/* Player Roles */}
          <div className={CARD_CLASS}>
            <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Users className="w-3 h-3 text-[#992828]" /> 球员角色
            </h3>
            <div className="space-y-1.5">
              {module.player_roles?.slice(0, 5).map((role, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs p-1.5 rounded-lg hover:bg-[#291a1a] transition-colors duration-150 cursor-default"
                >
                  <span className="w-4 h-4 rounded bg-[#992828]/20 text-[8px] flex items-center justify-center text-[#992828] font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[#d1d1d1] text-xs">{role}</span>
                </div>
              ))}
              {(!module.player_roles || module.player_roles.length === 0) && (
                <p className="text-xs text-gray-600">暂无角色分配</p>
              )}
            </div>
          </div>
        </div>

        {/* ── CENTER COLUMN: Formation Canvas ── */}
        <div className="lg:col-span-2 space-y-3">
          {/* Canvas card */}
          <div className={CARD_CLASS}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] text-gray-400 uppercase tracking-wider">阵型落位</h3>
              {/* Tab buttons */}
              <div className="flex gap-1">
                {(Object.keys(TAB_LABELS) as DiagramTab[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => switchTab(k)}
                    className={`px-2.5 py-1 rounded text-[9px] font-medium transition-all duration-150 border-b-2 ${
                      activeDiagram === k
                        ? "text-[#992828] border-[#992828] bg-[#291a1a]"
                        : "text-gray-400 border-transparent hover:text-gray-300 hover:bg-[#291a1a]"
                    }`}
                  >
                    {TAB_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>

            {/* Inline field canvas */}
            <div className="aspect-[4/3] bg-[#0a0a0a] rounded-lg flex items-center justify-center border border-[#333] relative">
              <InlineFieldCanvas
                tab={activeDiagram}
                state={canvasStates[activeDiagram]}
                onStateChange={(s) => updateCanvasState(activeDiagram, s)}
                fadeIn={!fading}
              />
            </div>

            {/* Caption — collapsible */}
            <div className="mt-2">
              <button
                onClick={() => setNoteExpanded(!noteExpanded)}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-300 transition-colors duration-150"
              >
                {noteExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span className="truncate max-w-[280px]">
                  {DIAGRAM_CAPTIONS[activeDiagram]}
                </span>
              </button>
              {noteExpanded && (
                <div className="mt-1.5 text-[10px] text-[#d1d1d1] leading-relaxed bg-[#121212] rounded-lg p-2 border border-[#222]">
                  {activeDiagram === "formation" && (
                    <ul className="space-y-1 list-disc list-inside">
                      <li>后场4人+中场4人防线间距20-25m</li>
                      <li>门将参与后场出球（overload）</li>
                      <li>进攻时两翼后卫压上至中场线</li>
                    </ul>
                  )}
                  {activeDiagram === "press" && (
                    <ul className="space-y-1 list-disc list-inside">
                      <li>压迫触发: 回传门将 / 中场持球 / 边后卫背身</li>
                      <li>前场2人封锁中路传球线路</li>
                      <li>中场4人区域联防缩小空间</li>
                    </ul>
                  )}
                  {activeDiagram === "transition" && (
                    <ul className="space-y-1 list-disc list-inside">
                      <li>丢球后6秒内就地反抢（gegenpressing）</li>
                      <li>夺球后3秒内完成纵深传球</li>
                      <li>转换瞬间保持三角站位（钻石结构）</li>
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Sync to session button */}
            <button
              onClick={handleSyncToSession}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] text-[#992828] bg-[#992828]/10 border border-[#992828]/20 hover:bg-[#992828]/20 transition-colors duration-150"
            >
              <ClipboardList className="w-3 h-3" /> 同步至教案
            </button>
          </div>

          {/* Training blocks — mini field cards */}
          <div className="grid grid-cols-2 gap-2">
            {["热身激活", "传接球对抗", "专项防守", "分队比赛"].map((drill, i) => (
              <div
                key={i}
                className={`${CARD_CLASS} p-3 flex items-center gap-2 cursor-pointer`}
              >
                <div className="w-10 h-8 bg-[#0a0a0a] rounded border border-[#444] flex items-center justify-center flex-shrink-0">
                  <Flag className="w-3 h-3 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-white font-medium">{drill}</p>
                  <p className="text-[9px] text-gray-600">15min</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Set Pieces + Attack/Defense Accordion ── */}
        <div className="lg:col-span-1 space-y-3">
          {/* Set Pieces */}
          <div className={CARD_CLASS}>
            <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Flag className="w-3 h-3 text-[#992828]" /> 定位球
            </h3>
            <div className="space-y-2">
              <div className="bg-[#0a0a0a] rounded-lg p-2 text-[10px]">
                <p className="text-gray-400 font-bold mb-1">进攻</p>
                <p className="text-[#d1d1d1]">{module.set_piece_offense || "层次包抄"}</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-2 text-[10px]">
                <p className="text-gray-400 font-bold mb-1">防守</p>
                <p className="text-[#d1d1d1]">{module.set_piece_defense || "区域+盯人"}</p>
              </div>
            </div>
          </div>

          {/* Attack/Defense Key Points — accordion */}
          <div className={CARD_CLASS}>
            <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-3">攻防要点</h3>
            <div className="space-y-0">
              {/* 进攻 */}
              <AccordionSection title="进攻" emoji="⚔️" defaultOpen={true}>
                {module.attacking_patterns || "暂无进攻要点"}
              </AccordionSection>

              {/* 防守 */}
              <AccordionSection title="防守" emoji="🛡️" defaultOpen={false}>
                {module.defensive_shape || "暂无防守要点"}
              </AccordionSection>

              {/* 转换 */}
              <AccordionSection title="转换" emoji="🔄" defaultOpen={false}>
                {module.transition_moments || (module.pressing_triggers ? `压迫触发: ${module.pressing_triggers}` : "暂无转换要点")}
              </AccordionSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
