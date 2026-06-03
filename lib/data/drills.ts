/**
 * Drills Library — extracted from training-library.ts
 *
 * Sections:
 *   1. Technique Drill Library (by position)
 *   2. Nutrition Templates (by goal)
 *   3. Phase Plan Templates
 *   4. Running Profiles (by position)
 *   5. Position -> Exercise Mapping
 *   6. Goal -> Extra Exercises
 */

import { NutritionInfo } from "../types";

// ═══════════════════════════════════════════════
// 1. TECHNIQUE DRILL LIBRARY (by position)
// ═══════════════════════════════════════════════

export interface DrillRef {
  id: string;
  name: string;
  duration: number; // minutes
  description: string;
  purpose: string;
  key_points: string[];
  image_url?: string;
  diagram: {
    layout: "linear" | "zigzag" | "square" | "t_shape" | "l_shape" | "triangle";
    cone_count: number;
    cone_spacing: string;
    total_distance: string;
    start_label: string;
    end_label: string;
    route_style?: "solid" | "dashed";
    route_label?: string;
  };
}

export const DRILL_LIBRARY: Record<string, DrillRef> = {
  // ---- Midfielder ----
  "drill-mf-turn-pressure": {
    id: "drill-mf-turn-pressure",
    name: "压迫下转身转移",
    duration: 15,
    description: "10×10m方格内，两名球员高压逼抢，持球人第一次触球半转身，转移至第三名接应球员",
    purpose: "提高中场在高压下护球、转身观察、精准转移球的能力",
    key_points: ["接球前转头观察身后", "第一脚触球向开阔空间", "转移球需球速和准确性"],
    image_url: "https://www.soccercoachingpro.com/wp-content/uploads/2021/03/turning-and-switching-play-drill.jpg",
    diagram: { layout: "square", cone_count: 4, cone_spacing: "10m", total_distance: "可变", start_label: "接球区", end_label: "转移目标", route_style: "dashed" },
  },
  "drill-mf-wall-pass": {
    id: "drill-mf-wall-pass",
    name: "墙式二过一后插上射门",
    duration: 15,
    description: "中场从中圈传给禁区弧支点，快速前插完成墙式配合，大禁区线附近一脚射门",
    purpose: "发展中场后插上时机把握、短传精确度、跑动中射门能力",
    key_points: ["传球后全力加速前插", "支点回敲到跑动路线", "射门前调整步点"],
    image_url: "https://www.sportsessionplanner.com/uploads/images/session_transitions/1130643.jpg",
    diagram: { layout: "linear", cone_count: 3, cone_spacing: "中圈-禁区弧-大禁区线", total_distance: "约30m", start_label: "中圈传球点", end_label: "射门点", route_style: "solid" },
  },
  "drill-mf-possession": {
    id: "drill-mf-possession",
    name: "控球轮转",
    duration: 15,
    description: "15×15m区域内5v3控球，限制2脚触球，重点练习中场三角站位和支援角度",
    purpose: "提高中场控球节奏、接应意识、快速传递能力",
    key_points: ["始终形成三角站位", "传球后移动接应", "支援角度>90°", "提前观察"],
    image_url: "https://www.soccercoachingpro.com/wp-content/uploads/2021/03/possession-drill.jpg",
    diagram: { layout: "square", cone_count: 4, cone_spacing: "15m", total_distance: "可变", start_label: "控球方", end_label: "抢球方", route_style: "dashed" },
  },
  // ---- Forward ----
  "drill-fw-finishing": {
    id: "drill-fw-finishing",
    name: "多角度终结训练",
    duration: 15,
    description: "三个不同角度（正前方、左侧45°、右侧45°）接球后1-2触完成射门，每角度×4",
    purpose: "提高前锋多角度射门精度和第一脚触球质量",
    key_points: ["第一脚触球向射门方向", "观察门将站位", "射门低平球优先", "补射意识"],
    image_url: "https://www.soccercoachingpro.com/wp-content/uploads/2021/03/finishing-drill.jpg",
    diagram: { layout: "triangle", cone_count: 5, cone_spacing: "大禁区外三点", total_distance: "16-20m", start_label: "传球点", end_label: "球门", route_style: "solid" },
  },
  "drill-fw-back-to-goal": {
    id: "drill-fw-back-to-goal",
    name: "背身拿球转身射门",
    duration: 15,
    description: "背对球门接球，对抗下护球转身，完成射门。防守者从轻度→积极防守渐进",
    purpose: "提高前锋背身护球、快速转身和对抗下射门能力",
    key_points: ["身体横向护球", "感知防守者位置", "第一脚触球远离防守者", "转身加速"],
    image_url: "https://www.soccercoachingpro.com/wp-content/uploads/2021/03/back-to-goal-drill.jpg",
    diagram: { layout: "linear", cone_count: 3, cone_spacing: "禁区弧-点球点-球门", total_distance: "约15m", start_label: "背身接球点", end_label: "射门", route_style: "solid" },
  },
  // ---- Defender ----
  "drill-df-1v1": {
    id: "drill-df-1v1",
    name: "1v1防守技术",
    duration: 15,
    description: "10×15m通道内1v1，防守者练习站位、延缓、抢断时机，进攻方尝试突破",
    purpose: "提高后卫1v1防守站位、抢断时机和身体对抗能力",
    key_points: ["半蹲防守姿态", "引导进攻方向外侧", "抢断时机在对手触球后", "保持耐心"],
    image_url: "https://www.soccercoachingpro.com/wp-content/uploads/2021/03/1v1-defending-drill.jpg",
    diagram: { layout: "linear", cone_count: 4, cone_spacing: "10×15m通道", total_distance: "15m", start_label: "进攻起点", end_label: "防守底线", route_style: "solid" },
  },
  // ---- Wingback ----
  "drill-wb-cross": {
    id: "drill-wb-cross",
    name: "边路突破传中",
    duration: 15,
    description: "边路接球→突破→下底/内切传中，禁区内2-3人包抄。练左侧和右侧各6次",
    purpose: "提高翼卫边路突破后的传中质量和跑动时机",
    key_points: ["观察禁区内跑位", "传中球速和弧线", "早传vs下底传的选择", "回防意识"],
    image_url: "https://www.soccercoachingpro.com/wp-content/uploads/2021/03/crossing-drill.jpg",
    diagram: { layout: "linear", cone_count: 4, cone_spacing: "边线-禁区弧", total_distance: "约30m", start_label: "边路起点", end_label: "禁区包抄点", route_style: "dashed" },
  },
  // ---- GK ----
  "drill-gk-diving": {
    id: "drill-gk-diving",
    name: "侧扑反应训练",
    duration: 15,
    description: "教练在6-8m处随机向两侧掷球/踢球，守门员完成侧扑→快速起身→准备第二反应",
    purpose: "提高守门员侧扑技术、第二反应速度和快速起身能力",
    key_points: ["低重心准备姿态", "第一步向球移动", "侧扑落地滚翻", "快速起身"],
    image_url: "https://www.soccercoachingpro.com/wp-content/uploads/2021/03/goalkeeper-diving-drill.jpg",
    diagram: { layout: "linear", cone_count: 2, cone_spacing: "6-8m教练距离", total_distance: "2-3m侧扑", start_label: "GK站位", end_label: "教练射门点", route_style: "dashed" },
  },
  // ══ 新增 from Seeger 足球技战术训练全书 ══
  "drill-mf-triangle": {
    id: "drill-mf-triangle", name: "三角形传球循环", duration: 12,
    description: "三角顶点各站1人，一脚出球后跑向接球点，练习一脚触球和跑位配合",
    purpose: "提高中场球员一脚触球精度和无球跑位意识",
    key_points: ["传球后立即移动", "保持三角形站位", "一脚触球减少调整"],
    image_url: "https://www.soccercoachingpro.com/wp-content/uploads/2021/03/triangle-passing-drill.jpg",
    diagram: { layout: "triangle", cone_count: 3, cone_spacing: "8m", total_distance: "循环", start_label: "传球起点", end_label: "跑动方向", route_style: "solid" },
  },
  "drill-mf-diamond": {
    id: "drill-mf-diamond", name: "菱形套边插上", duration: 15,
    description: "菱形四角站位，边路球员套边插上接直塞球传中，中锋包抄",
    purpose: "提高边路套边时机和中路包抄配合",
    key_points: ["套边时全速冲刺", "直塞球传到跑动路线上", "传中前观察包抄点"],
    diagram: { layout: "square", cone_count: 4, cone_spacing: "15×20m", total_distance: "约40m", start_label: "传球起点", end_label: "传中落点", route_style: "dashed", route_label: "套边路线" },
  },
  "drill-fw-triple-shot": {
    id: "drill-fw-triple-shot", name: "连续三次射门", duration: 15,
    description: "禁区外三点依次射门：第一点接传中→第二点接回敲→第三点个人突破射门，间隔8秒",
    purpose: "模拟比赛快节奏中连续射门场景，提高转换射门能力",
    key_points: ["每次射门后快速回位", "调整步点不超过2步", "三脚射门不同脚法"],
    image_url: "https://www.soccercoachingpro.com/wp-content/uploads/2021/03/finishing-drill.jpg",
    diagram: { layout: "triangle", cone_count: 3, cone_spacing: "大禁区弧三点", total_distance: "约25m", start_label: "起点", end_label: "球门", route_style: "solid", route_label: "射击路线" },
  },
  "drill-fw-combo-5shot": {
    id: "drill-fw-combo-5shot", name: "5次射门组合", duration: 18,
    description: "5种射门顺序：远射→头球→单刀→凌空→补射，模拟比赛各种射门场景",
    purpose: "全面提升前锋射门手段多样性",
    key_points: ["每种射门技术切换", "保持射门质量不下降", "补射意识"],
    diagram: { layout: "linear", cone_count: 5, cone_spacing: "禁区外到禁区内", total_distance: "约40m", start_label: "远射点", end_label: "补射点", route_style: "solid" },
  },
  "drill-df-chase": {
    id: "drill-df-chase", name: "追赶与拦截", duration: 12,
    description: "两人组防守：一人追赶持球者延缓，第二人预判拦截传球路线。15×20m区域",
    purpose: "提高后卫协同防守的追赶速度和拦截预判",
    key_points: ["追赶者弧线跑封锁内线", "拦截者观察传球角度", "两人沟通"],
    diagram: { layout: "linear", cone_count: 4, cone_spacing: "15×20m", total_distance: "20m", start_label: "进攻起点", end_label: "防守底线", route_style: "dashed", route_label: "追赶路线" },
  },
  "drill-wb-overlap": {
    id: "drill-wb-overlap", name: "套边下底传中", duration: 15,
    description: "边路接球→内切吸引防守→边后卫套边→直塞→下底传中，禁区内双人包抄",
    purpose: "提高翼卫套边传中的时机和精度",
    key_points: ["内切带动防守者", "套边全速冲刺", "传中避开第一防守者"],
    image_url: "https://www.soccercoachingpro.com/wp-content/uploads/2021/03/crossing-drill.jpg",
    diagram: { layout: "l_shape", cone_count: 3, cone_spacing: "边路30m", total_distance: "约40m", start_label: "边路起点", end_label: "禁区", route_style: "dashed", route_label: "套边→传中" },
  },
  "drill-gk-reaction": {
    id: "drill-gk-reaction", name: "GK快速反应训练", duration: 10,
    description: "距GK 6m快速连射，扑救后立即起身准备下一次，6球一组×3组",
    purpose: "提高守门员连续扑救的反应速度和起身回位速度",
    key_points: ["扑救后立即起身", "保持重心前倾", "脚步快速调整"],
    diagram: { layout: "linear", cone_count: 3, cone_spacing: "6m教练距离", total_distance: "2-4m扑救范围", start_label: "GK站位", end_label: "教练射门点", route_style: "solid" },
  },
};

