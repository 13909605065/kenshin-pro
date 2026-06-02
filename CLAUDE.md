# CLAUDE.md — kenshin-pro

AI 足球训练方案生成器。中国足球教练的 AI 工作台。

## 技术栈

- Next.js 14.2.35 App Router
- React 18, TypeScript 5.x
- Supabase (auth + PostgreSQL)
- 豆包 API (ByteDance Volcano Ark) / DeepSeek API（自动检测）
- Fabric.js 5.x（战术板）
- Tailwind CSS

## 常用命令

```bash
npm run dev           # 开发服务器 http://localhost:3000
npx tsc --noEmit      # 类型检查
npm run build         # 生产构建
git push origin master # 推送 → Vercel 自动部署
```

## 目录结构

```
app/
├── api/generate/route.ts    # ⭐ 核心 API：SSE 流式生成训练方案
├── exercises/page.tsx       # 动作库页面（124个动作，筛选+搜索）
├── tactics/page.tsx         # 战术板页面（Fabric.js 画布）
├── login/page.tsx           # Supabase 登录
├── settings/page.tsx        # 设置页
└── page.tsx                 # 首页 Dashboard

lib/
├── prompts/
│   ├── system.ts            # ⭐ buildAthleteSystemPrompt() + buildCoachSystemPrompt()
│   ├── athlete.ts           # buildAthletePrompt() — 含套餐推荐+个性化调整+性别
│   ├── coach.ts             # buildCoachPrompt() — 教案输出模式
│   └── index.ts             # buildSystemPrompt(data) + buildUserPrompt(data, lang)
├── training-library.ts      # ⭐ 离线文库（1500+行）— 动作/战术/微周期/套餐
├── types.ts                 # 全部 TypeScript 类型
├── prompt.ts                # 胶水层，导出 buildUserPrompt / buildSystemPrompt
├── constants.ts             # 标签映射（位置/目标/阶段/伤病/战术等）
├── cache.ts                 # 客户端缓存（fingerprint + localStorage）
├── supabase-client.ts       # 浏览器端 Supabase
├── supabase-server.ts       # 服务端 Supabase
└── services/
    └── ai.ts                # streamGenerate() — 客户端 SSE 解析

components/
├── Dashboard.tsx            # 主面板：表单+生成+编辑档案
├── TrainingTabs.tsx         # 结果展示：运动员5Tab / 教练3Tab
├── GeneratingOverlay.tsx    # 生成中动画
├── ErrorAlert.tsx           # 错误提示+重试
├── TrainingTabs.tsx         # 根据 role 切换运动员/教练视图
└── tabs/                    # WarmupTab / PhysicalTab / TechniqueTab / TacticalTab / NutritionTab
```

## 核心架构

### 生成流程（最重要的链路）

```
用户填表单 → Dashboard.handleGenerate()
  → useTraining.generate()
    → streamGenerate() [客户端 SSE 解析]
      → POST /api/generate/
        → buildSystemPrompt(formData)  ← 根据 role 选运动员/教练版
        → buildUserPrompt(formData, lang)
        → 调用豆包/DeepSeek API (SSE streaming)
        → 解析 AI 输出的 compact JSON
        → resolveModule() / resolveCoachModule() / resolveCombo()
        → 展开为完整 TrainingModule
      → 客户端接收 SSE events
    → setModules() → TrainingTabs 渲染
```

### AI 输出格式（运动员 5 模块）

```
event: module_1
data: {"module":"position_training","combo_id":"combo_mf_power_preseason","analysis":"基于你...","status":"complete"}

event: module_2
data: {"module":"ability_training","ability_exercise_ids":[...],"status":"complete"}

event: module_3
data: {"module":"technique_running","drill_ids":[...],"status":"complete"}

event: module_4
data: {"module":"phase_plan","phase_id":"competition","status":"complete"}

event: module_5
data: {"module":"injury_recovery","phases":[],"status":"skipped"}

event: done
data: {"totalModules":5}
```

### AI 输出格式（教练 3 模块）

```
module_1: session_plan（warmup + activities + ssg + cooldown）
module_2: tactical_focus（战术专项练习）
module_3: microcycle（微周期计划）
```

### 套餐展开（combo_id）

AI 输出 `combo_id` → `resolveCombo()` 查找 ATHLETE_COMBOS → 展开为 warmup/upper/lower/core/ability/cooldown ID 数组 → `resolveModule()` 展开为完整数据

### 离线文库模式

AI 只输出紧凑 ID → 服务器用 training-library.ts 展开为完整数据。避免 AI 输出冗长 JSON。

## 关键约定

- `trailingSlash: true` — 所有 URL 以 `/` 结尾，POST 重定向需注意
- Auth middleware 保护所有路由（除 login），未登录 → 307 跳转
- 豆包 API 的 `thinking: { type: "disabled" }` 必须设置（否则默认推理模式耗 token）
- API 超时 90s，客户端超时 80s，MAX_TOKENS 6000
- 所有 data 行 JSON 必须单行（SSE 协议要求）
- <18岁禁用 >85%1RM，奥举仅高训练年龄(≥8年)
- FIFA 11+ 每节必练（北欧弯举+平板+侧桥+单腿平衡）
- 热身禁用静态拉伸（放冷身阶段）；RAMP 四阶段约15-20min

## 部署

- Vercel: kenshin-pro.vercel.app（自动从 GitHub master 分支部署）
- 自定义域名: llwdsg2004.qzz.io
- Supabase 数据库: 训练历史 + 用户档案 + 反馈
