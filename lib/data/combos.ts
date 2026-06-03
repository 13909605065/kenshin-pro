/**
 * Training Reference Data — extracted from training-library.ts
 *
 * Sections:
 *   1. Athlete Combo Library (position x goal x phase packages)
 *   2. Tactical Drill Library (by tactical theme)
 *   3. Small-Sided Game Library
 *   4. Microcycle Templates
 *   5. Coach Session Templates (league x theme)
 */

import type { DrillDiagram } from "@/lib/types";

// ═══════════════════════════════════════════════
// 1. ATHLETE COMBO LIBRARY — position×goal×phase pre-built packages
// ═══════════════════════════════════════════════

export interface AthleteCombo {
  id: string;
  label: string;
  position: string;
  goal: string;
  phase: string;
  warmup_ids: string[];
  upper_ids: string[];
  lower_ids: string[];
  core_ids: string[];
  ability_ids: string[];
  cooldown_ids: string[];
  nutrition_goal: string;
}

export const ATHLETE_COMBOS: Record<string, AthleteCombo> = {
  // ══ GOALKEEPER ══
  "combo_gk_power_preseason": {
    id: "combo_gk_power_preseason", label: "GK·爆发·季前", position: "goalkeeper", goal: "power", phase: "preseason",
    warmup_ids: ["warm-light-jog","warm-glute-activation","warm-hip-open","warm-accel-drill","warm-ball-touch","warm-nordic-curl"],
    upper_ids: ["ex-dumbbell-shoulder-press","ex-face-pull","ex-dumbbell-pullover"],
    lower_ids: ["ex-trap-bar-deadlift","ex-box-jump","ex-hip-thrust","ex-single-leg-rdl"],
    core_ids: ["ex-mb-rotational-throw","ex-cable-woodchop","ex-pallof-press"],
    ability_ids: ["ex-box-jump","ex-med-ball-slam","ex-mb-rotational-throw"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll"], nutrition_goal: "power",
  },
  "combo_gk_strength_offseason": {
    id: "combo_gk_strength_offseason", label: "GK·力量·休赛期", position: "goalkeeper", goal: "strength", phase: "offseason",
    warmup_ids: ["warm-light-jog","warm-band-activation","warm-dynamic-stretch","warm-neural","warm-ball-touch","warm-nordic-curl"],
    upper_ids: ["ex-dumbbell-shoulder-press","ex-pull-up","ex-face-pull","ex-dumbbell-pullover"],
    lower_ids: ["ex-trap-bar-deadlift","ex-back-squat","ex-nordic-hamstring","ex-hip-thrust"],
    core_ids: ["ex-mb-rotational-throw","ex-pallof-press","ex-dead-bug"],
    ability_ids: ["ex-power-clean","ex-box-jump","ex-mb-rotational-throw"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll","cool-breathing"], nutrition_goal: "strength",
  },
  "combo_gk_agility_competition": {
    id: "combo_gk_agility_competition", label: "GK·灵敏·赛季", position: "goalkeeper", goal: "agility", phase: "competition",
    warmup_ids: ["warm-light-jog","warm-glute-activation","warm-spider-man","warm-plyo-primer","warm-ball-touch","warm-nordic-curl"],
    upper_ids: ["ex-dumbbell-shoulder-press","ex-face-pull"],
    lower_ids: ["ex-box-jump","ex-single-leg-rdl","ex-nordic-hamstring"],
    core_ids: ["ex-mb-rotational-throw","ex-pallof-press","ex-dead-bug"],
    ability_ids: ["ex-box-jump","ex-mb-rotational-throw","ex-db-snatch"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll"], nutrition_goal: "agility",
  },
  // ══ DEFENDER ══
  "combo_df_strength_offseason": {
    id: "combo_df_strength_offseason", label: "后卫·力量·休赛期", position: "defender", goal: "strength", phase: "offseason",
    warmup_ids: ["warm-light-jog","warm-glute-activation","warm-hip-open","warm-neural","warm-nordic-curl"],
    upper_ids: ["ex-bench-press","ex-pull-up","ex-med-ball-slam"],
    lower_ids: ["ex-back-squat","ex-trap-bar-deadlift","ex-bulgarian-split-squat","ex-nordic-hamstring"],
    core_ids: ["ex-plank","ex-hanging-leg-raise","ex-pallof-press"],
    ability_ids: ["ex-power-clean","ex-box-jump","ex-sled-sprint"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll","cool-breathing"], nutrition_goal: "strength",
  },
  "combo_df_power_preseason": {
    id: "combo_df_power_preseason", label: "后卫·爆发·季前", position: "defender", goal: "power", phase: "preseason",
    warmup_ids: ["warm-light-jog","warm-band-activation","warm-dynamic-stretch","warm-plyo-primer","warm-nordic-curl"],
    upper_ids: ["ex-bench-press","ex-pull-up","ex-med-ball-slam"],
    lower_ids: ["ex-back-squat","ex-box-jump","ex-bulgarian-split-squat","ex-nordic-hamstring"],
    core_ids: ["ex-plank","ex-pallof-press","ex-cable-woodchop"],
    ability_ids: ["ex-power-clean","ex-box-jump","ex-med-ball-slam"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll"], nutrition_goal: "power",
  },
  "combo_df_speed_competition": {
    id: "combo_df_speed_competition", label: "后卫·速度·赛季", position: "defender", goal: "speed", phase: "competition",
    warmup_ids: ["warm-light-jog","warm-glute-activation","warm-hip-open","warm-accel-drill","warm-nordic-curl"],
    upper_ids: ["ex-pull-up","ex-dumbbell-shoulder-press"],
    lower_ids: ["ex-front-squat","ex-sled-sprint","ex-nordic-hamstring"],
    core_ids: ["ex-plank","ex-pallof-press"],
    ability_ids: ["ex-sled-sprint","ex-box-jump","ex-bulgarian-split-squat"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll"], nutrition_goal: "speed",
  },
  "combo_df_combat_competition": {
    id: "combo_df_combat_competition", label: "后卫·对抗·赛季", position: "defender", goal: "combat", phase: "competition",
    warmup_ids: ["warm-light-jog","warm-band-activation","warm-hip-open","warm-neural","warm-nordic-curl"],
    upper_ids: ["ex-bench-press","ex-pull-up","ex-face-pull"],
    lower_ids: ["ex-trap-bar-deadlift","ex-hip-thrust","ex-nordic-hamstring"],
    core_ids: ["ex-plank","ex-pallof-press","ex-hanging-leg-raise"],
    ability_ids: ["ex-trap-bar-deadlift","ex-pallof-press","ex-hip-thrust"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll"], nutrition_goal: "strength",
  },
  // ══ MIDFIELDER ══
  "combo_mf_mas_endurance_preseason": {
    id: "combo_mf_mas_endurance_preseason", label: "中场·耐力·季前", position: "midfielder", goal: "mas_endurance", phase: "preseason",
    warmup_ids: ["warm-light-jog","warm-agility-ladder","warm-dynamic-stretch","warm-neural","warm-ball-touch","warm-nordic-curl"],
    upper_ids: ["ex-dumbbell-shoulder-press","ex-pull-up","ex-cable-row"],
    lower_ids: ["ex-front-squat","ex-single-leg-rdl","ex-nordic-hamstring","ex-box-jump"],
    core_ids: ["ex-hanging-leg-raise","ex-cable-woodchop","ex-dead-bug"],
    ability_ids: ["ex-sled-sprint","ex-box-jump","ex-front-squat"],
    cooldown_ids: ["cool-light-jog","cool-static-stretch","cool-foam-roll"], nutrition_goal: "endurance",
  },
  "combo_mf_power_preseason": {
    id: "combo_mf_power_preseason", label: "中场·爆发·季前", position: "midfielder", goal: "power", phase: "preseason",
    warmup_ids: ["warm-light-jog","warm-band-activation","warm-hip-open","warm-plyo-primer","warm-ball-touch","warm-nordic-curl"],
    upper_ids: ["ex-dumbbell-shoulder-press","ex-pull-up","ex-med-ball-slam"],
    lower_ids: ["ex-front-squat","ex-power-clean","ex-nordic-hamstring","ex-box-jump"],
    core_ids: ["ex-hanging-leg-raise","ex-cable-woodchop","ex-dead-bug"],
    ability_ids: ["ex-power-clean","ex-box-jump","ex-med-ball-slam"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll"], nutrition_goal: "power",
  },
  "combo_mf_strength_offseason": {
    id: "combo_mf_strength_offseason", label: "中场·力量·休赛期", position: "midfielder", goal: "strength", phase: "offseason",
    warmup_ids: ["warm-light-jog","warm-glute-activation","warm-dynamic-stretch","warm-neural","warm-nordic-curl"],
    upper_ids: ["ex-dumbbell-shoulder-press","ex-pull-up","ex-cable-row","ex-face-pull"],
    lower_ids: ["ex-front-squat","ex-trap-bar-deadlift","ex-nordic-hamstring","ex-hip-thrust"],
    core_ids: ["ex-hanging-leg-raise","ex-cable-woodchop","ex-dead-bug"],
    ability_ids: ["ex-back-squat","ex-trap-bar-deadlift","ex-hip-thrust"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll","cool-breathing"], nutrition_goal: "strength",
  },
  "combo_mf_agility_competition": {
    id: "combo_mf_agility_competition", label: "中场·灵敏·赛季", position: "midfielder", goal: "agility", phase: "competition",
    warmup_ids: ["warm-light-jog","warm-agility-ladder","warm-hip-open","warm-accel-drill","warm-ball-touch","warm-nordic-curl"],
    upper_ids: ["ex-dumbbell-shoulder-press","ex-cable-row"],
    lower_ids: ["ex-front-squat","ex-single-leg-rdl","ex-nordic-hamstring"],
    core_ids: ["ex-hanging-leg-raise","ex-dead-bug","ex-cable-woodchop"],
    ability_ids: ["ex-dumbbell-lunges","ex-single-leg-rdl","ex-dead-bug"],
    cooldown_ids: ["cool-light-jog","cool-static-stretch"], nutrition_goal: "agility",
  },
  // ══ FORWARD ══
  "combo_fw_power_preseason": {
    id: "combo_fw_power_preseason", label: "前锋·爆发·季前", position: "forward", goal: "power", phase: "preseason",
    warmup_ids: ["warm-light-jog","warm-band-activation","warm-dynamic-stretch","warm-plyo-primer","warm-ball-touch","warm-nordic-curl"],
    upper_ids: ["ex-bench-press","ex-med-ball-slam","ex-dumbbell-shoulder-press"],
    lower_ids: ["ex-back-squat","ex-power-clean","ex-bulgarian-split-squat","ex-nordic-hamstring"],
    core_ids: ["ex-hanging-leg-raise","ex-plank","ex-cable-woodchop"],
    ability_ids: ["ex-power-clean","ex-box-jump","ex-med-ball-slam"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll"], nutrition_goal: "power",
  },
  "combo_fw_speed_competition": {
    id: "combo_fw_speed_competition", label: "前锋·速度·赛季", position: "forward", goal: "speed", phase: "competition",
    warmup_ids: ["warm-light-jog","warm-glute-activation","warm-hip-open","warm-accel-drill","warm-ball-dribble","warm-nordic-curl"],
    upper_ids: ["ex-dumbbell-shoulder-press","ex-med-ball-slam"],
    lower_ids: ["ex-back-squat","ex-sled-sprint","ex-nordic-hamstring","ex-box-jump"],
    core_ids: ["ex-hanging-leg-raise","ex-plank"],
    ability_ids: ["ex-sled-sprint","ex-box-jump","ex-bulgarian-split-squat"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll"], nutrition_goal: "speed",
  },
  "combo_fw_strength_offseason": {
    id: "combo_fw_strength_offseason", label: "前锋·力量·休赛期", position: "forward", goal: "strength", phase: "offseason",
    warmup_ids: ["warm-light-jog","warm-glute-activation","warm-dynamic-stretch","warm-neural","warm-nordic-curl"],
    upper_ids: ["ex-bench-press","ex-pull-up","ex-med-ball-slam","ex-dumbbell-shoulder-press"],
    lower_ids: ["ex-back-squat","ex-trap-bar-deadlift","ex-bulgarian-split-squat","ex-nordic-hamstring"],
    core_ids: ["ex-hanging-leg-raise","ex-plank","ex-pallof-press"],
    ability_ids: ["ex-back-squat","ex-trap-bar-deadlift","ex-bench-press"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll","cool-breathing"], nutrition_goal: "strength",
  },
  "combo_fw_combat_competition": {
    id: "combo_fw_combat_competition", label: "前锋·对抗·赛季", position: "forward", goal: "combat", phase: "competition",
    warmup_ids: ["warm-light-jog","warm-band-activation","warm-hip-open","warm-neural","warm-ball-touch","warm-nordic-curl"],
    upper_ids: ["ex-bench-press","ex-med-ball-slam","ex-face-pull"],
    lower_ids: ["ex-back-squat","ex-hip-thrust","ex-nordic-hamstring"],
    core_ids: ["ex-plank","ex-pallof-press","ex-cable-woodchop"],
    ability_ids: ["ex-trap-bar-deadlift","ex-pallof-press","ex-hip-thrust"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll"], nutrition_goal: "strength",
  },
  // ══ WINGBACK ══
  "combo_wb_speed_competition": {
    id: "combo_wb_speed_competition", label: "翼卫·速度·赛季", position: "wingback", goal: "speed", phase: "competition",
    warmup_ids: ["warm-light-jog","warm-glute-activation","warm-dynamic-stretch","warm-accel-drill","warm-ball-dribble","warm-nordic-curl"],
    upper_ids: ["ex-pull-up","ex-dumbbell-shoulder-press","ex-cable-row"],
    lower_ids: ["ex-front-squat","ex-dumbbell-lunges","ex-nordic-hamstring","ex-sled-sprint"],
    core_ids: ["ex-plank","ex-pallof-press","ex-hanging-leg-raise"],
    ability_ids: ["ex-sled-sprint","ex-box-jump","ex-dumbbell-lunges"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll"], nutrition_goal: "speed",
  },
  "combo_wb_mas_endurance_preseason": {
    id: "combo_wb_mas_endurance_preseason", label: "翼卫·耐力·季前", position: "wingback", goal: "mas_endurance", phase: "preseason",
    warmup_ids: ["warm-light-jog","warm-agility-ladder","warm-dynamic-stretch","warm-neural","warm-ball-dribble","warm-nordic-curl"],
    upper_ids: ["ex-pull-up","ex-dumbbell-shoulder-press","ex-cable-row"],
    lower_ids: ["ex-front-squat","ex-dumbbell-lunges","ex-nordic-hamstring","ex-box-jump"],
    core_ids: ["ex-plank","ex-pallof-press","ex-hanging-leg-raise"],
    ability_ids: ["ex-front-squat","ex-leg-press","ex-cable-row"],
    cooldown_ids: ["cool-light-jog","cool-static-stretch","cool-foam-roll"], nutrition_goal: "endurance",
  },
  "combo_wb_power_preseason": {
    id: "combo_wb_power_preseason", label: "翼卫·爆发·季前", position: "wingback", goal: "power", phase: "preseason",
    warmup_ids: ["warm-light-jog","warm-band-activation","warm-hip-open","warm-plyo-primer","warm-ball-dribble","warm-nordic-curl"],
    upper_ids: ["ex-pull-up","ex-dumbbell-shoulder-press","ex-med-ball-slam"],
    lower_ids: ["ex-front-squat","ex-power-clean","ex-nordic-hamstring","ex-box-jump"],
    core_ids: ["ex-plank","ex-pallof-press","ex-cable-woodchop"],
    ability_ids: ["ex-power-clean","ex-box-jump","ex-med-ball-slam"],
    cooldown_ids: ["cool-static-stretch","cool-foam-roll"], nutrition_goal: "power",
  },
  "combo_wb_agility_competition": {
    id: "combo_wb_agility_competition", label: "翼卫·灵敏·赛季", position: "wingback", goal: "agility", phase: "competition",
    warmup_ids: ["warm-light-jog","warm-agility-ladder","warm-hip-open","warm-accel-drill","warm-ball-dribble","warm-nordic-curl"],
    upper_ids: ["ex-pull-up","ex-cable-row"],
    lower_ids: ["ex-front-squat","ex-dumbbell-lunges","ex-nordic-hamstring"],
    core_ids: ["ex-plank","ex-pallof-press","ex-dead-bug"],
    ability_ids: ["ex-dumbbell-lunges","ex-single-leg-rdl","ex-dead-bug"],
    cooldown_ids: ["cool-light-jog","cool-static-stretch"], nutrition_goal: "agility",
  },
};

/** Resolve athlete combo → full module data */
export function resolveCombo(comboId: string): AthleteCombo | null {
  return ATHLETE_COMBOS[comboId] || null;
}

/** Find best combo for position+goal+phase */
export function findCombo(position: string, goal: string, phase: string): AthleteCombo | null {
  const directKey = `combo_${position}_${goal}_${phase}`;
  if (ATHLETE_COMBOS[directKey]) return ATHLETE_COMBOS[directKey];
  // Fallback: same position+goal, different phase
  const prefix = `combo_${position}_${goal}_`;
  const fallback = Object.keys(ATHLETE_COMBOS).find(k => k.startsWith(prefix));
  return fallback ? ATHLETE_COMBOS[fallback] : null;
}

// ═══════════════════════════════════════════════
// 2. TACTICAL DRILL LIBRARY (by tactical theme)
// ═══════════════════════════════════════════════

export interface TacticalDrillRef {
  id: string;
  name: string;
  theme: string;
  duration: number;
  area: string;
  players: string;
  description: string;
  coaching_points: string[];
  progression: string;
  regression: string;
  diagram_hint: string;
  diagram?: DrillDiagram;
}

export const TACTICAL_DRILL_LIBRARY: Record<string, TacticalDrillRef> = {
  // ══ PRESSING ══
  "tac-pressing-trigger": {
    id: "tac-pressing-trigger", name: "压迫触发信号训练", theme: "pressing",
    duration: 15, area: "40×30m 半场", players: "8v8+GK",
    description: "教练传出不同信号球(高空/地滚/慢速)，防守方识别触发信号后全队统一前压逼抢",
    coaching_points: ["识别压迫触发信号(回传/慢速球/背身接球)","全队同步前压","封锁回传路线","第一道防线封堵"],
    progression: "增加进攻方可回传门将重组",
    regression: "限定触发信号为单一类型(仅回传时压迫)",
    diagram_hint: "半场8v8，教练在边线发球",
    diagram: { layout: "square", cone_count: 4, cone_spacing: "40×30m", total_distance: "半场", start_label: "防守方", end_label: "进攻方", route_style: "solid", route_label: "压迫方向" },
  },
  "tac-counter-press": {
    id: "tac-counter-press", name: "丢球后5秒反抢", theme: "pressing",
    duration: 15, area: "30×30m", players: "6v6",
    description: "控球方丢球后立即反抢(5秒规则)，抢回后快速转换进攻",
    coaching_points: ["丢球瞬间最近2-3人立即围抢","切断第一条传球线","抢回后快速向前","5秒后未抢回则退守"],
    progression: "缩小至20×20m增加对抗密度",
    regression: "7v5人数优势反抢",
    diagram_hint: "30×30m方格，6v6自由对抗",
    diagram: { layout: "square", cone_count: 4, cone_spacing: "30×30m", total_distance: "方格", start_label: "防守方", end_label: "进攻方", route_style: "solid", route_label: "反抢方向" },
  },
  "tac-transition-def": {
    id: "tac-transition-def", name: "攻转守瞬间落位", theme: "pressing",
    duration: 15, area: "半场", players: "8v6+GK",
    description: "进攻方8人从半场线出发进攻，丢球后立刻转为6人防守阵型，阻止对方快速反击",
    coaching_points: ["丢球后前场3人就地延缓","中场2人回撤堵截","后卫线保持紧凑","优先防直塞球"],
    progression: "进攻方人数减至7人增加防守压力",
    regression: "限制反击方只能用2脚触球",
    diagram_hint: "半场8v6+GK，进攻方从中线出发",
    diagram: { layout: "square", cone_count: 4, cone_spacing: "半场", total_distance: "半场", start_label: "进攻方", end_label: "防守落位", route_style: "solid", route_label: "回防路线" },
  },
  // ══ POSSESSION ══
  "tac-3-zone-possession": {
    id: "tac-3-zone-possession", name: "三区控球轮转", theme: "possession",
    duration: 20, area: "40×30m 分3区", players: "9v6",
    description: "场地分3个横区，控球方必须在每个区完成3次传球后方可推进至下一区",
    coaching_points: ["三角站位保持","传球后移动接应","支援角度>90°","观察下一区空间"],
    progression: "限制2脚触球，缩小区域宽度",
    regression: "取消传球次数限制，允许自由推进",
    diagram_hint: "40×30m分3横区，9v6控球推进",
    diagram: { layout: "square", cone_count: 4, cone_spacing: "40×30m", total_distance: "三区", start_label: "后场", end_label: "前场", route_style: "dashed", route_label: "推进方向" },
  },
  "tac-rondo-4v2": {
    id: "tac-rondo-4v2", name: "4v2抢圈进阶", theme: "possession",
    duration: 15, area: "8×8m方格", players: "4v2×4组",
    description: "经典抢圈升级：4v2抢圈，限定2脚触球，防守方抢断后与失误者互换角色",
    coaching_points: ["第一脚触球向开阔空间","提前观察(头不停摆)","传球力度适中","支援跑动不停"],
    progression: "缩小至6×6m或限定1脚触球",
    regression: "5v2增加控球人数",
    diagram_hint: "8×8m方格×4，4v2抢圈",
    diagram: { layout: "square", cone_count: 4, cone_spacing: "8×8m×4", total_distance: "32×32m", start_label: "控球方4人", end_label: "抢球方2人", route_style: "dashed" },
  },
  "tac-positional-rotation": {
    id: "tac-positional-rotation", name: "位置轮转控球", theme: "possession",
    duration: 15, area: "30×30m", players: "8v8",
    description: "控球中要求球员按预设顺序轮转位置(如边后卫↔边前卫↔中场)，保持阵型结构",
    coaching_points: ["轮转时机(队友补位到位后再移动)","保持三角结构","轮转后快速适应新位置","沟通喊话"],
    progression: "双人同时轮转增加复杂度",
    regression: "固定位置控球不轮转",
    diagram_hint: "30×30m，8v8位置轮转控球",
    diagram: { layout: "triangle", cone_count: 3, cone_spacing: "30m", total_distance: "30×30m", start_label: "起始位", end_label: "轮转位", route_style: "dashed" },
  },
  // ══ COUNTERATTACK ══
  "tac-counter-3v2": {
    id: "tac-counter-3v2", name: "3v2快速反击", theme: "counterattack",
    duration: 15, area: "半场", players: "3v2+GK×3组",
    description: "从中线出发3v2反击，8秒内完成射门。轮转进行",
    coaching_points: ["反击第一传要快(3秒内)","持球人吸引防守后分球","无球跑动拉开宽度","射门果断"],
    progression: "增加回追防守者(3v3)",
    regression: "取消时间限制，强调决策质量",
    diagram_hint: "半场3v2+GK，8秒反击",
    diagram: { layout: "linear", cone_count: 3, cone_spacing: "半场", start_label: "断球点", end_label: "球门", route_style: "solid", route_label: "反击路线" },
  },
  "tac-transition-att": {
    id: "tac-transition-att", name: "守转攻快速推进", theme: "counterattack",
    duration: 15, area: "全场2/3", players: "7v7+2GK",
    description: "防守方断球后5秒内必须通过半场，7秒内完成射门",
    coaching_points: ["断球后第一脚传球向前","边路拉开提供宽度","中路插上支援","快速决策(传/带/射)"],
    progression: "限定只能地面传球",
    regression: "取消时间限制，允许门将参与组织",
    diagram_hint: "全场2/3，7v7+2GK，快速转换",
    diagram: { layout: "linear", cone_count: 3, cone_spacing: "半场", start_label: "断球区", end_label: "对方球门", route_style: "solid", route_label: "快攻路线" },
  },
  // ══ DEFENDING ══
  "tac-defensive-block": {
    id: "tac-defensive-block", name: "防守阵型保持", theme: "defending",
    duration: 15, area: "半场", players: "8v8+GK",
    description: "防守方保持4-4-2阵型，跟随球横向移动，保持防线间距和纵深",
    coaching_points: ["防线与中线间距≤25m","横向移动时整体滑动","中后卫指挥造越位","中场封堵直塞路线"],
    progression: "进攻方加快传球速度",
    regression: "进攻方慢速传导，强调防守移动形态",
    diagram_hint: "半场8v8，防守方4-4-2阵型保持",
  },
  "tac-1v1-defending": {
    id: "tac-1v1-defending", name: "1v1防守通道", theme: "defending",
    duration: 15, area: "10×15m通道×4", players: "1v1×4组",
    description: "防守者练习延缓-引导-抢断三步：半蹲姿态，引导进攻方向外侧，在对方触球后出脚",
    coaching_points: ["侧身防守姿态","引导向外侧","抢断时机=对手触球后","保持耐心不急出脚"],
    progression: "更窄通道(8×12m)增加难度",
    regression: "进攻方仅能用非惯用脚",
    diagram_hint: "10×15m通道×4，1v1轮转",
    diagram: { layout: "linear", cone_count: 4, cone_spacing: "10×15m", total_distance: "15m", start_label: "进攻起点", end_label: "防守底线", route_style: "solid", route_label: "突破路线" },
  },
  // ══ SET PIECES ══
  "tac-corner-routine": {
    id: "tac-corner-routine", name: "角球进攻套路", theme: "set_pieces",
    duration: 15, area: "禁区+角球区", players: "8v6+GK",
    description: "练习3种角球套路：近门柱冲顶、远门柱摆渡、短角球配合",
    coaching_points: ["跑动时机(球飞行中启动)","阻挡/摆脱盯人","攻击球而非等球","补射意识"],
    progression: "增加防守方人数至8人",
    regression: "无防守练跑位路线",
    diagram_hint: "禁区8v6+GK，角球套路演练",
    diagram: { layout: "triangle", cone_count: 3, cone_spacing: "禁区", total_distance: "角球区", start_label: "角球点", end_label: "球门", route_style: "dashed", route_label: "角球弧线" },
  },
  "tac-set-piece-defend": {
    id: "tac-set-piece-defend", name: "定位球防守组织", theme: "set_pieces",
    duration: 15, area: "禁区", players: "8v8+GK",
    description: "区域+盯人混合防守：6人区域(近中远门柱各2)+2人盯人，练习解围和快速外压",
    coaching_points: ["防守站位(球与球门之间)","第一点头球解围","解围后全线上压","门将指挥"],
    progression: "连续发球增加反应要求",
    regression: "慢速发球练站位",
    diagram_hint: "禁区8v8+GK，定位球防守",
  },
  // ══ POSITIONAL ATTACK ══
  "tac-overload-wing": {
    id: "tac-overload-wing", name: "边路人数优势创造", theme: "positional_attack",
    duration: 15, area: "半场一侧", players: "5v4",
    description: "在边路区域创造3v2人数优势，通过墙式配合突破后传中，禁区2-3人包抄",
    coaching_points: ["第三人多跑位创造传接角度","墙式配合后的冲刺","传中时机(早传vs下底)","禁区包抄层次"],
    progression: "限定传中前不超过4次传球",
    regression: "边路3v2不设防守中场",
    diagram_hint: "半场一侧5v4，边路突破传中",
    diagram: { layout: "l_shape", cone_count: 3, cone_spacing: "边路30m", start_label: "边路起点", end_label: "禁区", route_style: "dashed", route_label: "传中路线" },
  },
  "tac-third-man": {
    id: "tac-third-man", name: "第三人跑位配合", theme: "positional_attack",
    duration: 15, area: "40×30m", players: "8v6",
    description: "通过第三人的无球跑动打破防线：A传B→B回做C(第三人)→C直塞插上的A",
    coaching_points: ["第三人的跑动时机","第一传吸引防守移动","回做球质量","直塞穿透防线"],
    progression: "增加至2名防守中场施压",
    regression: "无防守练配合路线",
    diagram_hint: "40×30m，8v6第三人配合",
    diagram: { layout: "square", cone_count: 4, cone_spacing: "40×30m", total_distance: "40m", start_label: "控球方", end_label: "第三人跑位", route_style: "dashed", route_label: "第三人数跑动" },
  },
  // ══ SHOOTING ══
  "tac-combination-finish": {
    id: "tac-combination-finish", name: "配合后射门", theme: "shooting",
    duration: 15, area: "禁区弧-球门", players: "分组轮转",
    description: "墙式二过一→禁区弧接球→一脚/两脚射门。左右两侧交替，练多种射门方式",
    coaching_points: ["第一脚触球向射门方向","观察门将站位","低平球优先(难扑)","跟进补射"],
    progression: "增加防守者干扰",
    regression: "无防守定点射门",
    diagram_hint: "禁区弧-球门，墙式配合后射门",
    diagram: { layout: "linear", cone_count: 3, cone_spacing: "禁区弧-球门", total_distance: "约20m", start_label: "传球起点", end_label: "球门", route_style: "solid", route_label: "墙式配合" },
  },
  "tac-crossing-finish": {
    id: "tac-crossing-finish", name: "传中包抄射门", theme: "shooting",
    duration: 15, area: "半场", players: "6v4+GK",
    description: "边路传中+禁区内3人包抄(近门柱/点球点/远门柱)，练习不同传中类型",
    coaching_points: ["包抄跑位层次(前中后三点)","攻击传中球路线","头球/凌空/停射选择","补射意识"],
    progression: "增加2名防守中卫",
    regression: "无防守传中+包抄",
    diagram_hint: "半场6v4+GK，传中包抄",
    diagram: { layout: "square", cone_count: 4, cone_spacing: "半场6v4", total_distance: "半场", start_label: "边路传中区", end_label: "球门", route_style: "dashed", route_label: "传中路线" },
  },
  // ══ CROSSING ══
  "tac-overlap-cross": {
    id: "tac-overlap-cross", name: "套边传中", theme: "crossing",
    duration: 15, area: "半场边路", players: "3v2×2组",
    description: "边后卫套边插上→接球→传中，禁区2人包抄。左右两侧交替",
    coaching_points: ["套边时机(持球人吸引防守后)","传中前观察禁区内跑位","传中类型选择(低平/高球/弧线)","回防意识"],
    progression: "增加防守边前卫回追",
    regression: "无防守练套边+传中节奏",
    diagram_hint: "半场边路3v2，套边传中",
    diagram: { layout: "l_shape", cone_count: 3, cone_spacing: "边路30m", total_distance: "约40m", start_label: "边路起点", end_label: "禁区", route_style: "dashed", route_label: "套边→传中" },
  },
};

/** Get tactical drills by theme */
export function getTacticalDrillsByTheme(theme: string): TacticalDrillRef[] {
  return Object.values(TACTICAL_DRILL_LIBRARY).filter(d => d.theme === theme);
}

// ═══════════════════════════════════════════════
// 3. SMALL-SIDED GAME LIBRARY
// ═══════════════════════════════════════════════

export interface SSGRef {
  id: string;
  name: string;
  focus: string;
  duration: number;
  area: string;
  players: string;
  rules: string;
  coaching_focus: string[];
}

export const SSG_LIBRARY: Record<string, SSGRef> = {
  "ssg-4v4-pressing": {
    id: "ssg-4v4-pressing", name: "4v4高压小场", focus: "pressing",
    duration: 20, area: "25×20m", players: "4v4+2门将",
    rules: "4门小场，丢球后5秒内反抢。进球得1分，反抢后进球得2分",
    coaching_focus: ["压迫触发时机","反抢强度","攻守转换速度"],
  },
  "ssg-6v6-possession": {
    id: "ssg-6v6-possession", name: "6v6控球比赛", focus: "possession",
    duration: 20, area: "40×30m", players: "6v6+2GK",
    rules: "完成连续6次传球得1分(不进球也算)。限制3脚触球。正常进球得1分",
    coaching_focus: ["控球耐心","支援角度","穿透传球时机"],
  },
  "ssg-5v5-transition": {
    id: "ssg-5v5-transition", name: "5v5转换比赛", focus: "transition",
    duration: 20, area: "30×25m", players: "5v5+2GK",
    rules: "进攻击中门框范围即得分(鼓励射门)。攻守转换时全场球员必须越过中线",
    coaching_focus: ["攻转守回防速度","守转攻前插速度","转换瞬间决策"],
  },
  "ssg-7v7-tactical": {
    id: "ssg-7v7-tactical", name: "7v7战术比赛", focus: "tactical",
    duration: 25, area: "60×40m(半场)", players: "7v7+2GK",
    rules: "标准规则。教练可在死球时叫停纠正战术位置。重点演练当天战术主题",
    coaching_focus: ["阵型保持","战术纪律","位置职责"],
  },
  "ssg-3v3-finishing": {
    id: "ssg-3v3-finishing", name: "3v3终结比赛", focus: "finishing",
    duration: 15, area: "20×15m", players: "3v3+2GK",
    rules: "小门或无门将(射入小球门)。进球后继续控球。限定射门须在罚球区线内",
    coaching_focus: ["射门果断性","第一脚触球","禁区内冷静"],
  },
  "ssg-8v8-phase": {
    id: "ssg-8v8-phase", name: "8v8阶段对抗", focus: "phase_play",
    duration: 25, area: "全场2/3", players: "8v8+2GK",
    rules: "分阶段进行：前10min练进攻组织→后10min练防守落位。可随时叫停",
    coaching_focus: ["阶段目标达成","整体移动","教练干预时机"],
  },
  "ssg-4v4-plus-2": {
    id: "ssg-4v4-plus-2", name: "4v4+2中立球员", focus: "possession",
    duration: 20, area: "30×25m", players: "4v4+2中立+2GK",
    rules: "2名中立球员始终属于控球方。限制2脚触球。中立球员不参与射门",
    coaching_focus: ["利用人数优势","中立球员接应角度","快速传导"],
  },
};

// ═══════════════════════════════════════════════
// 4. MICROCYCLE TEMPLATES
// ═══════════════════════════════════════════════

export interface MicrocycleDayRef {
  day: string;
  focus: string;
  intensity: "极低" | "低" | "中低" | "中" | "中高" | "高" | "极高";
  duration: number;
  session_type: string;
}

export interface MicrocycleRef {
  id: string;
  label: string;
  description: string;
  match_day: string;
  days: MicrocycleDayRef[];
}

export const MICROCYCLE_TEMPLATES: Record<string, MicrocycleRef> = {
  "microcycle-1game": {
    id: "microcycle-1game", label: "一周一赛标准微周期",
    description: "标准职业队一周一赛节奏。周四比赛假设，适用于业余-职业各级别",
    match_day: "周日",
    days: [
      { day: "MD+1 周一", focus: "恢复再生(泳池/单车/泡沫轴)+轻技术", intensity: "极低", duration: 45, session_type: "恢复" },
      { day: "MD+2 周二", focus: "恢复+个人技术+弱链纠正", intensity: "低", duration: 60, session_type: "技术" },
      { day: "MD-3 周四", focus: "战术主题演练+速度耐力/爆发力", intensity: "中高", duration: 75, session_type: "战术+体能" },
      { day: "MD-2 周五", focus: "定位球攻防+小组配合+中等强度体能", intensity: "中", duration: 60, session_type: "定位球+技术" },
      { day: "MD-1 周六", focus: "赛前激活+战术确认+定位球复习", intensity: "低", duration: 45, session_type: "激活" },
      { day: "MD 周日", focus: "比赛日", intensity: "极高", duration: 90, session_type: "比赛" },
    ],
  },
  "microcycle-2game": {
    id: "microcycle-2game", label: "一周双赛压缩微周期",
    description: "周中+周末双赛。用于职业队密集赛程。恢复优先，训练量降至最低有效剂量",
    match_day: "周三+周日",
    days: [
      { day: "MD+1 周一", focus: "恢复再生", intensity: "极低", duration: 30, session_type: "恢复" },
      { day: "MD-1 周二", focus: "赛前激活+战术要点复习", intensity: "低", duration: 40, session_type: "激活" },
      { day: "MD 周三", focus: "周中比赛", intensity: "极高", duration: 90, session_type: "比赛" },
      { day: "MD+1 周四", focus: "恢复再生+替补/未出场球员训练", intensity: "极低", duration: 45, session_type: "恢复+替补" },
      { day: "MD-2 周五", focus: "战术演练+轻体能(主力恢复/替补正常)", intensity: "中", duration: 60, session_type: "战术" },
      { day: "MD-1 周六", focus: "赛前激活+定位球", intensity: "低", duration: 40, session_type: "激活" },
      { day: "MD 周日", focus: "周末比赛", intensity: "极高", duration: 90, session_type: "比赛" },
    ],
  },
  "microcycle-youth": {
    id: "microcycle-youth", label: "青少年发展微周期",
    description: "U18及以下。教育优先于比赛结果。每周2-3次训练+1场比赛",
    match_day: "周六",
    days: [
      { day: "周一", focus: "基础技术+协调性+趣味体能游戏", intensity: "中低", duration: 60, session_type: "技术+体能" },
      { day: "周三", focus: "小组战术+决策训练+小场比赛", intensity: "中", duration: 75, session_type: "战术+比赛" },
      { day: "周四", focus: "个人技术+位置专项+LTD体能", intensity: "中低", duration: 60, session_type: "技术+位置" },
      { day: "周五", focus: "赛前准备+团队会议", intensity: "低", duration: 45, session_type: "赛前" },
      { day: "周六", focus: "比赛日", intensity: "高", duration: 70, session_type: "比赛" },
      { day: "周日", focus: "完全休息", intensity: "极低", duration: 0, session_type: "休息" },
    ],
  },
};

// ═══════════════════════════════════════════════
// 5. COACH SESSION TEMPLATES (league×theme)
// ═══════════════════════════════════════════════

export interface SessionActivityRef {
  name: string;
  duration: number;
  area: string;
  groups: string;
  description: string;
  coaching_points: string[];
  progression: string;
  regression: string;
}

export interface SessionTemplateRef {
  id: string;
  label: string;
  league_level: string;
  tactical_theme: string;
  duration: number;
  player_count: number;
  equipment: string[];
  warmup_ids: string[];
  activities: SessionActivityRef[];
  ssg_id: string;
  cooldown_ids: string[];
}

export const SESSION_TEMPLATES: Record<string, SessionTemplateRef> = {
  // ══ PRESSING SESSIONS ══
  "session-u18-pressing": {
    id: "session-u18-pressing", label: "U18压迫训练课", league_level: "youth_u18", tactical_theme: "pressing",
    duration: 75, player_count: 18,
    equipment: ["标志盘×16","号坎×3色","球×18","小门×4"],
    warmup_ids: ["warm-light-jog","warm-dynamic-stretch","warm-band-activation","warm-rondo"],
    activities: [
      { name: "压迫触发信号练习", duration: 15, area: "40×30m", groups: "8v8+GK",
        description: "教练传出不同信号球，防守方识别触发信号全队前压",
        coaching_points: ["识别触发信号","全队同步","封堵回传线"],
        progression: "加快发球频率", regression: "固定触发信号" },
      { name: "4v2高压抢圈", duration: 15, area: "10×10m×3组", groups: "4v2×3",
        description: "4v2抢圈，防守方全力压迫，控球方2脚触球",
        coaching_points: ["围抢角度","切断传球线","抢断后快速转移"],
        progression: "缩小至8×8m", regression: "5v2减压迫" },
    ],
    ssg_id: "ssg-4v4-pressing",
    cooldown_ids: ["cool-light-jog","cool-static-stretch"],
  },
  "session-pro-pressing": {
    id: "session-pro-pressing", label: "职业队压迫训练课", league_level: "pro", tactical_theme: "pressing",
    duration: 90, player_count: 22,
    equipment: ["标志盘×20","号坎×4色","球×24","大球门×2"],
    warmup_ids: ["warm-light-jog","warm-agility-ladder","warm-hip-open","warm-accel-drill","warm-rondo"],
    activities: [
      { name: "全队压迫阵型演练", duration: 20, area: "全场", groups: "11v0(影子演练)",
        description: "11人按阵型站位，教练指示球的位置，全队随球移动压迫阵型",
        coaching_points: ["三条线间距","压迫弧度","边路诱导陷阱","GK出击范围"],
        progression: "加入对抗(11v11)", regression: "半场7v0" },
      { name: "高位压迫8v8", duration: 20, area: "半场", groups: "8v8+GK",
        description: "从门将组织开始，防守方高位压迫，攻方尝试破压",
        coaching_points: ["第一道防线曲度","中场封堵直塞","后卫线压上造越位"],
        progression: "缩小场地增加压迫密度", regression: "进攻方限3脚触球" },
    ],
    ssg_id: "ssg-7v7-tactical",
    cooldown_ids: ["cool-light-jog","cool-static-stretch","cool-foam-roll"],
  },
  // ══ POSSESSION SESSIONS ══
  "session-youth-possession": {
    id: "session-youth-possession", label: "青少年控球训练课", league_level: "youth_u15", tactical_theme: "possession",
    duration: 60, player_count: 16,
    equipment: ["标志盘×12","号坎×2色","球×16"],
    warmup_ids: ["warm-light-jog","warm-agility-ladder","warm-ball-touch","warm-rondo"],
    activities: [
      { name: "三角传球基础", duration: 15, area: "15×15m", groups: "3人×5组",
        description: "三人一组练三角站位传球：传球后移动到空位接应",
        coaching_points: ["传球到脚下vs空间","接球前观察","传球后立即移动"],
        progression: "2脚触球限制", regression: "不限触球次数" },
      { name: "5v3控球保持", duration: 15, area: "20×20m", groups: "5v3×2组",
        description: "5人控球3人抢，完成8次连续传球得分",
        coaching_points: ["三角站位","支援角度","穿透传球时机"],
        progression: "缩小至15×15m", regression: "6v3增加控球优势" },
    ],
    ssg_id: "ssg-4v4-plus-2",
    cooldown_ids: ["cool-light-jog","cool-static-stretch"],
  },
  "session-amateur-possession": {
    id: "session-amateur-possession", label: "业余队控球训练课", league_level: "amateur", tactical_theme: "possession",
    duration: 75, player_count: 18,
    equipment: ["标志盘×16","号坎×3色","球×18","小门×4"],
    warmup_ids: ["warm-light-jog","warm-dynamic-stretch","warm-ball-dribble","warm-rondo"],
    activities: [
      { name: "三区控球推进", duration: 20, area: "40×30m", groups: "9v6",
        description: "场地分3区，每区完成3次传球后推进至下一区",
        coaching_points: ["区域间过渡","接应角度","穿透传球的时机"],
        progression: "限制每区最多5次传球", regression: "不限制传球数" },
      { name: "位置轮转控球", duration: 15, area: "30×30m", groups: "8v8",
        description: "控球中按预设顺序轮转位置",
        coaching_points: ["轮转时机","补位意识","保持阵型结构"],
        progression: "双人同时轮转", regression: "固定位置不轮转" },
    ],
    ssg_id: "ssg-6v6-possession",
    cooldown_ids: ["cool-light-jog","cool-static-stretch","cool-foam-roll"],
  },
  // ══ COUNTERATTACK SESSIONS ══
  "session-pro-counter": {
    id: "session-pro-counter", label: "职业队反击训练课", league_level: "pro", tactical_theme: "counterattack",
    duration: 90, player_count: 22,
    equipment: ["标志盘×20","号坎×3色","球×24","大球门×2"],
    warmup_ids: ["warm-light-jog","warm-band-activation","warm-hip-open","warm-accel-drill","warm-ball-dribble"],
    activities: [
      { name: "断球后快速推进", duration: 20, area: "全场2/3", groups: "7v7+2GK",
        description: "防守方断球后5秒过中线、7秒射门",
        coaching_points: ["断球后第一传向前","边路拉开","中路插上","快速决策"],
        progression: "限制地面传球", regression: "取消时间限制" },
      { name: "3v2→4v3反击链", duration: 15, area: "半场", groups: "分3组轮转",
        description: "从中线3v2反击射门→立即转为4v3反向反击",
        coaching_points: ["转换瞬间加速","反击人数优势利用","射门果断"],
        progression: "增加回追者数量", regression: "去掉反向反击环节" },
    ],
    ssg_id: "ssg-5v5-transition",
    cooldown_ids: ["cool-light-jog","cool-static-stretch","cool-foam-roll","cool-breathing"],
  },
  // ══ SHOOTING SESSIONS ══
  "session-youth-shooting": {
    id: "session-youth-shooting", label: "青少年射门训练课", league_level: "youth_u15", tactical_theme: "shooting",
    duration: 60, player_count: 16,
    equipment: ["标志盘×10","球×20","大球门×2"],
    warmup_ids: ["warm-light-jog","warm-dynamic-stretch","warm-ball-touch","warm-rondo"],
    activities: [
      { name: "多角度射门", duration: 20, area: "禁区弧-球门", groups: "分3组轮转",
        description: "正前方、左侧45°、右侧45°三角度接球射门，每角度×5",
        coaching_points: ["第一脚触球方向","观察门将","低平球优先","补射"],
        progression: "限定一脚射门", regression: "无防守定点射" },
      { name: "配合后射门", duration: 15, area: "禁区弧", groups: "2人×8组",
        description: "墙式二过一→接球射门",
        coaching_points: ["墙式配合质量","射门前调整步点","射门方式选择"],
        progression: "增加防守干扰", regression: "直接射门不配合" },
    ],
    ssg_id: "ssg-3v3-finishing",
    cooldown_ids: ["cool-light-jog","cool-static-stretch"],
  },
  // ══ SET PIECES SESSIONS ══
  "session-pro-setpieces": {
    id: "session-pro-setpieces", label: "职业队定位球训练课", league_level: "pro", tactical_theme: "set_pieces",
    duration: 75, player_count: 22,
    equipment: ["标志盘×12","号坎×2色","球×20","大球门×2","人墙道具"],
    warmup_ids: ["warm-light-jog","warm-dynamic-stretch","warm-band-activation","warm-ball-touch"],
    activities: [
      { name: "角球进攻套路", duration: 20, area: "禁区+角球区", groups: "8v6+GK",
        description: "练习3种角球套路：近门柱冲顶、远门柱摆渡、短角球配合",
        coaching_points: ["跑动时机","阻挡/摆脱","攻击球","补射"],
        progression: "防守方增加至8人", regression: "无防守练跑位" },
      { name: "定位球防守组织", duration: 15, area: "禁区", groups: "8v8+GK",
        description: "区域+盯人混合防守，练解围和外压",
        coaching_points: ["站位(球与门之间)","头球解围","解围后外压"],
        progression: "连续发球", regression: "慢速发球" },
    ],
    ssg_id: "ssg-8v8-phase",
    cooldown_ids: ["cool-light-jog","cool-static-stretch","cool-breathing"],
  },
};
