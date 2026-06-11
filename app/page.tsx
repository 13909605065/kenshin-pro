"use client";

import CoachWorkbench from "@/components/CoachWorkbench";
import dynamic from "next/dynamic";

const DailyReadiness = dynamic(() => import("@/components/DailyReadiness").then(m => ({ default: m.DailyReadiness })), { ssr: false });
const ReportGenerator = dynamic(() => import("@/components/ReportGenerator").then(m => ({ default: m.ReportGenerator })), { ssr: false });
import { useState, useEffect, Component } from "react";


class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center p-8">
          <div className="glass-card p-6 max-w-lg w-full">
            <p className="text-[#992828] font-bold text-lg mb-2">渲染错误</p>
            <p className="text-sm text-gray-300 mb-1">{this.state.error.message}</p>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap overflow-auto max-h-64">
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Home() {
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      e.preventDefault();
      setClientError(`${e.message}\n${e.filename}:${e.lineno}`);
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-20 lg:pb-6">
        {clientError && (
          <div className="mb-6 p-4 bg-[#992828]/20 border border-[#992828] rounded-xl">
            <p className="text-[#992828] font-bold text-sm mb-1">客户端错误:</p>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">{clientError}</pre>
          </div>
        )}
        <ErrorBoundary>
          <CoachWorkbench />
          <div className="mt-6 flex items-start gap-4 flex-wrap lg:flex-nowrap border-t border-[#222] pt-6">
            <div className="max-w-md flex-1 min-w-64">
              <DailyReadiness onReadinessChange={(score) => {
                sessionStorage.setItem('kenshin_today_readiness', JSON.stringify({score, date: new Date().toISOString().slice(0,10)}));
                if (score < 55) sessionStorage.setItem('kenshin_readiness_warning', '1');
                else sessionStorage.removeItem('kenshin_readiness_warning');
              }} />
            </div>
            <div className="flex flex-col gap-2 ml-auto items-end">
              <ReportGenerator />
            </div>
          </div>
        </ErrorBoundary>
      </main>

    </div>
  );
}
