"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Canvas, Circle, FabricImage } from "fabric";
import { EquipmentPalette } from "@/components/tactical/EquipmentPalette";
import { BoardToolbar } from "@/components/tactical/BoardToolbar";
import { ArrowLeft, Menu, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { TAC_THEME } from "@/lib/tactical-theme";
// ─── Constants ────────────────────────────────────────────
const AUTOSAVE_KEY = "warmup_autosave";

// ─── Dynamic import (Fabric.js 仅客户端) ──────────────────
const FabricBoardDynamic = dynamic(
  () => import("@/components/tactical/FabricBoard").then(m => ({ default: m.FabricBoard })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#121212]">
        <div className="w-8 h-8 border-2 border-[#992828] border-t-transparent rounded-full animate-spin" />
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
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryEntries, setLibraryEntries] = useState<{ id: string; name: string; createdAt: string; canvasJSON: string }[]>([]);

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

  // Save immediately on page unload (before debounce timer fires)
  useEffect(() => {
    const onUnload = () => {
      const c = boardRef.current; if (!c) return;
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
          json: JSON.stringify(c.toJSON()),
          ts: new Date().toISOString(),
        }));
      } catch {}
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  // Pending restore: canvas may not be ready when user clicks "继续"
  const pendingRestoreRef = useRef<string | null>(null);

  const doRestore = useCallback((c: Canvas, jsonStr: string) => {
    try {
      const obj = JSON.parse(jsonStr);
      if (!obj || !obj.objects) {
        console.warn("[warmup] restore: invalid JSON, clearing autosave");
        localStorage.removeItem(AUTOSAVE_KEY);
        setAutoSaveTs(null);
        return;
      }
      console.log("[warmup] restore: loading", obj.objects.length, "objects");
      // Use callback-based API (more reliable in Fabric 6.x)
      c.loadFromJSON(obj, () => {
        (c as any)._ensureFieldMarked?.();
        c.requestRenderAll();
        console.log("[warmup] restore: done");
        setAutoSaveTs(null);
        localStorage.removeItem(AUTOSAVE_KEY);
        pendingRestoreRef.current = null;
      });
    } catch (e) { console.warn("[warmup] doRestore error:", e); }
  }, []);

  const restoreAutoSave = useCallback(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) { setAutoSaveTs(null); return; }
      const data = JSON.parse(raw);
      const jsonStr = data.json;
      if (!jsonStr) { setAutoSaveTs(null); return; }

      const c = boardRef.current;
      if (!c) {
        // Canvas not ready yet — store for later
        pendingRestoreRef.current = jsonStr;
        setAutoSaveTs(null);
        return;
      }
      doRestore(c, jsonStr);
    } catch (e) { console.warn("[warmup] restoreAutoSave error:", e); }
  }, [doRestore]);

  // FabricBoard calls this when canvas is fully initialized
  const onCanvasReady = useCallback((c: Canvas) => {
    boardRef.current = c;
    // If there's a pending restore, apply it now
    if (pendingRestoreRef.current) {
      const jsonStr = pendingRestoreRef.current;
      pendingRestoreRef.current = null;
      doRestore(c, jsonStr);
    }
  }, [doRestore]);

  const dismissAutoSave = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setAutoSaveTs(null);
    pendingRestoreRef.current = null;
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
    const z = Math.min((c as any)._getZoom() * 1.15, 5);
    (c as any)._centerAtZoom(z);
  };
  const hZoomOut = () => {
    const c = boardRef.current; if (!c) return;
    const z = Math.max((c as any)._getZoom() / 1.15, 0.3);
    (c as any)._centerAtZoom(z);
  };
  // ─── Equipment placement ────────────────────────────────
  const eqCountRef = useRef<Record<string, number>>({});
  const hPlaceEquipment = useCallback((filename: string, name: string) => {
    const c = boardRef.current; if (!c) return;
    const cnt = (eqCountRef.current[filename] || 0) + 1;
    eqCountRef.current[filename] = cnt;

    const EQUIP_SIZE = 70;
    const cx = 525 + ((cnt - 1) % 5) * 25;
    const cy = 340 + Math.floor((cnt - 1) / 5) * 25;

    if (name === "圆形环" || name === "敏捷环") {
      const R = EQUIP_SIZE / 2;
      const ring = new Circle({
        left: cx - R, top: cy - R, radius: R,
        fill: "transparent", stroke: "#000", strokeWidth: 3,
        selectable: true, evented: true, lockUniScaling: true,
      });
      (ring as any).name = name;
      ring.setControlsVisibility({ tl: true, tr: true, bl: true, br: true, ml: true, mr: true, mt: true, mb: true, mtr: true });
      c.add(ring); c.setActiveObject(ring); c.requestRenderAll(); autoSave();
      return;
    }

    FabricImage.fromURL(`/equipment/${filename}.png`).then((img) => {
      const nw = img.width || 200, nh = img.height || 200;
      const s = EQUIP_SIZE / Math.max(nw, nh);
      img.set({
        left: cx - (nw * s) / 2, top: cy - (nh * s) / 2,
        scaleX: s, scaleY: s,
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

  const selName = selObj ? ((selObj as any).name || ((selObj as any)._isPlayer ? `球员#${(selObj as any).number}` : null)) : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: TAC_THEME.bg }}>
      {/* ─── Auto-save restore prompt ─── */}
      {autoSaveTs && (
        <div className="flex-shrink-0 px-3 py-2 flex items-center gap-3 text-xs"
          style={{ backgroundColor: TAC_THEME.accent, color: "#fff" }}>
          <span className="flex-1">检测到未保存的热身设计（{new Date(autoSaveTs).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}），是否恢复？</span>
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
          className="flex items-center gap-1 px-2 py-1 rounded transition-colors touch-target text-xs"
          style={{ color: TAC_THEME.textDim }}
          onMouseEnter={(e) => { e.currentTarget.style.color = TAC_THEME.textMain; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TAC_THEME.textDim; }}
          title="返回">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span className="hidden sm:inline">返回</span>
        </button>

        {/* Title */}
        <h1 className="font-semibold text-sm tracking-wide hidden sm:block" style={{ color: TAC_THEME.textMain }}>
          热身设计
        </h1>

        <div className="flex-1" />




        {/* 保存到热身库 */}
        <button onClick={hSaveToLibrary}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-colors touch-target"
          style={{ color: '#fff', backgroundColor: '#22c55e' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          title="保存到热身库">
          <span className="hidden sm:inline">保存</span>
        </button>

        {/* 热身库 */}
        <button onClick={hOpenLibrary}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-colors touch-target"
          style={{ color: '#fff', backgroundColor: '#3B82F6' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          title="热身库">
          <span className="hidden sm:inline">热身库</span>
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
          onToolChange={setActiveTool}
          onColorChange={setActiveColor}
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
          onCanvasReady={onCanvasReady}
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
                <h3 className="text-sm font-bold text-white">热身库</h3>
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
