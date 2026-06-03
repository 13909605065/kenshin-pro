"use client";

import { useState } from "react";
import type { TacticalFocus } from "@/lib/types";
import { Map, Users, Shield, Zap, Flag } from "lucide-react";

interface Props {
  module: TacticalFocus;
  onOpenBoard?: () => void;
}

export function CoachTacticalBriefing({ module, onOpenBoard }: Props) {
  const [activeDiagram, setActiveDiagram] = useState<"formation" | "press" | "transition">("formation");

  return (
    <div className="space-y-4">
      {/* === Header bar === */}
      <div className="flex items-center justify-between bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-neon-pink" />
          <div>
            <p className="text-sm font-bold text-white">{module.title}</p>
            <span className="text-[10px] text-neon-pink bg-neon-pink/10 px-2 py-0.5 rounded">{module.tactical_theme}</span>
          </div>
        </div>
        <button onClick={onOpenBoard} className="flex items-center gap-1 px-3 py-1.5 bg-neon-pink/10 border border-neon-pink/20 rounded-lg text-[10px] text-neon-pink hover:bg-neon-pink/20">
          <Map className="w-3.5 h-3.5"/> 打开战术板
        </button>
      </div>

      {/* === Four-column grid === */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* ── COL 1: Core Tactical Points ── */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1"><Zap className="w-3 h-3 text-neon-pink"/>核心战术</h3>
            <div className="space-y-2">
              {module.tactical_analysis?.slice(0, 4).map((point, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-neon-pink font-bold text-[10px] mt-0.5">{i+1}</span>
                  <p className="text-xs text-gray-300 leading-relaxed">{point}</p>
                </div>
              ))}
              {(!module.tactical_analysis || module.tactical_analysis.length === 0) && (
                <p className="text-xs text-gray-600">暂无战术要点</p>
              )}
            </div>
          </div>

          {/* Player roles */}
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1"><Users className="w-3 h-3 text-neon-pink"/>球员角色</h3>
            <div className="space-y-1.5">
              {module.player_roles?.slice(0, 5).map((role, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded bg-neon-pink/20 text-[8px] flex items-center justify-center text-neon-pink font-bold">{i+1}</span>
                  <span className="text-gray-300 truncate">{role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── COL 2-3: Field Diagrams ── */}
        <div className="lg:col-span-2 space-y-3">
          {/* Formation diagram */}
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] text-gray-500 uppercase tracking-wider">阵型落位</h3>
              <div className="flex gap-1">
                {["formation","press","transition"].map(k => (
                  <button key={k} onClick={()=>setActiveDiagram(k as any)}
                    className={"px-2 py-0.5 rounded text-[9px] "+(activeDiagram===k?"bg-neon-pink text-black":"text-gray-500 hover:text-gray-300")}>
                    {k==="formation"?"阵型":k==="press"?"压迫":"转换"}
                  </button>
                ))}
              </div>
            </div>
            {/* Mini field SVG */}
            <div className="aspect-[4/3] bg-[#0a0a0a] rounded-lg flex items-center justify-center border border-[#333]">
              <svg viewBox="0 0 300 200" className="w-full h-full">
                <rect x="15" y="10" width="270" height="180" fill="none" stroke="#2d6b2d" strokeWidth="1"/>
                <line x1="150" y1="10" x2="150" y2="190" stroke="#2d6b2d" strokeWidth="0.5"/>
                <circle cx="150" cy="100" r="35" fill="none" stroke="#2d6b2d" strokeWidth="0.5"/>
                {/* 4-4-2 defense positions */}
                {activeDiagram==="formation" && (<>
                  {/* Back 4 */}
                  {[{x:60,y:45},{x:130,y:35},{x:170,y:35},{x:240,y:45}].map((p,i)=>(
                    <g key={"d"+i}><circle cx={p.x} cy={p.y} r="5" fill="#FF2D55" stroke="#fff" strokeWidth="1"/><text x={p.x} y={p.y+1} textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">{i+2}</text></g>
                  ))}
                  {/* Mid 4 */}
                  {[{x:55,y:90},{x:105,y:85},{x:195,y:85},{x:245,y:90}].map((p,i)=>(
                    <g key={"m"+i}><circle cx={p.x} cy={p.y} r="5" fill="#FF2D55" stroke="#fff" strokeWidth="1"/><text x={p.x} y={p.y+1} textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">{i+6}</text></g>
                  ))}
                  {/* FW 2 */}
                  {[{x:110,y:145},{x:190,y:145}].map((p,i)=>(
                    <g key={"f"+i}><circle cx={p.x} cy={p.y} r="5" fill="#FF2D55" stroke="#fff" strokeWidth="1"/><text x={p.x} y={p.y+1} textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">{i+9}</text></g>
                  ))}
                  {/* GK */}
                  <g><circle cx="150" cy="18" r="5" fill="#FF2D55" stroke="#fff" strokeWidth="1"/><text x="150" y="19" textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">1</text></g>
                </>)}
                {activeDiagram==="press" && (<>
                  {/* Pressing arrows */}
                  {[{x1:60,y1:45,x2:80,y2:65},{x1:240,y1:45,x2:220,y2:65}].map((a,i)=>(
                    <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="#FF2D55" strokeWidth="1.5" strokeDasharray="4,2" markerEnd="url(#arrow)"/>
                  ))}
                  <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10z" fill="#FF2D55"/></marker></defs>
                </>)}
              </svg>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">{activeDiagram==="formation"?"后场4人+中场4人防线间距20-25m":"压迫触发:回传门将/中场持球/边后卫背身"}</p>
          </div>

          {/* Training blocks — mini field cards */}
          <div className="grid grid-cols-2 gap-2">
            {["热身激活","传接球对抗","专项防守","分队比赛"].map((drill,i)=>(
              <div key={i} className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 flex items-center gap-2 hover:border-neon-pink/30 cursor-pointer transition">
                <div className="w-10 h-8 bg-[#0a0a0a] rounded border border-[#444] flex items-center justify-center flex-shrink-0">
                  <Flag className="w-3 h-3 text-gray-600"/>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-white font-medium truncate">{drill}</p>
                  <p className="text-[9px] text-gray-600">15min</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── COL 4: Set pieces + Notes ── */}
        <div className="lg:col-span-1 space-y-3">
          {/* Set pieces */}
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1"><Flag className="w-3 h-3 text-neon-pink"/>定位球</h3>
            <div className="space-y-2">
              <div className="bg-[#0a0a0a] rounded-lg p-2 text-[10px]">
                <p className="text-gray-400 font-bold mb-1">进攻</p>
                <p className="text-gray-500">{module.set_piece_offense || "层次包抄"}</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-2 text-[10px]">
                <p className="text-gray-400 font-bold mb-1">防守</p>
                <p className="text-gray-500">{module.set_piece_defense || "区域+盯人"}</p>
              </div>
            </div>
          </div>

          {/* Key notes */}
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">攻防要点</h3>
            <div className="space-y-1 text-[10px] text-gray-400">
              {module.attacking_patterns && <p className="mb-1"><span className="text-gray-500">攻</span> {module.attacking_patterns}</p>}
              {module.defensive_shape && <p className="mb-1"><span className="text-gray-500">防</span> {module.defensive_shape}</p>}
              {module.transition_moments && <p className="mb-1"><span className="text-gray-500">转换</span> {module.transition_moments}</p>}
              {module.pressing_triggers && <p><span className="text-gray-500">压迫</span> {module.pressing_triggers}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
