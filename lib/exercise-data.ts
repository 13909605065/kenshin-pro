import { ExerciseLibItem, StrengthTemplate, BodyPart, Equipment } from "./strength-types";

// ====== Label Maps ======

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  chest: "胸部",
  back: "背部",
  legs: "腿部",
  shoulders: "肩部",
  arms: "手臂",
  core: "核心",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "杠铃",
  dumbbell: "哑铃",
  cable: "绳索",
  bodyweight: "自重",
  machine: "器械",
};

// ====== Exercise Library (18 exercises) ======

export const EXERCISE_LIBRARY: ExerciseLibItem[] = [
  // ---- Barbell ----
  {
    id: "barbell-back-squat",
    name: "杠铃后蹲",
    body_part: "legs",
    equipment: "barbell",
    description: "将杠铃置于斜方肌上，双脚与肩同宽，屈膝屈髋下蹲至大腿与地面平行，伸膝伸髋还原。核心收紧，背部保持中立。",
    cue_points: [
      "杠铃置于斜方肌上部，非颈椎",
      "吸气下蹲，保持胸椎伸展",
      "膝关节与脚尖方向一致",
      "重心在足中，勿前倾脚跟离地",
      "底部短暂停顿，爆发性站起"
    ],
    progression: "1.5 倍深蹲（底部停顿后起至半程再下蹲）/ 暂停后蹲（底部停 2 秒消除牵张反射）",
    regression: "高脚杯深蹲（哑铃置于胸前）—— 更容易保持躯干直立",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-back-squat-front.gif",
  },
  {
    id: "deadlift",
    name: "传统硬拉",
    body_part: "back",
    equipment: "barbell",
    description: "双脚与髋同宽，杠铃贴近小腿，屈髋后推、保持背部平直，握杠后伸髋伸膝拉起杠铃至站立位。",
    cue_points: [
      "杠铃全程贴近身体",
      "目视前方，勿低头看杠铃——低头导致圆背",
      "手臂仅作挂钩，勿主动屈肘/前臂发力",
      "启动时腋窝在杠铃正上方",
      "保持脊柱中立，勿弓背",
      "臀部先行发力，勿过早抬臀",
      "锁定位髋膝完全伸展，肩胛收紧"
    ],
    progression: "赤字硬拉（站在杠铃片上，增加运动范围）",
    regression: "架上硬拉（杠铃置于膝高处开始）—— 减少下背部压力",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-deadlift-front.gif",
  },
  {
    id: "bench-press",
    name: "杠铃卧推",
    body_part: "chest",
    equipment: "barbell",
    description: "仰卧于平凳上，握距略宽于肩，下放杠铃至胸部，推起至肘关节锁定。",
    cue_points: [
      "肩胛骨收紧并下沉",
      "双脚踏实地面，建立稳定支点",
      "杠铃触胸点：乳头连线位置",
      "肘关节与身体呈 45° 角，勿外展 90°",
      "推起时想象「掰弯杠铃」激活胸肌"
    ],
    progression: "暂停卧推（底部停顿 2 秒）—— 消除牵张反射",
    regression: "哑铃卧推 —— 更大的活动范围，减少肩关节压力",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-bench-press-front.gif",
  },
  {
    id: "overhead-press",
    name: "杠铃推举",
    body_part: "shoulders",
    equipment: "barbell",
    description: "站立位，杠铃置于锁骨前方，向上推举至头顶上方锁定，控制下放。核心收紧防后仰。",
    cue_points: [
      "握距略宽于肩",
      "腹部和臀肌收紧，防腰椎过度伸展",
      "杠铃轨迹为直线，经过面部时头微后仰",
      "顶部锁定，杠铃在耳后",
      "下放时控制离心，勿砸回锁骨"
    ],
    progression: "站姿单臂哑铃推举（增加核心抗侧屈需求）/ 暂停推举（底部锁定位停顿2秒）",
    regression: "坐姿哑铃推举 —— 消除下肢借力，更安全",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-overhead-press-front.gif",
  },
  {
    id: "bent-over-row",
    name: "杠铃俯身划船",
    body_part: "back",
    equipment: "barbell",
    description: "俯身至躯干与地面约 45°，握杠铃，沿大腿方向拉起至下腹部，顶峰收缩后控制下放。",
    cue_points: [
      "髋关节铰链，保持脊柱中立",
      "肘关节贴近身体",
      "肩胛骨先启动再带动手臂",
      "拉向肚脐位置",
      "下放时完全伸展背阔肌"
    ],
    progression: "潘德雷划船（每次从地面启动，消除牵张反射）",
    regression: "胸部支撑哑铃划船（俯卧斜板上）—— 减少下背负担",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-bent-over-row-front.gif",
  },
  {
    id: "romanian-deadlift",
    name: "罗马尼亚硬拉",
    body_part: "legs",
    equipment: "barbell",
    description: "站立握杠铃，微屈膝，髋部后推使杠铃沿腿前侧下降至小腿中部，伸髋还原。强调腘绳肌拉伸。",
    cue_points: [
      "膝关节微屈但角度不变",
      "臀部尽量后推",
      "杠铃始终贴腿",
      "感受腘绳肌拉伸，勿弓背",
      "伸髋发力回到站立位，臀部收紧"
    ],
    progression: "单腿罗马尼亚硬拉 —— 增加平衡和单侧力量要求",
    regression: "哑铃罗马尼亚硬拉 —— 对握力要求更低",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-romanian-deadlift-front.gif",
  },
  {
    id: "front-squat",
    name: "杠铃前蹲",
    body_part: "legs",
    equipment: "barbell",
    description: "杠铃置于锁骨前方，双手交叉或前架位支撑，保持躯干直立下蹲至大腿平行地面。",
    cue_points: [
      "肘关节抬高，保持杠铃稳定",
      "躯干较后蹲更直立",
      "下蹲深度应达大腿平行或更低",
      "核心全程紧绷防前倾",
      "起立时想象「肘关节引领」，防止躯干前倾——躯干角度保持与下蹲时一致"
    ],
    progression: "暂停前蹲（底部停 2 秒）",
    regression: "高脚杯深蹲 —— 姿势要求相同但负荷更轻",
    image_url: "https://musclewiki.com/media/uploads/male-barbell-front-squat-front.gif",
  },

  // ---- Dumbbell ----
  {
    id: "dumbbell-lunges",
    name: "哑铃弓步走",
    body_part: "legs",
    equipment: "dumbbell",
    description: "双手各持哑铃，交替向前跨步至前后膝关节均约 90°，后膝接近地面但不触碰，前腿发力推回。",
    cue_points: [
      "上身保持直立，不过度前倾",
      "前膝与脚尖方向一致，勿内扣（膝关节在矢状面稳定）",
      "后膝微触地面或距地 2-3cm",
      "核心收紧维持平衡",
      "步幅适中，过大增加髋屈肌压力"
    ],
    progression: "反向弓步 + 膝驱动（加入爆发元素）",
    regression: "自重弓步 —— 先掌握动作模式",
    image_url: "https://musclewiki.com/media/uploads/male-dumbbell-lunges-front.gif",
  },
  {
    id: "dumbbell-shoulder-press",
    name: "哑铃推举",
    body_part: "shoulders",
    equipment: "dumbbell",
    description: "坐姿（有靠背），哑铃置于肩外侧，向上推至头顶，控制下放。",
    cue_points: [
      "腰背紧贴靠背",
      "哑铃轨迹略呈弧线但保持稳定",
      "不完全锁定肘关节以保持张力",
      "下放至耳侧位置即可",
      "避免耸肩，沉肩发力"
    ],
    progression: "单臂交替推举 —— 增加核心抗旋需求",
    regression: "阿诺德推举（旋转式推举）—— 更循序渐进",
    image_url: "https://musclewiki.com/media/uploads/male-dumbbell-shoulder-press-front.gif",
  },
  {
    id: "goblet-squat",
    name: "高脚杯深蹲",
    body_part: "legs",
    equipment: "dumbbell",
    description: "双手托哑铃一端于胸前，肘关节在膝关节内侧，下蹲至大腿平行地面。适合初学者建立动作模式。",
    cue_points: [
      "哑铃始终贴近胸部",
      "肘关节触碰膝关节内侧",
      "躯干保持直立",
      "下蹲时吸气，起立时呼气",
      "脚跟不能离地"
    ],
    progression: "双哑铃前架位深蹲",
    regression: "自重箱式深蹲（坐到凳子上再起）",
    image_url: "https://musclewiki.com/media/uploads/male-dumbbell-goblet-squat-front.gif",
  },

  // ---- Cable ----
  {
    id: "cable-row",
    name: "坐姿绳索划船",
    body_part: "back",
    equipment: "cable",
    description: "坐姿，双脚踩踏板，握 V 柄，挺胸收腹，将手柄拉向腹部，肩胛骨充分收缩。",
    cue_points: [
      "起始时背阔肌有拉伸感",
      "先启动肩胛后缩再屈肘",
      "手柄拉至腹部，肩胛充分收紧",
      "回放时保持控制，不耸肩前送",
      "躯干稳定不前后摇摆"
    ],
    progression: "单臂绳索划船 —— 更大的活动范围",
    regression: "弹力带坐姿划船 —— 可变阻力更友好",
    image_url: "https://musclewiki.com/media/uploads/male-cable-seated-row-front.gif",
  },
  {
    id: "tricep-pushdown",
    name: "绳索三头下压",
    body_part: "arms",
    equipment: "cable",
    description: "站姿，高位滑轮，握绳索或直杆，上臂固定于体侧，伸肘下压至手臂伸直。",
    cue_points: [
      "上臂贴近身体固定",
      "运动只发生在肘关节",
      "底部充分收缩三头肌",
      "回放时控制，不完全屈肘",
      "身体不前倾借力"
    ],
    progression: "仰卧杠铃臂屈伸 —— 更大负重",
    regression: "弹力带三头下压 —— 更轻阻力",
    image_url: "https://musclewiki.com/media/uploads/male-cable-tricep-pushdown-front.gif",
  },
  {
    id: "face-pull",
    name: "绳索面拉",
    body_part: "shoulders",
    equipment: "cable",
    description: "高位滑轮，握绳索两端，拉向面部，双手分开至耳侧，肩外旋，激活后束和肩袖。",
    cue_points: [
      "将绳索拉向额头或眼睛高度",
      "双手向外旋转，拇指指向后方",
      "肩胛骨充分后缩",
      "控制离心阶段",
      "重量宜轻，强调动作质量"
    ],
    progression: "单臂绳索面拉",
    regression: "弹力带面拉 —— 阻力曲线更平滑",
    image_url: "https://musclewiki.com/media/uploads/male-cable-face-pull-front.gif",
  },

  // ---- Bodyweight ----
  {
    id: "pull-up",
    name: "引体向上",
    body_part: "back",
    equipment: "bodyweight",
    description: "正握单杠，握距略宽于肩，从完全悬垂位拉起至下巴过杠，控制下放。核心收紧，身体不摆动。",
    cue_points: [
      "起始位肩胛完全上提，背阔肌拉伸",
      "启动时先沉肩，肩胛下抑",
      "胸部拉向杠，非下巴",
      "全程身体不摆动借力",
      "顶部短暂停留挤压背阔肌"
    ],
    progression: "负重引体向上（腰带挂杠铃片）/ 离心引体（跳起后控制下放 5 秒）",
    regression: "弹力带辅助引体向上 / 高位下拉",
    image_url: "https://musclewiki.com/media/uploads/male-bodyweight-pullup-front.gif",
  },
  {
    id: "push-up",
    name: "俯卧撑",
    body_part: "chest",
    equipment: "bodyweight",
    description: "手略宽于肩，身体成一直线，屈肘下降至胸部近地面，推起至肘关节锁定。",
    cue_points: [
      "身体从头到脚一条直线",
      "核心和臀部收紧",
      "肘关节与身体呈 45°",
      "下降至胸部距地 5cm",
      "推起时呼气"
    ],
    progression: "负重俯卧撑 / 吊环俯卧撑",
    regression: "跪姿俯卧撑 / 上斜俯卧撑（手高位）",
    image_url: "https://musclewiki.com/media/uploads/male-bodyweight-pushup-front.gif",
  },

  // ---- Machine ----
  {
    id: "lat-pulldown",
    name: "高位下拉",
    body_part: "back",
    equipment: "machine",
    description: "坐姿，大腿固定垫，宽握横杆，挺胸后仰微角，下拉至锁骨位置，控制上放至起始位。",
    cue_points: [
      "握距约为肩宽 1.5 倍",
      "下拉时先沉肩再屈肘",
      "横杆拉至锁骨/上胸部",
      "躯干不前后摇摆",
      "回放时充分伸展背阔肌"
    ],
    progression: "颈后高位下拉（需良好肩关节活动度）",
    regression: "弹力带下拉 —— 更适合初学者",
    image_url: "https://musclewiki.com/media/uploads/male-machine-lat-pulldown-front.gif",
  },
  {
    id: "leg-press",
    name: "腿举",
    body_part: "legs",
    equipment: "machine",
    description: "坐于腿举机，双脚与肩同宽置于踏板，解锁安全杆，屈膝至 90° 后伸膝还原。背部紧贴靠垫。",
    cue_points: [
      "全脚掌贴于踏板",
      "膝关节与脚尖方向一致",
      "下降至膝角 90° 即可，勿过深",
      "推起时不完全锁定膝关节",
      "腰部始终紧贴靠垫"
    ],
    progression: "单腿腿举 —— 纠正双侧不平衡",
    regression: "自重箱式深蹲",
    image_url: "https://musclewiki.com/media/uploads/male-machine-leg-press-front.gif",
  },
  {
    id: "cable-chest-fly",
    name: "绳索飞鸟",
    body_part: "chest",
    equipment: "cable",
    description: "站姿中立位，双手各握高位滑轮手柄，肘微屈固定角度，向胸前合拢手臂至双手相遇，控制张开。",
    cue_points: [
      "肘关节保持微屈且角度不变",
      "动作弧线如「抱大树」",
      "顶峰收缩胸肌 1 秒",
      "回放时感受胸肌拉伸",
      "身体不前后摆动借力"
    ],
    progression: "低位绳索飞鸟 —— 侧重上胸",
    regression: "哑铃飞鸟（平凳）",
    image_url: "https://musclewiki.com/media/uploads/male-cable-chest-fly-front.gif",
  },

  // ---- Bodyweight / Plyometric / Core (football-specific) ----
  {
    id: "nordic-hamstring-curl",
    name: "北欧腘绳肌弯举",
    body_part: "legs",
    equipment: "bodyweight",
    description: "跪姿，脚踝固定（搭档压住或器械固定），身体笔直，缓慢前倾至极限后用手缓冲推回。全程髋关节保持伸展，腘绳肌离心控制。",
    cue_points: [
      "髋关节始终保持伸展，身体从头到膝一条直线",
      "用腘绳肌控制下降速度，尽量慢放",
      "下降到无法控制时用手缓冲",
      "回推时尽量减少手臂辅助",
      "初期可从半程开始，逐步增加下降幅度"
    ],
    progression: "全程无手辅助（需极高腘绳肌离心力量）",
    regression: "半程下落（45°即回推）/ 弹力带辅助",
    image_url: "https://musclewiki.com/media/uploads/male-bodyweight-nordic-hamstring-curl-front.gif",
  },
  {
    id: "box-jump",
    name: "跳箱",
    body_part: "legs",
    equipment: "bodyweight",
    description: "面对跳箱站立，屈膝摆臂爆发性跳上箱面，双脚同时落箱、膝关节缓冲吸收冲击。下箱时走下（勿跳下，保护跟腱）。",
    cue_points: [
      "摆臂充分，利用手臂动量辅助起跳",
      "双脚同时起跳同时落地",
      "落箱时膝关节微屈缓冲，重心稳定",
      "跳上非跳下——走下箱保护跟腱",
      "选择合适高度，保证落箱姿态完美为前提"
    ],
    progression: "负重跳箱（手持轻哑铃）/ 深蹲跳箱（从坐姿起跳）",
    regression: "台阶跳（矮箱）/ 反向跳箱（地面跳至最低箱面）",
    image_url: "https://musclewiki.com/media/uploads/male-bodyweight-box-jump-front.gif",
  },
  {
    id: "pallof-press",
    name: "抗旋推",
    body_part: "core",
    equipment: "cable",
    description: "侧对绳索站立，双手握手柄于胸前，向正前方推出至肘伸直，保持 2 秒后收回。全程核心抗旋，躯干不随绳索旋转。",
    cue_points: [
      "双脚与肩同宽，微屈膝稳定下盘",
      "核心全程紧绷，对抗绳索拉力方向",
      "推出和收回速度一致，控制节奏",
      "躯干保持中立位，不倾斜不旋转",
      "两侧均等训练"
    ],
    progression: "单跪姿抗旋推（减少下盘支撑，增加核心挑战）",
    regression: "弹力带抗旋推（阻力更小）/ 减少推出距离",
    image_url: "https://musclewiki.com/media/uploads/male-cable-pallof-press-front.gif",
  },
  {
    id: "single-leg-rdl",
    name: "单腿罗马尼亚硬拉",
    body_part: "legs",
    equipment: "dumbbell",
    description: "单腿站立，对侧手持哑铃，支撑腿微屈膝，髋部后推使躯干前倾、自由腿向后伸展，保持髋部水平。哑铃沿支撑腿下降至小腿中部，伸髋还原。",
    cue_points: [
      "髋部保持水平，勿向自由腿侧倾斜",
      "支撑腿微屈膝但角度不变",
      "自由腿与躯干成一条直线向后延伸",
      "哑铃始终贴近支撑腿",
      "目视前下方地面，保持脊柱中立",
      "初期可扶墙辅助平衡"
    ],
    progression: "单腿 RDL + 膝驱动（还原时自由腿向前顶膝）",
    regression: "手扶墙/TRX 辅助单腿 RDL / 双侧罗马尼亚硬拉",
    image_url: "https://musclewiki.com/media/uploads/male-dumbbell-single-leg-deadlift-front.gif",
  },
];

