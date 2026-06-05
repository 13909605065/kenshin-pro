"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Canvas, Circle, FabricText, FabricImage } from "fabric";
import { EquipmentPalette } from "@/components/tactical/EquipmentPalette";
import { BoardToolbar } from "@/components/tactical/BoardToolbar";
import { ArrowLeft, Menu, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { TAC_THEME } from "@/lib/tactical-theme";
import { warmupPresetDescription } from "@/lib/warmup-presets";

// ─── Constants ────────────────────────────────────────────
const AUTOSAVE_KEY = "warmup_autosave";

// RAMP 四阶段参考
const RAMP_PHASES = [
  { phase: 1, label: "Raise 提升", desc: "慢跑、跳跃、变向 — 提升心率和体温", color: "#22c55e" },
  { phase: 2, label: "Activate 激活", desc: "臀肌激活、核心稳定 — FIFA 11+ 核心", color: "#3B82F6" },
  { phase: 3, label: "Mobilize 动员", desc: "动态拉伸、关节活动度 — 禁止静态拉伸", color: "#eab308" },
  { phase: 4, label: "Potentiate 增强", desc: "神经激活、增强式、短冲刺 — 为训练做好准备", color: "#d92525" },
];

// ─── Dynamic import (Fabric.js 仅客户端) ──────────────────
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

export default function WarmupDesignPage() {
  const router = useRouter();
  const boardRef = useRef<Canvas | null>(null);
  const [activeTool, setActiveTool] = useState("select");
  const [activeColor, setActiveColor] = useState<string>(TAC_THEME.accent);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selObj, setSelObj] = useState<any>(null);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [lockPlayers, setLockPlayers] = useState(false);
  const [lockRoutes, setLockRoutes] = useState(false);
  const [editPop, setEditPop] = useState<{ obj: any; x: number; y: number; num: string } | null>(null);
  const [autoSaveTs, setAutoSaveTs] = useState<string | null>(() => {
    try { const d = localStorage.getItem(AUTOSAVE_KEY); return d ? JSON.parse(d).ts : null; } catch { return null; }
  });
  const [showRampPanel, setShowRampPanel] = useState(false);
  const [warmupPresetText, setWarmupPresetText] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryEntries, setLibraryEntries] = useState<{ id: string; name: string; createdAt: string; canvasJSON: string }[]>([]);

  // 加载热身预设说明
  useEffect(() => {
    setWarmupPresetText(warmupPresetDescription("pitch"));
  }, []);

  // ─── Auto-save ──────────────────────────────────────────
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

  // ─── Canvas callbacks ───────────────────────────────────
  const uh = useCallback((u: boolean, r: boolean) => {
    setCanUndo(u); setCanRedo(r);
    if (r || u) autoSave();
  }, [autoSave]);

  const hUndo = () => (boardRef.current as any)?._undo?.();
  const hRedo = () => (boardRef.current as any)?._redo?.();

  const hExport = () => {
    const c = boardRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL({ format: "png", multiplier: 2 });
    a.download = `warmup-${Date.now()}.png`;
    a.click();
  };

  const hClear = () => {
    const c = boardRef.current; if (!c) return;
    c.getObjects().filter((o: any) => !o._isFieldBg).forEach((o: any) => c.remove(o));
    c.requestRenderAll();
    autoSave();
  };

  // ─── Save warmup to library ──────────────────────────────
  const hSaveToLibrary = () => {
    const c = boardRef.current; if (!c) return;
    const lib = JSON.parse(localStorage.getItem('kenshin_warmup_library') || '[]');
    const defaultName = `热身方案 ${new Date().toLocaleDateString('zh-CN')}`;
    const name = prompt('请输入方案名称：', defaultName);
    if (!name || !name.trim()) return;
    if (!confirm(`确认保存「${name.trim()}」到热身库？`)) return;
    try {
      const json = JSON.stringify(c.toJSON());
      lib.unshift({
        id: `warmup_${Date.now()}`,
        name: name.trim(),
        createdAt: new Date().toISOString(),
        canvasJSON: json,
      });
      localStorage.setItem('kenshin_warmup_library', JSON.stringify(lib.slice(0, 20)));
      alert('已保存到热身库');
    } catch {}
  };

  // ─── Warmup library ──────────────────────────────
  const hOpenLibrary = () => {
    try {
      const lib = JSON.parse(localStorage.getItem('kenshin_warmup_library') || '[]');
      setLibraryEntries(lib);
    } catch { setLibraryEntries([]); }
    setShowLibrary(true);
  };

  const hLoadFromLibrary = (canvasJSON: string) => {
    const c = boardRef.current; if (!c) return;
    try {
      c.loadFromJSON(JSON.parse(canvasJSON)).then(() => {
        c.requestRenderAll();
        autoSave();
      });
      setShowLibrary(false);
    } catch { alert('加载失败，数据格式可能已损坏'); }
  };

  const hDeleteFromLibrary = (id: string) => {
    if (!confirm('确认删除该热身方案？删除后不可恢复。')) return;
    try {
      const lib = JSON.parse(localStorage.getItem('kenshin_warmup_library') || '[]');
      const updated = lib.filter((e: any) => e.id !== id);
      localStorage.setItem('kenshin_warmup_library', JSON.stringify(updated));
      setLibraryEntries(updated);
    } catch {}
  };

  const hRenameInLibrary = (id: string, currentName: string) => {
    const newName = prompt('请输入新名称：', currentName);
    if (!newName || !newName.trim()) return;
    try {
      const lib = JSON.parse(localStorage.getItem('kenshin_warmup_library') || '[]');
      const updated = lib.map((e: any) => e.id === id ? { ...e, name: newName.trim() } : e);
      localStorage.setItem('kenshin_warmup_library', JSON.stringify(updated));
      setLibraryEntries(updated);
    } catch {}
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

  // ─── Equipment placement ────────────────────────────────
  const eqCountRef = useRef<Record<string, number>>({});
  const hPlaceEquipment = useCallback((filename: string, name: string) => {
    const c = boardRef.current; if (!c) return;
    const cnt = (eqCountRef.current[filename] || 0) + 1;
    eqCountRef.current[filename] = cnt;

    const cx = 525 + ((cnt - 1) % 5) * 25;
    const cy = 340 + Math.floor((cnt - 1) / 5) * 25;

    if (name === "圆形环" || name === "敏捷环") {
      const ring = new Circle({
        left: cx - 20, top: cy - 20, radius: 20,
        fill: "transparent", stroke: "#000", strokeWidth: 3,
        selectable: true, evented: true, lockUniScaling: true,
      });
      (ring as any).name = name;
      ring.setControlsVisibility({ tl: true, tr: true, bl: true, br: true, ml: true, mr: true, mt: true, mb: true, mtr: true });
      c.add(ring); c.setActiveObject(ring); c.requestRenderAll(); autoSave();
      return;
    }

    FabricImage.fromURL(`/equipment/${filename}.png`).then((img) => {
      img.set({
        left: cx - 35, top: cy - 35, scaleX: 0.3, scaleY: 0.3,
        lockUniScaling: true, selectable: true, evented: true,
      });
      (img as any).name = name;
      img.setControlsVisibility({ tl: true, tr: true, bl: true, br: true, ml: true, mr: true, mt: true, mb: true, mtr: true });
      c.add(img); c.setActiveObject(img); c.requestRenderAll(); autoSave();
    });
  }, [autoSave]);

  const hField = useCallback((fn: string) => {
    const c = boardRef.current; if (!c) return;
    if ((c as any)._setFieldImage) {
      (c as any)._setFieldImage(fn);
    }
  }, []);

  // ─── Player operations (单一颜色) ────────────────────────
  const hPlayerDoubleClick = useCallback((playerObj: any, screenX: number, screenY: number) => {
    setSelObj(playerObj);
    setEditPop({
      obj: playerObj,
      x: screenX,
      y: screenY,
      num: (playerObj as any).number || "",
    });
  }, []);

  const hConfirmPopNum = (newNum: string) => {
    if (!editPop) return;
    const obj = editPop.obj;
    (obj as any).number = newNum;
    const objs = (obj as any)._objects || [];
    const textObj = objs.find((o: any) => o.type === "text" || o.type === "textbox");
    if (textObj) { textObj.set({ text: newNum }); boardRef.current?.requestRenderAll(); }
    setEditPop(null);
  };

  const hUpdatePlayerNum = (newNum: string) => {
    if (!selObj || !(selObj as any)._isPlayer) return;
    (selObj as any).number = newNum;
    const objs = (selObj as any)._objects || [];
    const textObj = objs.find((o: any) => o.type === "text" || o.type === "textbox");
    if (textObj) { textObj.set({ text: newNum }); boardRef.current?.requestRenderAll(); }
    setEditPop(null);
  };

  // ─── Quick warmup templates ─────────────────────────────
  const hQuickWarmupOutline = () => {
    const c = boardRef.current; if (!c) return;
    c.getObjects().filter((o: any) => !o._isFieldBg).forEach((o: any) => c.remove(o));
    if ((c as any)._setFieldImage) (c as any)._setFieldImage("default");

    // Place a few marker cones roughly along the field to represent warmup stations
    const stations = [
      { x: 100, y: 340, name: "起点", color: "#22c55e" },
      { x: 300, y: 200, name: "绳梯", color: "#3B82F6" },
      { x: 500, y: 340, name: "栏架", color: "#eab308" },
      { x: 700, y: 200, name: "冲刺", color: "#d92525" },
      { x: 900, y: 340, name: "终点", color: "#d92525" },
    ];

    stations.forEach((st) => {
      FabricImage.fromURL("/equipment/标志盘（红）.png").then((img) => {
        img.set({
          left: st.x - 35, top: st.y - 35,
          scaleX: 0.3, scaleY: 0.3,
          lockUniScaling: true, selectable: true, evented: true,
        });
        (img as any).name = st.name;
        c.add(img);
      });
    });

    // Phase labels
    const labels = [
      { x: 60, y: 620, text: "① Raise", color: "#22c55e" },
      { x: 260, y: 620, text: "② Activate", color: "#3B82F6" },
      { x: 460, y: 620, text: "③ Mobilize", color: "#eab308" },
      { x: 660, y: 620, text: "④ Potentiate", color: "#d92525" },
    ];
    labels.forEach(l => {
      const txt = new FabricText(l.text, {
        left: l.x, top: l.y, fontSize: 14, fontFamily: "Arial",
        fontWeight: "bold", fill: l.color,
        backgroundColor: "rgba(0,0,0,0.5)", padding: 4,
      });
      (txt as any)._isDrillAnnotation = true;
      c.add(txt);
    });

    c.requestRenderAll();
    autoSave();
  };

  const selName = selObj ? ((selObj as any).name || ((selObj as any)._isPlayer ? `球员#${(selObj as any).number}` : null)) : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: TAC_THEME.bg }}>
      {/* ─── Auto-save restore prompt ─── */}
      {autoSaveTs && (
        <div className="flex-shrink-0 px-3 py-2 flex items-center gap-3 text-xs"
          style={{ backgroundColor: TAC_THEME.accent, color: "#fff" }}>
          <span className="flex-1">检测到上次未保存的热身设计（{new Date(autoSaveTs).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}），是否继续？</span>
          <button onClick={restoreAutoSave} className="px-3 py-1 rounded font-bold text-xs" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>继续</button>
          <button onClick={dismissAutoSave} className="px-3 py-1 rounded text-xs" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>忽略</button>
        </div>
      )}

      {/* ─── Top Navigation Bar ─── */}
      <nav className="flex-shrink-0 flex items-center h-12 px-2 sm:px-3 gap-1 sm:gap-2"
        style={{ backgroundColor: "#171717", borderBottom: `1px solid ${TAC_THEME.border}` }}>
        {/* Palette toggle */}
        <button onClick={() => setPaletteCollapsed(!paletteCollapsed)}
          className="flex items-center justify-center w-8 h-8 rounded transition-colors touch-target"
          style={{ color: TAC_THEME.textDim }}
          onMouseEnter={(e) => { e.currentTarget.style.color = TAC_THEME.textMain; e.currentTarget.style.backgroundColor = TAC_THEME.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TAC_THEME.textDim; e.currentTarget.style.backgroundColor = "transparent"; }}
          title={paletteCollapsed ? "展开器材面板" : "收起器材面板"}>
          <Menu className="w-4 h-4" />
        </button>

        {/* Back */}
        <button onClick={() => router.push("/")}
          className="flex items-center justify-center w-8 h-8 rounded transition-colors touch-target"
          style={{ color: TAC_THEME.textDim }}
          onMouseEnter={(e) => { e.currentTarget.style.color = TAC_THEME.textMain; e.currentTarget.style.backgroundColor = TAC_THEME.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TAC_THEME.textDim; e.currentTarget.style.backgroundColor = "transparent"; }}
          title="返回首页">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </button>

        {/* Title */}
        <h1 className="font-semibold text-sm tracking-wide hidden sm:block" style={{ color: TAC_THEME.textMain }}>
          🏃 热身活动设计
        </h1>

        <div className="flex-1" />

        {/* RAMP 参考面板切换 */}
        <button
          onClick={() => setShowRampPanel(!showRampPanel)}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors touch-target"
          style={{ color: showRampPanel ? "#fff" : TAC_THEME.textDim, backgroundColor: showRampPanel ? TAC_THEME.accent : "transparent" }}
          title="RAMP 参考">
          📖 <span className="hidden sm:inline">RAMP参考</span>
        </button>

        {/* 快速模板 */}
        <button
          onClick={hQuickWarmupOutline}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors touch-target"
          style={{ color: TAC_THEME.textDim }}
          onMouseEnter={(e) => { e.currentTarget.style.color = TAC_THEME.textMain; e.currentTarget.style.backgroundColor = TAC_THEME.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TAC_THEME.textDim; e.currentTarget.style.backgroundColor = "transparent"; }}
          title="快速热身模板">
          ⚡ <span className="hidden sm:inline">快速模板</span>
        </button>

        {/* 保存到热身库 */}
        <button onClick={hSaveToLibrary}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-colors touch-target"
          style={{ color: '#fff', backgroundColor: '#22c55e' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          title="保存到热身库">
          💾 <span className="hidden sm:inline">保存到热身库</span>
        </button>

        {/* 热身库 */}
        <button onClick={hOpenLibrary}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-colors touch-target"
          style={{ color: '#fff', backgroundColor: '#3B82F6' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          title="热身库">
          📦 <span className="hidden sm:inline">热身库</span>
        </button>

        {/* 导出 PNG */}
        <button onClick={hExport}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-colors touch-target"
          style={{ color: TAC_THEME.accent, border: `1px solid ${TAC_THEME.accent}` }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          title="导出PNG">
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">导出PNG</span>
        </button>
      </nav>

      {/* ─── RAMP 参考面板 ─── */}
      {showRampPanel && (
        <div className="flex-shrink-0 px-4 py-3 space-y-2"
          style={{ backgroundColor: TAC_THEME.bgCard, borderBottom: `1px solid ${TAC_THEME.border}` }}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold" style={{ color: TAC_THEME.textMain }}>
              RAMP 热身系统参考（Ian Jeffreys）
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RAMP_PHASES.map((p) => (
              <div key={p.phase} className="p-2 rounded" style={{ backgroundColor: TAC_THEME.bg, border: `1px solid ${TAC_THEME.border}` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-[11px] font-bold" style={{ color: p.color }}>{p.label}</span>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: TAC_THEME.textDim }}>{p.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: TAC_THEME.textDim }}>
            {warmupPresetText}
          </p>
        </div>
      )}

      {/* ─── Player number editor bar ─── */}
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

      {/* ─── Selection indicator ─── */}
      {selName && !(selObj as any)?._isPlayer && (
        <div className="flex-shrink-0 flex items-center px-3 py-1" style={{ backgroundColor: TAC_THEME.bgCard, borderBottom: `1px solid ${TAC_THEME.border}` }}>
          <span className="text-[10px]" style={{ color: TAC_THEME.textDim }}>已选：{selName}</span>
        </div>
      )}

      {/* ─── Main canvas area ─── */}
      <div className="flex flex-1 overflow-hidden relative pb-12">
        <EquipmentPalette
          activeTool={activeTool}
          onFieldSelect={hField}
          onPlaceEquipment={hPlaceEquipment}
          collapsed={paletteCollapsed}
          onToggleCollapsed={() => setPaletteCollapsed(!paletteCollapsed)}
        />
        <FabricBoardDynamic
          activeTool={activeTool}
          activeColor={activeColor}
          onObjectSelected={setSelObj}
          onHistoryChange={uh}
          onCanvasChange={autoSave}
          boardRef={boardRef}
          onPlayerDoubleClick={hPlayerDoubleClick}
          lockPlayers={lockPlayers}
          lockRoutes={lockRoutes}
        />
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <BoardToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            activeColor={activeColor}
            onColorChange={setActiveColor}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={hUndo}
            onRedo={hRedo}
            onExport={hExport}
            onClear={hClear}
            onZoomIn={hZoomIn}
            onZoomOut={hZoomOut}
            onZoomFit={hZoomFit}
            lockPlayers={lockPlayers}
            onLockPlayersChange={setLockPlayers}
            lockRoutes={lockRoutes}
            onLockRoutesChange={setLockRoutes}
          />
        </div>

        {/* ─── Inline player number edit popup ─── */}
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

        {/* ─── Warmup Library Modal ─── */}
        {showLibrary && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setShowLibrary(false)}
          >
            <div
              className="bg-[#0d0d0d] border border-[#333] rounded-xl w-[400px] max-h-[70vh] flex flex-col m-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#222]">
                <h3 className="text-sm font-bold text-white">📦 热身库</h3>
                <button onClick={() => setShowLibrary(false)} className="text-gray-500 hover:text-white transition">
                  <span className="text-lg leading-none">&times;</span>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {libraryEntries.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-8">暂无保存的热身方案</p>
                ) : (
                  libraryEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-[#222] bg-[#111] hover:border-[#444] transition"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{entry.name}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">
                          {new Date(entry.createdAt).toLocaleDateString('zh-CN', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => hLoadFromLibrary(entry.canvasJSON)}
                        className="px-2.5 py-1 rounded text-[10px] font-bold text-white bg-[#22c55e] hover:opacity-85 transition"
                      >
                        加载
                      </button>
                      <button
                        onClick={() => hRenameInLibrary(entry.id, entry.name)}
                        className="px-2 py-1 rounded text-[10px] text-gray-400 hover:text-white hover:bg-[#333] transition"
                        title="重命名"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => hDeleteFromLibrary(entry.id)}
                        className="px-2 py-1 rounded text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end p-3 border-t border-[#222]">
                <button
                  onClick={() => setShowLibrary(false)}
                  className="px-3 py-1.5 text-[10px] text-gray-400 hover:text-white rounded transition"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