// ═══════════════════════════════════════════════
// 2. NUTRITION TEMPLATES (by goal)
// ═══════════════════════════════════════════════

export const NUTRITION_TEMPLATES: Record<string, NutritionInfo> = {
  strength: {
    pre_training: "训练前2-4h：高碳水餐(3-4g/kg碳水)+瘦肉蛋白。训练前30min：黑咖啡(可选)+水500ml",
    post_training: "训练后30min窗口：快碳1.0-1.2g/kg+蛋白0.3-0.4g/kg。例：40g乳清蛋白+2根香蕉+500ml水",
    daily_plan: "总热量3000-3200kcal。蛋白2.0g/kg(分4-5餐,每餐0.4g/kg)，碳水5-6g/kg，脂肪70-80g(>20%总热量)",
    hydration: "每日3.5-4L水。训练中每15-20min补充150-200ml。尿液颜色监控：淡柠檬色=OK,苹果汁色=脱水",
    supplements: "肌酸5g/日(加载期20g/日×5-7天) + 维生素D3 2000IU/日。注意：补充剂≠FDA监管,IOC发现1/4含禁药成分",
  },
  speed: {
    pre_training: "训练前2h：150g鸡胸+200g红薯+蔬菜。训练前30min：黑咖啡",
    post_training: "训练后30min内：40g乳清蛋白+1根香蕉+β-丙氨酸",
    daily_plan: "总热量2800-3000kcal。蛋白1.8g/kg，碳水6-7g/kg（比赛日8g/kg），脂肪60-70g",
    hydration: "每日3.5-4L水，训练中每15min补充200ml电解质饮料",
    supplements: "肌酸5g/日 + β-丙氨酸3-4g/日 + 维生素D3 2000IU/日",
  },
  endurance: {
    pre_training: "训练前3h：200g意面+100g瘦肉。训练前1h：能量胶（可选）",
    post_training: "训练后30min内：40g乳清蛋白+200g快碳（白米饭/白面包）",
    daily_plan: "总热量3200-3500kcal。蛋白1.5-1.7g/kg，碳水7-8g/kg，脂肪70-80g",
    hydration: "每日4-5L水，训练中每15min补充200ml电解质饮料",
    supplements: "电解质片 + 维生素D3 2000IU/日 + Omega-3 2g/日",
  },
  power: {
    pre_training: "训练前2h：150g三文鱼+200g红薯。训练前30min：咖啡因+β-丙氨酸",
    post_training: "训练后30min内：40g乳清蛋白+5g肌酸+快碳",
    daily_plan: "总热量3000-3200kcal。蛋白1.8-2.0g/kg，碳水5-6g/kg，脂肪70-80g",
    hydration: "每日3.5-4L水",
    supplements: "肌酸5g/日 + β-丙氨酸3-4g/日 + 维生素D3 2000IU/日 + 咖啡因(赛前)",
  },
  agility: {
    pre_training: "训练前2h：150g瘦肉+200g米饭+蔬菜",
    post_training: "训练后30min内：40g乳清蛋白+水果",
    daily_plan: "总热量2700-2900kcal。蛋白1.7-1.9g/kg，碳水5-6g/kg，脂肪60-70g",
    hydration: "每日3-4L水",
    supplements: "肌酸5g/日 + 维生素D3 2000IU/日",
  },
  default: {
    pre_training: "训练前2h：复合碳水+瘦肉蛋白+蔬菜",
    post_training: "训练后30min内：快碳+乳清蛋白",
    daily_plan: "均衡饮食，蛋白1.6-1.8g/kg，碳水5-6g/kg，脂肪适量",
    hydration: "每日35-40ml/kg水",
    supplements: "肌酸5g/日 + 维生素D3 2000IU/日",
  },
  match_day: {
    pre_training: "赛前3-4h：高碳水主餐(3-4g/kg碳水,如200g意面+100g鸡胸)。赛前1h：轻碳小吃(香蕉/能量棒)+水500ml。赛前15min：最后补水200-300ml",
    post_training: "赛后30min内：快碳1.2g/kg+蛋白0.4g/kg。赛后2h：完整恢复餐(碳水+蛋白+蔬菜+补水)",
    daily_plan: "比赛日总碳水8-10g/kg,蛋白1.8-2.0g/kg,低脂低纤维。赛中利用死球/补水暂停饮水(每次150-200ml),中场补水300-400ml",
    hydration: "赛前24h开始预补水。赛中每15-20min补水150-200ml。补水公式：720ml液体/0.5kg体重丢失。深色球衣有盐渍者额外补盐",
    supplements: "赛中：电解质饮料+能量胶(上半场后半段起)。赛前：咖啡因3-6mg/kg(赛前60min)。禁用未经第三方检测的补充剂",
  },
};

