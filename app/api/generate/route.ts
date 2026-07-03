import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/supabase-server";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai";
import { PlayerFormData, SeasonPhase, Position } from "@/lib/types";
import { assemblePlan, buildCoachSessionPlan, shouldUseAssembler } from "@/lib/plan-assembler";
import { validatePlan, type ValidationInput } from "@/lib/plan-validator";
import type { FitnessProfile } from "@/lib/fitness-store";
import { generateOfflinePlan, type OfflinePlanInput } from "@/lib/offline-plan";
import { getWeather, weatherHint } from "@/lib/weather";

// Rate limiting: simple in-memory map (resets on cold start)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000; // 1 minute per user
const MAX_TOKENS = 8000;
const API_TIMEOUT_MS = 90_000;

// Provider configs — auto-detect from env vars
const PROVIDERS = {
  deepseek: {
    base: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
    key: process.env.DEEPSEEK_API_KEY,
  },
  doubao: {
    base: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    model: process.env.DOUBAO_ENDPOINT || "",
    key: process.env.DOUBAO_API_KEY,
  },
} as const;

function getPrimaryProvider() {
  if (PROVIDERS.deepseek.key) return PROVIDERS.deepseek;
  if (PROVIDERS.doubao.key && PROVIDERS.doubao.model) return PROVIDERS.doubao;
  return null;
}
function getFallbackProvider() {
  if (PROVIDERS.deepseek.key && PROVIDERS.doubao.key && PROVIDERS.doubao.model) return PROVIDERS.doubao;
  return null;
}

// ── SSE encoding helpers ──
const encoder = new TextEncoder();
function sseEvent(event: string, data: string): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${data}\n\n`);
}

// ═══════════════════════════════════════════
// AI RAW OUTPUT PARSER
// ═══════════════════════════════════════════

interface ParsedAIEvent {
  event: string;
  data: any;
  raw: string;
}

/**
 * Parse the buffered AI text output into structured SSE events.
 * AI outputs lines like:
 *   event: module_1
 *   data: {"module":"position_training",...}
 *   event: module_2
 *   data: {...}
 *   event: done
 *   data: {"totalModules":...}
 */
function parseAIBuffer(buffer: string): ParsedAIEvent[] {
  const events: ParsedAIEvent[] = [];
  const lines = buffer.split("\n");
  let currentEvent = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("event: ")) {
      currentEvent = trimmed.slice(7).trim();
    } else if (trimmed.startsWith("data: ") && currentEvent) {
      const dataStr = trimmed.slice(6).trim();
      try {
        const data = JSON.parse(dataStr);
        events.push({ event: currentEvent, data, raw: dataStr });
      } catch {
        events.push({ event: currentEvent, data: dataStr, raw: dataStr });
      }
      currentEvent = "";
    }
  }

  return events;
}

// ═══════════════════════════════════════════
// POST /api/generate
// ═══════════════════════════════════════════

export async function POST(request: NextRequest) {
  // ── Auth check ──
  const supabase = createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ code: "auth-required", message: "请先登录" }, { status: 401 });
  }

  // ── API key check ──
  const primary = getPrimaryProvider();
  const fallback = getFallbackProvider();
  if (!primary) {
    return Response.json(
      { code: "no-api-key", message: "服务器未配置 AI 接口" },
      { status: 500 }
    );
  }

  // ── Rate limit check ──
  const lastRequest = rateLimitMap.get(user.id);
  const now = Date.now();
  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    const waitSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000);
    return Response.json(
      { code: "rate-limited", message: `请等待 ${waitSeconds} 秒后再生成`, waitSeconds },
      { status: 429 }
    );
  }

  if (!lastRequest) {
    const { data: recentPlan } = await supabase
      .from("training_plans")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentPlan?.created_at) {
      const planTime = new Date(recentPlan.created_at).getTime();
      if (now - planTime < RATE_LIMIT_MS) {
        const waitSeconds = Math.ceil((RATE_LIMIT_MS - (now - planTime)) / 1000);
        return Response.json(
          { code: "rate-limited", message: `请等待 ${waitSeconds} 秒后再生成`, waitSeconds },
          { status: 429 }
        );
      }
    }
  }

  rateLimitMap.set(user.id, now);

  // ── Parse & validate input ──
  // NOTE: tacticalThemes removed — S&C coach, not tactical coach.
  let formData: PlayerFormData;
  let lang = "zh";
  let scene: string | undefined;
  let matchContext: string | undefined;
  try {
    const body = await request.json();
    formData = body;
    lang = body.lang || "zh";
    scene = body.scene;
    matchContext = body.matchContext;
    const isCoach = formData.role === "coach";
    if (isCoach) {
      if (!formData.coachCert || !formData.coachRole || !formData.leagueTag) {
        return Response.json(
          { code: "invalid-form", message: "请填写教练必填项（证书、身份、联赛）" },
          { status: 400 }
        );
      }
    } else {
      if (!formData.position || !formData.goal || !formData.phase) {
        return Response.json(
          { code: "invalid-form", message: "请填写所有必填项" },
          { status: 400 }
        );
      }
    }
  } catch {
    return Response.json(
      { code: "invalid-form", message: "无效的请求数据" },
      { status: 400 }
    );
  }

  const isCoach = formData.role === "coach";
  const systemPrompt = buildSystemPrompt(formData, scene);

  // ── Knowledge base deep search ──
  const { getKnowledgeContext } = await import("@/lib/knowledge-base");

  // Build rich search queries from all form data
  const searchTopics: string[] = [];
  if (formData.position) searchTopics.push(`${formData.position} 训练`);
  if (formData.goal) searchTopics.push(formData.goal);
  if (formData.phase) searchTopics.push(`${formData.phase} 训练 周期`);
  if (formData.age) searchTopics.push(`${formData.age}岁 训练`);
  if (scene === "gym") searchTopics.push("力量训练 负荷 组数 次数");
  if (scene === "pitch") searchTopics.push("场地训练 足球 速度 灵敏");
  if (scene === "rehab") searchTopics.push("伤病 康复 恢复 训练");
  if (isCoach) searchTopics.push("教练 团队 训练计划 周期安排");
  searchTopics.push("足球体能 运动科学");

  // Search all topics and deduplicate
  let kbContext = "";
  const seenPassages = new Set<string>();
  for (const topic of searchTopics) {
    const ctx = getKnowledgeContext(topic, formData.position ?? undefined, formData.phase ?? undefined);
    if (ctx && !seenPassages.has(ctx.slice(0, 50))) {
      seenPassages.add(ctx.slice(0, 50));
      kbContext += ctx;
    }
  }

  const enrichedSystemPrompt = systemPrompt + (kbContext || "");

  const weather = await getWeather().catch(() => null);

  // ── Scene hint for AI ──
  let sceneHint = "";
  if (scene === "gym") {
    sceneHint = `## 场景限制：力量房训练
