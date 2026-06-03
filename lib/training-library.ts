/**
 * Training Reference Library — offline knowledge base
 *
 * All domain knowledge lives here instead of the system prompt.
 * AI outputs compact IDs → server resolves to full data.
 *
 * Sections:
 *   1. Warmup Library
 *   2. Strength Exercise Library (extends exercise-data.ts)
 *   3. Position → Exercise Mapping
 *   4. Technique Drill Library
 *   5. Cooldown Library
 *   6. Nutrition Templates
 *   7. Phase Plan Templates
 *   8. Running Profiles
 *   9. Resolver Functions
 */

import { TrainingModule, PositionTraining, AbilityTraining, TechniqueRunning, PhasePlan, InjuryRecovery, WarmupItem, Exercise, AbilityExercise, Drill, NutritionInfo } from "./types";
import { DRILL_LIBRARY, NUTRITION_TEMPLATES, PHASE_TEMPLATES, RUNNING_PROFILES, POSITION_EXERCISES, GOAL_EXTRAS } from "./data/drills";
import type { DrillRef, PhasePlanRef } from "./data/drills";

// ═══════════════════════════════════════════════
// 1. WARMUP LIBRARY
// ═══════════════════════════════════════════════

export interface WarmupRef {
  id: string;
  name: string;
  duration: number; // minutes
  description: string;
  category: "no_ball" | "with_ball";
}

