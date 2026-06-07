/**
 * Training Reference Library — offline knowledge base
 *
 * All domain knowledge lives here instead of the system prompt.
 * AI outputs compact IDs → server resolves to full data.
 *
 * Sections:
 *   1. Warmup Library
 *   2. Strength Exercise Library (extends exercise-data.ts)
 *   3. Cooldown Library
 *   4. Nutrition Templates
 *   5. Phase Plan Templates
 *   6. Running Profiles
 *   7. Position → Exercise Mapping
 *   8. Resolver Functions
 *   9. Athlete Combo Library
 *  10. Football Core 15
 *  11. Microcycle Templates
 */

import { TrainingModule, PositionTraining, AbilityTraining, TechniqueRunning, PhasePlan, InjuryRecovery, WarmupItem, Exercise, AbilityExercise, NutritionInfo } from "./types";

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
};

// ═══════════════════════════════════════════════
// 2. STRENGTH EXERCISE LIBRARY
// ═══════════════════════════════════════════════

export interface ExerciseRef {
  id: string;
  name: string;
  /** Explicit body part */
  bodyPart?: "上半身" | "下半身" | "全身";
  /** Explicit equipment */
  equipment?: "杠铃" | "哑铃" | "壶铃" | "悬吊" | "自重" | "弹力带" | "药球" | "波速球" | "跳箱";
  /** Explicit exercise type */
  exerciseType?: "力量" | "步伐" | "跳跃" | "拉伸" | "爆发" | "核心";
  sets: [number, number];
  reps: [number, number];
  reps_unit?: "reps" | "seconds" | "meters";
  load_default: string;
  rest: number;
  rpe: number;
  heart_rate_zone: string;
  image_url?: string;
  cue_points: string[];
  progression: string;
  regression?: string;
  periodization?: {
    preseason?: string;
    competition?: string;
    offseason?: string;
  };
  /** Where this exercise is performed */
  scene?: "pitch" | "gym" | "both";
  /** Injury types that contraindicate this exercise */
  injury_contraindications?: string[];
}

