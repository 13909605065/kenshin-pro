"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { TAC_THEME } from "@/lib/tactical-theme";

// ─── Gesture detection config ───────────────────────────
const PINCH_THRESHOLD = 0.06; // thumb tip ↔ index tip normalized distance
const FIST_CURL_THRESHOLD = 0.15; // fingertip to wrist distance threshold
const CAMERA_W = 640;
const CAMERA_H = 480;

interface GestureState {
  pointing: { x: number; y: number } | null; // normalized 0..1
  pinching: boolean;
  fist: boolean;
  openPalm: boolean;
  twoHands: boolean;
  pinchDist: number; // for two-hand zoom
}

interface Props {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  onGesture?: (state: GestureState) => void;
}

export function GestureController({ canvasRef, enabled, onGesture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [camError, setCamError] = useState("");
  const gestureRef = useRef<GestureState>({
    pointing: null, pinching: false, fist: false,
    openPalm: false, twoHands: false, pinchDist: 0,
  });

  // ─── Detect gestures from landmarks ──────────────────
  const detectGestures = useCallback((landmarks: any[], canvas: HTMLCanvasElement) => {
    const W = canvas.width || 1050, H = canvas.height || 680;

    if (landmarks.length === 0) return;

    if (landmarks.length >= 2) {
      // Two hands → measure distance for zoom
      const idx1 = landmarks[0][8]; // index tip hand 1
      const idx2 = landmarks[1][8]; // index tip hand 2
      const dist = Math.sqrt((idx2.x - idx1.x) ** 2 + (idx2.y - idx1.y) ** 2);
      gestureRef.current.twoHands = true;
      gestureRef.current.pinchDist = dist;
      gestureRef.current.pointing = null;
      gestureRef.current.pinching = false;
      return;
    }

    gestureRef.current.twoHands = false;
    const lm = landmarks[0];
    if (!lm || lm.length < 21) return;

    // Key landmarks
    const thumbTip = lm[4];
    const indexTip = lm[8];
    const indexMcp = lm[5];
    const middleTip = lm[12];
    const ringTip = lm[16];
    const pinkyTip = lm[20];
    const wrist = lm[0];

    // Index finger pointing: tip extended, others curled
    const indexExtended = indexTip.y < indexMcp.y - 0.03;
    const middleCurled = middleTip.y > wrist.y + 0.05;
    const ringCurled = ringTip.y > wrist.y + 0.05;
    const pinkyCurled = pinkyTip.y > wrist.y + 0.05;
    const isPointing = indexExtended && middleCurled && ringCurled && pinkyCurled;

    // Pinch: thumb tip close to index tip
    const pinchDist = Math.sqrt(
      (thumbTip.x - indexTip.x) ** 2 + (thumbTip.y - indexTip.y) ** 2
    );
    const isPinching = pinchDist < PINCH_THRESHOLD;

    // Fist: all fingertips close to wrist
    const fingerTips = [indexTip, middleTip, ringTip, pinkyTip];
    const avgTipDist = fingerTips.reduce((sum, tip) => {
      return sum + Math.sqrt((tip.x - wrist.x) ** 2 + (tip.y - wrist.y) ** 2);
    }, 0) / 4;
    const isFist = avgTipDist < FIST_CURL_THRESHOLD;

    // Open palm: all fingers extended
    const allExtended = fingerTips.every(
      (tip, i) => {
        const mcp = lm[5 + i * 4]; // MCP joints at indices 5,9,13,17
        return tip.y < (mcp?.y || 0) - 0.02;
      }
    );
    const isOpenPalm = allExtended && !isPinching;

    // Map pointing position to canvas coordinates
    const pointing = isPointing
      ? { x: indexTip.x * W, y: indexTip.y * H }
      : null;

    gestureRef.current = {
      pointing, pinching: isPinching, fist: isFist,
      openPalm: isOpenPalm, twoHands: false, pinchDist: 0,
    };

    // ─── Emit canvas events based on gestures ─────────
    if (isPointing && pointing && canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const cx = pointing.x * scaleX + rect.left;
      const cy = pointing.y * scaleY + rect.top;

      if (isPinching) {
        // Simulate mouse down + move (drag)
        canvas.dispatchEvent(new MouseEvent("mousedown", {
          clientX: cx, clientY: cy, bubbles: true,
        }));
      }
      // Always move cursor
      canvas.dispatchEvent(new MouseEvent("mousemove", {
        clientX: cx, clientY: cy, bubbles: true,
      }));

      if (isFist) {
        // Fist = delete selected
        canvas.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Delete", bubbles: true,
        }));
        canvas.dispatchEvent(new MouseEvent("mouseup", {
          clientX: cx, clientY: cy, bubbles: true,
        }));
      }
    }

    onGesture?.(gestureRef.current);
  }, [onGesture]);

  // ─── Initialize MediaPipe Hands ─────────────────────
  useEffect(() => {
    if (!enabled || handsRef.current) return;

    const initHands = async () => {
      try {
        const hands = new Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.6,
        });

        hands.onResults((results: any) => {
          if (canvasRef.current && results.multiHandLandmarks?.length > 0) {
            detectGestures(results.multiHandLandmarks, canvasRef.current);
          }
        });

        handsRef.current = hands;

        // Start camera
        const video = videoRef.current;
        if (!video) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: CAMERA_W, height: CAMERA_H, facingMode: "user" },
        });
        video.srcObject = stream;

        const camera = new Camera(video, {
          onFrame: async () => {
            await hands.send({ image: video });
          },
          width: CAMERA_W,
          height: CAMERA_H,
        });
        cameraRef.current = camera;
        await camera.start();
        setLoaded(true);
      } catch (e: any) {
        setCamError(e.message || "摄像头不可用");
      }
    };

    initHands();

    return () => {
      cameraRef.current?.stop();
      handsRef.current?.close();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="absolute bottom-14 right-2 z-40">
      {/* Camera preview */}
      <div className="relative rounded-lg overflow-hidden shadow-2xl border-2"
        style={{
          width: 160, height: 120,
          borderColor: loaded ? TAC_THEME.success : TAC_THEME.border,
        }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover mirror"
          playsInline
          muted
          style={{ transform: "scaleX(-1)" }}
        />
        {!loaded && !camError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {camError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-[10px] text-red-400 text-center p-2">
            {camError}
          </div>
        )}
      </div>
      {/* Gesture hints */}
      {loaded && (
        <div className="mt-1 text-[9px] text-gray-500 space-y-0.5">
          <p>☝️ 指向 = 光标</p>
          <p>🤏 捏合 = 选中/拖拽</p>
          <p>✊ 握拳 = 删除</p>
          <p>🖐️ 张开 = 取消选中</p>
        </div>
      )}
    </div>
  );
}
