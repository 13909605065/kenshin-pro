import { NextRequest } from "next/server";
import { searchKnowledgeBase } from "@/lib/knowledge-base";

/**
 * GET /api/load-guidelines?phase=preseason_build&position=midfielder
 *
 * Returns evidence-based load management parameters.
 * DEFAULT values come from NSCA-CSCS / Gabbett / Foster.
 * KB OVERRIDE: if knowledge base passages contain specific numerical
 * data that differs from defaults, the KB value wins (with citation).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get("phase") || "regular_season";
  const position = searchParams.get("position") || "";

  const phaseLabels: Record<string, string> = {
    offseason: "休赛期",
    preseason_build: "季前备战期",
    regular_season: "常规赛季",
    playoffs: "附加赛",
  };
  const phaseLabel = phaseLabels[phase] || phase;

  // ── Default values (NSCA-CSCS / Gabbett 2016 / Foster 2001) ──
  const defaults = {
    trimp: {
      pitchCoefficient: 2.5,
      gymCoefficient: 2.0,
      note: "基于NSCA-CSCS训练负荷章节，外场训练代谢成本约为力量房的1.25倍",
    },
    phaseCaps: {
      offseason:     { weekCap: 1000, dayCap: 180, matchWeekCap: 1000 },
      preseason_build: { weekCap: 1500, dayCap: 300, matchWeekCap: 1200 },
      regular_season:  { weekCap: 1400, dayCap: 280, matchWeekCap: 1000 },
      playoffs:       { weekCap: 1100, dayCap: 220, matchWeekCap: 800 },
      note: "基于周期训练理论，季前备战期负荷最高(1500)，附加赛期适当减量(1100)",
    },
    acwr: {
      safeLow: 0.8,
      warningHigh: 1.3,
      dangerHigh: 1.5,
      note: "ACWR在0.8-1.3为安全区间，>1.5受伤风险显著升高(Gabbett, 2016)",
    },
    positionBaselines: {
      midfielder:     { trimp: 120, distance: 11000 },
      wingback:       { trimp: 100, distance: 10000 },
      winger:         { trimp: 100, distance: 10000 },
      forward:        { trimp: 90,  distance: 9000 },
      center_forward: { trimp: 90,  distance: 9000 },
      striker:        { trimp: 90,  distance: 9000 },
      defender:       { trimp: 85,  distance: 9000 },
      center_back:    { trimp: 85,  distance: 9000 },
      goalkeeper:     { trimp: 60,  distance: 4000 },
      note: "基于足球运动科学文献，中场球员覆盖距离最大(11km/场)，门将最低(4km/场)",
    },
    weather: {
      rainReduction: 0.10,
      note: "雨天减少约10%负荷，因为湿滑场地增加能耗且心率偏高",
    },
  };

  // ── Search knowledge base ──
  const topics = [
    "TRIMP 训练冲量 负荷 计算 系数",
    `${phaseLabel} 训练负荷 周总量 日上限 TRIMP`,
    "ACWR 急慢性负荷比 安全区间 阈值 受伤风险 Gabbett",
    "足球 位置 中场 后卫 前锋 跑动距离 比赛 负荷基准",
    "雨天 高温 环境 负荷调整 百分比",
    "力量训练 外场训练 负荷 比例 代谢",
  ];
  if (position) {
    topics.push(`${position} 跑动 负荷 比赛 距离`);
  }

  const citations: string[] = [];
  const seenBooks = new Set<string>();
  const seenPassages = new Set<string>();
  const allPassages: string[] = [];

  for (const topic of topics) {
    const results = searchKnowledgeBase(topic, 3);
    for (const r of results) {
      if (!seenPassages.has(r.passage.slice(0, 50))) {
        seenPassages.add(r.passage.slice(0, 50));
        allPassages.push(r.passage);
        if (!seenBooks.has(r.book)) {
          seenBooks.add(r.book);
          citations.push(r.book);
        }
      }
    }
  }

  // ── KB Override Engine: parse passages for specific numerical data ──

  // Try to find ACWR thresholds in KB passages
  const acwrOverrides: { safeLow?: number; warningHigh?: number; dangerHigh?: number } = {};
  for (const p of allPassages) {
    // Pattern: "ACWR.*0\.\d+.*1\.\d+" or "急慢性.*比值.*超过.*1\.\d+"
    const acwrRangeMatch = p.match(/(?:ACWR|急慢性|负荷比).*?(0\.\d+).*?(1\.\d+)/i);
    if (acwrRangeMatch) {
      const low = parseFloat(acwrRangeMatch[1]);
      const high = parseFloat(acwrRangeMatch[2]);
      if (low >= 0.6 && low <= 1.0) acwrOverrides.safeLow = low;
      if (high >= 1.2 && high <= 2.0) acwrOverrides.warningHigh = high;
    }
    const dangerMatch = p.match(/(?:ACWR|受伤风险|危险).*?[>＞]\s*(1\.\d+)/i);
    if (dangerMatch) {
      const d = parseFloat(dangerMatch[1]);
      if (d >= 1.3 && d <= 2.0) acwrOverrides.dangerHigh = d;
    }
  }

  // Try to find position distance overrides in KB
  const posDistOverrides: Record<string, number> = {};
  for (const p of allPassages) {
    const distMatch = p.match(/(中场|后卫|前锋|门将|边路).*?(\d{4,5})\s*(?:米|m)/g);
    if (distMatch) {
      for (const m of distMatch) {
        const numMatch = m.match(/(\d{4,5})/);
        const posMatch = m.match(/(中场|后卫|前锋|门将|边路)/);
        if (numMatch && posMatch) {
          const dist = parseInt(numMatch[1]);
          const pos = posMatch[1];
          if (dist >= 4000 && dist <= 13000) {
            if (pos === "中场") posDistOverrides["midfielder"] = dist;
            if (pos === "后卫") { posDistOverrides["defender"] = dist; posDistOverrides["center_back"] = dist; }
            if (pos === "前锋") { posDistOverrides["forward"] = dist; posDistOverrides["striker"] = dist; posDistOverrides["center_forward"] = dist; }
            if (pos === "门将") posDistOverrides["goalkeeper"] = dist;
          }
        }
      }
    }
  }

  // ── Apply overrides ──
  const acwr = { ...defaults.acwr };
  if (acwrOverrides.safeLow) {
    acwr.safeLow = acwrOverrides.safeLow;
    acwr.note += ` [KB覆蓋: safeLow=${acwrOverrides.safeLow}]`;
  }
  if (acwrOverrides.warningHigh) {
    acwr.warningHigh = acwrOverrides.warningHigh;
    acwr.note += ` [KB覆蓋: warningHigh=${acwrOverrides.warningHigh}]`;
  }
  if (acwrOverrides.dangerHigh) {
    acwr.dangerHigh = acwrOverrides.dangerHigh;
    acwr.note += ` [KB覆蓋: dangerHigh=${acwrOverrides.dangerHigh}]`;
  }

  const positionBaselines: Record<string, any> = { ...defaults.positionBaselines };
  for (const [key, dist] of Object.entries(posDistOverrides)) {
    if (positionBaselines[key] && typeof positionBaselines[key] === "object") {
      positionBaselines[key] = { ...positionBaselines[key], distance: dist };
    }
  }
  if (Object.keys(posDistOverrides).length > 0) {
    positionBaselines.note += ` [KB覆蓋: ${Object.keys(posDistOverrides).length}个位置距离已更新]`;
  }

  const guidelines = {
    ...defaults,
    acwr,
    positionBaselines,
    citations,
    kbOverridesApplied: Object.keys(acwrOverrides).length + Object.keys(posDistOverrides).length > 0,
    kbPassagesFound: allPassages.length,
  };

  return Response.json(guidelines);
}