// ═══════════════════════════════════════════════
// 3. PHASE PLAN TEMPLATES
// ═══════════════════════════════════════════════

export interface PhasePlanRef {
  id: string;
  title: string;
  weekly_frequency: number;
  session_duration: number; // minutes
  intensity_distribution: { low: number; medium: number; high: number };
  recovery_strategy: string;
}

export const PHASE_TEMPLATES: Record<string, PhasePlanRef> = {
  preseason: {
    id: "preseason",
    title: "季前准备期(W1-5) — 爆发力优先",
    weekly_frequency: 4,
    session_duration: 75,
    intensity_distribution: { low: 15, medium: 30, high: 55 },
    recovery_strategy: "爆发力训练放首位(新鲜状态)。每3周减载1周(容量降至60%)。GK药球旋转必选。训练日间隔≥24h",
  },
  competition: {
    id: "competition",
    title: "比赛期 — 维持刺激(Maintenance)",
    weekly_frequency: 2,
    session_duration: 60,
    intensity_distribution: { low: 30, medium: 50, high: 20 },
    recovery_strategy: "强度保持/量降低(最小有效剂量)。赛后48h仅Zone1-2恢复。比赛密集期减至1次/周。每4周减载",
  },
  recovery: {
    id: "recovery",
    title: "赛后恢复/过渡期 — 低强度再生",
    weekly_frequency: 2,
    session_duration: 45,
    intensity_distribution: { low: 70, medium: 25, high: 5 },
    recovery_strategy: "主动恢复为主(Zone1-2)。柔韧性+弱链纠正优先。避免高强度离心收缩。第1周可完全休息",
  },
  offseason: {
    id: "offseason",
    title: "休赛期 — 4阶段力量建设(W1-12)",
    weekly_frequency: 3,
    session_duration: 60,
    intensity_distribution: { low: 30, medium: 40, high: 30 },
    recovery_strategy: "W1-2:GPP/肌耐力(50-67%1RM,2-3×12-15)→W3-6:基础力量(67-80%1RM,3-4×6-10渐进)→W7-10:最大力量/爆发(80-95%1RM,3-5×2-5)→W11-12:季前转换(75-85%1RM,3-4×3-6,爆发速度优先)。GK单独方案。低训练年龄从体重开始",
  },
};

