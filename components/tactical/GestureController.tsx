"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { TAC_THEME } from "@/lib/tactical-theme";
import type { Canvas as FabricCanvas, Circle, FabricText } from "fabric";

// ─── Config ──────────────────────────────────────────
const PINCH_THRESHOLD = 0.04;   // tighter = more deliberate
const HOLD_MS = 600;            // hold pinch for select
const CURSOR_R = 14;

interface Props {
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  enabled: boolean;
}

export function GestureController({ fabricRef, enabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const [status, setStatus] = useState<"loading"|"ready"|"error">("loading");
  const [errMsg, setErrMsg] = useState("");

  // Gesture state
  const pinchStartRef = useRef<number>(0);
  const pinchActiveRef = useRef(false);
  const cursorObjRef = useRef<Circle | null>(null);
  const labelObjRef = useRef<FabricText | null>(null);
  const lastPosRef = useRef({ x: 525, y: 340 });
  const twoBaseRef = useRef<number | null>(null);
  const disposedRef = useRef(false);

  // ─── Cursor helpers ────────────────────────────────
  const ensureCursor = useCallback((fc: FabricCanvas) => {
    if (cursorObjRef.current) return;
    const c = new (require("fabric").Circle)({
      left: 525 - CURSOR_R, top: 340 - CURSOR_R, radius: CURSOR_R,
      fill: "rgba(255,255,255,0.15)", stroke: TAC_THEME.accent,
      strokeWidth: 2, strokeDashArray: [4, 4],
      selectable: false, evented: false,
    });
    (c as any)._isGestureCursor = true;
    fc.add(c);
    cursorObjRef.current = c;
  }, []);

  const removeCursor = useCallback((fc: FabricCanvas) => {
    if (cursorObjRef.current) {
      fc.remove(cursorObjRef.current);
      cursorObjRef.current = null;
    }
    if (labelObjRef.current) {
      fc.remove(labelObjRef.current);
      labelObjRef.current = null;
    }
    fc.requestRenderAll();
  }, []);

  // ─── Initialize ────────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      // Clean up cursor when disabling
      const fc = fabricRef.current;
      if (fc) removeCursor(fc);
      return;
    }
    if (landmarkerRef.current) return;
    disposedRef.current = false;

    (async () => {
      try {
        // Camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (disposedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        const video = videoRef.current;
        if (!video) { stream.getTracks().forEach(t => t.stop()); return; }
        video.srcObject = stream;
        await video.play();

        // WASM
        const vision = await FilesetResolver.forVisionTasks("/mediapipe/");
        if (disposedRef.current) return;

        // Landmarker — CPU first for compatibility
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/mediapipe/hand_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });
        if (disposedRef.current) { landmarker.close(); return; }
        landmarkerRef.current = landmarker;
        setStatus("ready");

        // Frame loop (~20fps)
        let lastT = 0;
        const detect = () => {
          if (disposedRef.current) return;
          const now = performance.now();
          if (now - lastT < 50) { rafRef.current = requestAnimationFrame(detect); return; }
          lastT = now;

          const fc = fabricRef.current;
          if (!fc || !video) { rafRef.current = requestAnimationFrame(detect); return; }

          try {
            const results = landmarker.detectForVideo(video, now);
            if (results.landmarks?.length) {
              processLandmarks(fc, results.landmarks, now);
            } else {
              // No hand detected → hide cursor
              removeCursor(fc);
              pinchStartRef.current = 0;
              pinchActiveRef.current = false;
            }
          } catch {}
          rafRef.current = requestAnimationFrame(detect);
        };
        detect();
      } catch (e: any) {
        if (!disposedRef.current) { setStatus("error"); setErrMsg(e.message || String(e)); }
      }
    })();

    return () => {
      disposedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      pinchStartRef.current = 0;
      pinchActiveRef.current = false;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="absolute bottom-14 right-2 z-40">
      <div className="relative rounded-lg overflow-hidden shadow-2xl border-2"
        style={{ width: 120, height: 90, borderColor: status === "ready" ? TAC_THEME.success : status === "error" ? TAC_THEME.error : TAC_THEME.border }}>
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted
          style={{ transform: "scaleX(-1)" }} />
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-[10px] text-gray-400">
            ⏳
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-[8px] text-red-400 p-1 text-center">
            {errMsg.slice(0, 60)}
          </div>
        )}
      </div>
      <div className="mt-1 text-[9px]" style={{ color: status === "ready" ? TAC_THEME.success : TAC_THEME.error }}>
        {status === "loading" ? "..." : status === "ready" ? "✋ 就绪" : "失败"}
      </div>
    </div>
  );

  // ─── Gesture processing ──────────────────────────────
  function processLandmarks(fc: FabricCanvas, landmarks: any[][], now: number) {
    const W = fc.width || 1050, H = fc.height || 680;

    if (landmarks.length >= 2) {
      // ─── Two hands → zoom ───
      removeCursor(fc);
      const i1 = landmarks[0][8], i2 = landmarks[1][8];
      if (!i1 || !i2) return;
      const dist = Math.hypot(i2.x - i1.x, i2.y - i1.y);
      if (twoBaseRef.current === null) { twoBaseRef.current = dist; return; }
      const ratio = dist / twoBaseRef.current;
      let z = fc.getZoom() * Math.max(0.3, Math.min(3, ratio));
      z = Math.min(Math.max(z, 0.3), 5);
      fc.zoomToPoint({ x: (i1.x + i2.x) / 2 * W, y: (i1.y + i2.y) / 2 * H } as any, z);
      fc.requestRenderAll();
      return;
    }
    twoBaseRef.current = null;

    const lm = landmarks[0];
    if (!lm?.length || !lm[4] || !lm[8]) return;

    const thumb = lm[4], index = lm[8];
    const cx = index.x * W, cy = index.y * H;
    const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
    const isPinching = pinchDist < PINCH_THRESHOLD;

    // ─── Always show cursor following index finger ───
    ensureCursor(fc);
    if (cursorObjRef.current) {
      cursorObjRef.current.set({
        left: cx - CURSOR_R, top: cy - CURSOR_R,
        stroke: isPinching ? TAC_THEME.success : TAC_THEME.accent,
      } as any);
      cursorObjRef.current.setCoords();
    }
    lastPosRef.current = { x: cx, y: cy };
    fc.requestRenderAll();

    // ─── Pinch gesture ──────────────────────────
    if (isPinching && !pinchActiveRef.current) {
      // Pinch just started
      pinchStartRef.current = now;
      pinchActiveRef.current = true;

      // Immediate: try to grab object under cursor
      const target = fc.getObjects().reverse().find(o => {
        if ((o as any)._isGestureCursor || (o as any)._isFieldBg) return false;
        const b = o.getBoundingRect();
        return cx >= b.left && cx <= b.left + b.width &&
               cy >= b.top && cy <= b.top + b.height;
      });
      if (target) {
        fc.setActiveObject(target);
        fc.requestRenderAll();
      }
    } else if (isPinching && pinchActiveRef.current) {
      // Pinch held → drag
      const holdDuration = now - pinchStartRef.current;
      if (holdDuration > HOLD_MS) {
        const obj = fc.getActiveObject();
        if (obj) {
          obj.set({ left: cx, top: cy } as any);
          obj.setCoords();
          fc.requestRenderAll();
        }
      }
    } else if (!isPinching && pinchActiveRef.current) {
      // Pinch released
      pinchActiveRef.current = false;
      pinchStartRef.current = 0;
    }
  }
}