// ====== Preset Templates (4 templates) ======

export const STRENGTH_TEMPLATES: StrengthTemplate[] = [
  {
    id: "pure-strength",
    name: "纯力量",
    description: "大重量低次数，发展最大力量和神经肌肉募集。适合准备期早期力量储备阶段。",
    difficulty: "advanced",
    exercises: [
      { exerciseId: "barbell-back-squat", sets: 5, reps: 5, load: "85% 1RM", rest: 180 },
      { exerciseId: "deadlift", sets: 5, reps: 5, load: "85% 1RM", rest: 180 },
      { exerciseId: "bench-press", sets: 5, reps: 5, load: "85% 1RM", rest: 180 },
      { exerciseId: "overhead-press", sets: 4, reps: 5, load: "85% 1RM", rest: 180 },
      { exerciseId: "bent-over-row", sets: 4, reps: 5, load: "85% 1RM", rest: 180 },
    ],
  },
  {
    id: "hypertrophy",
    name: "肌肥大",
    description: "中等重量中高次数，注重肌肉在张力下的时间。适合赛前准备期的肌肉量维持与增长。",
    difficulty: "intermediate",
    exercises: [
      { exerciseId: "barbell-back-squat", sets: 4, reps: 10, load: "70% 1RM", rest: 90 },
      { exerciseId: "bench-press", sets: 4, reps: 10, load: "70% 1RM", rest: 90 },
      { exerciseId: "romanian-deadlift", sets: 3, reps: 12, load: "65% 1RM", rest: 75 },
      { exerciseId: "cable-row", sets: 3, reps: 12, load: "65% 1RM", rest: 75 },
      { exerciseId: "dumbbell-shoulder-press", sets: 3, reps: 12, load: "65% 1RM", rest: 75 },
      { exerciseId: "dumbbell-lunges", sets: 3, reps: 10, load: "67% 1RM", rest: 75 },
      { exerciseId: "push-up", sets: 3, reps: 15, load: "自重", rest: 60 },
      { exerciseId: "pull-up", sets: 3, reps: 10, load: "自重", rest: 60 },
    ],
  },
  {
    id: "sport-power",
    name: "专项体能",
    description: "足球专项爆发力与损伤预防训练。强调动作速率、单侧稳定性和腘绳肌保护。适合赛季中维持（每周1-2次）。",
    difficulty: "intermediate",
    exercises: [
      { exerciseId: "box-jump", sets: 4, reps: 5, load: "自重", rest: 120 },
      { exerciseId: "front-squat", sets: 4, reps: 5, load: "75% 1RM（爆发性向心）", rest: 150 },
      { exerciseId: "nordic-hamstring-curl", sets: 3, reps: 5, load: "自重", rest: 120 },
      { exerciseId: "single-leg-rdl", sets: 3, reps: 8, load: "50% 1RM", rest: 90 },
      { exerciseId: "pull-up", sets: 3, reps: 6, load: "自重", rest: 90 },
      { exerciseId: "pallof-press", sets: 3, reps: 10, load: "中等", rest: 60 },
    ],
  },
  {
    id: "foundation",
    name: "基础力量",
    description: "入门级全身力量训练，建立基础动作模式。适合初学者或休赛期维持训练。",
    difficulty: "beginner",
    exercises: [
      { exerciseId: "goblet-squat", sets: 3, reps: 12, load: "50% 1RM", rest: 90 },
      { exerciseId: "push-up", sets: 3, reps: 10, load: "自重", rest: 60 },
      { exerciseId: "lat-pulldown", sets: 3, reps: 12, load: "60% 1RM", rest: 90 },
      { exerciseId: "dumbbell-shoulder-press", sets: 3, reps: 12, load: "55% 1RM", rest: 90 },
      { exerciseId: "cable-row", sets: 3, reps: 12, load: "60% 1RM", rest: 90 },
      { exerciseId: "single-leg-rdl", sets: 3, reps: 10, load: "40% 1RM", rest: 90 },
      { exerciseId: "leg-press", sets: 3, reps: 12, load: "60% 1RM", rest: 90 },
    ],
  },
];

// ====== Helpers ======

/** Look up an exercise from the library by ID */
export function findExercise(id: string): ExerciseLibItem | undefined {
  return EXERCISE_LIBRARY.find((ex) => ex.id === id);
}

/** Map body_part to module section */
export function bodyPartToSection(body_part: BodyPart): "upper" | "lower" | "core" {
  switch (body_part) {
    case "chest":
    case "shoulders":
    case "arms":
      return "upper";
    case "legs":
      return "lower";
    case "back":
    case "core":
      return "core";
  }
}
