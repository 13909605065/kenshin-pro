"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, Circle, FabricText, Group, FabricImage, Path, Polygon } from "fabric";
import { FabricBoard, exportBoardAsPNG } from "@/components/tactical/FabricBoard";
import { EquipmentPalette } from "@/components/tactical/EquipmentPalette";
import { BoardToolbar, ROUTE_STYLES } from "@/components/tactical/BoardToolbar";
import { MobileNav } from "@/components/MobileNav";
import { ArrowLeft, Save, FolderOpen, X, Bookmark, ZoomIn, ZoomOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { readDrillContext, readDiagnosisContext, parseGroups, mapAreaToField, computePlayerPositions } from "@/lib/tactics-bridge";
import type { BoardGenResult } from "@/lib/ai/tactical-board-generate";
import { TAC_THEME } from "@/lib/tactical-theme";

// Standard 11-a-side positions. Canvas: 1050×680, field area: x=15..1035, y=15..665, center=(525,340)
// Attacking left→right. x=left(defense)→right(attack). y=top→bottom.
// Zones: GK x≈55 · DF x≈175-195 · MF x≈420-450 · FW x≈700-780
// Vertical: top-flank≈100 · top-half≈250 · center≈340 · bottom-half≈430 · bottom-flank≈580
const FORMATION_DATA: Record<string, { x: number; y: number; n: string; c: string }[]> = {
  "4-3-3": [
    {x:55,y:340,n:"1",c:"#c82630"},{x:185,y:100,n:"2",c:"#c82630"},{x:175,y:250,n:"4",c:"#c82630"},{x:175,y:430,n:"5",c:"#c82630"},{x:185,y:580,n:"3",c:"#c82630"},
    {x:420,y:190,n:"8",c:"#c82630"},{x:440,y:340,n:"6",c:"#c82630"},{x:420,y:490,n:"10",c:"#c82630"},{x:700,y:100,n:"7",c:"#c82630"},{x:770,y:340,n:"9",c:"#c82630"},{x:700,y:580,n:"11",c:"#c82630"},
  ],
  "4-4-2": [
    {x:55,y:340,n:"1",c:"#c82630"},{x:185,y:100,n:"2",c:"#c82630"},{x:175,y:250,n:"4",c:"#c82630"},{x:175,y:430,n:"5",c:"#c82630"},{x:185,y:580,n:"3",c:"#c82630"},
    {x:420,y:100,n:"7",c:"#c82630"},{x:440,y:250,n:"8",c:"#c82630"},{x:440,y:430,n:"6",c:"#c82630"},{x:420,y:580,n:"11",c:"#c82630"},{x:730,y:250,n:"9",c:"#c82630"},{x:730,y:430,n:"10",c:"#c82630"},
  ],
  "3-5-2": [
    {x:55,y:340,n:"1",c:"#c82630"},{x:145,y:180,n:"3",c:"#c82630"},{x:135,y:340,n:"5",c:"#c82630"},{x:145,y:500,n:"4",c:"#c82630"},
    {x:320,y:70,n:"7",c:"#c82630"},{x:420,y:190,n:"8",c:"#c82630"},{x:430,y:340,n:"6",c:"#c82630"},{x:420,y:490,n:"10",c:"#c82630"},{x:320,y:610,n:"2",c:"#c82630"},
    {x:730,y:250,n:"9",c:"#c82630"},{x:730,y:430,n:"11",c:"#c82630"},
  ],
  "4-2-3-1": [
    {x:55,y:340,n:"1",c:"#c82630"},{x:185,y:100,n:"2",c:"#c82630"},{x:175,y:250,n:"4",c:"#c82630"},{x:175,y:430,n:"5",c:"#c82630"},{x:185,y:580,n:"3",c:"#c82630"},
    {x:355,y:250,n:"6",c:"#c82630"},{x:355,y:430,n:"8",c:"#c82630"},{x:590,y:100,n:"7",c:"#c82630"},{x:590,y:340,n:"10",c:"#c82630"},{x:590,y:580,n:"11",c:"#c82630"},{x:780,y:340,n:"9",c:"#c82630"},
  ],
  "3-4-3": [
    {x:55,y:340,n:"1",c:"#c82630"},{x:145,y:180,n:"3",c:"#c82630"},{x:135,y:340,n:"4",c:"#c82630"},{x:145,y:500,n:"5",c:"#c82630"},
    {x:370,y:80,n:"7",c:"#c82630"},{x:420,y:250,n:"8",c:"#c82630"},{x:420,y:430,n:"6",c:"#c82630"},{x:370,y:600,n:"11",c:"#c82630"},
    {x:660,y:130,n:"10",c:"#c82630"},{x:740,y:340,n:"9",c:"#c82630"},{x:660,y:550,n:"2",c:"#c82630"},
  ],
};

const THEMES = ["控球","射门","传中","防守","压迫","反击","定位球","阵地进攻","热身","体能","个人技术"];

interface SavedScene { id: string; name: string; theme: string; json: string; createdAt: string; }

export default function TacticsPage() {
  const router = useRouter();
  const boardRef = useRef<Canvas | null>(null);
  const [activeTool, setActiveTool] = useState("select");
  const [activeColor, setActiveColor] = useState<string>(TAC_THEME.accent);
  const [canUndo, setCanUndo] = useState(false); const [canRedo, setCanRedo] = useState(false);
  const [selObj, setSelObj] = useState<any>(null);
  const [, setEditTick] = useState(0); // force re-render on number edit
  const [saveOpen, setSaveOpen] = useState(false); const [loadOpen, setLoadOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(""); const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [sName, setSName] = useState(""); const [sTheme, setSTheme] = useState("控球");
  const [scenes, setScenes] = useState<SavedScene[]>(() => { try { return JSON.parse(localStorage.getItem("tac_scenes")||"[]"); } catch { return []; }});

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
            const g = new Group([cr, tx], { left: cx-R, top: cy-R });
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

  const uh = useCallback((u:boolean,r:boolean)=>{setCanUndo(u);setCanRedo(r);},[]);
  const hUndo = () => (boardRef.current as any)?._undo?.();
  const hRedo = () => (boardRef.current as any)?._redo?.();
  const hExport = () => { if(boardRef.current) exportBoardAsPNG(boardRef.current); };

  const hClear = () => { const c=boardRef.current; if(!c)return; c.clear(); c.backgroundColor="#000"; c.renderAll(); };

  const hZoomIn = () => { const c=boardRef.current; if(c){ const z=c.getZoom(); c.setZoom(Math.min(z*1.3,5)); c.renderAll(); }};
  const hZoomOut = () => { const c=boardRef.current; if(c){ const z=c.getZoom(); c.setZoom(Math.max(z/1.3,0.2)); c.renderAll(); }};
  const hZoomFit = () => { const c=boardRef.current; if(c){ c.setZoom(1); c.renderAll(); }};
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
      const g = new Group([cr,tx], {left:cx-R, top:cy-R});
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
    // Auto-fill AI prompt
    setAiPrompt(`${f} 战术`);
    c.requestRenderAll();
  };

  const hUpdatePlayerNum = (newNum: string) => {
    if (!selObj || !(selObj as any)._isPlayer) return;
    (selObj as any).number = newNum;
    const objs = (selObj as any)._objects || [];
    const textObj = objs.find((o: any) => o.type === "text" || o.type === "textbox");
    if (textObj) { textObj.set({ text: newNum }); boardRef.current?.requestRenderAll(); }
    setEditTick(t => t + 1);
  };

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
        const g = new Group([cr, tx], { left: cx - R, top: cy - R });
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
  }, []);

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
    <div className="h-screen flex flex-col" style={{ backgroundColor: TAC_THEME.bg }}>
      <header className="px-2 sm:px-3 h-11 flex items-center gap-1 sm:gap-2 flex-shrink-0" style={{ backgroundColor: TAC_THEME.bg, borderBottom: `1px solid ${TAC_THEME.border}` }}>
        <button onClick={()=>router.push("/")} className="text-gray-400 hover:text-white flex items-center gap-1 touch-target" title="返回首页">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5}/>
        </button>
        <h1 className="text-white font-semibold text-sm tracking-wide hidden sm:block">战术板</h1>
        <div className="flex-1"/>
        <div className="flex items-center gap-0.5 rounded-md p-0.5" style={{backgroundColor:TAC_THEME.bgCard, borderRadius: TAC_THEME.radius}}>
          <button onClick={hZoomOut} className="p-1.5 text-gray-400 hover:text-white rounded touch-target flex items-center justify-center" title="缩小"><ZoomOut className="w-3.5 h-3.5"/></button>
          <button onClick={hZoomFit} className="p-1.5 text-gray-400 hover:text-white rounded text-[10px] font-mono touch-target flex items-center justify-center" title="重置">1:1</button>
          <button onClick={hZoomIn} className="p-1.5 text-gray-400 hover:text-white rounded touch-target flex items-center justify-center" title="放大"><ZoomIn className="w-3.5 h-3.5"/></button>
        </div>
        <button onClick={()=>setSaveOpen(true)}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs rounded-md transition touch-target"
          style={{color: TAC_THEME.textMain, backgroundColor: TAC_THEME.bgCard, border: `1px solid ${TAC_THEME.borderLight}`, borderRadius: TAC_THEME.radius}}
          title="保存当前战术">
          <Save className="w-3.5 h-3.5"/><span className="hidden sm:inline">保存战术</span>
        </button>
        <button onClick={()=>{setScenes(JSON.parse(localStorage.getItem("tac_scenes")||"[]"));setLoadOpen(true);}}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs rounded-md transition touch-target"
          style={{color: TAC_THEME.textMain, backgroundColor: TAC_THEME.bgCard, border: `1px solid ${TAC_THEME.borderLight}`, borderRadius: TAC_THEME.radius}}
          title="打开已保存的战术">
          <FolderOpen className="w-3.5 h-3.5"/>{scenes.length>0&&<span style={{color: TAC_THEME.accent}} className="ml-0.5 text-[10px]">{scenes.length}</span>}
        </button>
        {selObj && (selObj as any)._isPlayer && (
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[10px] text-gray-500 hidden sm:inline">号码:</span>
            <input
              defaultValue={(selObj as any).number || ""}
              onBlur={(e) => hUpdatePlayerNum(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") hUpdatePlayerNum((e.target as HTMLInputElement).value); }}
              className="w-8 sm:w-10 h-6 border rounded text-white text-[10px] text-center" style={{backgroundColor:"#1e2128",borderColor:"#2a2d35"}}
              title="编辑球员号码"
            />
          </div>
        )}
        {selName && !(selObj as any)?._isPlayer && <span className="text-[10px] text-gray-500 hidden sm:inline ml-1">已选：{selName}</span>}
      </header>

      {saveOpen && (
        <div className="absolute top-11 right-3 z-50 glass-card p-3 w-[calc(100vw-2rem)] max-w-72 space-y-2 shadow-2xl">
          <div className="flex items-center justify-between"><h3 className="text-white font-bold text-xs">保存战术</h3><button onClick={()=>setSaveOpen(false)} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5"/></button></div>
          <input value={sName} onChange={(e)=>setSName(e.target.value)} placeholder="战术名称" className="input-field text-xs h-9" onKeyDown={(e)=>e.key==="Enter"&&hSave()}/>
          <div className="flex flex-wrap gap-1">{THEMES.map((t)=><button key={t} onClick={()=>setSTheme(t)} className={`px-2 py-0.5 rounded text-[10px] transition`} style={{backgroundColor: sTheme===t ? TAC_THEME.accent : "#22252d", color: sTheme===t ? "#fff" : "#888"}}>{t}</button>)}</div>
          <button onClick={hSave} disabled={!sName.trim()} className="w-full py-2 text-white font-bold rounded text-xs disabled:opacity-40" style={{backgroundColor:TAC_THEME.accent}}><Save className="w-3 h-3 inline mr-1"/>保存</button>
        </div>
      )}

      {loadOpen && (
        <div className="absolute top-11 right-3 z-50 glass-card p-3 w-[calc(100vw-2rem)] max-w-80 space-y-2 shadow-2xl max-h-80 overflow-y-auto">
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

      {/* ─── AI 自动生成 ─── */}
      <div className="px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 flex-shrink-0" style={{ backgroundColor: TAC_THEME.bg, borderBottom: `1px solid ${TAC_THEME.border}` }}>
        <span className="text-sm flex-shrink-0 hidden sm:inline">🦋</span>
        <input
          value={aiPrompt}
          onChange={(e) => { setAiPrompt(e.target.value); setAiError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") hAIGenerate(); }}
          placeholder="描述战术场景..."
          disabled={aiLoading}
          className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-white text-xs sm:text-sm placeholder-gray-500 focus:outline-none disabled:opacity-40 rounded-md"
          style={{ backgroundColor: TAC_THEME.bgInput, border: `1px solid ${aiError ? TAC_THEME.error : TAC_THEME.border}`, borderRadius: TAC_THEME.radius }}
        />
        <button onClick={hAIGenerate}
          disabled={aiLoading || !aiPrompt.trim()}
          className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-md transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 touch-target"
          style={{ backgroundColor: TAC_THEME.accent, color: "#fff", borderRadius: TAC_THEME.radius }}>
          {aiLoading ? "..." : "生成"}
        </button>
        {aiError && <span className="text-[10px] sm:text-[11px] flex-shrink-0 hidden sm:inline" style={{ color: TAC_THEME.error }}>{aiError}</span>}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <EquipmentPalette onFieldSelect={hField}/>
        <FabricBoard activeTool={activeTool} activeColor={activeColor} onObjectSelected={setSelObj} onHistoryChange={uh} boardRef={boardRef}/>
      </div>

      <BoardToolbar activeTool={activeTool} onToolChange={setActiveTool} activeColor={activeColor} onColorChange={setActiveColor} canUndo={canUndo} canRedo={canRedo} onUndo={hUndo} onRedo={hRedo} onExport={hExport} onFormation={hFormation} onClear={hClear}/>
      <MobileNav />
    </div>
  );
}
