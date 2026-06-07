"use client";

import { useState, useEffect } from "react";

// Build version — auto-generated from deploy timestamp, injected at build time
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_TIME || String(Date.now());

export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // ── Aggressive: unregister old SW, then register fresh ──
    async function forceCleanSW() {
      const lastBuild = localStorage.getItem("kenshin_build_id");
      if (lastBuild !== BUILD_ID) {
        // New build detected — nuke old SW first
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
          await reg.unregister();
        }
      }
      localStorage.setItem("kenshin_build_id", BUILD_ID);
    }

    forceCleanSW().then(() => {
      // Listen for new SW taking control → auto-reload
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });

      navigator.serviceWorker.ready.then((reg) => {
        // Poll for updates every 60s
        setInterval(() => { try { reg.update(); } catch {} }, 60000);

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      });
    });
  }, []);

  const handleUpdate = () => window.location.reload();

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
