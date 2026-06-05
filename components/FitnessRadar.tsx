'use client';

/**
 * 球员体能雷达图 — Player Fitness Radar Chart
 *
 * SVG-based 雷达/蜘蛛图，展示8项体能维度 vs 同位置基准。
 * 核心理念：一目了然地识别球员的优势和短板。
 *
 * 数据来源：FitnessProfile（体能测试数据）+ 位置专项基准（NSCA CSCS, Di Salvo 2007）
 */

import React, { useMemo } from 'react';
import type { FitnessProfile } from '@/lib/fitness-store';

// ═══════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════

interface Props {
  profile: FitnessProfile;
  position: string; // Chinese position name, e.g. "中后卫", "边锋"
  bodyWeight?: number | null;
}

interface DimensionDef {
  key: string;
  label: string;
  unit: string;
  higherIsBetter: boolean;
}

interface PositionBenchmark {
  squatBW: number;
  sprint30m: number;
  cmj: number;
  benchBW: number;
  yoYoIR1: number;
  nordicCurl: number;
  proAgility: number | null; // null = N/A for GK
  bodyFat: number;
}

// ═══════════════════════════════════════════
// 8项体能维度定义
// ═══════════════════════════════════════════

const DIMENSIONS: DimensionDef[] = [
  { key: 'squatBW',   label: '深蹲/体重',      unit: 'xBW',  higherIsBetter: true },
  { key: 'sprint30m', label: '30m冲刺',        unit: 's',    higherIsBetter: false },
  { key: 'cmj',       label: 'CMJ反向跳',       unit: 'cm',  higherIsBetter: true },
  { key: 'benchBW',   label: '卧推/体重',      unit: 'xBW',  higherIsBetter: true },
  { key: 'yoYoIR1',   label: 'Yo-Yo IR1',     unit: 'm',    higherIsBetter: true },
  { key: 'nordicCurl',label: '北欧弯举',        unit: '次',  higherIsBetter: true },
  { key: 'proAgility',label: 'Pro-Agility',   unit: 's',    higherIsBetter: false },
  { key: 'bodyFat',   label: '体脂率',          unit: '%',   higherIsBetter: false },
];

// ═══════════════════════════════════════════
// 位置 → 基准数据（NSCA CSCS / Soccer Anatomy）
// ═══════════════════════════════════════════

type BenchKey = 'GK' | 'CB' | 'FB' | 'CM' | 'WF' | 'CF';

const BENCHMARKS: Record<BenchKey, PositionBenchmark> = {
  GK: { squatBW: 1.5, sprint30m: 4.2, cmj: 40, benchBW: 1.0, yoYoIR1: 1600, nordicCurl: 8,  proAgility: null, bodyFat: 14 },
  CB: { squatBW: 1.7, sprint30m: 4.2, cmj: 35, benchBW: 1.0, yoYoIR1: 1800, nordicCurl: 10, proAgility: 4.5, bodyFat: 10 },
  FB: { squatBW: 1.6, sprint30m: 4.0, cmj: 38, benchBW: 0.9, yoYoIR1: 2000, nordicCurl: 10, proAgility: 4.3, bodyFat: 10 },
  CM: { squatBW: 1.5, sprint30m: 4.1, cmj: 35, benchBW: 0.9, yoYoIR1: 2100, nordicCurl: 10, proAgility: 4.4, bodyFat: 10 },
  WF: { squatBW: 1.5, sprint30m: 3.9, cmj: 40, benchBW: 0.9, yoYoIR1: 1900, nordicCurl: 10, proAgility: 4.2, bodyFat: 10 },
  CF: { squatBW: 1.5, sprint30m: 4.1, cmj: 38, benchBW: 1.0, yoYoIR1: 1800, nordicCurl: 10, proAgility: 4.4, bodyFat: 10 },
};

// 中文位置名 → 基准键映射
function resolveBenchKey(position: string): BenchKey {
  const map: Record<string, BenchKey> = {
    '守门员': 'GK',
    '门将': 'GK',
    '中后卫': 'CB',
    '后卫': 'CB',
    '边后卫': 'FB',
    '边后卫/翼卫': 'FB',
    '翼卫': 'FB',
    '中场中路': 'CM',
    '中场': 'CM',
    '边锋': 'WF',
    '中锋': 'CF',
    '前锋': 'CF',
    'center_forward': 'CF',
    'winger': 'WF',
    'wingback': 'FB',
    'midfielder': 'CM',
    'defender': 'CB',
    'goalkeeper': 'GK',
    'forward': 'CF',
  };
  return map[position] || 'CM';
}

