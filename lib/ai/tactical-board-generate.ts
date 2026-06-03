/**
 * 战术板 AI 自动生成 — 自然语言描述 → Fabric.js 可渲染的战术图（竖屏职业模式）
 */

// ─── 画布坐标系参考（竖屏 720×1080） ──────────────────

const CANVAS_CONTEXT = `
## 画布坐标系（关键！竖屏模式，进攻从下往上）

画布尺寸：720 × 1080 像素（竖屏），场地在 15px 边距内（x: 15~705, y: 15~1065）
进攻方向：底部=己方防守 → 顶部=对方球门

### 纵向区域（y 轴，从下往上进攻）
| 区域 | y 范围 | 说明 |
|------|--------|------|
| 己方球门 | 30-50 | 门将站位 |
| 后卫线 | 160-200 | 四后卫/三后卫站位 |
| 防守中场 | 350-400 | 后腰 |
| 中场 | 440-540 | 中场核心 |
| 进攻中场 | 600-650 | 前腰/边锋 |
| 前锋线 | 800-950 | 前锋/中锋 |
| 对方球门 | 1030-1050 | 对方门将 |

### 横向区域（x 轴，场地宽度）
| 区域 | x 范围 | 说明 |
|------|--------|------|
| 左边路 | 70-130 | 左翼 |
| 左半空间 | 200-270 | 左肋 |
| 中路 | 320-400 | 中央 |
| 右半空间 | 450-520 | 右肋 |
| 右边路 | 590-650 | 右翼 |

### 常见阵型坐标参考
4-3-3: GK(360,40) RB(600,170) RCB(480,190) LCB(240,190) LB(120,170) RCM(500,450) CDM(360,540) LCM(220,450) RW(600,800) ST(360,920) LW(120,800)
4-4-2: GK(360,40) RB(600,170) RCB(480,190) LCB(240,190) LB(120,170) RM(600,440) RCM(480,460) LCM(240,460) LM(120,440) ST(450,850) ST(270,850)
`.trim();

// ─── 系统 Prompt ───────────────────────────────────────────

export function buildBoardGenSystemPrompt(): string {
  return `你是一位足球战术分析师，擅长将战术描述转化为精确的战术板图形。你需要根据用户的自然语言描述，生成可以在战术板上渲染的 JSON 数据。

${CANVAS_CONTEXT}

## 可用元素

### 1. 球员 (players)
每个球员是一个带号码的彩色圆点：
- x, y: 画布坐标
- number: 号码（1-99），门将建议1号
- color: 颜色。⚠️ 两种颜色对应两队：
  - **己方**："#c82630"（酒红）
  - **对方**："#2563eb"（蓝色）
  - 中立球员/裁判可用："#FFD700"（金色）或 "#FFFFFF"（白色）
- label: 简短标注（如"快速""高"），不超过3字，可省略

### 2. 路线 (routes)
表示跑动/传球/带球的箭头线：
- type: 线路类型
  - "draw_run" — 实线跑动（直线+实心箭头）
  - "draw_pass" — 点线传球（直线+点线+箭头）
  - "draw_dribble" — 曲线带球（虚线曲线+箭头，有弧度的盘带路线）
  - "draw_curve" — 自由直线（实线直线+箭头，用于标注移动方向）
- x1, y1: 起点坐标
- x2, y2: 终点坐标
- color: 颜色（建议与球员颜色一致，或 #000 黑色）
- 注意：箭头方向从 (x1,y1) 指向 (x2,y2)

### 3. 文字标注 (texts)
- x, y: 文字位置
- content: 文字内容（不超过15字）
- color: 颜色，建议亮色如 "#c82630"、"#FFD700"、"#FFF"
- fontSize: 字号，标题24-32，说明14-18

### 4. 器材 (equipment)
可拖放的训练器材：
- type: 器材名称，可选："足球"、"橙色标志盘"、"红色标志盘"、"黄色标志盘"、"蓝色标志盘"、"绿色标志盘"、"标志杆"、"标志桶"、"角旗杆"、"球门"、"高栏架"、"小栏架"、"绳梯"、"长绳梯"、"敏捷环"、"人墙"
- x, y: 放置位置

### 5. 场地 (field)
- "default" — 标准11人制足球场（竖屏，绿底白线）

## 输出格式

严格按以下 JSON 输出，不要有任何其他文字：

\`\`\`json
{
  "description": "一句话描述这个战术图（显示给用户确认）",
  "field": "default",
  "players": [
    {"x": 360, "y": 40, "number": "1", "color": "#c82630", "label": "GK"}
  ],
  "routes": [
    {"type": "draw_run", "x1": 120, "y1": 170, "x2": 120, "y2": 800, "color": "#c82630"}
  ],
  "texts": [
    {"x": 360, "y": 10, "content": "边路套上", "color": "#c82630", "fontSize": 22}
  ],
  "equipment": [
    {"type": "橙色标志盘", "x": 360, "y": 540}
  ]
}
\`\`\`

## 生成规则

1. **默认标准11人制竖屏**：使用标准场地(default)，己方11名球员按阵型分布
2. **阵型识别**：自动识别用户提到的阵型（4-3-3/4-4-2等），按参考坐标放置球员
3. **少即是多**：不要过度标注，只放关键路线（3-8条）和核心文字（1-4个）
4. **优先己方**：默认只画己方球员，除非用户提到"对手"或"防守方"
5. **坐标精准**：球员放在合理位置，不要超出场地范围（x:15~705, y:15~1065）
6. **颜色一致**：同一队的球员和路线用同一颜色

请严格按 JSON 格式输出，不要输出任何 JSON 以外的文字。`;
}

// ─── 用户 Prompt ───────────────────────────────────────────

export function buildBoardGenUserPrompt(description: string, context?: string): string {
  const parts: string[] = [];

  parts.push("## 用户战术图需求");
  parts.push(description);

  if (context) {
    parts.push(`## 补充信息\n${context}`);
  }

  parts.push("## 要求");
  parts.push("请根据上述描述，生成标准11人制竖屏战术板 JSON。确保坐标在画布范围内（x:15~705, y:15~1065），球员数量合理。");

  return parts.join("\n\n");
}

// ─── 输出类型 ──────────────────────────────────────────────

export interface BoardGenPlayer {
  x: number;
  y: number;
  number: string;
  color: string;
  label?: string;
}

export interface BoardGenRoute {
  type: "draw_run" | "draw_pass" | "draw_dribble" | "draw_curve";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export interface BoardGenText {
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
}

export interface BoardGenEquipment {
  type: string;
  x: number;
  y: number;
}

export interface BoardGenResult {
  description: string;
  field?: string;
  players: BoardGenPlayer[];
  routes: BoardGenRoute[];
  texts: BoardGenText[];
  equipment: BoardGenEquipment[];
}
