"use client";

import { useHistory } from "@/hooks/useHistory";
import { TrainingHistoryItem } from "@/lib/types";
import { GOAL_LABELS } from "@/lib/constants";
import { X, Trash2, Calendar, Heart, Clock } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/supabase-client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HistoryDrawer({ open, onClose }: Props) {
  const { items, loading, refresh } = useHistory();
  const [previewItem, setPreviewItem] = useState<TrainingHistoryItem | null>(null);

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const supabase = createClient();
    await supabase.from("training_plans").delete().eq("id", id);
    refresh();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-pitch-800 border-l border-pitch-600 z-50 animate-slide-left overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-pitch-800 border-b border-pitch-600 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">历史记录</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-4">
          {loading ? (
            <div className="text-center text-gray-500 py-12">加载中...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无历史记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() =>
                    setPreviewItem(
                      previewItem?.id === item.id ? null : item
                    )
                  }
                  className="glass-card-hover p-4 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {item.is_favorite && (
                          <Heart className="w-3 h-3 fill-neon-gold text-neon-gold" />
                        )}
                        <span className="text-white font-medium text-sm">
                          {GOAL_LABELS[item.form_data?.goal as keyof typeof GOAL_LABELS] || "未知目标"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleDateString("zh-CN")}
                        </span>
                        <span>{item.form_data?.position}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteItem(item.id, e)}
                      className="p-1 text-gray-600 hover:text-neon-red transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preview */}
                  {previewItem?.id === item.id && (
                    <div className="mt-3 pt-3 border-t border-pitch-600 space-y-2">
                      {item.plan_content?.map((mod: any, i: number) => (
                        <div key={i} className="text-xs">
                          <span className="text-neon-pink font-bold">{mod.title}</span>
                          <span className="text-gray-500 ml-2">
                            {mod.status === "skipped" ? "已跳过" : `${mod.exercises?.length || mod.drills?.length || mod.phases?.length || 0} 项`}
                          </span>
                        </div>
                      ))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.dispatchEvent(
                            new CustomEvent("load-history", { detail: item })
                          );
                          onClose();
                        }}
                        className="mt-2 text-xs text-neon-pink hover:underline"
                      >
                        加载此方案
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