// ═══════════════════════════════════════════
// 从 FitnessProfile 提取维度值
// ═══════════════════════════════════════════

interface DimensionData {
  label: string;
  unit: string;
  playerValue: number | null;
  benchmark: number | null; // null = N/A
  percent: number | null; // 0-150+
  higherIsBetter: boolean;
}

function extractData(
  profile: FitnessProfile,
  benchKey: BenchKey,
  bodyWeight: number | null
): DimensionData[] {
  const bench = BENCHMARKS[benchKey];

  return DIMENSIONS.map(dim => {
    let playerValue: number | null = null;
    let benchmark: number | null = null;

    switch (dim.key) {
      case 'squatBW':
        benchmark = bench.squatBW;
        if (profile.squat1RM != null && bodyWeight && bodyWeight > 0) {
          playerValue = Math.round((profile.squat1RM / bodyWeight) * 100) / 100;
        }
        break;
      case 'sprint30m':
        benchmark = bench.sprint30m;
        if (profile.sprint30m != null) {
          playerValue = profile.sprint30m;
        }
        break;
      case 'cmj':
        benchmark = bench.cmj;
        if (profile.verticalJump != null) {
          playerValue = profile.verticalJump;
        }
        break;
      case 'benchBW':
        benchmark = bench.benchBW;
        if (profile.bench1RM != null && bodyWeight && bodyWeight > 0) {
          playerValue = Math.round((profile.bench1RM / bodyWeight) * 100) / 100;
        }
        break;
      case 'yoYoIR1':
        benchmark = bench.yoYoIR1;
        if (profile.yoYoIR1 != null) {
          playerValue = profile.yoYoIR1;
        }
        break;
      case 'nordicCurl':
        benchmark = bench.nordicCurl;
        if (profile.nordicCurlReps != null) {
          playerValue = profile.nordicCurlReps;
        }
        break;
      case 'proAgility':
        benchmark = bench.proAgility;
        if (profile.proAgility != null) {
          playerValue = profile.proAgility;
        }
        break;
      case 'bodyFat':
        benchmark = bench.bodyFat;
        if (profile.bodyFat != null) {
          playerValue = profile.bodyFat;
        }
        break;
    }

    // 计算百分比
    let percent: number | null = null;
    if (playerValue != null && benchmark != null && benchmark !== 0) {
      if (dim.higherIsBetter) {
        percent = (playerValue / benchmark) * 100;
      } else {
        // 时间/体脂：越低越好，反比计算
        percent = (benchmark / playerValue) * 100;
      }
      // 截断显示范围
      percent = Math.max(0, Math.min(200, percent));
    }

    return {
      label: dim.label,
      unit: dim.unit,
      playerValue,
      benchmark,
      percent,
      higherIsBetter: dim.higherIsBetter,
    };
  });
}

// ═══════════════════════════════════════════
// SVG 计算工具
// ═══════════════════════════════════════════

const CENTER = 160;
const MAX_RADIUS = 125;
const LABEL_RADIUS = 145;