今天在力量房。严格限制：
✅ 可输出：杠铃/哑铃/药球/跳箱等器械力量训练、FIFA 11+标准化无球热身
❌ 禁止：任何有球热身、足球技术训练、SSG对抗赛、跑类有氧
❌ 禁止使用热身ID: warm-ball-touch, warm-ball-dribble, warm-rondo
热身全无球: warm-hip-open, warm-glute-activation, warm-dynamic-stretch, warm-plank-series, warm-side-plank-series, warm-single-leg-balance, warm-nordic-curl`;
  } else if (scene === "pitch") {
    sceneHint = `## 场景限制：外场训练
今天在外场。严格限制：
✅ 只能输出：自重训练、药球、弹力带、跑跳类训练
❌ 绝对禁止：杠铃、哑铃、TRX、卧推凳等器械力量动作
❌ 禁止绳梯协调灵敏训练（归属力量房）
热身：无球或有球二选一，禁止混合`;
  } else if (scene === "rehab") {
    sceneHint = `## ⚠️ 场景限制：伤病防控与康复（板块四·康复）
球员处于伤病恢复期，严格限制：
✅ 只能输出：自重康复训练、弹力带轻阻力、等长训练、本体感觉训练、ROM恢复
❌ 禁止：任何大重量(>50%1RM)、爆发力动作、增强式/跳跃/冲刺
❌ 禁止使用 combo_id（套餐是为健康运动员设计）
❌ 热身仅允许低强度版本，心率不超过(220-年龄)×60%
🟢 必须输出 module_5 康复方案 phases 数组（急性期→增殖期→重塑期→功能期）
🟢 训练目标自动改为：弱侧强化+替代训练+渐进恢复`;
  }

  // Inject fitness data hint if available
  const fitnessData = (formData as any).fitnessProfile || null;
  let fitnessHint = "";
  if (fitnessData) {
    fitnessHint = `\n## 📊 球员体能档案（基于实测数据）