export const WARMUP_LIBRARY: Record<string, WarmupRef> = {
  // ---- No Ball ----
  "warm-ankle-knee": {
    id: "warm-ankle-knee",
    name: "踝膝激活",
    duration: 2,
    description: "脚踝绕环各30s + 膝关节绕环各30s + 踢臀跑30s",
    category: "no_ball",
  },
  "warm-hip-open": {
    id: "warm-hip-open",
    name: "髋关节激活",
    duration: 3,
    description: "抱膝走2×15m + 燕式平衡走2×15m + 蜘蛛侠爬行2×10m + 侧弓步2×10每侧",
    category: "no_ball",
  },
  "warm-dynamic-stretch": {
    id: "warm-dynamic-stretch",
    name: "动态拉伸组合",
    duration: 3,
    description: "高抬腿2×15m + 后踢腿2×15m + 直腿踢2×15m + 弓步转体2×10每侧",
    category: "no_ball",
  },
  "warm-neural": {
    id: "warm-neural",
    name: "神经激活",
    duration: 2,
    description: "原地小碎步10s→冲刺10m×3 + 快速高抬腿5s×4 + 反应启动（听信号冲刺）×4",
    category: "no_ball",
  },
  "warm-agility-ladder": {
    id: "warm-agility-ladder",
    name: "绳梯协调",
    duration: 3,
    description: "单脚跳格×2 + 双脚进出×2 + 侧向交叉×2 + 快速垫步×2",
    category: "no_ball",
  },
  "warm-band-activation": {
    id: "warm-band-activation",
    name: "弹力带激活",
    duration: 3,
    description: "弹力带侧走2×10每侧 + 弹力带臀桥2×12 + 弹力带肩外旋2×10每侧",
    category: "no_ball",
  },
  // ---- With Ball ----
  "warm-ball-touch": {
    id: "warm-ball-touch",
    name: "基础球感",
    duration: 3,
    description: "双脚交替踩球2×45s + 脚内侧拨球2×45s + 拉球转身2×10每侧",
    category: "with_ball",
  },
  "warm-ball-dribble": {
    id: "warm-ball-dribble",
    name: "动态带球",
    duration: 3,
    description: "10×10m区域内自由盘带，听哨声急停/启动/变向 ×3min",
    category: "with_ball",
  },
  "warm-rondo": {
    id: "warm-rondo",
    name: "抢圈热身",
    duration: 5,
    description: "6-8人抢圈，2脚触球，强调快速传接与跑位接应",
    category: "with_ball",
  },
  // ---- RAMP Phase 1: Raise (提升体温) ----
  "warm-light-jog": {
    id: "warm-light-jog",
    name: "慢跑+变向",
    duration: 3,
    description: "10×10m区域内慢跑，听信号变向/后退/侧滑步，逐渐增加心率",
    category: "no_ball",
  },
  "warm-skip-variations": {
    id: "warm-skip-variations",
    name: "跳跃变式组合",
    duration: 3,
    description: "A-Skip 2×15m + B-Skip 2×15m + 侧向交叉步2×15m + 直腿跳2×15m",
    category: "no_ball",
  },
  // ---- RAMP Phase 2: Activate (激活) ----
  "warm-mini-band-walk": {
    id: "warm-mini-band-walk",
    name: "弹力带侧走",
    duration: 2,
    description: "弹力带置膝上/踝上，侧向走2×10步每侧 + 前向怪兽走2×10m",
    category: "no_ball",
  },
  "warm-glute-activation": {
    id: "warm-glute-activation",
    name: "臀肌激活",
    duration: 3,
    description: "弹力带臀桥2×12 + 蚌式开合2×12每侧 + 鸟狗式2×10每侧 + 死虫式2×10每侧",
    category: "no_ball",
  },
  // ---- RAMP Phase 3: Mobilize (动态关节活动) ----
  "warm-spider-man": {
    id: "warm-spider-man",
    name: "蜘蛛侠爬行+胸椎旋转",
    duration: 2,
    description: "蜘蛛侠爬行2×10m + 弓步转体2×10每侧 + 最伟大拉伸2×5每侧",
    category: "no_ball",
  },
  "warm-world-greatest": {
    id: "warm-world-greatest",
    name: "最伟大拉伸",
    duration: 3,
    description: "弓步→肘触地→胸椎旋转→髋屈肌拉伸, 交替进行, 2×5每侧",
    category: "no_ball",
  },
  // ---- RAMP Phase 4: Potentiate (神经增强) ----
  "warm-plyo-primer": {
    id: "warm-plyo-primer",
    name: "增强式启动",
    duration: 2,
    description: "踝关节弹跳2×10 + 低箱快速跳2×5 + 水平跳跃2×5",
    category: "no_ball",
  },
  "warm-accel-drill": {
    id: "warm-accel-drill",
    name: "加速技术",
    duration: 2,
    description: "起跑姿势练习2×5m→10m渐进加速×4 + 减速制动技术×3",
    category: "no_ball",
  },
  // ---- FIFA 11+ Core Exercises ----
  "warm-nordic-curl": {
    id: "warm-nordic-curl",
    name: "北欧腘绳肌弯举(FIFA11+)",
    duration: 3,
    description: "初级3-5次(手撑缓冲)→中级7-10次→高级12-15次, 离心控制3-5秒, 每节必练",
    category: "no_ball",
  },
  "warm-plank-series": {
    id: "warm-plank-series",
    name: "平板支撑三级(FIFA11+)",
    duration: 3,
    description: "L1静态20-30s→L2交替抬腿40-60s(抬2s)→L3单腿保持20-30s, 各2组",
    category: "no_ball",
  },
  "warm-side-plank-series": {
    id: "warm-side-plank-series",
    name: "侧桥三级(FIFA11+)",
    duration: 3,
    description: "L1静态20-30s→L2髋升降20-30s→L3上腿抬起20-30s, 各2组每侧",
    category: "no_ball",
  },
  "warm-single-leg-balance": {
    id: "warm-single-leg-balance",
    name: "单腿平衡三级(FIFA11+)",
    duration: 3,
    description: "L1持球单腿站30s→L2抛接球单腿站30s→L3对抗推搡单腿站30s, 各2组每侧",
    category: "no_ball",
  },

  // ═══ ① 心肺动员 (Cardio Activation) ═══
  "warm-slow-jog": {
    id: "warm-slow-jog", name: "慢跑", duration: 3,
    description: "四路纵队慢跑，听教练口令变化方向/节奏，心率逐步升至Zone2",
    category: "no_ball",
  },
  "warm-high-knee-jog": {
    id: "warm-high-knee-jog", name: "高抬腿慢跑", duration: 1.5,
    description: "慢跑中交替高抬腿，大腿抬至水平，手臂自然摆动，激活髋屈肌",
    category: "no_ball",
  },
  "warm-jumping-jacks": {
    id: "warm-jumping-jacks", name: "开合跳", duration: 1,
    description: "双脚开合跳跃+双手头上拍掌，30s×2组，间歇15s，心率快速提升",
    category: "no_ball",
  },
  "warm-hip-rotation-skip": {
    id: "warm-hip-rotation-skip", name: "转髋跳", duration: 1,
    description: "原地跳跃中髋部左右旋转，20次×2组，激活髋关节旋转肌群",
    category: "no_ball",
  },
  "warm-small-steps": {
    id: "warm-small-steps", name: "小步跑", duration: 1,
    description: "小幅度高频率碎步，前脚掌着地，10m往返×2组，激活足踝刚性",
    category: "no_ball",
  },
  "warm-straight-leg-run": {
    id: "warm-straight-leg-run", name: "直腿跑", duration: 1,
    description: "膝关节伸直，勾脚尖，前脚掌扒地，10m×2组，激活腘绳肌",
    category: "no_ball",
  },
  "warm-mach-drill": {
    id: "warm-mach-drill", name: "马克操", duration: 2,
    description: "A-Skip + B-Skip + C-Skip组合，15m×2组每种，提升髋膝踝协调性",
    category: "no_ball",
  },
  "warm-mountain-climber": {
    id: "warm-mountain-climber", name: "俯身登山跑", duration: 1,
    description: "平板支撑位快速交替膝至胸，30s×2组，间歇25s",
    category: "no_ball",
  },
  "warm-agility-ladder-fast": {
    id: "warm-agility-ladder-fast", name: "绳梯快速脚步", duration: 1.5,
    description: "绳梯一格两步→两格一步→横向进出，各2组，高步频",
    category: "no_ball",
  },
  "warm-forward-back-shuffle": {
    id: "warm-forward-back-shuffle", name: "前后快速碎步", duration: 1,
    description: "前后方向快速交替碎步，20s×2组，训练反应与步频",
    category: "no_ball",
  },

  // ═══ ② 胸廓&髋部激活 (Thoracic & Hip Activation) ═══
  "warm-arm-circles": {
    id: "warm-arm-circles", name: "双臂环绕", duration: 1,
    description: "双臂伸直画大圆，正反向各10次，激活肩关节活动度",
    category: "no_ball",
  },
  "warm-thoracic-rotation": {
    id: "warm-thoracic-rotation", name: "胸椎旋转", duration: 1,
    description: "侧卧上腿屈膝90°贴地，上身向对侧旋转，3次/侧×2组，打开胸廓活动度",
    category: "no_ball",
  },
  "warm-ys-raise": {
    id: "warm-ys-raise", name: "Y/T字上举", duration: 1,
    description: "俯身Y字(拇指朝上)+T字(掌心朝下)上举，各12次×2组，激活肩胛稳定肌",
    category: "no_ball",
  },
  "warm-squat-with-circles": {
    id: "warm-squat-with-circles", name: "环转加深蹲", duration: 1,
    description: "双臂画圆衔接深蹲至最低点，10次×2组，整合上肢与下肢活动",
    category: "no_ball",
  },
  "warm-9090": {
    id: "warm-9090", name: "9090髋关节激活", duration: 1.5,
    description: "坐姿前腿90°后腿90°，上身前倾+转体，3次/侧×2组，打开髋内外旋",
    category: "no_ball",
  },
  "warm-world-greatest-stretch": {
    id: "warm-world-greatest-stretch", name: "最伟大拉伸", duration: 1.5,
    description: "弓步→肘触地→转体→手臂上举→还原，3次/侧，全身大复合拉伸",
    category: "no_ball",
  },
  "warm-rolling-snowball": {
    id: "warm-rolling-snowball", name: "滚雪球", duration: 1,
    description: "仰卧抱膝前后滚动→蹲起，6次/侧×2组，脊柱屈曲与伸髋整合",
    category: "no_ball",
  },
  "warm-back-to-back-chain": {
    id: "warm-back-to-back-chain", name: "背靠背侧表链拉伸", duration: 1,
    description: "两人背靠背，交替侧屈拉伸侧表链，4次/侧，激活侧向活动度",
    category: "no_ball",
  },
  "warm-squat-side-shuffle": {
    id: "warm-squat-side-shuffle", name: "靠背蹲起+侧滑步", duration: 1.5,
    description: "两人背靠背下蹲→侧向滑步移动，20m×2组，激活下肢+协调性",
    category: "no_ball",
  },
  "warm-lateral-lunge": {
    id: "warm-lateral-lunge", name: "侧弓步转脚踝", duration: 1,
    description: "侧弓步到底+脚踝转动，3次/侧×2组，打开髋内收肌+踝活动度",
    category: "no_ball",
  },
  "warm-body-side-bend": {
    id: "warm-body-side-bend", name: "身体侧屈", duration: 1,
    description: "站姿手臂上举侧屈，4次/侧×2组，打开侧表链",
    category: "no_ball",
  },
  "warm-cradle-walk": {
    id: "warm-cradle-walk", name: "摇篮抱", duration: 1,
    description: "双手抱膝至胸前，支撑腿提踵，10m×2组，激活髋屈肌+踝稳定",
    category: "no_ball",
  },
  "warm-shoulder-stretch": {
    id: "warm-shoulder-stretch", name: "肩部拉伸+牵拉体转", duration: 1,
    description: "单臂胸前横拉+躯干旋转，4次/侧×2组，肩关节+胸椎联动",
    category: "no_ball",
  },

  // ═══ ③ 下肢动态拉伸 (Lower Body Dynamic Stretch) ═══
  "warm-front-kick": {
    id: "warm-front-kick", name: "前踢腿", duration: 1,
    description: "直腿前踢至髋高，手触脚尖，10次/侧，动态拉伸腘绳肌",
    category: "no_ball",
  },
  "warm-side-kick": {
    id: "warm-side-kick", name: "侧踢腿", duration: 1,
    description: "侧向摆腿，10次/侧，动态拉伸内收肌+外展肌",
    category: "no_ball",
  },
  "warm-back-kick": {
    id: "warm-back-kick", name: "后踢腿", duration: 1,
    description: "向后摆腿+臀肌收缩，10次/侧，动态拉伸髋屈肌",
    category: "no_ball",
  },
  "warm-leg-swing-in-out": {
    id: "warm-leg-swing-in-out", name: "抬腿后向内+向外", duration: 1,
    description: "单腿支撑，另一腿前后+内外摆动，15s/方向×2组",
    category: "no_ball",
  },
  "warm-multi-lunge": {
    id: "warm-multi-lunge", name: "多方向弓箭步", duration: 1.5,
    description: "前/侧/后三个方向弓箭步，3次/侧/方向，动态拉伸下肢多平面",
    category: "no_ball",
  },
  "warm-calf-stretch": {
    id: "warm-calf-stretch", name: "小腿拉伸", duration: 1,
    description: "弓步推墙小腿后侧拉伸，20s/侧×2组",
    category: "no_ball",
  },
  "warm-thigh-stretch": {
    id: "warm-thigh-stretch", name: "大腿拉伸", duration: 1,
    description: "站姿屈膝拉脚至臀，3次/侧×2组，激活股四头肌",
    category: "no_ball",
  },
  "warm-knee-hug-calf-raise": {
    id: "warm-knee-hug-calf-raise", name: "抱膝提踵+燕式平衡", duration: 1,
    description: "抱膝至胸前→支撑腿提踵→燕式平衡，3次/侧，踝稳定+本体感觉",
    category: "no_ball",
  },
  "warm-wide-squat-toe-touch": {
    id: "warm-wide-squat-toe-touch", name: "宽距摸脚", duration: 1,
    description: "宽距站立前屈摸对侧脚，20s×2组，动态拉伸内收肌+腘绳肌",
    category: "no_ball",
  },
  "warm-hip-rotation-move": {
    id: "warm-hip-rotation-move", name: "转髋移动", duration: 1,
    description: "行进中转髋外展+内收交替，20s×2组，动态打开髋关节",
    category: "no_ball",
  },
  "warm-downward-dog": {
    id: "warm-downward-dog", name: "下犬式", duration: 1,
    description: "下犬式交替踩脚跟，5次/侧×2组，拉伸小腿+腘绳肌+肩带",
    category: "no_ball",
  },
  "warm-frog-stretch": {
    id: "warm-frog-stretch", name: "青蛙趴", duration: 1,
    description: "青蛙趴姿前后移动，30s×2组，打开髋内收肌群",
    category: "no_ball",
  },
  "warm-hip-open-close": {
    id: "warm-hip-open-close", name: "开胯", duration: 1,
    description: "坐姿蝴蝶式上下颤动+前屈，8次×2组，打开髋关节",
    category: "no_ball",
  },

  // ═══ ④ 神经灵敏预备 (Neural Agility Prep) ═══
  "warm-reactive-sprint": {
    id: "warm-reactive-sprint", name: "听口令变向冲刺", duration: 2,
    description: "碎步原地→听哨声/口令瞬间变向冲刺10m，3次，训练反应与加速",
    category: "no_ball",
  },
  "warm-cone-agility": {
    id: "warm-cone-agility", name: "标志盘绕桩跑", duration: 2,
    description: "标志盘S形绕桩跑+转身冲刺，20m×3组，训练变向+加速",
    category: "no_ball",
  },
  "warm-cone-grab": {
    id: "warm-cone-grab", name: "抢标志盘—井字棋", duration: 2,
    description: "两组队员抢标志盘做井字棋，训练反应+决策+竞争意识",
    category: "no_ball",
  },
  "warm-high-knee-turn-sprint": {
    id: "warm-high-knee-turn-sprint", name: "高抬腿后转身冲刺", duration: 1.5,
    description: "原地高抬腿→听哨声转身180°→10m冲刺，2组，神经快速转换",
    category: "no_ball",
  },
  "warm-backward-run-turn-sprint": {
    id: "warm-backward-run-turn-sprint", name: "后退跑+转身冲刺", duration: 1.5,
    description: "后退跑→听哨声→原地跳转→绕标志盘→转身冲刺20m，2组",
    category: "no_ball",
  },
  "warm-forward-hop-side-shuffle": {
    id: "warm-forward-hop-side-shuffle", name: "向前小跳+侧滑步+冲刺", duration: 1.5,
    description: "连续小跳→侧滑步→冲刺跑，20m×2组，多模式移动整合",
    category: "no_ball",
  },
  "warm-cone-hop-turn": {
    id: "warm-cone-hop-turn", name: "标志盘侧移+栏架小跳", duration: 1.5,
    description: "侧向移动过标志盘→栏架小跳→冲刺，20m×2组，灵敏+爆发",
    category: "no_ball",
  },
  "warm-clap-react": {
    id: "warm-clap-react", name: "拍掌听指令反应", duration: 1.5,
    description: "队员围圈，听教练拍掌次数做对应动作，3轮，听觉反应训练",
    category: "no_ball",
  },
  "warm-hand-chain-relay": {
    id: "warm-hand-chain-relay", name: "牵手接力绕桩跑", duration: 1.5,
    description: "两人牵手绕标志盘接力跑，20m×2组，神经兴奋+团队协作",
    category: "no_ball",
  },
  "warm-color-cone-react": {
    id: "warm-color-cone-react", name: "听指令抢指定颜色标志盘", duration: 2,
    description: "教练喊颜色→队员冲刺抢对应颜色标志盘，1min×2组，视觉反应+加速度",
    category: "no_ball",
  },
  "warm-coordination-jumps": {
    id: "warm-coordination-jumps", name: "协调性跳跃123", duration: 1.5,
    description: "不同模式跳跃组合(单脚/双脚/交叉)，30s×2组，神经肌肉协调",
    category: "no_ball",
  },
  },
};

