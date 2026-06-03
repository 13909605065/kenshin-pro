"use client";

/* ================================================================
   ExerciseFigure v3 — 专业训练动作示意图

   三色肌肉标注 · 骨骼粗细分层 · 动态箭头 · 关节角度标识
   按 NSCA CSCS / Soccer Anatomy 标准
   ================================================================ */

interface Pt { x: number; y: number }

interface MuscleGroup { agonists: string[]; synergists: string[]; stabilizers: string[] }

interface Pose {
  name: string;
  head: Pt; neck: Pt; shoulderL: Pt; shoulderR: Pt;
  elbowL: Pt; elbowR: Pt; wristL: Pt; wristR: Pt;
  hipL: Pt; hipR: Pt; kneeL: Pt; kneeR: Pt;
  ankleL: Pt; ankleR: Pt;
  muscles: MuscleGroup;
  equip?: "barbell" | "dumbbell" | "body";
  move: "concentric" | "eccentric" | "static";
  angleHints?: { joint: Pt; angle: number }[];
}

/* ================================================================
   POSE DATA — highly distinct, anatomically referenced
   ================================================================ */

const POSES: Record<string, Pose> = {
  squat: {
    name: "深蹲",
    head:{x:50,y:8}, neck:{x:50,y:16},
    shoulderL:{x:36,y:24}, shoulderR:{x:64,y:24},
    elbowL:{x:26,y:32}, elbowR:{x:74,y:32},
    wristL:{x:20,y:24}, wristR:{x:80,y:24},
    hipL:{x:38,y:54}, hipR:{x:62,y:54},
    kneeL:{x:32,y:76}, kneeR:{x:68,y:76},
    ankleL:{x:32,y:98}, ankleR:{x:68,y:98},
    muscles:{agonists:["quads","glutes"],synergists:["core"],stabilizers:["hams","back"]},
    equip:"barbell", move:"concentric",
    angleHints:[{joint:{x:32,y:76},angle:90}],
  },
  deadlift: {
    name: "硬拉",
    head:{x:50,y:12}, neck:{x:50,y:22},
    shoulderL:{x:34,y:30}, shoulderR:{x:66,y:30},
    elbowL:{x:28,y:50}, elbowR:{x:72,y:50},
    wristL:{x:26,y:68}, wristR:{x:74,y:68},
    hipL:{x:38,y:54}, hipR:{x:62,y:54},
    kneeL:{x:36,y:76}, kneeR:{x:64,y:76},
    ankleL:{x:36,y:98}, ankleR:{x:64,y:98},
    muscles:{agonists:["hams","glutes"],synergists:["back"],stabilizers:["core","shoulders"]},
    equip:"barbell", move:"concentric",
  },
  bench: {
    name: "卧推",
    head:{x:50,y:62}, neck:{x:50,y:56},
    shoulderL:{x:32,y:50}, shoulderR:{x:68,y:50},
    elbowL:{x:22,y:44}, elbowR:{x:78,y:44},
    wristL:{x:16,y:32}, wristR:{x:84,y:32},
    hipL:{x:44,y:72}, hipR:{x:56,y:72},
    kneeL:{x:44,y:88}, kneeR:{x:56,y:88},
    ankleL:{x:44,y:98}, ankleR:{x:56,y:98},
    muscles:{agonists:["chest"],synergists:["shoulders","arms"],stabilizers:["core"]},
    equip:"barbell", move:"concentric",
    angleHints:[{joint:{x:22,y:44},angle:45}],
  },
  press: {
    name: "推举",
    head:{x:50,y:6}, neck:{x:50,y:16},
    shoulderL:{x:34,y:22}, shoulderR:{x:66,y:22},
    elbowL:{x:22,y:12}, elbowR:{x:78,y:12},
    wristL:{x:14,y:4}, wristR:{x:86,y:4},
    hipL:{x:42,y:52}, hipR:{x:58,y:52},
    kneeL:{x:42,y:80}, kneeR:{x:58,y:80},
    ankleL:{x:42,y:98}, ankleR:{x:58,y:98},
    muscles:{agonists:["shoulders"],synergists:["arms"],stabilizers:["core"]},
    equip:"barbell", move:"concentric",
  },
  lunge: {
    name: "弓步蹲",
    head:{x:50,y:6}, neck:{x:50,y:16},
    shoulderL:{x:38,y:22}, shoulderR:{x:62,y:22},
    elbowL:{x:30,y:34}, elbowR:{x:70,y:34},
    wristL:{x:24,y:46}, wristR:{x:76,y:46},
    hipL:{x:40,y:52}, hipR:{x:58,y:48},
    kneeL:{x:30,y:72}, kneeR:{x:62,y:66},
    ankleL:{x:22,y:94}, ankleR:{x:66,y:82},
    muscles:{agonists:["quads","glutes"],synergists:["hams"],stabilizers:["core"]},
    equip:"dumbbell", move:"eccentric",
    angleHints:[{joint:{x:30,y:72},angle:90}],
  },
  pullup: {
    name: "引体向上",
    head:{x:50,y:18}, neck:{x:50,y:26},
    shoulderL:{x:30,y:34}, shoulderR:{x:70,y:34},
    elbowL:{x:24,y:24}, elbowR:{x:76,y:24},
    wristL:{x:18,y:5}, wristR:{x:82,y:5},
    hipL:{x:42,y:58}, hipR:{x:58,y:58},
    kneeL:{x:40,y:80}, kneeR:{x:60,y:80},
    ankleL:{x:40,y:98}, ankleR:{x:60,y:98},
    muscles:{agonists:["back"],synergists:["arms"],stabilizers:["core"]},
    equip:"body", move:"concentric",
  },
  pushup: {
    name: "俯卧撑",
    head:{x:50,y:16}, neck:{x:50,y:26},
    shoulderL:{x:32,y:36}, shoulderR:{x:68,y:36},
    elbowL:{x:24,y:46}, elbowR:{x:76,y:46},
    wristL:{x:18,y:56}, wristR:{x:82,y:56},
    hipL:{x:42,y:68}, hipR:{x:58,y:68},
    kneeL:{x:42,y:86}, kneeR:{x:58,y:86},
    ankleL:{x:42,y:98}, ankleR:{x:58,y:98},
    muscles:{agonists:["chest"],synergists:["arms"],stabilizers:["core"]},
    equip:"body", move:"eccentric",
    angleHints:[{joint:{x:24,y:46},angle:45}],
  },
  plank: {
    name: "平板支撑",
    head:{x:50,y:20}, neck:{x:50,y:28},
    shoulderL:{x:30,y:38}, shoulderR:{x:70,y:38},
    elbowL:{x:18,y:38}, elbowR:{x:82,y:38},
    wristL:{x:10,y:38}, wristR:{x:90,y:38},
    hipL:{x:42,y:60}, hipR:{x:58,y:60},
    kneeL:{x:42,y:82}, kneeR:{x:58,y:82},
    ankleL:{x:42,y:98}, ankleR:{x:58,y:98},
    muscles:{agonists:["core"],synergists:[],stabilizers:["shoulders","glutes"]},
    equip:"body", move:"static",
    angleHints:[{joint:{x:18,y:38},angle:90},{joint:{x:42,y:60},angle:180}],
  },
  bridge: {
    name: "臀桥",
    head:{x:50,y:62}, neck:{x:50,y:56},
    shoulderL:{x:32,y:50}, shoulderR:{x:68,y:50},
    elbowL:{x:18,y:60}, elbowR:{x:82,y:60},
    wristL:{x:12,y:66}, wristR:{x:88,y:66},
    hipL:{x:38,y:38}, hipR:{x:62,y:38},
    kneeL:{x:38,y:60}, kneeR:{x:62,y:60},
    ankleL:{x:38,y:84}, ankleR:{x:62,y:84},
    muscles:{agonists:["glutes"],synergists:["hams"],stabilizers:["core"]},
    equip:"body", move:"concentric",
    angleHints:[{joint:{x:38,y:38},angle:90}],
  },
  fly: {
    name: "飞鸟",
    head:{x:50,y:8}, neck:{x:50,y:16},
    shoulderL:{x:30,y:24}, shoulderR:{x:70,y:24},
    elbowL:{x:18,y:28}, elbowR:{x:82,y:28},
    wristL:{x:14,y:34}, wristR:{x:86,y:34},
    hipL:{x:42,y:54}, hipR:{x:58,y:54},
    kneeL:{x:42,y:80}, kneeR:{x:58,y:80},
    ankleL:{x:42,y:98}, ankleR:{x:58,y:98},
    muscles:{agonists:["chest"],synergists:["shoulders"],stabilizers:["core"]},
    equip:"dumbbell", move:"concentric",
  },
  curl: {
    name: "弯举",
    head:{x:50,y:8}, neck:{x:50,y:16},
    shoulderL:{x:38,y:24}, shoulderR:{x:62,y:24},
    elbowL:{x:30,y:30}, elbowR:{x:70,y:30},
    wristL:{x:26,y:22}, wristR:{x:76,y:42},
    hipL:{x:42,y:54}, hipR:{x:58,y:54},
    kneeL:{x:42,y:80}, kneeR:{x:58,y:80},
    ankleL:{x:42,y:98}, ankleR:{x:58,y:98},
    muscles:{agonists:["arms"],synergists:[],stabilizers:["core","shoulders"]},
    equip:"dumbbell", move:"concentric",
  },
  tricep: {
    name: "臂屈伸",
    head:{x:50,y:8}, neck:{x:50,y:16},
    shoulderL:{x:36,y:24}, shoulderR:{x:64,y:24},
    elbowL:{x:26,y:20}, elbowR:{x:74,y:28},
    wristL:{x:20,y:16}, wristR:{x:80,y:22},
    hipL:{x:42,y:54}, hipR:{x:58,y:54},
    kneeL:{x:42,y:80}, kneeR:{x:58,y:80},
    ankleL:{x:42,y:98}, ankleR:{x:58,y:98},
    muscles:{agonists:["arms"],synergists:["shoulders"],stabilizers:["core"]},
    equip:"dumbbell", move:"concentric",
  },
  crunch: {
    name: "卷腹",
    head:{x:50,y:30}, neck:{x:50,y:38},
    shoulderL:{x:36,y:42}, shoulderR:{x:64,y:42},
    elbowL:{x:28,y:50}, elbowR:{x:72,y:50},
    wristL:{x:24,y:56}, wristR:{x:76,y:56},
    hipL:{x:44,y:62}, hipR:{x:56,y:62},
    kneeL:{x:44,y:58}, kneeR:{x:56,y:58},
    ankleL:{x:44,y:54}, ankleR:{x:56,y:54},
    muscles:{agonists:["core"],synergists:[],stabilizers:[]},
    equip:"body", move:"concentric",
  },
  twist: {
    name: "俄转",
    head:{x:50,y:20}, neck:{x:50,y:28},
    shoulderL:{x:30,y:34}, shoulderR:{x:60,y:34},
    elbowL:{x:24,y:42}, elbowR:{x:66,y:38},
    wristL:{x:20,y:50}, wristR:{x:70,y:44},
    hipL:{x:44,y:56}, hipR:{x:56,y:56},
    kneeL:{x:44,y:74}, kneeR:{x:56,y:74},
    ankleL:{x:44,y:94}, ankleR:{x:56,y:94},
    muscles:{agonists:["core"],synergists:[],stabilizers:[]},
    equip:"body", move:"static",
  },
  stretch: {
    name: "拉伸",
    head:{x:50,y:10}, neck:{x:50,y:18},
    shoulderL:{x:30,y:26}, shoulderR:{x:66,y:26},
    elbowL:{x:22,y:20}, elbowR:{x:78,y:36},
    wristL:{x:16,y:18}, wristR:{x:88,y:34},
    hipL:{x:44,y:54}, hipR:{x:56,y:52},
    kneeL:{x:44,y:80}, kneeR:{x:56,y:78},
    ankleL:{x:44,y:98}, ankleR:{x:56,y:96},
    muscles:{agonists:[],synergists:[],stabilizers:["core"]},
    equip:"body", move:"static",
  },
  jump: {
    name: "跳跃",
    head:{x:50,y:4}, neck:{x:50,y:12},
    shoulderL:{x:34,y:20}, shoulderR:{x:66,y:20},
    elbowL:{x:24,y:14}, elbowR:{x:76,y:14},
    wristL:{x:18,y:10}, wristR:{x:82,y:10},
    hipL:{x:40,y:44}, hipR:{x:60,y:44},
    kneeL:{x:36,y:60}, kneeR:{x:64,y:60},
    ankleL:{x:32,y:80}, ankleR:{x:68,y:80},
    muscles:{agonists:["quads","glutes"],synergists:["hams"],stabilizers:["core"]},
    equip:"body", move:"concentric",
  },
  run: {
    name: "跑步",
    head:{x:50,y:10}, neck:{x:50,y:18},
    shoulderL:{x:34,y:24}, shoulderR:{x:60,y:24},
    elbowL:{x:26,y:20}, elbowR:{x:70,y:20},
    wristL:{x:20,y:22}, wristR:{x:76,y:24},
    hipL:{x:40,y:48}, hipR:{x:58,y:48},
    kneeL:{x:30,y:66}, kneeR:{x:64,y:62},
    ankleL:{x:22,y:84}, ankleR:{x:70,y:78},
    muscles:{agonists:["quads","hams"],synergists:["glutes"],stabilizers:["core"]},
    equip:"body", move:"concentric",
  },
  default: {
    name: "动作示意",
    head:{x:50,y:8}, neck:{x:50,y:18},
    shoulderL:{x:36,y:26}, shoulderR:{x:64,y:26},
    elbowL:{x:28,y:42}, elbowR:{x:72,y:42},
    wristL:{x:24,y:56}, wristR:{x:76,y:56},
    hipL:{x:42,y:54}, hipR:{x:58,y:54},
    kneeL:{x:42,y:80}, kneeR:{x:58,y:80},
    ankleL:{x:42,y:98}, ankleR:{x:58,y:98},
    muscles:{agonists:[],synergists:[],stabilizers:["core"]},
    equip:"body", move:"static",
  },
};

