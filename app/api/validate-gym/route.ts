import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/supabase-server";
import { EXERCISE_LIBRARY } from "@/lib/exercise-data";
import { getKnowledgeContext } from "@/lib/knowledge-base";
import { buildStrengthRulesContext } from "@/lib/strength-rules";

const MAX_TOKENS = 2000;
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

  // ── System prompt with kenshin's football strength rules ──
  const rulesContext = buildStrengthRulesContext(phase, goal);

  const systemPrompt = `你是一名职业足球体能教练。你需要按照以下教练审定的规则审核一份力量训练方案。

${rulesContext}

## 审核维度（8项，基于上述规则）

1. **编排顺序**：是否按「爆发力→单侧下肢→双侧复合→上肢推拉→抗旋核心→孤立」顺序排列？违反编排红线？（如大重量在末尾、下肢连续高强度蹲+跳）
2. **单侧占比**：单侧下肢动作是否≥40%？两侧是否均衡？
3. **三平面配比**：矢状面≈50%、冠状面≈30%、水平面≈20%？是否严重偏向单一平面？
4. **复合/孤立配比**：复合≈80%、孤立≤20%？孤立动作是否仅限腘绳肌/小腿/肩袖？
5. **肌力平衡**：股四头肌:腘绳肌≈1:0.7~0.8？拉的训练量>推？是否有肩袖训练？
6. **负荷匹配**：当前阶段（${phaseLabel[phase] || phase}）和目标（${goalLabel[goal] || goal}）的负荷/组数/次数/间歇是否在合理区间？
7. **技术安全**：有没有使用禁用动作（大重量腿屈伸、颈后推举/下拉、超大重量手臂弯举）？
8. **伤病规避**：${injuries.length > 0 ? `伤病「${injuries.join("、")}」是否会因当前方案加重？` : "无伤病标记"}

${kbContext}

## 输出格式
必须输出严格JSON，一行，无markdown包裹：
{"results":[
  {"label":"编排顺序","status":"pass|warn|fail","reason":"具体原因","suggestion":"改进建议"},
  {"label":"单侧占比","status":"pass|warn|fail","reason":"...","suggestion":"..."},
  {"label":"三平面配比","status":"pass|warn|fail","reason":"...","suggestion":"..."},
  {"label":"复合/孤立配比","status":"pass|warn|fail","reason":"...","suggestion":"..."},
  {"label":"肌力平衡","status":"pass|warn|fail","reason":"...","suggestion":"..."},
  {"label":"负荷匹配","status":"pass|warn|fail","reason":"...","suggestion":"..."},
  {"label":"技术安全","status":"pass|warn|fail","reason":"...","suggestion":"..."},
  {"label":"伤病规避","status":"pass|warn|fail","reason":"...","suggestion":"..."}
]}

status: pass=合规 warn=偏离建议 fail=违反红线
reason必须引用上述足球专项规则，给出具体动作编号。
suggestion必须是可操作的改进建议（重排顺序/替换动作/调整负荷）。`;

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