// ═══════════════════════════════════════════════
// 4. TECHNIQUE DRILL LIBRARY (by position)
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
// 5. NUTRITION TEMPLATES (by goal)
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
// 6. PHASE PLAN TEMPLATES
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
// 7. RUNNING PROFILES (by position)
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
// 8. POSITION → EXERCISE MAPPING
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

// Goal → extra exercises to add
export const GOAL_EXTRAS: Record<string, string[]> = {
  strength: ["ex-back-squat", "ex-trap-bar-deadlift", "ex-bench-press", "ex-hip-thrust"],
  power: ["ex-power-clean", "ex-box-jump", "ex-med-ball-slam", "ex-mb-rotational-throw"],
  speed: ["ex-sled-sprint", "ex-box-jump", "ex-bulgarian-split-squat"],
  agility: ["ex-dumbbell-lunges", "ex-single-leg-rdl", "ex-dead-bug"],
  mas_endurance: ["ex-front-squat", "ex-leg-press", "ex-cable-row"],
  combat: ["ex-trap-bar-deadlift", "ex-pallof-press", "ex-bench-press", "ex-hip-thrust"],
};

// ═══════════════════════════════════════════════
// 9. RESOLVER — compact AI output → full TrainingModule
// ═══════════════════════════════════════════════

export interface CompactModule {
  module: string;
  title: string;
  analysis?: string;
  warmup_ids?: string[];
  upper_ids?: string[];
  lower_ids?: string[];
  core_ids?: string[];
  cooldown_ids?: string[];
  nutrition_goal?: string;
  ability_exercise_ids?: string[];
  drill_ids?: string[];
  phase_id?: string;
  injury_phases?: any[];
  combo_id?: string;
  status: string;
}

