"use client";

import { useEffect, useState } from "react";
import type { TrainingModule } from "@/lib/types";
import { POSITION_LABELS, GOAL_LABELS, PHASE_LABELS } from "@/lib/constants";

function CoachShareView({ modules }: { modules: TrainingModule[] }) {
  const session = modules.find((m: any) => m.module === "session_plan") as any;
  if (!session) return <p className="text-gray-500 p-8">暂无教案数据</p>;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="bg-pitch-800 rounded-xl p-4 border border-pitch-600">
        <h1 className="text-white font-bold text-lg">{session.title}</h1>
        <p className="text-xs text-gray-400">{session.duration}分钟 · {session.player_count}人 · {session.equipment?.join("、")}</p>
      </div>
      {session.warmup?.length > 0 && (
        <div>
          <h2 className="text-neon-pink text-sm font-bold mb-2">🔥 热身 ({session.warmup.reduce((s: number, w: any) => s + w.duration, 0)}min)</h2>
          {session.warmup.map((w: any, i: number) => (
            <div key={i} className="bg-pitch-700/50 rounded p-3 mb-1"><span className="text-white text-sm">{w.name}</span><span className="text-xs text-gray-400 ml-2">{w.duration}min</span><p className="text-xs text-gray-500">{w.description}</p></div>
          ))}
        </div>
      )}
      {session.activities?.length > 0 && (
        <div>
          <h2 className="text-neon-pink text-sm font-bold mb-2">⚽ 主体训练</h2>
          {session.activities.map((act: any, i: number) => (
            <div key={i} className="bg-pitch-700/50 rounded p-3 mb-2 border-l-2 border-neon-pink">
              <div className="flex justify-between"><span className="text-white font-bold">{i + 1}. {act.name}</span><span className="text-xs text-neon-pink">{act.duration}min</span></div>
              <p className="text-xs text-gray-400">{act.area} · {act.groups}</p>
              <p className="text-xs text-gray-300 mt-1">{act.description}</p>
              {act.coaching_points?.length > 0 && <p className="text-[10px] text-gray-500 mt-1">要点：{act.coaching_points.join("；")}</p>}
            </div>
          ))}
        </div>
      )}
      {session.ssg && (
        <div>
          <h2 className="text-neon-pink text-sm font-bold mb-2">🏟️ {session.ssg.name}</h2>
          <div className="bg-pitch-700/50 rounded p-3"><p className="text-xs text-gray-300">{session.ssg.duration}min · {session.ssg.area} · {session.ssg.players}</p><p className="text-xs text-gray-400">{session.ssg.rules}</p></div>
        </div>
      )}
      {session.cooldown?.length > 0 && (
        <div>
          <h2 className="text-neon-pink text-sm font-bold mb-2">🧊 冷身 ({session.cooldown.reduce((s: number, c: any) => s + c.duration, 0)}min)</h2>
          {session.cooldown.map((c: any, i: number) => (
            <div key={i} className="bg-pitch-700/50 rounded p-3 mb-1"><span className="text-white text-sm">{c.name}</span><span className="text-xs text-gray-400 ml-2">{c.duration}min</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

function AthleteShareView({ modules, formData }: { modules: TrainingModule[]; formData: any }) {
  const posModule = modules.find((m: any) => m.module === "position_training") as any;
  if (!posModule) return <p className="text-gray-500 p-8">暂无训练数据</p>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="bg-pitch-800 rounded-xl p-4 border border-pitch-600">
        <h1 className="text-white font-bold text-lg">{(POSITION_LABELS as any)[formData.position] || ""} · {(GOAL_LABELS as any)[formData.goal] || ""} · {(PHASE_LABELS as any)[formData.phase] || ""}</h1>
        <p className="text-xs text-gray-400">{formData.name} · {formData.gender === "female" ? "♀" : "♂"} · {formData.age}岁 · {formData.height}cm · {formData.weight}kg</p>
      </div>
      {posModule.analysis && <div className="bg-neon-pink/5 border border-neon-pink/20 rounded-xl p-3"><p className="text-xs text-gray-300">{posModule.analysis}</p></div>}
      {posModule.warmup?.map((w: any, i: number) => (
        <div key={i} className="bg-pitch-700/50 rounded p-3"><span className="text-white text-sm">🔥 {w.name}</span><span className="text-xs text-gray-400 ml-2">{w.duration}min</span></div>
      ))}
      {(["upper_limb","lower_limb","core","ability"] as const).map(key => {
        const exs = posModule[key]; if (!exs?.length) return null;
        return <div key={key}><h2 className="text-neon-pink text-sm font-bold mb-1">{{upper_limb:"上肢",lower_limb:"下肢",core:"核心",ability:"专项"}[key]}</h2>
          {exs.map((ex: any, i: number) => (
            <div key={i} className="bg-pitch-700/50 rounded p-2 mb-1 flex justify-between"><span className="text-white text-sm">{ex.name}</span><span className="text-xs text-gray-400">{ex.sets}×{ex.reps} · 间歇{ex.rest}s · {ex.load||`RPE${ex.rpe}`}</span></div>
          ))}</div>;
      })}
      {posModule.cooldown?.map((c: any, i: number) => (
        <div key={i} className="bg-pitch-700/50 rounded p-3"><span className="text-white text-sm">🧊 {c.name}</span><span className="text-xs text-gray-400 ml-2">{c.duration}min</span></div>
      ))}
    </div>
  );
}

export default function SharePage() {
  const [data, setData] = useState<{ modules: TrainingModule[]; formData: any } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      // New API-based share (?id=xxx)
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get("id");
      if (shareId) {
        try {
          const res = await fetch(`/api/share/?id=${shareId}`);
          const json = await res.json();
          if (json.code === "ok" && json.data) {
            setData({ modules: json.data.modules, formData: json.data.formData });
            return;
          }
          setError(json.message || "方案不存在");
          return;
        } catch { setError("网络错误，请重试"); return; }
      }

      // Old hash-based share (backward compat)
      try {
        const hash = window.location.hash.slice(1);
        if (!hash) { setError("无效的分享链接"); return; }
        const decoded = JSON.parse(decodeURIComponent(atob(hash)));
        if (!decoded.m || !decoded.f) { setError("分享数据不完整"); return; }
        setData({ modules: decoded.m, formData: decoded.f });
      } catch { setError("链接解析失败，请检查链接是否完整"); }
    };
    load();
  }, []);

  if (error) return <div className="min-h-screen bg-pitch-900 flex items-center justify-center"><p className="text-gray-500">{error}</p></div>;
  if (!data) return <div className="min-h-screen bg-pitch-900 flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-neon-pink border-t-transparent animate-spin" /></div>;

  const isCoach = data.formData.role === "coach";
  return (
    <div className="min-h-screen bg-pitch-900">
      <div className="bg-pitch-800 border-b border-pitch-600 px-4 py-2 flex items-center">
        <span className="text-white text-sm font-bold">📋 训练方案分享</span>
        <span className="text-[10px] text-gray-500 ml-2">Kenshinpro · 只读</span>
      </div>
      {isCoach ? <CoachShareView modules={data.modules} /> : <AthleteShareView modules={data.modules} formData={data.formData} />}
      <div className="text-center py-6"><button onClick={() => window.print()} className="px-4 py-2 bg-neon-pink text-black font-bold rounded-lg text-sm">🖨️ 打印方案</button></div>
    </div>
  );
}
