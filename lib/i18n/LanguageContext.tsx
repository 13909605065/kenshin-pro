"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "zh" | "en" | "ja";

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "zh",
  setLang: () => {},
  t: (k: string) => k,
});

export function useLang() {
  return useContext(LanguageContext);
}

// ========== Translations ==========

const translations: Record<Language, Record<string, string>> = {
  zh: {
    // App
    "app.title": "Kenshinpro",
    "app.subtitle": "足球训练助手",
    "app.footer": "训练方案仅供指导，执行前请咨询专业教练",
    "app.privacy": "隐私政策",
    "app.terms": "服务条款",
    "app.logout": "退出登录",
    "app.history": "历史记录",

    // Login
    "login.title": "Kenshinpro",
    "login.subtitle": "足球训练助手",
    "login.email": "使用邮箱登录",
    "login.email_title": "邮箱登录",
    "login.email_placeholder": "邮箱地址",
    "login.password_placeholder": "密码（至少 6 位）",
    "login.login_btn": "登录",
    "login.register_btn": "注册",
    "login.logging_in": "登录中...",
    "login.registering": "注册中...",
    "login.register_success": "注册成功！请检查邮箱确认链接。",
    "login.google": "使用 Google 登录",
    "login.apple": "使用 Apple 登录",
    "login.phone": "使用手机号登录",
    "login.wechat": "使用微信登录",
    "login.collapse": "收起",
    "login.connecting": "连接中...",
    "login.footer": "登录即表示您同意我们的",

    // Wizard Steps
    "wizard.step1": "球员信息",
    "wizard.step2": "训练目标",
    "wizard.step3": "赛季阶段",
    "wizard.step4": "伤病情况",
    "wizard.prev": "上一步",
    "wizard.next": "下一步",
    "wizard.generate": "生成训练方案",

    // Player Info
    "player.position": "场上位置 *",
    "player.age": "年龄 (岁) *",
    "player.height": "身高 (cm) *",
    "player.weight": "体重 (kg) *",
    "player.years": "训练年限 (年) *",
    "player.injury_history": "伤病史（选填）",
    "player.injury_placeholder": "描述过往伤病情况...",
    "player.title": "球员基础信息",

    // Positions
    "pos.goalkeeper": "守门员",
    "pos.defender": "后卫",
    "pos.midfielder": "中场",
    "pos.forward": "前锋",
    "pos.wingback": "翼卫",

    // Goals
    "goal.title": "选择训练目标",
    "goal.desc": "选择本次训练周期的核心目标能力",
    "goal.strength": "纯力量",
    "goal.strength_desc": "最大力量发展，侧重神经肌肉适应",
    "goal.power": "爆发力",
    "goal.power_desc": "力-速度曲线优化，弹跳与冲刺",
    "goal.speed": "速度",
    "goal.speed_desc": "最大速度与加速度发展",
    "goal.agility": "灵敏",
    "goal.agility_desc": "变向能力与反应速度",
    "goal.mas_endurance": "耐力",
    "goal.mas_desc": "最大有氧速度与反复冲刺能力",
    "goal.combat": "对抗能力",
    "goal.combat_desc": "身体对抗中的力量与稳定性",

    // Season Phases
    "phase.title": "选择赛季阶段",
    "phase.desc": "训练方案将根据赛季周期自动适配",
    "phase.preseason": "准备期",
    "phase.preseason_desc": "赛季前 6-8 周，建立体能基础与力量储备",
    "phase.competition": "赛季期",
    "phase.competition_desc": "比赛期间，维持竞技状态，管理疲劳",
    "phase.recovery": "赛后恢复",
    "phase.recovery_desc": "赛后 24-72 小时，主动恢复与再生",
    "phase.offseason": "休赛期",
    "phase.offseason_desc": "赛季结束，身心恢复，伤病修复",

    // Injury
    "injury.title": "伤病情况",
    "injury.desc": "选择需要康复的部位（无伤病可跳过）",
    "injury.history_extra": "伤病史补充（选填）",
    "injury.skip": "跳过此步，直接生成方案",

    // Results
    "results.title": "训练方案",
    "results.no_rehab": "无需康复",
    "results.warmup": "🔥 热身激活",
    "results.upper": "🦾 上肢训练",
    "results.lower": "🦿 下肢训练",
    "results.core": "💪 核心训练",
    "results.cooldown": "🧊 整理活动",
    "results.nutrition": "🥗 饮食搭配",
    "results.nutrition_pre": "训练前：",
    "results.nutrition_post": "训练后：",
    "results.nutrition_daily": "日常饮食：",
    "results.nutrition_hydration": "补水：",
    "results.nutrition_supp": "补剂建议：",
    "results.technique": "技术练习",
    "results.running": "跑动特征",
    "results.total_distance": "总跑动距离：",
    "results.copy_btn": "复制此模块",
    "results.copy_done": "已复制",
    "results.copy_all": "复制全部",
    "results.favorite": "收藏",
    "results.favorited": "已收藏",
    "results.new_plan": "新方案",
    "results.helpful": "有帮助吗？",
    "results.parse_error": "⚠️ 格式化失败，以下为原始内容：",
    "results.eval": "📋 评估标准：",

    // Table headers
    "table.exercise": "动作",
    "table.sets": "组数",
    "table.reps": "次数",
    "table.load": "负荷",
    "table.rest": "间歇(s)",

    // Generating
    "gen.module_1": "正在生成专项分位置训练...",
    "gen.module_2": "正在生成定向能力训练...",
    "gen.module_3": "正在生成技术练习与跑动方案...",
    "gen.module_4": "正在生成周期适配计划...",
    "gen.module_5": "正在生成伤病康复方案...",
    "gen.analyzing": "正在分析球员数据...",

    // Errors
    "error.no_key": "未配置 AI 接口。请在 .env.local 中设置 DOUBAO_API_KEY。",
    "error.auth": "请先登录后再使用训练生成功能。",
    "error.api": "AI 服务调用失败，请稍后重试。",
    "error.stream": "网络连接断开，已保留已生成的内容。请检查网络后重试。",
    "error.rate": "为确保服务质量，每分钟限制生成 1 次训练方案。请稍后再试。",
    "error.parse": "AI 返回内容格式异常，部分内容可能无法正常显示。",
    "error.retry": "重试",
    "error.view_partial": "查看已生成内容",
    "error.offline": "网络不佳，生成功能暂不可用。已保存的内容仍可查看。",

    // Validation
    "val.position": "请选择场上位置",
    "val.age": "请输入年龄",
    "val.age_range": "年龄范围 12-60 岁",
    "val.height": "请输入身高",
    "val.height_range": "身高范围 120-220cm",
    "val.weight": "请输入体重",
    "val.weight_range": "体重范围 30-150kg",
    "val.years": "请输入训练年限",
    "val.years_range": "训练年限范围 0-40 年",
    "val.goal": "请选择训练目标",
    "val.phase": "请选择赛季阶段",
    "val.form": "请填写所有必填项",
    "val.invalid": "无效的请求数据",

    // History
    "history.title": "历史记录",
    "history.empty": "暂无历史记录",
    "history.loading": "加载中...",
    "history.load": "加载此方案",
    "history.unknown_goal": "未知目标",

    // Intensity
    "intensity.low": "低",
    "intensity.medium": "中",
    "intensity.high": "高",
    "intensity.dist": "强度分布",

    // Coach cert/role/league
    "coach.title": "教练信息",
    "coach.cert_label": "教练证书等级 *",
    "coach.role_label": "执教身份 *",
    "coach.league_label": "执教联赛/梯队 *",
    "coach.cert_tooltip": "当前证书不可选",
    "coach.summary_label": "教练方案",
    "coach.summary_themes": "战术主题",

    // Tabs
    "tab.warmup": "热身",
    "tab.technique": "技术训练",
    "tab.physical": "体能训练",
    "tab.tactical": "战术要点",
    "tab.nutrition": "饮食与恢复",

    // Warmup
    "warmup.no_ball": "无球热身",
    "warmup.with_ball": "有球热身",
    "warmup.combined": "两者结合",
    "warmup.gk_note": "守门员仅展示无球热身内容",
    "warmup.none_no_ball": "暂无无球热身项目",
    "warmup.none_with_ball": "暂无有球热身项目",

    // Physical
    "physical.gk_note": "守门员仅展示无球训练内容",
    "physical.none": "暂无体能训练内容",

    // Technique
    "technique.none": "暂无技术训练内容",
    "technique.none_drills": "暂无技术练习",

    // Tactical
    "tactical.none": "暂无战术周期内容",
    "tactical.placeholder": "战术板功能将在下一版本上线",
    "tactical.placeholder_sub": "届时支持绘制点位、球员跑动路线、攻防站位排布",

    // Nutrition
    "nutrition.none": "暂无饮食与恢复内容",

    // Validation
    "val.coach_cert": "请选择教练证书等级",
    "val.coach_role": "请选择执教身份",
    "val.coach_league": "请选择执教联赛或梯队",

    // Empty states
    "table.empty": "暂无训练动作",
  },

  en: {
    "app.title": "Kenshinpro",
    "app.subtitle": "Football Training Assistant",
    "app.footer": "Training plans are for guidance only. Consult a professional coach before execution.",
    "app.privacy": "Privacy Policy",
    "app.terms": "Terms of Service",
    "app.logout": "Sign Out",
    "app.history": "History",

    "login.title": "Kenshinpro",
    "login.subtitle": "Football Training Assistant",
    "login.email": "Sign in with Email",
    "login.email_title": "Email Login",
    "login.email_placeholder": "Email address",
    "login.password_placeholder": "Password (min 6 characters)",
    "login.login_btn": "Sign In",
    "login.register_btn": "Register",
    "login.logging_in": "Signing in...",
    "login.registering": "Registering...",
    "login.register_success": "Registration successful! Please check your email.",
    "login.google": "Sign in with Google",
    "login.apple": "Sign in with Apple",
    "login.phone": "Sign in with Phone",
    "login.wechat": "Sign in with WeChat",
    "login.collapse": "Collapse",
    "login.connecting": "Connecting...",
    "login.footer": "By signing in, you agree to our",

    "wizard.step1": "Player Info",
    "wizard.step2": "Training Goal",
    "wizard.step3": "Season Phase",
    "wizard.step4": "Injury Status",
    "wizard.prev": "Previous",
    "wizard.next": "Next",
    "wizard.generate": "Generate Plan",

    "player.position": "Position *",
    "player.age": "Age (years) *",
    "player.height": "Height (cm) *",
    "player.weight": "Weight (kg) *",
    "player.years": "Training Years *",
    "player.injury_history": "Injury History (optional)",
    "player.injury_placeholder": "Describe past injuries...",
    "player.title": "Player Information",

    "pos.goalkeeper": "Goalkeeper",
    "pos.defender": "Defender",
    "pos.midfielder": "Midfielder",
    "pos.forward": "Forward",
    "pos.wingback": "Wing-Back",

    "goal.title": "Training Goal",
    "goal.desc": "Select your primary training objective",
    "goal.strength": "Strength",
    "goal.strength_desc": "Maximal strength development, neuromuscular adaptation",
    "goal.power": "Power",
    "goal.power_desc": "Force-velocity optimization, jumping & sprinting",
    "goal.speed": "Speed",
    "goal.speed_desc": "Max speed & acceleration development",
    "goal.agility": "Agility",
    "goal.agility_desc": "Change of direction & reaction speed",
    "goal.mas_endurance": "Endurance",
    "goal.mas_desc": "Max aerobic speed & repeated sprint ability",
    "goal.combat": "Physicality",
    "goal.combat_desc": "Strength & stability in duels",

    "phase.title": "Season Phase",
    "phase.desc": "Training will adapt to your season cycle",
    "phase.preseason": "Pre-Season",
    "phase.preseason_desc": "6-8 weeks before season, building fitness base",
    "phase.competition": "In-Season",
    "phase.competition_desc": "Maintain performance, manage fatigue",
    "phase.recovery": "Post-Match Recovery",
    "phase.recovery_desc": "24-72h after match, active recovery",
    "phase.offseason": "Off-Season",
    "phase.offseason_desc": "Physical & mental recovery, injury repair",

    "injury.title": "Injury Status",
    "injury.desc": "Select injured areas (skip if none)",
    "injury.history_extra": "Additional Injury Details (optional)",
    "injury.skip": "Skip this step",

    "results.title": "Training Plan",
    "results.no_rehab": "No rehab needed",
    "results.warmup": "🔥 Warm-Up",
    "results.upper": "🦾 Upper Body",
    "results.lower": "🦿 Lower Body",
    "results.core": "💪 Core",
    "results.cooldown": "🧊 Cool Down",
    "results.nutrition": "🥗 Nutrition",
    "results.nutrition_pre": "Pre-Training: ",
    "results.nutrition_post": "Post-Training: ",
    "results.nutrition_daily": "Daily Plan: ",
    "results.nutrition_hydration": "Hydration: ",
    "results.nutrition_supp": "Supplements: ",
    "results.technique": "Technical Drills",
    "results.running": "Running Profile",
    "results.total_distance": "Total Distance: ",
    "results.copy_btn": "Copy module",
    "results.copy_done": "Copied",
    "results.copy_all": "Copy All",
    "results.favorite": "Favorite",
    "results.favorited": "Favorited",
    "results.new_plan": "New Plan",
    "results.helpful": "Helpful?",
    "results.parse_error": "⚠️ Parse error, raw content below:",
    "results.eval": "📋 Evaluation: ",

    "table.exercise": "Exercise",
    "table.sets": "Sets",
    "table.reps": "Reps",
    "table.load": "Load",
    "table.rest": "Rest(s)",

    "gen.module_1": "Generating position-specific training...",
    "gen.module_2": "Generating ability-focused training...",
    "gen.module_3": "Generating technical & running plan...",
    "gen.module_4": "Generating phase-adapted plan...",
    "gen.module_5": "Generating injury recovery plan...",
    "gen.analyzing": "Analyzing player data...",

    "error.no_key": "AI API not configured. Set DOUBAO_API_KEY in .env.local.",
    "error.auth": "Please sign in first.",
    "error.api": "AI service error. Please try again later.",
    "error.stream": "Connection lost. Generated content has been preserved.",
    "error.rate": "Rate limit: 1 plan per minute. Please wait.",
    "error.parse": "AI output format error. Some content may not display correctly.",
    "error.retry": "Retry",
    "error.view_partial": "View saved content",
    "error.offline": "Poor network. Generation unavailable. Saved content can still be viewed.",

    "val.position": "Please select position",
    "val.age": "Please enter age",
    "val.age_range": "Age must be 12-60",
    "val.height": "Please enter height",
    "val.height_range": "Height must be 120-220cm",
    "val.weight": "Please enter weight",
    "val.weight_range": "Weight must be 30-150kg",
    "val.years": "Please enter training years",
    "val.years_range": "Years must be 0-40",
    "val.goal": "Please select goal",
    "val.phase": "Please select phase",
    "val.form": "Please fill all required fields",
    "val.invalid": "Invalid request data",

    "history.title": "History",
    "history.empty": "No history yet",
    "history.loading": "Loading...",
    "history.load": "Load this plan",
    "history.unknown_goal": "Unknown",

    "intensity.low": "Low",
    "intensity.medium": "Med",
    "intensity.high": "High",
    "intensity.dist": "Intensity Distribution",

    // Coach cert/role/league
    "coach.title": "Coach Info",
    "coach.cert_label": "Coaching Certificate *",
    "coach.role_label": "Coaching Role *",
    "coach.league_label": "League / Team Level *",
    "coach.cert_tooltip": "Not available with current certificate",
    "coach.summary_label": "Coach Plan",
    "coach.summary_themes": "Tactical Themes",

    // Tabs
    "tab.warmup": "Warm-up",
    "tab.technique": "Technique",
    "tab.physical": "Physical",
    "tab.tactical": "Tactical",
    "tab.nutrition": "Nutrition & Recovery",

    // Warmup
    "warmup.no_ball": "Off-ball Warm-up",
    "warmup.with_ball": "Ball Warm-up",
    "warmup.combined": "Combined",
    "warmup.gk_note": "Goalkeepers: off-ball warm-up only",
    "warmup.none_no_ball": "No off-ball warm-up items",
    "warmup.none_with_ball": "No ball warm-up items",

    // Physical
    "physical.gk_note": "Goalkeepers: off-ball training only",
    "physical.none": "No physical training content",

    // Technique
    "technique.none": "No technique training content",
    "technique.none_drills": "No technical drills",

    // Tactical
    "tactical.none": "No tactical periodization content",
    "tactical.placeholder": "Tactical board coming in next update",
    "tactical.placeholder_sub": "Supporting field markers, player routes, formation layouts",

    // Nutrition
    "nutrition.none": "No nutrition & recovery content",

    // Validation
    "val.coach_cert": "Please select coaching certificate",
    "val.coach_role": "Please select coaching role",
    "val.coach_league": "Please select league or team level",

    // Empty states
    "table.empty": "No exercises",
  },

  ja: {
    "app.title": "Kenshinpro",
    "app.subtitle": "サッカートレーニングアシスタント",
    "app.footer": "トレーニングプランは参考用です。実行前に専門コーチに相談してください。",
    "app.privacy": "プライバシーポリシー",
    "app.terms": "利用規約",
    "app.logout": "ログアウト",
    "app.history": "履歴",

    "login.title": "Kenshinpro",
    "login.subtitle": "サッカートレーニングアシスタント",
    "login.email": "メールでログイン",
    "login.email_title": "メールログイン",
    "login.email_placeholder": "メールアドレス",
    "login.password_placeholder": "パスワード（6文字以上）",
    "login.login_btn": "ログイン",
    "login.register_btn": "登録",
    "login.logging_in": "ログイン中...",
    "login.registering": "登録中...",
    "login.register_success": "登録完了！メールをご確認ください。",
    "login.google": "Google でログイン",
    "login.apple": "Apple でログイン",
    "login.phone": "電話番号でログイン",
    "login.wechat": "WeChat でログイン",
    "login.collapse": "閉じる",
    "login.connecting": "接続中...",
    "login.footer": "ログインすると、以下に同意したことになります：",

    "wizard.step1": "選手情報",
    "wizard.step2": "トレーニング目標",
    "wizard.step3": "シーズン期間",
    "wizard.step4": "怪我の状態",
    "wizard.prev": "戻る",
    "wizard.next": "次へ",
    "wizard.generate": "プランを生成",

    "player.position": "ポジション *",
    "player.age": "年齢 (歳) *",
    "player.height": "身長 (cm) *",
    "player.weight": "体重 (kg) *",
    "player.years": "トレーニング年数 *",
    "player.injury_history": "怪我の履歴（任意）",
    "player.injury_placeholder": "過去の怪我について...",
    "player.title": "選手基本情報",

    "pos.goalkeeper": "ゴールキーパー",
    "pos.defender": "ディフェンダー",
    "pos.midfielder": "ミッドフィルダー",
    "pos.forward": "フォワード",
    "pos.wingback": "ウィングバック",

    "goal.title": "トレーニング目標",
    "goal.desc": "主なトレーニング目標を選択",
    "goal.strength": "純粋な筋力",
    "goal.strength_desc": "最大筋力の向上、神経筋の適応",
    "goal.power": "爆発力",
    "goal.power_desc": "力-速度曲線の最適化、ジャンプとスプリント",
    "goal.speed": "スピード",
    "goal.speed_desc": "最大速度と加速の向上",
    "goal.agility": "敏捷性",
    "goal.agility_desc": "方向転換と反応速度",
    "goal.mas_endurance": "持久力",
    "goal.mas_desc": "最大有酸素速度と反復スプリント能力",
    "goal.combat": "対抗力",
    "goal.combat_desc": "デュエルにおける強さと安定性",

    "phase.title": "シーズン期間",
    "phase.desc": "シーズンサイクルに応じて適応",
    "phase.preseason": "準備期",
    "phase.preseason_desc": "シーズン前6-8週間、フィットネス基盤の構築",
    "phase.competition": "シーズン中",
    "phase.competition_desc": "パフォーマンス維持、疲労管理",
    "phase.recovery": "試合後回復",
    "phase.recovery_desc": "試合後24-72時間、アクティブリカバリー",
    "phase.offseason": "オフシーズン",
    "phase.offseason_desc": "心身の回復、怪我の修復",

    "injury.title": "怪我の状態",
    "injury.desc": "怪我のある部位を選択（なければスキップ）",
    "injury.history_extra": "怪我の詳細（任意）",
    "injury.skip": "このステップをスキップ",

    "results.title": "トレーニングプラン",
    "results.no_rehab": "リハビリ不要",
    "results.warmup": "🔥 ウォームアップ",
    "results.upper": "🦾 上半身",
    "results.lower": "🦿 下半身",
    "results.core": "💪 コア",
    "results.cooldown": "🧊 クールダウン",
    "results.nutrition": "🥗 栄養",
    "results.nutrition_pre": "トレーニング前：",
    "results.nutrition_post": "トレーニング後：",
    "results.nutrition_daily": "日常の食事：",
    "results.nutrition_hydration": "水分補給：",
    "results.nutrition_supp": "サプリメント：",
    "results.technique": "技術練習",
    "results.running": "ランニングプロファイル",
    "results.total_distance": "総走行距離：",
    "results.copy_btn": "モジュールをコピー",
    "results.copy_done": "コピー済み",
    "results.copy_all": "すべてコピー",
    "results.favorite": "お気に入り",
    "results.favorited": "お気に入り済み",
    "results.new_plan": "新プラン",
    "results.helpful": "役に立ちましたか？",
    "results.parse_error": "⚠️ パースエラー、以下は生データ：",
    "results.eval": "📋 評価基準：",

    "table.exercise": "種目",
    "table.sets": "セット",
    "table.reps": "回数",
    "table.load": "負荷",
    "table.rest": "休憩(秒)",

    "gen.module_1": "ポジション別トレーニングを生成中...",
    "gen.module_2": "能力別トレーニングを生成中...",
    "gen.module_3": "技術・ランニングプランを生成中...",
    "gen.module_4": "期間適応プランを生成中...",
    "gen.module_5": "怪我回復プランを生成中...",
    "gen.analyzing": "選手データを分析中...",

    "error.no_key": "AI APIが設定されていません。.env.local に DOUBAO_API_KEY を設定してください。",
    "error.auth": "先にログインしてください。",
    "error.api": "AIサービスエラー。後でもう一度お試しください。",
    "error.stream": "接続が切断されました。生成済みの内容は保持されています。",
    "error.rate": "レート制限：1分間に1プランまで。お待ちください。",
    "error.parse": "AI出力のフォーマットエラー。一部の内容が正しく表示されない場合があります。",
    "error.retry": "リトライ",
    "error.view_partial": "保存された内容を表示",
    "error.offline": "ネットワーク不良。生成機能は利用不可。保存された内容は表示できます。",

    "val.position": "ポジションを選択してください",
    "val.age": "年齢を入力してください",
    "val.age_range": "年齢は12-60歳",
    "val.height": "身長を入力してください",
    "val.height_range": "身長は120-220cm",
    "val.weight": "体重を入力してください",
    "val.weight_range": "体重は30-150kg",
    "val.years": "トレーニング年数を入力してください",
    "val.years_range": "年数は0-40年",
    "val.goal": "目標を選択してください",
    "val.phase": "期間を選択してください",
    "val.form": "すべての必須項目を入力してください",
    "val.invalid": "無効なリクエストデータ",

    "history.title": "履歴",
    "history.empty": "まだ履歴がありません",
    "history.loading": "読み込み中...",
    "history.load": "このプランを読み込む",
    "history.unknown_goal": "不明",

    "intensity.low": "低",
    "intensity.medium": "中",
    "intensity.high": "高",
    "intensity.dist": "強度分布",

    // Coach cert/role/league
    "coach.title": "コーチ情報",
    "coach.cert_label": "コーチ資格 *",
    "coach.role_label": "指導カテゴリ *",
    "coach.league_label": "リーグ / チームレベル *",
    "coach.cert_tooltip": "現在の資格では選択不可",
    "coach.summary_label": "コーチプラン",
    "coach.summary_themes": "戦術テーマ",

    // Tabs
    "tab.warmup": "ウォームアップ",
    "tab.technique": "技術",
    "tab.physical": "フィジカル",
    "tab.tactical": "戦術",
    "tab.nutrition": "栄養・回復",

    // Warmup
    "warmup.no_ball": "ボールなし",
    "warmup.with_ball": "ボールあり",
    "warmup.combined": "両方",
    "warmup.gk_note": "GK：ボールなしのみ表示",
    "warmup.none_no_ball": "ボールなしメニューなし",
    "warmup.none_with_ball": "ボールありメニューなし",

    // Physical
    "physical.gk_note": "GK：ボールなしトレーニングのみ",
    "physical.none": "フィジカル内容なし",

    // Technique
    "technique.none": "技術内容なし",
    "technique.none_drills": "技術ドリルなし",

    // Tactical
    "tactical.none": "戦術内容なし",
    "tactical.placeholder": "戦術ボードは次期バージョンで実装予定",
    "tactical.placeholder_sub": "マーカー配置、選手移動ルート、フォーメーション対応予定",

    // Nutrition
    "nutrition.none": "栄養・回復内容なし",

    // Validation
    "val.coach_cert": "コーチ資格を選択してください",
    "val.coach_role": "指導カテゴリを選択してください",
    "val.coach_league": "リーグまたはチームレベルを選択してください",

    // Empty states
    "table.empty": "種目なし",
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("zh");

  useEffect(() => {
    const saved = localStorage.getItem("kenshin_lang") as Language;
    if (saved && ["zh", "en", "ja"].includes(saved)) {
      setLangState(saved);
    }
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("kenshin_lang", l);
  };

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations.zh[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