// ═══════════════════════════════════════════════
// 4. RUNNING PROFILES (by position)
// ═══════════════════════════════════════════════

export const RUNNING_PROFILES: Record<string, { total_distance: string; high_speed_distance: string; sprint_distance: string; intensity_zones: string[] }> = {
  goalkeeper: {
    total_distance: "4-5km/场",
    high_speed_distance: "较少(冲刺扑救/出击)",
    sprint_distance: "极少(冲刺扑救)",
    intensity_zones: ["Zone1-2(80%)：站位调整、出击", "Zone4-5(20%)：冲刺扑救、出击"],
  },
  center_back: {
    total_distance: "~7080m/场(DiSalvo2007)",
    high_speed_distance: "~612m(>19km/h)",
    sprint_distance: "~215m(>23km/h)",
    intensity_zones: ["Zone1-2(70%)：慢跑、站位", "Zone3(20%)：支援、盯人", "Zone4-5(10%)：回追、冲刺。高强度动作最少"],
  },
  full_back: {
    total_distance: "~7012m/场(DiSalvo2007)",
    high_speed_distance: "~1054m(>19km/h)",
    sprint_distance: "~402m(>23km/h)",
    intensity_zones: ["Zone1-2(55-65%)：站位", "Zone3(20%)：折返", "Zone4-5(20-25%)：反复冲刺、回防。冲刺距离与边前卫/前锋相当"],
  },
  center_midfielder: {
    total_distance: "~7061m/场(DiSalvo2007)",
    high_speed_distance: "~875m(>19km/h)",
    sprint_distance: "~248m(>23km/h)",
    intensity_zones: ["Zone1-2(50-60%)：站位移位", "Zone3(25-30%)：中速跑动最多(11-19km/h段4081m)", "Zone4-5(15-20%)：反复冲刺、压迫。总工作负荷最大"],
  },
  wide_midfielder: {
    total_distance: "~6960m/场(DiSalvo2007)",
    high_speed_distance: "~1184m(>19km/h)",
    sprint_distance: "~446m(>23km/h)",
    intensity_zones: ["Zone1-2(50-60%)：站位", "Zone3(20%)：折返", "Zone4-5(20-25%)：高强度跑最多。冲刺距离第一"],
  },
  forward: {
    total_distance: "~6960m/场(边前卫数据参考)",
    high_speed_distance: "~1184m(>19km/h)",
    sprint_distance: "~446m(>23km/h)",
    intensity_zones: ["Zone1-2(60-65%)：慢跑移动", "Zone3(15-20%)：跑位", "Zone4-5(20-25%)：冲刺、反越位。高强度动作次数多"],
  },
};

