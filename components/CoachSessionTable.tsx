"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { TrainingModule } from "@/lib/types";
import { Check, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

/* ============================================================
   Types
   ============================================================ */

interface CRow {
  id: string; step: number; section: string; color: string;
  name: string; dur: string; setup: string; brief: string;
  hasDia: boolean; dia?: any; cp: string; prog: string;
}

const COLORS: Record<string, string> = {
  "技术训练": "#22c55e",
  "分队对抗": "#3B82F6",
  "冷身放松": "#eab308",
};

const HEADERS = ["序号", "训练项目", "用时", "场地&分组", "内容简述", "场地示意图", "执教要点", "进阶/退阶"];

/* ============================================================
   Flatten
   ============================================================ */

function flat(modules: TrainingModule[]): CRow[] {
  const rows: CRow[] = []; let s = 0;
  const a = (sec: string, nm: string, dur: string, su: string, br: string, cp: string, pr: string, hd: boolean, d?: any) => {
    s++; rows.push({ id: "c"+s, step:s, section:sec, color:COLORS[sec]||"#666", name:nm, dur, setup:su, brief:br||"", hasDia:hd, dia:d, cp:cp||"", prog:pr||"" });
  };
  modules.forEach((m: any) => {
    if (m.module !== "session_plan") return;
    // Warmup merged into first section
    (m.warmup||[]).forEach((w: any) => a("技术训练", w.name||"热身", (w.duration||"?")+"min", "全队", w.description||"", w.coaching_points?.join(";")||"", "-", false));
    (m.activities||[]).forEach((x: any) => a("技术训练", x.name, (x.duration||"?")+"min", (x.area||"全场")+" | "+(x.groups||"全队"), x.description||"", x.coaching_points?.join(";")||"", "升:"+(x.progression||"-")+" 降:"+(x.regression||"-"), !!x.diagram, x.diagram));
    if (m.ssg) a("分队对抗", m.ssg.name, (m.ssg.duration||"?")+"min", (m.ssg.area||"?")+" | "+(m.ssg.players||"?"), m.ssg.rules||"", m.ssg.coaching_focus?.join(";")||"", "-", false);
    (m.cooldown||[]).forEach((c: any) => a("冷身放松", c.name||"整理", (c.duration||"?")+"min", "全队", c.description||"", "-", "-", false));
  });
  return rows;
}

/* ============================================================
   Diagram Modal with Canvas
   ============================================================ */

function DiagramModal({ diagram, onClose }: { diagram?: any; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = "/equipment/场地.png";
    img.onload = () => {
      imgRef.current = img;
      render();
    };

    function render() {
      if (!ctx || !imgRef.current) return;
      const cw = canvas!.width;
      const ch = canvas!.height;
      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      ctx.translate(cw/2, ch/2);
      ctx.scale(zoom, zoom);
      ctx.drawImage(imgRef.current, -imgRef.current.width/2, -imgRef.current.height/2);
      ctx.restore();

      // Draw players from diagram data
      if (diagram) {
        const players = diagram.players || [];
        const opponents = diagram.opponents || [];
        const ball = diagram.ball;

        ctx.save();
        ctx.translate(cw/2, ch/2);
        ctx.scale(zoom, zoom);

        const fieldW = imgRef.current?.width || 800;
        const fieldH = imgRef.current?.height || 500;
        const toX = (x: number) => -fieldW/2 + x * fieldW;
        const toY = (y: number) => -fieldH/2 + y * fieldH;

        // Players
        players.forEach((p: any) => {
          ctx!.beginPath();
          ctx!.arc(toX(p.x), toY(p.y), 12, 0, Math.PI*2);
          ctx!.fillStyle = p.color || "#FF2D55";
          ctx!.fill();
          ctx!.strokeStyle = "#fff";
          ctx!.lineWidth = 2;
          ctx!.stroke();
          ctx!.fillStyle = "#fff";
          ctx!.font = "bold 10px Arial";
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText(p.number || "", toX(p.x), toY(p.y));
        });

        // Opponents
        opponents.forEach((p: any) => {
          ctx!.beginPath();
          ctx!.arc(toX(p.x), toY(p.y), 12, 0, Math.PI*2);
          ctx!.fillStyle = p.color || "#3B82F6";
          ctx!.fill();
          ctx!.strokeStyle = "#fff";
          ctx!.lineWidth = 2;
          ctx!.stroke();
          ctx!.fillStyle = "#fff";
          ctx!.font = "bold 10px Arial";
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText(p.number || "", toX(p.x), toY(p.y));
        });

        // Arrows
        (diagram.arrows || []).forEach((a: any) => {
          ctx!.beginPath();
          ctx!.moveTo(toX(a.from.x), toY(a.from.y));
          ctx!.lineTo(toX(a.to.x), toY(a.to.y));
          ctx!.strokeStyle = a.color || "#FF2D55";
          ctx!.lineWidth = 2;
          if (a.dashed) ctx!.setLineDash([6, 4]);
          ctx!.stroke();
          ctx!.setLineDash([]);
        });

        ctx.restore();
      }
    }

    // Pan with mouse drag
    let dragging = false;
    let lastX = 0, lastY = 0;
    canvas.onmousedown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
    canvas.onmousemove = (e) => { if (dragging) { /* pan if needed */ } };
    canvas.onmouseup = () => { dragging = false; };

    // Zoom with wheel
    canvas.onwheel = (e) => {
      e.preventDefault();
      setZoom(z => { const nz = z * (0.999 ** e.deltaY); return Math.min(Math.max(nz, 0.3), 4); });
    };

    return () => { canvas.onwheel = null; canvas.onmousedown = null; };
  }, [diagram, zoom]);

  useEffect(() => {
    // Re-render on zoom change
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !imgRef.current) return;
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(cw/2, ch/2);
    ctx.scale(zoom, zoom);
    ctx.drawImage(imgRef.current, -imgRef.current.width/2, -imgRef.current.height/2);
    ctx.restore();
  }, [zoom]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-[#333]">
        <span className="text-sm text-white font-bold">战术场地图</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.min(z*1.2, 4))} className="p-1.5 text-gray-400 hover:text-white"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={() => setZoom(z => Math.max(z/1.2, 0.3))} className="p-1.5 text-gray-400 hover:text-white"><ZoomOut className="w-4 h-4" /></button>
          <button onClick={() => setZoom(1)} className="p-1.5 text-gray-400 hover:text-white"><RotateCcw className="w-4 h-4" /></button>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <canvas ref={canvasRef} width={900} height={600}
          className="max-w-full max-h-full rounded-lg shadow-2xl"
          style={{ background: "#2d8c2d" }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   Component
   ============================================================ */

export function CoachSessionTable({ modules }: { modules: TrainingModule[] }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [diagramModal, setDiagramModal] = useState<any | null>(null);

  const rows = useMemo(() => flat(modules), [modules]);
  const total = rows.length;
  const doneCount = rows.filter(r => done.has(r.id)).length;
  const pct = total > 0 ? Math.round((doneCount/total)*100) : 0;

  // Compute segmented progress: warmup / main / cooldown
  const segments = useMemo(() => {
    const warmupRows = rows.filter(r => r.section === "技术训练" && r.name.includes("热身"));
    const cooldownRows = rows.filter(r => r.section === "冷身放松");
    const mainRows = rows.filter(r => !warmupRows.includes(r) && !cooldownRows.includes(r));
    const totalRows = rows.length || 1;
    return [
      { label: "热身", count: warmupRows.length, pct: Math.round((warmupRows.length / totalRows) * 100), color: "#22c55e" },
      { label: "主训", count: mainRows.length, pct: Math.round((mainRows.length / totalRows) * 100), color: "#3B82F6" },
      { label: "冷身", count: cooldownRows.length, pct: Math.round((cooldownRows.length / totalRows) * 100), color: "#eab308" },
    ];
  }, [rows]);

  const spans = useMemo(() => {
    const sp: number[] = new Array(rows.length).fill(1);
    let i = 0;
    while (i < rows.length) {
      const sec = rows[i].section; let c = 0, j = i;
      while (j < rows.length && rows[j].section === sec) { c++; j++; }
      sp[i] = c; i += c;
    }
    return sp;
  }, [rows]);

  if (!total) return <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-8 text-center text-gray-400 text-sm">暂无训练教案</div>;

  return (
    <div className="space-y-3">
      {/* Segmented progress bar */}
      <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-400">训练进度</span>
          <span className="text-[11px] text-[#d92525] font-bold">{pct}%</span>
        </div>
        <div className="h-1.5 bg-[#222] rounded-full overflow-hidden flex">
          <div className="h-full bg-[#d92525] rounded-full transition-all duration-300" style={{width:pct+"%"}} />
        </div>
        <div className="flex items-center justify-between mt-2 gap-1">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: seg.color}} />
              <span className="text-[9px] text-gray-400">{seg.label} {seg.count}项</span>
            </div>
          ))}
          <span className="text-[9px] text-gray-600">{total}项</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            {/* Fixed header */}
            <thead className="sticky top-0 z-10 bg-[#0a0a0a]">
              <tr className="text-[10px] text-gray-400 border-b-2 border-[#333]">
                {HEADERS.map((h, i) => (
                  <th key={i} className={"py-2.5 font-medium " + (i===0?"pl-3 w-10":"pr-2") + (i<=2?" text-left":" text-center")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isDone = done.has(row.id);
                const isFirstInSection = idx === 0 || rows[idx-1]?.section !== row.section;
                const isExpanded = expandedRow === row.id;

                return (
                  <tr key={row.id}
                    onClick={() => { setExpandedRow(isExpanded ? null : row.id); }}
                    className={"cursor-pointer border-b border-[#1a1a1a] transition " + (isDone ? "bg-[#2a1515]" : "hover:bg-[#271919]")}>
                    {/* 序号 + checkbox */}
                    <td className="py-2 pl-3 text-center">
                      <div onClick={(e) => { e.stopPropagation(); setDone(p => { const n = new Set(p); n.has(row.id)?n.delete(row.id):n.add(row.id); return n; }); }}
                        className={"w-5 h-5 rounded border-2 mx-auto flex items-center justify-center cursor-pointer transition " + (isDone ? "bg-[#d92525] border-[#d92525]" : "border-[#444] hover:border-[#d92525]/50")}>
                        {isDone && <Check className="w-3 h-3 text-black" />}
                      </div>
                    </td>

                    {/* 训练项目 — with section color on first row */}
                    <td className={"py-2 pr-2 " + (isFirstInSection ? "border-l-2" : "")}
                      style={isFirstInSection ? { borderLeftColor: row.color, borderLeftWidth: "3px" } : undefined}>
                      <div className="flex items-center gap-1.5">
                        {isFirstInSection && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                            style={{backgroundColor: row.color+"20", color: row.color}}>
                            {row.section}
                          </span>
                        )}
                        <p className={"text-sm " + (isDone ? "text-gray-400 line-through" : "text-white")}
                          title={row.name.length > 20 ? row.name : undefined}>{row.name}</p>
                      </div>
                    </td>

                    {/* 用时 */}
                    <td className="py-2 pr-2 text-center">
                      <span className={"text-xs whitespace-nowrap " + (isDone ? "text-gray-600" : "text-gray-300")}>{row.dur}</span>
                    </td>

                    {/* 场地&分组 */}
                    <td className="py-2 pr-2 text-center">
                      <span className={"text-[11px] " + (isDone ? "text-gray-600" : "text-gray-400")}>{row.setup}</span>
                    </td>

                    {/* 内容简述 */}
                    <td className="py-2 pr-2 text-center">
                      <span className={"text-[11px] truncate max-w-[120px] inline-block " + (isDone ? "text-gray-600" : "text-gray-400")}
                        title={row.brief || undefined}>
                        {row.brief?.slice(0, 20) || "-"}
                      </span>
                    </td>

                    {/* 场地示意图 */}
                    <td className="py-2 pr-2 text-center">
                      {row.hasDia ? (
                        <button onClick={(e) => { e.stopPropagation(); setDiagramModal(row.dia); }}
                          className="text-[10px] px-2.5 py-1 rounded bg-[#1e1e1e] hover:bg-[#271919] text-[#d1d1d1] border border-[#333] hover:border-[#d92525] transition">
                          查看
                        </button>
                      ) : <span className="text-[10px] text-gray-600">-</span>}
                    </td>

                    {/* 执教要点 */}
                    <td className="py-2 pr-2 text-center">
                      <span className={"text-[10px] " + (isDone ? "text-gray-600" : "text-gray-400")}
                        title={row.cp || undefined}>
                        {row.cp?.slice(0, 18) || "-"}
                      </span>
                    </td>

                    {/* 进阶/退阶 */}
                    <td className="py-2 pr-2 text-center">
                      <span className={"text-[10px] " + (isDone ? "text-gray-600" : "text-gray-400")}
                        title={row.prog || undefined}>
                        {row.prog?.slice(0, 15) || "-"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diagram modal */}
      {diagramModal && <DiagramModal diagram={diagramModal} onClose={() => setDiagramModal(null)} />}
    </div>
  );
}
