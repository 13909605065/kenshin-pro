"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/supabase-client";

export default function SyncPage() {
  const [status, setStatus] = useState<string>("加载中…");
  const [localKeys, setLocalKeys] = useState<string[]>([]);
  const [cloudKeys, setCloudKeys] = useState<string[]>([]);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setStatus("检查中…");
    try {
      // Check auth
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("❌ 未登录，请先登录"); return; }
      setUserId(user.id.slice(0, 8) + "...");

      // List ALL localStorage keys with their values
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !k.startsWith("sb-") && !k.startsWith("supabase") && k !== "kenshin_sync_last") {
          keys.push(k);
        }
      }
      setLocalKeys(keys.sort());

      // List cloud keys
      const { data: cloud } = await supabase.from("user_kv").select("key").eq("user_id", user.id);
      setCloudKeys((cloud || []).map((r: any) => r.key).sort());

      setStatus(`✅ 已登录 | 本地 ${keys.length} 个键 | 云端 ${cloud?.length || 0} 个键`);
    } catch (e: any) {
      setStatus("❌ 错误: " + e.message);
    }
  }

  async function pushAll() {
    setStatus("正在推送到云端…");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("❌ 未登录"); return; }

      let pushed = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key.startsWith("sb-") || key.startsWith("supabase")) continue;
        const value = localStorage.getItem(key);
        if (!value) continue;

        const { error } = await supabase.from("user_kv").upsert({
          user_id: user.id,
          key,
          value,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id, key" });

        if (!error) pushed++;
        else console.warn("push failed:", key, error);
      }

      // Also push teams
      const teamsRaw = localStorage.getItem("kenshin_teams");
      if (teamsRaw) {
        const teams = JSON.parse(teamsRaw);
        for (const t of teams) {
          await supabase.from("teams").upsert({
            id: t.id, user_id: user.id, name: t.name, created_at: t.createdAt,
          }, { onConflict: "id" });
        }
      }

      // Push active team
      const activeId = localStorage.getItem("kenshin_active_team_id");
      if (activeId) {
        await supabase.from("user_prefs").upsert({
          user_id: user.id, active_team_id: activeId, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }

      // Push roster to roster_players table
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("roster_players_")) continue;
        try {
          const players = JSON.parse(localStorage.getItem(key) || "[]");
          for (const p of players) {
            await supabase.from("roster_players").upsert({
              id: p.id, user_id: user.id, name: p.name, position: p.position,
              number: p.number, age: p.age, height: p.height, weight: p.weight,
              injury_status: p.injuryStatus, injury_note: p.injuryNote,
              injury_history: p.injuryHistory || "",
              disabled_exercises: p.disabledExercises || [],
              notes: p.notes,
            }, { onConflict: "id" });
          }
        } catch {}
      }

      setStatus(`✅ 推送完成！推送了 ${pushed} 个键`);
      await checkStatus();
    } catch (e: any) {
      setStatus("❌ 推送失败: " + e.message);
    }
  }

  async function pullAll() {
    setStatus("正在从云端拉取…");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("❌ 未登录"); return; }

      // Pull all KV
      const { data: kvs } = await supabase.from("user_kv").select("key, value").eq("user_id", user.id);
      let pulled = 0;
      if (kvs) {
        for (const row of kvs) {
          if (row.key && row.value !== undefined) {
            localStorage.setItem(row.key, row.value);
            pulled++;
          }
        }
      }

      // Pull teams
      const { data: teams } = await supabase.from("teams").select("*").eq("user_id", user.id);
      if (teams && teams.length > 0) {
        localStorage.setItem("kenshin_teams", JSON.stringify(teams.map((t: any) => ({
          id: t.id, name: t.name, createdAt: t.created_at,
        }))));
      }

      // Pull active team
      const { data: prefs } = await supabase.from("user_prefs").select("active_team_id").eq("user_id", user.id).single();
      if (prefs?.active_team_id) {
        localStorage.setItem("kenshin_active_team_id", prefs.active_team_id);
      }

      // Pull roster
      const { data: players } = await supabase.from("roster_players").select("*").eq("user_id", user.id);
      if (players && players.length > 0) {
        // Group by team? For now just use active team ID
        const teamId = prefs?.active_team_id || localStorage.getItem("kenshin_active_team_id") || "default";
        const mapped = players.map((p: any) => ({
          id: p.id, name: p.name, position: p.position || "", number: p.number || "",
          age: p.age, height: p.height, weight: p.weight,
          injuryStatus: p.injury_status || "healthy", injuryNote: p.injury_note || "",
          injuryHistory: p.injury_history || "", disabledExercises: p.disabled_exercises || [],
          notes: p.notes || "",
        }));
        localStorage.setItem(`roster_players_${teamId}`, JSON.stringify(mapped));
      }

      setStatus(`✅ 拉取完成！拉取了 ${pulled} 个键`);
      await checkStatus();
    } catch (e: any) {
      setStatus("❌ 拉取失败: " + e.message);
    }
  }

  return (
    <div style={{ backgroundColor: "#0d0d0d", color: "#d1d1d1", minHeight: "100dvh", padding: 20, fontFamily: "monospace" }}>
      <h1 style={{ color: "#992828", fontSize: 18, marginBottom: 16 }}>🔄 数据同步控制台</h1>
      <p style={{ fontSize: 13, marginBottom: 8 }}>用户: {userId || "检测中…"}</p>
      <p style={{ fontSize: 13, marginBottom: 16, padding: 8, backgroundColor: "#1a1a1a", borderRadius: 6 }}>{status}</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={pushAll} style={{ padding: "12px 24px", backgroundColor: "#992828", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>
          📤 推送本机全部数据到云端
        </button>
        <button onClick={pullAll} style={{ padding: "12px 24px", backgroundColor: "#203E96", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>
          📥 从云端拉取全部数据
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 14, color: "#f97316", marginBottom: 8 }}>💻 本机 localStorage ({localKeys.length})</h2>
          <div style={{ backgroundColor: "#1a1a1a", padding: 10, borderRadius: 6, maxHeight: 400, overflow: "auto", fontSize: 11 }}>
            {localKeys.length === 0 ? <span style={{ color: "#666" }}>无数据</span> :
              localKeys.map(k => (
                <div key={k} style={{ padding: "2px 0", borderBottom: "1px solid #222" }}>
                  <span style={{ color: "#4ade80" }}>{k}</span>
                  <span style={{ color: "#666", marginLeft: 8 }}>
                    {localStorage.getItem(k)?.slice(0, 60)}…
                  </span>
                </div>
              ))
            }
          </div>
        </div>
        <div>
          <h2 style={{ fontSize: 14, color: "#3B82F6", marginBottom: 8 }}>☁️ 云端 Supabase ({cloudKeys.length})</h2>
          <div style={{ backgroundColor: "#1a1a1a", padding: 10, borderRadius: 6, maxHeight: 400, overflow: "auto", fontSize: 11 }}>
            {cloudKeys.length === 0 ? <span style={{ color: "#666" }}>无数据</span> :
              cloudKeys.map(k => (
                <div key={k} style={{ padding: "2px 0", borderBottom: "1px solid #222", color: "#60a5fa" }}>
                  {k}
                </div>
              ))
            }
          </div>
        </div>
      </div>

      <p style={{ marginTop: 20, fontSize: 11, color: "#555" }}>
        使用方法：在 Mac 上点「推送」→ 在 iPad 上打开此页面 → 点「拉取」→ 完成
      </p>
    </div>
  );
}
