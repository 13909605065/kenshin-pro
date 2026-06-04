"use client";

import { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { TAC_THEME } from "@/lib/tactical-theme";
import type { Canvas as FabricCanvas } from "fabric";

const PINCH_THRESHOLD = 0.05;
const CAM_W = 640, CAM_H = 480;

interface Props {
  /** Fabric.js canvas instance — passed directly, not via DOM */
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  enabled: boolean;
}

export function GestureController({ fabricRef, enabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const camRef = useRef<Camera | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const prevPinchRef = useRef(false);
  const twoHandBaseRef = useRef<number | null>(null);

  // ─── Initialize ─────────────────────────────────────
  useEffect(() => {
    if (!enabled || handsRef.current) return;
    let disposed = false;

    (async () => {
      try {
        // Camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: CAM_W, height: CAM_H, facingMode: "user" },
        });
        if (disposed) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = videoRef.current;
        if (!video || disposed) { stream.getTracks().forEach(t => t.stop()); return; }
        video.srcObject = stream;

        // MediaPipe Hands — load WASM from local /mediapipe/
        const hands = new Hands({
          locateFile: (f: string) => `/mediapipe/${f}`,
        });
        handsRef.current = hands;

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: any) => {
          if (disposed) return;
          const fc = fabricRef.current;
          const landmarks = results.multiHandLandmarks;
          if (!fc || !landmarks?.length) return;

          const W = fc.width || 1050, H = fc.height || 680;

          if (landmarks.length >= 2) {
            // Two-hand pinch zoom
            const i1 = landmarks[0][8], i2 = landmarks[1][8];
            const dist = Math.hypot(i2.x - i1.x, i2.y - i1.y);
            if (twoHandBaseRef.current === null) {
              twoHandBaseRef.current = dist;
            } else {
              const ratio = dist / twoHandBaseRef.current;
              let z = fc.getZoom() * ratio;
              z = Math.min(Math.max(z, 0.3), 5);
              const cx = (i1.x + i2.x) / 2 * W;
              const cy = (i1.y + i2.y) / 2 * H;
              fc.zoomToPoint({ x: cx, y: cy } as any, z);
              fc.requestRenderAll();
            }
            prevPinchRef.current = false;
            return;
          }

          twoHandBaseRef.current = null;
          const lm = landmarks[0];
          if (!lm?.length) return;

          const thumb = lm[4], index = lm[8];
          const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
          const pinching = pinchDist < PINCH_THRESHOLD;

          // Index → canvas coords
          const cx = index.x * W, cy = index.y * H;

          if (pinching && !prevPinchRef.current) {
            // Pinch started → trigger pointer down
            const target = fc.getObjects().find(o => {
              const b = o.getBoundingRect();
              return cx >= b.left && cx <= b.left + b.width &&
                     cy >= b.top && cy <= b.top + b.height;
            });
            if (target) {
              fc.setActiveObject(target);
              fc.requestRenderAll();
            }
          } else if (pinching && prevPinchRef.current && fc.getActiveObject()) {
            // Pinch held → drag active object
            const obj = fc.getActiveObject()!;
            obj.set({ left: cx, top: cy } as any);
            obj.setCoords();
            fc.requestRenderAll();
          } else if (!pinching && prevPinchRef.current) {
            // Pinch released
            fc.discardActiveObject();
            fc.requestRenderAll();
          }

          prevPinchRef.current = pinching;
        });

        // Camera loop
        const camera = new Camera(video, {
          onFrame: async () => {
            try { await hands.send({ image: video }); } catch {}
          },
          width: CAM_W,
          height: CAM_H,
        });
        camRef.current = camera;
        await camera.start();
        if (!disposed) setStatus("ready");
      } catch (e: any) {
        if (!disposed) {
          setStatus("error");
          setErrMsg(e.message || String(e));
        }
      }
    })();

    return () => {
      disposed = true;
      camRef.current?.stop();
      handsRef.current?.close();
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
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-[9px] text-red-400 text-center p-1 leading-tight">
            {errMsg || "摄像头不可用"}
          </div>
        )}
      </div>
      {status === "ready" && (
        <div className="mt-1 text-[9px] text-green-500/80">手势追踪中 ✋</div>
      )}
    </div>
  );
}
