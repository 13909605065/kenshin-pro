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

export function buildAthletePrompt(data: PlayerFormData, lang: string = "zh", weatherHint?: string, sceneHint?: string): string {
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
  } else {
    // years 4-7 → 中级
    expLevel = "中级";
    expNote = "中等强度负荷(75-85%1RM)，3-4组×6-10次。可引入杠铃基础动作和中级增强式(L2)。注意渐进负荷原则。";
  }

  // Age adjustments
  const age = data.age ?? 25;
  let ageNote = "";
  if (age < 14) {
    ageNote = `青少年早期(${age}岁)：以自重训练为主，禁止>85%1RM。重点发展协调性、敏捷性、基础动作模式。LTAD FUNdamentals阶段。`;
  } else if (age < 16) {
    ageNote = `青少年中期(${age}岁)：训练年龄<2年→体重为主；训练年龄≥2年→可渐进引入>85%1RM(需技术合格+监督)。${years < 2 ? "当前训练年龄不足，保持体重训练为主。" : "当前训练年龄达标，可适度增加负荷。"}`;
  } else if (age < 18) {
    ageNote = `青年球员(${age}岁)：训练年龄≥2年且技术合格者可渐进引入>85%1RM。关注PHV后的力量窗口期。`;
  } else if (age >= 35) {
    ageNote = `资深球员(${age}岁)：热身延长至20min，恢复优先。关节保护+预康复必练。训练频率可降至1-2次/周。`;
  } else if (age > 28) {
    ageNote = `成熟球员(${age}岁)：注意训练负荷与恢复的平衡。加入关节稳定性训练。`;
  }

  // Body type
  const height = data.height ?? 175;
  const weight = data.weight ?? 70;
  const bmi = height > 0 ? weight / ((height / 100) ** 2) : 22;
  // Calculate personalized nutrition grams
  const proteinG = Math.round(weight * 1.8);
  const carbG = Math.round(weight * 6);
  const postWorkoutCarb = Math.round(weight * 1.0);
  const postWorkoutProtein = Math.round(weight * 0.4);
  const nutritionCalc = `👤 基于${weight}kg体重计算：
- 每日蛋白: ${proteinG}g (${weight}×1.8g，训练日)
- 每日碳水: ${carbG}g (${weight}×6g，训练日)
- 赛后30min: 快碳${postWorkoutCarb}g + 蛋白${postWorkoutProtein}g`;

  let bodyNote = "";
  if (bmi < 18.5) {
    bodyNote = `偏瘦体型(BMI ${bmi.toFixed(1)})：需加强力量训练和营养补充，目标增肌增重。蛋白质摄入建议${Math.round(weight * 2.1)}g/天(${weight}×2.1g/kg)。`;
  } else if (bmi >= 25) {
    bodyNote = `BMI ${bmi.toFixed(1)}偏高。注意：BMI无法区分肌肉和脂肪。如体脂也偏高，增加有氧/灵敏成分+关节负荷管理。如为肌肉型（体脂正常），维持当前力量训练方向，忽略BMI偏高提示。`;
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

  return `${(data as any).coachInput ? `## 教练输入\n${(data as any).coachInput}\n` : ""}${data.name ? `## 个性化方案：${data.name}` : ""}
球员信息:
- 姓名: ${data.name || "运动员"}${data.position ? ` · ${POSITION_LABELS[data.position]}` : ""}
- 身份: 运动员
- 场上位置: ${data.position ? POSITION_LABELS[data.position] : "未设置"}${isGoalkeeper ? "（守门员专项：肩部力量+背部保护+下肢爆发力+扑救技术。热身含球感和手臂活动。体能通过比赛情境练，非孤立跑圈）" : ""}
- 年龄: ${age}岁${isUnder18 ? "（未成年，控制训练强度，禁止>85%1RM）" : ""}
- 身高: ${height}cm
- 体重: ${weight}kg
- 训练年限: ${years}年
- 自述短板/想提升: ${data.weakness || "未填写"}

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
${data.trainingDuration ? `可用训练时间: ${data.trainingDuration}分钟，请按此时间调整训练量` : ""}

## 营养精确计算（必须输出到 module_5 nutrition 中）
${nutritionCalc}
${isFemale ? "- 女性：额外补铁18mg/天（月经铁流失），补钙1000mg/天" : ""}
**营养输出格式（必须逐项展开，不可只给数字）：**
1. 训练前(2-4h): 列出具体食物+克数，如"150g鸡胸肉+200g红薯+蔬菜"
2. 训练后(30min内): 具体食物+克数+为什么(糖原窗口)
3. 全天饮食: 早/午/晚餐各列具体食物，每餐标注蛋白/碳水量
4. 补水: 每日总饮水ml数+训练中补水策略，解释脱水影响(>2%体重脱水表现下降)
5. 补剂建议(如有): 名称+剂量+作用原理+安全警告
6. 禁忌提示: 训练前禁什么、比赛日禁什么

## 个性化调整指令（必须执行）

套餐为基础模板，你必须根据以下个人因素做出调整：

**1. 训练年龄调整：**
${years <= 1 ? "- 入门级(y≤1年)：所有动作降为 2-3组×12-15次，负荷≤65%1RM。杠铃动作替换为哑铃/自重变式。禁止奥举。" : ""}
${years > 1 && years <= 3 ? "- 初级(1-3年)：3组×8-12次为主，负荷65-75%1RM。可引入杠铃基础动作。不安排奥举。" : ""}
${years > 3 && years < 8 ? "- 中级(4-7年)：3-4组×6-10次，负荷75-85%1RM。杠铃基础动作适用。可引入L2增强式(不含深度跳)。注意渐进负荷。" : ""}
${years >= 8 ? "- 高级(≥8年)：3-4组×2-5次可接近最大力量。可安排奥举+增强式训练。负荷可用80-95%1RM。" : ""}

**2. 年龄调整：**
${age < 14 ? `- 青少年早期(${age}岁)：体重训练为主。禁止>85%1RM。squat→goblet-squat；deadlift→kettlebell。重点：协调性+动作模式>绝对力量。` : ""}
${age >= 14 && age < 18 ? `- 青少年(${age}岁)：训练年龄≥2年→可渐进>85%1RM(需技术合格)。${years >= 2 ? "可用杠铃基础动作。" : "体重为主，暂不引入>85%1RM。"}` : ""}
${age >= 35 ? `- 资深球员(${age}岁)：热身延长至20min。每项力量训练前加轻重量热身组。关节保护必选（face-pull、band-activation）。恢复间隔≥48h。` : ""}

**3. 体型调整：**
${bmi < 18.5 ? `- 偏瘦(BMI ${bmi.toFixed(1)})：力量训练为主(70%)，有氧减少(15%)。每餐蛋白目标2.0-2.2g/kg。核心训练加抗旋转类(pallof-press)。` : ""}
${bmi >= 25 ? `- BMI ${bmi.toFixed(1)}偏高：如是体脂偏高→增加有氧/灵敏到30%，关节保护优先(闭链动作)。如是肌肉型→忽略此提示，维持力量训练方向。HIIT长间歇优先。` : ""}

**4. 性别调整：**
${isFemale ? "- 女性：热身必须含落地力学(jump-landing纠正膝外翻)。北欧弯举必练。上肢负荷保守(女-15%)。营养加铁/钙建议。" : ""}

${langInstruction}

${sceneHint || ""}
直接开始输出 event: module_1，不要任何开场白。

**module_1 必须包含 analysis 字段**，用2-3句话解释：「基于你的[训练年龄/体型/性别/年龄]情况，你应该[可以做什么]，你不应该[避免什么]，所以我给你的方案是[核心思路]」。例如：
"analysis": "基于你1年入门级训练经验+偏瘦体型(BMI 17)+女性ACL防护需求，你应以中低强度肌耐力为主(2-3×12-15)，避免>85%1RM大重量和奥举。杠铃动作替换为哑铃/自重变式，加强核心抗旋转和落地力学训练。"

依次生成以下5个模块：
1. ${POSITION_LABELS[data.position!]}专项分位置训练（优先套餐: ${comboHint}；必须含 analysis 字段）
2. ${GOAL_LABELS[data.goal!]}定向能力训练
3. ${POSITION_LABELS[data.position!]}位置专属技术练习与跑动特征
4. ${PHASE_LABELS[data.phase!]}周期适配计划
5. 伤病康复方案${injurySitesStr === "无" ? "（无伤病→输出 skipped）" : ""}

特殊规则:
${isUnder18 ? "- 该球员未成年，禁止使用>85%1RM负荷。用 db-goblet-squat/sus-squat 替代 back-squat。" : ""}
${isGoalkeeper ? "- 守门员专项：upper必须含 shoulder-press + face-pull；core必须含 cable-woodchop(旋转爆发) + pallof-press(抗旋转)；lower必须含 box-jump(爆发力)。" : ""}
${data.injurySites.includes("knee") || data.injurySites.includes("thigh") ? "- 含膝/大腿伤病：禁止大重量深蹲和跳跃类。替代为 leg-press(闭链安全)+hip-thrust(臀肌)+nordic-hamstring(轻型离心)。" : ""}
${isFemale ? "- 女性运动员：热身必含落地力学训练(膝勿内扣)；营养方案加铁/钙建议；上肢初始负荷保守(-15%)。每节必练北欧弯举。" : ""}
${weatherHint ? `\n⚠️ 天气因素：${weatherHint}\n根据天气调整：高温加强补水策略，低温延长热身，雨天减少户外冲刺/变向练习。` : ""}`;
}
