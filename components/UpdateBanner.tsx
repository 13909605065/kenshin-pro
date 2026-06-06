"use client";

import { useState, useEffect } from "react";

export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const sw = navigator.serviceWorker;

    sw.ready.then((reg) => {
      // Check if there is already a waiting worker
      if (reg.waiting) {
        setUpdateAvailable(true);
        setWaitingWorker(reg.waiting);
      }

      // Listen for new worker updates
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
            setWaitingWorker(newWorker);
          }
        });
      });
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 mx-auto w-fit bg-[#992828] text-white rounded-xl shadow-lg z-50 px-4 py-2 flex items-center gap-3">
      <span className="text-sm">🔄 有新版本可用</span>
      <button
        onClick={handleUpdate}
        className="text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition"
      >
        更新
      </button>
    </div>
  );
}
