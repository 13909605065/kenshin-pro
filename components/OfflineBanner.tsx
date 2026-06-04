"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

/**
 * Shows a banner when the user is offline.
 * PWA notification for connectivity status.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    setOffline(!navigator.onLine);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-black text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 pt-safe">
      <WifiOff className="w-3 h-3" />
      当前处于离线状态 · 部分功能可能受限
    </div>
  );
}
