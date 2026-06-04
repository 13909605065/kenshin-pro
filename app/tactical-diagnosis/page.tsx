"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { TacticalDiagnosis } from "@/lib/ai/tactical-diagnosis";
import { MobileNav } from "@/components/MobileNav";
import { writeDiagnosisContext } from "@/lib/tactics-bridge";
import { createClient } from "@/lib/supabase/supabase-client";

type Status = "idle" | "loading" | "done" | "error";

const FORMATION_OPTIONS = [
  { value: "4-3-3", label: "4-3-3 (四三三)" },
  { value: "4-4-2", label: "4-4-2 (四四二)" },
  { value: "4-2-3-1", label: "4-2-3-1 (四二三一)" },
  { value: "3-5-2", label: "3-5-2 (三五二)" },
  { value: "3-4-3", label: "3-4-3 (三四三)" },
  { value: "5-4-1", label: "5-4-1 (五四一)" },
  { value: "5-3-2", label: "5-3-2 (五三二)" },
  { value: "4-1-4-1", label: "4-1-4-1 (四一四一)" },
  { value: "4-3-2-1", label: "4-3-2-1 (四三二一)" },
  { value: "3-4-2-1", label: "3-4-2-1 (三四二一)" },
];

const MATCH_TYPES = ["联赛", "杯赛", "友谊赛"];
const VENUES = ["主场", "客场", "中立"];
const WEATHERS = ["晴", "阴", "小雨", "大雨", "高温", "寒冷", "大风"];

const EXAMPLES = [
  "对方10号球员频繁回撤到中场接球，我方中卫不敢跟出去，导致中场失控",
  "边路被对方边锋完全压制，我方边后卫一对一防不住",
  "定位球防守漏人严重，对方角球经常抢到第一点",
  "高位压迫被破解，对方一脚长传就打穿防线",
  "对方打4-4-2菱形中场，我们4-3-3中路被压制，怎么破？",
  "我们进攻时边后卫压上太深，被对方打身后反击总是回不来",
];

