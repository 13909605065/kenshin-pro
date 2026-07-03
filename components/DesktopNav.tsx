"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTeam } from "@/lib/team-context";
import { ChevronDown, Plus, Settings, X } from "lucide-react";
import {
  Home, Dumbbell, Activity, Zap, Users,
  BarChart3, Gauge, Trophy, ListChecks, Shield,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "home",     label: "首页",     icon: Home,       path: "/" },
  { id: "field",    label: "场地", icon: Activity,    path: "/field" },
  { id: "warmup",   label: "热身", icon: Zap,         path: "/warmup" },
  { id: "gym",      label: "力量",   icon: Dumbbell,    path: "/gym" },
  { id: "exercises",label: "动作库",   icon: ListChecks,  path: "/exercises" },
  { id: "planning", label: "周期", icon: Dumbbell,    path: "/planning" },
  { id: "load",     label: "负荷", icon: BarChart3,   path: "/load" },
  { id: "fitness",  label: "体测",     icon: Gauge,       path: "/fitness" },
  { id: "roster",   label: "花名册",   icon: Users,       path: "/roster" },
  { id: "injury-prevention", label: "伤病", icon: Shield, path: "/injury-prevention" },
  { id: "status",   label: "状态", icon: Activity,    path: "/status" },
  { id: "match",    label: "比赛",     icon: Trophy,      path: "/match" },
  { id: "settings", label: "设置",     icon: Settings,    path: "/settings" },
];

export function DesktopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { teamId, teams, switchTeam, addNewTeam, renameExistingTeam, deleteExistingTeam } = useTeam();
  const [showManage, setShowManage] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  const isActive = (path: string) =>
    pathname === path || (path !== "/" && pathname.startsWith(path));

  return (
    <>
      {/* ── Single top bar: brand + team + nav ── */}
      <header className="hidden lg:flex items-center bg-[#121212] border-b border-[#1e1e1e] px-4 h-10">
        {/* Brand */}
        <button
          onClick={() => router.push("/")}
          className="text-xs font-bold text-white tracking-wide whitespace-nowrap mr-4 hover:text-[#992828] transition shrink-0"
        >
          KENSHIN PRO S&C
          <span className="text-[9px] text-gray-500 font-normal ml-1.5 hidden xl:inline">体能教练工作台 v2</span>
        </button>

        {/* Team switcher */}
        <div className="flex items-center gap-1 mr-3 shrink-0">
          <span className="text-[9px] text-gray-600">|</span>
          <div className="relative">
            <select
              value={teamId}
              onChange={(e) => switchTeam(e.target.value)}
              className="bg-transparent text-gray-400 text-[10px] font-medium appearance-none pr-3 cursor-pointer focus:outline-none hover:text-white transition"
            >
              {teams.map(t => (
                <option key={t.id} value={t.id} className="bg-[#1e1e1e] text-gray-300">{t.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-600 pointer-events-none" />
          </div>
          <button
            onClick={() => setShowManage(true)}
            className="text-gray-600 hover:text-gray-300 transition ml-0.5"
          >
            <Settings className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex items-center gap-0.5 overflow-x-auto ml-1">
          {NAV_ITEMS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium whitespace-nowrap transition ${
                isActive(tab.path)
                  ? "bg-[#992828]/15 text-[#992828]"
                  : "text-gray-400 hover:text-white hover:bg-[#1e1e1e]"
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Team management modal ── */}
      {showManage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowManage(false)}>
          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4 w-full max-w-xs space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white">管理球队</h3>
              <button onClick={() => setShowManage(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-2">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { addNewTeam(newName.trim()); setNewName(''); }}}
                placeholder="新球队名称" className="flex-1 bg-[#121212] border border-[#333] rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600" />
              <button onClick={() => { if (newName.trim()) { addNewTeam(newName.trim()); setNewName(''); }}}
                disabled={!newName.trim()} className="px-3 py-1 bg-[#992828] text-white rounded text-xs font-bold disabled:opacity-40">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {teams.map(t => (
                <div key={t.id} className="flex items-center gap-2 bg-[#121212] rounded px-2.5 py-1.5 border border-[#222]">
                  {renameId === t.id ? (
                    <>
                      <input value={renameName} onChange={e => setRenameName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { renameExistingTeam(t.id, renameName); setRenameId(null); } if (e.key === 'Escape') setRenameId(null); }}
                        className="flex-1 bg-[#1e1e1e] border border-[#333] rounded px-1.5 py-0.5 text-[10px] text-gray-300" autoFocus />
                      <button onClick={() => { renameExistingTeam(t.id, renameName); setRenameId(null); }} className="text-[10px] text-green-400">保存</button>
                      <button onClick={() => setRenameId(null)} className="text-[10px] text-gray-500">取消</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-[10px] text-gray-300 truncate">{t.name}</span>
                      {t.id === teamId && <span className="text-[8px] text-[#992828] px-1">当前</span>}
                      <button onClick={() => { setRenameId(t.id); setRenameName(t.name); }} className="text-[9px] text-gray-500 hover:text-gray-300">改名</button>
                      <button onClick={() => deleteExistingTeam(t.id)} disabled={teams.length <= 1}
                        className="text-[9px] text-red-500/60 hover:text-red-400 disabled:opacity-30">删除</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
