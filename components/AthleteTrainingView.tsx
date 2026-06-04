"use client";

import { useState, useMemo } from "react";
import type { TrainingModule, PlayerFormData } from "@/lib/types";
import { Check, ChevronDown, ChevronUp, Printer, Download, Map } from "lucide-react";

/* ================================================================
   Athlete Training View — 运动员专属双视图
   1. 顺序跟练（卡片）
   2. 分类视图（表格+导出）
   ================================================================ */

interface SeqCard {
  id: string; step: number; type: "warmup" | "strength" | "tech" | "cooldown";
  name: string; detail: string; notes: string;
  duration?: number; sets?: number; reps?: number; load?: string; rpe?: string;
  rest?: number; hrZone?: string; diagram?: any; imageUrl?: string;
}

function flattenForAthlete(modules: TrainingModule[]): SeqCard[] {
  const cards: SeqCard[] = []; let s = 0;

  const add = (type: SeqCard["type"], name: string, detail: string, notes: string, extra?: Partial<SeqCard>) => {
    s++; cards.push({ id: "a"+s, step:s, type, name, detail, notes, ...extra });
  };

  modules.forEach((m: any) => {
    // Warmup
    (m.warmup || m.position_training?.warmup || []).forEach((w: any) => add("warmup", w.name||"热身", `${w.duration||"?"}min`, w.description||"", {duration:w.duration}));
    // Strength
    for (const k of ["upper_limb","lower_limb","core","ability"]) {
      (m[k] || m.position_training?.[k] || []).forEach((ex: any) => add("strength", ex.name, `${ex.sets||"?"}×${ex.reps||"?"} · ${ex.load||"BW"}`, ex.notes||ex.cue||"", {sets:ex.sets,reps:ex.reps,load:ex.load,rest:ex.rest,rpe:ex.rpe,hrZone:ex.heart_rate_zone}));
    }
    // Technique drills
    (m.drills || m.position_training?.drills || []).forEach((d: any) => add("tech", d.name, `${d.duration||"?"}min`, d.description||d.focus||"", {duration:d.duration,diagram:d.diagram,imageUrl:d.image_url}));
    // Coach activities (if any in athlete context)
    (m.activities || []).forEach((a: any) => add("tech", a.name, `${a.duration||"?"}min`, a.description||"", {duration:a.duration,diagram:a.diagram}));
    // Cooldown
    (m.cooldown || m.position_training?.cooldown || []).forEach((c: any) => add("cooldown", c.name||"整理", `${c.duration||"?"}min`, c.description||"",{duration:c.duration}));
  });
  return cards;
}

const TYPE_META: Record<string, {label:string;icon:string;color:string}> = {
  warmup: {label:"热身",icon:"🔥",color:"bg-green-500/10 border-green-500/30 text-green-400"},
  strength: {label:"力量",icon:"💪",color:"bg-[#d92525]/10 border-[#d92525]/30 text-neon-pink"},
  tech: {label:"技术",icon:"⚽",color:"bg-blue-500/10 border-blue-500/30 text-blue-400"},
  cooldown: {label:"放松",icon:"🧊",color:"bg-yellow-500/10 border-yellow-500/30 text-yellow-400"},
};

/* ================================================================
   VIEW 1: Sequential — clean cards for following along
   ================================================================ */
