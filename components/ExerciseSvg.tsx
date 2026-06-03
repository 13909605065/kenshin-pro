'use client'
import { Pose } from "@mediapipe/pose";
import { useEffect, useState } from "react";

const landmarksToSvg = (landmarks: any[], width = 120, height = 160) => {
  const skeleton = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [1, 5], [5, 6], [6, 7],
    [0, 8], [8, 9], [9, 10],
    [0, 11], [11, 12],
    [11, 13], [13, 15],
    [12, 14], [14, 16]
  ];
  let dom = "";
  skeleton.forEach(([a, b]) => {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    dom += `<line x1="${p1.x * width}" y1="${p1.y * height}" x2="${p2.x * width}" y2="${p2.y * height}" stroke="#fff" stroke-width="2"/>`;
  });
  landmarks.forEach(p => {
    dom += `<circle cx="${p.x * width}" cy="${p.y * height}" r="3" fill="#fff"/>`;
  });
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${dom}</svg>`;
};

type Props = {
  name: string
}

export default function ExerciseSvg({ name }: Props) {
  const [svgHtml, setSvgHtml] = useState("");

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.onResults((res) => {
      const svg = landmarksToSvg(res.poseLandmarks);
      setSvgHtml(svg);
    });
  }, [name]);

  return (
    <div className="h-[60%] flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svgHtml }} />
  );
}