function notNull<T>(x: T | null | undefined): x is T { return x != null; }

function resolveWarmup(ids: string[]): WarmupItem[] {
  return ids.map(id => {
    const w = WARMUP_LIBRARY[id];
    return w ? { name: w.name, duration: w.duration, description: w.description, category: w.category } as WarmupItem : null;
  }).filter(notNull);
}

function resolveExercises(ids: string[], setsAdj: number = 0): Exercise[] {
  return ids.map(id => {
    const e = STRENGTH_LIBRARY[id];
    if (!e) return null;
    const sets = Math.max(2, Math.min(6, e.sets[0] + setsAdj));
    return {
      name: e.name,
      sets,
      reps: e.reps[0],
      load: e.load_default,
      rest: e.rest,
      rpe: e.rpe,
      heart_rate_zone: e.heart_rate_zone,
      image_url: e.image_url,
    } as Exercise;
  }).filter(notNull);
}

function resolveAbilityExercises(ids: string[]): AbilityExercise[] {
  return ids.map(id => {
    const e = STRENGTH_LIBRARY[id];
    if (!e) return null;
    return {
      name: e.name, sets: e.sets[0], reps: e.reps[0], load: e.load_default,
      rest: e.rest, rpe: e.rpe, heart_rate_zone: e.heart_rate_zone,
      image_url: e.image_url, progression: e.progression,
    } as AbilityExercise;
  }).filter(notNull);
}

