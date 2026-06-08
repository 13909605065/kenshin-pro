import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/supabase-server";
import { EXERCISE_LIBRARY } from "@/lib/exercise-data";
import { getKnowledgeContext } from "@/lib/knowledge-base";

const MAX_TOKENS = 1500;
const API_TIMEOUT_MS = 30_000;

// Rate limit: separate from generate
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 15_000;

// Provider configs (same as generate)
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

export async function POST(request: NextRequest) {
  // ── Auth check ──
  const supabase = createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ code: "auth-required", message: "请先登录" }, { status: 401 });
  }

  // ── Rate limit ──
  const now = Date.now();
  const lastRequest = rateLimitMap.get(user.id);
  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    return Response.json(
      { code: "rate-limited", message: "请稍后再试" },
      { status: 429 }
    );
  }
  rateLimitMap.set(user.id, now);

  // ── Parse input ──
  let body: {
    exerciseIds: string[];
    exerciseParams: Record<string, { sets: number; reps: number; rest: number }>;
    phase: string;
    goal: string;
    injuries: string[];
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "invalid", message: "无效请求" }, { status: 400 });
  }

  const { exerciseIds, exerciseParams, phase, goal, injuries } = body;

  if (!exerciseIds || exerciseIds.length < 2) {
    return Response.json({
      results: [{ status: "skip", label: "数据不足", reason: "至少需要2个动作才能校验" }],
    });
  }

  // ── Build exercise detail for AI ──
  const exerciseDetails = exerciseIds.map((id, idx) => {
    const ex = EXERCISE_LIBRARY.find((e) => e.id === id);
    const params = exerciseParams[id] || { sets: 3, reps: 8, rest: 90 };
    return `#${idx + 1} ${ex?.name || id} | 部位:${ex?.body_part || "未知"} | 器械:${ex?.equipment || "未知"} | ${params.sets}组×${params.reps}次 间歇${params.rest}s`;
  }).join("\n");

  const phaseLabel: Record<string, string> = {
    preseason: "季前准备", competition: "赛季中", recovery: "恢复期", offseason: "休赛期",
  };
  const goalLabel: Record<string, string> = {
    strength: "最大力量", power: "爆发力", agility: "协调灵敏", mas_endurance: "专项耐力",
  };

  // ── Search knowledge base ──
  const kbTopics = [
    "力量训练 动作顺序 编排 原则",
    "组数 次数 间歇 负荷 设计",
    `${phaseLabel[phase] || phase} 力量训练 周期`,
    `${goalLabel[goal] || goal} 训练 方案`,
    "拮抗肌群 超级组 交替训练",
    "复合动作 孤立动作 顺序",
    "关节压力 伤病预防 力量训练",
    "足球 力量训练 体能",
  ];
  if (injuries.length > 0) {
    kbTopics.push(`伤病 ${injuries.join(" ")} 训练 禁忌 动作`);
  }

  let kbContext = "";
  const seenPassages = new Set<string>();
  for (const topic of kbTopics) {
    const ctx = getKnowledgeContext(topic);
    if (ctx && !seenPassages.has(ctx.slice(0, 50))) {
      seenPassages.add(ctx.slice(0, 50));
      kbContext += ctx;
    }
  }

  // ── System prompt ──
  const systemPrompt = `你是一名足球体能教练，拥有运动科学博士学位。你需要审核一份力量训练方案。

## 审核维度（6项）
1. **拮抗交替**：相邻动作不应重复刺激同一肌群，应交替训练拮抗肌群（如推→拉→推→拉）
2. **大肌群优先**：大肌群复合动作（深蹲、硬拉、卧推、划船）应排在训练前半段，小肌群孤立动作后置
3. **复合优先**：多关节复合动作在前，单关节孤立动作在后
4. **强度递减**：大重量→中等→轻量递减排列；如果目标是爆发力，爆发性动作应在大重量之后、轻量之前
5. **关节分散**：不应连续2个以上动作加压同一关节（膝/肩/髋/脊柱/踝）
6. **伤病规避**：如果球员有伤病，标记会加重伤病的动作

## 训练场景
- 赛季阶段：${phaseLabel[phase] || phase}
- 训练目标：${goalLabel[goal] || goal}
- 伤病标记：${injuries.length > 0 ? injuries.join("、") : "无"}

${kbContext}

## 输出格式
必须输出严格JSON，一行，无markdown包裹：
{"results":[{"label":"拮抗交替","status":"pass|warn|fail","reason":"具体原因","suggestion":"改进建议（status非pass时必填）"},...]}

status定义：pass=通过 warn=建议优化 fail=不推荐 skip=数据不足
reason必须引用运动科学原理（基于知识库），不要泛泛而谈。
suggestion必须是可操作的改进建议。`;

  // ── User message ──
  const userMessage = `请审核以下力量训练方案：

${exerciseDetails}

伤病：${injuries.length > 0 ? injuries.join("、") : "无"}
阶段：${phaseLabel[phase] || phase}
目标：${goalLabel[goal] || goal}

请输出JSON校验结果。`;

  // ── Call AI ──
  const primary = getPrimaryProvider();
  const fallback = getFallbackProvider();
  if (!primary) {
    // Fallback: return skip for all checks
    return Response.json({
      results: [
        { status: "skip", label: "拮抗交替", reason: "AI 服务未配置" },
        { status: "skip", label: "大肌群优先", reason: "AI 服务未配置" },
        { status: "skip", label: "复合优先", reason: "AI 服务未配置" },
        { status: "skip", label: "强度递减", reason: "AI 服务未配置" },
        { status: "skip", label: "关节分散", reason: "AI 服务未配置" },
        { status: "skip", label: "伤病规避", reason: "AI 服务未配置" },
      ],
    });
  }

  const tryProvider = async (prov: { base: string; model: string; key?: string }) => {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), API_TIMEOUT_MS);
    try {
      const r = await fetch(prov.base, {
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
          stream: false,
          temperature: 0.3,
          thinking: { type: "disabled" },
        }),
        signal: ac.signal,
      });
      return r;
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    let response = await tryProvider(primary).catch(() => null);
    if (!response || !response.ok) {
      if (fallback) {
        response = await tryProvider(fallback).catch(() => null);
      }
    }
    if (!response || !response.ok) {
      throw new Error("AI 接口不可用");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse AI JSON response
    const jsonMatch = content.match(/\{[\s\S]*"results"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Response.json({ results: parsed.results });
    }

    // If no valid JSON, return raw text as a single info result
    return Response.json({
      results: [
        { status: "skip", label: "AI 分析", reason: content.slice(0, 500) || "AI 返回格式异常" },
      ],
    });
  } catch (e: any) {
    console.error("Gym validation error:", e);
    return Response.json({
      results: [
        { status: "skip", label: "AI 校验", reason: "AI 服务暂时不可用，请稍后重试" },
      ],
    }, { status: 500 });
  }
}
