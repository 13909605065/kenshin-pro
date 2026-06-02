import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompt";
import { PlayerFormData } from "@/lib/types";

// Rate limiting: simple in-memory map (resets on cold start)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000; // 1 minute per user
const MAX_TOKENS = 3000;
const API_TIMEOUT_MS = 90_000; // 90s timeout for LLM call

const DOUBAO_BASE = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ code: "auth-required", message: "请先登录" }, { status: 401 });
  }

  // API key check
  const apiKey = process.env.DOUBAO_API_KEY;
  const endpointId = process.env.DOUBAO_ENDPOINT;
  if (!apiKey || !endpointId) {
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

  const userMessage = buildUserPrompt(formData, lang);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        // Abort slow requests
        const abortController = new AbortController();
        timeoutId = setTimeout(() => abortController.abort(), API_TIMEOUT_MS);

        const response = await fetch(DOUBAO_BASE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: endpointId,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
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
              // Support both normal and reasoning model output
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
                  controller.enqueue(
                    encoder.encode(`event: ${currentEvent}\ndata: ${dataStr}\n\n`)
                  );
                  if (currentEvent === "done") {
                    currentEvent = "";
                  }
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