/* ================================================================
   DETECTION
   ================================================================ */

const DETECT: [RegExp, string][] = [
  // Lower body
  [/深蹲|squat|蹲|保加利亚|goblet|front\.squat|split/, "squat"],
  [/硬拉|deadlift|rdl|romanian|硬举|早安/, "deadlift"],
  [/弓步|lunge|箭步/, "lunge"],
  [/臀桥|bridge|hip\.thrust|臀推/, "bridge"],
  // Upper push
  [/卧推|bench/, "bench"],
  [/推举|overhead|肩推|shoulder\.press|military/, "press"],
  [/飞鸟|fly|夹胸|crossover|pec/, "fly"],
  // Upper pull
  [/引体|pull.?up|chin|划船|row|lat/, "pullup"],
  [/弯举|curl|二头|bicep/, "curl"],
  [/臂屈伸|三头|tricep|dip|下压|pushdown/, "tricep"],
  // Bodyweight
  [/俯卧撑|push.?up/, "pushup"],
  [/平板|plank|侧桥|支撑/, "plank"],
  // Core
  [/卷腹|crunch|sit.?up|举腿|leg.?raise/, "crunch"],
  [/俄转|russian|twist/, "twist"],
  // Mobility
  [/拉伸|stretch|mobil|flexib/, "stretch"],
  // Cardio/plyo
  [/跳|jump|box|plyo|弹跳/, "jump"],
  [/跑|run|sprint|冲刺/, "run"],
];

