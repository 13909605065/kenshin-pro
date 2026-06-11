"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2, Moon, BatteryFull, Activity, Brain, Smile } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getHealthQuestionnaires, saveHealthQuestionnaires, deleteHealthQuestionnaire,
  calcHealthTotal, type HealthQuestionnaire,
} from "@/lib/monitoring-client";

const WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const SCORE_LABELS: { key: string; label: string; icon: any; labels: string[] }[] = [
  { key: "sleep", label: "睡眠质量", icon: Moon, labels: ["", "很差","较差","一般","较好","很好"] },
  { key: "fatigue", label: "疲劳感", icon: BatteryFull, labels: ["", "极累","较累","一般","轻微","精力好"] },
  { key: "soreness", label: "肌肉酸痛", icon: Activity, labels: ["", "剧痛","酸痛","轻微","几乎无","无"] },
  { key: "stress", label: "心理压力", icon: Brain, labels: ["", "极大","较大","一般","较低","无"] },
  { key: "mood", label: "情绪", icon: Smile, labels: ["", "很差","较差","一般","较好","很好"] },
];

export default function HealthPage() {
  const router = useRouter();
  const [records, setRecords] = useState<HealthQuestionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const [formDate, setFormDate] = useState(today);
  const [formPlayer, setFormPlayer] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({
    sleep: 3, fatigue: 3, soreness: 2, stress: 2, mood: 3,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHealthQuestionnaires();
      setRecords(data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const [rosterNames, setRosterNames] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("kenshin_roster_players");
      if (raw) setRosterNames(JSON.parse(raw).map((p: any) => p.name || p.姓名 || ""));
    } catch {}
  }, []);

  const allPlayerNames = rosterNames.filter(Boolean).filter((n, i, arr) => arr.indexOf(n) === i).sort();

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const isWarning = totalScore > 15;

  const handleSubmit = async () => {
    if (!formPlayer) {
      setMsg("请选择球员"); setTimeout(() => setMsg(""), 2000); return;
    }
    try {
      await saveHealthQuestionnaires([{
        player_name: formPlayer,
        record_date: formDate,
        sleep_score: scores.sleep,
        fatigue_score: scores.fatigue,
        soreness_score: scores.soreness,
        stress_score: scores.stress,
        mood_score: scores.mood,
      }]);
      setMsg(`✅ ${formPlayer} 问卷已保存`); setTimeout(() => setMsg(""), 2000);
      setFormPlayer(""); setScores({ sleep: 3, fatigue: 3, soreness: 2, stress: 2, mood: 3 });
      setShowForm(false);
      loadData();
    } catch (e: any) {
      setMsg(`❌ ${e.message}`); setTimeout(() => setMsg(""), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await deleteHealthQuestionnaire(id);
    loadData();
  };

  // Group records by date for daily overview
  const todayRecords = records.filter(r => r.record_date === today);
  const todayAvg = todayRecords.length > 0
    ? Math.round(todayRecords.reduce((s, r) => s + calcHealthTotal(r), 0) / todayRecords.length)
    : null;

  return (
    <div className="min-h-screen bg-[#111] text-white pb-20">
      <header className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-4">
          <button onClick={() => router.push("/")} className="p-1.5 text-gray-400 hover:text-white transition rounded-lg hover:bg-[#1e1e1e]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-bold text-sm">晨间健康问卷</span>
          <span className="text-[10px] text-gray-500">Hooper & Mackinnon (1995) · 五项五分制 · 总分&gt;15预警</span>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-2 flex justify-end">
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#992828] hover:bg-[#7a1e1e] text-white font-bold transition">
          <Plus className="w-3.5 h-3.5" />
          填写
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
        {msg && (
          <div className={`mb-3 p-2 rounded text-xs ${msg.startsWith("✅") ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
            {msg}
          </div>
        )}

        {/* Today's summary */}
        {todayRecords.length > 0 && (
          <div className={`mb-4 p-3 rounded-xl border ${todayAvg && todayAvg > 15 ? "bg-red-900/20 border-red-800" : "bg-green-900/20 border-green-800"}`}>
            <div className="flex items-center gap-2">
              {todayAvg && todayAvg > 15 ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <CheckCircle2 className="w-5 h-5 text-green-400" />}
              <div>
                <div className="text-sm font-bold text-white">今日问卷 ({today})</div>
                <div className="text-xs text-gray-400">
                  {todayRecords.length}人已填 · 全队均值: {todayAvg}分
                  {todayAvg && todayAvg > 15 && <span className="text-red-400 ml-2">⚠ 恢复不良预警</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Entry form */}
        {showForm && (
          <div className="mb-4 bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
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
            </div>

            {/* Score toggles */}
            <div className="space-y-2 mb-3">
              {SCORE_LABELS.map(({ key, label, icon: Icon, labels: lbls }) => (
                <div key={key} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-400 w-16">{label}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button key={v} onClick={() => setScores(s => ({ ...s, [key]: v }))}
                        className={`w-8 h-8 rounded text-xs font-bold transition ${
                          scores[key] === v
                            ? "bg-[#992828] text-white"
                            : "bg-[#111] border border-[#333] text-gray-500 hover:border-[#555]"
                        }`}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-600">{lbls[scores[key]]}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className={`flex items-center gap-2 mb-3 p-2 rounded-lg ${isWarning ? "bg-red-900/30" : "bg-[#111]"}`}>
              <span className="text-xs text-gray-500">总分:</span>
              <span className={`text-lg font-bold ${isWarning ? "text-red-400" : "text-white"}`}>{totalScore}</span>
              <span className="text-[10px] text-gray-600">/25</span>
              {isWarning && <AlertTriangle className="w-4 h-4 text-red-400 ml-1" />}
              {isWarning && <span className="text-xs text-red-400">⚠ 恢复不良预警 (&gt;15)</span>}
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

        {/* History */}
        <h2 className="text-xs font-bold text-gray-500 uppercase mb-2">问卷历史</h2>
        {loading ? (
          <p className="text-xs text-gray-600">加载中...</p>
        ) : records.length === 0 ? (
          <p className="text-xs text-gray-600">尚无问卷数据。到队当天开始采集。</p>
        ) : (
          <div className="space-y-1">
            {records.slice(0, 50).map(r => {
              const total = calcHealthTotal(r);
              const warn = total > 15;
              const dayName = WEEKDAY[new Date(r.record_date + "T00:00:00").getDay()];
              return (
                <div key={r.id} className={`flex items-center gap-3 rounded-lg px-4 py-2.5 border ${warn ? "bg-red-900/10 border-red-800" : "bg-[#1a1a1a] border-[#333]"}`}>
                  <div className="text-xs text-gray-400 w-20">{r.record_date}<br /><span className="text-[10px]">{dayName}</span></div>
                  <div className="text-xs font-bold text-white flex-1">{r.player_name}</div>
                  <div className="flex gap-1.5 text-[10px]">
                    <span className="text-gray-500">睡{r.sleep_score}</span>
                    <span className="text-gray-500">疲{r.fatigue_score}</span>
                    <span className="text-gray-500">酸{r.soreness_score}</span>
                    <span className="text-gray-500">压{r.stress_score}</span>
                    <span className="text-gray-500">绪{r.mood_score}</span>
                  </div>
                  <div className={`text-xs font-bold w-12 text-right ${warn ? "text-red-400" : "text-gray-400"}`}>
                    {total}/25
                    {warn && <AlertTriangle className="w-3 h-3 inline ml-1" />}
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