export default function TacticalDiagnosisPage() {
  const router = useRouter();
  const [problem, setProblem] = useState("");
  const [formation, setFormation] = useState("");
  const [opponentFormation, setOpponentFormation] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [diagnosis, setDiagnosis] = useState<TacticalDiagnosis | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"analysis" | "solution" | "training" | "board">("analysis");
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const voiceSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return ("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window);
  }, []);
  const [supabaseSaved, setSupabaseSaved] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [matchType, setMatchType] = useState("");
  const [venue, setVenue] = useState("");
  const [injuries, setInjuries] = useState("");
  const [weather, setWeather] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [clickedExample, setClickedExample] = useState<number | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // ─── Voice input ───────────────────────────────────────
  const startVoice = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("当前浏览器不支持语音输入，请使用 Chrome");
      return;
    }
    setVoiceError("");

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setProblem((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  // Abort voice recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  // ─── Build context for API ─────────────────────────────
  const buildContext = () => {
    const parts: string[] = [];
    if (matchType) parts.push(`赛事类型: ${matchType}`);
    if (venue) parts.push(`场地: ${venue}`);
    if (injuries) parts.push(`伤病球员: ${injuries}`);
    if (weather) parts.push(`天气: ${weather}`);
    return parts.length > 0 ? parts.join("；") : undefined;
  };

  // ─── Submit ────────────────────────────────────────────
  const handleDiagnose = async () => {
    if (problem.trim().length < 5) {
      setErrorMessage("请至少输入5个字描述战术问题");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    setDiagnosis(null);
    setSupabaseSaved(false);

    try {
      const res = await fetch("/api/tactical-diagnosis/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problem.trim(),
          formation: formation || undefined,
          opponentFormation: opponentFormation || undefined,
          context: buildContext(),
        }),
      });

      const json = await res.json();

      if (json.code === "ok" && json.data) {
        setDiagnosis(json.data);
        setStatus("done");
        setActiveTab("analysis");
        // Save to localStorage history
        try {
          const key = "kenshin_diagnosis_history";
          const history = JSON.parse(localStorage.getItem(key) || "[]");
          history.unshift({
            problem: problem.trim(),
            diagnosis: json.data,
            date: new Date().toISOString(),
          });
          localStorage.setItem(key, JSON.stringify(history.slice(0, 10)));
        } catch {}
        // Refresh history state
        loadHistory();

        // Sync to Supabase
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("diagnosis_history").insert({
              user_id: user.id,
              problem: problem.trim(),
              diagnosis: json.data,
            });
            setSupabaseSaved(true);
          }
        } catch {}
      } else {
        setErrorMessage(json.message || "诊断失败，请重试");
        setStatus("error");
      }
    } catch {
      setErrorMessage("网络错误，请检查连接后重试");
      setStatus("error");
    }
  };

  // ─── Example click handler ────────────────────────────
  const handleExampleClick = (text: string, index: number) => {
    setProblem(text);
    setClickedExample(index);
    setTimeout(() => setClickedExample(null), 800);
  };

  // ─── Diagnosis history ────────────────────────────────
  const [history, setHistory] = useState<any[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("kenshin_diagnosis_history") || "[]"
      ).slice(0, 10);
    } catch {
      return [];
    }
  });

  const loadHistory = () => {
    try {
      const h = JSON.parse(
        localStorage.getItem("kenshin_diagnosis_history") || "[]"
      );
      setHistory(h.slice(0, 10));
    } catch {}
  };

  const restoreFromHistory = (item: any) => {
    setProblem(item.problem || "");
    setDiagnosis(item.diagnosis || null);
    if (item.diagnosis) {
      setStatus("done");
      setActiveTab("analysis");
    }
    setHistoryOpen(false);
  };

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#121212] text-[#d1d1d1]">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 relative">

        {/* ================================================================ */}
        {/* Card 1: Title Area                                               */}
        {/* ================================================================ */}
        <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-5 mb-4">
          <a
            href="/"
            className="text-xs text-gray-400 hover:text-gray-300 mb-2 inline-block transition-colors"
          >
            ← 返回
          </a>
          <h1 className="text-2xl font-bold text-[#d92525]">战术诊断</h1>
          <p className="text-gray-400 text-sm mt-1">
            描述战术问题，AI 智能分析并生成解决方案
          </p>
        </div>

        {/* ================================================================ */}
        {/* Card 2: Input Area                                               */}
        {/* ================================================================ */}
        <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-5 mb-4 space-y-4">
          {/* Main textarea with mic */}
          <div className="relative">
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="描述战术问题...&#10;&#10;例如：对方10号总是回撤接球转身，双中卫没人顶出去，后腰也补不回来"
              rows={5}
              className="w-full min-h-[120px] bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-[#d1d1d1] placeholder-gray-500 focus:border-[#d92525]/50 focus:outline-none focus:ring-1 focus:ring-[#d92525]/30 resize-none text-base"
            />
            {/* Voice button inside textarea — only shown when supported */}
            {voiceSupported && (
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                {isListening && (
                  <span className="text-xs text-[#d92525] animate-pulse font-medium">
                    正在聆听...
                  </span>
                )}
                <button
                  onClick={startVoice}
                  disabled={isListening}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? "bg-[#d92525] animate-pulse shadow-lg shadow-[#d92525]/50 ring-2 ring-[#d92525]/40"
                      : "bg-[#2a2a2a] hover:bg-[#333]"
                  }`}
                  title="语音输入"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
              </div>
            )}
            {/* Voice error message */}
            {voiceError && (
              <div className="absolute right-3 bottom-3 text-xs text-red-400 bg-[#1e1e1e]/90 px-2 py-1 rounded">
                {voiceError}
              </div>
            )}
          </div>

          {/* Formation dropdowns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">我方阵型</label>
              <select
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
                className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2.5 text-[#d1d1d1] text-sm focus:border-[#d92525]/50 focus:outline-none focus:ring-1 focus:ring-[#d92525]/30 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 0.5rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.5em 1.5em",
                  paddingRight: "2.5rem",
                }}
              >
                <option value="" className="bg-[#1e1e1e] text-gray-400">
                  选择阵型...
                </option>
                {FORMATION_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value} className="bg-[#1e1e1e] text-[#d1d1d1]">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">对方阵型</label>
              <select
                value={opponentFormation}
                onChange={(e) => setOpponentFormation(e.target.value)}
                className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2.5 text-[#d1d1d1] text-sm focus:border-[#d92525]/50 focus:outline-none focus:ring-1 focus:ring-[#d92525]/30 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 0.5rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.5em 1.5em",
                  paddingRight: "2.5rem",
                }}
              >
                <option value="" className="bg-[#1e1e1e] text-gray-400">
                  选择阵型...
                </option>
                {FORMATION_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value} className="bg-[#1e1e1e] text-[#d1d1d1]">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional filters — collapsible */}
          <div>
            <button
              onClick={() => setExtraOpen(!extraOpen)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  extraOpen ? "rotate-90" : ""
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
              附加条件
              {(matchType || venue || injuries || weather) && (
                <span className="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-[#d92525]" />
              )}
            </button>
            <div
              className={`mt-3 space-y-3 transition-all duration-200 overflow-hidden ${
                extraOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
                <div className="grid grid-cols-2 gap-3">
                  {/* Match type */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">赛事类型</label>
                    <select
                      value={matchType}
                      onChange={(e) => setMatchType(e.target.value)}
                      className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-[#d1d1d1] text-sm focus:border-[#d92525]/50 focus:outline-none appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: "right 0.5rem center",
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "1.5em 1.5em",
                        paddingRight: "2.5rem",
                      }}
                    >
                      <option value="" className="bg-[#1e1e1e] text-gray-400">
                        不限
                      </option>
                      {MATCH_TYPES.map((t) => (
                        <option key={t} value={t} className="bg-[#1e1e1e] text-[#d1d1d1]">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Venue */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">场地</label>
                    <select
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-[#d1d1d1] text-sm focus:border-[#d92525]/50 focus:outline-none appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: "right 0.5rem center",
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "1.5em 1.5em",
                        paddingRight: "2.5rem",
                      }}
                    >
                      <option value="" className="bg-[#1e1e1e] text-gray-400">
                        不限
                      </option>
                      {VENUES.map((v) => (
                        <option key={v} value={v} className="bg-[#1e1e1e] text-[#d1d1d1]">
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Injuries */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">伤病球员</label>
                  <input
                    value={injuries}
                    onChange={(e) => setInjuries(e.target.value)}
                    placeholder="球员名或号码，逗号分隔"
                    className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-[#d1d1d1] placeholder-gray-500 text-sm focus:border-[#d92525]/50 focus:outline-none"
                  />
                </div>
                {/* Weather */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">天气</label>
                  <select
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                    className="w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-[#d1d1d1] text-sm focus:border-[#d92525]/50 focus:outline-none appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: "right 0.5rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1.5em 1.5em",
                      paddingRight: "2.5rem",
                    }}
                  >
                    <option value="" className="bg-[#1e1e1e] text-gray-400">
                      不限
                    </option>
                    {WEATHERS.map((w) => (
                      <option key={w} value={w} className="bg-[#1e1e1e] text-[#d1d1d1]">
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
          </div>

          {/* Diagnose button */}
          <button
            onClick={handleDiagnose}
            disabled={status === "loading"}
            className="w-full bg-[#d92525] text-white font-bold py-3 rounded-xl hover:bg-[#c41e1e] transition-all disabled:opacity-60 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2 h-[48px]"
          >
            {status === "loading" ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="32"
                    strokeLinecap="round"
                  />
                </svg>
                正在分析战术...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                  <path d="M11 8v6M8 11h6" strokeWidth="1.5" />
                </svg>
                开始诊断
              </>
            )}
          </button>
        </div>

        {/* ================================================================ */}
        {/* Card 3: Example Recommendations                                  */}
        {/* ================================================================ */}
        {status === "idle" && !diagnosis && (
          <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-5 mb-4">
            <p className="text-sm text-gray-400 mb-3">试试这些例子：</p>
            <div className="space-y-2">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(ex, i)}
                  className={`block w-full text-left text-sm bg-[#121212] border rounded-lg px-3 py-2.5 transition-all duration-150 ${
                    clickedExample === i
                      ? "border-[#d92525] ring-1 ring-[#d92525]/30"
                      : "border-[#222] hover:border-[#d92525]/30 text-gray-400 hover:text-[#d1d1d1]"
                  }`}
                >
                  <span className="flex items-start gap-2">
                    <span className="text-gray-600 shrink-0 mt-0.5">
                      {clickedExample === i ? (
                        <svg className="w-4 h-4 text-[#d92525]" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                      )}
                    </span>
                    {ex}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {errorMessage && (
          <div className="bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
            {errorMessage}
          </div>
        )}

        {/* Loading skeleton */}
        {status === "loading" && (
          <div className="space-y-4 animate-pulse mb-4">
            <div className="h-6 bg-[#1e1e1e] rounded w-1/3" />
            <div className="h-4 bg-[#1e1e1e] rounded w-full" />
            <div className="h-4 bg-[#1e1e1e] rounded w-5/6" />
            <div className="h-4 bg-[#1e1e1e] rounded w-3/4" />
            <div className="h-48 bg-[#1e1e1e] rounded-xl" />
          </div>
        )}

        {/* Results */}
        {status === "done" && diagnosis && (
          <div>
            {/* Tab bar */}
            <div className="flex gap-1 bg-[#1e1e1e] rounded-xl p-1 mb-4 border border-[#222]">
              {[
                { key: "analysis", label: "分析" },
                { key: "solution", label: "对策" },
                { key: "training", label: "训练" },
                { key: "board", label: "战术图" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-[#d92525] text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Analysis */}
            {activeTab === "analysis" && (
              <div className="space-y-4">
                <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-5">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-[#d92525]/20 text-[#d92525] mb-2 font-medium">
                    {diagnosis.diagnosis.problem_type}
                  </span>
                  <h2 className="text-lg font-bold text-[#d1d1d1] mb-1">
                    {diagnosis.diagnosis.summary}
                  </h2>
                  <div className="text-gray-300 text-sm leading-relaxed mt-3 whitespace-pre-line">
                    {diagnosis.diagnosis.analysis.split("\n").map((line, i) => {
                      if (/^[一二三四五六七八九十]、/.test(line.trim())) {
                        return (
                          <p key={i} className="text-[#d92525] font-bold text-sm mt-3 mb-1">
                            {line.trim()}
                          </p>
                        );
                      }
                      if (/^\d+[、.]/.test(line.trim())) {
                        return (
                          <p key={i} className="text-gray-300 ml-2 my-0.5">
                            {line.trim()}
                          </p>
                        );
                      }
                      return line.trim() ? (
                        <p key={i} className="text-gray-400 my-0.5">
                          {line.trim()}
                        </p>
                      ) : (
                        <br key={i} />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Solution */}
            {activeTab === "solution" && (
              <div className="space-y-4">
                <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-5">
                  <h2 className="text-lg font-bold text-[#d92525] mb-1">
                    {diagnosis.solution.title}
                  </h2>
                  <div className="text-gray-300 text-sm leading-relaxed mt-3 whitespace-pre-line">
                    {diagnosis.solution.strategy.split("\n").map((line, i) => {
                      if (/^[一二三四五六七八九十]、/.test(line.trim())) {
                        return (
                          <p key={i} className="text-[#d92525] font-bold text-sm mt-3 mb-1">
                            {line.trim()}
                          </p>
                        );
                      }
                      if (/^\d+[、.]/.test(line.trim())) {
                        return (
                          <p key={i} className="text-gray-300 ml-2 my-0.5">
                            {line.trim()}
                          </p>
                        );
                      }
                      return line.trim() ? (
                        <p key={i} className="text-gray-400 my-0.5">
                          {line.trim()}
                        </p>
                      ) : (
                        <br key={i} />
                      );
                    })}
                  </div>
                </div>
                <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-400 mb-2">调整要点</h3>
                  <ul className="space-y-1.5">
                    {diagnosis.solution.adjustments.map((adj, i) => (
                      <li
                        key={i}
                        className="text-gray-300 text-sm flex items-start gap-2"
                      >
                        <span className="text-[#d92525] mt-1 shrink-0">•</span>
                        {adj}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-400 mb-2">球员任务卡</h3>
                  <div className="space-y-2">
                    {diagnosis.solution.player_instructions.map((pi, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-[#121212] rounded-lg px-3 py-2"
                      >
                        <span className="text-[#d92525] font-bold text-sm min-w-[3rem]">
                          {pi.position}
                        </span>
                        <span className="text-gray-300 text-sm">{pi.instruction}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Training */}
            {activeTab === "training" && (
              <div className="space-y-4">
                <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-4">
                  <h2 className="text-lg font-bold text-[#d92525] mb-2">
                    {diagnosis.training.focus}
                  </h2>
                  <h3 className="text-sm font-bold text-gray-400 mb-2">训练项目</h3>
                  <ul className="space-y-2">
                    {diagnosis.training.drills.map((drill, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-gray-300 text-sm bg-[#121212] rounded-lg px-3 py-2"
                      >
                        <span className="text-[#d92525] font-bold">{i + 1}.</span>
                        {drill}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-400 mb-2">对抗赛建议</h3>
                  <p className="text-gray-300 text-sm">{diagnosis.training.ssg_suggestion}</p>
                </div>
              </div>
            )}

            {/* Tab: Tactical Board */}
            {activeTab === "board" && (
              <div>
                <TacticalBoardRender render={diagnosis.render} />
                <button
                  onClick={() => {
                    writeDiagnosisContext(diagnosis.render as any);
                    router.push("/tactics");
                  }}
                  className="mt-3 w-full py-2.5 bg-[#1e1e1e] hover:bg-[#252525] border border-[#333] text-white font-medium rounded-xl text-sm transition"
                >
                  在战术板中打开编辑
                </button>
              </div>
            )}

            {/* Cloud save indicator */}
            {supabaseSaved && (
              <div className="flex items-center justify-end gap-1.5 mt-3 text-xs text-green-400/80">
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 16.2A4.5 4.5 0 0017.5 8h-1.8A7 7 0 104 14.9" />
                  <polyline points="16 12 12 16 8 12" />
                  <line x1="12" y1="16" x2="12" y2="9" />
                </svg>
                已保存到云端
              </div>
            )}

            {/* Share toast */}
            {shareToast && (
              <div className="mt-3 px-4 py-2 bg-[#30D158]/10 border border-[#30D158]/30 rounded-lg text-sm text-[#30D158]">
                {shareToast}
              </div>
            )}
            {/* Share + Reset buttons */}
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  const shareData = `${diagnosis.diagnosis.summary}\n\n对策: ${diagnosis.solution.title}\n${diagnosis.solution.strategy}\n\n训练: ${diagnosis.training.focus}`;
                  if (navigator.share) {
                    navigator.share({
                      title: diagnosis.diagnosis.summary,
                      text: shareData,
                    }).catch(() => {});
                  } else {
                    try {
                      navigator.clipboard.writeText(shareData);
                    } catch {
                      const ta = document.createElement("textarea");
                      ta.value = shareData;
                      ta.style.position = "fixed";
                      ta.style.left = "-9999px";
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand("copy");
                      document.body.removeChild(ta);
                    }
                    setShareToast("已复制到剪贴板");
                    setTimeout(() => setShareToast(null), 2000);
                  }
                }}
                className="flex-1 bg-[#1e1e1e] hover:bg-[#252525] border border-[#333] text-white font-medium py-3 rounded-xl transition-colors"
              >
                分享给球员
              </button>
              <button
                onClick={() => {
                  setProblem("");
                  setFormation("");
                  setOpponentFormation("");
                  setMatchType("");
                  setVenue("");
                  setInjuries("");
                  setWeather("");
                  setDiagnosis(null);
                  setStatus("idle");
                  setErrorMessage("");
                  setSupabaseSaved(false);
                }}
                className="flex-1 bg-[#1e1e1e] hover:bg-[#252525] border border-[#333] text-white font-medium py-3 rounded-xl transition-colors"
              >
                重新诊断
              </button>
            </div>
          </div>
        )}
      </div>

      <MobileNav />

      {/* ================================================================ */}
      {/* History Panel — floating sidebar toggle                           */}
      {/* ================================================================ */}
      {/* Toggle button */}
      <button
        onClick={() => setHistoryOpen(!historyOpen)}
        className="fixed right-0 top-1/3 z-50 bg-[#1e1e1e] border border-[#222] border-r-0 rounded-l-lg px-2 py-3 text-gray-400 hover:text-[#d1d1d1] transition-colors shadow-lg"
        title="历史记录"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      {/* History slide-in panel */}
      {historyOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setHistoryOpen(false)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-[#1e1e1e] border-l border-[#222] shadow-2xl overflow-y-auto animate-slide-left">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#d1d1d1] flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  历史记录
                </h2>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {history.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">暂无历史记录</p>
              ) : (
                <div className="space-y-2">
                  {history.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => restoreFromHistory(item)}
                      className="block w-full text-left bg-[#121212] border border-[#222] hover:border-[#d92525]/30 rounded-lg px-3 py-2.5 transition-all duration-150 group"
                    >
                      <p className="text-sm text-gray-300 line-clamp-2 group-hover:text-[#d1d1d1]">
                        {item.problem}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {item.date
                          ? new Date(item.date).toLocaleString("zh-CN", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </button>
                  ))}
                  {history.length > 0 && (
                    <button
                      onClick={() => {
                        localStorage.removeItem("kenshin_diagnosis_history");
                        setHistory([]);
                      }}
                      className="w-full text-center text-xs text-gray-600 hover:text-red-400 py-2 transition-colors"
                    >
                      清除全部记录
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tactical Board (inline SVG, no Fabric.js dependency for lightweight mobile) ──

function TacticalBoardRender({
  render,
}: {
  render: TacticalDiagnosis["render"];
}) {
  const FIELD_W = 800;
  const FIELD_H = 520;
  const MARGIN = 40;

  const toX = (x: number) => MARGIN + x * (FIELD_W - 2 * MARGIN);
  const toY = (y: number) => MARGIN + y * (FIELD_H - 2 * MARGIN);

  return (
    <div className="bg-[#1e1e1e] border border-[#222] rounded-xl overflow-hidden">
      <div className="px-4 py-2 bg-[#121212] border-b border-[#222] text-sm font-medium text-[#d1d1d1]">
        {render.title}
      </div>
      <div className="p-2">
        <svg
          viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
          className="w-full h-auto"
          style={{ background: "#f8f9f6" }}
        >
          {/* Field markings */}
          <rect
            x={MARGIN}
            y={MARGIN}
            width={FIELD_W - 2 * MARGIN}
            height={FIELD_H - 2 * MARGIN}
            fill="none"
            stroke="#2d8c2d"
            strokeWidth="2"
          />
          <line
            x1={FIELD_W / 2}
            y1={MARGIN}
            x2={FIELD_W / 2}
            y2={FIELD_H - MARGIN}
            stroke="#2d8c2d"
            strokeWidth="2"
          />
          <circle
            cx={FIELD_W / 2}
            cy={FIELD_H / 2}
            r="60"
            fill="none"
            stroke="#2d8c2d"
            strokeWidth="2"
          />
          {/* Penalty areas */}
          <rect
            x={FIELD_W * 0.2}
            y={MARGIN}
            width={FIELD_W * 0.6}
            height={80}
            fill="none"
            stroke="#2d8c2d"
            strokeWidth="1.5"
          />
          <rect
            x={FIELD_W * 0.2}
            y={FIELD_H - MARGIN - 80}
            width={FIELD_W * 0.6}
            height={80}
            fill="none"
            stroke="#2d8c2d"
            strokeWidth="1.5"
          />

          {/* Zones */}
          {render.zones?.map((zone, i) => (
            <rect
              key={`zone-${i}`}
              x={toX(zone.x)}
              y={toY(zone.y)}
              width={zone.width * (FIELD_W - 2 * MARGIN)}
              height={zone.height * (FIELD_H - 2 * MARGIN)}
              fill={zone.color}
              stroke={zone.color.replace("0.15", "0.4")}
              strokeWidth="1.5"
              strokeDasharray={zone.borderDashed ? "6,3" : "none"}
              rx="4"
            />
          ))}
          {render.zones?.map((zone, i) => (
            <text
              key={`zone-label-${i}`}
              x={toX(zone.x) + 4}
              y={toY(zone.y) + 14}
              fill={zone.color.replace("0.15", "0.7")}
              fontSize="11"
              fontWeight="bold"
            >
              {zone.label}
            </text>
          ))}

          {/* Arrows */}
          {render.arrows?.map((arrow, i) => {
            const x1 = toX(arrow.from.x);
            const y1 = toY(arrow.from.y);
            const x2 = toX(arrow.to.x);
            const y2 = toY(arrow.to.y);
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={`arrow-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={arrow.color}
                  strokeWidth="2.5"
                  strokeDasharray={arrow.dashed ? "8,4" : "none"}
                  strokeLinecap="round"
                  markerEnd={
                    arrow.dashed ? undefined : `url(#arrowhead-${i})`
                  }
                />
                {!arrow.dashed && (
                  <defs>
                    <marker
                      id={`arrowhead-${i}`}
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill={arrow.color} />
                    </marker>
                  </defs>
                )}
                {arrow.label && (
                  <text
                    x={midX}
                    y={midY - 8}
                    textAnchor="middle"
                    fill={arrow.color}
                    fontSize="11"
                    fontWeight="bold"
                    style={{ textShadow: "0 0 4px white" }}
                  >
                    {arrow.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Ball */}
          {render.ball && (
            <g>
              <circle
                cx={toX(render.ball.x)}
                cy={toY(render.ball.y)}
                r="6"
                fill="white"
                stroke="#222"
                strokeWidth="1.5"
              />
              <circle
                cx={toX(render.ball.x) + 1}
                cy={toY(render.ball.y) - 1}
                r="1.5"
                fill="#222"
              />
            </g>
          )}

          {/* Players */}
          {[...(render.players || []), ...(render.opponents || [])].map(
            (p, i) => (
              <g key={`player-${i}`}>
                <circle
                  cx={toX(p.x)}
                  cy={toY(p.y) + 1}
                  r="14"
                  fill="rgba(0,0,0,0.25)"
                />
                <circle
                  cx={toX(p.x)}
                  cy={toY(p.y)}
                  r="13"
                  fill={p.color}
                  stroke={p.team === "opponent" ? "#1e40af" : "#9b1d3a"}
                  strokeWidth="2"
                />
                <text
                  x={toX(p.x)}
                  y={toY(p.y) + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {p.number}
                </text>
                <text
                  x={toX(p.x)}
                  y={toY(p.y) + 25}
                  textAnchor="middle"
                  fill="#222"
                  fontSize="10"
                  fontWeight="500"
                >
                  {p.label}
                </text>
              </g>
            )
          )}
        </svg>
      </div>
    </div>
  );
}
