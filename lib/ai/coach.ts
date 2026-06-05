/**
 * S&C Coach prompt builder — B+C Architecture: AI selects combo_id + exercise_ids only
 * All numeric parameters (sets, reps, loads, rest, distances) handled by TypeScript
 */
import { PlayerFormData } from "../types";
import { COACH_CERT_LABELS, COACH_ROLE_LABELS, LEAGUE_TAG_LABELS } from "../constants";
import { getPhaseParams } from "../periodization";
import { LANG_INSTRUCTIONS } from "./athlete";

export function buildCoachPrompt(
  data: PlayerFormData,
  lang: string = "zh",
  weatherHint?: string,
  sceneHint?: string,
  fitnessHint?: string
): string {
  const langInstruction = LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS.zh;

  const cert = data.coachCert || 'b';
  const league = data.leagueTag || 'china_league_two';
  const role = data.coachRole || 'semi_pro';
  const playerCount = data.playerCount || 20;
  const trainingDuration = data.trainingDuration || 60;
  const goal = data.goal || 'strength';
  const phase = data.phase || 'competition';
  const position = data.position || 'midfielder';

  // Injury + ACWR
  const injuryHistory = (data as any).injuryHistory || '';
  const hasInjuries = injuryHistory && injuryHistory.trim().length > 10 && !injuryHistory.startsWith('ACWR');
  const hasACWR = injuryHistory && injuryHistory.includes('ACWR预警');

  // Periodization context (selection reference only)
  const phaseParams = getPhaseParams(phase);
  const phaseCtx = `${phase}阶段(${phaseParams.intensityPercent[0]}-${phaseParams.intensityPercent[1]}%1RM区间)`;

  // Level context
  let levelCtx = '';
  if (league === 'chinese_super_league') levelCtx = '中超职业级';
  else if (league === 'china_league_one' || league === 'china_league_two') levelCtx = '职业级';
  else if (league.startsWith('youth')) levelCtx = '青少年,禁>85%1RM';
  else levelCtx = '业余/校园';

  // Tactical scene selection hints
  const tacticalThemes = (data as any).tacticalThemes as string[] | undefined;
  let tacticalCtx = '';
  if (tacticalThemes && tacticalThemes.length > 0) {
    const themeMap: Record<string, string> = {
      high_press: '高位逼抢→优先RSA/短间歇',
      possession: '传控→优先小空间敏捷/耐力',
      counter_attack: '防守反击→优先长距加速/冲刺',
      low_block: '低位防守→优先对抗力量',
    };
    const hints = tacticalThemes.map(t => themeMap[t] || t).filter(Boolean);
    if (hints.length > 0) tacticalCtx = `\n战术场景选型提示: ${hints.join('；')}`;
  }

  return `## 训练选型任务（仅选ID，不填任何数值）

你是体能训练选型引擎。唯一职责：从文库套餐ID池中挑选最佳combo_id。所有组数、次数、负荷、间歇、距离由TS代码根据NSCA-CSCS/周期化书籍确定性计算——你绝不输出任何数字。

**训练上下文:**
- 场景: ${sceneHint || '由系统决定'} | 位置: ${position} | 目标: ${goal} | 周期: ${phaseCtx}
- 级别: ${levelCtx} | 人数: ${playerCount}人 | 教练: ${COACH_CERT_LABELS[cert] || cert} ${COACH_ROLE_LABELS[role] || role} ${LEAGUE_TAG_LABELS[league] || league}${tacticalCtx}
${hasInjuries ? `\n⚠️ 伤病(须排除禁忌): ${injuryHistory.substring(0, 200)}` : ''}\
${hasACWR ? '\n⚠️ ACWR预警: 优先低冲击/恢复型套餐' : ''}\
${(data as any).equipmentAvailable?.length ? `\n器材: ${(data as any).equipmentAvailable.join('、')}` : ''}\
${weatherHint ? `\n天气: ${weatherHint}` : ''}\
${fitnessHint ? `\n📊 体能实测(选型参考,不输出数字): ${fitnessHint.substring(0, 300)}` : ''}

## 输出（唯一格式）

event: module_1
data: {"combo_id":"从系统提示的套餐ID池选择或null","exercise_ids":[],"tactical_scene":"参考书目+选型逻辑+训练关联+缺库笔记(全程无数字)","injury_exclude":"伤病部位或空","status":"complete"}
event: done
data: {"totalModules":1}

选型规则: 足球专著套餐优先 > 位置不跨用(GK不用DF) > 场景不跨用(力量房不选外场) > 伤病排除禁忌 > 无匹配时combo_id=null并在tactical_scene写缺书原因

${langInstruction}

直接输出event流，禁止前缀文字。`;
}
