/**
 * S&C Coach prompt builder — 职业足球体能教练
 */
import { PlayerFormData } from "../types";
import { COACH_CERT_LABELS, COACH_ROLE_LABELS, LEAGUE_TAG_LABELS } from "../constants";
import { getPhaseParams, getGoalParams } from "../periodization";
import { LANG_INSTRUCTIONS } from "./athlete";

export function buildCoachPrompt(data: PlayerFormData, lang: string = "zh", weatherHint?: string, sceneHint?: string, fitnessHint?: string): string {
  const langInstruction = LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS.zh;

  const cert = data.coachCert || 'b';
  const league = data.leagueTag || 'china_league_two';
  const role = data.coachRole || 'semi_pro';
  const playerCount = data.playerCount || 20;
  const trainingDuration = data.trainingDuration || 60;
  const goal = data.goal || 'strength';
  const phase = data.phase || 'competition';

  // ── 伤病 + ACWR 信息 ──
  const injuryHistory = (data as any).injuryHistory || '';
  const hasInjuries = injuryHistory && injuryHistory.trim().length > 10 && !injuryHistory.startsWith('ACWR');
  const hasACWR = injuryHistory && injuryHistory.includes('ACWR预警');

  // ── 周期阶段 → 负荷区间（来自 lib/periodization.ts） ──
  const phaseParams = getPhaseParams(phase);
  const goalParams = getGoalParams(goal);
  const phaseLoadStr = `${phaseParams.intensityPercent[0]}-${phaseParams.intensityPercent[1]}% 1RM，${phaseParams.repsRange[0]}-${phaseParams.repsRange[1]}次，${phaseParams.setsRange[0]}-${phaseParams.setsRange[1]}组，间歇${phaseParams.restBetweenSets[0]}-${phaseParams.restBetweenSets[1]}s，${phaseParams.variationStrategy}`;
  const goalLoadStr = goalParams
    ? `${goalParams.labelCn}: ${goalParams.percent1RM[0]}-${goalParams.percent1RM[1]}%1RM, ${goalParams.setsReps}, 间歇${goalParams.rest}, 节奏${goalParams.tempo}`
    : '';

  // ── 级别参数 ──
  let levelNote = '';
  if (league === 'chinese_super_league') levelNote = '中超顶级，训练强度接近比赛，负荷精确到个体';
  else if (league === 'china_league_one' || league === 'china_league_two') levelNote = '职业级，强调对抗强度和动作质量';
  else if (league.startsWith('youth')) levelNote = '青少年发展期，禁>85%1RM，优先动作模式教学';
  else levelNote = '业余/校园，效率优先，基础动作质量';

  return `## 体能教练训练任务

**教练档案:**
- 证书: ${COACH_CERT_LABELS[cert] || cert} | 身份: ${COACH_ROLE_LABELS[role] || role} | 联赛: ${LEAGUE_TAG_LABELS[league] || league}
- 训练人数: ${playerCount}人 | 时长: ${trainingDuration}min

**训练设定:**
- 训练目标: ${goal}${goalLoadStr ? ` (${goalLoadStr})` : ''}
- 周期阶段: ${phase} → 推荐负荷区间: ${phaseLoadStr}
- 级别: ${levelNote}

${hasInjuries ? `**⚠️ 伤病球员（必须处理）:**
${injuryHistory}
- 严格排除伤病部位的禁忌动作（参考系统提示的伤病排除规则表）
- 为伤病球员使用安全替代动作
- 方案中标注哪些动作是替伤变式` : ''}

${hasACWR ? `**⚠️ 负荷预警（必须处理）:**
${injuryHistory}
- 整体训练强度下调10-20%
- 减少高强度组数，增加恢复间歇时间` : ''}

${(data as any).equipmentAvailable?.length ? `**可用器材:** ${(data as any).equipmentAvailable.join('、')}` : ''}
${weatherHint ? `**天气:** ${weatherHint}` : ''}
  ${fitnessHint ? "\n**📊 体能测试数据（基于实测——直接决定负荷）:**\n" + fitnessHint + "\n- 使用以上测试数据设定具体的负重(kg)、配速、间歇时间\n- 禁止使用训练年限或经验猜测负荷" : ""}


${langInstruction}

${sceneHint || ''}

直接输出 event: module_1，不要开场白。生成2个模块：
1. position_training — 职业三段式体能方案（准备激活→主体负荷→整理放松）
2. nutrition_recovery — 营养建议+恢复指导（使用 nutrition_goal 匹配训练目标）

约束:
- 训练时长按${trainingDuration}min设计
- 场景铁律必须遵守（系统提示中已定义）
- 只能从系统提示的ID列表中选择动作
- nutrition_goal 匹配训练类型: ${goal}
- 直接开始输出 event: module_1，禁止任何前缀文字`;
}
