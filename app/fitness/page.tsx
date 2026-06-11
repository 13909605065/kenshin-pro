"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, TrendingUp, TrendingDown, Minus, Trash2, Plus, Activity } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { BackHeader } from "@/components/BackHeader";
import { getPlayers, type PlayerRecord } from "@/lib/roster-utils";
import type { Position } from "@/lib/types";

// ── Test definitions ──

const TESTS = [
  { id: "yoyo_ir1", name: "YoYo IR1", unit: "m", elite: 2400, good: 2000, avg: 1600, low: 1200, desc: "20m折返跑，间歇恢复Level 1", higherIsBetter: true },
  { id: "yoyo_ir2", name: "YoYo IR2", unit: "m", elite: 1200, good: 960, avg: 720, low: 480, desc: "20m折返跑，间歇恢复Level 2", higherIsBetter: true },
  { id: "sprint_30m", name: "30m冲刺", unit: "s", elite: 3.9, good: 4.1, avg: 4.3, low: 4.5, desc: "光电计时，站立起跑", higherIsBetter: false },
  { id: "sprint_10m", name: "10m冲刺", unit: "s", elite: 1.7, good: 1.8, avg: 1.9, low: 2.0, desc: "光电计时，反应启动", higherIsBetter: false },
  { id: "cmj", name: "反向纵跳 CMJ", unit: "cm", elite: 55, good: 48, avg: 40, low: 35, desc: "双手叉腰，反向动作后全力跳", higherIsBetter: true },
  { id: "sj", name: "静蹲跳 SJ", unit: "cm", elite: 50, good: 42, avg: 35, low: 30, desc: "半蹲位静置2s后全力跳", higherIsBetter: true },
  { id: "arrowhead", name: "箭头敏捷", unit: "s", elite: 8.3, good: 8.7, avg: 9.1, low: 9.6, desc: "左右折返变向，测敏捷", higherIsBetter: false },
  { id: "beep_test", name: "Beep Test", unit: "level", elite: 14, good: 12.5, avg: 11, low: 9.5, desc: "20m多阶段折返跑", higherIsBetter: true },
  { id: "bench_press_1rm", name: "卧推 1RM", unit: "kg", elite: 110, good: 95, avg: 80, low: 65, desc: "最大重量，标准杠铃", higherIsBetter: true },
  { id: "squat_1rm", name: "深蹲 1RM", unit: "kg", elite: 160, good: 140, avg: 115, low: 95, desc: "最大重量，大腿平行地面", higherIsBetter: true },
  { id: "nordic_hold", name: "北欧弯举保持", unit: "s", elite: 45, good: 35, avg: 25, low: 15, desc: "跪姿前倾，保持时间", higherIsBetter: true },
];

const POS_LABELS: Record<string, string> = {
  goalkeeper: "门将", defender: "中后卫", wingback: "翼卫", midfielder: "中场", forward: "前锋",
};

interface TestResult {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  testId: string;
  testName: string;
  value: number;
  date: string;
  level: "elite" | "good" | "average" | "low";
}

const STORAGE_KEY = "kenshin_fitness_tests";

function loadResults(): TestResult[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveResults(results: TestResult[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(results)); } catch {}
}

// Supabase sync (best-effort, falls back to localStorage)
async function syncToSupabase(results: TestResult[]) {
  try {
    const { createClient } = await import("@/lib/supabase/supabase-client");
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) return;
    const rows = results.map(r => ({
      user_id: session.session.user.id, player_id: r.playerId, player_name: r.playerName,
      position: r.position, test_id: r.testId, test_name: r.testName,
      value: r.value, date: r.date, level: r.level, created_at: new Date().toISOString(),
    }));
    await supabase.from("fitness_tests").upsert(rows, { onConflict: 'id' });
  } catch {}
}

function classify(value: number, test: typeof TESTS[0]): "elite" | "good" | "average" | "low" {
  if (test.higherIsBetter) {
    if (value >= test.elite) return "elite";
    if (value >= test.good) return "good";
    if (value >= test.avg) return "average";
    return "low";
  }
  if (value <= test.elite) return "elite";
  if (value <= test.good) return "good";
  if (value <= test.avg) return "average";
  return "low";
}

