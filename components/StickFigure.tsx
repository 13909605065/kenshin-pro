"use client";

/* ================================================================
   ExerciseFigure — 专业训练动作示意图

   8 种预设动作姿态 + 肌肉群高亮 + 器材示意 + 动作方向箭头
   替代被墙的外链 GIF 图片

   预设来源参考：
   - NSCA CSCS 第4版（力量训练动作标准）
   - Soccer Anatomy（足球专项动作解剖）
   - 运动解剖学图谱
   ================================================================ */

// ─── Types ──────────────────────────────────────────────────

interface Pt { x: number; y: number }

interface Pose {
  name: string;
  // Joints
  head: Pt; neck: Pt;
  shoulderL: Pt; shoulderR: Pt;
  elbowL: Pt; elbowR: Pt;
  wristL: Pt; wristR: Pt;
  hipL: Pt; hipR: Pt;
  kneeL: Pt; kneeR: Pt;
  ankleL: Pt; ankleR: Pt;
  // Target muscles to highlight
  targetMuscles: ("quads" | "hams" | "glutes" | "chest" | "back" | "shoulders" | "core" | "arms")[];
  // Equipment
  equipment?: "barbell" | "dumbbell" | "kettlebell" | "bodyweight" | "cable";
  // Movement direction
  movement?: "up" | "down" | "forward" | "back" | "none";
}

const POSES: Record<string, Pose> = {
  squat: {
    name: "深蹲",
    head: {x:50,y:10}, neck: {x:50,y:20},
    shoulderL: {x:38,y:26}, shoulderR: {x:62,y:26},
    elbowL: {x:28,y:34}, elbowR: {x:72,y:34},
    wristL: {x:22,y:26}, wristR: {x:78,y:26},
    hipL: {x:40,y:52}, hipR: {x:60,y:52},
    kneeL: {x:36,y:74}, kneeR: {x:64,y:74},
    ankleL: {x:36,y:96}, ankleR: {x:64,y:96},
    targetMuscles: ["quads", "glutes", "core"],
    equipment: "barbell",
    movement: "up",
  },
  deadlift: {
    name: "硬拉",
    head: {x:50,y:10}, neck: {x:50,y:20},
    shoulderL: {x:38,y:26}, shoulderR: {x:62,y:26},
    elbowL: {x:30,y:42}, elbowR: {x:70,y:42},
    wristL: {x:28,y:58}, wristR: {x:72,y:58},
    hipL: {x:40,y:52}, hipR: {x:60,y:52},
    kneeL: {x:38,y:72}, kneeR: {x:62,y:72},
    ankleL: {x:38,y:96}, ankleR: {x:62,y:96},
    targetMuscles: ["hams", "glutes", "back"],
    equipment: "barbell",
    movement: "up",
  },
  bench: {
    name: "卧推",
    head: {x:50,y:60}, neck: {x:50,y:54},
    shoulderL: {x:36,y:48}, shoulderR: {x:64,y:48},
    elbowL: {x:24,y:42}, elbowR: {x:76,y:42},
    wristL: {x:18,y:36}, wristR: {x:82,y:36},
    hipL: {x:42,y:68}, hipR: {x:58,y:68},
    kneeL: {x:42,y:86}, kneeR: {x:58,y:86},
    ankleL: {x:42,y:98}, ankleR: {x:58,y:98},
    targetMuscles: ["chest", "shoulders", "arms"],
    equipment: "barbell",
    movement: "up",
  },
  press: {
    name: "推举",
    head: {x:50,y:8}, neck: {x:50,y:18},
    shoulderL: {x:36,y:24}, shoulderR: {x:64,y:24},
    elbowL: {x:26,y:14}, elbowR: {x:74,y:14},
    wristL: {x:18,y:5}, wristR: {x:82,y:5},
    hipL: {x:42,y:52}, hipR: {x:58,y:52},
    kneeL: {x:42,y:78}, kneeR: {x:58,y:78},
    ankleL: {x:42,y:96}, ankleR: {x:58,y:96},
    targetMuscles: ["shoulders", "arms"],
    equipment: "barbell",
    movement: "up",
  },
  lunge: {
    name: "弓步蹲",
    head: {x:50,y:8}, neck: {x:50,y:18},
    shoulderL: {x:40,y:24}, shoulderR: {x:60,y:22},
    elbowL: {x:32,y:30}, elbowR: {x:68,y:18},
    wristL: {x:26,y:34}, wristR: {x:76,y:16},
    hipL: {x:42,y:52}, hipR: {x:56,y:48},
    kneeL: {x:36,y:70}, kneeR: {x:60,y:64},
    ankleL: {x:36,y:88}, ankleR: {x:64,y:78},
    targetMuscles: ["quads", "glutes"],
    equipment: "dumbbell",
    movement: "down",
  },
  pullup: {
    name: "引体向上",
    head: {x:50,y:16}, neck: {x:50,y:26},
    shoulderL: {x:34,y:32}, shoulderR: {x:66,y:32},
    elbowL: {x:28,y:22}, elbowR: {x:72,y:22},
    wristL: {x:22,y:6}, wristR: {x:78,y:6},
    hipL: {x:43,y:56}, hipR: {x:57,y:56},
    kneeL: {x:43,y:78}, kneeR: {x:57,y:78},
    ankleL: {x:43,y:96}, ankleR: {x:57,y:96},
    targetMuscles: ["back", "arms"],
    equipment: "bodyweight",
    movement: "up",
  },
  pushup: {
    name: "俯卧撑",
    head: {x:50,y:12}, neck: {x:50,y:24},
    shoulderL: {x:36,y:34}, shoulderR: {x:64,y:34},
    elbowL: {x:26,y:42}, elbowR: {x:74,y:42},
    wristL: {x:20,y:52}, wristR: {x:80,y:52},
    hipL: {x:43,y:66}, hipR: {x:57,y:66},
    kneeL: {x:43,y:84}, kneeR: {x:57,y:84},
    ankleL: {x:43,y:98}, ankleR: {x:57,y:98},
    targetMuscles: ["chest", "arms", "core"],
    equipment: "bodyweight",
    movement: "down",
  },
  plank: {
    name: "平板支撑",
    head: {x:50,y:14}, neck: {x:50,y:24},
    shoulderL: {x:34,y:32}, shoulderR: {x:66,y:32},
    elbowL: {x:20,y:32}, elbowR: {x:80,y:32},
    wristL: {x:12,y:32}, wristR: {x:88,y:32},
    hipL: {x:42,y:56}, hipR: {x:58,y:56},
    kneeL: {x:42,y:76}, kneeR: {x:58,y:76},
    ankleL: {x:42,y:96}, ankleR: {x:57,y:96},
    targetMuscles: ["core"],
    equipment: "bodyweight",
    movement: "none",
  },
  bridge: {
    name: "臀桥",
    head: {x:50,y:56}, neck: {x:50,y:52},
    shoulderL: {x:36,y:48}, shoulderR: {x:64,y:48},
    elbowL: {x:20,y:56}, elbowR: {x:80,y:56},
    wristL: {x:14,y:62}, wristR: {x:86,y:62},
    hipL: {x:40,y:42}, hipR: {x:60,y:42},
    kneeL: {x:40,y:64}, kneeR: {x:60,y:64},
    ankleL: {x:40,y:86}, ankleR: {x:60,y:86},
    targetMuscles: ["glutes", "hams"],
    equipment: "bodyweight",
    movement: "up",
  },
};

