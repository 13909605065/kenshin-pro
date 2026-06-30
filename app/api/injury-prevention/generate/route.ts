import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/supabase-server";
import { getKnowledgeContext } from "@/lib/knowledge-base";
import { EXERCISE_LIBRARY } from "@/lib/exercise-data";
import { buildStrengthRulesContext } from "@/lib/strength-rules";

const MAX_TOKENS = 3000;
const API_TIMEOUT_MS = 30_000;

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 15_000;

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

const POSITION_LABELS: Record<string, string> = {
  GK: "守门员", DF: "后卫", MF: "中场", FW: "前锋",
  WB: "翼卫", CB: "中后卫", FB: "边后卫", DM: "后腰",
  CM: "中前卫", AM: "前腰", WF: "边锋", CF: "中锋",
};

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
    return Response.json({ code: "rate-limited", message: "请稍后再试" }, { status: 429 });
  }
  rateLimitMap.set(user.id, now);

  // ── Parse input ──
  let body: {
    playerName: string;
    position: string;
    injuryStatus: string;
    injuryNote: string;
    injuryHistory: string;
    disabledExercises: string[];
    injuries: { body_part: string; injury_type: string; occurrence_date: string; return_date?: string; notes?: string }[];
    healthScores: { sleep: number; fatigue: number; soreness: number; stress: number; mood: number } | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "invalid", message: "无效请求" }, { status: 400 });
  }

  const { playerName, position, injuryStatus, injuryNote, injuryHistory, disabledExercises, injuries, healthScores } = body;

  // ── Build exercise library summary for AI ──
  const exerciseSummary = EXERCISE_LIBRARY.map(e =>
    `${e.name}(id:${e.id}|部位:${e.body_part}|器械:${e.equipment}|禁忌:${(e as any).injury_contraindications?.join?.("、") || "无"})`
  ).join("\n");

  // ── Filter safe exercises (no contraindications for player's injury) ──
  const injuryKeywords = [injuryNote, injuryHistory, ...injuries.map(i => i.body_part + i.injury_type)].join(" ").toLowerCase();
  const safeExercises = EXERCISE_LIBRARY.filter(e => {
    const contras = (e as any).injury_contraindications as string[] | undefined;
    if (!contras || contras.length === 0) return true;
    return !contras.some(c => injuryKeywords.includes(c.toLowerCase()));
  }).map(e => e.name);

  // ── Search knowledge base ──
  const posLabel = POSITION_LABELS[position] || position || "足球运动员";
  const kbTopics = [
    `${posLabel} 伤病预防 训练`,
    `足球 ${injuryStatus === "healthy" ? "伤病预防 prehab" : "伤病康复 rehab"} ${injuryNote}`,
    "FIFA 11+ 损伤预防 北欧弯举 平板支撑",
    "ACL 腘绳肌 踝关节 损伤 预防 训练",
    "足球 离心训练 肌力平衡 预防",
    "组织愈合 阶段 康复 RTP 重返赛场",
    "足球 负荷管理 ACWR 损伤风险",
  ];
  if (injuries.length > 0) {
    kbTopics.push(`${injuries.map(i => i.body_part).join(" ")} 康复 训练 阶段`);
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

  // ── Build system prompt ──
  const rulesContext = buildStrengthRulesContext(injuryStatus === "healthy" ? "preseason" : "recovery", "strength");

  const systemPrompt = `你是一名职业足球体能教练和运动康复专家。你需要为一名球员制定循证的伤病预防/康复训练计划。

## 球员档案
- 姓名：${playerName}
- 位置：${posLabel}
- 伤病状态：${injuryStatus === "healthy" ? "健康" : injuryStatus === "minor" ? "轻伤" : "缺阵"}
${injuryStatus !== "healthy" ? `- 当前伤病：${injuryNote}\n- 伤病史：${injuryHistory}` : ""}
${healthScores ? `- 近期健康评分：睡眠${healthScores.sleep}/5 疲劳${healthScores.fatigue}/5 酸痛${healthScores.soreness}/5 压力${healthScores.stress}/5 情绪${healthScores.mood}/5` : ""}

## 铁律（必须遵守）

1. **FIFA 11+ 每节必练**：北欧弯举 + 平板支撑三级 + 侧桥三级 + 单腿平衡三级
2. **禁忌动作排除**：${disabledExercises.length > 0 ? `禁用「${disabledExercises.join("、")}」` : "无特殊禁用"}
3. **4阶段组织愈合框架**：
   - 急性期(0-72h)：RICE，无负荷，轻柔ROM
   - 增殖期(3d-6w)：渐进负荷，等长→等张，闭链优先
   - 重塑期(6w-6m)：离心训练，增强式，专项动作
   - 功能期(>6m)：比赛模拟，RTP测试
4. **腘绳肌再伤风险最高**（增加8倍），离心康复是关键
5. **<18岁禁用>85%1RM**，奥举仅高训练年龄(≥8年)可用

${rulesContext}

## 可用动作库（供选择）
${exerciseSummary}

${kbContext}

## 输出格式
必须输出严格JSON，一行，无markdown包裹：
{"risk_assessment":"基于伤病史和位置的循证风险评估","exercises":[{"exercise_id":"动作ID(从可用动作库选)","name":"动作名称","sets":3,"reps":"8-12","load":"65-75%1RM","rest":"90s","rationale":"为何选此动作"}],"fifa_11_plus":{"nordic_curl":true,"plank":true,"side_bridge":true,"single_leg_balance":true,"nordic_level":"初级3-5次"|"中级7-10次"|"高级12-15次"},"tissue_stage":"acute"|"proliferation"|"remodeling"|"functional"|null,"load_guidelines":{"acwr_target":"1.0-1.3","progression":"每周增幅5-10%","weekly_sessions":3,"session_duration":"30-45min"},"recovery_recommendations":["建议1","建议2","建议3"]}

- risk_assessment必须引用KB具体出处
- exercises优先从安全动作中选择：${safeExercises.slice(0, 15).join("、")}...
- tissue_stage仅当injuryStatus≠"healthy"时判断
- load_guidelines必须标注ACWR目标区间和渐进策略
- recovery_recommendations至少3条`;

  // ── User message ──
  const userMessage = `请为${playerName}（${posLabel}）生成伤病${injuryStatus === "healthy" ? "预防" : "康复"}训练计划。

当前状态：${injuryStatus === "healthy" ? "健康，需要预防性训练" : injuryNote}
伤病史：${injuryHistory || "无记录"}
近期伤病记录：${injuries.length > 0 ? injuries.map(i => `${i.body_part}${i.injury_type}(${i.occurrence_date})`).join("、") : "无"}
${healthScores ? `健康问卷：睡眠${healthScores.sleep}/5 疲劳${healthScores.fatigue}/5 酸痛${healthScores.soreness}/5 压力${healthScores.stress}/5 情绪${healthScores.mood}/5${healthScores.fatigue + healthScores.soreness > 7 ? " [⚠️ 恢复不足，注意减载]" : ""}` : ""}

请输出JSON格式的训练计划。`;

  // ── Call AI ──
  const primary = getPrimaryProvider();
  const fallback = getFallbackProvider();
  if (!primary) {
    return Response.json({
      code: "no-provider",
      message: "AI 服务未配置，请检查环境变量",
    }, { status: 503 });
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
          temperature: 0.4,
        }),
        signal: ac.signal,
      });
      return r;
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    let response = await tryProvider(primary);
    if (!response.ok && fallback) {
      response = await tryProvider(fallback);
    }
    if (!response || !response.ok) {
      throw new Error("AI 接口不可用");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const plan = JSON.parse(jsonMatch[0]);
      return Response.json({
        plan,
        kbReferences: kbContext ? "已检索知识库：足球体能训练、运动康复、FIFA 11+等相关著作" : null,
      });
    }
    return Response.json({ code: "parse-error", message: "AI 返回格式异常，请重试" }, { status: 500 });
  } catch (e: any) {
    console.error("Injury prevention generation error:", e.message || e);
    return Response.json({ code: "ai-error", message: "AI 服务暂不可用，请稍后重试" }, { status: 503 });
  }
}
