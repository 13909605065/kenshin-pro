"use client";

import { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

interface PlanSummary {
  id?: string;
  name?: string;
  date?: string;
  modules?: number;
}

export default function OfflinePage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kenshin_plans");
      if (raw) {
        const all: PlanSummary[] = JSON.parse(raw);
        const recent = all.slice(0, 5).map((p, i) => ({
          id: p.id || `offline-${i}`,
          name: p.name || "未命名方案",
          date: p.date ? new Date(p.date).toLocaleDateString("zh-CN") : "—",
          modules: Array.isArray(p.modules) ? (p.modules as unknown as any[]).length : (p.modules || 0),
        }));
        setPlans(recent);
      }
    } catch {}
    setLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-start pt-20 px-6">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-[#1e1e1e] border border-[#333] flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 text-[#d92525]" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white mb-2">当前离线</h1>
      <p className="text-gray-400 text-sm mb-10">请检查网络连接</p>

      {/* Offline plans */}
      <div className="w-full max-w-sm mb-10">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">离线可用方案</p>
        {loaded && plans.length === 0 && (
          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-5 text-center">
            <p className="text-gray-400 text-sm">暂无离线方案</p>
            <p className="text-gray-600 text-xs mt-1">生成方案后会自动保存到本地</p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4"
            >
              <p className="text-white font-bold text-sm">{plan.name}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-gray-400">{plan.date}</span>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-[#d92525]">{plan.modules} 个模块</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Retry button */}
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-8 py-4 bg-[#d92525] text-white font-bold rounded-xl text-sm active:scale-95 transition-transform"
      >
        <RefreshCw className="w-4 h-4" />
        重试连接
      </button>
    </div>
  );
}
