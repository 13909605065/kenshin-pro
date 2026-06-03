import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/supabase-server";
import { buildBoardGenSystemPrompt, buildBoardGenUserPrompt, type BoardGenResult } from "@/lib/ai/tactical-board-generate";

// Rate limiting
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 30_000;
const MAX_TOKENS = 3000;

interface ProviderConfig {
  base: string;
  model: string;
  key?: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
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
};

function getPrimaryProvider(): ProviderConfig | null {
  if (PROVIDERS.deepseek.key) return PROVIDERS.deepseek;
  if (PROVIDERS.doubao.key && PROVIDERS.doubao.model) return PROVIDERS.doubao;
  return null;
}

function getFallbackProvider(): ProviderConfig | null {
  if (PROVIDERS.deepseek.key && PROVIDERS.doubao.key && PROVIDERS.doubao.model) return PROVIDERS.doubao;
  return null;
}

function extractJson(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const braceStart = raw.indexOf("{");
  const braceEnd = raw.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return raw.slice(braceStart, braceEnd + 1);
  }
  return raw.trim();
}

export async function POST(request: NextRequest) {
  // Auth
  const supabase = createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ code: "auth-required", message: "请先登录" }, { status: 401 });
  }

  // API key
  const primary = getPrimaryProvider();
  const fallback = getFallbackProvider();
  if (!primary) {
    return Response.json({ code: "no-api-key", message: "服务器未配置 AI 接口" }, { status: 500 });
  }

  // Rate limit
  const lastRequest = rateLimitMap.get(user.id);
  const now = Date.now();
  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    const waitSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000);
    return Response.json(
      { code: "rate-limited", message: `请等待 ${waitSeconds} 秒`, waitSeconds },
      { status: 429 }
    );
  }
  rateLimitMap.set(user.id, now);

  // Parse input
  let description: string;
  let context: string | undefined;

  try {
    const body = await request.json();
    description = body.description;
    context = body.context;

    if (!description || typeof description !== "string" || description.trim().length < 3) {
      return Response.json(
        { code: "invalid-input", message: "请描述需要的战术图（至少3个字）" },
        { status: 400 }
      );
    }
  } catch {
    return Response.json(
      { code: "invalid-input", message: "无效的请求数据" },
      { status: 400 }
    );
  }

  // Build prompts
  const systemPrompt = buildBoardGenSystemPrompt();
  const userMessage = buildBoardGenUserPrompt(description, context);

  // Try primary, fallback on failure
  let rawText = "";
  let lastError: Error | null = null;

  const tryProvider = async (prov: ProviderConfig): Promise<string> => {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 60000);

    try {
      const res = await fetch(prov.base, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${prov.key}`,
        },
        body: JSON.stringify({
          model: prov.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: MAX_TOKENS,
          temperature: 0.5,
          thinking: { type: "disabled" },
        }),
        signal: ac.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Provider returned ${res.status}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    rawText = await tryProvider(primary);
  } catch (e: any) {
    lastError = e;
    if (fallback) {
      try {
        rawText = await tryProvider(fallback);
      } catch (e2: any) {
        lastError = e2;
      }
    }
  }

  if (!rawText) {
    return Response.json(
      { code: "ai-error", message: `AI 接口不可用: ${lastError?.message || "未知错误"}` },
      { status: 502 }
    );
  }

  // Parse AI output
  try {
    const jsonStr = extractJson(rawText);
    const result: BoardGenResult = JSON.parse(jsonStr);

    // Validate required fields
    if (!result.players || !Array.isArray(result.players)) {
      throw new Error("Missing players array");
    }

    return Response.json({ code: "ok", data: result });
  } catch (parseError: any) {
    console.error("Board gen parse error:", parseError.message);
    console.error("Raw AI output:", rawText.slice(0, 500));

    return Response.json({
      code: "parse-error",
      message: "AI 输出格式异常，请重试",
      raw: rawText.slice(0, 1000),
    });
  }
}