export const STRENGTH_LIBRARY: Record<string, ExerciseRef> = {
  // ══ 下半身 · 力量 · 杠铃 ══
  "ex-barbell-back-squat": {
    id: "ex-barbell-back-squat", name: "颈后深蹲",
    bodyPart: "下半身", equipment: "杠铃", exerciseType: "力量",
    sets: [3, 5], reps: [3, 6], load_default: "75-85% 1RM", rest: 180, rpe: 8, heart_rate_zone: "Zone1-2",
    cue_points: ["杠铃置斜方肌", "膝与脚尖同向", "底部大腿与地面平行", "重心在足中"],
    progression: "1.5倍深蹲（底部停顿后起至半程再下蹲）",
    regression: "自重深蹲（无负重，注重动作模式）",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-back-squat-front.gif",
    scene: "gym", injury_contraindications: ["knee", "waist"],
  },
  "ex-barbell-front-squat": {
    id: "ex-barbell-front-squat", name: "前蹲",
    bodyPart: "下半身", equipment: "杠铃", exerciseType: "力量",
    sets: [3, 4], reps: [4, 8], load_default: "65-80% 1RM", rest: 180, rpe: 7, heart_rate_zone: "Zone1-2",
    cue_points: ["杠铃置锁骨前三角肌", "肘部抬高", "躯干直立", "膝与脚尖同向"],
    progression: "停顿前蹲（底部停顿2秒）",
    regression: "高脚杯深蹲（壶铃置胸前，减轻腰椎压力）",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-front-squat-front.gif",
    scene: "gym", injury_contraindications: ["knee", "waist", "wrist"],
  },
  "ex-barbell-rdl": {
    id: "ex-barbell-rdl", name: "RDL",
    bodyPart: "下半身", equipment: "杠铃", exerciseType: "力量",
    sets: [3, 4], reps: [6, 10], load_default: "60-75% 1RM", rest: 120, rpe: 7, heart_rate_zone: "Zone1-2",
    cue_points: ["微屈膝", "髋部后移", "杠铃贴腿", "背部平直"],
    progression: "单腿RDL",
    regression: "徒手单腿RDL（减负荷，提升单侧稳定性）",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-romanian-deadlift-front.gif",
    scene: "gym", injury_contraindications: ["waist", "hamstring"],
  },
  "ex-barbell-hip-thrust": {
    id: "ex-barbell-hip-thrust", name: "臀冲",
    bodyPart: "下半身", equipment: "杠铃", exerciseType: "力量",
    sets: [3, 4], reps: [8, 12], load_default: "60-80% 1RM", rest: 120, rpe: 7, heart_rate_zone: "Zone1-2",
    cue_points: ["肩胛骨靠凳", "杠铃置髋部", "臀部上推至水平", "顶部停顿1秒"],
    progression: "单腿臀冲",
    regression: "徒手臀桥（无负重，激活臀肌感知）",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-hip-thrust-front.gif",
    scene: "gym", injury_contraindications: ["waist"],
  },

  // ══ 下半身 · 力量 · 壶铃 ══
  "ex-kb-front-squat": {
    id: "ex-kb-front-squat", name: "壶铃前蹲",
    bodyPart: "下半身", equipment: "壶铃", exerciseType: "力量",
    sets: [3, 4], reps: [6, 10], load_default: "中-重壶铃", rest: 120, rpe: 7, heart_rate_zone: "Zone2-3",
    cue_points: ["壶铃架于胸前", "躯干直立", "深度至大腿平行地面", "肘部内收"],
    progression: "双壶铃前蹲",
    regression: "自重深蹲（无负重，先掌握动作模式）",
    image_url: "https://musclewiki.com/media/uploads/male-kettlebell-front-squat-front.gif",
    scene: "gym",
  },
  "ex-kb-rdl": {
    id: "ex-kb-rdl", name: "壶铃RDL",
    bodyPart: "下半身", equipment: "壶铃", exerciseType: "力量",
    sets: [3, 4], reps: [8, 12], load_default: "中-重壶铃", rest: 90, rpe: 6, heart_rate_zone: "Zone1-2",
    cue_points: ["微屈膝", "髋部后移", "壶铃贴腿下放", "感受腘绳肌拉伸"],
    progression: "单腿壶铃RDL",
    regression: "徒手髋铰链练习（减负荷，感受腘绳肌拉伸）",
    image_url: "https://musclewiki.com/media/uploads/male-kettlebell-single-leg-deadlift-front.gif",
    scene: "gym", injury_contraindications: ["waist"],
  },
  "ex-kb-goblet-squat": {
    id: "ex-kb-goblet-squat", name: "壶铃高脚杯深蹲",
    bodyPart: "下半身", equipment: "壶铃", exerciseType: "力量",
    sets: [3, 5], reps: [8, 15], load_default: "中壶铃", rest: 90, rpe: 6, heart_rate_zone: "Zone2-3",
    cue_points: ["壶铃托于胸前", "肘部贴膝内侧", "躯干直立", "底部肘触膝"],
    progression: "双壶铃高脚杯深蹲",
    regression: "自重深蹲（无负重，建立基础活动度）",
    image_url: "https://musclewiki.com/media/uploads/male-kettlebell-goblet-squat-front.gif",
    scene: "gym",
  },
  "ex-kb-lunge-walk": {
    id: "ex-kb-lunge-walk", name: "壶铃弓步走",
    bodyPart: "下半身", equipment: "壶铃", exerciseType: "力量",
    sets: [3, 4], reps: [10, 16], reps_unit: "reps", load_default: "中壶铃×2", rest: 90, rpe: 7, heart_rate_zone: "Zone2-3",
    cue_points: ["双壶铃体侧悬挂", "前膝不超脚尖", "后膝近地", "躯干直立前行"],
    progression: "过顶壶铃弓步走",
    regression: "自重弓步（无负重，稳定后再加重）",
    image_url: "https://musclewiki.com/media/uploads/male-kettlebell-lunge-front.gif",
    scene: "gym",
  },
  "ex-kb-split-squat": {
    id: "ex-kb-split-squat", name: "壶铃分腿蹲",
    bodyPart: "下半身", equipment: "壶铃", exerciseType: "力量",
    sets: [3, 4], reps: [8, 12], reps_unit: "reps", load_default: "中-重壶铃×2", rest: 90, rpe: 7, heart_rate_zone: "Zone2-3",
    cue_points: ["分腿站姿", "双壶铃体侧", "后膝下沉", "前腿发力推起"],
    progression: "后脚抬高壶铃分腿蹲",
    regression: "自重分腿蹲（无负重，降低膝髋压力）",
    image_url: "https://musclewiki.com/media/uploads/male-kettlebell-bulgarian-split-squat-front.gif",
    scene: "gym", injury_contraindications: ["knee"],
  },

  // ══ 上半身 · 力量 · 杠铃 ══
  "ex-barbell-bench-press": {
    id: "ex-barbell-bench-press", name: "卧推",
    bodyPart: "上半身", equipment: "杠铃", exerciseType: "力量",
    sets: [3, 5], reps: [4, 8], load_default: "70-85% 1RM", rest: 180, rpe: 8, heart_rate_zone: "Zone1-2",
    cue_points: ["肩胛骨收紧", "五点接触（头肩臀双脚）", "杠铃触胸", "直线上推"],
    progression: "暂停卧推（底部停顿2秒）",
    regression: "俯卧撑（自体重，降低肩关节压力）",
    image_url: "https://musclewiki.com/media/uploads/male-dumbbell-bench-press-front.gif",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-bench-press-front.gif",
    scene: "gym", injury_contraindications: ["shoulder", "elbow"],
  },
  "ex-barbell-strict-press": {
    id: "ex-barbell-strict-press", name: "实力推",
    bodyPart: "上半身", equipment: "杠铃", exerciseType: "力量",
    sets: [3, 5], reps: [3, 6], load_default: "65-80% 1RM", rest: 150, rpe: 8, heart_rate_zone: "Zone1-2",
    cue_points: ["杠铃架于锁骨前", "核心收紧", "直线上推", "头部前伸锁定"],
    progression: "借力推举",
    regression: "哑铃坐姿肩推（有靠背支撑，减少核心需求）",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-overhead-press-front.gif",
    scene: "gym", injury_contraindications: ["shoulder", "waist"],
  },
  "ex-barbell-row": {
    id: "ex-barbell-row", name: "划船",
    bodyPart: "上半身", equipment: "杠铃", exerciseType: "力量",
    sets: [3, 4], reps: [6, 10], load_default: "60-75% 1RM", rest: 120, rpe: 7, heart_rate_zone: "Zone1-2",
    cue_points: ["髋部后移", "背部平直", "杠铃拉至下腹", "肩胛骨收缩"],
    progression: "潘德勒划船（每下触地）",
    regression: "弹力带划船（减负荷，更易控制）",
    image_url: "https://musclewiki.com/media/uploads/male-dumbbell-one-arm-row-front.gif",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-bent-over-row-front.gif",
    scene: "gym", injury_contraindications: ["waist"],
  },

  // ══ 上半身 · 力量 · 哑铃 ══
  "ex-db-bench-press": {
    id: "ex-db-bench-press", name: "哑铃卧推",
    bodyPart: "上半身", equipment: "哑铃", exerciseType: "力量",
    sets: [3, 4], reps: [8, 12], load_default: "中-重哑铃", rest: 120, rpe: 7, heart_rate_zone: "Zone1-2",
    cue_points: ["哑铃置于胸侧", "肩胛骨收紧", "直线上推", "顶部不锁死"],
    progression: "单臂哑铃卧推",
    regression: "俯卧撑（自体重，降低肩关节压力）",
    scene: "gym", injury_contraindications: ["shoulder"],
  },
  "ex-db-one-arm-row": {
    id: "ex-db-one-arm-row", name: "单侧支撑哑铃划船",
    bodyPart: "上半身", equipment: "哑铃", exerciseType: "力量",
    sets: [3, 4], reps: [8, 12], reps_unit: "reps", load_default: "中-重哑铃", rest: 90, rpe: 7, heart_rate_zone: "Zone1-2",
    cue_points: ["一侧手掌和膝盖撑凳", "背部平直", "哑铃拉至髋侧", "肩胛骨充分收缩"],
    progression: "无支撑单臂哑铃划船",
    regression: "弹力带划船（减负荷，更易控制）",
    scene: "gym", injury_contraindications: ["waist"],
  },

  // ══ 上半身 · 力量 · 自重 ══
  "ex-pull-up": {
    id: "ex-pull-up", name: "引体向上",
    bodyPart: "上半身", equipment: "自重", exerciseType: "力量",
    sets: [3, 5], reps: [3, 12], load_default: "自重", rest: 120, rpe: 8, heart_rate_zone: "Zone2-3",
    cue_points: ["正握略宽于肩", "肩胛骨下沉", "下巴过杠", "控制下放"],
    progression: "负重引体向上",
    regression: "弹力带辅助引体",
    image_url: "https://musclewiki.com/media/uploads/male-bodyweight-chinup-front.gif",
    scene: "gym",
  },

  // ══ 全身 · 爆发 · 杠铃 ══
  "ex-barbell-power-clean": {
    id: "ex-barbell-power-clean", name: "杠铃高翻",
    bodyPart: "全身", equipment: "杠铃", exerciseType: "爆发",
    sets: [4, 6], reps: [2, 4], load_default: "60-80% 1RM", rest: 180, rpe: 8, heart_rate_zone: "Zone3-4",
    cue_points: ["杠铃贴腿上拉", "髋膝踝三关节伸展", "快速翻腕接铃", "前架位稳定"],
    progression: "悬垂高翻",
    regression: "壶铃高翻（单侧减负，降低技术要求）",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-power-clean-front.gif",
    scene: "gym", injury_contraindications: ["wrist", "shoulder", "waist"],
  },
  "ex-barbell-high-pull": {
    id: "ex-barbell-high-pull", name: "直臂耸肩",
    bodyPart: "全身", equipment: "杠铃", exerciseType: "爆发",
    sets: [3, 5], reps: [3, 5], load_default: "70-85% 1RM", rest: 120, rpe: 7, heart_rate_zone: "Zone3-4",
    cue_points: ["杠铃贴腿", "爆发性耸肩", "肘部向上向外拉", "杠铃至胸高度"],
    progression: "高翻（接杠）",
    regression: "哑铃耸肩（减负荷，降低协调要求）",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-high-pull-front.gif",
    scene: "gym", injury_contraindications: ["shoulder"],
  },
  "ex-barbell-jerk": {
    id: "ex-barbell-jerk", name: "挺举",
    bodyPart: "全身", equipment: "杠铃", exerciseType: "爆发",
    sets: [4, 6], reps: [2, 4], load_default: "60-80% 1RM", rest: 180, rpe: 8, heart_rate_zone: "Zone3-4",
    cue_points: ["前架位起始", "预蹲后爆发上推", "分腿下蹲接铃", "收腿锁定"],
    progression: "半挺（不分腿）",
    regression: "哑铃火箭推（减负荷，降低肩腕压力）",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-jerk-front.gif",
    scene: "gym", injury_contraindications: ["shoulder", "wrist", "knee"],
  },
  "ex-barbell-snatch": {
    id: "ex-barbell-snatch", name: "抓举",
    bodyPart: "全身", equipment: "杠铃", exerciseType: "爆发",
    sets: [4, 6], reps: [2, 4], load_default: "50-75% 1RM", rest: 180, rpe: 8, heart_rate_zone: "Zone3-4",
    cue_points: ["宽握距", "杠铃贴身上拉", "快速下蹲接铃", "过顶锁定"],
    progression: "悬垂抓举",
    regression: "壶铃抓举（单侧减负，降低技术要求）",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-snatch-front.gif",
    scene: "gym", injury_contraindications: ["shoulder", "wrist", "waist"],
  },

  // ══ 全身 · 爆发 · 壶铃 ══
  "ex-kb-clean": {
    id: "ex-kb-clean", name: "壶铃高翻",
    bodyPart: "全身", equipment: "壶铃", exerciseType: "爆发",
    sets: [3, 5], reps: [5, 8], reps_unit: "reps", load_default: "中-重壶铃", rest: 120, rpe: 7, heart_rate_zone: "Zone3-4",
    cue_points: ["壶铃后摆启动", "髋部爆发伸展", "壶铃翻至架位", "手腕中立"],
    progression: "双壶铃高翻",
    regression: "轻壶铃高翻（减重量，先掌握动作节奏）",
    image_url: "https://musclewiki.com/media/uploads/male-kettlebell-clean-front.gif",
    scene: "gym", injury_contraindications: ["wrist"],
  },
  "ex-kb-swing": {
    id: "ex-kb-swing", name: "壶铃甩摆",
    bodyPart: "全身", equipment: "壶铃", exerciseType: "爆发",
    sets: [3, 5], reps: [10, 20], reps_unit: "reps", load_default: "中-重壶铃", rest: 90, rpe: 7, heart_rate_zone: "Zone3-4",
    cue_points: ["髋部铰链发力", "臀肌收缩推壶铃", "手臂仅做杠杆", "壶铃至胸高度"],
    progression: "单臂壶铃甩摆",
    regression: "轻壶铃甩摆（减重量，感受髋部发力）",
    image_url: "https://musclewiki.com/media/uploads/male-kettlebell-swing-front.gif",
    scene: "gym", injury_contraindications: ["waist"],
  },
  "ex-kb-snatch": {
    id: "ex-kb-snatch", name: "壶铃抓举",
    bodyPart: "全身", equipment: "壶铃", exerciseType: "爆发",
    sets: [3, 5], reps: [5, 8], reps_unit: "reps", load_default: "中壶铃", rest: 120, rpe: 8, heart_rate_zone: "Zone3-4",
    cue_points: ["壶铃后摆启动", "髋部爆发+直臂上拉", "手腕穿入壶铃", "过顶锁定"],
    progression: "双壶铃抓举",
    regression: "轻壶铃抓举（减重量，逐步建立过顶稳定）",
    image_url: "https://musclewiki.com/media/uploads/male-kettlebell-snatch-front.gif",
    scene: "gym", injury_contraindications: ["shoulder", "wrist"],
  },
};