export function AthleteSequentialView({ modules, formData }: { modules: TrainingModule[]; formData?: PlayerFormData }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const cards = useMemo(() => flattenForAthlete(modules), [modules]);
  const total = cards.length;
  const doneCount = cards.filter(c => done.has(c.id)).length;

  return (
    <div className="space-y-3">
      {/* Profile header */}
      {formData && (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-3 flex items-center gap-2 text-[11px]">
          <span className="text-gray-400">{formData.name||"运动员"} · {formData.position||"?"} · {formData.age||"?"}岁</span>
          {(formData.injurySites||[]).length > 0 && <span className="text-red-400">⚠️伤病: 训练中注意保护</span>}
          <span className="text-neon-pink ml-auto">{doneCount}/{total}</span>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 bg-[#222] rounded-full overflow-hidden">
        <div className="h-full bg-[#d92525] transition-all duration-300" style={{width:(total>0?Math.round(doneCount/total*100):0)+"%"}}/>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {cards.map((card) => {
          const meta = TYPE_META[card.type];
          const isDone = done.has(card.id);
          const isExp = expanded === card.id;
          return (
            <div key={card.id}
              onClick={() => { setDone(p=>{const n=new Set(p);n.has(card.id)?n.delete(card.id):n.add(card.id);return n;}); setExpanded(isExp?null:card.id); }}
              className={`border rounded-xl p-3 cursor-pointer transition ${meta.color} ${isDone?"opacity-50":""}`}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 w-5">{card.step}</span>
                <span className="text-sm">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isDone?"line-through":""}`}>{card.name}</p>
                  <p className="text-[11px] opacity-70">{card.detail}</p>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isDone?"bg-[#d92525] border-[#d92525]":"border-gray-600"}`}>
                  {isDone && <Check className="w-3 h-3 text-black"/>}
                </div>
                {isExp ? <ChevronUp className="w-4 h-4 opacity-50"/> : <ChevronDown className="w-4 h-4 opacity-50"/>}
              </div>
              {/* Expanded details */}
              {isExp && (
                <div className="mt-2 pt-2 border-t border-white/10 text-[11px] space-y-1">
                  {card.notes && <p className="opacity-60">{card.notes}</p>}
                  {card.type==="strength" && <>
                    {card.rpe && <p>RPE: {card.rpe}</p>}
                    {card.rest && <p>组间休息: {card.rest}s</p>}
                    {card.hrZone && <p>心率区间: {card.hrZone}</p>}
                  </>}
                  {card.type==="tech" && card.diagram && <p className="text-blue-400">场地示意图可查看</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   VIEW 2: Category with export
   ================================================================ */
export function AthleteCategoryView({ modules }: { modules: TrainingModule[] }) {
  const [tab, setTab] = useState<string>("strength");
  const cards = useMemo(() => flattenForAthlete(modules), [modules]);
  const grouped = useMemo(() => {
    const g: Record<string, SeqCard[]> = {warmup:[],strength:[],tech:[],cooldown:[]};
    cards.forEach(c => g[c.type].push(c));
    return g;
  }, [cards]);

  const tabs = [
    {id:"warmup",label:"热身",icon:"🔥"},
    {id:"strength",label:"力量训练",icon:"💪"},
    {id:"tech",label:"专项技术",icon:"⚽"},
    {id:"cooldown",label:"放松恢复",icon:"🧊"},
  ];

  const exportData = () => {
    const rows = grouped[tab].map(c => [c.name, c.detail, c.notes, c.rest||"", c.rpe||"", c.hrZone||""].join("\t"));
    const blob = new Blob([["动作\t负荷\t备注\t间歇\tRPE\t心率", ...rows].join("\n")], {type:"text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${tab}-训练记录.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-0.5 bg-[#111] rounded-lg p-0.5">
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={"flex-1 py-1.5 rounded-md text-[11px] font-medium "+(tab===t.id?"bg-[#d92525] text-black":"text-gray-500")}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "strength" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">力量训练数据</h3>
            <div className="flex gap-2">
              <button onClick={exportData} className="flex items-center gap-1 px-3 py-1.5 bg-[#222] border border-[#444] rounded-lg text-[10px] text-gray-300 hover:text-white"><Download className="w-3 h-3"/>导出CSV</button>
              <button onClick={()=>window.print()} className="flex items-center gap-1 px-3 py-1.5 bg-[#222] border border-[#444] rounded-lg text-[10px] text-gray-300 hover:text-white"><Printer className="w-3 h-3"/>打印</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-[#333]">
                {["动作","组数","负荷","间歇","RPE","心率"].map(h=><th key={h} className="py-2 text-left font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {grouped.strength.map(c => (
                  <tr key={c.id} className="border-b border-[#1a1a1a]">
                    <td className="py-2 text-white">{c.name}</td><td className="py-2 text-gray-400">{c.detail}</td><td className="py-2 text-gray-400">{c.load||"-"}</td><td className="py-2 text-gray-400">{c.rest||"-"}s</td><td className="py-2 text-gray-400">{c.rpe||"-"}</td><td className="py-2 text-gray-400">{c.hrZone||"-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "tech" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {grouped.tech.map(c => (
            <div key={c.id} className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
              <p className="text-sm font-bold text-white">{c.name}</p>
              <p className="text-[11px] text-gray-400 mt-1">{c.detail} · {c.notes}</p>
              {c.diagram && <div className="mt-2 text-[10px] text-blue-400 flex items-center gap-1"><Map className="w-3 h-3"/>场地示意图</div>}
            </div>
          ))}
          {grouped.tech.length===0 && <p className="text-gray-600 text-sm py-8">暂无技术训练内容</p>}
        </div>
      )}

      {tab !== "strength" && tab !== "tech" && (
        <div className="space-y-2">
          {grouped[tab].map(c => (
            <div key={c.id} className="bg-[#1a1a1a] border border-[#333] rounded-xl p-3 flex items-center justify-between">
              <div><p className="text-sm text-white">{c.name}</p><p className="text-[11px] text-gray-500">{c.detail}</p></div>
              <span className="text-[10px] text-gray-600">{c.notes?.slice(0,20)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom export bar */}
      <div className="flex gap-2 pt-4 border-t border-[#333]">
        <button onClick={()=>window.print()} className="flex-1 py-2 bg-[#222] border border-[#444] rounded-lg text-xs text-gray-300 flex items-center justify-center gap-1"><Printer className="w-3.5 h-3.5"/>导出PDF</button>
        <button onClick={exportData} className="flex-1 py-2 bg-[#222] border border-[#444] rounded-lg text-xs text-gray-300 flex items-center justify-center gap-1"><Download className="w-3.5 h-3.5"/>导出表格</button>
      </div>
    </div>
  );
}
