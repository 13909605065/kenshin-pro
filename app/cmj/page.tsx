"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getCMJRecords, saveCMJRecords, deleteCMJRecord,
  calcCMJBaseline, type CMJRecord,
} from "@/lib/monitoring-client";

const WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export default function CMJPage() {
  const router = useRouter();
  const [records, setRecords] = useState<CMJRecord[]>([]);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");

  // Form state
  const today = new Date().toISOString().slice(0, 10);
  const [formDate, setFormDate] = useState(today);
  const [formPlayer, setFormPlayer] = useState("");
  const [jump1, setJump1] = useState("");
  const [jump2, setJump2] = useState("");
  const [jump3, setJump3] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCMJRecords();
      setRecords(data);
      const names = data.map(r => r.player_name).filter((n, i, arr) => arr.indexOf(n) === i);
      setPlayerNames(names);
    } catch (e) { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load roster for player suggestions
  const [rosterNames, setRosterNames] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("kenshin_roster_players");
      if (raw) setRosterNames(JSON.parse(raw).map((p: any) => p.name || p.姓名 || ""));
    } catch {}
  }, []);

  const allPlayerNames = [...rosterNames, ...playerNames].filter(Boolean).filter((n, i, arr) => arr.indexOf(n) === i).sort();

  const handleSubmit = async () => {
    if (!formPlayer || !jump1 || !jump2 || !jump3) {
      setMsg("请填写所有字段"); setTimeout(() => setMsg(""), 2000); return;
    }
    const j1 = parseFloat(jump1), j2 = parseFloat(jump2), j3 = parseFloat(jump3);
    if (isNaN(j1) || isNaN(j2) || isNaN(j3) || j1 <= 0 || j2 <= 0 || j3 <= 0) {
      setMsg("请输入有效的跳跃高度"); setTimeout(() => setMsg(""), 2000); return;
    }

    // Check if baseline needs calculation
    const playerRecords = records.filter(r => r.player_name === formPlayer);
    let baseline: number | null = null;
    if (playerRecords.length >= 2) {
      // This will be the 3rd+ test
      const combined = [...playerRecords, {
        player_name: formPlayer, test_date: formDate,
        jump_1_cm: j1, jump_2_cm: j2, jump_3_cm: j3,
      } as CMJRecord].sort((a, b) => a.test_date.localeCompare(b.test_date));
      baseline = calcCMJBaseline(combined);
    }

    try {
      await saveCMJRecords([{
        player_name: formPlayer,
        test_date: formDate,
        jump_1_cm: j1, jump_2_cm: j2, jump_3_cm: j3,
        baseline_cm: baseline,
      }]);
      setMsg(`✅ ${formPlayer} CMJ 已保存`); setTimeout(() => setMsg(""), 2000);
      setFormPlayer(""); setJump1(""); setJump2(""); setJump3("");
      setShowForm(false);
      loadData();
    } catch (e: any) {
      setMsg(`❌ ${e.message}`); setTimeout(() => setMsg(""), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await deleteCMJRecord(id);
    loadData();
  };

  const getBest = (r: CMJRecord) => Math.max(r.jump_1_cm, r.jump_2_cm, r.jump_3_cm);
  const getChange = (r: CMJRecord) => {
    if (!r.baseline_cm) return null;
    return Math.round((getBest(r) - r.baseline_cm) / r.baseline_cm * 1000) / 10;
  };

  // Group records by player for baseline view
  const playerBaselines: Record<string, { baseline: number | null; lastBest: number; lastDate: string; count: number }> = {};
  for (const name of allPlayerNames) {
    const pr = records.filter(r => r.player_name === name).sort((a, b) => a.test_date.localeCompare(b.test_date));
    if (pr.length > 0) {
      const last = pr[pr.length - 1];
      playerBaselines[name] = {
        baseline: pr.find(r => r.baseline_cm)?.baseline_cm || calcCMJBaseline(pr),
        lastBest: getBest(last),
        lastDate: last.test_date,
        count: pr.length,
      };
    }
  }

  return (
    <div className="min-h-screen bg-[#111] text-white pb-20">
      <header className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-4">
          <button onClick={() => router.push("/")} className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-bold text-sm">CMJ 反向跳</span>
          <span className="text-[10px] text-gray-500">每周一次 · MyJump 2 · 3跳取最佳</span>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-2 flex justify-end">
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#992828] hover:bg-[#7a1e1e] text-white font-bold transition">
          <Plus className="w-3.5 h-3.5" />
          记录
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
        {msg && (
          <div className={`mb-3 p-2 rounded text-xs ${msg.startsWith("✅") ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
            {msg}
          </div>
        )}

        {/* Entry form */}
        {showForm && (
          <div className="mb-4 bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">日期</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">球员</label>
                <select value={formPlayer} onChange={e => setFormPlayer(e.target.value)}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white">
                  <option value="">选择球员</option>
                  {allPlayerNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">跳1 (cm)</label>
                <input type="number" value={jump1} onChange={e => setJump1(e.target.value)} placeholder="例: 45.5"
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">跳2 (cm)</label>
                <input type="number" value={jump2} onChange={e => setJump2(e.target.value)} placeholder="例: 46.0"
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">跳3 (cm)</label>
                <input type="number" value={jump3} onChange={e => setJump3(e.target.value)} placeholder="例: 45.8"
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSubmit}
                className="px-4 py-2 bg-[#992828] hover:bg-[#7a1e1e] rounded-lg text-xs text-white font-bold transition">
                保存
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-[#222] hover:bg-[#333] rounded-lg text-xs text-gray-400 transition">
                取消
              </button>
            </div>
          </div>
        )}

        {/* Baseline overview */}
        {Object.keys(playerBaselines).length > 0 && (
          <div className="mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase mb-2">球员基线总览</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(playerBaselines).map(([name, info]) => {
                const change = info.baseline ? Math.round((info.lastBest - info.baseline) / info.baseline * 1000) / 10 : null;
                const warn = change !== null && change < -3;
                return (
                  <div key={name} className={`bg-[#1a1a1a] border rounded-lg p-3 ${warn ? "border-red-800" : "border-[#333]"}`}>
                    <div className="text-xs font-bold text-white truncate">{name}</div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      基线: {info.baseline ? `${info.baseline} cm` : `待定(${info.count}/3)`}
                    </div>
                    <div className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${warn ? "text-red-400" : "text-green-400"}`}>
                      {warn ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      最近: {info.lastBest} cm {change !== null && `(${change > 0 ? "+" : ""}${change}%)`}
                    </div>
                    {warn && <div className="text-[9px] text-red-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 下降超3%</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* History */}
        <h2 className="text-xs font-bold text-gray-500 uppercase mb-2">测试历史</h2>
        {loading ? (
          <p className="text-xs text-gray-600">加载中...</p>
        ) : records.length === 0 ? (
          <p className="text-xs text-gray-600">尚无 CMJ 数据。恢复周（7/12-7/18）开始首次测试。</p>
        ) : (
          <div className="space-y-1">
            {records.slice(0, 50).map(r => {
              const best = getBest(r);
              const change = getChange(r);
              const dateStr = r.test_date;
              const dayName = WEEKDAY[new Date(r.test_date + "T00:00:00").getDay()];
              return (
                <div key={r.id} className="flex items-center gap-3 bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5">
                  <div className="text-xs text-gray-400 w-20">{dateStr}<br /><span className="text-[10px]">{dayName}</span></div>
                  <div className="text-xs font-bold text-white flex-1">{r.player_name}</div>
                  <div className="text-xs text-gray-500">{r.jump_1_cm} / {r.jump_2_cm} / {r.jump_3_cm}</div>
                  <div className="text-xs font-bold text-[#992828] w-16 text-right">{best} cm</div>
                  <div className={`text-xs w-16 text-right ${change !== null ? (change > 0 ? "text-green-400" : change < -3 ? "text-red-400" : "text-gray-400") : "text-gray-600"}`}>
                    {change !== null ? `${change > 0 ? "+" : ""}${change}%` : "—"}
                  </div>
                  <button onClick={() => r.id && handleDelete(r.id)}
                    className="text-gray-700 hover:text-red-400 transition">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