function resolveDrills(ids: string[]): Drill[] {
  return ids.map(id => {
    const d = DRILL_LIBRARY[id];
    return d ? { ...d, image_url: d.image_url } as Drill : null;
  }).filter(notNull);
}

function resolveCooldown(ids: string[]): WarmupItem[] {
  return ids.map(id => {
    const c = COOLDOWN_LIBRARY[id];
    return c ? { name: c.name, duration: c.duration, description: c.description, category: "no_ball" as const } : null;
  }).filter(notNull);
}

/**
 * Resolve compact AI output → full TrainingModule
 */
export function resolveModule(c: CompactModule, position?: string | null): TrainingModule | null {
  switch (c.module) {
    case "position_training": {
      const pos = position || "midfielder";
      const posEx = POSITION_EXERCISES[pos] || POSITION_EXERCISES.midfielder;
      const warmupIds = c.warmup_ids || [];
      const upperIds = c.upper_ids || posEx.upper.slice(0, 3);
      const lowerIds = c.lower_ids || posEx.lower.slice(0, 3);
      const coreIds = c.core_ids || posEx.core.slice(0, 2);
      const cooldownIds = c.cooldown_ids || [];
      const nutrition = NUTRITION_TEMPLATES[c.nutrition_goal || "default"];

      return {
        module: "position_training",
        title: c.title,
        analysis: c.analysis,
        warmup: warmupIds.length > 0 ? resolveWarmup(warmupIds) : resolveWarmup(["warm-hip-open", "warm-dynamic-stretch", "warm-ball-touch"]),
        upper_limb: resolveExercises(upperIds),
        lower_limb: resolveExercises(lowerIds),
        core: resolveExercises(coreIds),
        cooldown: cooldownIds.length > 0 ? resolveCooldown(cooldownIds) : resolveCooldown(["cool-static-stretch", "cool-foam-roll"]),
        nutrition,
        status: "complete",
      } as PositionTraining;
    }
    case "ability_training": {
      return {
        module: "ability_training",
        title: c.title,
        exercises: resolveAbilityExercises(c.ability_exercise_ids || []),
        status: "complete",
      } as AbilityTraining;
    }
    case "technique_running": {
      const pos = position || "midfielder";
      return {
        module: "technique_running",
        title: c.title,
        drills: resolveDrills(c.drill_ids || []),
        running_profile: RUNNING_PROFILES[pos] || RUNNING_PROFILES.midfielder,
        status: "complete",
      } as TechniqueRunning;
    }
    case "phase_plan": {
      const phase = PHASE_TEMPLATES[c.phase_id || "competition"];
      return {
        module: "phase_plan",
        title: phase.title,
        weekly_frequency: phase.weekly_frequency,
        session_duration: phase.session_duration,
        intensity_distribution: phase.intensity_distribution,
        recovery_strategy: phase.recovery_strategy,
        status: "complete",
      } as PhasePlan;
    }
    case "injury_recovery": {
      return {
        module: "injury_recovery",
        title: c.title,
        phases: c.injury_phases || [],
        status: c.status as "complete" | "skipped",
      } as InjuryRecovery;
    }
    default:
      return null;
  }
}

