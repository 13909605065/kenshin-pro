"use client";

import { DrillDiagram } from "@/lib/types";
import { Flag, Circle } from "lucide-react";

interface Props {
  diagram: DrillDiagram;
}

/** Maps layout type → cone coordinate array (0-100% based) */
function getConePositions(
  layout: DrillDiagram["layout"],
  count: number
): { x: number; y: number }[] {
  const positions: Record<DrillDiagram["layout"], { x: number; y: number }[]> = {
    linear: Array.from({ length: count }, (_, i) => ({
      x: 15 + (i / Math.max(count - 1, 1)) * 70,
      y: 50,
    })),
    zigzag: Array.from({ length: count }, (_, i) => ({
      x: 10 + (i / Math.max(count - 1, 1)) * 80,
      y: i % 2 === 0 ? 30 : 70,
    })),
    square: [
      { x: 25, y: 25 },
      { x: 75, y: 25 },
      { x: 75, y: 75 },
      { x: 25, y: 75 },
    ].slice(0, count),
    t_shape: [
      { x: 10, y: 50 },
      { x: 50, y: 50 },
      { x: 90, y: 50 },
      { x: 50, y: 25 },
      { x: 50, y: 75 },
    ].slice(0, count),
    l_shape: [
      { x: 25, y: 25 },
      { x: 25, y: 75 },
      { x: 75, y: 75 },
    ].slice(0, count),
    triangle: [
      { x: 50, y: 15 },
      { x: 15, y: 80 },
      { x: 85, y: 80 },
    ].slice(0, count),
  };

  return positions[layout] || positions.linear;
}

export function FieldDiagram({ diagram }: Props) {
  const {
    layout,
    cone_count = 4,
    cone_spacing,
    total_distance,
    start_label = "起点",
    end_label = "终点",
    route_style = "solid",
    route_label,
  } = diagram;

  const cones = getConePositions(layout, Math.min(cone_count, 8));

  // Build route path
  const routePath = cones
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");

  const dashArray = route_style === "dashed" ? "6,4" : "none";

  return (
    <div className="mt-3 border border-pitch-600 rounded-xl overflow-hidden bg-pitch-800/60">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-pitch-700/80 border-b border-pitch-600">
        <span className="text-xs text-gray-400 font-medium">
          场地示意图 · {layoutLabel(layout)}
        </span>
        {total_distance && (
          <span className="text-[10px] text-gray-500">
            总距离 {total_distance}
          </span>
        )}
      </div>

      {/* SVG diagram */}
      <div className="relative bg-pitch-950 p-4">
        <svg
          viewBox="0 0 100 100"
          className="w-full max-h-[280px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background grid */}
          <defs>
            <pattern
              id="fieldGrid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="5" cy="5" r="0.3" fill="#222" />
            </pattern>
            <marker
              id="arrowhead"
              viewBox="0 0 10 7"
              refX="10"
              refY="3.5"
              markerWidth="6"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#FF2D55" />
            </marker>
          </defs>

          {/* Grid */}
          <rect width="100" height="100" fill="url(#fieldGrid)" opacity="0.5" />

          {/* Boundary dashed box */}
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            fill="none"
            stroke="#2E2E2E"
            strokeWidth="0.5"
            strokeDasharray="3,3"
            rx="2"
          />

          {/* Route path */}
          <path
            d={routePath}
            fill="none"
            stroke="#FF2D55"
            strokeWidth="1.5"
            strokeDasharray={dashArray}
            markerEnd="url(#arrowhead)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Route label (midpoint) */}
          {route_label && cones.length >= 2 && (
            <text
              x={
                (cones[Math.floor(cones.length / 2)].x +
                  cones[Math.floor(cones.length / 2) + 1]?.x ||
                  cones[Math.floor(cones.length / 2)].x) /
                2
              }
              y={
                ((cones[Math.floor(cones.length / 2)].y +
                  cones[Math.floor(cones.length / 2) + 1]?.y ||
                  cones[Math.floor(cones.length / 2)].y) /
                  2) -
                4
              }
              textAnchor="middle"
              fill="#FF2D55"
              fontSize="3"
              fontFamily="sans-serif"
              fontWeight="bold"
              opacity="0.8"
            >
              {route_label}
            </text>
          )}

          {/* Cones */}
          {cones.map((c, i) => {
            const isStart = i === 0;
            const isEnd = i === cones.length - 1;
            return (
              <g key={i}>
                {isStart || isEnd ? (
                  /* Start/End marker: larger circle */
                  <>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="3.5"
                      fill={isStart ? "#FF2D55" : "none"}
                      stroke="#FF2D55"
                      strokeWidth="0.8"
                      opacity="0.9"
                    />
                    <text
                      x={c.x}
                      y={c.y + 7}
                      textAnchor="middle"
                      fill="#FF2D55"
                      fontSize="2.5"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      {isStart ? start_label : end_label}
                    </text>
                  </>
                ) : (
                  /* Regular cone */
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="2"
                    fill="#1A1A1A"
                    stroke="#FF2D55"
                    strokeWidth="0.6"
                    opacity="0.7"
                  />
                )}
                {/* Cone number */}
                <text
                  x={c.x}
                  y={c.y + 1}
                  textAnchor="middle"
                  fill="#888"
                  fontSize="2"
                  fontFamily="sans-serif"
                >
                  {i + 1}
                </text>
              </g>
            );
          })}

          {/* Distance label between first two cones */}
          {cone_spacing && cones.length >= 2 && (
            <text
              x={(cones[0].x + cones[1].x) / 2}
              y={cones[0].y - 5}
              textAnchor="middle"
              fill="#555"
              fontSize="2.5"
              fontFamily="sans-serif"
            >
              {cone_spacing}
            </text>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-pitch-600 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-neon-pink border border-neon-pink" />
          <span className="text-[10px] text-gray-400">{start_label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border border-neon-pink" />
          <span className="text-[10px] text-gray-400">{end_label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-pitch-700 border border-neon-pink/40" />
          <span className="text-[10px] text-gray-400">标志盘</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-neon-pink rounded" />
          <span className="text-[10px] text-gray-400">跑动路线</span>
        </div>
        {cone_count > 0 && (
          <span className="text-[10px] text-gray-500 ml-auto">
            {cone_count} 个点位
          </span>
        )}
      </div>
    </div>
  );
}

function layoutLabel(layout: DrillDiagram["layout"]): string {
  const labels: Record<DrillDiagram["layout"], string> = {
    linear: "直线型",
    zigzag: "折线型",
    square: "方型",
    t_shape: "T 型",
    l_shape: "L 型",
    triangle: "三角型",
  };
  return labels[layout] || layout;
}
