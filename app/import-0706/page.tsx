"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/supabase-client";

const DATE = "2026-07-06";

// 7/6 赛后恢复日 — 两组：恢复组(30min RPE2) + 主教练组(45min RPE5)
const RECOVERY_GROUP = ["张海轩","王捷","凌中阳","艾沙江-库尔班","帕尔曼江-克尤木","巫林峰","张辉","陈祥煜","王皓文","张俊哲","张天龙"];
const TRAIN_GROUP = ["杨卓燠","王款","栾家铭","李金羽","王宇扬","陈少豪","杨文杰","丁云峰","栾昊","杨翼璇","林楷轩","高云鹏","阿西江-白山","戚博","布格拉汗-斯坎旦尔","谢锦政","朱云天","何麟立"];

const ALL_PLAYERS = [
  ...RECOVERY_GROUP.map(name => ({ name, rpe: 2, duration: 30, type: "恢复", note: "体能教练带领·赛后恢复" })),
  ...TRAIN_GROUP.map(name => ({ name, rpe: 5, duration: 45, type: "训练", note: "主教练带领·常规训练" })),
];

const POS_MAP: Record<string,string> = {
  "张海轩":"门将","杨卓燠":"门将","王款":"门将","栾家铭":"门将",
  "李金羽":"后卫","王宇扬":"后卫","陈少豪":"后卫","杨文杰":"后卫","丁云峰":"后卫","王捷":"后卫","凌中阳":"后卫","王皓文":"后卫","张俊哲":"后卫","张天龙":"后卫",
  "栾昊":"中场","杨翼璇":"中场","林楷轩":"中场","高云鹏":"中场","巫林峰":"中场","张辉":"中场","布格拉汗-斯坎旦尔":"中场","谢锦政":"中场","朱云天":"中场","何麟立":"中场",
  "艾沙江-库尔班":"前锋","帕尔曼江-克尤木":"前锋","阿西江-白山":"前锋","戚博":"前锋","陈祥煜":"前锋",
};

function getActiveTeamId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("kenshin_active_team_id") || "";
}

