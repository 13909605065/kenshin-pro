"use client";

import { useState, useRef, useCallback } from "react";
import type { TacticalDiagnosis } from "@/lib/ai/tactical-diagnosis";
import { MobileNav } from "@/components/MobileNav";

type Status = "idle" | "loading" | "done" | "error";

export default function TacticalDiagnosisPage() {
  const [problem, setProblem] = useState("");
  const [formation, setFormation] = useState("");
  const [opponentFormation, setOpponentFormation] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [diagnosis, setDiagnosis] = useState<TacticalDiagnosis | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"analysis" | "solution" | "training" | "board">("analysis");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ─── Voice input ───────────────────────────────────────
  const startVoice = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("当前浏览器不支持语音输入，请使用 Chrome");
      return;
    }

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

  // ─── Submit ────────────────────────────────────────────
  const handleDiagnose = async () => {
    if (problem.trim().length < 5) {
      setErrorMessage("请至少输入5个字描述战术问题");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    setDiagnosis(null);

    try {
      const res = await fetch("/api/tactical-diagnosis/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problem.trim(),
          formation: formation.trim() || undefined,
          opponentFormation: opponentFormation.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (json.code === "ok" && json.data) {
        setDiagnosis(json.data);
        setStatus("done");
        setActiveTab("analysis");
      } else {
        setErrorMessage(json.message || "诊断失败，请重试");
        setStatus("error");
      }
    } catch {
      setErrorMessage("网络错误，请检查连接后重试");
      setStatus("error");
    }
  };

  // ─── Example prompts ───────────────────────────────────
  const examples = [
    "对方10号总是回撤到中场接球转身，我们的双中卫没人敢顶出去，后腰也补不回来",
    "我们进攻时边后卫压上太深，被对方打身后反击总是回不来",
    "对方打4-4-2菱形中场，我们4-3-3中路被压制，怎么破？",
  ];

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neon-pink">⚽ AI 战术诊断</h1>
          <p className="text-gray-400 text-sm mt-1">
            描述你遇到的进攻或防守问题，AI 基于运动科学知识库给出方案并自动画图
          </p>
        </div>

        {/* Input area */}
        <div className="space-y-4 mb-6">
          {/* Main problem input */}
          <div className="relative">
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="在这里描述战术问题...&#10;&#10;例如：对方10号总是回撤接球转身，双中卫没人顶出去，后腰也补不回来"
              rows={4}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-neon-pink focus:outline-none resize-none text-base"
            />
            {/* Voice button */}
            <button
              onClick={startVoice}
              disabled={isListening}
              className={`absolute right-3 bottom-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? "bg-red-500 animate-pulse shadow-lg shadow-red-500/50"
                  : "bg-[#2a2a2a] hover:bg-[#333]"
              }`}
              title="语音输入"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-3">
            <input
              value={formation}
              onChange={(e) => setFormation(e.target.value)}
              placeholder="我方阵型（如 4-3-3）"
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-neon-pink focus:outline-none text-sm"
            />
            <input
              value={opponentFormation}
              onChange={(e) => setOpponentFormation(e.target.value)}
              placeholder="对方阵型（如 4-4-2）"
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-neon-pink focus:outline-none text-sm"
            />
          </div>

          <button
            onClick={handleDiagnose}
            disabled={status === "loading"}
            className="w-full bg-neon-pink text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-lg"
          >
            {status === "loading" ? "🤔 AI 正在分析中..." : "🔍 开始诊断"}
          </button>
        </div>

        {/* Examples */}
        {status === "idle" && !diagnosis && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">💡 试试这些例子：</p>
            <div className="space-y-2">
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setProblem(ex)}
                  className="block w-full text-left text-sm bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-gray-300 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {errorMessage && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-red-300 text-sm mb-6">
            ❌ {errorMessage}
          </div>
        )}

        {/* Loading skeleton */}
        {status === "loading" && (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 bg-[#222] rounded w-1/3" />
            <div className="h-4 bg-[#222] rounded w-full" />
            <div className="h-4 bg-[#222] rounded w-5/6" />
            <div className="h-4 bg-[#222] rounded w-3/4" />
            <div className="h-48 bg-[#222] rounded-xl" />
          </div>
        )}

        {/* Results */}
        {status === "done" && diagnosis && (
          <div>
            {/* Tab bar */}
            <div className="flex gap-1 bg-[#1a1a1a] rounded-xl p-1 mb-4">
              {[
                { key: "analysis", label: "📊 分析" },
                { key: "solution", label: "💡 对策" },
                { key: "training", label: "🏋️ 训练" },
                { key: "board", label: "🎯 战术图" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-neon-pink text-black"
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
                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
                  <span className="inline-block px-2 py-0.5 rounded text-xs bg-neon-pink/20 text-neon-pink mb-2">
                    {diagnosis.diagnosis.problem_type}
                  </span>
                  <h2 className="text-xl font-bold mb-2">{diagnosis.diagnosis.summary}</h2>
                  <p className="text-gray-300 leading-relaxed">{diagnosis.diagnosis.analysis}</p>
                </div>
                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-400 mb-2">📍 关键场景</h3>
                  <p className="text-gray-300 text-sm">{diagnosis.diagnosis.key_moment}</p>
                </div>
              </div>
            )}

            {/* Tab: Solution */}
            {activeTab === "solution" && (
              <div className="space-y-4">
                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
                  <h2 className="text-lg font-bold text-neon-pink mb-2">{diagnosis.solution.title}</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">{diagnosis.solution.strategy}</p>
                  <h3 className="text-sm font-bold text-gray-400 mb-2">调整要点</h3>
                  <ul className="space-y-1.5">
                    {diagnosis.solution.adjustments.map((adj, i) => (
                      <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-neon-pink mt-1">•</span>
                        {adj}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-400 mb-2">👤 球员任务卡</h3>
                  <div className="space-y-2">
                    {diagnosis.solution.player_instructions.map((pi, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-[#111] rounded-lg px-3 py-2"
                      >
                        <span className="text-neon-pink font-bold text-sm min-w-[3rem]">
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
                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
                  <h2 className="text-lg font-bold text-neon-pink mb-2">🎯 {diagnosis.training.focus}</h2>
                  <h3 className="text-sm font-bold text-gray-400 mb-2">训练项目</h3>
                  <ul className="space-y-2">
                    {diagnosis.training.drills.map((drill, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-300 text-sm bg-[#111] rounded-lg px-3 py-2">
                        <span className="text-neon-pink font-bold">{i + 1}.</span>
                        {drill}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-400 mb-2">⚽ 对抗赛建议</h3>
                  <p className="text-gray-300 text-sm">{diagnosis.training.ssg_suggestion}</p>
                </div>
              </div>
            )}

            {/* Tab: Tactical Board */}
            {activeTab === "board" && (
              <TacticalBoardRender render={diagnosis.render} />
            )}

            {/* Share button */}
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  const shareData = `${diagnosis.diagnosis.summary}\n\n对策: ${diagnosis.solution.title}\n${diagnosis.solution.strategy}\n\n训练: ${diagnosis.training.focus}`;
                  if (navigator.share) {
                    navigator.share({ title: diagnosis.diagnosis.summary, text: shareData });
                  } else {
                    navigator.clipboard.writeText(shareData);
                    alert("已复制到剪贴板");
                  }
                }}
                className="flex-1 bg-[#222] hover:bg-[#333] text-white font-medium py-3 rounded-xl transition-colors"
              >
                📤 分享给球员
              </button>
              <button
                onClick={() => {
                  setProblem("");
                  setDiagnosis(null);
                  setStatus("idle");
                  setErrorMessage("");
                }}
                className="flex-1 bg-[#222] hover:bg-[#333] text-white font-medium py-3 rounded-xl transition-colors"
              >
                🔄 重新诊断
              </button>
            </div>
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}

// ─── Tactical Board (inline SVG, no Fabric.js dependency for lightweight mobile) ──

function TacticalBoardRender({ render }: { render: TacticalDiagnosis["render"] }) {
  const FIELD_W = 800;
  const FIELD_H = 520;
  const MARGIN = 40;

  const toX = (x: number) => MARGIN + x * (FIELD_W - 2 * MARGIN);
  const toY = (y: number) => MARGIN + y * (FIELD_H - 2 * MARGIN);

  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden">
      <div className="px-4 py-2 bg-[#111] border-b border-[#333] text-sm font-medium text-gray-300">
        🎯 {render.title}
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
                {/* Shadow for visibility */}
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
                  markerEnd={arrow.dashed ? undefined : `url(#arrowhead-${i})`}
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
          {[...(render.players || []), ...(render.opponents || [])].map((p, i) => (
            <g key={`player-${i}`}>
              {/* Shadow */}
              <circle
                cx={toX(p.x)}
                cy={toY(p.y) + 1}
                r="14"
                fill="rgba(0,0,0,0.25)"
              />
              {/* Body */}
              <circle
                cx={toX(p.x)}
                cy={toY(p.y)}
                r="13"
                fill={p.color}
                stroke={p.team === "opponent" ? "#1e40af" : "#9b1d3a"}
                strokeWidth="2"
              />
              {/* Number */}
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
              {/* Label below */}
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
          ))}
        </svg>
      </div>
    </div>
  );
}
