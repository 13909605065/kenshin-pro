"use client";

import { useRef, useState, useCallback } from "react";
import { Canvas, Circle, FabricText, Group, FabricImage } from "fabric";
import { FabricBoard, exportBoardAsPNG } from "@/components/tactical/FabricBoard";
import { EquipmentPalette } from "@/components/tactical/EquipmentPalette";
import { BoardToolbar } from "@/components/tactical/BoardToolbar";
import { ArrowLeft, Save, FolderOpen, X, Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";

const FORMATION_DATA: Record<string, { x: number; y: number; n: string; c: string }[]> = {
  "4-3-3": [
    {x:55,y:340,n:"1",c:"#FF2D55"},{x:195,y:100,n:"2",c:"#FF2D55"},{x:170,y:260,n:"4",c:"#FF2D55"},{x:170,y:420,n:"5",c:"#FF2D55"},{x:195,y:580,n:"3",c:"#FF2D55"},
    {x:390,y:190,n:"8",c:"#FF2D55"},{x:430,y:340,n:"6",c:"#FF2D55"},{x:390,y:490,n:"10",c:"#FF2D55"},{x:670,y:110,n:"7",c:"#FF2D55"},{x:740,y:340,n:"9",c:"#FF2D55"},{x:670,y:570,n:"11",c:"#FF2D55"},
  ],
  "4-4-2": [
    {x:55,y:340,n:"1",c:"#FF2D55"},{x:195,y:90,n:"2",c:"#FF2D55"},{x:170,y:250,n:"4",c:"#FF2D55"},{x:170,y:430,n:"5",c:"#FF2D55"},{x:195,y:590,n:"3",c:"#FF2D55"},
    {x:410,y:90,n:"7",c:"#FF2D55"},{x:430,y:250,n:"8",c:"#FF2D55"},{x:430,y:430,n:"6",c:"#FF2D55"},{x:410,y:590,n:"11",c:"#FF2D55"},{x:700,y:260,n:"9",c:"#FF2D55"},{x:700,y:420,n:"10",c:"#FF2D55"},
  ],
  "3-5-2": [
    {x:55,y:340,n:"1",c:"#FF2D55"},{x:140,y:180,n:"3",c:"#FF2D55"},{x:120,y:340,n:"5",c:"#FF2D55"},{x:140,y:500,n:"4",c:"#FF2D55"},
    {x:310,y:60,n:"7",c:"#FF2D55"},{x:390,y:180,n:"8",c:"#FF2D55"},{x:410,y:340,n:"6",c:"#FF2D55"},{x:390,y:500,n:"10",c:"#FF2D55"},{x:310,y:620,n:"2",c:"#FF2D55"},
    {x:700,y:260,n:"9",c:"#FF2D55"},{x:700,y:420,n:"11",c:"#FF2D55"},
  ],
  "4-2-3-1": [
    {x:55,y:340,n:"1",c:"#FF2D55"},{x:195,y:90,n:"2",c:"#FF2D55"},{x:170,y:250,n:"4",c:"#FF2D55"},{x:170,y:430,n:"5",c:"#FF2D55"},{x:195,y:590,n:"3",c:"#FF2D55"},
    {x:340,y:250,n:"6",c:"#FF2D55"},{x:340,y:430,n:"8",c:"#FF2D55"},{x:570,y:90,n:"7",c:"#FF2D55"},{x:580,y:340,n:"10",c:"#FF2D55"},{x:570,y:590,n:"11",c:"#FF2D55"},{x:770,y:340,n:"9",c:"#FF2D55"},
  ],
  "3-4-3": [
    {x:55,y:340,n:"1",c:"#FF2D55"},{x:140,y:180,n:"3",c:"#FF2D55"},{x:120,y:340,n:"4",c:"#FF2D55"},{x:140,y:500,n:"5",c:"#FF2D55"},
    {x:350,y:70,n:"7",c:"#FF2D55"},{x:390,y:250,n:"8",c:"#FF2D55"},{x:390,y:430,n:"6",c:"#FF2D55"},{x:350,y:610,n:"11",c:"#FF2D55"},
    {x:640,y:130,n:"10",c:"#FF2D55"},{x:720,y:340,n:"9",c:"#FF2D55"},{x:640,y:550,n:"11",c:"#FF2D55"},
  ],
};

const THEMES = ["控球","射门","传中","防守","压迫","反击","定位球","阵地进攻","热身","体能","个人技术"];

interface SavedScene { id: string; name: string; theme: string; json: string; createdAt: string; }

export default function TacticsPage() {
  const router = useRouter();
  const boardRef = useRef<Canvas | null>(null);
  const [activeTool, setActiveTool] = useState("select");
  const [activeColor, setActiveColor] = useState("#FF2D55");
  const [canUndo, setCanUndo] = useState(false); const [canRedo, setCanRedo] = useState(false);
  const [selObj, setSelObj] = useState<any>(null);
  const [saveOpen, setSaveOpen] = useState(false); const [loadOpen, setLoadOpen] = useState(false);
  const [sName, setSName] = useState(""); const [sTheme, setSTheme] = useState("控球");
  const [scenes, setScenes] = useState<SavedScene[]>(() => { try { return JSON.parse(localStorage.getItem("tac_scenes")||"[]"); } catch { return []; }});

  const uh = useCallback((u:boolean,r:boolean)=>{setCanUndo(u);setCanRedo(r);},[]);
  const hUndo = () => (boardRef.current as any)?._undo?.();
  const hRedo = () => (boardRef.current as any)?._redo?.();
  const hExport = () => { if(boardRef.current) exportBoardAsPNG(boardRef.current); };

  const hClear = () => { const c=boardRef.current; if(!c)return; const bg=c.getObjects().find((o:any)=>o._isFieldBg); c.clear(); c.backgroundColor="#0A8A2E"; if(bg)c.add(bg); c.requestRenderAll(); };

  const hField = useCallback((fn: string) => {
    const c=boardRef.current; if(!c)return;
    c.getObjects().filter((o:any)=>o._isFieldBg).forEach((o:any)=>c.remove(o));
    FabricImage.fromURL(`/equipment/${fn}.png`).then((img) => {
      img.set({left:0,top:0,scaleX:1050/img.width!,scaleY:680/img.height!,selectable:false,evented:false});
      (img as any)._isFieldBg=true;
      const others=c.getObjects().filter((o:any)=>!o._isFieldBg);
      others.forEach((o:any)=>c.remove(o));
      c.add(img); others.forEach((o:any)=>c.add(o));
      c.requestRenderAll();
    });
  }, []);

  const placePlayers = (pl: {x:number;y:number;n:string;c:string}[], color?: string) => {
    const c=boardRef.current; if(!c)return;
    const clr = color||activeColor;
    pl.forEach((p) => {
      const cr = new Circle({left:p.x-20,top:p.y-20,radius:20,fill:p.c||clr,stroke:"#FFF",strokeWidth:2.5});
      const tx = new FabricText(p.n,{left:p.x-10,top:p.y-12,fontSize:16,fontFamily:"Arial",fontWeight:"bold",fill:["#FFD700","#FFF","#00FF88"].includes(p.c||clr)?"#000":"#FFF",selectable:false});
      const g = new Group([cr,tx],{left:p.x-20,top:p.y-20});
      (g as any)._isPlayer=true;(g as any).number=p.n;g.setControlsVisibility({mtr:false});c.add(g);
    });
    c.requestRenderAll();
  };

  const hFormation = (f: string) => placePlayers(FORMATION_DATA[f]||FORMATION_DATA["4-3-3"]);

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
    <div className="h-screen flex flex-col bg-pitch-900">
      <header className="bg-pitch-800 border-b border-pitch-600 px-3 h-11 flex items-center gap-2 flex-shrink-0">
        <button onClick={()=>router.push("/")} className="text-gray-400 hover:text-white flex items-center gap-1" title="返回首页">
          <ArrowLeft className="w-4 h-4"/><span className="text-[11px] hidden sm:inline">返回</span>
        </button>
        <h1 className="text-white font-bold text-sm">📋 战术板</h1>
        <div className="flex-1"/>
        <button onClick={()=>setSaveOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 bg-pitch-700 hover:bg-pitch-600 rounded-lg transition"
          title="保存当前战术">
          <Save className="w-3.5 h-3.5"/>保存战术
        </button>
        <button onClick={()=>{setScenes(JSON.parse(localStorage.getItem("tac_scenes")||"[]"));setLoadOpen(true);}}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 bg-pitch-700 hover:bg-pitch-600 rounded-lg transition"
          title="打开已保存的战术">
          <FolderOpen className="w-3.5 h-3.5"/>战术库{scenes.length>0&&<span className="text-neon-pink ml-0.5">{scenes.length}</span>}
        </button>
        {selName && <span className="text-[10px] text-gray-500 hidden sm:inline ml-1">已选：{selName}</span>}
      </header>

      {saveOpen && (
        <div className="absolute top-11 right-3 z-50 glass-card p-3 w-72 space-y-2 shadow-2xl">
          <div className="flex items-center justify-between"><h3 className="text-white font-bold text-xs">保存战术</h3><button onClick={()=>setSaveOpen(false)} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5"/></button></div>
          <input value={sName} onChange={(e)=>setSName(e.target.value)} placeholder="战术名称" className="input-field text-xs h-9" onKeyDown={(e)=>e.key==="Enter"&&hSave()}/>
          <div className="flex flex-wrap gap-1">{THEMES.map((t)=><button key={t} onClick={()=>setSTheme(t)} className={`px-2 py-0.5 rounded text-[10px] transition ${sTheme===t?"bg-neon-pink text-black":"bg-pitch-600 text-gray-400 hover:bg-pitch-500"}`}>{t}</button>)}</div>
          <button onClick={hSave} disabled={!sName.trim()} className="w-full py-2 bg-neon-pink text-black font-bold rounded text-xs disabled:opacity-40"><Save className="w-3 h-3 inline mr-1"/>保存</button>
        </div>
      )}

      {loadOpen && (
        <div className="absolute top-11 right-3 z-50 glass-card p-3 w-80 space-y-2 shadow-2xl max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between"><h3 className="text-white font-bold text-xs">战术库</h3><button onClick={()=>setLoadOpen(false)} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5"/></button></div>
          {scenes.length===0?<p className="text-gray-500 text-[11px] text-center py-6">暂无保存的战术</p>:scenes.map((s)=>(
            <div key={s.id} className="flex items-center gap-2 p-2 rounded bg-pitch-800 hover:bg-pitch-700 group">
              <Bookmark className="w-3.5 h-3.5 text-neon-pink flex-shrink-0"/>
              <div className="flex-1 min-w-0"><p className="text-xs text-white truncate">{s.name}</p><p className="text-[10px] text-gray-500">{s.theme} · {new Date(s.createdAt).toLocaleDateString()}</p></div>
              <button onClick={()=>hLoad(s)} className="text-[10px] text-neon-pink hover:underline flex-shrink-0">加载</button>
              <button onClick={()=>hDel(s.id)} className="text-gray-600 hover:text-neon-red flex-shrink-0"><X className="w-3 h-3"/></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <EquipmentPalette onFieldSelect={hField}/>
        <FabricBoard activeTool={activeTool} activeColor={activeColor} onObjectSelected={setSelObj} onHistoryChange={uh} boardRef={boardRef}/>
      </div>

      <BoardToolbar activeTool={activeTool} onToolChange={setActiveTool} activeColor={activeColor} onColorChange={setActiveColor} canUndo={canUndo} canRedo={canRedo} onUndo={hUndo} onRedo={hRedo} onExport={hExport} onFormation={hFormation} onClear={hClear}/>
    </div>
  );
}
