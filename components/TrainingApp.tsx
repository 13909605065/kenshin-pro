"use client";

import { StepWizard } from "./StepWizard";
import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

function NetworkCheck() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="glass-card border-neon-gold/30 bg-neon-gold/5 p-4 flex items-center gap-3 mb-6">
      <WifiOff className="w-5 h-5 text-neon-gold flex-shrink-0" />
      <div>
        <p className="text-neon-gold font-medium text-sm">网络不佳</p>
        <p className="text-gray-400 text-xs">生成功能暂不可用，请检查网络后重试。已保存的内容仍可查看。</p>
      </div>
    </div>
  );
}

export function TrainingApp() {
  return (
    <>
      <NetworkCheck />
      <StepWizard />
    </>
  );
}
