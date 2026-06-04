"use client";

import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { TAC_THEME } from "@/lib/tactical-theme";
import type { Canvas as FabricCanvas } from "fabric";

interface Props {
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  enabled: boolean;
}

export function GestureController({ fabricRef, enabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const prevPinchRef = useRef(false);
  const twoBaseRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled || landmarkerRef.current) return;
    let disposed = false;

    (async () => {
      try {
        // 1. Camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (disposed) { stream.getTracks().forEach(t => t.stop()); return; }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        // 2. MediaPipe WASM
        const vision = await FilesetResolver.forVisionTasks("/mediapipe/");
        if (disposed) return;

        // 3. Hand Landmarker
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/mediapipe/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (disposed) { landmarker.close(); return; }
        landmarkerRef.current = landmarker;

        setStatus("ready");

        // 4. Frame loop
        const detect = () => {
          if (disposed) return;
          const now = performance.now();
          // Throttle to ~15fps for performance
          if (now - lastTimeRef.current < 66) {
            rafRef.current = requestAnimationFrame(detect);
            return;
          }
          lastTimeRef.current = now;

          const fc = fabricRef.current;
          try {
            const results = landmarker.detectForVideo(video, now);
            if (fc && results.landmarks?.length) {
              handleLandmarks(fc, results.landmarks, twoBaseRef, prevPinchRef);
            }
          } catch {}
          rafRef.current = requestAnimationFrame(detect);
        };
        detect();
      } catch (e: any) {
        if (!disposed) {
          setStatus("error");
          setErrMsg(e.message || String(e));
        }
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="absolute bottom-14 right-2 z-40">
      <div className="relative rounded-lg overflow-hidden shadow-2xl border-2"
        style={{ width: 160, height: 120, borderColor: status === "ready" ? TAC_THEME.success : status === "error" ? TAC_THEME.error : TAC_THEME.border }}>
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted
          style={{ transform: "scaleX(-1)" }} />
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-[9px] text-red-400 p-1 text-center leading-tight">
            {errMsg}
          </div>
        )}
      </div>
      <div className="mt-1 text-[9px]" style={{ color: status === "ready" ? TAC_THEME.success : TAC_THEME.textDim }}>
        {status === "loading" ? "加载中..." : status === "ready" ? "✋ 手势追踪中" : "❌ 错误"}
      </div>
    </div>
  );
}

// ─── Gesture detection logic ──────────────────────────────

function handleLandmarks(
  fc: FabricCanvas, landmarks: any[][],
  twoBaseRef: React.MutableRefObject<number | null>,
  prevPinchRef: React.MutableRefObject<boolean>,
) {
  const W = fc.width || 1050, H = fc.height || 680;

  if (landmarks.length >= 2) {
    // Two hands → zoom
    const i1 = landmarks[0][8], i2 = landmarks[1][8];
    if (!i1 || !i2) return;
    const dist = Math.hypot(i2.x - i1.x, i2.y - i1.y);
    if (twoBaseRef.current === null) {
      twoBaseRef.current = dist;
      return;
    }
    const ratio = dist / twoBaseRef.current;
    let z = fc.getZoom() * (0.5 + 0.5 * ratio); // dampened
    z = Math.min(Math.max(z, 0.3), 5);
    const cx = ((i1.x + i2.x) / 2) * W;
    const cy = ((i1.y + i2.y) / 2) * H;
    fc.zoomToPoint({ x: cx, y: cy } as any, z);
    fc.requestRenderAll();
    return;
  }

  twoBaseRef.current = null;
  const lm = landmarks[0];
  if (!lm?.length) return;

  const thumb = lm[4], index = lm[8];
  if (!thumb || !index) return;

  const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
  const pinching = pinchDist < 0.05;
  const cx = index.x * W, cy = index.y * H;

  if (pinching && !prevPinchRef.current) {
    // Start pinch → select object under cursor
    const target = fc.getObjects().reverse().find(o => {
      const b = o.getBoundingRect();
      return cx >= b.left && cx <= b.left + b.width &&
             cy >= b.top && cy <= b.top + b.height;
    });
    if (target) {
      fc.setActiveObject(target);
      fc.requestRenderAll();
    }
  } else if (pinching && prevPinchRef.current) {
    // Hold pinch → drag
    const obj = fc.getActiveObject();
    if (obj) {
      obj.set({ left: cx - (obj.width || 0) / 2, top: cy - (obj.height || 0) / 2 } as any);
      obj.setCoords();
      fc.requestRenderAll();
    }
  }

  prevPinchRef.current = pinching;
}
