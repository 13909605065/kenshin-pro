"use client";

import { useEffect, useRef, useCallback } from "react";
import { Canvas, Rect, Circle, Line, IText, FabricText, Group, FabricImage, Path, Polygon } from "fabric";
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
  const tempLineRef = useRef<Path | null>(null);

  useEffect(() => {
    if (!canvasElRef.current || boardRef.current) return;
    const el = canvasElRef.current;
    const canvas = new Canvas(el, {
      width: FW, height: FH,
      backgroundColor: "transparent",
      selection: true,
      preserveObjectStacking: true,
      cornerStyle: "circle",
      cornerSize: 10,
      cornerColor: "#FF2D55",
      cornerStrokeColor: "#FFF",
      transparentCorners: false,
    });

    // Mouse wheel zoom
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

    // Double-click player to edit number
    canvas.on("mouse:dblclick", (opt: any) => {
      const target = opt.target;
      if (!target || !(target as any)._isPlayer) return;
      const currentNum = (target as any).number || "";
      const newNum = prompt("输入球员号码:", currentNum);
      if (newNum !== null && newNum.trim() !== "") {
        (target as any).number = newNum.trim();
        // Update the FabricText inside the group
        const group = target as Group;
        const objs = (group as any)._objects || [];
        const textObj = objs.find((o: any) => o instanceof FabricText);
        if (textObj) {
          textObj.set({ text: newNum.trim() });
          canvas.requestRenderAll();
          save();
        }
      }
    });

    // Load field image as background (not vector drawing)
    FabricImage.fromURL("/equipment/场地.png").then((img) => {
      const scaleX = FW / (img.width || 1);
      const scaleY = FH / (img.height || 1);
      const scale = Math.max(scaleX, scaleY);
      img.set({
        left: (FW - (img.width || 0) * scale) / 2,
        top: (FH - (img.height || 0) * scale) / 2,
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
        excludeFromExport: false,
      });
      (img as any)._isFieldBg = true;
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.requestRenderAll();
    }).catch(() => {
      // Fallback to vector field if image fails
      drawVectorField(canvas);
    });

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
          mtr: false,
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
          left: x - 25, top: y - 25,
          scaleX: 0.2, scaleY: 0.2,
          lockUniScaling: true,
          selectable: true,
          evented: true,
        });
        (img as any).name = name;
        img.setControlsVisibility({
          tl: true, tr: true, bl: true, br: true,
          ml: true, mr: true, mt: true, mb: true,
          mtr: false,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      });
    };
    container.addEventListener("drop", onDrop);
    container.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer!.dropEffect = "copy"; });

    return () => { container.removeEventListener("drop", onDrop); canvas.dispose(); boardRef.current = null; };
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
      const R = 20;
      const cx = opt.scenePoint.x, cy = opt.scenePoint.y;
      const textColor = ["#FFD700", "#FFF", "#00FF88"].includes(color) ? "#000" : "#FFF";

      // Circle — centered at click
      const cr = new Circle({
        left: cx - R, top: cy - R,
        radius: R,
        fill: color,
        stroke: "#FFF",
        strokeWidth: 2.5,
        selectable: false,
        evented: false,
      });

      // Text — perfectly centered using origin
      const tx = new FabricText(String(nextNum), {
        left: cx, top: cy,
        originX: "center",
        originY: "center",
        fontSize: R * 0.8,
        fontFamily: "Arial",
        fontWeight: "bold",
        fill: textColor,
        selectable: false,
        evented: false,
      });

      // Group with 8-point circular anchors
      const g = new Group([cr, tx], {
        left: cx - R, top: cy - R,
      });
      (g as any)._isPlayer = true;
      (g as any).number = String(nextNum);
      g.setControlsVisibility({
        tl: true, tr: true, bl: true, br: true,
        ml: true, mr: true, mt: true, mb: true,
        mtr: false,
      });
      g.set({
        cornerStyle: "circle",
        cornerSize: 10,
        cornerColor: "#FF2D55",
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

  // Handle field selection from EquipmentPalette
  useEffect(() => {
    const c = boardRef.current; if (!c) return;
    (c as any)._setFieldImage = (fn: string) => {
      // Clear old field objects (both vector and image)
      c.getObjects().filter((o: any) => o._isFieldBg).forEach((o: any) => c.remove(o));
      // If 'default' or vector field, use the built-in drawing
      if (fn === "default" || !fn) {
        drawVectorField(c);
        return;
      }
      // Otherwise load PNG field
      FabricImage.fromURL(`/equipment/${fn}.png`).then((img) => {
        c.getObjects().filter((o: any) => o._isFieldBg).forEach((o: any) => c.remove(o));
        const s = Math.max(c.width! / img.width!, c.height! / img.height!);
        img.set({ left: 0, top: 0, scaleX: s, scaleY: s, selectable: false, evented: false });
        (img as any)._isFieldBg = true;
        const others = c.getObjects().filter((o: any) => !o._isFieldBg);
        others.forEach((o: any) => c.remove(o));
        c.add(img);
        others.forEach((o: any) => c.add(o));
        c.requestRenderAll();
      });
    };
  }, []);

  return (
    <div ref={containerRef} className="flex-1 flex items-start justify-center overflow-auto bg-pitch-900 p-2" style={{ minHeight: 0 }}>
      <canvas ref={canvasElRef} className="max-w-full" style={{ width: "100%", height: "auto", maxHeight: "calc(100vh - 120px)", objectFit: "contain" }} />
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

/** Draw a complete vector football field — no PNG borders, always clean */
export function drawVectorField(canvas: Canvas) {
  // Remove old field bg objects
  canvas.getObjects().filter((o: any) => o._isFieldBg).forEach((o: any) => canvas.remove(o));

  const W = canvas.width!, H = canvas.height!;
  const margin = 30; // margin from canvas edge
  const fw = W - margin * 2;  // field width
  const fh = H - margin * 2;  // field height

  const field = new Group([], {
    left: 0, top: 0,
    selectable: false, evented: false,
  });
  (field as any)._isFieldBg = true;

  // Grass background
  const grass = new Rect({
    left: margin, top: margin,
    width: fw, height: fh,
    fill: "#2E7D32",
    stroke: "#FFF",
    strokeWidth: 3,
    rx: 0, ry: 0,
    selectable: false, evented: false,
  });

  const halfX = margin + fw / 2;
  const items: any[] = [grass];

  // Center line
  items.push(new Line([halfX, margin, halfX, margin + fh], {
    stroke: "#FFF", strokeWidth: 2.5,
    selectable: false, evented: false,
  }));

  // Center circle (radius ~60px for 1050-width field)
  const centerR = 60;
  items.push(new Circle({
    left: halfX - centerR, top: margin + fh / 2 - centerR,
    radius: centerR,
    fill: "transparent", stroke: "#FFF", strokeWidth: 2.5,
    selectable: false, evented: false,
  }));

  // Center dot
  items.push(new Circle({
    left: halfX - 3, top: margin + fh / 2 - 3,
    radius: 3,
    fill: "#FFF", stroke: "",
    selectable: false, evented: false,
  }));

  // Penalty areas (left and right)
  const paW = fw * 0.17;
  const paH = fh * 0.44;
  const paTop = margin + (fh - paH) / 2;
  // Left penalty area
  items.push(new Rect({
    left: margin, top: paTop,
    width: paW, height: paH,
    fill: "transparent", stroke: "#FFF", strokeWidth: 2.5,
    selectable: false, evented: false,
  }));
  // Right penalty area
  items.push(new Rect({
    left: margin + fw - paW, top: paTop,
    width: paW, height: paH,
    fill: "transparent", stroke: "#FFF", strokeWidth: 2.5,
    selectable: false, evented: false,
  }));

  // Goal areas
  const gaW = fw * 0.06;
  const gaH = fh * 0.22;
  const gaTop = margin + (fh - gaH) / 2;
  items.push(new Rect({
    left: margin, top: gaTop,
    width: gaW, height: gaH,
    fill: "transparent", stroke: "#FFF", strokeWidth: 2,
    selectable: false, evented: false,
  }));
  items.push(new Rect({
    left: margin + fw - gaW, top: gaTop,
    width: gaW, height: gaH,
    fill: "transparent", stroke: "#FFF", strokeWidth: 2,
    selectable: false, evented: false,
  }));

  // Goals
  const goalW = 8;
  const goalH = fh * 0.12;
  const goalTop = margin + (fh - goalH) / 2;
  items.push(new Rect({
    left: margin - goalW / 2, top: goalTop,
    width: goalW, height: goalH,
    fill: "#FFF", stroke: "", rx: 2, ry: 2,
    selectable: false, evented: false,
  }));
  items.push(new Rect({
    left: margin + fw - goalW / 2, top: goalTop,
    width: goalW, height: goalH,
    fill: "#FFF", stroke: "", rx: 2, ry: 2,
    selectable: false, evented: false,
  }));

  // Corner arcs (quarter circles at 4 corners)
  const cornerR = 15;
  const corners = [
    { cx: margin, cy: margin },
    { cx: margin, cy: margin + fh },
    { cx: margin + fw, cy: margin },
    { cx: margin + fw, cy: margin + fh },
  ];
  corners.forEach(({ cx: ccx, cy: ccy }) => {
    const arcPath = new Path(
      `M ${ccx} ${ccy + (ccy < H / 2 ? cornerR : -cornerR)} A ${cornerR} ${cornerR} 0 0 ${ccy < H / 2 ? 1 : 0} ${ccx + (ccx < W / 2 ? cornerR : -cornerR)} ${ccy}`,
      { stroke: "#FFF", strokeWidth: 2, fill: "transparent", selectable: false, evented: false }
    );
    items.push(arcPath);
  });

  // Add all items to the field group
  field.add(...items);

  // Place field behind everything
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
