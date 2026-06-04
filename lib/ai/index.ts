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
    return pitchRule + "\n" + base;
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
    return gymRule + "\n" + base;
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
    return rehabRule + "\n" + base;
  }

  return base;
}

/**
 * Build user prompt based on role.
 */
export function buildUserPrompt(data: PlayerFormData, lang: string = "zh", weatherHint?: string, sceneHint?: string): string {
  if (data.role === "coach") {
    return buildCoachPrompt(data, lang, weatherHint, sceneHint);
  }
  return buildAthletePrompt(data, lang, weatherHint, sceneHint);
}

// --- Streaming re-exports ---
export { streamGenerate } from "./ai";
export type { StreamCallbacks, ApiError } from "./ai";