// ─── Detection ─────────────────────────────────────────────

const DETECT: [RegExp, string][] = [
  [/深蹲|squat|蹲|保加利亚|goblet|front.squat/, "squat"],
  [/硬拉|deadlift|rdl|romanian/, "deadlift"],
  [/卧推|bench|press/, "bench"],
  [/推举|overhead|肩推|shoulder.press|military/, "press"],
  [/弓步|lunge|箭步|split.squat/, "lunge"],
  [/引体|pull.?up|chin|划船|row|lat/, "pullup"],
  [/俯卧撑|push.?up|press.?up/, "pushup"],
  [/平板|plank|侧桥|支撑/, "plank"],
  [/臀桥|bridge|hip.thrust|臀推/, "bridge"],
];

function detect(name: string): string {
  const n = name.toLowerCase();
  for (const [re, key] of DETECT) if (re.test(n)) return key;
  return "squat"; // default
}

// ─── Colors ────────────────────────────────────────────────

const MC: Record<string, string> = {
  quads: "#ff6b6b", hams: "#ff8787", glutes: "#ffa07a",
  chest: "#74b9ff", back: "#a29bfe", shoulders: "#fdcb6e",
  core: "#55efc4", arms: "#fd79a8",
};

// ─── SVG helpers ───────────────────────────────────────────

function L(x1: number, y1: number, x2: number, y2: number, c = "#ccc", w = 2.5) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={w} strokeLinecap="round"/>;
}
function C(cx: number, cy: number, r = 3.5, fill = "#FF2D55") {
  return <circle cx={cx} cy={cy} r={r} fill={fill}/>;
}
function Arrow({ x1, y1, x2, y2, label }: { x1:number; y1:number; x2:number; y2:number; label?:string }) {
  const mx = (x1+x2)/2, my = (y1+y2)/2;
  return <g>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FF2D55" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrow)"/>
    {label && <text x={mx+4} y={my-4} fill="#FF2D55" fontSize="9" fontWeight="bold">{label}</text>}
  </g>;
}