// ═══════════════════════════════════════════════
// 5. POSITION → EXERCISE MAPPING
// ═══════════════════════════════════════════════

export const POSITION_EXERCISES: Record<string, { upper: string[]; lower: string[]; core: string[] }> = {
  goalkeeper: {
    upper: ["ex-dumbbell-shoulder-press", "ex-dumbbell-pullover", "ex-med-ball-slam", "ex-face-pull"],
    lower: ["ex-trap-bar-deadlift", "ex-box-jump", "ex-nordic-hamstring", "ex-single-leg-rdl", "ex-hip-thrust"],
    core: ["ex-mb-rotational-throw", "ex-cable-woodchop", "ex-pallof-press", "ex-dead-bug"],
  },
  defender: {
    upper: ["ex-bench-press", "ex-pull-up", "ex-med-ball-slam"],
    lower: ["ex-back-squat", "ex-trap-bar-deadlift", "ex-bulgarian-split-squat", "ex-nordic-hamstring"],
    core: ["ex-plank", "ex-hanging-leg-raise", "ex-pallof-press"],
  },
  midfielder: {
    upper: ["ex-dumbbell-shoulder-press", "ex-pull-up", "ex-cable-row"],
    lower: ["ex-front-squat", "ex-single-leg-rdl", "ex-nordic-hamstring", "ex-box-jump", "ex-hip-thrust"],
    core: ["ex-hanging-leg-raise", "ex-cable-woodchop", "ex-dead-bug"],
  },
  forward: {
    upper: ["ex-bench-press", "ex-med-ball-slam", "ex-dumbbell-shoulder-press"],
    lower: ["ex-back-squat", "ex-power-clean", "ex-bulgarian-split-squat", "ex-nordic-hamstring"],
    core: ["ex-hanging-leg-raise", "ex-plank", "ex-cable-woodchop"],
  },
  wingback: {
    upper: ["ex-pull-up", "ex-dumbbell-shoulder-press", "ex-cable-row"],
    lower: ["ex-front-squat", "ex-dumbbell-lunges", "ex-nordic-hamstring", "ex-sled-sprint"],
    core: ["ex-plank", "ex-pallof-press", "ex-hanging-leg-raise"],
  },
};

// ═══════════════════════════════════════════════
// 6. GOAL → EXTRA EXERCISES
// ═══════════════════════════════════════════════

export const GOAL_EXTRAS: Record<string, string[]> = {
  strength: ["ex-back-squat", "ex-trap-bar-deadlift", "ex-bench-press", "ex-hip-thrust"],
  power: ["ex-power-clean", "ex-box-jump", "ex-med-ball-slam", "ex-mb-rotational-throw"],
  speed: ["ex-sled-sprint", "ex-box-jump", "ex-bulgarian-split-squat"],
  agility: ["ex-dumbbell-lunges", "ex-single-leg-rdl", "ex-dead-bug"],
  mas_endurance: ["ex-front-squat", "ex-leg-press", "ex-cable-row"],
  combat: ["ex-trap-bar-deadlift", "ex-pallof-press", "ex-bench-press", "ex-hip-thrust"],
};
