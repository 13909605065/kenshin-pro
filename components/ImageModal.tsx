"use client";

import { X, ZoomIn } from "lucide-react";
import { useEffect } from "react";

interface Props {
  open: boolean;
  imageUrl: string;
  title: string;
  onClose: () => void;
}

export function ImageModal({ open, imageUrl, title, onClose }: Props) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full bg-pitch-800/80 border border-pitch-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-neon-pink transition"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Title bar */}
      <div className="absolute top-5 left-5 z-10">
        <span className="px-3 py-1.5 rounded-lg bg-pitch-800/80 border border-pitch-600 text-sm text-white backdrop-blur">
          {title}
        </span>
      </div>

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={title}
          className="max-w-full max-h-[85vh] object-contain rounded-xl"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "";
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Bottom hint */}
      <p className="absolute bottom-6 text-white/30 text-xs">
        点击背景或按 Esc 关闭
      </p>
    </div>
  );
}