function detect(name: string): string {
  const n = name.toLowerCase();
  for (const [re, k] of DETECT) if (re.test(n)) return k;
  return "default";
}

/* ================================================================
   COLORS — project black-pink theme, bone=#eee
   ================================================================ */

const AGONIST = "#FF2D55";      // 🔴 原动肌 — project neon-pink
const SYNERGIST = "#ff9966";    // 🟠 协同肌 — orange
const STABILIZER = "#8B7355";   // 🟤 稳定肌 — brown
const BONE_MAIN = "#eeeeee";    // 主骨 — white
const BONE_THIN = "#aaaaaa";    // 细骨 — light gray
const JOINT = "#999999";        // 关节 — gray

/* ================================================================
   COMPONENT
   ================================================================ */

export function StickFigure({ name, size = 120, showMuscles = true, compact = false }: {
  name: string; size?: number; showMuscles?: boolean; compact?: boolean;
}) {
  const key = detect(name);
  const p = POSES[key];
  const s = size / 100;
  const m = compact ? 0.75 : 1; // 75% scale for card view
  const pad = size * (1 - m) / 2;

  const X = (j: Pt) => j.x * s * m + pad;
  const Y = (j: Pt) => j.y * s * m + pad;

  // Torso polygon
  const torsoPts = `${X(p.shoulderL)},${Y(p.shoulderL)} ${X(p.shoulderR)},${Y(p.shoulderR)} ${X(p.hipR)},${Y(p.hipR)} ${X(p.hipL)},${Y(p.hipL)}`;

  /* helper: bone line */
  const bone = (a: Pt, b: Pt, thick = false) =>
    <line x1={X(a)} y1={Y(a)} x2={X(b)} y2={Y(b)} stroke={thick?BONE_MAIN:BONE_THIN} strokeWidth={thick?3:1.8} strokeLinecap="round"/>;

  /* helper: muscle circle */
  const musc = (cx: number, cy: number, r: number, color: string, ring = false, label?: string) =>
    ring
      ? <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="1" opacity="0.5"/>
      : <circle cx={cx} cy={cy} r={r} fill={color} opacity="0.3"/>;

  /* helper: joint */
  const jt = (j: Pt, r = 1.5) =>
    <circle cx={X(j)} cy={Y(j)} r={r} fill={JOINT}/>;

  /* helper: angle hint — short line at joint */
  const ang = (j: Pt, angle: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    const len = 6 * s;
    return <line x1={X(j)} y1={Y(j)} x2={X(j)+Math.cos(rad)*len} y2={Y(j)+Math.sin(rad)*len} stroke="#888" strokeWidth="0.8" strokeDasharray="2,2"/>;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <defs>
        <marker id="a-solid" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L10,5 L0,10z" fill={AGONIST}/>
        </marker>
        <marker id="a-hollow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L10,5 L0,10z" fill="none" stroke="#999" strokeWidth="1"/>
        </marker>
      </defs>

      {/* Floor line */}
      <line x1={size*.1} y1={Y(p.ankleL)+1} x2={size*.9} y2={Y(p.ankleR)+1} stroke="#333" strokeWidth="0.5"/>

      {/* Muscle groups */}
      {showMuscles && <>
        {/* Agonists — big filled circles */}
        {p.muscles.agonists.map(m => {
          if (m==="quads") return <g key="ag-q">{[
            musc((X(p.kneeL)+X(p.hipL))/2, (Y(p.kneeL)+Y(p.hipL))/2, 7*s, AGONIST),
            musc((X(p.kneeR)+X(p.hipR))/2, (Y(p.kneeR)+Y(p.hipR))/2, 7*s, AGONIST),
          ]}</g>;
          if (m==="hams") return <g key="ag-h">{[
            musc((X(p.kneeL)+X(p.hipL))/2, (Y(p.kneeL)+Y(p.hipL))/2+2*s, 6*s, AGONIST),
            musc((X(p.kneeR)+X(p.hipR))/2, (Y(p.kneeR)+Y(p.hipR))/2+2*s, 6*s, AGONIST),
          ]}</g>;
          if (m==="glutes") return <g key="ag-g">{musc((X(p.hipL)+X(p.hipR))/2, (Y(p.hipL)+Y(p.hipR))/2, 8*s, AGONIST)}</g>;
          if (m==="chest") return <g key="ag-c">{musc((X(p.shoulderL)+X(p.shoulderR))/2, Y(p.shoulderL)+4*s, 10*s, AGONIST)}</g>;
          if (m==="back") return <g key="ag-b">{musc((X(p.shoulderL)+X(p.shoulderR))/2, Y(p.neck)+3*s, 10*s, AGONIST)}</g>;
          if (m==="shoulders") return <g key="ag-s">{[
            musc(X(p.shoulderL), Y(p.shoulderL), 5*s, AGONIST),
            musc(X(p.shoulderR), Y(p.shoulderR), 5*s, AGONIST),
          ]}</g>;
          if (m==="arms") return <g key="ag-ar">{[
            musc((X(p.shoulderL)+X(p.elbowL))/2, (Y(p.shoulderL)+Y(p.elbowL))/2, 4*s, AGONIST),
            musc((X(p.shoulderR)+X(p.elbowR))/2, (Y(p.shoulderR)+Y(p.elbowR))/2, 4*s, AGONIST),
          ]}</g>;
          if (m==="core") return <g key="ag-co">{musc((X(p.hipL)+X(p.hipR))/2, (Y(p.neck)+Y(p.hipL))/2, 5*s, AGONIST)}</g>;
          return null;
        })}
        {/* Synergists — smaller orange dots */}
        {p.muscles.synergists.map(m => {
          if (m==="arms") return <g key="sy-ar">{[
            musc((X(p.shoulderL)+X(p.elbowL))/2, (Y(p.shoulderL)+Y(p.elbowL))/2, 2.5*s, SYNERGIST),
            musc((X(p.shoulderR)+X(p.elbowR))/2, (Y(p.shoulderR)+Y(p.elbowR))/2, 2.5*s, SYNERGIST),
          ]}</g>;
          if (m==="shoulders") return <g key="sy-s">{[
            musc(X(p.shoulderL), Y(p.shoulderL), 3*s, SYNERGIST),
            musc(X(p.shoulderR), Y(p.shoulderR), 3*s, SYNERGIST),
          ]}</g>;
          if (m==="hams") return <g key="sy-h">{[
            musc((X(p.kneeL)+X(p.hipL))/2, (Y(p.kneeL)+Y(p.hipL))/2+2*s, 4*s, SYNERGIST),
            musc((X(p.kneeR)+X(p.hipR))/2, (Y(p.kneeR)+Y(p.hipR))/2+2*s, 4*s, SYNERGIST),
          ]}</g>;
          if (m==="back") return <g key="sy-b">{musc((X(p.shoulderL)+X(p.shoulderR))/2, Y(p.neck)+2*s, 7*s, SYNERGIST)}</g>;
          if (m==="core") return <g key="sy-co">{musc((X(p.hipL)+X(p.hipR))/2, (Y(p.neck)+Y(p.hipL))/2, 3*s, SYNERGIST)}</g>;
          return null;
        })}
        {/* Stabilizers — brown hollow rings */}
        {p.muscles.stabilizers.map(m => {
          if (m==="core") return <g key="st-co">{musc((X(p.hipL)+X(p.hipR))/2, (Y(p.neck)+Y(p.hipL))/2, 6*s, STABILIZER, true)}</g>;
          if (m==="shoulders") return <g key="st-s">{[
            musc(X(p.shoulderL), Y(p.shoulderL), 5*s, STABILIZER, true),
            musc(X(p.shoulderR), Y(p.shoulderR), 5*s, STABILIZER, true),
          ]}</g>;
          if (m==="hams"||m==="back"||m==="glutes") return <g key="st-b">{musc((X(p.hipL)+X(p.hipR))/2, (Y(p.hipL)+Y(p.hipR))/2-2*s, 10*s, STABILIZER, true)}</g>;
          return null;
        })}
      </>}

      {/* Torso */}
      <polygon points={torsoPts} fill="rgba(20,10,10,0.6)" stroke={BONE_MAIN} strokeWidth="1" opacity="0.7"/>

      {/* Equipment — only if not bodyweight */}
      {p.equip === "barbell" && <>
        <line x1={X(p.wristL)-3*s} y1={Y(p.shoulderL)-1*s} x2={X(p.wristR)+3*s} y2={Y(p.shoulderR)-1*s} stroke="#ddd" strokeWidth="2" strokeLinecap="round"/>
        <rect x={X(p.wristL)-5*s} y={Y(p.shoulderL)-4*s} width={10*s} height={6*s} rx="1.5" fill="#333" stroke="#888" strokeWidth="0.8"/>
        <rect x={X(p.wristR)-5*s} y={Y(p.shoulderR)-4*s} width={10*s} height={6*s} rx="1.5" fill="#333" stroke="#888" strokeWidth="0.8"/>
      </>}
      {p.equip === "dumbbell" && <>
        <rect x={X(p.wristL)-1.2*s} y={Y(p.wristL)-6*s} width={2.4*s} height={8*s} rx="1" fill="#ccc"/>
        <rect x={X(p.wristR)-1.2*s} y={Y(p.wristR)-6*s} width={2.4*s} height={8*s} rx="1" fill="#ccc"/>
      </>}

      {/* Bone structure — main bones thick */}
      {bone(p.neck, p.head)} {/* neck */}
      {/* Torso spine (virtual, covered by polygon) */}
      {/* Upper arms — thick */}
      {bone(p.shoulderL, p.elbowL, true)} {bone(p.shoulderR, p.elbowR, true)}
      {/* Forearms — thin */}
      {bone(p.elbowL, p.wristL)} {bone(p.elbowR, p.wristR)}
      {/* Thighs — thick */}
      {bone(p.hipL, p.kneeL, true)} {bone(p.hipR, p.kneeR, true)}
      {/* Calves — thin */}
      {bone(p.kneeL, p.ankleL)} {bone(p.kneeR, p.ankleR)}

      {/* Head */}
      <circle cx={X(p.head)} cy={Y(p.head)} r={5.5*s} fill="none" stroke={BONE_MAIN} strokeWidth="1.5"/>

      {/* Joints */}
      {[p.shoulderL,p.shoulderR,p.hipL,p.hipR].map((j,i) => jt(j,2.5))}
      {[p.elbowL,p.elbowR,p.kneeL,p.kneeR].map((j,i) => jt(j,2))}
      {[p.wristL,p.wristR,p.ankleL,p.ankleR].map((j,i) => jt(j,1.2))}
      {jt({x:(p.shoulderL.x+p.shoulderR.x)/2, y:(p.shoulderL.y+p.shoulderR.y)/2}, 2)}
      {jt({x:(p.hipL.x+p.hipR.x)/2, y:(p.hipL.y+p.hipR.y)/2}, 2.5)}

      {/* Joint angle hints */}
      {p.angleHints?.map((h, i) => ang(h.joint, h.angle))}

      {/* Static hold marks */}
      {p.move === "static" && <>
        {[p.elbowL,p.elbowR,p.kneeL,p.kneeR].map((j,i) => (
          <line key={`st${i}`} x1={X(j)-3*s} y1={Y(j)-3*s} x2={X(j)+3*s} y2={Y(j)+3*s} stroke="#888" strokeWidth="0.6"/>
        ))}
      </>}

      {/* Movement arrow */}
      {p.move === "concentric" && (
        <g>
          <line x1={size/2} y1={Y(p.head)-6*s} x2={size/2} y2={Y(p.head)-16*s} stroke={AGONIST} strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#a-solid)"/>
          <text x={size/2+3*s} y={Y(p.head)-11*s} fill={AGONIST} fontSize="9" fontWeight="bold">↑</text>
        </g>
      )}
      {p.move === "eccentric" && (
        <g>
          <line x1={size/2} y1={Y(p.head)-16*s} x2={size/2} y2={Y(p.head)-6*s} stroke="#999" strokeWidth="1.2" strokeDasharray="3,3" markerEnd="url(#a-hollow)"/>
          <text x={size/2+3*s} y={Y(p.head)-11*s} fill="#999" fontSize="9">↓</text>
        </g>
      )}

      {/* Label */}
      {!compact && (
        <text x={size/2} y={size-2} textAnchor="middle" fill="#555" fontSize={Math.max(7, size*0.07)} fontWeight="bold">{p.name}</text>
      )}
    </svg>
  );
}