${JSON.stringify(fitnessData, null, 1)}
请基于以上实测数据设定具体的负重、配速和间歇时间。`;
  }

  const userMessage =
    buildUserPrompt(formData, lang, weather ? weatherHint(weather) : undefined, sceneHint) +
    (fitnessHint ? "\n" + fitnessHint : "") +
    (matchContext ? "\n\n" + matchContext : "");

  // ═══════════════════════════════════════════
  // MAIN STREAM
  // ═══════════════════════════════════════════
  const stream = new ReadableStream({
    async start(controller) {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      try {
        // ── Phase A: Call AI ──
        let response: Response | null = null;
        let lastError: Error | null = null;

        const tryProvider = async (prov: { base: string; model: string; key?: string }) => {
          const ac = new AbortController();
          timeoutId = setTimeout(() => ac.abort(), 60000);
          const r = await fetch(prov.base, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${prov.key}`,
            },
            body: JSON.stringify({
              model: prov.model,
              messages: [
                { role: "system", content: enrichedSystemPrompt },
                { role: "user", content: userMessage },
              ],
              max_tokens: MAX_TOKENS,
              stream: true,
              temperature: 0.7,
              thinking: { type: "disabled" },
            }),
            signal: ac.signal,
          });
          clearTimeout(timeoutId);
          return r;
        };

        try {
          response = await tryProvider(primary);
        } catch (e: any) {
          lastError = e;
        }
        if (!response || !response.ok) {
          if (fallback) {
            try {
              response = await tryProvider(fallback);
            } catch (e: any) {
              lastError = e;
            }
          }
        }
        if (!response || !response.ok) throw lastError || new Error("AI 接口不可用");

        // ── Phase B: Read full AI stream into buffer ──
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let sseBuffer = "";
        let rawBuffer = ""; // Accumulated AI text output (event: ... / data: ... lines)

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const sseLines = sseBuffer.split("\n");
          sseBuffer = sseLines.pop() || "";

          for (const line of sseLines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta;
              const content = delta?.content || delta?.reasoning_content || "";
              if (!content) continue;

              // Accumulate into our raw buffer
              rawBuffer += content;
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }

        // Flush remaining SSE
        if (sseBuffer.trim()) {
          try {
            const line = sseBuffer.trim();
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr !== "[DONE]") {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta;
                const content = delta?.content || delta?.reasoning_content || "";
                if (content) rawBuffer += content;
              }
            }
          } catch {
            // ignore
          }
        }

        // ── Phase C: Parse AI output into structured events ──
        const aiEvents = parseAIBuffer(rawBuffer);

        if (aiEvents.length === 0) {
          throw new Error("AI 返回空内容");
        }

        // Find module_1 (position_training) data
        const module1Event = aiEvents.find(
          (e) => e.event === "module_1" && typeof e.data === "object"
        );

        // Determine if we should use the B+C pipeline (validation + assembly)
        const usePipeline = scene !== "rehab" && shouldUseAssembler(scene || "gym", formData.goal || "strength");

        if (usePipeline && module1Event && typeof module1Event.data === "object") {
          // ═══════════════════════════════════════
          // B+C PIPELINE: Validate → Assemble → Stream
          // ═══════════════════════════════════════

          const mod1 = module1Event.data as Record<string, any>;
          const aiComboId: string | null = mod1.combo_id || null;

          // Extract AI exercise IDs from all categories
          const aiUpperIds: string[] = Array.isArray(mod1.upper_ids) ? mod1.upper_ids : [];
          const aiLowerIds: string[] = Array.isArray(mod1.lower_ids) ? mod1.lower_ids : [];
          const aiCoreIds: string[] = Array.isArray(mod1.core_ids) ? mod1.core_ids : [];
          const aiAbilityIds: string[] = Array.isArray(mod1.ability_exercise_ids)
            ? mod1.ability_exercise_ids
            : [];
          const allAiExerciseIds = [...aiUpperIds, ...aiLowerIds, ...aiCoreIds, ...aiAbilityIds];

          const phaseVal = (formData.phase || "competition") as SeasonPhase;
          const goalVal = formData.goal || "strength";
          const sceneVal = scene || "gym";

          // ── B: Validate plan (combo + exercises + injury filtering) ──
          const injurySites: string[] = Array.isArray(formData.injurySites)
            ? formData.injurySites.filter((s: string) => s && s !== "none")
            : [];

          const validationInput: ValidationInput = {
            aiComboId,
            aiExerciseIds: allAiExerciseIds,
            scene: sceneVal,
            goal: goalVal,
            phase: phaseVal,
            position: formData.position,
            injuries: injurySites,
            disabledExercises: [],
            playerCount: formData.playerCount || 1,
          };

          const planValidation = validatePlan(validationInput);

          console.log(
            `[B+C] Plan validated. Score: ${planValidation.score}/100. ` +
            `Combo: ${planValidation.finalComboId}. ` +
            `Exercises: ${planValidation.finalExerciseIds.length}. ` +
            `Replacements: ${planValidation.replacements.length}. ` +
            `Warnings: ${planValidation.warnings.length}.`
          );
          if (planValidation.warnings.length > 0) {
            console.log(`[B+C] Warnings:`, planValidation.warnings);
          }
          if (planValidation.replacements.length > 0) {
            console.log(`[B+C] Replacements:`, planValidation.replacements.map(r => `${r.original}→${r.replaced}`));
          }

          // ── C: Assemble the plan ──
          const fitnessProfile: FitnessProfile = (fitnessData as FitnessProfile) || {};
          const assembledModules = assemblePlan(
            planValidation,
            fitnessProfile,
            phaseVal,
            goalVal,
            sceneVal,
            formData.position
          );

          // ── Stream back assembled modules ──
          let moduleCount = 0;
          for (const mod of assembledModules) {
            moduleCount++;
            let eventName: string;
            if (mod.module === "position_training") {
              eventName = "module_1";
            } else if (mod.module === "ability_training") {
              eventName = "module_2";
            } else if (mod.module === "phase_plan") {
              eventName = "module_3";
            } else {
              eventName = `module_${moduleCount}`;
            }

            controller.enqueue(sseEvent(eventName, JSON.stringify(mod)));
          }

          // Pass through other AI modules (technique_running, injury_recovery, etc.)
          // Skip modules we already emitted
          let extraModuleCount = 0;
          const emittedModules = new Set(assembledModules.map(m => m.module));
          for (const ev of aiEvents) {
            if (ev.event === "module_1" || ev.event === "done") continue;
            if (typeof ev.data === "object" && ev.data.module && emittedModules.has(ev.data.module)) continue;
            extraModuleCount++;
            controller.enqueue(sseEvent(ev.event, typeof ev.data === "string" ? ev.data : JSON.stringify(ev.data)));
          }

          // ── Coach mode: inject session plan + microcycle ──
          if (isCoach) {
            const { resolveCombo } = await import("@/lib/training-library");
            const combo = planValidation.finalComboId ? resolveCombo(planValidation.finalComboId) : null;
            const sessionPlan = buildCoachSessionPlan(
              combo,
              phaseVal,
              goalVal,
              sceneVal,
              formData.position,
              formData.playerCount || 20,
              formData.trainingDuration || 75
            );
            moduleCount++;
            controller.enqueue(sseEvent(`module_${moduleCount}`, JSON.stringify(sessionPlan)));

            // Inject microcycle
            const { MICROCYCLE_TEMPLATES } = await import("@/lib/training-library");
            const microId = phaseVal === 'competition' ? 'microcycle-1game' : 'microcycle-1game';
            const microcycle = MICROCYCLE_TEMPLATES[microId];
            if (microcycle) {
              moduleCount++;
              controller.enqueue(sseEvent(`module_${moduleCount}`, JSON.stringify({
                module: 'microcycle',
                ...microcycle,
                status: 'complete',
              })));
            }
          }

          controller.enqueue(
            sseEvent("done", JSON.stringify({ totalModules: moduleCount + extraModuleCount }))
          );
        } else {
          // ═══════════════════════════════════════
          // LEGACY PATH: Pass AI output through (rehab or no module_1 found)
          // ═══════════════════════════════════════

          // Still try to resolve IDs using the training-library if possible
          // For this fallback path, just pass the raw AI output through
          let moduleCount = 0;
          for (const ev of aiEvents) {
            if (ev.event === "done") {
              controller.enqueue(
                sseEvent("done", typeof ev.data === "object" ? JSON.stringify(ev.data) : ev.data)
              );
            } else {
              moduleCount++;
              controller.enqueue(
                sseEvent(ev.event, typeof ev.data === "string" ? ev.data : JSON.stringify(ev.data))
              );
            }
          }

          if (!aiEvents.some((e) => e.event === "done")) {
            controller.enqueue(sseEvent("done", JSON.stringify({ totalModules: moduleCount })));
          }
        }

        controller.close();
      } catch (error: any) {
        // ═══════════════════════════════════════
        // AI FAILED → Use offline plan engine
        // ═══════════════════════════════════════
        clearTimeout(timeoutId);
        console.error("[B+C] AI failed, falling back to offline plan:", error.message);

        try {
          const offlineInput: OfflinePlanInput = {
            scene: scene || "gym",
            goal: formData.goal || "strength",
            phase: (formData.phase || "competition") as SeasonPhase,
            duration: formData.trainingDuration || 60,
            position: formData.position as Position | null,
            playerName: formData.name || undefined,
          };

          const offlineModules = generateOfflinePlan(offlineInput);
          let moduleCount = 0;
          for (const mod of offlineModules) {
            moduleCount++;
            controller.enqueue(
              sseEvent(`module_${moduleCount}`, JSON.stringify(mod))
            );
          }
          controller.enqueue(
            sseEvent(
              "done",
              JSON.stringify({ totalModules: moduleCount, offline: true })
            )
          );
        } catch (offlineError: any) {
          controller.enqueue(
            sseEvent(
              "error",
              JSON.stringify({
                code: "offline-error",
                message: "离线引擎也失败了，请稍后重试",
              })
            )
          );
        }

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
