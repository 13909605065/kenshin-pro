"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { getQueueLength } from "@/lib/sync-queue";

/**
 * Shows a banner when the user is offline.
 * Displays sync queue status and PWA connectivity notification.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [queueLen, setQueueLen] = useState(0);

  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      setQueueLen(getQueueLength());
    };
    const goOnline = () => {
      setOffline(false);
      // Re-check queue length after sync has a chance to process
      setTimeout(() => setQueueLen(getQueueLength()), 1500);
    };

    setOffline(!navigator.onLine);
    if (!navigator.onLine) setQueueLen(getQueueLength());

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    // Poll queue length while offline so badge stays current
    const interval = setInterval(() => {
      if (!navigator.onLine) setQueueLen(getQueueLength());
    }, 3000);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      clearInterval(interval);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-[#d92525] text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 pt-safe">
      <WifiOff className="w-3.5 h-3.5" />
      <span>离线模式</span>
      <span className="opacity-80 font-normal">· 数据将在恢复网络后同步</span>
      {queueLen > 0 && (
        <span className="bg-white/25 px-1.5 py-0.5 rounded text-[10px] font-bold">
          {queueLen}项
        </span>
      )}
    </div>
  );
}
