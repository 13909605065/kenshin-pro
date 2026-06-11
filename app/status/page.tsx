"use client";

import { DailyReadiness } from "@/components/DailyReadiness";
import { MobileNav } from "@/components/MobileNav";

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-[#121212] pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        <DailyReadiness
          onReadinessChange={(score) => {
            sessionStorage.setItem(
              "kenshin_today_readiness",
              JSON.stringify({ score, date: new Date().toISOString().slice(0, 10) })
            );
            if (score < 55) sessionStorage.setItem("kenshin_readiness_warning", "1");
            else sessionStorage.removeItem("kenshin_readiness_warning");
          }}
        />
      </div>
      <MobileNav />
    </div>
  );
}
