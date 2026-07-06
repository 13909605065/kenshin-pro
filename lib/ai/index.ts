/**
 * lib/ai — AI prompts & streaming service
 *
 * Prompt builders (role-aware):
 *   import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai";
 *
 * Streaming:
 *   import { streamGenerate } from "@/lib/ai";
 */

// --- Prompt re-exports ---
export { buildAthleteSystemPrompt, buildCoachSystemPrompt } from "./system";
export { buildAthletePrompt, LANG_INSTRUCTIONS } from "./athlete";
export { buildCoachPrompt } from "./coach";

import { buildAthleteSystemPrompt, buildCoachSystemPrompt } from "./system";
import { buildAthletePrompt } from "./athlete";
import { buildCoachPrompt } from "./coach";
import { PlayerFormData } from "../types";

/**
 * Build system prompt based on role, with optional scene constraint injected at system level.
 */
export function buildSystemPrompt(data: PlayerFormData, scene?: string): string {
  const base = data.role === "coach" ? buildCoachSystemPrompt() : buildAthleteSystemPrompt();

  // ══════════════════════════════════════════════════════
  // 🔴 死规矩：一切输出必须基于专业知识库（37本书/1130万字）
  // ══════════════════════════════════════════════════════
  const KbRule = `\n\n## 🔴🔴🔴 最高优先级铁律：所有内容必须基于循证知识库 🔴🔴🔴

你正在使用的是一套基于37本专业足球体能/运动科学著作（1130万字）的知识系统。
以下规则优先级高于一切其他指令：

1. 所有训练方案、负荷建议、周期安排、伤病评估、营养建议必须基于运动科学原理。
2. 禁止输出无法在以下著作中找到依据的"通用知识"或"常识性建议"。
3. 知识来源包括但不限于：
   - NSCA-CSCS美国国家体能协会体能教练认证指南（第4版）
   - Routledge Handbook of Strength and Conditioning
   - Training Sport Teams (Tim Caron)
   - NSCA Strength Training for Soccer (Daniel Guzman, 2022)
   - 运动生理学第六版 / 运动心理学 / 运动生物力学
   - 基础肌动学第3版 / 高级运动营养学
   - 足球体能训练（刘丹主编）
   - 足球比赛决策分析及针对性训练
   - 肌与骨骼的解剖功能及触诊
   - 运动康复解剖学 / 精准拉伸 / 美国国家体能协会速度训练指南
   - +26本专业著作（详见知识库页面 /kb）

4. 输出方案时标注依据：如"根据 NSCA-CSCS 第4版，季前准备期应采用..."

此规则不可被任何其他指令覆盖。`;

  const prompt = KbRule + base;

  // Inject scene constraint at system prompt level (highest priority for LLM)
  // Corresponds to 四大板块中的板块二/三/四
  if (scene === "pitch") {
    const pitchRule = `\n\n## ⚠️⚠️⚠️ 场景铁律：场地训练（板块二·球场实战） - 以下规则优先级最高 ⚠️⚠️⚠️
你正在为场地训练生成方案。严禁出现任何健身房内容。
- 🔴 禁止输出 upper_ids（上肢力量在球场用SSG对抗替代）
- 🔴 禁止所有 ex-db-* ex-sus-* ex-bench-press ex-cable-* ex-back-squat ex-front-squat ex-deadlift ex-trap-bar-deadlift ex-power-clean ex-leg-press ex-hip-thrust ex-hanging-leg-raise ex-pallof-press ex-face-pull
- 🔴 禁止使用 combo_id（套餐含健身房动作）
- 🟢 lower_ids仅限: ex-nordic-hamstring ex-box-jump ex-bulgarian-split-squat ex-single-leg-rdl
- 🟢 core_ids仅限: ex-plank ex-dead-bug
- 🟢 ability仅限: ex-sled-sprint ex-box-jump ex-nordic-hamstring
- 🟢 多输出 drill_ids（有球训练是球场核心）
- 📊 如球员上场时间<45分钟，在方案中增加补负荷建议`;
    return pitchRule + prompt;
  }

  if (scene === "gym") {
    const gymRule = `\n\n## ⚠️⚠️⚠️ 场景铁律：体能房训练（板块三·力量房） - 以下规则优先级最高 ⚠️⚠️⚠️
你正在为体能房生成方案。严禁出现任何球场内容。
- 🔴 禁止 warm-ball-touch warm-ball-dribble warm-rondo warm-agility-ladder warm-skip-variations warm-accel-drill
- 🔴 禁止所有 drill_ids SSG对抗赛 跑动训练 战术内容 有球技术
- 🔴 热身仅限: warm-hip-open warm-dynamic-stretch warm-glute-activation warm-plank-series warm-side-plank-series warm-single-leg-balance
- 🟢 专注器械力量训练，优先使用 combo_id
- 🟢 全部力量动作可用
- 🟢 可输出：最大力量、基础爆发、基础灵敏、核心/躯干对抗`;
    return gymRule + prompt;
  }

  if (scene === "rehab") {
    const rehabRule = `\n\n## ⚠️⚠️⚠️ 场景铁律：伤病防控与康复（板块四·康复） - 以下规则优先级最高 ⚠️⚠️⚠️
你正在为伤病康复生成方案。专注安全恢复，严禁正常训练强度。
- 🔴 所有负荷≤50%1RM（受伤部位禁止任何负重）
- 🔴 禁止爆发力/增强式/冲刺/跳跃类动作
- 🔴 禁止使用 combo_id（套餐是为健康运动员设计的正常训练）
- 🟢 仅使用自重、弹力带轻阻力、等长训练
- 🟢 心率限制：(220-年龄)×60-70%
- 🟢 必须输出 module_5 康复方案（phases 数组）
- 🟢 康复阶段按组织愈合时间线设计：急性期→增殖期→重塑期→功能期
- 🟢 优先：弱侧强化、本体感觉训练、ROM恢复、闭链练习`;
    return rehabRule + prompt;
  }

  if (scene === "recovery") {
    const recoveryRule = `\n\n## ⚠️⚠️⚠️ 场景铁律：赛后恢复/再生训练 - 以下规则优先级最高 ⚠️⚠️⚠️
你正在为赛后恢复/再生训练生成方案。这是一堂低强度恢复课，不是正常训练课。
- 🔴 禁止任何杠铃/哑铃/大重量器械（所有负荷≤50%1RM）
- 🔴 禁止爆发力/增强式/冲刺/跳跃/变向类动作
- 🔴 禁止使用 combo_id（套餐是为正常训练课设计的）
- 🔴 禁止 SSG 对抗赛/有球高强度训练
- 🔴 禁止绳梯灵敏/折返跑/间歇跑
- 🟢 核心内容：静态拉伸(每肌群20-30s)、动态拉伸、PNF拉伸、泡沫轴/筋膜球放松、呼吸练习、轻量核心激活
- 🟢 热身：5-10min轻慢跑(HR<120bpm)+动态拉伸，冷身：10-15min静态拉伸+泡沫轴
- 🟢 心率限制：(220-年龄)×60-70%，RPE≤3/10
- 🟢 器材：仅自重、弹力带、泡沫轴、瑜伽垫
- 🟢 分组：每拉伸动作2-3组×20-30s保持，间歇30s
- 📊 依据：NSCA-CSCS第4版第23章恢复与再生 + Routledge Handbook恢复策略 + 精准拉伸(Chris Frederick)
- 📋 输出结构：module_1(position_training)为主，warmup填轻量热身、upper_limb留空数组、lower_limb填拉伸动作、core填核心激活、cooldown填静态拉伸+泡沫轴
- 如无伤病 module_4 填 status="skipped"`;
    return recoveryRule + prompt;
  }

  return prompt;
}

/**
 * Build user prompt based on role.
 */
export function buildUserPrompt(data: PlayerFormData, lang: string = "zh", weatherHint?: string, sceneHint?: string, fitnessHint?: string): string {
  if (data.role === "coach") {
    return buildCoachPrompt(data, lang, weatherHint, sceneHint, fitnessHint);
  }
  return buildAthletePrompt(data, lang, weatherHint, sceneHint);
}

// --- Streaming re-exports ---
export { streamGenerate } from "./ai";
export type { StreamCallbacks, ApiError } from "./ai";
