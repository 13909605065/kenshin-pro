/**
 * Athlete-specific user prompt builder
 */
import { PlayerFormData } from "../types";
import { POSITION_LABELS, GOAL_LABELS, PHASE_LABELS, INJURY_LABELS } from "../constants";

export const LANG_INSTRUCTIONS: Record<string, string> = {
  zh: "请用中文输出所有内容。",
  en: "Please output ALL content in English. All exercise names, descriptions, and module titles must be in English.",
  ja: "すべての内容を日本語で出力してください。",
};

export function buildAthletePrompt(data: PlayerFormData, lang: string = "zh"): string {
  const injurySitesStr =
    data.injurySites.length > 0
      ? data.injurySites.map((s) => INJURY_LABELS[s]).join("、")
      : "无";
  const langInstruction = LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS.zh;
  const isUnder18 = data.age && data.age < 18;
  const isGoalkeeper = data.position === "goalkeeper";

  // Training age
  const years = data.years ?? 0;
  let expLevel = "中级";
  let expNote = "";
  if (years <= 1) {
    expLevel = "入门";
    expNote = "训练动作以基础模式为主，强调动作质量控制而非负荷。每次训练前需教学动作要领。";
  } else if (years <= 3) {
    expLevel = "初级";
    expNote = "训练动作以中低强度为主，逐步引入进退阶。注重动作模式建立。";
  } else if (years >= 8) {
    expLevel = "高级";
    expNote = "可采用高级进退阶方案，负荷可接近个人极限。可加入比赛速度下的功能性训练。";
  }

  // Age adjustments
  const age = data.age ?? 25;
  let ageNote = "";
  if (age < 16) {
    ageNote = `青少年球员(${age}岁)：以自重训练为主，禁止>85%1RM负荷。重点发展协调性、敏捷性、基础动作模式。使用LTAD模型。`;
  } else if (age < 18) {
    ageNote = `青年球员(${age}岁)：可逐步引入外部阻力但不过度。注意骨骺板未闭合，避免极限负荷。`;
  } else if (age > 33) {
    ageNote = `资深球员(${age}岁)：热身时间延长至20分钟。关节保护优先，加入更多预康复训练。恢复时间适当延长。`;
  } else if (age > 28) {
    ageNote = `成熟球员(${age}岁)：注意训练负荷与恢复的平衡。加入关节稳定性训练。`;
  }

  // Body type
  const height = data.height ?? 175;
  const weight = data.weight ?? 70;
  const bmi = height > 0 ? weight / ((height / 100) ** 2) : 22;
  let bodyNote = "";
  if (bmi < 18.5) {
    bodyNote = `偏瘦体型(BMI ${bmi.toFixed(1)})：需加强力量训练和营养补充，目标增肌增重。蛋白质摄入建议2.0-2.2g/kg。`;
  } else if (bmi >= 25) {
    bodyNote = `偏重体型(BMI ${bmi.toFixed(1)})：体能训练中增加有氧和灵敏成分，注意关节负荷管理。`;
  } else {
    bodyNote = `标准体型(BMI ${bmi.toFixed(1)})：维持当前体成分，力量与体能均衡发展。`;
  }

  // Gender-specific notes
  const isFemale = data.gender === "female";
  let genderNote = "";
  if (isFemale) {
    genderNote = `女性运动员：ACL损伤风险为男性2-8倍，每节必含落地力学纠正（膝勿内扣）+北欧弯举。上肢初始负荷低15-20%。关注铁/钙摄入（月经周期铁流失），蛋白质建议1.8-2.0g/kg。警惕女性运动员三联征（进食紊乱→月经失调→骨密度降低）。`;
  }

  // Build combo hint
  const pos = data.position || "midfielder";
  const goal = data.goal || "strength";
  const phase = data.phase || "competition";
  const comboHint = `combo_${pos}_${goal}_${phase}`;

  return `球员信息:
- 身份: 运动员
- 场上位置: ${POSITION_LABELS[data.position!]}${isGoalkeeper ? "（守门员专项：肩部力量+背部保护+下肢爆发力+扑救技术。热身含球感和手臂活动。体能通过比赛情境练，非孤立跑圈）" : ""}
- 年龄: ${age}岁${isUnder18 ? "（未成年，控制训练强度，禁止>85%1RM）" : ""}
- 身高: ${height}cm
- 体重: ${weight}kg
- 训练年限: ${years}年

个性化分析:
- 训练经验等级: ${expLevel}。${expNote}
- 年龄段调整: ${ageNote}
- 体型评估: ${bodyNote}
- 性别特征: ${genderNote || "男性，标准方案"}
- 伤病史: ${data.injuryHistory || "无"}
- 伤病部位: ${injurySitesStr}

目标能力: ${GOAL_LABELS[data.goal!]}
赛季阶段: ${PHASE_LABELS[data.phase!]}
推荐套餐: ${comboHint}

${langInstruction}

直接开始输出 event: module_1，不要任何开场白。依次生成以下5个模块：
1. ${POSITION_LABELS[data.position!]}专项分位置训练（优先使用套餐ID: ${comboHint}；如套餐不匹配可单独指定ID微调）
2. ${GOAL_LABELS[data.goal!]}定向能力训练
3. ${POSITION_LABELS[data.position!]}位置专属技术练习与跑动特征
4. ${PHASE_LABELS[data.phase!]}周期适配计划
5. 伤病康复方案${injurySitesStr === "无" ? "（无伤病→输出 skipped）" : ""}

特殊规则:
${isUnder18 ? "- 该球员未成年，禁止使用>85%1RM负荷。用 db-goblet-squat/sus-squat 替代 back-squat。" : ""}
${isGoalkeeper ? "- 守门员专项：upper必须含 shoulder-press + face-pull；core必须含 cable-woodchop(旋转爆发) + pallof-press(抗旋转)；lower必须含 box-jump(爆发力)。" : ""}
${data.injurySites.includes("knee") || data.injurySites.includes("thigh") ? "- 含膝/大腿伤病：禁止大重量深蹲和跳跃类。替代为 leg-press(闭链安全)+hip-thrust(臀肌)+nordic-hamstring(轻型离心)。" : ""}
${isFemale ? "- 女性运动员：热身必含落地力学训练(膝勿内扣)；营养方案加铁/钙建议；上肢初始负荷保守(-15%)。每节必练北欧弯举。" : ""}`;
}
