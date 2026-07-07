"use client";

import { useState, useEffect, useRef } from "react";

const ROSTER = [
  // GK (3)
  { name:"张海轩", pos:"门将", number:13, age:26, height:185, weight:78, status:"healthy" },
  { name:"杨卓燠", pos:"门将", number:31, age:24, height:183, weight:75, status:"healthy" },
  { name:"王款", pos:"门将", number:15, age:20, height:180, weight:72, status:"healthy" },
  // DEF (9) — 杨翼璇 MID→DEF
  { name:"王捷", pos:"后卫", number:4, age:20, height:178, weight:70, status:"healthy" },
  { name:"丁云峰", pos:"后卫", number:16, age:25, height:180, weight:73, status:"healthy" },
  { name:"凌中阳", pos:"后卫", number:30, age:27, height:182, weight:75, status:"healthy" },
  { name:"陈少豪", pos:"后卫", number:28, age:26, height:181, weight:74, status:"healthy" },
  { name:"李金羽", pos:"后卫", number:22, age:26, height:180, weight:73, status:"minor", notes:"腰部疼痛" },
  { name:"王皓文", pos:"后卫", number:24, age:20, height:178, weight:70, status:"healthy" },
  { name:"杨翼璇", pos:"后卫", number:23, age:25, height:175, weight:68, status:"healthy" },
  { name:"张俊哲", pos:"后卫", number:null, age:27, height:182, weight:75, status:"healthy" },
  { name:"张天龙", pos:"后卫", number:null, age:28, height:180, weight:73, status:"healthy" },
  // MID (9)
  { name:"何麟立", pos:"中场", number:55, age:26, height:175, weight:68, status:"healthy" },
  { name:"布格拉汗-斯坎旦尔", pos:"中场", number:10, age:25, height:172, weight:65, status:"out", notes:"MCL内侧副韧带撕裂" },
  { name:"巫林峰", pos:"中场", number:19, age:26, height:175, weight:67, status:"healthy" },
  { name:"张辉", pos:"中场", number:38, age:25, height:176, weight:69, status:"healthy" },
  { name:"谢锦政", pos:"中场", number:26, age:25, height:174, weight:66, status:"healthy" },
  { name:"栾昊", pos:"中场", number:8, age:20, height:173, weight:65, status:"healthy" },
  { name:"林楷轩", pos:"中场", number:27, age:20, height:172, weight:64, status:"healthy" },
  { name:"朱云天", pos:"中场", number:20, age:19, height:172, weight:65, status:"healthy" },
  { name:"高云鹏", pos:"中场", number:null, age:26, height:178, weight:70, status:"healthy" },
  // FWD (5)
  { name:"陈祥煜", pos:"前锋", number:33, age:25, height:178, weight:72, status:"healthy" },
  { name:"艾沙江-库尔班", pos:"前锋", number:7, age:26, height:173, weight:65, status:"healthy" },
  { name:"帕尔曼江-克尤木", pos:"前锋", number:9, age:25, height:172, weight:66, status:"healthy" },
  { name:"阿西江-白山", pos:"前锋", number:14, age:25, height:175, weight:67, status:"healthy" },
  { name:"戚博", pos:"前锋", number:36, age:20, height:175, weight:68, status:"healthy" },
];

export default function ImportRoster() {
  const [status, setStatus] = useState<"idle" | "writing" | "done">("idle");
  const [message, setMessage] = useState("");
  const autoRan = useRef(false);

  const doImport = () => {
    setStatus("writing");
    const players = ROSTER.map(p => ({
      name: p.name, position: p.pos, number: p.number,
      age: p.age, height: p.height, weight: p.weight,
      injuryStatus: p.status, injuryNotes: p.notes || "",
    }));

    // 写入花名册到 localStorage
    localStorage.setItem("kenshin_roster_players", JSON.stringify(players));

    // 同时写入 team-scoped（如果有多球队）
    const tid = localStorage.getItem("kenshin_active_team_id") || "";
    if (tid) localStorage.setItem("kenshin_roster_players_" + tid, JSON.stringify(players));

    window.dispatchEvent(new StorageEvent("storage", { key: "kenshin_roster_players", newValue: JSON.stringify(players) }));

    setStatus("done");
    setMessage(
      `✅ 花名册已写入！26人\n` +
      `GK:3 | DEF:9 | MID:9 | FWD:5\n` +
      `🏥 伤停: 布格拉汗(MCL) | 疼痛: 李金羽(腰)\n` +
      `💡 /health /cmj /status 页面现在都有球员列表了`
    );
  };

  useEffect(() => {
    if (autoRan.current) return;
    if (typeof window !== "undefined" && window.location.search.includes("auto=1")) {
      autoRan.current = true;
      setTimeout(() => doImport(), 300);
    }
  }, []); // eslint-disable-line

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 max-w-lg w-full text-center">
        <h1 className="text-white text-xl font-bold mb-2">📋 导入花名册</h1>
        <p className="text-gray-400 text-sm mb-6">26人 · 山西崇德荣海 2026赛季</p>
        <div className="bg-[#121212] rounded-lg p-4 mb-6 text-left text-sm text-gray-300 space-y-1">
          <div>🧤 GK 3人 | 🛡 DEF 9人 | ⚙ MID 9人 | ⚡ FWD 5人</div>
          <div>🔄 杨翼璇 MID→DEF | 🏥 布格拉汗 MCL伤停</div>
        </div>
        {status === "idle" && (
          <button onClick={doImport} className="w-full bg-[#992828] hover:bg-[#b33030] text-white font-medium py-3 px-6 rounded-lg transition">
            写入花名册
          </button>
        )}
        {status === "writing" && <div className="text-gray-400">⏳ 写入中...</div>}
        {status === "done" && <div className="text-xs whitespace-pre-wrap text-left text-green-400">{message}</div>}
      </div>
    </div>
  );
}
