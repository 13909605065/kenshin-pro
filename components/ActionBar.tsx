"use client";

import { TrainingModule, PlayerFormData } from "@/lib/types";
import { Copy, Heart, Plus, Check, ThumbsUp, ThumbsDown, Printer, BookmarkPlus, Share2, Image } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/supabase-client";
import { ExportTable } from "./ExportTable";
import { ShareCard } from "./ShareCard";

interface Props {
  modules: TrainingModule[];
  formData: PlayerFormData;
  planId: string | null;
  onSaveTemplate?: () => void;
}

export function ActionBar({ modules, formData, planId, onSaveTemplate }: Props) {
  const [copyAllDone, setCopyAllDone] = useState(false);
  const [shareDone, setShareDone] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const supabase = createClient();

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const handleShare = async () => {
    try {
      const payload = {
        modules,
        formData: {
          role: formData.role,
          name: formData.name?.charAt(0) + "**",
          gender: formData.gender,
          position: formData.position,
          goal: formData.goal,
          phase: formData.phase,
        },
      };
      const res = await fetch("/api/share/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.code === "ok" && json.id) {
        const url = `${window.location.origin}/share/?id=${json.id}`;
        const ok = await copyToClipboard(url);
        if (ok) {
          setShareDone(true);
          setTimeout(() => setShareDone(false), 2000);
        } else {
          setShareFailed(true);
          setTimeout(() => setShareFailed(false), 3000);
        }
      } else {
        const hash = btoa(encodeURIComponent(JSON.stringify({ m: modules, f: payload.formData })));
        const url = `${window.location.origin}/share/#${hash}`;
        const ok = await copyToClipboard(url);
        if (ok) {
          setShareDone(true);
          setTimeout(() => setShareDone(false), 2000);
        } else {
          setShareFailed(true);
          setTimeout(() => setShareFailed(false), 3000);
        }
      }
    } catch {
      const hash = btoa(encodeURIComponent(JSON.stringify({ m: modules, f: { role: formData.role } })));
      const url = `${window.location.origin}/share/#${hash}`;
      const ok = await copyToClipboard(url);
      if (ok) {
        setShareDone(true);
        setTimeout(() => setShareDone(false), 2000);
      } else {
        setShareFailed(true);
        setTimeout(() => setShareFailed(false), 3000);
      }
    }
  };

  const copyAll = async () => {
    const text = modules
      .map((m) => {
        try {
          return JSON.stringify(m, null, 2);
        } catch {
          return m.title;
        }
      })
      .join("\n\n---\n\n");
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyAllDone(true);
      setTimeout(() => setCopyAllDone(false), 2000);
    }
  };

  const toggleFavorite = async () => {
    if (!planId) return;
    setFavorited(!favorited);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("training_plans").upsert(
      {
        id: planId,
        user_id: user.id,
        form_data: formData as any,
        plan_content: modules as any,
        is_favorite: !favorited,
      },
      { onConflict: "id" }
    );
  };

  const sendFeedback = async (rating: "up" | "down") => {
    if (feedback === rating || !planId) return;
    setFeedback(rating);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("feedback").upsert({
      plan_id: planId,
      user_id: user.id,
      rating,
    });
  };

  const btnBase = "flex items-center gap-1.5 text-[11px] py-1.5 px-3 rounded-lg border transition-all duration-150 bg-[#1e1e1e] border-[#222] text-[#d1d1d1] hover:border-[#555] hover:bg-[#222]";

  return (
    <div className="bg-[#1e1e1e] border border-[#222] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* ── Group 1: 复制 | 收藏 | 分享 ── */}
        <div className="flex items-center gap-1">
          <button onClick={copyAll} className={btnBase}>
            {copyAllDone ? <Check className="w-3.5 h-3.5 text-[#992828]" /> : <Copy className="w-3.5 h-3.5" />}
            {copyAllDone ? "已复制" : "复制"}
          </button>

          <button
            onClick={toggleFavorite}
            className={`${btnBase} ${favorited ? "border-[#992828] text-[#992828] bg-[#992828]/10" : ""}`}
          >
            <Heart className={`w-3.5 h-3.5 ${favorited ? "fill-[#992828] text-[#992828]" : ""}`} />
            {favorited ? "已收藏" : "收藏"}
          </button>

          <button
            onClick={handleShare}
            className={`${btnBase} ${
              shareFailed
                ? "border-yellow-600 text-yellow-500 bg-yellow-500/10"
                : shareDone
                ? "border-[#992828] text-[#992828] bg-[#992828]/10"
                : ""
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            {shareFailed ? "复制失败，请手动复制链接" : shareDone ? "已复制" : "分享"}
          </button>

          <button
            onClick={() => setShowShareCard(true)}
            className={btnBase}
            title="生成微信分享图"
          >
            <Image className="w-3.5 h-3.5" />
            分享图
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="w-px h-5 bg-[#333] mx-0.5" />

        {/* ── Group 2: 导出PDF | 保存模板 | 导出表格 ── */}
        <div className="flex items-center gap-1">
          <button onClick={() => window.print()} className={btnBase}>
            <Printer className="w-3.5 h-3.5" />
            导出PDF
          </button>

          {onSaveTemplate && (
            <button onClick={onSaveTemplate} className={btnBase}>
              <BookmarkPlus className="w-3.5 h-3.5" />
              保存模板
            </button>
          )}

          {/* ExportTable inline button — includes print-only content */}
          <ExportTable modules={modules} formData={formData} />
        </div>

        {/* ── Divider ── */}
        <div className="w-px h-5 bg-[#333] mx-0.5" />

        {/* ── Standalone: 新方案 ── */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 text-[11px] py-1.5 px-4 rounded-lg border transition-all duration-150 bg-[#992828] border-[#992828] text-white hover:bg-[#7a1e1e] hover:border-[#7a1e1e] active:scale-[0.98] font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          新方案
        </button>
      </div>

      {/* ── Feedback ── */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-600 mr-2">有帮助吗？</span>
        <button
          onClick={() => sendFeedback("up")}
          className={`p-1.5 rounded-lg transition ${
            feedback === "up"
              ? "bg-[#992828]/20 text-[#992828]"
              : "text-gray-400 hover:text-gray-300 hover:bg-[#222]"
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => sendFeedback("down")}
          className={`p-1.5 rounded-lg transition ${
            feedback === "down"
              ? "bg-red-500/20 text-red-400"
              : "text-gray-400 hover:text-gray-300 hover:bg-[#222]"
          }`}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Share Card Modal */}
      {showShareCard && (
        <ShareCard
          modules={modules}
          formData={formData}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
}
