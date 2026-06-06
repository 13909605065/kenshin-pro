"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { getQueueLength } from "@/lib/sync-queue";

/**
 * Persistent offline indicator for the dashboard header area.
 * Shows a subtle banner when offline, with sync queue status.
 */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);
  const [queueLen, setQueueLen] = useState(0);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      // Check queue after a short delay to let sync process
      setTimeout(() => setQueueLen(getQueueLength()), 1500);
    };

    setOffline(!navigator.onLine);
    setQueueLen(getQueueLength());

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    // Poll queue length while offline (actions may be enqueued)
    const interval = setInterval(() => {
      if (!navigator.onLine) {
        setQueueLen(getQueueLength());
      }
    }, 3000);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      clearInterval(interval);
    };
  }, []);

  if (!offline && queueLen === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[101] bg-[#992828] text-white text-xs font-medium py-1.5 px-4 text-center flex items-center justify-center gap-2 pt-safe">
      {offline ? (
        <>
          <WifiOff className="w-3 h-3" />
          <span>离线模式</span>
          <span className="opacity-75">· 数据将在恢复网络后同步</span>
          {queueLen > 0 && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
              {queueLen} 项待同步
            </span>
          )}
        </>
      ) : (
        <>
          <Wifi className="w-3 h-3" />
          <span>同步中</span>
          <span className="opacity-75">· {queueLen} 项离线操作正在上传</span>
        </>
      )}
    </div>
  );
}