// ═══════════════════════════════════════════════
// 3. COOLDOWN LIBRARY
// ═══════════════════════════════════════════════

export interface CooldownRef {
  id: string;
  name: string;
  duration: number; // minutes
  description: string;
}

export const COOLDOWN_LIBRARY: Record<string, CooldownRef> = {
  "cool-static-stretch": {
    id: "cool-static-stretch",
    name: "静态拉伸",
    duration: 5,
    description: "股四头肌(45s每侧) + 腘绳肌(45s每侧) + 臀肌(45s每侧) + 髋屈肌(45s每侧) + 小腿(45s每侧)",
  },
  "cool-foam-roll": {
    id: "cool-foam-roll",
    name: "泡沫轴筋膜放松",
    duration: 5,
    description: "小腿后侧(60s每侧) + 大腿前侧(60s每侧) + 大腿后侧(60s每侧) + 背部(60s) + 臀肌(60s每侧)",
  },
  "cool-breathing": {
    id: "cool-breathing",
    name: "呼吸调节",
    duration: 3,
    description: "腹式深呼吸，吸气4s→屏息2s→呼气6s循环，降低心率至Zone1",
  },
  "cool-light-jog": {
    id: "cool-light-jog",
    name: "慢跑冷却",
    duration: 5,
    description: "低强度慢跑5min，心率逐渐降至Zone1-2",
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
        drills: [],
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
// 12.5 FOOTBALL CORE 15 — 足球核心15动作ID列表
// ═══════════════════════════════════════════════

export const FOOTBALL_CORE_15 = [
  "ex-power-clean", "ex-box-depth-drop", "ex-mb-rotational-throw",
  "ex-back-squat", "ex-romanian-dl", "ex-single-leg-rdl", "ex-nordic-hamstring",
  "ex-bench-press", "ex-barbell-row", "ex-standing-press",
  "ex-plank", "ex-dead-bug",
  "ex-hurdle-jump", "ex-pro-agility", "ex-sprint-start",
];

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