/**
 * Resolve all modules from AI output
 */
export function resolveAllModules(compactModules: CompactModule[], position?: string | null): TrainingModule[] {
  return compactModules.map(c => resolveModule(c, position)).filter(Boolean) as TrainingModule[];
}

// ═══════════════════════════════════════════════
// 10. ATHLETE COMBO LIBRARY — position×goal×phase pre-built packages
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
// 11. TACTICAL DRILL LIBRARY (by tactical theme)
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
  diagram?: import("@/lib/types").DrillDiagram; // 内联示意图数据
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
// 12. SMALL-SIDED GAME LIBRARY
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
// 13. MICROCYCLE TEMPLATES
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
// 14. COACH SESSION TEMPLATES (league×theme)
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

// ═══════════════════════════════════════════════
// 15. COACH MODULE RESOLVERS
// ═══════════════════════════════════════════════

export interface CoachCompactModule {
  module: string;
  title: string;
  // session_plan fields
  duration?: number;
  player_count?: number;
  equipment?: string[];
  warmup_ids?: string[];
  activity_ids?: string[];
  ssg_id?: string;
  cooldown_ids?: string[];
  // tactical_focus fields
  tactical_theme?: string;
  drill_ids?: string[];
  tactical_analysis?: string[];
  formation_notes?: string;
  pressing_triggers?: string;
  defensive_shape?: string;
  attacking_patterns?: string;
  transition_moments?: string;
  set_piece_offense?: string;
  set_piece_defense?: string;
  player_roles?: string[];
  counter_structure?: string;
  build_up_phase?: string;
  midfield_transition?: string;
  final_third?: string;
  defensive_block?: string;
  // microcycle fields
  match_day?: string;
  microcycle_id?: string;
  status: string;
}

