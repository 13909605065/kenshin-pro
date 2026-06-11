"use client";

import { useState } from "react";
import { useTeam } from "@/lib/team-context";
import { ChevronDown, Plus, Settings, X } from "lucide-react";

export function TeamBar() {
  const { teamId, teams, switchTeam, addNewTeam, renameExistingTeam, deleteExistingTeam } = useTeam();
  const [showManage, setShowManage] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  return (
    <>
      <div className="lg:hidden bg-[#121212] border-b border-[#1e1e1e] px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-500">球队</span>
          <div className="relative">
            <select
              value={teamId}
              onChange={(e) => switchTeam(e.target.value)}
              className="bg-transparent text-white text-xs font-medium appearance-none pr-4 cursor-pointer focus:outline-none"
            >
              {teams.map(t => (
                <option key={t.id} value={t.id} className="bg-[#1e1e1e]">{t.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
          </div>
        </div>
        <button
          onClick={() => setShowManage(true)}
          className="text-[9px] text-gray-500 hover:text-gray-300 transition"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>

      {/* Management modal */}
      {showManage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowManage(false)}>
          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4 w-full max-w-xs space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white">管理球队</h3>
              <button onClick={() => setShowManage(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { addNewTeam(newName.trim()); setNewName(''); }}}
                placeholder="新球队名称"
                className="flex-1 bg-[#121212] border border-[#333] rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600"
              />
              <button
                onClick={() => { if (newName.trim()) { addNewTeam(newName.trim()); setNewName(''); }}}
                disabled={!newName.trim()}
                className="px-3 py-1 bg-[#992828] text-white rounded text-xs font-bold disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto">
              {teams.map(t => (
                <div key={t.id} className="flex items-center gap-2 bg-[#121212] rounded px-2.5 py-1.5 border border-[#222]">
                  {renameId === t.id ? (
                    <>
                      <input
                        value={renameName}
                        onChange={e => setRenameName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { renameExistingTeam(t.id, renameName); setRenameId(null); } if (e.key === 'Escape') setRenameId(null); }}
                        className="flex-1 bg-[#1e1e1e] border border-[#333] rounded px-1.5 py-0.5 text-[10px] text-gray-300"
                        autoFocus
                      />
                      <button onClick={() => { renameExistingTeam(t.id, renameName); setRenameId(null); }} className="text-[10px] text-green-400">保存</button>
                      <button onClick={() => setRenameId(null)} className="text-[10px] text-gray-500">取消</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-[10px] text-gray-300 truncate">{t.name}</span>
                      {t.id === teamId && <span className="text-[8px] text-[#992828] px-1">当前</span>}
                      <button onClick={() => { setRenameId(t.id); setRenameName(t.name); }} className="text-[9px] text-gray-500 hover:text-gray-300">改名</button>
                      <button
                        onClick={() => deleteExistingTeam(t.id)}
                        disabled={teams.length <= 1}
                        className="text-[9px] text-red-500/60 hover:text-red-400 disabled:opacity-30"
                      >删除</button>
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
