"use client";

import { useEffect, useRef, useCallback } from "react";
import { Canvas, Rect, Circle, Line, IText, Text, Group, FabricImage, Path, Polygon } from "fabric";
import { ROUTE_STYLES } from "./BoardToolbar";

const FW = 1050;
const FH = 680;

interface FabricBoardProps {
  activeTool: string;
  activeColor: string;
  onObjectSelected?: (obj: any) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  boardRef: React.MutableRefObject<Canvas | null>;
}

export function FabricBoard({ activeTool, activeColor, onObjectSelected, onHistoryChange, boardRef }: FabricBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const lineStartRef = useRef<{ x: number; y: number } | null>(null);
  const tempLineRef = useRef<Line | null>(null);

  useEffect(() => {
    if (!canvasElRef.current || boardRef.current) return;
    const el = canvasElRef.current;
    const canvas = new Canvas(el, { width: FW, height: FH, backgroundColor: "#ffffff", selection: true, preserveObjectStacking: true });
    boardRef.current = canvas;

    // History
    let history: string[] = [], historyIdx = -1, restoring = false;
    const save = () => {
      if (restoring) return;
      history = history.slice(0, historyIdx + 1);
      history.push(JSON.stringify(canvas.toJSON()));
      if (history.length > 60) history.shift();
      historyIdx = history.length - 1;
      onHistoryChange?.(historyIdx > 0, historyIdx < history.length - 1);
    };
    const load = (json: string) => {
      restoring = true;
      canvas.loadFromJSON(JSON.parse(json)).then(() => { restoring = false; canvas.requestRenderAll(); });
    };
    (canvas as any)._undo = () => { if (historyIdx <= 0) return; historyIdx--; load(history[historyIdx]); onHistoryChange?.(historyIdx > 0, historyIdx < history.length - 1); };
    (canvas as any)._redo = () => { if (historyIdx >= history.length - 1) return; historyIdx++; load(history[historyIdx]); onHistoryChange?.(historyIdx > 0, historyIdx < history.length - 1); };
    canvas.on("object:modified", save);
    canvas.on("object:added", (e) => { if (e.target && !restoring) save(); });
    canvas.on("selection:created", (e) => onObjectSelected?.(e.selected?.[0] || null));
    canvas.on("selection:updated", (e) => onObjectSelected?.(e.selected?.[0] || null));
    canvas.on("selection:cleared", () => onObjectSelected?.(null));

    // Drop
    const container = containerRef.current!;
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const d = e.dataTransfer?.getData("application/equipment"); if (!d) return;
      const { src, name } = JSON.parse(d);
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (FW / rect.width);
      const y = (e.clientY - rect.top) * (FH / rect.height);
      FabricImage.fromURL(src).then((img) => { img.set({ left: x-25, top: y-25, scaleX: 0.15, scaleY: 0.15 }); (img as any).name = name; canvas.add(img); canvas.setActiveObject(img); canvas.requestRenderAll(); });
    };
    container.addEventListener("drop", onDrop);
    container.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer!.dropEffect = "copy"; });

    return () => { container.removeEventListener("drop", onDrop); canvas.dispose(); boardRef.current = null; };
  }, []);

  // ---- LINE/CURVE drawing (replaces freehand) ----
  const isRouteTool = activeTool === "draw_run" || activeTool === "draw_dribble" || activeTool === "draw_pass" || activeTool === "draw_curve";

  const getLineStyle = useCallback(() => {
    const style = ROUTE_STYLES[activeTool];
    return {
      stroke: activeColor,
      strokeWidth: style?.width || 3,
      strokeDashArray: style?.strokeDash || null,
      fill: "transparent",
      selectable: true,
      evented: true,
    };
  }, [activeTool, activeColor]);

  useEffect(() => {
    const c = boardRef.current; if (!c) return;
    c.isDrawingMode = false;
    c.selection = !isRouteTool;

    const onMouseDown = (opt: any) => {
      if (!isRouteTool) return;
      const p = opt.scenePoint;
      lineStartRef.current = { x: p.x, y: p.y };

      // Create temp line
      const t = new Line([p.x, p.y, p.x, p.y], getLineStyle());
      (t as any)._temp = true;
      c.add(t);
      tempLineRef.current = t;
      c.requestRenderAll();
    };

    const onMouseMove = (opt: any) => {
      if (!isRouteTool || !lineStartRef.current || !tempLineRef.current) return;
      const p = opt.scenePoint;
      if (activeTool === "draw_curve" || activeTool === "draw_dribble") {
        // Quadratic bezier curve for curve and dribble tools
        const x1 = lineStartRef.current.x, y1 = lineStartRef.current.y;
        tempLineRef.current.set({ x1, y1, x2: p.x, y2: p.y });
      } else {
        tempLineRef.current.set({ x1: lineStartRef.current.x, y1: lineStartRef.current.y, x2: p.x, y2: p.y });
      }
      c.requestRenderAll();
    };

    const onMouseUp = (opt: any) => {
      if (!isRouteTool || !lineStartRef.current) return;
      const p = opt.scenePoint;
      // Remove temp, add final line
      if (tempLineRef.current) { c.remove(tempLineRef.current); tempLineRef.current = null; }

      const dx = Math.abs(p.x - lineStartRef.current.x);
      const dy = Math.abs(p.y - lineStartRef.current.y);
      if (dx < 3 && dy < 3) { lineStartRef.current = null; return; } // too short

      const x1 = lineStartRef.current.x, y1 = lineStartRef.current.y;
      const color = getLineStyle().stroke || "#FF2D55";

      if (activeTool === "draw_curve" || activeTool === "draw_dribble") {
        // Quadratic bezier curve
        const cx = p.x, cy = p.y;
        const pathStr = `M ${x1} ${y1} Q ${cx} ${cy} ${p.x} ${p.y}`;
        const path = new Path(pathStr, getLineStyle());
        (path as any)._isRoute = true; (path as any)._routeType = activeTool;
        c.add(path);
        // Arrow head at endpoint
        const angle = Math.atan2(p.y - cy, p.x - cx);
        addArrowHead(c, p.x, p.y, angle, color);
      } else {
        const line = new Line([x1, y1, p.x, p.y], getLineStyle());
        (line as any)._isRoute = true; (line as any)._routeType = activeTool;
        c.add(line);
        // Arrow head at endpoint
        const angle = Math.atan2(p.y - y1, p.x - x1);
        addArrowHead(c, p.x, p.y, angle, color);
      }
      lineStartRef.current = null;
      c.requestRenderAll();
    };

    c.on("mouse:down", onMouseDown);
    c.on("mouse:move", onMouseMove);
    c.on("mouse:up", onMouseUp);

    return () => {
      c.off("mouse:down", onMouseDown);
      c.off("mouse:move", onMouseMove);
      c.off("mouse:up", onMouseUp);
    };
  }, [isRouteTool, activeTool, getLineStyle]);

  // Text tool
  useEffect(() => {
    const c = boardRef.current; if (!c) return;
    const h = (opt: any) => {
      if (activeTool !== "add_text") return;
      const t = new IText("文字", { left: opt.scenePoint.x, top: opt.scenePoint.y, fontSize: 22, fill: activeColor, fontFamily: "Arial", fontWeight: "bold" });
      c.add(t); c.setActiveObject(t); t.enterEditing(); c.requestRenderAll();
    };
    if (activeTool === "add_text") { c.on("mouse:down", h); return () => c.off("mouse:down", h); }
    return () => c.off("mouse:down", h);
  }, [activeTool, activeColor]);

  // Place player
  useEffect(() => {
    const c = boardRef.current; if (!c) return;
    const h = (opt: any) => {
      if (activeTool !== "place_player") return;
      const players = c.getObjects().filter((o: any) => o._isPlayer);
      const nextNum = players.length + 1;
      const color = activeColor;
      // Bigger circle + number
      const cr = new Circle({ left: opt.scenePoint.x - 20, top: opt.scenePoint.y - 20, radius: 20, fill: color, stroke: "#FFF", strokeWidth: 2.5 });
      const tx = new Text(String(nextNum), {
        left: opt.scenePoint.x - 10, top: opt.scenePoint.y - 12,
        fontSize: 16, fontFamily: "Arial", fontWeight: "bold",
        fill: ["#FFD700","#FFF","#00FF88"].includes(color) ? "#000" : "#FFF",
        selectable: false,
      });
      const g = new Group([cr, tx], { left: opt.scenePoint.x - 20, top: opt.scenePoint.y - 20 });
      (g as any)._isPlayer = true; (g as any).number = String(nextNum);
      g.setControlsVisibility({ mtr: false });
      c.add(g); c.setActiveObject(g); c.requestRenderAll();
    };
    if (activeTool === "place_player") { c.on("mouse:down", h); return () => c.off("mouse:down", h); }
    return () => c.off("mouse:down", h);
  }, [activeTool, activeColor]);

  // Erase tool
  useEffect(() => {
    const c = boardRef.current; if (!c) return;
    const h = () => {
      if (activeTool !== "erase") return;
      const a = c.getActiveObject(); if (a) { c.remove(a); c.discardActiveObject(); c.requestRenderAll(); }
    };
    if (activeTool === "erase") { c.on("mouse:down", h); return () => c.off("mouse:down", h); }
    return () => c.off("mouse:down", h);
  }, [activeTool]);

  return (
    <div ref={containerRef} className="flex-1 flex items-start justify-center overflow-auto bg-pitch-900 p-2" style={{ minHeight: 0 }}>
      <canvas ref={canvasElRef} className="max-w-full" style={{ width: "100%", height: "auto", maxHeight: "calc(100vh - 120px)", objectFit: "contain" }} />
    </div>
  );
}

/** Draw arrow head at the end of a line */
function addArrowHead(c: Canvas, x: number, y: number, angle: number, color: string) {
  const s = 10;
  const tip = { x, y };
  const left = { x: x - s * Math.cos(angle - Math.PI / 6), y: y - s * Math.sin(angle - Math.PI / 6) };
  const right = { x: x - s * Math.cos(angle + Math.PI / 6), y: y - s * Math.sin(angle + Math.PI / 6) };
  const tri = new Polygon([tip, left, right], {
    fill: color, stroke: color, strokeWidth: 1,
    selectable: false, evented: false,
  });
  (tri as any)._isRouteArrow = true;
  c.add(tri);
}

/** Hide default field markings (when a field image is loaded) */
export function hideFieldMarkings(c: Canvas) {
  c.getObjects().filter((o: any) => o._isFieldMarking).forEach((o: any) => (o.visible = false));
  c.requestRenderAll();
}

export function exportBoardAsPNG(canvas: Canvas) {
  const a = document.createElement("a");
  a.href = canvas.toDataURL({ format: "png", multiplier: 2 });
  a.download = `tactical-${Date.now()}.png`;
  a.click();
}