function resolveCoachWarmup(ids: string[]): WarmupItem[] {
  return ids.map(id => {
    const w = WARMUP_LIBRARY[id];
    return w ? { name: w.name, duration: w.duration, description: w.description, category: w.category } as WarmupItem : null;
  }).filter(notNull);
}

function resolveCoachCooldown(ids: string[]): WarmupItem[] {
  return ids.map(id => {
    const c = COOLDOWN_LIBRARY[id];
    return c ? { name: c.name, duration: c.duration, description: c.description, category: "no_ball" as const } : null;
  }).filter(notNull);
}

function resolveSessionActivities(ids: string[]): SessionActivityRef[] {
  return ids.map(id => {
    const t = TACTICAL_DRILL_LIBRARY[id];
    if (!t) return null;
    return {
      name: t.name, duration: t.duration, area: t.area, groups: t.players,
      description: t.description, coaching_points: t.coaching_points,
      progression: t.progression, regression: t.regression,
      ...(t.diagram ? { diagram: t.diagram } : {}),
    } as SessionActivityRef;
  }).filter(notNull);
}

function resolveSSG(ssgId: string): SSGRef | null {
  return SSG_LIBRARY[ssgId] || null;
}

function resolveMicrocycle(idOrMatchDay: string): MicrocycleRef | null {
  // Try direct ID lookup first
  if (MICROCYCLE_TEMPLATES[idOrMatchDay]) return MICROCYCLE_TEMPLATES[idOrMatchDay];
  // Fallback: match by label or default to 1game
  const found = Object.values(MICROCYCLE_TEMPLATES).find(m => m.label.includes(idOrMatchDay));
  return found || MICROCYCLE_TEMPLATES["microcycle-1game"];
}

