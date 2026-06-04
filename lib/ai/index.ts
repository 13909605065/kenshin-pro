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
  if (scene === "pitch") {
    return base + `

## ⚠️ 场景铁律：今天在足球场训练——绝对禁止健身房内容！

你是球场训练，不是健身房训练。以下规则不可覆盖：

**✅ 球场可用（仅限以下ID）：**
- warmup_ids: 全部可用（所有热身ID均为球场安全）
- upper训练: **禁止输出upper_ids**。球场上肢力量改为自重：俯卧撑系列用SSG对抗代替说明
- lower训练: 仅限 ex-nordic-hamstring, ex-box-jump, ex-bulgarian-split-squat（自重）、ex-single-leg-rdl（自重）。禁止 ex-back-squat, ex-deadlift, ex-trap-bar-deadlift, ex-front-squat, ex-leg-press, ex-hip-thrust 及所有 ex-db-* ex-sus-*
- core训练: 仅限 ex-plank, ex-dead-bug。禁止 ex-hanging-leg-raise（无单杠）, ex-pallof-press（无绳索）, ex-cable-woodchop（无绳索）, ex-db-russian-twist（无哑铃）, 及所有 ex-sus-*
- ability训练: 仅限 ex-sled-sprint, ex-box-jump, ex-nordic-hamstring。禁止 ex-power-clean, ex-db-snatch, ex-db-thruster
- cooldown_ids: 全部可用
- drill_ids: 全部可用（有球训练是球场核心）

**❌ 绝对禁止：所有 ex-db-*(哑铃), ex-sus-*(悬吊/TRX), ex-bench-press, ex-cable-*, ex-back-squat, ex-front-squat, ex-deadlift, ex-trap-bar-deadlift, ex-power-clean, ex-leg-press, ex-hip-thrust, ex-hanging-leg-raise, ex-pallof-press, ex-face-pull**

**🔥 球场套餐规则：不使用combo_id**。球场场景必须逐项指定ID，从上述✅列表中选。module_1必须输出完整的warmup_ids/lower_ids/core_ids/cooldown_ids而非combo_id。

**💡 球场力量替代方案：**
- 杠铃后蹲 → 自重保加利亚分腿蹲 + 跳箱
- 杠铃硬拉 → 自重单腿RDL + 北欧弯举
- 杠铃卧推 → SSG对抗赛（上肢对抗自然发展）
- 绳索伐木 → 药球旋转抛掷
- 悬垂举腿 → 死虫式 + 平板支撑`;
  }

  if (scene === "gym") {
    return base + `

## 🏋️ 场景铁律：今天在健身房训练——专注器械力量！

你是健身房训练，不是球场。以下规则：
**✅ 可用：** 所有 ex-db-*(哑铃), ex-sus-*(悬吊), ex-bench-press, ex-cable-*, ex-back-squat, ex-front-squat, ex-deadlift, ex-trap-bar-deadlift, ex-power-clean, ex-leg-press, ex-hip-thrust, ex-hanging-leg-raise, ex-pallof-press, ex-face-pull, ex-med-ball-slam, ex-box-jump
**❌ 禁止：** drill_ids(有球训练), SSG对抗赛描述, 跑动训练, 战术内容
**🔥 优先使用combo_id套餐。**`;
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
