"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Canvas, Circle, FabricText, Group, FabricImage, Path, Polygon } from "fabric";
import { EquipmentPalette } from "@/components/tactical/EquipmentPalette";
import { BoardToolbar, ROUTE_STYLES } from "@/components/tactical/BoardToolbar";

import { GestureController } from "@/components/tactical/GestureController";
import { ArrowLeft, Save, FolderOpen, X, Bookmark, Hand, Menu, Upload, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { readDrillContext, readDiagnosisContext, parseGroups, mapAreaToField, computePlayerPositions } from "@/lib/tactics-bridge";
import type { BoardGenResult } from "@/lib/ai/tactical-board-generate";
import { TAC_THEME } from "@/lib/tactical-theme";

// Canvas: 1050×680, attack left→right. center=(525,340)
// Zones: GK x≈55 · DF x≈170-200 · DM x≈355-400 · MF x≈390-440 · AM x≈520-590 · FW x≈660-780
// Y: flank≈80-100 · half≈160-260 · center≈340 · half≈420-520 · flank≈550-610
// Canvas: 1050×680, attack left→right. x=15..1035, y=15..665, center=(525,340)
// Player colors: GK=orange, outfield=red (own team)
const OWN = TAC_THEME.playerOwn;
const GK = TAC_THEME.playerGK;

const FORMATION_DATA: Record<string, { x: number; y: number; n: string; c: string }[]> = {
  "4-3-3": [
    // GK · Back 4 · Mid 3 · Front 3
    {x:55,y:340,n:"1",c:GK},
    {x:185,y:100,n:"2",c:OWN},{x:175,y:260,n:"4",c:OWN},{x:175,y:420,n:"5",c:OWN},{x:185,y:580,n:"3",c:OWN},
    {x:420,y:190,n:"8",c:OWN},{x:440,y:340,n:"6",c:OWN},{x:420,y:490,n:"10",c:OWN},
    {x:700,y:100,n:"7",c:OWN},{x:770,y:340,n:"9",c:OWN},{x:700,y:580,n:"11",c:OWN},
  ],
  "4-4-2": [
    // GK · Back 4 · Mid 4 · Front 2
    {x:55,y:340,n:"1",c:GK},
    {x:185,y:100,n:"2",c:OWN},{x:175,y:260,n:"4",c:OWN},{x:175,y:420,n:"5",c:OWN},{x:185,y:580,n:"3",c:OWN},
    {x:420,y:100,n:"7",c:OWN},{x:440,y:250,n:"8",c:OWN},{x:440,y:430,n:"6",c:OWN},{x:420,y:580,n:"11",c:OWN},
    {x:730,y:230,n:"9",c:OWN},{x:730,y:450,n:"10",c:OWN},
  ],
  "3-5-2": [
    // GK · 3 CBs · 5 MFs (WB+DM+DM+DM+WB) · 2 FWs
    {x:55,y:340,n:"1",c:GK},
    {x:170,y:160,n:"3",c:OWN},{x:160,y:340,n:"5",c:OWN},{x:170,y:520,n:"4",c:OWN},
    {x:370,y:70,n:"7",c:OWN},{x:390,y:230,n:"8",c:OWN},{x:400,y:340,n:"6",c:OWN},{x:390,y:450,n:"10",c:OWN},{x:370,y:610,n:"2",c:OWN},
    {x:720,y:220,n:"9",c:OWN},{x:720,y:460,n:"11",c:OWN},
  ],
  "4-2-3-1": [
    // GK · Back 4 · 2 DMs · 3 AMs · 1 ST
    {x:55,y:340,n:"1",c:GK},
    {x:185,y:100,n:"2",c:OWN},{x:175,y:260,n:"4",c:OWN},{x:175,y:420,n:"5",c:OWN},{x:185,y:580,n:"3",c:OWN},
    {x:355,y:250,n:"6",c:OWN},{x:355,y:430,n:"8",c:OWN},
    {x:590,y:100,n:"7",c:OWN},{x:590,y:340,n:"10",c:OWN},{x:590,y:580,n:"11",c:OWN},
    {x:780,y:340,n:"9",c:OWN},
  ],
  "3-4-3": [
    // GK · 3 CBs · 4 MFs · 3 FWs
    {x:55,y:340,n:"1",c:GK},
    {x:170,y:160,n:"3",c:OWN},{x:160,y:340,n:"4",c:OWN},{x:170,y:520,n:"5",c:OWN},
    {x:390,y:80,n:"7",c:OWN},{x:430,y:240,n:"8",c:OWN},{x:430,y:440,n:"6",c:OWN},{x:390,y:600,n:"11",c:OWN},
    {x:660,y:130,n:"10",c:OWN},{x:740,y:340,n:"9",c:OWN},{x:660,y:550,n:"2",c:OWN},
  ],
};

const THEMES = ["控球","射门","传中","防守","压迫","反击","定位球","阵地进攻","热身","体能","个人技术"];

interface SavedScene { id: string; name: string; theme: string; json: string; createdAt: string; }

const AUTOSAVE_KEY = "tac_autosave";

const FabricBoardDynamic = dynamic(
  () => import("@/components/tactical/FabricBoard").then(m => ({ default: m.FabricBoard })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#121212]">
        <div className="w-8 h-8 border-2 border-[#d92525] border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

export default function TacticsPage() {
  const router = useRouter();
  const boardRef = useRef<Canvas | null>(null);
  const [activeTool, setActiveTool] = useState("select");
  const [activeColor, setActiveColor] = useState<string>(TAC_THEME.accent);
  const [canUndo, setCanUndo] = useState(false); const [canRedo, setCanRedo] = useState(false);
  const [selObj, setSelObj] = useState<any>(null);
  const [, setEditTick] = useState(0);
  const [saveOpen, setSaveOpen] = useState(false); const [loadOpen, setLoadOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(""); const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [sName, setSName] = useState(""); const [sTheme, setSTheme] = useState("控球");
  const [scenes, setScenes] = useState<SavedScene[]>(() => { try { return JSON.parse(localStorage.getItem("tac_scenes")||"[]"); } catch { return []; }});
  // Auto-save restore
  const [autoSaveTs, setAutoSaveTs] = useState<string | null>(() => {
    try { const d = localStorage.getItem(AUTOSAVE_KEY); return d ? JSON.parse(d).ts : null; } catch { return null; }
  });
  // Gesture control
  const [gestureOn, setGestureOn] = useState(false);
  // AI panel collapsed by default
  const [aiOpen, setAiOpen] = useState(false);
  // Equipment palette collapse (controlled at page level for TopNav hamburger)
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  // Layer lock states
  const [lockPlayers, setLockPlayers] = useState(false);
  const [lockRoutes, setLockRoutes] = useState(false);
  // Inline player number edit popup
  const [editPop, setEditPop] = useState<{ obj: any; x: number; y: number; num: string } | null>(null);

  // ─── 统一互斥渲染：训练教案 / AI诊断 二选一，不重叠 ───
  useEffect(() => {
    // 同时读取两个 context，谁有数据就渲染谁（诊断优先）
    const drillCtx = readDrillContext();
    const diagCtx = readDiagnosisContext();

    // 互斥：清除另一个，确保只有一个渲染流程
    if (diagCtx && drillCtx) {
      // 诊断优先，把 drill 的也清掉（already read, just proceed）
    }

    if (!drillCtx && !diagCtx) return;

    let attempts = 0;
    const tryRender = () => {
      const canvas = boardRef.current;
      if (!canvas) {
        if (attempts++ < 80) requestAnimationFrame(tryRender);
        return;
      }

      // ─── 统一清空：无论哪种渲染，先把画布清干净 ───
      // Reset to default bright field
      if ((canvas as any)._setFieldImage) {
        (canvas as any)._setFieldImage("default");
      }
      // Remove ALL user content
      canvas.getObjects().filter((o: any) => !o._isFieldBg)
        .forEach((o: any) => canvas.remove(o));

      // ─── 诊断渲染 ───
      if (diagCtx) {
        const titleText = new FabricText(`诊断: ${diagCtx.title}`, {
          left: 12, top: 8, fontSize: 16, fontFamily: "Arial",
          fontWeight: "bold", fill: TAC_THEME.accent,
          backgroundColor: "rgba(0,0,0,0.6)", padding: 4,
        });
        (titleText as any)._isDrillAnnotation = true; canvas.add(titleText);
        canvas.requestRenderAll();
        return;
      }

      // ─── Drill 教案渲染 ───
      if (drillCtx) {
        const fieldFile = mapAreaToField(drillCtx.area);
        const { red, blue, neutral } = parseGroups(drillCtx.groups);
        const positions = computePlayerPositions(red, blue, neutral, drillCtx.area);

        FabricImage.fromURL(`/equipment/${fieldFile}.png`).then((img) => {
          // Clear old field bg
          canvas.getObjects().filter((o:any)=>o._isFieldBg).forEach((o:any)=>canvas.remove(o));
          const margin = 30;
          const sw = (canvas.width! - margin * 2) / img.width!;
          const sh = (canvas.height! - margin * 2) / img.height!;
          const s = Math.min(sw, sh); // fit field in center with equal margins
          const imgW = img.width! * s, imgH = img.height! * s;
          img.set({left: (canvas.width!-imgW)/2, top: (canvas.height!-imgH)/2, scaleX:s, scaleY:s, selectable:false, evented:false});
          (img as any)._isFieldBg = true;
          // Remove ALL non-field content before placing new
          canvas.getObjects().filter((o:any)=>!o._isFieldBg).forEach((o:any)=>canvas.remove(o));
          canvas.add(img);

          // Place players
          const R = TAC_THEME.playerRadius;
          positions.forEach((p) => {
            const cx = p.x, cy = p.y;
            const cr = new Circle({ left: cx-R, top: cy-R, radius: R, fill: "transparent", stroke: p.c, strokeWidth: TAC_THEME.playerRingWidth, selectable: false, evented: false });
            const tx = new FabricText(p.n, { left: cx, top: cy, originX: "center", originY: "center", fontSize: R*0.8, fontFamily: "Arial", fontWeight: "bold", fill: "#FFF", selectable: false, evented: false });
            const g = new Group([cr, tx], { left: cx-R, top: cy-R, selectable: true, evented: true });
            (g as any)._isPlayer = true; (g as any).number = p.n;
            g.setControlsVisibility({tl:true, tr:true, bl:true, br:true, ml:true, mr:true, mt:true, mb:true, mtr:true});
            g.set({ cornerStyle:"circle", cornerSize:10, cornerColor:TAC_THEME.accent, cornerStrokeColor:"#FFF", transparentCorners:false, padding:0, lockUniScaling:true } as any);
            canvas.add(g);
          });

          // Annotations
          const nameText = new FabricText(`练习: ${drillCtx.name}`, { left: 12, top: 8, fontSize: 16, fontFamily: "Arial", fontWeight: "bold", fill: TAC_THEME.accent, backgroundColor: "rgba(0,0,0,0.6)", padding: 4 });
          (nameText as any)._isDrillAnnotation = true; canvas.add(nameText);

          const infoText = new FabricText(`${drillCtx.groups} | ${drillCtx.area} | ${drillCtx.duration}min`, { left: 12, top: 40, fontSize: 12, fontFamily: "Arial", fill: "#CCC", backgroundColor: "rgba(0,0,0,0.5)", padding: 3 });
          (infoText as any)._isDrillAnnotation = true; canvas.add(infoText);

          if (drillCtx.coaching_points.length > 0) {
            const cpHeader = new FabricText("指导要点:", { left: 860, top: 100, fontSize: 12, fontFamily: "Arial", fontWeight: "bold", fill: TAC_THEME.accent, backgroundColor: "rgba(0,0,0,0.5)", padding: 3 });
            (cpHeader as any)._isDrillAnnotation = true; canvas.add(cpHeader);
            drillCtx.coaching_points.slice(0, 8).forEach((cp, i) => {
              const txt = new FabricText(`${i + 1}. ${cp}`, { left: 860, top: 128 + i * 28, fontSize: 11, fontFamily: "Arial", fill: "#DDD", backgroundColor: "rgba(0,0,0,0.4)", padding: 2 });
              (txt as any)._isDrillAnnotation = true; canvas.add(txt);
            });
          }

          canvas.requestRenderAll();
        }).catch(() => {});
      }
    };

    tryRender();
  }, []);

  // ─── Auto-save canvas to localStorage ───
  const autoSave = useCallback(() => {
    const c = boardRef.current; if (!c) return;
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
        json: JSON.stringify(c.toJSON()),
        ts: new Date().toISOString(),
      }));
    } catch {}
  }, []);

  const restoreAutoSave = () => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const c = boardRef.current; if (!c) return;
      c.loadFromJSON(JSON.parse(data.json)).then(() => {
        c.requestRenderAll();
        setAutoSaveTs(null);
      });
    } catch {}
  };

  const dismissAutoSave = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setAutoSaveTs(null);
  };

  const uh = useCallback((u:boolean,r:boolean)=>{
    setCanUndo(u); setCanRedo(r);
    if (r || u) autoSave(); // save on any canvas change
  },[autoSave]);
  const hUndo = () => (boardRef.current as any)?._undo?.();
  const hRedo = () => (boardRef.current as any)?._redo?.();
  const hExport = () => {
    const c = boardRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL({ format: "png", multiplier: 2 });
    a.download = `tactical-${Date.now()}.png`;
    a.click();
  };

  const hClear = () => {
    const c=boardRef.current; if(!c)return;
    c.getObjects().filter((o:any)=>!o._isFieldBg).forEach((o:any)=>c.remove(o));
    c.requestRenderAll();
    autoSave();
  };

  const hZoomIn = () => {
    const c = boardRef.current; if (!c) return;
    let z = c.getZoom() * 1.15; z = Math.min(z, 5);
    c.zoomToPoint({ x: c.width! / 2, y: c.height! / 2 } as any, z);
    c.requestRenderAll();
  };
  const hZoomOut = () => {
    const c = boardRef.current; if (!c) return;
    let z = c.getZoom() / 1.15; z = Math.max(z, 0.3);
    c.zoomToPoint({ x: c.width! / 2, y: c.height! / 2 } as any, z);
    c.requestRenderAll();
  };
  const hZoomFit = () => {
    const c = boardRef.current; if (!c) return;
    c.zoomToPoint({ x: c.width! / 2, y: c.height! / 2 } as any, 1);
    c.requestRenderAll();
  };

  // Zoom controls moved to BoardToolbar
  // ─── Safe navigation: disable gesture before leaving page ───
  const navigateAway = useCallback((url: string) => {
    if (gestureOn) setGestureOn(false);
    setTimeout(() => router.push(url), 80);
  }, [gestureOn, router]);
  // ─── Click-to-place equipment (no drag needed) ───
  const eqCountRef = useRef<Record<string, number>>({});
  const hPlaceEquipment = useCallback((filename: string, name: string) => {
    const c = boardRef.current; if (!c) return;
    const cnt = (eqCountRef.current[filename] || 0) + 1;
    eqCountRef.current[filename] = cnt;

    // Place at center with slight offset per count to avoid stacking
    const cx = 525 + ((cnt - 1) % 5) * 25;
    const cy = 340 + Math.floor((cnt - 1) / 5) * 25;

    // Handle agility ring as vector
    if (name === "圆形环" || name === "敏捷环") {
      const ring = new Circle({
        left: cx - 20, top: cy - 20, radius: 20,
        fill: "transparent", stroke: "#000", strokeWidth: 3,
        selectable: true, evented: true, lockUniScaling: true,
      });
      (ring as any).name = name;
      ring.setControlsVisibility({tl:true,tr:true,bl:true,br:true,ml:true,mr:true,mt:true,mb:true,mtr:true});
      c.add(ring); c.setActiveObject(ring); c.requestRenderAll(); autoSave();
      return;
    }

    FabricImage.fromURL(`/equipment/${filename}.png`).then((img) => {
      img.set({
        left: cx - 35, top: cy - 35, scaleX: 0.3, scaleY: 0.3,
        lockUniScaling: true, selectable: true, evented: true,
      });
      (img as any).name = name;
      img.setControlsVisibility({tl:true,tr:true,bl:true,br:true,ml:true,mr:true,mt:true,mb:true,mtr:true});
      c.add(img); c.setActiveObject(img); c.requestRenderAll(); autoSave();
    });
  }, [autoSave]);

  const hField = useCallback((fn: string) => {
    const c = boardRef.current; if (!c) return;
    if ((c as any)._setFieldImage) {
      (c as any)._setFieldImage(fn);
    }
  }, []);

  const placePlayers = (pl: {x:number;y:number;n:string;c:string}[], color?: string) => {
    const c=boardRef.current; if(!c)return;
    const clr = color||activeColor;
    const R = TAC_THEME.playerRadius;
    pl.forEach((p) => {
      const ringColor = p.c||clr;
      const cx = p.x, cy = p.y;
      const cr = new Circle({left:cx-R, top:cy-R, radius:R, fill:"transparent", stroke:ringColor, strokeWidth:TAC_THEME.playerRingWidth, selectable:false, evented:false});
      const tx = new FabricText(p.n, {left:cx, top:cy, originX:"center", originY:"center", fontSize:R*0.8, fontFamily:"Arial", fontWeight:"bold", fill:"#FFF", selectable:false, evented:false});
      const g = new Group([cr,tx], {left:cx-R, top:cy-R, selectable:true, evented:true});
      (g as any)._isPlayer=true; (g as any).number=p.n;
      g.setControlsVisibility({tl:true, tr:true, bl:true, br:true, ml:true, mr:true, mt:true, mb:true, mtr:true});
      g.set({ cornerStyle:"circle", cornerSize:10, cornerColor:TAC_THEME.accent, cornerStrokeColor:"#FFF", transparentCorners:false, padding:0, lockUniScaling:true } as any);
      c.add(g);
    });
    c.requestRenderAll();
  };

  const hFormation = (f: string) => {
    const c = boardRef.current; if (!c) return;
    // Clear everything except field background
    c.getObjects().filter((o: any) => !o._isFieldBg).forEach((o: any) => c.remove(o));
    // Switch to standard full field
    if ((c as any)._setFieldImage) (c as any)._setFieldImage("default");
    // Place formation players (ring style via placePlayers)
    placePlayers(FORMATION_DATA[f] || FORMATION_DATA["4-3-3"]);
    c.requestRenderAll();
    autoSave();
  };

  const hUpdatePlayerNum = (newNum: string) => {
    if (!selObj || !(selObj as any)._isPlayer) return;
    (selObj as any).number = newNum;
    const objs = (selObj as any)._objects || [];
    const textObj = objs.find((o: any) => o.type === "text" || o.type === "textbox");
    if (textObj) { textObj.set({ text: newNum }); boardRef.current?.requestRenderAll(); }
    setEditTick(t => t + 1);
    setEditPop(null);
  };

  // Inline popup: confirm number edit (uses popup's own ref to avoid selObj race)
  const hConfirmPopNum = (newNum: string) => {
    if (!editPop) return;
    const obj = editPop.obj;
    (obj as any).number = newNum;
    const objs = (obj as any)._objects || [];
    const textObj = objs.find((o: any) => o.type === "text" || o.type === "textbox");
    if (textObj) { textObj.set({ text: newNum }); boardRef.current?.requestRenderAll(); }
    setEditPop(null);
  };

  // Player double-click → show inline popup
  const hPlayerDoubleClick = useCallback((playerObj: any, screenX: number, screenY: number) => {
    setSelObj(playerObj);
    setEditPop({
      obj: playerObj,
      x: screenX,
      y: screenY,
      num: (playerObj as any).number || "",
    });
  }, []);

  // ─── AI 自动生成战术板 ─────────────────────────────────
  const renderBoardGen = useCallback((result: BoardGenResult) => {
    const c = boardRef.current; if (!c) return;

    // Clear all old content (keep field background)
    c.getObjects().filter((o: any) => !o._isFieldBg)
      .forEach((o: any) => c.remove(o));

    // Always use standard 11-a-side field for auto-generated content
    if ((c as any)._setFieldImage) {
      (c as any)._setFieldImage(result.field || "default");
    }

    // Render players
    if (result.players) {
      const R = TAC_THEME.playerRadius;
      result.players.forEach((p) => {
        const cx = p.x, cy = p.y;
        const cr = new Circle({ left: cx - R, top: cy - R, radius: R, fill: "transparent", stroke: p.color, strokeWidth: TAC_THEME.playerRingWidth, selectable: false, evented: false });
        const tx = new FabricText(p.number, { left: cx, top: cy, originX: "center", originY: "center", fontSize: R * 0.8, fontFamily: "Arial", fontWeight: "bold", fill: "#FFF", selectable: false, evented: false });
        const g = new Group([cr, tx], { left: cx - R, top: cy - R, selectable: true, evented: true });
        (g as any)._isPlayer = true; (g as any)._isAIGenerated = true; (g as any).number = p.number;
        if (p.label) (g as any).label = p.label;
        g.setControlsVisibility({ tl: true, tr: true, bl: true, br: true, ml: true, mr: true, mt: true, mb: true, mtr: true });
        g.set({ cornerStyle: "circle", cornerSize: 10, cornerColor: TAC_THEME.accent, cornerStrokeColor: "#FFF", transparentCorners: false, padding: 0, lockUniScaling: true } as any);
        c.add(g);
      });
    }

    // Render routes
    if (result.routes) {
      result.routes.forEach((r) => {
        const style = ROUTE_STYLES[r.type] || ROUTE_STYLES.draw_curve;
        const strokeColor = r.color || "#000";
        let pathData: string;
        let arrowAngle: number;

        if (r.type === "draw_dribble") {
          // Curved bezier for dribble
          const mx = (r.x1 + r.x2) / 2, my = (r.y1 + r.y2) / 2;
          const len = Math.sqrt((r.x2 - r.x1) ** 2 + (r.y2 - r.y1) ** 2);
          const perpX = -(r.y2 - r.y1) / (len || 1), perpY = (r.x2 - r.x1) / (len || 1);
          const arcOffset = Math.min(len * 0.5, 150);
          pathData = `M ${r.x1} ${r.y1} Q ${mx + perpX * arcOffset} ${my + perpY * arcOffset} ${r.x2} ${r.y2}`;
          arrowAngle = Math.atan2(r.y2 - (my + perpY * arcOffset), r.x2 - (mx + perpX * arcOffset));
        } else {
          // Straight line
          pathData = `M ${r.x1} ${r.y1} L ${r.x2} ${r.y2}`;
          arrowAngle = Math.atan2(r.y2 - r.y1, r.x2 - r.x1);
        }

        const path = new Path(pathData, {
          stroke: strokeColor,
          strokeWidth: style.width,
          strokeDashArray: style.strokeDash || undefined,
          fill: "transparent",
          selectable: true,
          evented: true,
          strokeLineCap: "round" as CanvasLineCap,
          strokeLineJoin: "round" as CanvasLineJoin,
        });
        (path as any)._isRoute = true; (path as any)._isAIGenerated = true; (path as any)._routeType = r.type;
        c.add(path);

        // Arrow head
        const s = 10;
        const tip = { x: r.x2, y: r.y2 };
        const left = { x: r.x2 - s * Math.cos(arrowAngle - Math.PI / 6), y: r.y2 - s * Math.sin(arrowAngle - Math.PI / 6) };
        const right = { x: r.x2 - s * Math.cos(arrowAngle + Math.PI / 6), y: r.y2 - s * Math.sin(arrowAngle + Math.PI / 6) };
        const tri = new Polygon([tip, left, right], { fill: strokeColor, stroke: strokeColor, strokeWidth: 1, selectable: false, evented: false });
        (tri as any)._isAIGenerated = true;
        c.add(tri);
      });
    }

    // Render texts
    if (result.texts) {
      result.texts.forEach((t) => {
        const txt = new FabricText(t.content, {
          left: t.x, top: t.y,
          fontSize: t.fontSize || 18,
          fontFamily: "Arial",
          fontWeight: "bold",
          fill: t.color || "#c82630",
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: 4,
        });
        (txt as any)._isAIGenerated = true;
        c.add(txt);
      });
    }

    // Render equipment
    if (result.equipment) {
      result.equipment.forEach((eq) => {
        FabricImage.fromURL(`/equipment/${eq.type}.png`).then((img) => {
          img.set({
            left: eq.x - 35, top: eq.y - 35,
            scaleX: 0.3, scaleY: 0.3,
            lockUniScaling: true,
            selectable: true, evented: true,
          });
          (img as any)._isAIGenerated = true; (img as any).name = eq.type;
          img.setControlsVisibility({ tl: true, tr: true, bl: true, br: true, ml: true, mr: true, mt: true, mb: true, mtr: true });
          c.add(img);
          c.requestRenderAll();
        });
      });
    }

    c.requestRenderAll();
    autoSave();
  }, [autoSave]);

  const hAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true); setAiError("");

    // ─── 先清空画布，再请求生成 ───
    const c = boardRef.current;
    if (c) {
      c.getObjects().filter((o: any) => !o._isFieldBg)
        .forEach((o: any) => c.remove(o));
      if ((c as any)._setFieldImage) {
        (c as any)._setFieldImage("default");
      }
      c.requestRenderAll();
    }

    try {
      const res = await fetch("/api/tactical-board-generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiPrompt.trim() }),
      });
      const json = await res.json();

      if (!res.ok || json.code !== "ok") {
        setAiError(json.message || "AI 生成失败");
        setAiLoading(false);
        return;
      }

      const result: BoardGenResult = json.data;
      renderBoardGen(result);

      // Show a brief confirmation in the AI bar
      setAiPrompt("");
      setAiError("");
      setAiLoading(false);
      // auto-clear prompt on success
    } catch (e: any) {
      setAiError(e.message || "网络错误");
      setAiLoading(false);
    }
  }, [aiPrompt, aiLoading, renderBoardGen]);

  const hSave = () => {
    const c=boardRef.current; if(!c||!sName.trim())return;
    const json=JSON.stringify(c.toJSON());
    const ns:SavedScene={id:Date.now().toString(),name:sName,theme:sTheme,json,createdAt:new Date().toISOString()};
    const up=[ns,...scenes]; setScenes(up); localStorage.setItem("tac_scenes",JSON.stringify(up)); setSaveOpen(false); setSName("");
  };
  const hLoad = (s:SavedScene) => { const c=boardRef.current; if(!c)return; c.loadFromJSON(JSON.parse(s.json)).then(()=>c.requestRenderAll()); setLoadOpen(false); };
  const hDel = (id:string) => { const up=scenes.filter((s)=>s.id!==id); setScenes(up); localStorage.setItem("tac_scenes",JSON.stringify(up)); };

  const selName = selObj ? ((selObj as any).name || ((selObj as any)._isPlayer ? `球员#${(selObj as any).number}` : null)) : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: TAC_THEME.bg }}>
      {/* ─── Auto-save restore prompt ─── */}
      {autoSaveTs && (
        <div className="flex-shrink-0 px-3 py-2 flex items-center gap-3 text-xs"
          style={{ backgroundColor: TAC_THEME.accent, color: "#fff" }}>
          <span className="flex-1">检测到上次未保存的战术（{new Date(autoSaveTs).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}），是否继续？</span>
          <button onClick={restoreAutoSave} className="px-3 py-1 rounded font-bold text-xs" style={{backgroundColor:"rgba(255,255,255,0.2)"}}>继续</button>
          <button onClick={dismissAutoSave} className="px-3 py-1 rounded text-xs" style={{backgroundColor:"rgba(0,0,0,0.2)"}}>忽略</button>
        </div>
      )}

      {/* ─── Top Navigation Bar ─── */}
      <nav className="flex-shrink-0 flex items-center h-12 px-2 sm:px-3 gap-1 sm:gap-2"
        style={{ backgroundColor: "#171717", borderBottom: `1px solid ${TAC_THEME.border}` }}>
        {/* Left: hamburger toggle for EquipmentPalette */}
        <button onClick={() => setPaletteCollapsed(!paletteCollapsed)}
          className="flex items-center justify-center w-8 h-8 rounded transition-colors touch-target"
          style={{ color: TAC_THEME.textDim }}
          onMouseEnter={(e) => { e.currentTarget.style.color = TAC_THEME.textMain; e.currentTarget.style.backgroundColor = TAC_THEME.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TAC_THEME.textDim; e.currentTarget.style.backgroundColor = "transparent"; }}
          title={paletteCollapsed ? "展开器材面板" : "收起器材面板"}>
          <Menu className="w-4 h-4" />
        </button>
        {/* Back button */}
        <button onClick={() => navigateAway("/")}
          className="flex items-center justify-center w-8 h-8 rounded transition-colors touch-target"
          style={{ color: TAC_THEME.textDim }}
          onMouseEnter={(e) => { e.currentTarget.style.color = TAC_THEME.textMain; e.currentTarget.style.backgroundColor = TAC_THEME.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TAC_THEME.textDim; e.currentTarget.style.backgroundColor = "transparent"; }}
          title="返回首页">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </button>
        {/* Title */}
        <h1 className="font-semibold text-sm tracking-wide hidden sm:block" style={{ color: TAC_THEME.textMain }}>KenshinPro 战术板</h1>

        <div className="flex-1" />

        {/* Right section buttons */}
        {/* Gesture toggle */}
        <button onClick={() => setGestureOn(!gestureOn)}
          className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors touch-target"
          style={{ color: gestureOn ? "#fff" : TAC_THEME.textDim, backgroundColor: gestureOn ? TAC_THEME.accent : "transparent" }}
          title="手势控制">
          <Hand className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{gestureOn ? "ON" : "手势"}</span>
        </button>

        {/* 战术库 */}
        <button onClick={() => { setScenes(JSON.parse(localStorage.getItem("tac_scenes") || "[]")); setLoadOpen(true); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors touch-target"
          style={{ color: TAC_THEME.textMain }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = TAC_THEME.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          title="战术库">
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">战术库</span>
          {scenes.length > 0 && <span className="ml-0.5 text-[10px]" style={{ color: TAC_THEME.accent }}>{scenes.length}</span>}
        </button>

        {/* AI 自动生成 */}
        <button onClick={() => setAiOpen(!aiOpen)}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors touch-target"
          style={{ color: aiOpen ? "#fff" : TAC_THEME.textMain, backgroundColor: aiOpen ? TAC_THEME.accent : "transparent" }}
          onMouseEnter={(e) => { if (!aiOpen) e.currentTarget.style.backgroundColor = TAC_THEME.bgHover; }}
          onMouseLeave={(e) => { if (!aiOpen) e.currentTarget.style.backgroundColor = "transparent"; }}
          title="AI 自动生成">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI自动生成</span>
        </button>

        {/* 导入战术 (placeholder) */}
        <button onClick={() => { setToastMsg("导入战术功能即将支持"); setTimeout(() => setToastMsg(""), 2000); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors touch-target"
          style={{ color: TAC_THEME.textDim }}
          onMouseEnter={(e) => { e.currentTarget.style.color = TAC_THEME.textMain; e.currentTarget.style.backgroundColor = TAC_THEME.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TAC_THEME.textDim; e.currentTarget.style.backgroundColor = "transparent"; }}
          title="导入战术">
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">导入战术</span>
        </button>

        {/* 保存 */}
        <button onClick={() => setSaveOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors touch-target"
          style={{ color: TAC_THEME.textMain }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = TAC_THEME.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          title="保存战术">
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">保存</span>
        </button>
      </nav>

      {/* ─── Toast notification ─── */}
      {toastMsg && (
        <div className="flex-shrink-0 px-3 py-1.5 text-center text-xs font-medium"
          style={{ backgroundColor: TAC_THEME.accent, color: "#fff" }}>
          {toastMsg}
        </div>
      )}

      {/* ─── Player number editor bar (legacy fallback) ─── */}
      {selObj && (selObj as any)._isPlayer && !editPop && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1" style={{ backgroundColor: TAC_THEME.bgCard, borderBottom: `1px solid ${TAC_THEME.border}` }}>
          <span className="text-[10px]" style={{ color: TAC_THEME.textDim }}>球员号码:</span>
          <input
            defaultValue={(selObj as any).number || ""}
            onBlur={(e) => hUpdatePlayerNum(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") hUpdatePlayerNum((e.target as HTMLInputElement).value); }}
            className="w-10 h-6 border rounded text-white text-[11px] text-center"
            style={{ backgroundColor: TAC_THEME.bgInput, borderColor: TAC_THEME.border }}
            title="编辑球员号码"
          />
        </div>
      )}

      {/* ─── Selection indicator bar ─── */}
      {selName && !(selObj as any)?._isPlayer && (
        <div className="flex-shrink-0 flex items-center px-3 py-1" style={{ backgroundColor: TAC_THEME.bgCard, borderBottom: `1px solid ${TAC_THEME.border}` }}>
          <span className="text-[10px]" style={{ color: TAC_THEME.textDim }}>已选：{selName}</span>
        </div>
      )}

      {saveOpen && (
        <div className="absolute top-12 right-3 z-50 glass-card p-3 w-[calc(100vw-2rem)] max-w-72 space-y-2 shadow-2xl">
          <div className="flex items-center justify-between"><h3 className="text-white font-bold text-xs">保存战术</h3><button onClick={()=>setSaveOpen(false)} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5"/></button></div>
          <input value={sName} onChange={(e)=>setSName(e.target.value)} placeholder="战术名称" className="input-field text-xs h-9" onKeyDown={(e)=>e.key==="Enter"&&hSave()}/>
          <div className="flex flex-wrap gap-1">{THEMES.map((t)=><button key={t} onClick={()=>setSTheme(t)} className={`px-2 py-0.5 rounded text-[10px] transition`} style={{backgroundColor: sTheme===t ? TAC_THEME.accent : "#22252d", color: sTheme===t ? "#fff" : "#888"}}>{t}</button>)}</div>
          <button onClick={hSave} disabled={!sName.trim()} className="w-full py-2 text-white font-bold rounded text-xs disabled:opacity-40" style={{backgroundColor:TAC_THEME.accent}}><Save className="w-3 h-3 inline mr-1"/>保存</button>
        </div>
      )}

      {loadOpen && (
        <div className="absolute top-12 right-3 z-50 glass-card p-3 w-[calc(100vw-2rem)] max-w-80 space-y-2 shadow-2xl max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between"><h3 className="text-white font-bold text-xs">战术库</h3><button onClick={()=>setLoadOpen(false)} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5"/></button></div>
          {scenes.length===0?<p className="text-gray-500 text-[11px] text-center py-6">暂无保存的战术</p>:scenes.map((s)=>(
            <div key={s.id} className="flex items-center gap-2 p-2 rounded group" style={{backgroundColor:"#1a1d24"}}>
              <Bookmark className="w-3.5 h-3.5 flex-shrink-0" style={{color: TAC_THEME.accent}}/>
              <div className="flex-1 min-w-0"><p className="text-xs text-white truncate">{s.name}</p><p className="text-[10px] text-gray-500">{s.theme} · {new Date(s.createdAt).toLocaleDateString()}</p></div>
              <button onClick={()=>hLoad(s)} className="text-[10px] hover:underline flex-shrink-0" style={{color:TAC_THEME.accent}}>加载</button>
              <button onClick={()=>hDel(s.id)} className="text-gray-600 flex-shrink-0" style={{}}><X className="w-3 h-3"/></button>
            </div>
          ))}
        </div>
      )}

      {/* ─── AI 自动生成 弹窗 ─── */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={() => setAiOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: TAC_THEME.bgCard, border: `1px solid ${TAC_THEME.border}` }}
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${TAC_THEME.border}` }}>
              <h3 className="text-sm font-bold" style={{ color: TAC_THEME.textMain }}>🦋 AI 自动生成战术</h3>
              <button onClick={() => setAiOpen(false)} className="p-1 rounded hover:bg-[#333] transition-colors" style={{ color: TAC_THEME.textDim }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body */}
            <div className="p-4 space-y-3">
              <textarea
                value={aiPrompt}
                onChange={(e) => { setAiPrompt(e.target.value); setAiError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); hAIGenerate(); } }}
                placeholder="描述战术场景，例如：对方防线收紧中路密集防守，双边7/11号拉开，倒三角传中，9号禁区包抄..."
                disabled={aiLoading}
                rows={4}
                className="w-full px-3 py-2 text-sm text-white placeholder-gray-500 rounded-md resize-none focus:outline-none"
                style={{ backgroundColor: TAC_THEME.bgInput, border: `1px solid ${aiError ? TAC_THEME.error : TAC_THEME.border}`, borderRadius: TAC_THEME.radius }}
              />
              {aiError && <p className="text-xs" style={{ color: TAC_THEME.error }}>{aiError}</p>}
              <div className="flex gap-2">
                <button onClick={hAIGenerate}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="flex-1 py-2.5 text-sm font-bold rounded-md transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ backgroundColor: TAC_THEME.accent, color: "#fff", borderRadius: TAC_THEME.radius }}>
                  {aiLoading ? "生成中..." : "生成战术"}
                </button>
                <button onClick={() => setAiOpen(false)}
                  className="px-4 py-2.5 text-sm rounded-md transition-colors"
                  style={{ color: TAC_THEME.textDim, backgroundColor: TAC_THEME.bgInput, borderRadius: TAC_THEME.radius }}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <EquipmentPalette activeTool={activeTool} onFieldSelect={hField} onPlaceEquipment={hPlaceEquipment} collapsed={paletteCollapsed} onToggleCollapsed={() => setPaletteCollapsed(!paletteCollapsed)}/>
        <FabricBoardDynamic activeTool={activeTool} activeColor={activeColor} onObjectSelected={setSelObj} onHistoryChange={uh} onCanvasChange={autoSave} boardRef={boardRef} onPlayerDoubleClick={hPlayerDoubleClick} lockPlayers={lockPlayers} lockRoutes={lockRoutes}/>
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <BoardToolbar activeTool={activeTool} onToolChange={setActiveTool} activeColor={activeColor} onColorChange={setActiveColor} canUndo={canUndo} canRedo={canRedo} onUndo={hUndo} onRedo={hRedo} onExport={hExport} onFormation={hFormation} onClear={hClear} onZoomIn={hZoomIn} onZoomOut={hZoomOut} onZoomFit={hZoomFit} lockPlayers={lockPlayers} onLockPlayersChange={setLockPlayers} lockRoutes={lockRoutes} onLockRoutesChange={setLockRoutes}/>
        </div>
        {/* Inline player number edit popup */}
        {editPop && (
          <div className="fixed z-50 flex items-center gap-1 px-2 py-1 rounded-md shadow-xl"
            style={{
              left: editPop.x - 30, top: editPop.y - 32,
              backgroundColor: TAC_THEME.bgCard, border: `1px solid ${TAC_THEME.accent}`,
            }}>
            <input
              autoFocus
              defaultValue={editPop.num}
              onBlur={(e) => { hConfirmPopNum(e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") hConfirmPopNum((e.target as HTMLInputElement).value);
                if (e.key === "Escape") setEditPop(null);
              }}
              className="w-8 h-6 text-center text-xs font-bold rounded outline-none"
              style={{ backgroundColor: TAC_THEME.bgInput, color: "#fff", border: `1px solid ${TAC_THEME.border}` }}
            />
            <button onClick={() => setEditPop(null)} className="text-[10px] px-1 rounded"
              style={{ color: TAC_THEME.textDim }}
              onMouseEnter={(e) => { e.currentTarget.style.color = TAC_THEME.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = TAC_THEME.textDim; }}
            >x</button>
          </div>
        )}
      </div>
      <GestureController fabricRef={boardRef} enabled={gestureOn} />
      {/* No MobileNav on tactics page — TopNav + Toolbar provide all navigation */}
    </div>
  );
}
