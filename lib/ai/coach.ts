/**
 * Coach-specific user prompt builder — 训练课教案模式
 */
import { PlayerFormData } from "../types";
import {
  COACH_CERT_LABELS,
  COACH_ROLE_LABELS,
  LEAGUE_TAG_LABELS,
  TACTICAL_THEME_LABELS,
} from "../constants";
import { LANG_INSTRUCTIONS } from "./athlete";

export function buildCoachPrompt(data: PlayerFormData, lang: string = "zh", weatherHint?: string, sceneHint?: string): string {
  const langInstruction = LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS.zh;
  const themes = data.tacticalThemes.map((t) => TACTICAL_THEME_LABELS[t]).join("、");
  const primaryTheme = data.tacticalThemes[0] || "possession";

  const cert = data.coachCert!;
  const league = data.leagueTag!;
  const role = data.coachRole!;

  // Session duration + player count + complexity by league level
  let sessionDuration = "75分钟";
  let playerCount = "18人";
  let tacticalComplexity = "中级";
  let levelNote = "";
  let microcycleId = "microcycle-1game";

  if (league.startsWith("youth_u12") || league === "campus_u6_u12") {
    sessionDuration = "60分钟";
    playerCount = "14人";
    tacticalComplexity = "入门";
    microcycleId = "microcycle-youth";
    levelNote = "球员年龄小，训练以趣味性和基础技术为主。战术概念用游戏化方式呈现。避免复杂战术指令。活动设计要短(10-12min/项)、变化多。";
  } else if (league.startsWith("youth_u15")) {
    sessionDuration = "75分钟";
    playerCount = "16人";
    tacticalComplexity = "初级";
    microcycleId = "microcycle-youth";
    levelNote = "技战术发展关键期。注重基础战术原则的理解和执行。适当引入位置职责概念。训练中穿插决策训练。";
  } else if (league.startsWith("youth_u18")) {
    sessionDuration = "75分钟";
    playerCount = "18人";
    tacticalComplexity = "初中级";
    microcycleId = "microcycle-youth";
    levelNote = "接近成人水平过渡期。可执行较复杂战术。强调比赛情境下的决策能力。训练强度渐进提升。";
  } else if (league.startsWith("youth_u20") || league.startsWith("youth_u21")) {
    sessionDuration = "90分钟";
    playerCount = "20人";
    tacticalComplexity = "中高级";
    levelNote = "接近成人水平，可执行较复杂战术。强调比赛情境下的决策能力。可加入视频分析元素。";
  } else if (league === "china_league_two" || league === "china_league_one") {
    sessionDuration = "90分钟";
    playerCount = "22人";
    tacticalComplexity = "高级";
    levelNote = "职业级训练。强调比赛节奏、压迫强度、攻守转换速度。指导要点具体到个人战术行为。";
  } else if (league === "chinese_super_league") {
    sessionDuration = "105分钟";
    playerCount = "24人";
    tacticalComplexity = "职业顶级";
    levelNote = "中超顶级。战术设计需结合对手分析，包含针对性部署。训练强度接近正式比赛。";
  } else if (league === "amateur_team") {
    sessionDuration = "75分钟";
    playerCount = "18人";
    tacticalComplexity = "初中级";
    levelNote = "业余球员训练时间有限，战术设计要简洁高效、易于执行。重视基础阵型保持。训练效率优先。";
  }

  // Override with user-specified training duration if set
  if (data.trainingDuration) {
    sessionDuration = `${data.trainingDuration}分钟`;
  }

  // Certificate-specific coaching style
  const certNotes: Record<string, string> = {
    none: "无证教练：指导要点用通俗语言，避免过于复杂的战术术语。",
    d: "D级教练：适合基础-中级训练设计。指导要点注重基本站位和传接球。",
    c: "C级教练：可设计中等复杂度战术。注重小组配合和局部战术。",
    b: "B级教练：可设计高级战术训练。注重全场战术组织和比赛管理。",
    a: "A级教练：职业级战术设计。注重对手分析和针对性战术部署。",
    pro: "PRO级教练：顶级战术设计能力。可包含复杂战术体系和比赛策略。",
  };

  // Tactical theme → physical quality mapping
  const tacticalPhysicalMap: Record<string, string> = {
    pressing: "体能重点：反复冲刺能力+加速能力。训练强度高(Zone4-5)，短间歇高密度。每项练习后心率恢复至Zone2再开始下一项。",
    possession: "体能重点：有氧基础+敏捷性。训练强度中(Zone2-3)，持续跑动为主。关注控球中的位移质量和决策速度。",
    counterattack: "体能重点：爆发力+最大速度。训练强度极高(Zone5)，长间歇(1:6-1:10)充分恢复。每次冲刺质量优先于数量。",
    defending: "体能重点：力量+对抗+反应速度。训练强度中高(Zone3-4)，间歇性。注意防守姿态的体能消耗。",
    crossing: "体能重点：速度耐力+爆发力。训练强度中高(Zone3-4)，间歇性。边路反复冲刺后传中质量是关键。",
    shooting: "体能重点：爆发力+协调性。训练强度中(Zone2-3)，充分恢复。每次射门前保持技术动作质量。",
    set_pieces: "体能重点：爆发力+弹跳。训练强度中低(Zone1-2)，充分恢复。定位球训练体能负荷低但技术精度要求高。",
    positional_attack: "体能重点：有氧基础+敏捷+决策速度。训练强度中(Zone2-3)，持续跑动。体能疲劳后决策质量下降是训练重点。",
  };
  const physicalNote = tacticalPhysicalMap[primaryTheme] || "";

  return `教练信息:
- 身份: 教练
- 教练证书: ${COACH_CERT_LABELS[cert]}
- 执教身份: ${COACH_ROLE_LABELS[role]}
- 执教联赛/梯队: ${LEAGUE_TAG_LABELS[league]}
- 战术主题: ${themes}（主主题: ${TACTICAL_THEME_LABELS[primaryTheme]}）

个性化训练课设定:
- 训练时长: ${sessionDuration}
- 参与人数: ${playerCount}
- 战术复杂度: ${tacticalComplexity}
- 微周期类型: ${microcycleId === "microcycle-youth" ? "青少年发展微周期" : "标准一周一赛微周期"}
- 联赛适配: ${levelNote}
- 教练级别: ${certNotes[cert] || ""}
- ${physicalNote}

你是一位持有${COACH_CERT_LABELS[cert]}证书的${COACH_ROLE_LABELS[role]}，正在为${LEAGUE_TAG_LABELS[league]}级别设计一堂以「${TACTICAL_THEME_LABELS[primaryTheme]}」为主题的训练课。
${data.equipmentAvailable?.length ? `\n器材约束：你只有以下器材可用：${data.equipmentAvailable.join("、")}。必须只使用这些器材设计练习。` : ""}
	${weatherHint ? `\n${weatherHint}\n根据天气调整训练内容：高温加强补水、低温延长热身、雨天考虑室内替代。` : ""}
	${(data as any).coachInput?.trim() ? `\n## 教练自由输入（最高优先级）\n${(data as any).coachInput.trim()}\n\n以上是教练的具体要求。必须严格据此设计训练课，如果教练指定了内容，优先执行教练指令。` : ""}

${langInstruction}

${sceneHint || ""}
直接开始输出 event: module_1，不要任何开场白。依次生成以下3个模块：
1. session_plan — 完整训练课教案（热身→主体训练→分队比赛→冷身）
2. tactical_focus — 战术主题专项练习（与「${TACTICAL_THEME_LABELS[primaryTheme]}」匹配的tactical drill）
3. microcycle — 比赛周微周期计划（使用 microcycle_id: ${microcycleId}）

重要约束：
- 训练时长按${sessionDuration}设计
- 参与人数按${playerCount}设计
- activity_ids 选择与「${TACTICAL_THEME_LABELS[primaryTheme]}」主题匹配的战术练习
- ssg_id 选择与战术主题匹配的小场比赛
- 只需要输出3个模块，不需要 module_4/module_5
- 活动安排适配${tacticalComplexity}复杂度水平`;
}
