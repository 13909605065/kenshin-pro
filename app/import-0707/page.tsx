"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/supabase-client";

const DATE = "2026-07-07";
const DURATION = 60;
const NOTE = "MD-1 M2 赛前训练 | 动态拉伸6min→抢圈5min×2→5m冲刺×3→战术讲解14min→10v10 50m×50m 8min→角球战术17min | 主教练带领";

// 全员25人身心状态 + RPE（含无RPE的3人）
interface PlayerData { name: string; pos: string; sleep: number|null; fatigue: number; soreness: number|null; rpe: number|null; note: string; }
const ALL_PLAYERS: PlayerData[] = [
  // 门将
  { name:"张海轩", pos:"门将", sleep:3, fatigue:3, soreness:2, rpe:5, note:"无不适，状态正常" },
  { name:"杨卓燠", pos:"门将", sleep:3, fatigue:4, soreness:3, rpe:4, note:"无不适，状态正常" },
  { name:"王款",    pos:"门将", sleep:3, fatigue:4, soreness:3, rpe:2, note:"无不适，状态正常" },
  // 后卫
  { name:"张俊哲", pos:"后卫", sleep:3, fatigue:3, soreness:3, rpe:6, note:"仅有轻微肌肉酸胀" },
  { name:"张天龙", pos:"后卫", sleep:3, fatigue:3, soreness:3, rpe:5, note:"无不适，状态正常" },
  { name:"凌中阳", pos:"后卫", sleep:3, fatigue:3, soreness:3, rpe:6, note:"肌肉存在轻微酸痛" },
  { name:"陈少豪", pos:"后卫", sleep:3, fatigue:2, soreness:2, rpe:3, note:"无不适，状态正常" },
  { name:"李金羽", pos:"后卫", sleep:3, fatigue:3, soreness:5, rpe:3, note:"⚠️ 腰部存在疼痛感" },
  { name:"王捷",    pos:"后卫", sleep:3, fatigue:4, soreness:3, rpe:6, note:"⚠️ 左膝盖存在疼痛感" },
  { name:"王皓文", pos:"后卫", sleep:4, fatigue:4, soreness:4, rpe:6, note:"小腿略有酸痛" },
  { name:"丁云峰", pos:"后卫", sleep:4, fatigue:2, soreness:2, rpe:3, note:"无不适，状态正常" },
  // 中场
  { name:"何麟立", pos:"中场", sleep:4, fatigue:2, soreness:2, rpe:4, note:"无不适，状态正常" },
  { name:"布格拉汗-斯坎旦尔", pos:"中场", sleep:null, fatigue:3, soreness:null, rpe:null, note:"⚠️ 内侧副韧带撕裂(MCL) 伤停" },
  { name:"巫林峰", pos:"中场", sleep:2, fatigue:3, soreness:3, rpe:6, note:"无不适，状态正常 | ⚠️睡眠差" },
  { name:"张辉",    pos:"中场", sleep:4, fatigue:3, soreness:3, rpe:6, note:"无不适，状态正常" },
  { name:"谢锦政", pos:"中场", sleep:3, fatigue:3, soreness:3, rpe:3, note:"无不适，状态正常" },
  { name:"栾昊",    pos:"中场", sleep:4, fatigue:2, soreness:1, rpe:2, note:"无不适，状态正常" },
  { name:"杨翼璇", pos:"中场", sleep:3, fatigue:2, soreness:1, rpe:3, note:"无不适，状态正常" },
  { name:"朱云天",  pos:"中场", sleep:4, fatigue:2, soreness:3, rpe:null, note:"RPE未填写" },
  { name:"林楷轩",  pos:"中场", sleep:4, fatigue:2, soreness:3, rpe:null, note:"RPE未填写" },
  // 前锋
  { name:"陈祥煜", pos:"前锋", sleep:4, fatigue:4, soreness:4, rpe:2, note:"无伤病、无不适" },
  { name:"艾沙江-库尔班",   pos:"前锋", sleep:3, fatigue:3, soreness:1, rpe:6, note:"无不适，状态正常" },
  { name:"帕尔曼江-克尤木", pos:"前锋", sleep:3, fatigue:3, soreness:3, rpe:6, note:"无不适，状态正常" },
  { name:"阿西江-白山",     pos:"前锋", sleep:4, fatigue:4, soreness:3, rpe:3, note:"无不适，状态正常" },
  { name:"戚博",    pos:"前锋", sleep:4, fatigue:2, soreness:1, rpe:2, note:"无不适，状态正常" },
];

