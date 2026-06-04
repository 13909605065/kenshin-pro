"use client";

import { useEffect, useRef, useCallback } from "react";
import { Canvas, Rect, Circle, Line, IText, FabricText, Group, FabricImage, Path, Polygon } from "fabric";
import { ROUTE_STYLES } from "./BoardToolbar";
import { TAC_THEME } from "@/lib/tactical-theme";

const FW = 1050;
const FH = 680;

interface FabricBoardProps {
  activeTool: string;
  activeColor: string;
  onObjectSelected?: (obj: any) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onCanvasChange?: () => void;
  boardRef: React.MutableRefObject<Canvas | null>;
  onPlayerDoubleClick?: (playerObj: any, screenX: number, screenY: number) => void;
  /** Layer lock states */
  lockPlayers?: boolean;
  lockRoutes?: boolean;
}

export function FabricBoard({ activeTool, activeColor, onObjectSelected, onHistoryChange, onCanvasChange, boardRef, onPlayerDoubleClick, lockPlayers, lockRoutes }: FabricBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const lineStartRef = useRef<{ x: number; y: number } | null>(null);
  const tempLineRef = useRef<Path | null>(null);
  // Touch gesture state
  const pinchStartRef = useRef<{ dist: number; zoom: number; cx: number; cy: number } | null>(null);
  const touchCountRef = useRef<number>(0);
  const lastTouchRef = useRef<number>(0);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedAutoSave = useCallback(() => {
    if (!onCanvasChange) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      onCanvasChange();
    }, 800);
  }, [onCanvasChange]);

  useEffect(() => {
    if (!canvasElRef.current || boardRef.current) return;
    const el = canvasElRef.current;
    const canvas = new Canvas(el, {
      width: FW, height: FH,
      backgroundColor: TAC_THEME.bg,
      selection: true,
      preserveObjectStacking: true,
      cornerStyle: "circle",
      cornerSize: 10,
      cornerColor: TAC_THEME.accent,
      cornerStrokeColor: "#FFF",
      transparentCorners: false,
      // Mobile touch optimizations
      allowTouchScrolling: false,
      stopContextMenu: true,
      fireRightClick: true,
    });

    // Mouse wheel zoom (desktop)
    canvas.on("mouse:wheel", (opt: any) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.min(Math.max(zoom, 0.3), 5);
      const point = { x: opt.e.offsetX, y: opt.e.offsetY };
      canvas.zoomToPoint(point as any, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // ─── Mobile Touch Gestures ───
    // Pinch-to-zoom: track two-finger distance changes
    const getTouchDist = (t1: Touch, t2: Touch): number => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (t1: Touch, t2: Touch): { x: number; y: number } => {
      return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
    };

    const onTouchStart = (e: TouchEvent) => {
      touchCountRef.current = e.touches.length;
      lastTouchRef.current = Date.now();

      if (e.touches.length === 2) {
        // Two fingers — start pinch zoom
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = getTouchDist(t1, t2);
        pinchStartRef.current = { dist, zoom: canvas.getZoom(), cx: 0, cy: 0 };
        // Prevent Fabric from handling 1-finger events while pinching
        canvas.selection = false;
        e.preventDefault();
      } else if (e.touches.length === 1 && isRouteTool) {
        // Single finger route drawing — let Fabric handle it
        canvas.selection = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartRef.current) {
        // Pinch zoom — use zoomToPoint to properly center on pinch midpoint
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = getTouchDist(t1, t2);
        const center = getTouchCenter(t1, t2);
        const scale = dist / pinchStartRef.current.dist;
        let newZoom = pinchStartRef.current.zoom * scale;
        newZoom = Math.min(Math.max(newZoom, 0.3), 5);

        // Convert client coordinates to canvas element CSS coordinates
        const rect = el.getBoundingClientRect();
        const point = {
          x: center.x - rect.left,
          y: center.y - rect.top,
        };
        canvas.zoomToPoint(point as any, newZoom);
        canvas.requestRenderAll();
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartRef.current = null;
        // Restore selection mode
        if (!isRouteTool) {
          canvas.selection = true;
        }
      }
      touchCountRef.current = e.touches.length;
    };

    // Attach touch handlers to the canvas element
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

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
    canvas.on("object:modified", () => { save(); debouncedAutoSave(); });
    canvas.on("object:added", (e) => { if (e.target && !restoring) { save(); debouncedAutoSave(); } });
    canvas.on("selection:created", (e) => onObjectSelected?.(e.selected?.[0] || null));
    canvas.on("selection:updated", (e) => onObjectSelected?.(e.selected?.[0] || null));
    canvas.on("selection:cleared", () => onObjectSelected?.(null));

    // Double-click player to edit number — delegate to inline popup
    canvas.on("mouse:dblclick", (opt: any) => {
      const target = opt.target;
      if (!target || !(target as any)._isPlayer) return;
      if (onPlayerDoubleClick) {
        const rect = el.getBoundingClientRect();
        const zoom = canvas.getZoom();
        const group = target as Group;
        const gLeft = group.left || 0;
        const gTop = group.top || 0;
        const screenX = rect.left + gLeft * zoom;
        const screenY = rect.top + gTop * zoom;
        onPlayerDoubleClick(target, screenX, screenY);
      }
    });

    // Default: vector field with dark muted green grass
    drawVectorField(canvas);

    // Drop handler — with proper scaling controls for all equipment
    const container = containerRef.current!;
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const d = e.dataTransfer?.getData("application/equipment"); if (!d) return;
      const { src, name } = JSON.parse(d);
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (FW / rect.width);
      const y = (e.clientY - rect.top) * (FH / rect.height);

      // Handle agility ring as vector (hollow circle, no PNG border issue)
      if (name === "圆形环" || name === "敏捷环") {
        const ring = new Circle({
          left: x - 20, top: y - 20,
          radius: 20,
          fill: "transparent",
          stroke: "#000",
          strokeWidth: 3,
          selectable: true,
          evented: true,
          lockUniScaling: true,
        });
        (ring as any).name = name;
        ring.setControlsVisibility({
          tl: true, tr: true, bl: true, br: true,
          ml: true, mr: true, mt: true, mb: true,
          mtr: true,
        });
        canvas.add(ring);
        canvas.setActiveObject(ring);
        canvas.requestRenderAll();
        return;
      }

      // Handle wall (人墙) — load PNG with lockUniScaling
      // Handle cones (标志盘) — load PNG with lockUniScaling
      FabricImage.fromURL(src).then((img) => {
        img.set({
          left: x - 35, top: y - 35,
          scaleX: 0.3, scaleY: 0.3,
          lockUniScaling: true,
          selectable: true,
          evented: true,
        });
        (img as any).name = name;
        img.setControlsVisibility({
          tl: true, tr: true, bl: true, br: true,
          ml: true, mr: true, mt: true, mb: true,
          mtr: true,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      });
    };
    container.addEventListener("drop", onDrop);
    container.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer!.dropEffect = "copy"; });

    return () => {
      container.removeEventListener("drop", onDrop);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      canvas.dispose();
      boardRef.current = null;
    };
  }, []);

  // ---- Route tools: straight (跑动/传球/直线) vs curved (带球 only) ----
  const isStraightTool = activeTool === "draw_run" || activeTool === "draw_pass" || activeTool === "draw_curve";
  const isCurveTool = activeTool === "draw_dribble";
  const isRouteTool = isStraightTool || isCurveTool;

  const getLineStyle = useCallback(() => {
    const style = ROUTE_STYLES[activeTool];
    return {
      stroke: activeColor,
      strokeWidth: style?.width || 3,
      strokeDashArray: style?.strokeDash || null,
      fill: "transparent",
      selectable: true,
      evented: true,
      strokeLineCap: "round" as CanvasLineCap,
      strokeLineJoin: "round" as CanvasLineJoin,
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

      // Create temp visible path
      const style = getLineStyle();
      const pathStr = `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
      const t = new Path(pathStr, style);
      (t as any)._temp = true;
      c.add(t);
      tempLineRef.current = t;
      c.requestRenderAll();
    };

    const onMouseMove = (opt: any) => {
      if (!isRouteTool || !lineStartRef.current || !tempLineRef.current) return;
      const p = opt.scenePoint;
      const x1 = lineStartRef.current.x, y1 = lineStartRef.current.y;
      // Show live preview as straight line
      tempLineRef.current.set({ path: [["M", x1, y1], ["L", p.x, p.y]] as any });
      c.requestRenderAll();
    };

    const onMouseUp = (opt: any) => {
      if (!isRouteTool || !lineStartRef.current) return;
      const p = opt.scenePoint;
      if (tempLineRef.current) { c.remove(tempLineRef.current); tempLineRef.current = null; }

      const dx = Math.abs(p.x - lineStartRef.current.x);
      const dy = Math.abs(p.y - lineStartRef.current.y);
      if (dx < 3 && dy < 3) { lineStartRef.current = null; return; }

      const x1 = lineStartRef.current.x, y1 = lineStartRef.current.y;
      const x2 = p.x, y2 = p.y;
      const color = (getLineStyle() as any).stroke || "#000";

      let pathData: string;
      let arrowAngle: number;

      if (isCurveTool) {
        // draw_dribble: pronounced bezier curve for dribbling path
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const perpX = -(y2 - y1) / (len || 1);
        const perpY = (x2 - x1) / (len || 1);
        const arcOffset = Math.min(len * 0.5, 150); // larger arc for pronounced curves
        const cx = mx + perpX * arcOffset;
        const cy = my + perpY * arcOffset;
        pathData = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
        arrowAngle = Math.atan2(y2 - cy, x2 - cx);
      } else {
        // Straight line tools (draw_run, draw_pass, draw_curve)
        pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
        arrowAngle = Math.atan2(y2 - y1, x2 - x1);
      }

      const path = new Path(pathData, getLineStyle());
      (path as any)._isRoute = true; (path as any)._routeType = activeTool;
      c.add(path);

      // Arrow head at endpoint
      addArrowHead(c, x2, y2, arrowAngle, color);

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

  // Place player — 8-point circular anchors, perfectly centered number
  useEffect(() => {
    const c = boardRef.current; if (!c) return;
    const h = (opt: any) => {
      if (activeTool !== "place_player") return;
      const players = c.getObjects().filter((o: any) => o._isPlayer);
      const nextNum = players.length + 1;
      const color = activeColor;
      const R = TAC_THEME.playerRadius;
      const cx = opt.scenePoint.x, cy = opt.scenePoint.y;

      // Hollow ring player marker — thin colored ring + white number
      const cr = new Circle({
        left: cx - R, top: cy - R,
        radius: R,
        fill: "transparent",
        stroke: color,
        strokeWidth: TAC_THEME.playerRingWidth,
        selectable: false,
        evented: false,
      });

      const tx = new FabricText(String(nextNum), {
        left: cx, top: cy,
        originX: "center",
        originY: "center",
        fontSize: R * 0.8,
        fontFamily: "Arial",
        fontWeight: "bold",
        fill: "#FFF",
        selectable: false,
        evented: false,
      });

      const g = new Group([cr, tx], {
        left: cx - R, top: cy - R,
        selectable: true,
        evented: true,
      });
      (g as any)._isPlayer = true;
      (g as any).number = String(nextNum);
      g.setControlsVisibility({
        tl: true, tr: true, bl: true, br: true,
        ml: true, mr: true, mt: true, mb: true,
        mtr: true,
      });
      g.set({
        cornerStyle: "circle",
        cornerSize: 10,
        cornerColor: TAC_THEME.accent,
        cornerStrokeColor: "#FFF",
        transparentCorners: false,
        padding: 0,
        lockUniScaling: true,
      } as any);

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

  // ─── Layer locking ───
  useEffect(() => {
    const c = boardRef.current; if (!c) return;
    if (lockPlayers === undefined && lockRoutes === undefined) return;

    const all = c.getObjects();
    all.forEach((o: any) => {
      if (o._isFieldBg) return; // field always unselectable
      if (o._isPlayer && lockPlayers !== undefined) {
        o.set({ selectable: !lockPlayers, evented: !lockPlayers });
      }
      if ((o._isRoute || o._isRouteArrow) && lockRoutes !== undefined) {
        o.set({ selectable: !lockRoutes, evented: !lockRoutes });
      }
    });
    c.discardActiveObject();
    c.requestRenderAll();
  }, [lockPlayers, lockRoutes]);

  // Handle field selection from EquipmentPalette
  useEffect(() => {
    const c = boardRef.current; if (!c) return;
    (c as any)._setFieldImage = (fn: string) => {
      // Clear old field objects (both vector and image)
      c.getObjects().filter((o: any) => o._isFieldBg).forEach((o: any) => c.remove(o));
      // Default → dark muted green vector field
      if (fn === "default" || !fn) {
        drawVectorField(c);
        return;
      }
      // Load field PNG — fill canvas with tight margins
      FabricImage.fromURL(`/equipment/${fn}.png`).then((img) => {
        c.getObjects().filter((o: any) => o._isFieldBg).forEach((o: any) => c.remove(o));
        const margin = 30;
        const sw = (c.width! - margin * 2) / img.width!;
        const sh = (c.height! - margin * 2) / img.height!;
        const s = Math.min(sw, sh); // fit — center with equal margins
        img.set({
          left: (c.width! - img.width! * s) / 2,
          top: (c.height! - img.height! * s) / 2,
          scaleX: s, scaleY: s, selectable: false, evented: false,
        });
        (img as any)._isFieldBg = true;
        const others = c.getObjects().filter((o: any) => !o._isFieldBg);
        others.forEach((o: any) => c.remove(o));
        c.add(img);
        others.forEach((o: any) => c.add(o));
        c.requestRenderAll();
      });
    };
  }, []);

  const zoomIn = () => {
    const c = boardRef.current; if (!c) return;
    let z = c.getZoom() * 1.15;
    z = Math.min(z, 5);
    c.zoomToPoint({ x: c.width! / 2, y: c.height! / 2 } as any, z);
    c.requestRenderAll();
  };
  const zoomOut = () => {
    const c = boardRef.current; if (!c) return;
    let z = c.getZoom() / 1.15;
    z = Math.max(z, 0.3);
    c.zoomToPoint({ x: c.width! / 2, y: c.height! / 2 } as any, z);
    c.requestRenderAll();
  };
  const zoomFit = () => {
    const c = boardRef.current; if (!c) return;
    c.zoomToPoint({ x: c.width! / 2, y: c.height! / 2 } as any, 1);
    c.requestRenderAll();
  };

  return (
    <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden relative" style={{ minHeight: 0, backgroundColor: TAC_THEME.bg }}>
      <canvas ref={canvasElRef} className="max-w-full max-h-full" style={{ touchAction: "none" }} />
      {/* Floating zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-30">
        <button onClick={zoomIn} className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors"
          style={{ backgroundColor: TAC_THEME.bgCard, color: TAC_THEME.textDim, border: `1px solid ${TAC_THEME.border}` }}
          onMouseEnter={(e) => { e.currentTarget.style.color = TAC_THEME.accent; e.currentTarget.style.backgroundColor = TAC_THEME.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TAC_THEME.textDim; e.currentTarget.style.backgroundColor = TAC_THEME.bgCard; }}
          title="放大">+</button>
        <button onClick={zoomFit} className="w-7 h-7 flex items-center justify-center rounded text-[10px] font-mono transition-colors"
          style={{ backgroundColor: TAC_THEME.bgCard, color: TAC_THEME.textDim, border: `1px solid ${TAC_THEME.border}` }}
          onMouseEnter={(e) => { e.currentTarget.style.color = TAC_THEME.accent; e.currentTarget.style.backgroundColor = TAC_THEME.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TAC_THEME.textDim; e.currentTarget.style.backgroundColor = TAC_THEME.bgCard; }}
          title="重置缩放">1:1</button>
        <button onClick={zoomOut} className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors"
          style={{ backgroundColor: TAC_THEME.bgCard, color: TAC_THEME.textDim, border: `1px solid ${TAC_THEME.border}` }}
          onMouseEnter={(e) => { e.currentTarget.style.color = TAC_THEME.accent; e.currentTarget.style.backgroundColor = TAC_THEME.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TAC_THEME.textDim; e.currentTarget.style.backgroundColor = TAC_THEME.bgCard; }}
          title="缩小">-</button>
      </div>
    </div>
  );
}

/** Draw arrow head at the end of a line/curve */
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

/** Draw a complete vector football field — horizontal, attacking left→right */
export function drawVectorField(canvas: Canvas) {
  canvas.getObjects().filter((o: any) => o._isFieldBg).forEach((o: any) => canvas.remove(o));

  const W = canvas.width!, H = canvas.height!;
  const margin = 15;
  const fw = W - margin * 2;
  const fh = H - margin * 2;
  const cx = margin + fw / 2;
  const cy = margin + fh / 2;

  const grass = new Rect({
    left: margin, top: margin, width: fw, height: fh,
    fill: TAC_THEME.grass, stroke: TAC_THEME.fieldLine, strokeWidth: 1.5,
    selectable: false, evented: false,
  });

  const items: any[] = [grass];

  // Halfway line
  items.push(new Line([cx, margin, cx, margin + fh], {
    stroke: TAC_THEME.fieldLine, strokeWidth: 1.5,
    selectable: false, evented: false,
  }));

  // Center circle
  const cr = 55;
  items.push(new Circle({
    left: cx - cr, top: cy - cr, radius: cr,
    fill: "transparent", stroke: TAC_THEME.fieldLine, strokeWidth: 1.5,
    selectable: false, evented: false,
  }));
  items.push(new Circle({
    left: cx - 3, top: cy - 3, radius: 3,
    fill: TAC_THEME.fieldLineStrong, stroke: "",
    selectable: false, evented: false,
  }));

  // Field line color — gray-white for all lines
  const LINE = TAC_THEME.fieldLine;
  const LINE_W = 1.5;
  // Accent red — ONLY for penalty spot + center dot
  const ACCENT = TAC_THEME.accent;

  // Penalty areas (left and right) — gray-white
  const paW = fw * 0.16;
  const paH = fh * 0.44;
  const paTop = margin + (fh - paH) / 2;
  items.push(new Rect({
    left: margin, top: paTop, width: paW, height: paH,
    fill: "transparent", stroke: LINE, strokeWidth: LINE_W,
    selectable: false, evented: false,
  }));
  items.push(new Rect({
    left: margin + fw - paW, top: paTop, width: paW, height: paH,
    fill: "transparent", stroke: LINE, strokeWidth: LINE_W,
    selectable: false, evented: false,
  }));

  // Goal areas — gray-white
  const gaW = fw * 0.06;
  const gaH = fh * 0.22;
  const gaTop = margin + (fh - gaH) / 2;
  items.push(new Rect({
    left: margin, top: gaTop, width: gaW, height: gaH,
    fill: "transparent", stroke: LINE, strokeWidth: LINE_W,
    selectable: false, evented: false,
  }));
  items.push(new Rect({
    left: margin + fw - gaW, top: gaTop, width: gaW, height: gaH,
    fill: "transparent", stroke: LINE, strokeWidth: LINE_W,
    selectable: false, evented: false,
  }));

  // Goals — gray-white (NOT red)
  const goalW = 7;
  const goalH = fh * 0.12;
  const goalTop = margin + (fh - goalH) / 2;
  items.push(new Rect({
    left: margin - goalW / 2, top: goalTop, width: goalW, height: goalH,
    fill: LINE, stroke: "", rx: 2, ry: 2,
    selectable: false, evented: false,
  }));
  items.push(new Rect({
    left: margin + fw - goalW / 2, top: goalTop, width: goalW, height: goalH,
    fill: LINE, stroke: "", rx: 2, ry: 2,
    selectable: false, evented: false,
  }));

  // Penalty spots — accent red (only red dots on field)
  const penSpotX = margin + paW + fw * 0.08;
  items.push(new Circle({
    left: penSpotX - 2, top: cy - 2, radius: 2,
    fill: ACCENT, stroke: "",
    selectable: false, evented: false,
  }));
  items.push(new Circle({
    left: (margin + fw - paW - fw * 0.08) - 2, top: cy - 2, radius: 2,
    fill: ACCENT, stroke: "",
    selectable: false, evented: false,
  }));

  // Corner arcs
  const arcR = 14;
  const corners = [
    [margin, margin], [margin + fw, margin],
    [margin, margin + fh], [margin + fw, margin + fh],
  ];
  corners.forEach(([cx2, cy2]) => {
    const sx = cx2 === margin ? 1 : -1;
    const sy = cy2 === margin ? 1 : -1;
    const arc = new Path(
      `M ${cx2} ${cy2 + sy * arcR} A ${arcR} ${arcR} 0 0 ${sy > 0 ? 1 : 0} ${cx2 + sx * arcR} ${cy2}`,
      { stroke: TAC_THEME.goalFill, strokeWidth: 1.5, fill: "transparent", selectable: false, evented: false }
    );
    items.push(arc);
  });

  const field = new Group(items, { left: 0, top: 0, selectable: false, evented: false });
  (field as any)._isFieldBg = true;

  const others = canvas.getObjects().filter((o: any) => !o._isFieldBg);
  others.forEach((o: any) => canvas.remove(o));
  canvas.add(field);
  others.forEach((o: any) => canvas.add(o));
  canvas.requestRenderAll();
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