/** 计算第i个轴的端点坐标（i: 0-7，从顶部顺时针） */
function axisPoint(i: number, total: number, radius: number): { x: number; y: number } {
  // 从顶部(-90°)开始，顺时针
  const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

// ═══════════════════════════════════════════
// 颜色定义
// ═══════════════════════════════════════════

const GREEN = '#22c55e';   // ≥100% 基准
const YELLOW = '#eab308';  // 80-100% 基准
const RED = '#ef4444';     // <80% 基准
const PLAYER_COLOR = '#d92525';
const BENCH_COLOR = '#9ca3af';
const GRID_COLOR = '#e5e7eb';
const AXIS_COLOR = '#d1d5db';
const LABEL_COLOR = '#374151';

function zoneColor(percent: number | null): string {
  if (percent == null) return GRID_COLOR;
  if (percent >= 100) return GREEN;
  if (percent >= 80) return YELLOW;
  return RED;
}

// ═══════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════

const FitnessRadar: React.FC<Props> = ({ profile, position, bodyWeight }) => {
  const benchKey = useMemo(() => resolveBenchKey(position), [position]);
  const dimensions = useMemo(
    () => extractData(profile, benchKey, bodyWeight ?? null),
    [profile, benchKey, bodyWeight]
  );

  // 过滤有效维度（基准不为null）
  const validDims = dimensions.filter(d => d.benchmark != null);
  const n = validDims.length;
  if (n === 0) {
    return (
      <div className="text-center p-6 text-gray-500">
        暂无体能数据，请先录入测试结果
      </div>
    );
  }

  // 构建多边形点串
  function buildPolygon(
    getValue: (d: DimensionData) => number | null,
    scale: number = MAX_RADIUS / 100 // 默认：percent → 半径
  ): string {
    return validDims
      .map((d, i) => {
        const val = getValue(d);
        if (val == null) return null;
        const r = val * scale;
        const pt = axisPoint(i, n, Math.min(r, MAX_RADIUS));
        return `${pt.x},${pt.y}`;
      })
      .filter(Boolean)
      .join(' ');
  }

  const benchmarkPolygon = buildPolygon(() => 100); // 基准 = 100%
  const playerPolygon = buildPolygon(d => d.percent);

  // 计算评估文本
  const assessment = useMemo(() => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];

    for (const d of dimensions) {
      if (d.percent == null || d.playerValue == null || d.benchmark == null) continue;

      const diff = d.percent - 100;
      const diffSign = diff >= 0 ? '+' : '';
      const diffPct = `${diffSign}${Math.round(diff)}%`;

      if (d.percent >= 105) {
        strengths.push(
          `${d.label}(${d.playerValue}${d.unit}, 超基准${diffPct})`
        );
      } else if (d.percent < 85) {
        weaknesses.push(
          `${d.label}(${d.playerValue}${d.unit}, 低于基准${diffPct})`
        );
      }
    }

    // 基于短板生成建议
    if (weaknesses.some(w => w.includes('北欧弯举'))) {
      suggestions.push('优先提升腘绳肌离心力量（北欧弯举渐进训练，每周2次）');
    }
    if (weaknesses.some(w => w.includes('Yo-Yo'))) {
      suggestions.push('增加有氧间歇训练（SSG + 变速跑，每周2-3次）');
    }
    if (weaknesses.some(w => w.includes('30m冲刺'))) {
      suggestions.push('加强加速技术和最大速度训练（每周1-2次短冲+增强式）');
    }
    if (weaknesses.some(w => w.includes('CMJ'))) {
      suggestions.push('强化下肢爆发力（增强式训练+奥林匹克举重衍生动作）');
    }
    if (weaknesses.some(w => w.includes('深蹲/体重'))) {
      suggestions.push('优先力量基础建设（线性周期深蹲，每周2-3次）');
    }
    if (weaknesses.some(w => w.includes('体脂率'))) {
      suggestions.push('优化体成分（营养调控+有氧基础+抗阻训练）');
    }
    if (weaknesses.some(w => w.includes('Pro-Agility'))) {
      suggestions.push('提高变向敏捷（锥桶训练+反应性灵敏训练，每周2次）');
    }
    if (weaknesses.some(w => w.includes('卧推/体重'))) {
      suggestions.push('加强上肢推力（卧推+俯卧撑渐进，每周1-2次）');
    }

    // 去重建议
    const uniqueSuggestions = Array.from(new Set(suggestions));

    return {
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
      suggestions: uniqueSuggestions.slice(0, 3),
    };
  }, [dimensions]);

  const benchName = position;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* SVG 雷达图 */}
      <svg
        viewBox={`0 0 ${CENTER * 2} ${CENTER * 2}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${position} 体能雷达图`}
      >
        {/* 背景网格：50%, 100%, 150% */}
        {[50, 100, 150].map(pct => {
          const r = (pct / 100) * MAX_RADIUS;
          const pts = validDims
            .map((_, i) => {
              const pt = axisPoint(i, n, r);
              return `${pt.x},${pt.y}`;
            })
            .join(' ');
          return (
            <polygon
              key={`grid-${pct}`}
              points={pts}
              fill="none"
              stroke={pct === 100 ? AXIS_COLOR : GRID_COLOR}
              strokeWidth={pct === 100 ? 1.5 : 0.5}
              strokeDasharray={pct === 100 ? undefined : '4 3'}
            />
          );
        })}

        {/* 轴线 */}
        {validDims.map((_, i) => {
          const outer = axisPoint(i, n, LABEL_RADIUS);
          return (
            <line
              key={`axis-${i}`}
              x1={CENTER}
              y1={CENTER}
              x2={outer.x}
              y2={outer.y}
              stroke={AXIS_COLOR}
              strokeWidth={0.5}
            />
          );
        })}

        {/* 基准多边形（虚线，灰色） */}
        <polygon
          points={benchmarkPolygon}
          fill="none"
          stroke={BENCH_COLOR}
          strokeWidth={2}
          strokeDasharray="6 3"
          opacity={0.7}
        />

        {/* 球员多边形（实线，红色，半透明填充） */}
        <polygon
          points={playerPolygon}
          fill={PLAYER_COLOR}
          fillOpacity={0.15}
          stroke={PLAYER_COLOR}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* 数据点圆点 */}
        {validDims.map((d, i) => {
          if (d.percent == null) return null;
          const r = (d.percent / 100) * MAX_RADIUS;
          const pt = axisPoint(i, n, Math.min(r, MAX_RADIUS));
          const color = zoneColor(d.percent);
          return (
            <circle
              key={`dot-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={4}
              fill={color}
              stroke="#fff"
              strokeWidth={1.5}
            />
          );
        })}

        {/* 百分比区域填充色带 */}
        {validDims.map((d, i) => {
          if (d.percent == null) return null;
          const nextI = (i + 1) % n;
          const nextD = validDims[nextI];
          if (nextD.percent == null) return null;

          const r = (d.percent / 100) * MAX_RADIUS;
          const pt = axisPoint(i, n, Math.min(r, MAX_RADIUS));
          const nextR = (nextD.percent / 100) * MAX_RADIUS;
          const nextPt = axisPoint(nextI, n, Math.min(nextR, MAX_RADIUS));

          // 只在低于基准的区域显示警示色
          const avgPct = (d.percent + nextD.percent) / 2;
          if (avgPct < 100) {
            const fillColor = avgPct < 80 ? RED : YELLOW;
            return (
              <polygon
                key={`zone-${i}`}
                points={`${CENTER},${CENTER} ${pt.x},${pt.y} ${nextPt.x},${nextPt.y}`}
                fill={fillColor}
                fillOpacity={0.08}
                stroke="none"
              />
            );
          }
          return null;
        })}

        {/* 轴标签 */}
        {validDims.map((d, i) => {
          const pt = axisPoint(i, n, LABEL_RADIUS + 10);
          // 文字对齐：根据位置调整
          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (pt.x < CENTER - 40) textAnchor = 'end';
          else if (pt.x > CENTER + 40) textAnchor = 'start';

          return (
            <text
              key={`label-${i}`}
              x={pt.x}
              y={pt.y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={600}
              fill={LABEL_COLOR}
            >
              {d.label}
            </text>
          );
        })}

        {/* 中心点 */}
        <circle cx={CENTER} cy={CENTER} r={2} fill={BENCH_COLOR} />
      </svg>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-6 mt-3 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[#d92525]" />
          <span className="text-gray-700 font-medium">你</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-gray-400 border-t-2 border-dashed border-gray-400" />
          <span className="text-gray-500">{benchName}基准</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-gray-500 text-xs">达标</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span className="text-gray-500 text-xs">80-100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-gray-500 text-xs">&lt;80%</span>
        </div>
      </div>

      {/* 评估文本 */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm space-y-2">
        {assessment.strengths.length > 0 && (
          <p>
            <span className="font-semibold text-green-700">优势：</span>
            <span className="text-gray-700">
              {assessment.strengths.join('、')}
            </span>
          </p>
        )}
        {assessment.weaknesses.length > 0 && (
          <p>
            <span className="font-semibold text-red-700">短板：</span>
            <span className="text-gray-700">
              {assessment.weaknesses.join('、')}
            </span>
          </p>
        )}
        {assessment.suggestions.length > 0 && (
          <p>
            <span className="font-semibold text-blue-700">建议：</span>
            <span className="text-gray-700">
              {assessment.suggestions.join('。')}
            </span>
          </p>
        )}
        {assessment.strengths.length === 0 && assessment.weaknesses.length === 0 && (
          <p className="text-gray-400 text-center">
            暂无足够数据生成评估，请完善体能测试数据
          </p>
        )}
      </div>
    </div>
  );
};

export default FitnessRadar;
