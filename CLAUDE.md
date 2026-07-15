# CLAUDE.md — kenshin-pro

AI 足球训练方案生成器。体能教练的 AI 工作台。**kenshin 是体能教练，不替教练做决策，只提供数据和建议。**

## ⚠️ 核心原则（每次对话前置）

1. **🔴 死规矩：一切功能必须基于知识库**：38本著作/1130万字。不只是训练方案生成——负荷管理、场地监控、足球体能、伤病评估、AI校验、力量房、营养方案、体能测试——**每一个功能、每一个数值、每一个系数都必须基于循证**。禁止硬编码规则冒充AI，禁止拍脑袋数字，所有数值标注出处。违者即改。
2. **kenshin 是体能教练**，在队里是辅助/建议角色。主教练拍板。
3. **不做决策**：只标记、展示数据、给建议，不自动改方案。
4. **简约优先**：去掉一切非必要文字/图标/emoji，功能按钮保留。
5. **功能按钮不删**：补水、历史、导出等是功能性的，不能去。
6. **🔴 数据部署铁律**：修改任何数据文件后，部署前必须跑 `python3 /Users/kenshin/Desktop/山西/数据收集/脚本工具/_validate_all.py`。68项全通过才能部署。禁止说「看过了」——必须看到 `🟢 全部通过`。
7. **🔴 数据更新铁律**：收到更新指令后，必须先列清单（7个文件），再逐个更新+验证，最后报告。禁止边做边漏、多轮返工。详见 `/Users/kenshin/Desktop/山西/数据收集/CLAUDE.md`。
6. **去字不去功能**：RAMP描述、SSG说明等文字去掉，但功能保留。
6. **中文标签**：不用英文goal类型，全部中文。

## 技术栈

- Next.js 14.2.35 App Router
- React 18, TypeScript 5.x
- Supabase (auth + PostgreSQL)
- 豆包 API (ByteDance Volcano Ark) / DeepSeek API（自动检测）
- Fabric.js 5.x（战术板）
- Tailwind CSS
- jsPDF（报告生成）+ XLSX（Excel解析）
- ocrmypdf + Tesseract（知识库OCR）

## 知识库（2026-06-07建成）

- `/kb/books/` — 38本PDF（gitignore，仅本地）
- `/kb/ocr-output/` — OCR提取文本 + `_index.json`
- `lib/knowledge-base.ts` — 全文搜索引擎
- AI 生成方案时自动检索相关段落注入 system prompt
- 1130万字，37本可检索
- `/kb` 页面可浏览全库

## 动作库

- **唯一数据源**：`lib/training-library.ts` STRENGTH_LIBRARY（22个动作）
- `lib/exercise-data.ts` 自动从 STRENGTH_LIBRARY 生成，不再独立维护
- 卡片显示：动作名 + 注意事项；点开看进阶/退阶
- 器械：杠铃/哑铃/壶铃/悬吊/自重/弹力带/药球/波速球/跳箱
- 类型：力量/步伐/跳跃/拉伸/爆发/核心

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

### ⚠️ 中国网络约束（严禁破坏）

**kenshin 在国内，以下域名统统被墙：**
- `supabase.co` — Supabase API
- `github.com` — Git SSH/HTTPS
- `vercel.app` — Vercel 默认域名

**铁律：**
1. **`NEXT_PUBLIC_SUPABASE_URL` 永远保持 `https://gqjzrrwcxukpzilkjqke.supabase.co`**，绝不改成相对路径或代理路径
2. **浏览器端 Supabase 请求必须走代理**：`lib/supabase/supabase-client.ts` 中的 `browserFetch` 函数会在 `typeof window !== 'undefined'` 时自动把 Supabase URL 替换为 `/api/supabase`（经 next.config.js rewrite 转发到 Vercel 服务端 → Supabase）
3. **不要删除 `next.config.js` 中的 `/api/supabase/:path*` rewrite**
4. **不要删除 `supabase-client.ts` 中的 `global: { fetch: browserFetch }`**
5. **Vercel 构建时不能有静态页面在构建期调用 Supabase**：SSR/SSG 用 `NEXT_PUBLIC_SUPABASE_URL`（真实 URL），Vercel 构建机在境外可直连，只有浏览器端走代理
6. **本地 `npm run dev` 仍需 VPN**（本地服务器也连不上 supabase.co）
7. **Git 操作走 HTTPS + 代理**：`git -c http.proxy=http://127.0.0.1:1082 push`
