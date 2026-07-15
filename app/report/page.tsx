"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Wifi, WifiOff, Send } from "lucide-react";

const SLEEP_LABELS = ["", "非常差", "较差", "一般", "较好", "非常好"];
const FEEL_LABELS = ["", "毫无", "轻微", "中等", "明显", "极度"];

interface ReportEntry {
  player_name: string;
  date: string;
  sleep: number;
  fatigue: number;
  soreness: number;
  stress: number;
  mood: number;
  rpe?: number;
  notes?: string;
}

export default function PlayerReportPage() {
  const [playerName, setPlayerName] = useState("");
  const [sleep, setSleep] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(3);
  const [mood, setMood] = useState(3);
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [savedName, setSavedName] = useState("");
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    window.addEventListener("online", () => setOnline(true));
    window.addEventListener("offline", () => setOnline(false));

    // Load roster from localStorage
    try {
      const raw = localStorage.getItem("kenshin_roster");
      if (raw) {
        const roster = JSON.parse(raw);
        const names = (roster.players || roster).map((p: any) => p.name || p.player_name || "").filter(Boolean).sort((a: string, b: string) => a.localeCompare(b, "zh"));
        setPlayerNames(names);
      }
    } catch {}

    // Load last used name
    const last = localStorage.getItem("kenshin_report_player");
    if (last) setSavedName(last);

    // Load queue count
    try {
      const q = JSON.parse(localStorage.getItem("kenshin_report_queue") || "[]");
      setQueueCount(q.length);
    } catch {}
  }, []);

  const handleSubmit = () => {
    if (!playerName.trim()) return;

    const entry: ReportEntry = {
      player_name: playerName.trim(),
      date: new Date().toISOString().slice(0, 10),
      sleep,
      fatigue,
      soreness,
      stress,
      mood,
      rpe: rpe ?? undefined,
      notes: notes.trim() || undefined,
    };

    // Save to localStorage queue
    try {
      const queue = JSON.parse(localStorage.getItem("kenshin_report_queue") || "[]");
      queue.push(entry);
      localStorage.setItem("kenshin_report_queue", JSON.stringify(queue));
      setQueueCount(queue.length);
    } catch {}

    // Save player name preference
    localStorage.setItem("kenshin_report_player", playerName.trim());
    setSavedName(playerName.trim());
    setSubmitted(true);

    // Try to sync immediately if online
    if (navigator.onLine) {
      fetch("/api/monitoring/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: [entry] }),
      }).catch(() => {});
    }
  };

  const reset = () => {
    setSubmitted(false);
    setSleep(3);
    setFatigue(3);
    setSoreness(3);
    setStress(3);
    setMood(3);
    setRpe(null);
    setNotes("");
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center px-6 pb-20">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-[#1a3a2a] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-[#2ea043]" />
          </div>
          <h2 className="text-xl font-bold mb-2">提交成功 🎉</h2>
          <p className="text-[#8b949e] text-sm mb-4">
            {playerName} 的今日状态已记录
          </p>
          {!online && (
            <div className="bg-[#3a2f1a]/30 border border-[#d29922]/30 rounded-lg p-3 mb-4 text-xs text-[#d29922]">
              <WifiOff size={14} className="inline mr-1" />
              当前离线，数据已保存本地，联网后自动同步
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={reset}
              className="px-6 py-2 bg-[#58a6ff] text-white rounded-lg text-sm font-medium"
            >
              继续填写
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white pb-20 px-4">
      <div className="max-w-sm mx-auto pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold">晨间状态</h1>
            <p className="text-[10px] text-[#8b949e]">{new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" })}</p>
          </div>
          <div className="flex items-center gap-2">
            {online ? (
              <Wifi size={14} className="text-[#2ea043]" />
            ) : (
              <WifiOff size={14} className="text-[#d29922]" />
            )}
            {queueCount > 0 && (
              <span className="text-[10px] bg-[#d29922] text-black px-1.5 py-0.5 rounded-full font-bold">{queueCount}</span>
            )}
          </div>
        </div>

        {/* Player name */}
        <div className="mb-5">
          <label className="text-xs text-[#8b949e] mb-1 block">球员</label>
          {playerNames.length > 0 ? (
            <select
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="w-full bg-[#1a1f2e] text-white border border-[#30363d] rounded-lg px-3 py-2.5 text-sm focus:border-[#58a6ff] outline-none"
            >
              <option value="">选择球员</option>
              {playerNames.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder={savedName || "输入姓名"}
              className="w-full bg-[#1a1f2e] text-white border border-[#30363d] rounded-lg px-3 py-2.5 text-sm focus:border-[#58a6ff] outline-none placeholder:text-[#484f58]"
            />
          )}
        </div>

        {/* Rating scales */}
        <div className="space-y-5">
          <RatingRow label="睡眠质量" value={sleep} onChange={setSleep} labels={SLEEP_LABELS} color="#58a6ff" />
          <RatingRow label="疲劳感" value={fatigue} onChange={setFatigue} labels={FEEL_LABELS} color="#d29922" />
          <RatingRow label="肌肉酸痛" value={soreness} onChange={setSoreness} labels={FEEL_LABELS} color="#992828" />
          <RatingRow label="压力水平" value={stress} onChange={setStress} labels={FEEL_LABELS} color="#8b949e" />
          <RatingRow label="情绪状态" value={mood} onChange={setMood} labels={FEEL_LABELS} color="#8b949e" />
        </div>

        {/* Yesterday's RPE */}
        <div className="mt-5">
          <label className="text-xs text-[#8b949e] mb-1 block">昨日训练RPE（可选）</label>
          <div className="flex gap-1">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                onClick={() => setRpe(rpe === i ? null : i)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                  rpe === i
                    ? i <= 2 ? "bg-[#2ea043] text-white" : i <= 5 ? "bg-[#58a6ff] text-white" : i <= 7 ? "bg-[#d29922] text-black" : "bg-[#992828] text-white"
                    : "bg-[#1a1f2e] border border-[#30363d] text-[#8b949e]"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-5">
          <label className="text-xs text-[#8b949e] mb-1 block">备注</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="伤病、不适等..."
            rows={2}
            className="w-full bg-[#1a1f2e] text-white border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:border-[#58a6ff] outline-none resize-none placeholder:text-[#484f58]"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!playerName.trim()}
          className="w-full mt-6 py-3 bg-[#2ea043] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send size={14} />
          提交
        </button>
      </div>
    </div>
  );
}

// ── Rating Row Component ──────────────────────────────

function RatingRow({
  label, value, onChange, labels, color,
}: {
  label: string; value: number; onChange: (v: number) => void; labels: string[]; color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#8b949e]">{label}</span>
        <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>
          {value} — {labels[value]}
        </span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-colors"
            style={value === i ? { backgroundColor: color, color: color === "#d29922" ? "#000" : "#fff" } : { backgroundColor: "#1a1f2e", border: "1px solid #30363d", color: "#8b949e" }}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}
