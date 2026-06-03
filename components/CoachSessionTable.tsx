"use client";

import { useState, useMemo } from "react";
import type { TrainingModule } from "@/lib/types";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

interface CRow {
  id: string; step: number; section: string; color: string;
  name: string; dur: string; setup: string; brief: string;
  hasDia: boolean; dia?: any; cp: string; prog: string;
}

const CS: Record<string, string> = {
  "热身": "#22c55e", "技术专项": "#16a34a", "分队实战": "#3B82F6", "冷身放松": "#eab308",
};

function flat(modules: TrainingModule[]): CRow[] {
  const r: CRow[] = []; let s = 0;
  const a = (sec: string, nm: string, dur: string, su: string, br: string, cp: string, pr: string, hd: boolean, d?: any) => {
    s++; r.push({ id: "c"+s, step:s, section:sec, color:CS[sec]||"#666", name:nm, dur, setup:su, brief:br, hasDia:hd, dia:d, cp, prog:pr });
  };
  modules.forEach((m: any) => {
    if (m.module !== "session_plan") return;
    (m.warmup||[]).forEach((w: any) => a("热身", w.name||"热身", (w.duration||"?")+"min", "全队", w.description||"", w.coaching_points?.join(";")||"", "-", false));
    (m.activities||[]).forEach((x: any) => a("技术专项", x.name, (x.duration||"?")+"min", (x.area||"全场")+" "+(x.groups||"全队"), x.description||"", x.coaching_points?.join(";")||"", "+"+(x.progression||"-")+" -"+(x.regression||"-"), !!x.diagram, x.diagram));
    if (m.ssg) a("分队实战", m.ssg.name, (m.ssg.duration||"?")+"min", (m.ssg.area||"?")+" "+(m.ssg.players||"?"), m.ssg.rules||"", m.ssg.coaching_focus?.join(";")||"", "-", false);
    (m.cooldown||[]).forEach((c: any) => a("冷身放松", c.name||"", (c.duration||"?")+"min", "全队", c.description||"", "-", "-", false));
  });
  return r;
}

function Thumb({ dia, onClick }: { dia?: any; onClick: () => void }) {
  if (!dia) return <span className="text-[10px] text-gray-600">-</span>;
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-10 h-7 rounded border border-[#444] hover:border-neon-pink bg-[#f0f4e8] overflow-hidden">
      <svg viewBox="0 0 60 40" className="w-full h-full">
        <rect x="3" y="2" width="54" height="36" fill="none" stroke="#4a9e4a" strokeWidth="1"/>
        <line x1="30" y1="2" x2="30" y2="38" stroke="#4a9e4a" strokeWidth="0.5"/>
        <circle cx="30" cy="20" r="6" fill="none" stroke="#4a9e4a" strokeWidth="0.5"/>
        {(dia.players||[]).slice(0,11).map((p: any, i: number) => (
          <circle key={"p"+i} cx={3+p.x*54} cy={2+p.y*36} r="1.5" fill={p.color||"#FF2D55"}/>
        ))}
        {(dia.opponents||[]).slice(0,11).map((p: any, i: number) => (
          <circle key={"o"+i} cx={3+p.x*54} cy={2+p.y*36} r="1.5" fill={p.color||"#3B82F6"}/>
        ))}
      </svg>
    </button>
  );
}

export function CoachSessionTable({ modules, onOpenDiagram }: { modules: TrainingModule[]; onOpenDiagram?: (d: any) => void }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [exp, setExp] = useState<string | null>(null);
  const rows = useMemo(() => flat(modules), [modules]);
  const T = rows.length;
  const D = rows.filter(r => done.has(r.id)).length;

  const sp = useMemo(() => {
    const s: number[] = new Array(rows.length).fill(1);
    let i = 0;
    while (i < rows.length) {
      const x = rows[i].section; let c = 0, j = i;
      while (j < rows.length && rows[j].section === x) { c++; j++; }
      s[i] = c; i += c;
    }
    return s;
  }, [rows]);

  if (!T) return <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8 text-center text-gray-500 text-sm">暂无训练教案</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2.5">
        <span className="text-sm font-bold text-white">训练课表</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500">{T}项 {D}/{T}</span>
          {Object.entries(CS).filter(([k]) => rows.some(r => r.section === k)).map(([label, color]) => (
            <div key={label} className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} title={label} />
          ))}
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead className="sticky top-0 z-10 bg-[#111]">
              <tr className="text-[10px] text-gray-500 border-b border-[#333]">
                <th className="py-2 pl-3 text-left w-6">#</th>
                <th className="py-2 text-left w-14">模块</th>
                <th className="py-2 text-left">训练科目</th>
                <th className="py-2 text-center w-12">用时</th>
                <th className="py-2 text-center w-14">场地图</th>
                <th className="py-2 pr-3 text-center w-8">OK</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isD = done.has(row.id);
                const isE = exp === row.id;
                const isF = idx === 0 || rows[idx-1]?.section !== row.section;
                return (
                  <tr key={row.id}
                    onClick={() => {
                      setDone(p => { const n = new Set(p); n.has(row.id) ? n.delete(row.id) : n.add(row.id); return n; });
                      setExp(isE ? null : row.id);
                    }}
                    className={"cursor-pointer border-b border-[#1a1a1a] " + (isD ? "bg-neon-pink/5" : "hover:bg-[#222]")}>
                    <td className="py-2 pl-3"><span className={"text-[11px] font-bold "+(isD?"text-neon-pink line-through":"text-gray-500")}>{row.step}</span></td>
                    {isF && <td rowSpan={sp[idx]} className="py-2 pr-1 align-top" style={{backgroundColor:row.color+"10"}}>
                      <div className="flex items-center gap-1"><div className="w-1 h-3 rounded-full" style={{backgroundColor:row.color}}/><span className="text-[10px] font-bold whitespace-nowrap" style={{color:row.color}}>{row.section}</span></div>
                    </td>}
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-1"><div className="flex-1 min-w-0"><p className={"text-sm truncate "+(isD?"text-gray-500 line-through":"text-white")}>{row.name}</p><p className="text-[10px] text-gray-600 truncate mt-0.5 hidden sm:block">{row.setup}</p></div>{isE?<ChevronUp className="w-3 h-3 text-gray-600"/>:<ChevronDown className="w-3 h-3 text-gray-600"/>}</div>
                    </td>
                    <td className="py-2 text-center"><span className={"text-[11px] whitespace-nowrap "+(isD?"text-gray-600":"text-gray-300")}>{row.dur}</span></td>
                    <td className="py-2 text-center"><div className="flex justify-center"><Thumb dia={row.hasDia?row.dia:null} onClick={()=>onOpenDiagram?.(row.dia)}/></div></td>
                    <td className="py-2 pr-3 text-center"><div className={"w-5 h-5 rounded flex items-center justify-center border-2 mx-auto "+(isD?"bg-neon-pink border-neon-pink":"border-[#444]")}>{isD&&<Check className="w-3 h-3 text-black"/>}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