export default function Import0706() {
  const [status, setStatus] = useState<"idle" | "writing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const autoRan = useRef(false);

  const doImport = async () => {
    setStatus("writing");
    setMessage("正在写入...");
    const now = new Date().toISOString();
    const teamId = getActiveTeamId();
    const logs: string[] = [];

    // ═══ 1. kenshin_daily_training_log ═══
    const recoveryEntry = {
      date: DATE, trainType: "recovery", timeSlot: "", duration: 30, weather: "", savedAt: now,
      players: RECOVERY_GROUP.map(n => ({ name: n, trimp: Math.round(30 * 1.0 / RECOVERY_GROUP.length) })),
      slot: Date.now().toString() + "_r", note: "赛后恢复组 | 体能教练带领 | 30min慢跑+拉伸+冰敷",
    };
    const trainEntry = {
      date: DATE, trainType: "pitch", timeSlot: "", duration: 45, weather: "", savedAt: now,
      players: TRAIN_GROUP.map(n => ({ name: n, trimp: Math.round(45 * 2.5 / TRAIN_GROUP.length) })),
      slot: Date.now().toString() + "_t", note: "主教练组 | 常规训练 | 45min",
    };

    const logKey = "kenshin_daily_training_log";
    let existingLogs: any[] = [];
    try { const r = localStorage.getItem(logKey); existingLogs = r ? JSON.parse(r) : []; } catch {}
    existingLogs = existingLogs.filter((l: any) => l.date !== DATE || !l.slot?.endsWith("_r"));
    existingLogs = existingLogs.filter((l: any) => l.date !== DATE || !l.slot?.endsWith("_t"));
    existingLogs.unshift(recoveryEntry);
    existingLogs.unshift(trainEntry);
    localStorage.setItem(logKey, JSON.stringify(existingLogs.slice(0, 200)));
    if (teamId) localStorage.setItem(`kenshin_daily_training_log_${teamId}`, JSON.stringify(existingLogs.slice(0, 200)));
    logs.push("✅ 负荷管理 → 29人（恢复组11 + 训练组18）");

    // ═══ 2. kenshin_load_data ═══
    const loadKey = "kenshin_load_data";
    let loadData: Record<string, any[]> = {};
    try { const r = localStorage.getItem(loadKey); loadData = r ? JSON.parse(r) : {}; } catch {}
    ALL_PLAYERS.forEach(p => {
      if (!loadData[p.name]) loadData[p.name] = [];
      const ei = loadData[p.name].findIndex((e: any) => e.date === DATE);
      const entry = { date: DATE, sRPE: p.rpe, duration: p.duration };
      if (ei >= 0) loadData[p.name][ei] = entry; else loadData[p.name].push(entry);
      loadData[p.name].sort((a: any, b: any) => b.date.localeCompare(a.date));
    });
    localStorage.setItem(loadKey, JSON.stringify(loadData));
    if (teamId) localStorage.setItem(`kenshin_load_data_${teamId}`, JSON.stringify(loadData));
    logs.push("✅ 个人ACWR → 29人");

    // ═══ 3. kenshin_daily_monitoring ═══
    const monKey = "kenshin_daily_monitoring";
    let monData: any[] = [];
    try { const r = localStorage.getItem(monKey); monData = r ? JSON.parse(r) : []; } catch {}
    monData = monData.filter((e: any) => e.date !== DATE);
    ALL_PLAYERS.forEach(p => {
      monData.push({
        id: `${DATE}_${p.name}`,
        date: DATE, player: p.name, position: POS_MAP[p.name] || "",
        sleep: 0, fatigue: 0, soreness: 0, stress: 0, mood: 0,
        sessionType: p.type, rpe: p.rpe, duration: p.duration,
        cmj: 0, recovery: p.type === "恢复" ? "赛后恢复" : "", notes: p.note, createdAt: now,
      });
    });
    localStorage.setItem(monKey, JSON.stringify(monData));
    logs.push("✅ 球员状态 → 29人");

    // ═══ 4. 触发 ═══
    window.dispatchEvent(new CustomEvent('training-log-updated'));

    // ═══ 5. Supabase 后台 ═══
    let supabaseOk = false;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && teamId) {
        const uid = session.user.id;
        await supabase.from("user_kv").upsert({ user_id: uid, key: logKey, value: JSON.stringify(existingLogs.slice(0, 200)), updated_at: now }, { onConflict: "user_id, key" });
        await supabase.from("user_kv").upsert({ user_id: uid, key: loadKey, value: JSON.stringify(loadData), updated_at: now }, { onConflict: "user_id, key" });
        await supabase.from("user_kv").upsert({ user_id: uid, key: monKey, value: JSON.stringify(monData), updated_at: now }, { onConflict: "user_id, key" });
        supabaseOk = true;
      }
    } catch {}
    logs.push(`☁️ Supabase: ${supabaseOk ? '已同步' : '未同步'}`);

    setStatus("done");
    setMessage(`✅ 7/6 写入完成！29人\n🏃 恢复组11人(30min RPE2) + 训练组18人(45min RPE5)\n\n` + logs.join("\n"));
  };

  // ?auto=1 → 打开页面自动写入
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
        <h1 className="text-white text-xl font-bold mb-2">📥 7/6 赛后恢复数据</h1>
        <p className="text-gray-400 text-sm mb-6">第15轮赛后恢复日 | 写入全部页面</p>
        <div className="bg-[#121212] rounded-lg p-4 mb-6 text-left text-sm text-gray-300 space-y-1">
          <div>📅 2026-07-06 赛后+1</div>
          <div>🔄 恢复组 11人 · 30min · RPE 2</div>
          <div>⚽ 训练组 18人 · 45min · RPE 5</div>
        </div>
        {status === "idle" && (
          <button onClick={doImport} className="w-full bg-[#992828] hover:bg-[#b33030] text-white font-medium py-3 px-6 rounded-lg transition">
            写入 7/6 数据
          </button>
        )}
        {status === "writing" && <div className="text-gray-400">⏳ {message}</div>}
        {(status === "done" || status === "error") && (
          <div className={`text-xs whitespace-pre-wrap text-left ${status === "done" ? "text-green-400" : "text-red-400"}`}>{message}</div>
        )}
      </div>
    </div>
  );
}