const RPE_PLAYERS = ALL_PLAYERS.filter(p => p.rpe !== null);

function getActiveTeamId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("kenshin_active_team_id") || "";
}

export default function ImportTrainingData() {
  const [status, setStatus] = useState<"idle" | "writing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const doImport = async () => {
    setStatus("writing");
    setMessage("正在写入 5 个数据存储...");

    const now = new Date().toISOString();
    const teamId = getActiveTeamId();
    const logs: string[] = [];

    // ═══════════════════════════════════
    // 1. kenshin_daily_training_log → /load 负荷管理
    // ═══════════════════════════════════
    const perPlayerTRIMP = Math.round((DURATION * 2.5) / RPE_PLAYERS.length);
    const logEntry = {
      date: DATE, trainType: "pitch", timeSlot: "16:30-17:30", duration: DURATION,
      weather: "", savedAt: now,
      players: RPE_PLAYERS.map(p => ({ name: p.name, trimp: perPlayerTRIMP })),
      slot: Date.now().toString(), note: NOTE,
    };

    const logKey = "kenshin_daily_training_log";
    let existingLogs: any[] = [];
    try { const r = localStorage.getItem(logKey); existingLogs = r ? JSON.parse(r) : []; } catch {}
    const li = existingLogs.findIndex((l: any) => l.date === DATE);
    if (li >= 0) existingLogs[li] = logEntry; else existingLogs.unshift(logEntry);
    localStorage.setItem(logKey, JSON.stringify(existingLogs.slice(0, 200)));
    if (teamId) localStorage.setItem(`kenshin_daily_training_log_${teamId}`, JSON.stringify(existingLogs.slice(0, 200)));
    logs.push("✅ 负荷管理 → kenshin_daily_training_log");

    // ═══════════════════════════════════
    // 2. kenshin_load_data → /load 个人ACWR
    // ═══════════════════════════════════
    const loadKey = "kenshin_load_data";
    let loadData: Record<string, any[]> = {};
    try { const r = localStorage.getItem(loadKey); loadData = r ? JSON.parse(r) : {}; } catch {}
    RPE_PLAYERS.forEach(p => {
      if (!loadData[p.name]) loadData[p.name] = [];
      const ei = loadData[p.name].findIndex((e: any) => e.date === DATE);
      const entry = { date: DATE, sRPE: p.rpe, duration: DURATION };
      if (ei >= 0) loadData[p.name][ei] = entry; else loadData[p.name].push(entry);
      loadData[p.name].sort((a: any, b: any) => b.date.localeCompare(a.date));
    });
    localStorage.setItem(loadKey, JSON.stringify(loadData));
    if (teamId) localStorage.setItem(`kenshin_load_data_${teamId}`, JSON.stringify(loadData));
    logs.push("✅ 个人ACWR → kenshin_load_data");

    // ═══════════════════════════════════
    // 3. kenshin_daily_monitoring → /status 球员状态
    // ═══════════════════════════════════
    const monKey = "kenshin_daily_monitoring";
    let monData: any[] = [];
    try { const r = localStorage.getItem(monKey); monData = r ? JSON.parse(r) : []; } catch {}
    // 删除旧的7/7数据
    monData = monData.filter((e: any) => !(e.date === DATE));

    ALL_PLAYERS.forEach(p => {
      monData.push({
        id: `${DATE}_${p.name}_${Date.now()}`,
        date: DATE,
        player: p.name,
        position: p.pos,
        sleep: p.sleep ?? 0,
        fatigue: p.fatigue,
        soreness: p.soreness ?? 0,
        stress: 0,     // 未采集
        mood: 0,       // 未采集
        sessionType: p.rpe !== null ? "训练" : (p.note.includes("伤停") ? "" : ""),
        rpe: p.rpe ?? 0,
        duration: p.rpe !== null ? DURATION : 0,
        cmj: 0,        // MD-1 禁测
        recovery: "",
        notes: p.note,
        createdAt: now,
      });
    });
    localStorage.setItem(monKey, JSON.stringify(monData));
    logs.push("✅ 球员状态 → kenshin_daily_monitoring (25人)");

    // ═══════════════════════════════════
    // 4. 触发更新
    // ═══════════════════════════════════
    window.dispatchEvent(new CustomEvent('training-log-updated'));
    window.dispatchEvent(new StorageEvent('storage', { key: monKey, newValue: JSON.stringify(monData) }));

    // ═══════════════════════════════════
    // 5. 后台 Supabase 同步
    // ═══════════════════════════════════
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
    logs.push(`☁️ Supabase: ${supabaseOk ? '已同步' : '暂未同步（网络问题）'}`);

    // ═══════════════════════════════════
    // 统计
    // ═══════════════════════════════════
    const totalSRPE = RPE_PLAYERS.reduce((s, p) => s + (p.rpe||0) * DURATION, 0);
    const avgRPE = (RPE_PLAYERS.reduce((s, p) => s + (p.rpe||0), 0) / RPE_PLAYERS.length).toFixed(1);
    const avgSleep = (ALL_PLAYERS.filter(p => p.sleep !== null).reduce((s,p) => s + (p.sleep||0), 0) / ALL_PLAYERS.filter(p => p.sleep !== null).length).toFixed(1);
    const highFatigue = ALL_PLAYERS.filter(p => p.fatigue >= 4).length;
    const highSoreness = ALL_PLAYERS.filter(p => (p.soreness||0) >= 4).length;

    setStatus("done");
    setMessage(
      `✅ 数据闭环写入完成！\n\n` +
      `📊 训练: 22人 | 均RPE ${avgRPE} | 总sRPE ${totalSRPE}\n` +
      `😴 睡眠均分 ${avgSleep} | 😵 疲劳≥4: ${highFatigue}人 | 💪 酸痛≥4: ${highSoreness}人\n\n` +
      `📋 写入页面:\n` +
      `   负荷管理 /load → 每日快照\n` +
      `   球员状态 /status → 25人身心监测\n` +
      `   负荷管理 /load → 个人ACWR\n\n` +
      logs.join("\n")
    );
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 max-w-lg w-full text-center">
        <h1 className="text-white text-xl font-bold mb-2">📥 7/7 数据闭环导入</h1>
        <p className="text-gray-400 text-sm mb-6">
          一次性写入全部页面所需数据存储
        </p>

        <div className="bg-[#121212] rounded-lg p-4 mb-6 text-left text-sm text-gray-300 space-y-1">
          <div>📅 2026-07-07 16:30-17:30 | ⏱ 60min</div>
          <div>👥 全员25人（RPE 22人 + 伤停1人 + 未填2人）</div>
          <div>🏃 动态拉伸→抢圈→冲刺→战术→10v10→角球</div>
          <div className="border-t border-[#2a2a2a] mt-2 pt-2 text-[#888] text-xs">
            写入: kenshin_daily_training_log | kenshin_load_data | kenshin_daily_monitoring
          </div>
        </div>

        {status === "idle" && (
          <button onClick={doImport}
            className="w-full bg-[#992828] hover:bg-[#b33030] text-white font-medium py-3 px-6 rounded-lg transition">
            写入全部数据
          </button>
        )}

        {status === "writing" && (
          <div className="text-gray-400">⏳ {message}</div>
        )}

        {(status === "done" || status === "error") && (
          <div className={`text-xs whitespace-pre-wrap text-left ${status === "done" ? "text-green-400" : "text-red-400"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
