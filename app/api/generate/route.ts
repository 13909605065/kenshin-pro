import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import { PlayerFormData } from "@/lib/types";
import { resolveModule, resolveCoachModule, resolveCombo, type CompactModule, type CoachCompactModule } from "@/lib/training-library";

// Rate limiting: simple in-memory map (resets on cold start)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000; // 1 minute per user
const MAX_TOKENS = 6000;
const API_TIMEOUT_MS = 90_000; // 90s

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

function resolveProvider() {
  if (PROVIDERS.deepseek.key) return PROVIDERS.deepseek;
  if (PROVIDERS.doubao.key && PROVIDERS.doubao.model) return PROVIDERS.doubao;
  return null;
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ code: "auth-required", message: "请先登录" }, { status: 401 });
  }

  // API key check
  const provider = resolveProvider();
  if (!provider) {
    return Response.json(
      { code: "no-api-key", message: "服务器未配置 AI 接口" },
      { status: 500 }
    );
  }

  // Rate limit check
  const lastRequest = rateLimitMap.get(user.id);
  const now = Date.now();
  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    const waitSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000);
    return Response.json(
      { code: "rate-limited", message: `请等待 ${waitSeconds} 秒后再生成`, waitSeconds },
      { status: 429 }
    );
  }
  rateLimitMap.set(user.id, now);

  // Parse and validate input
  let formData: PlayerFormData;
  let lang = "zh";
  try {
    const body = await request.json();
    formData = body;
    lang = body.lang || "zh";
    const isCoach = formData.role === "coach";
    if (isCoach) {
      if (!formData.coachCert || !formData.coachRole || !formData.leagueTag || !formData.tacticalThemes?.length) {
        return Response.json(
          { code: "invalid-form", message: "请填写教练必填项（证书、身份、联赛、战术主题）" },
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
  const systemPrompt = buildSystemPrompt(formData);
  const userMessage = buildUserPrompt(formData, lang);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        // Abort slow requests
        const abortController = new AbortController();
        timeoutId = setTimeout(() => abortController.abort(), API_TIMEOUT_MS);

        const response = await fetch(provider.base, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.key}`,
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            max_tokens: MAX_TOKENS,
            stream: true,
            temperature: 0.7,
            thinking: { type: "disabled" },
          }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`API 调用失败 (${response.status}): ${err}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let sseBuffer = "";
        let currentEvent = "";

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

              buffer += content;

              // Parse our custom SSE events from model's text output
              const outLines = buffer.split("\n");
              buffer = outLines.pop() || "";

              for (const outLine of outLines) {
                if (outLine.startsWith("event: ")) {
                  currentEvent = outLine.slice(7).trim();
                } else if (outLine.startsWith("data: ") && currentEvent) {
                  const dataStr = outLine.slice(6).trim();

                  if (currentEvent === "done") {
                    controller.enqueue(
                      encoder.encode(`event: done\ndata: ${dataStr}\n\n`)
                    );
                    currentEvent = "";
                    continue;
                  }

                  // Resolve compact IDs → full data
                  let resolvedData = dataStr;
                  try {
                    const compact = JSON.parse(dataStr);

                    if (isCoach) {
                      // Coach mode: use coach resolver
                      const full = resolveCoachModule(compact as CoachCompactModule);
                      if (full) resolvedData = JSON.stringify(full);
                    } else {
                      // Athlete mode: support combo_id shorthand
                      if (compact.combo_id && compact.module === "position_training") {
                        const combo = resolveCombo(compact.combo_id);
                        if (combo) {
                          // Expand combo into full compact module then resolve
                          const expanded: CompactModule = {
                            module: "position_training",
                            title: compact.title || combo.label,
                            analysis: compact.analysis,
                            warmup_ids: combo.warmup_ids,
                            upper_ids: compact.upper_ids || combo.upper_ids,
                            lower_ids: compact.lower_ids || combo.lower_ids,
                            core_ids: compact.core_ids || combo.core_ids,
                            cooldown_ids: combo.cooldown_ids,
                            nutrition_goal: compact.nutrition_goal || combo.nutrition_goal,
                            ability_exercise_ids: compact.ability_exercise_ids,
                            status: "complete",
                          };
                          const full = resolveModule(expanded, formData.position);
                          if (full) resolvedData = JSON.stringify(full);
                        } else {
                          // Combo not found — fall back to standard resolution
                          const full = resolveModule(compact as CompactModule, formData.position);
                          if (full) resolvedData = JSON.stringify(full);
                        }
                      } else if (currentEvent.startsWith("module_")) {
                        // Standard athlete module resolution
                        const full = resolveModule(compact as CompactModule, formData.position);
                        if (full) resolvedData = JSON.stringify(full);
                      }
                    }
                  } catch {
                    // If parsing/resolution fails, send raw data
                  }

                  controller.enqueue(
                    encoder.encode(`event: ${currentEvent}\ndata: ${resolvedData}\n\n`)
                  );
                  currentEvent = "";
                }
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }

        // Flush remaining
        if (buffer.trim()) {
          controller.enqueue(encoder.encode(`data: ${buffer.trim()}\n\n`));
        }

        controller.close();
      } catch (error: any) {
        clearTimeout(timeoutId);
        const isTimeout = error.name === "AbortError" || error.name === "TimeoutError";
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({
              code: isTimeout ? "timeout" : "api-error",
              message: isTimeout
                ? "AI 服务响应超时，请稍后重试"
                : error.message || "AI 服务调用失败",
            })}\n\n`
          )
        );
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
