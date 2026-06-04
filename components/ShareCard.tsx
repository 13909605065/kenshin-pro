"use client";

import { useRef, useState } from "react";
import { TrainingModule, PlayerFormData } from "@/lib/types";
import { POSITION_LABELS, GOAL_LABELS, PHASE_LABELS } from "@/lib/constants";
import { X, Download, Share2, Check } from "lucide-react";

interface Props {
  modules: TrainingModule[];
  formData: PlayerFormData;
  onClose: () => void;
}

function formatDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function buildSummary(modules: TrainingModule[], formData: PlayerFormData) {
  const isCoach = formData.role === "coach";
  const posModule = modules.find((m: any) =>
    m.module === "position_training"
  ) as any;
  const abilityModule = modules.find((m: any) =>
    m.module === "ability_training"
  ) as any;
  const sessionPlan = modules.find((m: any) =>
    m.module === "session_plan"
  ) as any;

  const exerciseCount =
    (posModule?.upper_limb?.length || 0) +
    (posModule?.lower_limb?.length || 0) +
    (posModule?.core?.length || 0) +
    (abilityModule?.exercises?.length || 0);

  const topExercises: string[] = [];
  if (posModule) {
    for (const key of ["upper_limb", "lower_limb", "core"] as const) {
      (posModule[key] || []).forEach((e: any) => {
        if (topExercises.length < 5) topExercises.push(e.name);
      });
    }
  }
  if (abilityModule?.exercises) {
    abilityModule.exercises.forEach((e: any) => {
      if (topExercises.length < 5) topExercises.push(e.name);
    });
  }

  const warmupCount = posModule?.warmup?.length || sessionPlan?.warmup?.length || 0;
  const cooldownCount = posModule?.cooldown?.length || sessionPlan?.cooldown?.length || 0;
  const activityCount = sessionPlan?.activities?.length || 0;

  return {
    isCoach,
    title: isCoach
      ? sessionPlan?.title || "教练训练方案"
      : formData.position
      ? `${POSITION_LABELS[formData.position]}训练方案`
      : "个人训练方案",
    playerName: formData.name || "运动员",
    position: formData.position ? POSITION_LABELS[formData.position] : "通用",
    age: formData.age,
    goal: formData.goal ? (GOAL_LABELS as any)[formData.goal] || formData.goal : undefined,
    phase: formData.phase ? (PHASE_LABELS as any)[formData.phase] || formData.phase : undefined,
    exerciseCount,
    topExercises,
    warmupCount,
    cooldownCount,
    activityCount,
    duration: sessionPlan?.duration || 0,
    playerCount: sessionPlan?.player_count || 0,
  };
}

export function ShareCard({ modules, formData, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const summary = buildSummary(modules, formData);
  const date = formatDate();
  const planUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/`
      : "";

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const card = cardRef.current;
      const rect = card.getBoundingClientRect();
      const w = 600;
      const h = Math.round(w * (rect.height / rect.width));

      // Build SVG with foreignObject for rendering
      const styles = getComputedStyle(card);
      const html = card.outerHTML;

      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;transform:scale(${w / rect.width});transform-origin:top left;">
              ${html}
            </div>
          </foreignObject>
        </svg>
      `;

      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        // White background
        ctx.fillStyle = "#121212";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const pngUrl = canvas.toDataURL("image/png");

        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `kenshinpro-训练方案-${date}.png`;
        a.click();
        URL.revokeObjectURL(url);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Fallback: open print
        window.print();
      };

      img.src = url;
    } catch {
      // Fallback: open print dialog
      window.print();
    }
  };

  const handleCopyUrl = async () => {
    const url = `${planUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-2 bg-[#1e1e1e] border border-[#333] rounded-full text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Share Card */}
        <div
          ref={cardRef}
          className="bg-[#121212] border border-[#333] rounded-2xl overflow-hidden shadow-2xl"
          style={{ minWidth: 320 }}
        >
          {/* Header with red accent */}
          <div className="bg-[#d92525] px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] opacity-80 font-bold tracking-wider">
                  KENSHIN PRO
                </p>
                <p className="text-lg font-black mt-0.5 leading-tight">
                  {summary.title}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] opacity-70">{date}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Player info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#d92525]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#d92525] font-bold text-sm">
                  {summary.isCoach ? "教" : summary.position[0]}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm truncate">
                  {summary.playerName}
                </p>
                <p className="text-[11px] text-gray-400">
                  {summary.position}
                  {summary.age && ` · ${summary.age}岁`}
                  {summary.goal && ` · ${summary.goal}`}
                  {summary.phase && ` · ${summary.phase}`}
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2">
              <StatBox
                value={summary.exerciseCount}
                label="训练动作"
                color="text-[#d92525]"
              />
              <StatBox
                value={summary.warmupCount}
                label="热身项"
                color="text-green-400"
              />
              <StatBox
                value={summary.activityCount + summary.cooldownCount}
                label="练习+放松"
                color="text-blue-400"
              />
              <StatBox
                value={summary.duration || "-"}
                label="分钟"
                color="text-yellow-400"
              />
            </div>

            {/* Top exercises */}
            {summary.topExercises.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">
                  核心动作
                </p>
                <div className="space-y-1">
                  {summary.topExercises.map((name, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-gray-300"
                    >
                      <span className="text-[#d92525] text-[10px] font-bold w-4 text-right flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-[#222] flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500">由 AI 生成</p>
                <p className="text-[10px] text-gray-600">
                  kenshinpro · 足球训练助手
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">扫码查看完整方案</p>
                <p className="text-[11px] text-[#d92525] font-bold">
                  {planUrl.replace("https://", "").replace("http://", "")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-3 text-center">
          <p className="text-xs text-gray-300">
            <span className="text-[#d92525] font-bold">长按保存图片</span>
            <span className="text-gray-500"> 即可分享到微信/朋友圈</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 py-2.5 bg-[#d92525] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-[#b91d1d] transition active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            下载图片
          </button>
          <button
            onClick={handleCopyUrl}
            className="flex-1 py-2.5 bg-[#1e1e1e] border border-[#333] text-gray-300 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-[#222] transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#d92525]" />
                已复制
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                复制链接
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-[#1e1e1e] rounded-lg p-2 text-center">
      <div className={`font-bold text-lg ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  );
}