const LEVEL_STYLE: Record<string, string> = {
  elite: "bg-green-500/20 text-green-400 border-green-500/30",
  good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  average: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-[#992828]/20 text-[#992828] border-[#992828]/30",
};

const LEVEL_SCORE: Record<string, number> = { elite: 4, good: 3, average: 2, low: 1 };

export default function FitnessPage() {
  const router = useRouter();
  const [results, setResults] = useState<TestResult[]>(loadResults);
  const [players] = useState<PlayerRecord[]>(() => getPlayers());
  const [selectedTest, setSelectedTest] = useState(TESTS[0].id);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [view, setView] = useState<"table" | "input" | "trends">("table");
  const [importMsg, setImportMsg] = useState("");

  const activeTest = TESTS.find(t => t.id === selectedTest)!;

  const addResult = () => {
    if (!selectedPlayer || !value) return;
    const player = players.find(p => p.id === selectedPlayer);
    if (!player) return;
    const r: TestResult = {
      id: `ft_${Date.now()}`, playerId: player.id, playerName: player.name, position: player.position,
      testId: activeTest.id, testName: activeTest.name, value: parseFloat(value), date,
      level: classify(parseFloat(value), activeTest),
    };
    const updated = [r, ...results]; setResults(updated); saveResults(updated);
    setValue(""); setSelectedPlayer("");
  };

  const deleteResult = (id: string) => {
    const updated = results.filter(r => r.id !== id); setResults(updated); saveResults(updated);
  };

  const latestByPlayer = useMemo(() => {
    const map: Record<string, Record<string, TestResult>> = {};
    for (const r of results) {
      if (!map[r.playerId]) map[r.playerId] = {};
      const ex = map[r.playerId][r.testId];
      if (!ex || r.date > ex.date) map[r.playerId][r.testId] = r;
    }
    return map;
  }, [results]);

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = (ev.target?.result as string).trim().split("\n");
        if (lines.length < 2) { setImportMsg("需要标题行+数据行"); return; }
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const ni = headers.findIndex(h => h.includes("name")||h.includes("球员")||h.includes("姓名"));
        const ti = headers.findIndex(h => h.includes("test")||h.includes("测试"));
        const vi = headers.findIndex(h => h.includes("value")||h.includes("成绩")||h.includes("result")||h.includes("值"));
        const di = headers.findIndex(h => h.includes("date")||h.includes("日期"));
        if (ni < 0 || vi < 0) { setImportMsg("CSV需球员名+成绩列"); return; }
        const imported: TestResult[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim());
          const name = cols[ni]; const val = parseFloat(cols[vi]);
          if (!name || isNaN(val)) continue;
          const tName = ti >= 0 ? cols[ti] : activeTest.name;
          const test = TESTS.find(t => t.name === tName || t.id === tName); if (!test) continue;
          const dStr = di >= 0 ? cols[di] : new Date().toISOString().slice(0, 10);
          const player = players.find(p => p.name === name);
          imported.push({
            id: `csv_${Date.now()}_${i}`, playerId: player?.id||`csv_${name}`, playerName: name,
            position: player?.position||"midfielder", testId: test.id, testName: test.name,
            value: val, date: dStr, level: classify(val, test),
          });
        }
        if (imported.length > 0) {
          const updated = [...imported, ...results]; setResults(updated); saveResults(updated);
          setImportMsg(`导入 ${imported.length} 条`);
        } else setImportMsg("无有效数据");
      } catch { setImportMsg("解析失败"); }
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    const h = "球员,位置,测试项目,成绩,日期,等级";
    const rows = results.map(r => `${r.playerName},${POS_LABELS[r.position]||r.position},${r.testName},${r.value},${r.date},${r.level}`);
    const blob = new Blob([[h, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `体测_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div className="min-h-screen bg-[#121212] pb-20">
      <BackHeader title="体能测试追踪" subtitle="12项标准化测试 · 趋势追踪" backTo="/" />

      <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-0.5 w-fit mb-4">
        {(["table","input","trends"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view===v?"bg-[#992828] text-white":"text-gray-400 hover:text-white"}`}>
            {{table:"总览",input:"录入",trends:"趋势"}[v]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <label className="flex items-center gap-1 px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-[10px] text-gray-400 hover:text-white cursor-pointer transition">
          <Upload className="w-3 h-3" /> 导入 CSV
          <input type="file" accept=".csv" onChange={handleCSV} className="hidden" />
        </label>
        <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-[10px] text-gray-400 hover:text-white transition">
          <Download className="w-3 h-3" /> 导出 CSV
        </button>
        {importMsg && <span className="text-[10px] text-green-400">{importMsg}</span>}
      </div>

      {view === "input" && (
        <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4 space-y-3 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="text-[9px] text-gray-500 block mb-1">测试项目</label>
              <select value={selectedTest} onChange={e => setSelectedTest(e.target.value)} className="w-full bg-[#0d0d0d] border border-[#333] rounded px-2 py-1.5 text-xs text-white">
                {TESTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select></div>
            <div><label className="text-[9px] text-gray-500 block mb-1">球员</label>
              <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} className="w-full bg-[#0d0d0d] border border-[#333] rounded px-2 py-1.5 text-xs text-white">
                <option value="">选择球员</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div><label className="text-[9px] text-gray-500 block mb-1">成绩 ({activeTest.unit})</label>
              <input type="number" value={value} onChange={e => setValue(e.target.value)} step="any" className="w-full bg-[#0d0d0d] border border-[#333] rounded px-2 py-1.5 text-xs text-white" /></div>
            <div><label className="text-[9px] text-gray-500 block mb-1">日期</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#0d0d0d] border border-[#333] rounded px-2 py-1.5 text-xs text-white" /></div>
          </div>
          <div className="bg-[#0d0d0d] rounded-lg p-2 text-[10px] text-gray-500 flex items-center gap-2">
            <Activity className="w-3 h-3" />
            基准：精英≥{activeTest.elite}{activeTest.unit} / 良好≥{activeTest.good} / 平均≥{activeTest.avg} / 需提高&lt;{activeTest.avg}
          </div>
          <button onClick={addResult} disabled={!selectedPlayer||!value} className="flex items-center gap-1 px-4 py-2 bg-[#992828] hover:bg-[#7a1e1e] disabled:opacity-30 text-white rounded-lg text-xs font-bold transition"><Plus className="w-3 h-3"/>录入</button>
        </div>
      )}

      {view === "table" && (
        <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-[#222] bg-[#0d0d0d]">
                <th className="text-left p-3 text-gray-400 font-medium">球员</th>
                {TESTS.slice(0,6).map(t => <th key={t.id} className="text-center p-3 text-gray-400 font-medium whitespace-nowrap">{t.name}<br/><span className="text-[9px] text-gray-600">({t.unit})</span></th>)}
                <th className="text-center p-3 text-gray-400 font-medium">综合</th>
              </tr></thead>
              <tbody>
                {players.slice(0,20).map(player => {
                  const latest = latestByPlayer[player.id] || {};
                  const trs = TESTS.slice(0,6).map(t => latest[t.id]).filter(Boolean);
                  const avgScore = trs.length>0 ? trs.reduce((s,r) => s+LEVEL_SCORE[r.level],0)/trs.length : 0;
                  return <tr key={player.id} className="border-b border-[#222] hover:bg-[#0d0d0d]">
                    <td className="p-3"><p className="text-white font-medium">{player.name}</p><p className="text-[10px] text-gray-500">{POS_LABELS[player.position]||player.position}</p></td>
                    {TESTS.slice(0,6).map(t => { const r = latest[t.id]; return <td key={t.id} className="text-center p-3">{r ? <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${LEVEL_STYLE[r.level]}`}>{r.value}{t.unit}</span> : <span className="text-gray-600">—</span>}</td>; })}
                    <td className="text-center p-3">{trs.length>0 ? <span className={`text-sm font-bold ${avgScore>=3.5?'text-green-400':avgScore>=2.5?'text-blue-400':avgScore>=1.5?'text-yellow-400':'text-[#992828]'}`}>{avgScore>=3.5?'A':avgScore>=2.5?'B':avgScore>=1.5?'C':'D'}</span> : <span className="text-gray-600">—</span>}</td>
                  </tr>;
                })}
                {players.length===0 && <tr><td colSpan={8} className="p-6 text-center text-gray-500 text-xs">暂无球员，请先在花名册添加</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "trends" && (
        <div className="space-y-4">
          <select className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white" onChange={e => setSelectedPlayer(e.target.value)} value={selectedPlayer}>
            <option value="">全部球员</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {TESTS.map(test => {
            const hist = results.filter(r => r.testId===test.id && (!selectedPlayer||r.playerId===selectedPlayer)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
            if (hist.length===0) return null;
            const prev = hist.length>1 ? hist[1].value : hist[0].value;
            const trend = hist[0].value > prev ? "up" : hist[0].value < prev ? "down" : "flat";
            const tc = trend==="up" ? (test.higherIsBetter?"text-green-400":"text-[#992828]") : trend==="down" ? (test.higherIsBetter?"text-[#992828]":"text-green-400") : "text-gray-400";
            return <div key={test.id} className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-white">{test.name} ({test.unit})</h3>
                <div className="flex items-center gap-1">{trend==="up"?<TrendingUp className={`w-3 h-3 ${tc}`}/>:trend==="down"?<TrendingDown className={`w-3 h-3 ${tc}`}/>:<Minus className="w-3 h-3 text-gray-400"/>}<span className="text-[10px] text-gray-400">{hist.length}次</span></div>
              </div>
              {hist.map(r => <div key={r.id} className="flex items-center gap-3 text-[10px] py-1"><span className="text-gray-500 w-20">{r.date}</span><span className="text-white font-medium w-16 truncate">{r.playerName}</span><span className={`px-1.5 py-0.5 rounded border text-[9px] ${LEVEL_STYLE[r.level]}`}>{r.value}{test.unit}</span><button onClick={()=>deleteResult(r.id)} className="text-gray-600 hover:text-red-500"><Trash2 className="w-3 h-3"/></button></div>)}
            </div>;
          })}
        </div>
      )}

      <MobileNav />
    </div>
  );
}
