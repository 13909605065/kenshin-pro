"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/supabase-client";

const DATE = "2026-07-07";
const DURATION = 60;
const NOTE = "MD-1 M2 赛前训练 | 动态拉伸6min→抢圈5min×2→5m冲刺×3→战术讲解14min→10v10 50m×50m 8min→角球战术17min | 主教练带领";

const PLAYERS = [
  { name: "张海轩", rpe: 5 }, { name: "杨卓燠", rpe: 4 }, { name: "王款", rpe: 2 },
  { name: "张俊哲", rpe: 6 }, { name: "张天龙", rpe: 5 }, { name: "凌中阳", rpe: 6 },
  { name: "陈少豪", rpe: 3 }, { name: "李金羽", rpe: 3 }, { name: "王捷", rpe: 6 },
  { name: "王皓文", rpe: 6 }, { name: "丁云峰", rpe: 3 },
  { name: "何麟立", rpe: 4 }, { name: "巫林峰", rpe: 6 }, { name: "张辉", rpe: 6 },
  { name: "谢锦政", rpe: 3 }, { name: "栾昊", rpe: 2 }, { name: "杨翼璇", rpe: 3 },
  { name: "陈祥煜", rpe: 2 }, { name: "艾沙江-库尔班", rpe: 6 },
  { name: "帕尔曼江-克尤木", rpe: 6 }, { name: "阿西江-白山", rpe: 3 }, { name: "戚博", rpe: 2 },
];

function getActiveTeamId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("kenshin_active_team_id") || "";
}

export default function ImportTrainingData() {
  const [status, setStatus] = useState<"idle" | "writing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const doImport = async () => {
    setStatus("writing");
    setMessage("正在写入...");

    const logKey = `kenshin_daily_training_log`;
    const loadKey = `kenshin_load_data`;
    const now = new Date().toISOString();
    const perPlayerTRIMP = Math.round((DURATION * 2.5) / PLAYERS.length);

    // 1. 先写 localStorage（秒级完成，不依赖网络）
    const logEntry = {
      date: DATE, trainType: "pitch", timeSlot: "16:30-17:30", duration: DURATION,
      weather: "", savedAt: now,
      players: PLAYERS.map(p => ({ name: p.name, trimp: perPlayerTRIMP })),
      slot: Date.now().toString(), note: NOTE,
    };

    let logs: any[] = [];
    try {
      const raw = localStorage.getItem(logKey);
      logs = raw ? JSON.parse(raw) : [];
    } catch { logs = []; }

    const idx = logs.findIndex((l: any) => l.date === DATE);
    if (idx >= 0) logs[idx] = logEntry;
    else logs.unshift(logEntry);
    localStorage.setItem(logKey, JSON.stringify(logs.slice(0, 200)));

    // 2. 写个人负荷数据到 localStorage
    let loadData: Record<string, any[]> = {};
    try {
      const raw = localStorage.getItem(loadKey);
      loadData = raw ? JSON.parse(raw) : {};
    } catch { loadData = {}; }

    PLAYERS.forEach(p => {
      if (!loadData[p.name]) loadData[p.name] = [];
      const ei = loadData[p.name].findIndex((e: any) => e.date === DATE);
      const entry = { date: DATE, sRPE: p.rpe, duration: DURATION };
      if (ei >= 0) loadData[p.name][ei] = entry;
      else loadData[p.name].push(entry);
      loadData[p.name].sort((a: any, b: any) => b.date.localeCompare(a.date));
    });
    localStorage.setItem(loadKey, JSON.stringify(loadData));
    // 同时写带队ID的key（teamGet/teamSet用），防止迁移后数据断连
    const teamId = getActiveTeamId();
    if (teamId) {
      localStorage.setItem(`kenshin_load_data_${teamId}`, JSON.stringify(loadData));
      localStorage.setItem(`kenshin_daily_training_log_${teamId}`, JSON.stringify(logs.slice(0, 200)));
    }

    // 3. 触发页面刷新
    window.dispatchEvent(new CustomEvent('training-log-updated'));

    const totalSRPE = PLAYERS.reduce((s, p) => s + p.rpe * DURATION, 0);
    const avgRPE = (PLAYERS.reduce((s, p) => s + p.rpe, 0) / PLAYERS.length).toFixed(1);

    // 4. 后台同步到 Supabase（不阻塞，失败不影响）
    let supabaseOk = false;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userId = session.user.id;
        const teamId = getActiveTeamId();

        if (userId && teamId) {
          // 同步训练日志
          await supabase.from("user_kv").upsert({
            user_id: userId, key: logKey,
            value: JSON.stringify(logs.slice(0, 200)), updated_at: now,
          }, { onConflict: "user_id, key" });

          // 同步负荷数据
          await supabase.from("user_kv").upsert({
            user_id: userId, key: loadKey,
            value: JSON.stringify(loadData), updated_at: now,
          }, { onConflict: "user_id, key" });

          supabaseOk = true;
        }
      }
    } catch { /* Supabase unreachable, localStorage is fine */ }

    setStatus("done");
    setMessage(
      `✅ 写入成功！22人 | 总sRPE=${totalSRPE} | 均RPE=${avgRPE}\n` +
      `📋 localStorage: 已写入\n` +
      `☁️ Supabase: ${supabaseOk ? '已同步' : '暂未同步（网络问题，不影响使用）'}\n` +
      `💡 去「负荷管理」下拉选 07-07 查看`
    );
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 max-w-md w-full text-center">
        <h1 className="text-white text-xl font-bold mb-2">📥 导入 7/7 训练数据</h1>
        <p className="text-gray-400 text-sm mb-6">
          将 MD-1 M2 训练数据写入 Supabase 并同步到本地
        </p>

        <div className="bg-[#121212] rounded-lg p-4 mb-6 text-left text-sm text-gray-300 space-y-1">
          <div>📅 2026-07-07 16:30-17:30</div>
          <div>⏱ 60min | 👥 22人 | 📏 均RPE 4.2</div>
          <div>🏃 动态拉伸→抢圈→冲刺→战术→10v10→角球</div>
        </div>

        {status === "idle" && (
          <button
            onClick={doImport}
            className="w-full bg-[#992828] hover:bg-[#b33030] text-white font-medium py-3 px-6 rounded-lg transition"
          >
            写入数据
          </button>
        )}

        {status === "writing" && (
          <div className="text-gray-400">⏳ 写入中...</div>
        )}

        {(status === "done" || status === "error") && (
          <div className={`text-sm whitespace-pre-wrap ${status === "done" ? "text-green-400" : "text-red-400"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