// ─── Muscle highlight ─────────────────────────────────────

function Muscle({ p, muscles, s }: { p: Pose; muscles: string[]; s: number }) {
  const mx = (a: Pt, b: Pt) => ({ x: (a.x+b.x)/2*s, y: (a.y+b.y)/2*s });
  return <g opacity="0.3">
    {muscles.includes("quads") && <ellipse cx={(p.kneeL.x+p.hipL.x)/2*s} cy={(p.kneeL.y+p.hipL.y)/2*s} rx="8" ry="14" fill={MC.quads}/>}
    {muscles.includes("quads") && <ellipse cx={(p.kneeR.x+p.hipR.x)/2*s} cy={(p.kneeR.y+p.hipR.y)/2*s} rx="8" ry="14" fill={MC.quads}/>}
    {muscles.includes("hams") && <ellipse cx={(p.kneeL.x+p.hipL.x)/2*s} cy={(p.kneeL.y+p.hipL.y)/2*s+4} rx="6" ry="12" fill={MC.hams}/>}
    {muscles.includes("glutes") && <circle cx={(p.hipL.x+p.hipR.x)/2*s} cy={(p.hipL.y+p.hipR.y)/2*s} r="10" fill={MC.glutes}/>}
    {muscles.includes("chest") && <ellipse cx={(p.shoulderL.x+p.shoulderR.x)/2*s} cy={p.shoulderL.y*s+6} rx="12" ry="8" fill={MC.chest}/>}
    {muscles.includes("back") && <ellipse cx={(p.shoulderL.x+p.shoulderR.x)/2*s} cy={p.neck.y*s+2} rx="14" ry="10" fill={MC.back}/>}
    {muscles.includes("shoulders") && <circle cx={p.shoulderL.x*s} cy={p.shoulderL.y*s} r="7" fill={MC.shoulders}/>}
    {muscles.includes("shoulders") && <circle cx={p.shoulderR.x*s} cy={p.shoulderR.y*s} r="7" fill={MC.shoulders}/>}
    {muscles.includes("core") && <ellipse cx={(p.hipL.x+p.hipR.x)/2*s} cy={(p.neck.y+p.hipL.y)/2*s} rx="6" ry="16" fill={MC.core}/>}
    {muscles.includes("arms") && <ellipse cx={(p.shoulderL.x+p.elbowL.x)/2*s} cy={(p.shoulderL.y+p.elbowL.y)/2*s} rx="5" ry="9" fill={MC.arms}/>}
    {muscles.includes("arms") && <ellipse cx={(p.shoulderR.x+p.elbowR.x)/2*s} cy={(p.shoulderR.y+p.elbowR.y)/2*s} rx="5" ry="9" fill={MC.arms}/>}
  </g>;
}

// ─── Equipment ────────────────────────────────────────────

function Equip({ p, equip, s }: { p: Pose; equip?: string; s: number }) {
  if (equip === "barbell") {
    const by = p.shoulderL.y * s;
    return <g>
      <line x1={p.wristL.x*s-5} y1={by} x2={p.wristR.x*s+5} y2={by} stroke="#ddd" strokeWidth="3" strokeLinecap="round"/>
      <rect x={p.wristL.x*s-8} y={by-5} width="16" height="10" rx="2" fill="none" stroke="#999" strokeWidth="1.5"/>
      <rect x={p.wristR.x*s-8} y={by-5} width="16" height="10" rx="2" fill="none" stroke="#999" strokeWidth="1.5"/>
    </g>;
  }
  if (equip === "dumbbell") {
    return <g>
      <rect x={p.wristL.x*s-2} y={p.wristL.y*s-10} width="4" height="14" rx="1" fill="#ddd" stroke="#999" strokeWidth="1"/>
      <rect x={p.wristR.x*s-2} y={p.wristR.y*s-10} width="4" height="14" rx="1" fill="#ddd" stroke="#999" strokeWidth="1"/>
    </g>;
  }
  if (equip === "kettlebell") {
    return <g>
      <circle cx={p.wristR.x*s} cy={p.wristR.y*s+6} r="6" fill="none" stroke="#ddd" strokeWidth="2"/>
      <line x1={p.wristR.x*s} y1={p.wristR.y*s} x2={p.wristR.x*s} y2={p.wristR.y*s+3} stroke="#ddd" strokeWidth="2"/>
    </g>;
  }
  return null;
}

