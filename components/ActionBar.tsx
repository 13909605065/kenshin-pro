"use client";

import { TrainingModule, PlayerFormData } from "@/lib/types";
import { Copy, Heart, Plus, Check, ThumbsUp, ThumbsDown, Printer, BookmarkPlus } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase-client";

interface Props {
  modules: TrainingModule[];
  formData: PlayerFormData;
  planId: string | null;
  onSaveTemplate?: () => void;
}

export function ActionBar({ modules, formData, planId, onSaveTemplate }: Props) {
  const [copyAllDone, setCopyAllDone] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const supabase = createClient();

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
    await navigator.clipboard.writeText(text);
    setCopyAllDone(true);
    setTimeout(() => setCopyAllDone(false), 2000);
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

  return (
    <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button onClick={copyAll} className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
          {copyAllDone ? <Check className="w-4 h-4 text-neon-pink" /> : <Copy className="w-4 h-4" />}
          {copyAllDone ? "已复制" : "复制全部"}
        </button>

        <button
          onClick={toggleFavorite}
          className={`flex items-center gap-2 text-sm py-2 px-4 rounded-xl border transition-all ${
            favorited
              ? "border-neon-gold text-neon-gold bg-neon-gold/10"
              : "border-pitch-600 text-gray-400 hover:border-pitch-500"
          }`}
        >
          <Heart className={`w-4 h-4 ${favorited ? "fill-neon-gold" : ""}`} />
          {favorited ? "已收藏" : "收藏"}
        </button>

        <button
          onClick={() => window.print()}
          className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
        >
          <Printer className="w-4 h-4" />
          导出 PDF
        </button>

        {onSaveTemplate && (
          <button
            onClick={onSaveTemplate}
            className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
          >
            <BookmarkPlus className="w-4 h-4" />
            保存模板
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新方案
        </button>
      </div>

      {/* Feedback */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-2">有帮助吗？</span>
        <button
          onClick={() => sendFeedback("up")}
          className={`p-2 rounded-lg transition ${
            feedback === "up"
              ? "bg-neon-pink/20 text-neon-pink"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => sendFeedback("down")}
          className={`p-2 rounded-lg transition ${
            feedback === "down"
              ? "bg-neon-red/20 text-neon-red"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