/**
 * Resolve coach compact AI output → full coach module
 */
export function resolveCoachModule(c: CoachCompactModule): TrainingModule | null {
  switch (c.module) {
    case "session_plan": {
      const warmupIds = c.warmup_ids || ["warm-light-jog","warm-dynamic-stretch","warm-rondo"];
      const activityIds = c.activity_ids || [];
      const cooldownIds = c.cooldown_ids || ["cool-light-jog","cool-static-stretch"];
      const ssg = c.ssg_id ? resolveSSG(c.ssg_id) : SSG_LIBRARY["ssg-6v6-possession"];
      return {
        module: "session_plan",
        title: c.title,
        duration: c.duration || 75,
        player_count: c.player_count || 18,
        equipment: c.equipment || ["标志盘×16","号坎×3色","球×20"],
        warmup: resolveCoachWarmup(warmupIds),
        activities: resolveSessionActivities(activityIds),
        ssg: ssg || SSG_LIBRARY["ssg-6v6-possession"],
        cooldown: resolveCoachCooldown(cooldownIds),
        status: "complete",
      } as any;
    }
    case "tactical_focus": {
      const drillIds = c.drill_ids || [];
      return {
        module: "tactical_focus",
        title: c.title,
        tactical_theme: c.tactical_theme || "possession",
        drills: resolveSessionActivities(drillIds),
        tactical_analysis: c.tactical_analysis,
        formation_notes: c.formation_notes,
        pressing_triggers: c.pressing_triggers,
        defensive_shape: c.defensive_shape,
        attacking_patterns: c.attacking_patterns,
        transition_moments: c.transition_moments,
        set_piece_offense: c.set_piece_offense,
        set_piece_defense: c.set_piece_defense,
        player_roles: c.player_roles,
        counter_structure: c.counter_structure,
        build_up_phase: c.build_up_phase,
        midfield_transition: c.midfield_transition,
        final_third: c.final_third,
        defensive_block: c.defensive_block,
        status: "complete",
      } as any;
    }
    case "microcycle": {
      const mc = resolveMicrocycle(c.microcycle_id || c.match_day || "一周一赛");
      return {
        module: "microcycle",
        title: c.title,
        match_day: mc?.match_day || c.match_day || "周日",
        days: mc?.days || [],
        status: "complete",
      } as any;
    }
    default:
      return null;
  }
}
