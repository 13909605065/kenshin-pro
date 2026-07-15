"use client";

import React from "react";
import type { DashboardACWR } from "@/lib/monitoring-client";

interface LoadMonitorProps {
  acwr: DashboardACWR[];
  loading: boolean;
}

function statusColor(s: string): string {
  if (s === "danger") return "bg-[#992828]";
  if (s === "warning") return "bg-[#d29922]";
  if (s === "safe") return "bg-[#2ea043]";
  return "bg-[#30363d]";
}

function statusLabel(s: string): string {
  if (s === "danger") return "高危";
  if (s === "warning") return "注意";
  if (s === "safe") return "安全";
  return "数据不足";
}

export default function LoadMonitor({ acwr, loading }: LoadMonitorProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-[#58a6ff] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (acwr.length === 0) {
    return (
      <div className="text-center py-20 text-[#8b949e] text-sm">
        暂无ACWR数据。需要至少7天训练数据。
      </div>
    );
  }

  const maxAcwr = Math.max(...acwr.map(a => a.acwr || 0), 2);

  return (
    <div className="space-y-3">
      {/* ACWR Bar Chart */}
      <div className="bg-[#1a1f2e] border border-[#30363d] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wide mb-4">
          ACWR 急慢性负荷比（7天滚动）
        </h3>

        <div className="space-y-2">
          {acwr.map((a, i) => {
            const barWidth = a.acwr ? Math.min((a.acwr / maxAcwr) * 100, 100) : 0;
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                {/* Player name */}
                <div className="w-20 text-right truncate text-[#e6edf3] font-medium">
                  {a.playerName}
                </div>

                {/* Bar */}
                <div className="flex-1 h-5 bg-[#0d1117] rounded relative overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded ${statusColor(a.status)} opacity-80`}
                    style={{ width: `${barWidth}%`, minWidth: a.acwr ? "4px" : "0" }}
                  />
                  {/* Danger zone line at 1.5 */}
                  <div className="absolute top-0 bottom-0 w-px bg-[#992828]/40" style={{ left: `${(1.5 / maxAcwr) * 100}%` }} />
                  {/* Warning zone line at 1.3 */}
                  <div className="absolute top-0 bottom-0 w-px bg-[#d29922]/40" style={{ left: `${(1.3 / maxAcwr) * 100}%` }} />
                </div>

                {/* ACWR value + status */}
                <div className="w-16 text-right font-mono font-bold">
                  <span className={a.acwr && a.acwr > 1.3 ? "text-[#d29922]" : a.acwr && a.acwr > 1.5 ? "text-[#992828]" : "text-[#2ea043]"}>
                    {a.acwr ?? "-"}
                  </span>
                </div>
                <div className={`w-14 text-center text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(a.status)} text-white`}>
                  {statusLabel(a.status)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-[10px] text-[#8b949e] justify-center">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#2ea043]" /> 安全 (0.8-1.3)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#d29922]" /> 注意 (1.3-1.5)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#992828]" /> 高危 (&gt;1.5)
          </span>
        </div>
      </div>

      {/* Acute Load Table */}
      <div className="bg-[#1a1f2e] border border-[#30363d] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wide mb-3">
          7天急性负荷
        </h3>
        <div className="space-y-1.5">
          {acwr
            .sort((a, b) => b.acuteTotal - a.acuteTotal)
            .slice(0, 10)
            .map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-[#e6edf3]">{a.playerName}</span>
                <span className="font-mono text-[#8b949e]">
                  急性 {a.acuteTotal} · 日均 {a.acuteDaily}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