// ─── Component ────────────────────────────────────────────

export function StickFigure({ name, size = 120, showMuscles = true }: {
  name: string; size?: number; showMuscles?: boolean;
}) {
  const key = detect(name);
  const p = POSES[key];
  const s = size / 100;

  const x = (j: Pt) => j.x * s;
  const y = (j: Pt) => j.y * s;

  const hx = (x(p.hipL) + x(p.hipR)) / 2;
  const hy = (y(p.hipL) + y(p.hipR)) / 2;
  const sx = (x(p.shoulderL) + x(p.shoulderR)) / 2;
  const sy = (y(p.shoulderL) + y(p.shoulderR)) / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#FF2D55"/>
        </marker>
      </defs>

      {/* Floor line */}
      <line x1={size*0.1} y1={y(p.ankleL)+2} x2={size*0.9} y2={y(p.ankleR)+2} stroke="#333" strokeWidth="1"/>

      {/* Muscle highlights */}
      {showMuscles && <Muscle p={p} muscles={p.targetMuscles} s={s}/>}

      {/* Equipment */}
      <Equip p={p} equip={p.equipment} s={s}/>

      {/* Body skeleton */}
      {L(x(p.head), y(p.head), x(p.neck), y(p.neck))}
      {L(x(p.neck), y(p.neck), sx, sy, "#ffb3b3", 3.5)} {/* torso thicker */}
      {L(x(p.shoulderL), y(p.shoulderL), x(p.shoulderR), y(p.shoulderR), "#ffcccc", 2)}
      {L(sx, sy, hx, hy, "#ffb3b3", 3.5)} {/* spine */}
      {L(x(p.hipL), y(p.hipL), x(p.hipR), y(p.hipR), "#ffcccc", 2)}

      {/* Arms */}
      {L(x(p.shoulderL), y(p.shoulderL), x(p.elbowL), y(p.elbowL), "#ffd4d4", 2.2)}
      {L(x(p.elbowL), y(p.elbowL), x(p.wristL), y(p.wristL), "#ffd4d4", 2.2)}
      {L(x(p.shoulderR), y(p.shoulderR), x(p.elbowR), y(p.elbowR), "#ffd4d4", 2.2)}
      {L(x(p.elbowR), y(p.elbowR), x(p.wristR), y(p.wristR), "#ffd4d4", 2.2)}

      {/* Legs */}
      {L(x(p.hipL), y(p.hipL), x(p.kneeL), y(p.kneeL), "#ffd4d4", 2.2)}
      {L(x(p.kneeL), y(p.kneeL), x(p.ankleL), y(p.ankleL), "#ffd4d4", 2.2)}
      {L(x(p.hipR), y(p.hipR), x(p.kneeR), y(p.kneeR), "#ffd4d4", 2.2)}
      {L(x(p.kneeR), y(p.kneeR), x(p.ankleR), y(p.ankleR), "#ffd4d4", 2.2)}

      {/* Head */}
      <circle cx={x(p.head)} cy={y(p.head)} r={6.5*s} fill="none" stroke="#ffcccc" strokeWidth="2"/>

      {/* Joints */}
      {C(sx, sy, 3, "#FF2D55")} {C(hx, hy, 3, "#FF2D55")}
      {C(x(p.shoulderL), y(p.shoulderL), 2.5)} {C(x(p.shoulderR), y(p.shoulderR), 2.5)}
      {C(x(p.elbowL), y(p.elbowL), 2, "#ff9999")} {C(x(p.elbowR), y(p.elbowR), 2, "#ff9999")}
      {C(x(p.kneeL), y(p.kneeL), 2, "#ff9999")} {C(x(p.kneeR), y(p.kneeR), 2, "#ff9999")}
      {C(x(p.ankleL), y(p.ankleL), 1.5, "#666")} {C(x(p.ankleR), y(p.ankleR), 1.5, "#666")}

      {/* Movement arrow */}
      {p.movement !== "none" && p.movement === "up" && <Arrow x1={size*0.5} y1={y(p.head)-12} x2={size*0.5} y2={y(p.head)-28} label="↑"/>}
      {p.movement !== "none" && p.movement === "down" && <Arrow x1={size*0.5} y1={y(p.head)-28} x2={size*0.5} y2={y(p.head)-12} label="↓"/>}

      {/* Label */}
      <text x={size/2} y={size-4} textAnchor="middle" fill="#555" fontSize={size*0.08} fontWeight="bold">{p.name}</text>
    </svg>
  );
}
