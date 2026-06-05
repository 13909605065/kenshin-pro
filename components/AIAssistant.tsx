"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";

// 10 preset Q&A pairs — v1 local knowledge base
const QA_PRESETS: { q: string; a: string }[] = [
  {
    q: "这个动作怎么做？",
    a: "每个训练动作在生成方案中都有详细的执行说明。\n\n你可以查看方案中每个动作的「执行要点」部分，包含：起始姿势、动作轨迹、呼吸节奏、常见错误。\n\n如果是自重动作（如深蹲、弓步），建议先在镜子前练习动作模式；如果是负重动作，从轻重量开始确保技术正确。",
  },
  {
    q: "适合新手的负荷是多少？",
    a: "新手训练负荷建议：\n\n- 自重动作优先。先掌握动作模式，再进行负重训练\n- 首次负重建议从 50-60% 1RM 开始（约等于你能标准完成 15-20 次的重量）\n- 前 2-4 周以 2-3 组 × 12-15 次为主，重点打磨技术\n- 渐进原则：每周加量不超过 5-10%\n- 如有不适立即降低重量或停止",
  },
  {
    q: "训练后怎么拉伸？",
    a: "训练后拉伸（冷身阶段）建议：\n\n1. 先做 3-5 分钟低强度活动（慢跑/步行）让心率逐渐下降\n2. 静态拉伸：每个肌群保持 20-30 秒，不要弹震\n3. 重点拉伸当日主要训练肌群：\n   - 下肢训练后：腘绳肌、股四头肌、臀大肌、髋屈肌、小腿\n   - 上肢训练后：胸大肌、背阔肌、三角肌、肱三头肌\n4. 泡沫轴放松：每肌群 30-60 秒，缓慢滚动\n5. 深呼吸 2-3 分钟帮助神经系统恢复",
  },
  {
    q: "一周训练几次合适？",
    a: "训练频率取决于你的训练年龄和赛季阶段：\n\n- 初学者（<2 年）：每周 2-3 次，每次间隔至少 48 小时\n- 中级（2-7 年）：每周 3-4 次\n- 高级（≥8 年）：每周 4-6 次，可以根据周期化安排\n\n赛季期建议保持每周 1-2 次力量维持训练。恢复周（每 4-6 周一次）建议减量 40-60%。",
  },
  {
    q: "训练前吃什么？",
    a: "训练前 2-3 小时：\n- 碳水 1-2g/kg（如 70kg = 一碗米饭+一根香蕉）\n- 蛋白 20-30g（如 100g 鸡胸肉或一勺蛋白粉）\n- 低脂肪、低纤维，避免肠胃不适\n\n训练前 30-60 分钟（如需快速补充）：\n- 一根香蕉 / 一片全麦面包 / 运动饮料 200ml\n\n训练前 1 小时内避免大量脂肪和高纤维食物。",
  },
  {
    q: "膝盖疼还能训练吗？",
    a: "膝盖疼痛时需要谨慎：\n\n急性疼痛（突然发生、肿胀、活动受限）：立即停止训练，遵循 RICE 原则（休息、冰敷、加压、抬高），建议就医评估。\n\n慢性不适（长期轻微不适、无肿胀）：\n- 避免深蹲、弓步、跳箱等高冲击动作\n- 可做：臀推、北欧弯举（等长）、腿举（轻量）、上肢训练\n- 加强臀中肌和股四头肌内侧头训练\n- 如训练中疼痛加剧立即停止",
  },
  {
    q: "怎么提高爆发力？",
    a: "提高爆发力的训练方法：\n\n1. 奥举及变式：高翻、抓举、六角杠跳（30-60% 1RM 弹道式，或 80-90% 1RM 奥举式）\n2. 增强式训练：跳箱、深度跳、药球抛掷、跨栏跳\n3. 速度训练：10-30m 冲刺、阻力橇、坡道冲刺\n4. 训练安排：爆发力训练放在训练课开头（神经系统最清醒时）\n5. 间歇要充分：爆发力训练间歇 3-5 分钟，确保每跳质量\n\n注意：<18 岁禁止高级增强式训练（深度跳等），训练年龄 <1 年仅做入门级。",
  },
  {
    q: "怎么减脂不掉肌肉？",
    a: "减脂保肌的关键策略：\n\n1. 保持力量训练：不要只做有氧，每周至少 2-3 次力量训练\n2. 蛋白摄入要够：1.8-2.2g/kg/天，分散到每餐 25-40g\n3. 热量缺口适中：每日赤字 300-500 大卡，不要过度节食\n4. 有氧放在力量训练之后，或分开时段进行\n5. 保证睡眠：7-9 小时，睡眠不足会加速肌肉流失\n6. 每周体重下降不超过 0.5-1% 体重",
  },
  {
    q: "经常抽筋怎么办？",
    a: "运动抽筋的预防和应对：\n\n预防：\n- 训练前充分热身（RAMP 系统约 15-20 分钟）\n- 补充电解质：钠、钾、镁，尤其是大量出汗时\n- 补水要充足：训练日额外 800-1200ml，比赛日更多\n- 避免在极度疲劳状态下继续高强度训练\n\n抽筋时：\n- 立即停止运动，轻轻拉伸痉挛肌群\n- 补充含电解质的饮料\n- 按摩放松痉挛区域\n\n如频繁抽筋建议检查：电解质水平、训练负荷是否过高、是否存在营养缺乏。",
  },
  {
    q: "青少年训练要注意什么？",
    a: "青少年（<18 岁）训练注意事项：\n\n1. LTAD 长期发展模型优先：FUNdamentals 阶段培养运动素养\n2. 体重复合动作优先，避免 >85% 1RM 大重量\n3. PHV 期（男 12-16 / 女 10-14）：单侧力量 + 稳定性 + 落地力学优先\n4. 禁止高级增强式训练（深度跳、负重跳）\n5. 训练时长建议 45-75 分钟\n6. 趣味性很重要：用游戏化方式设计训练\n7. 成年监督必不可少\n8. 注重多项目运动发展，避免早期专项化",
  },
  {
    q: "球员上场时间不足怎么补负荷",
    a: "📊 补负荷规则（体能教练核心职责）：\n\n如果球员上场<45分钟，下次训练需要额外跑动：\n• 0分钟（未出场）→ 补同位置场均跑量60-70%。中场未出场需补约4200-4900m\n• 1-20分钟 → 补40-50%，增加高强跑比例\n• 21-45分钟 → 补20-30%，加变速跑\n• >45分钟 → 正常训练\n\n实施方法：在训练主体后、冷身前补。优先用SSG（4v4/5v5小场地比赛），无SSG则用间歇跑（15s跑/15s走×10-15组）。补完后必须冷身。",
  },
  {
    q: "赛前一周怎么安排训练",
    a: "📅 比赛周微周期模型（MD=比赛日）：\n\n• MD-3：战术演练+速度耐力/爆发力，中高强度，75-90min\n• MD-2：定位球+小组配合，中强度，60-75min\n• MD-1：赛前激活+战术确认，低强度，45-60min（避免北欧弯举）\n• MD：比赛\n• MD+1：恢复再生，极低强度，30-45min\n• MD+2：个人技术+弱链纠正，低强度，45-60min\n\n一周双赛时训练量降至最低有效剂量。赛前2天禁止大重量下肢训练（延迟性肌肉酸痛影响比赛）。",
  },
  {
    q: "怎么监控训练负荷",
    a: "📊 训练负荷监控方法：\n\n1. sRPE法（最实用）：训练后30min问球员「今天训练有多累？」（1-10分）× 训练时长(min) = 训练负荷\n2. ACWR（急慢性负荷比）：最近7天负荷 ÷ 最近28天平均负荷。安全区间：0.8-1.3。>1.5→受伤风险显著升高\n3. 晨脉监测：每天起床前测心率，连续升高>5bpm→可能过度训练\n4. GPS数据（如有）：总跑动距离、高强跑距离、冲刺次数、加速减速次数\n\n每周记录每个球员的负荷数据，ACWR超出范围的及时调整训练量。",
  },
  {
    q: "体能房20个人怎么分组",
    a: "🏋️ 团体训练分组规则：\n\n按可用器材数量自动分组：\n• 1-5人 → 自由训练，不分组，3-4站\n• 6-12人 → 2-3组轮转，3-4站，每站8-10min\n• 13-20人 → 3-4组轮转，4-5站，每站8-10min\n• 20-30人 → 4-6组轮转，5-6站，每站7-10min\n\n关键：每组人数≤该站可用器材数。轮转过渡时间=分组数×1.5min。总时长=热身+站数×每站时长+过渡+冷身。\n\n例：20人，4个杠铃→分5组×4人，设5个站（深蹲/卧推/RDL/划船/核心），每站10min，过渡7.5min，热身12min+冷身8min=总约78min。",
  },
  {
    q: "比赛后怎么恢复",
    a: "🔄 赛后恢复方案：\n\n当天（赛后即刻）：\n• 冷身慢跑5-10min + 静态拉伸\n• 30min内补充快碳1.0-1.5g/kg + 蛋白20-30g\n• 冰浴/冷水浸泡10-15min（减轻肌肉酸痛）\n\n第1天（MD+1）：\n• 完全休息或极低强度活动（游泳/单车20-30min）\n• 泡沫轴放松+静态拉伸\n• 补水充分（赛后24h完全补水需一整天）\n\n第2天（MD+2）：\n• 轻量训练（<50%强度）\n• 重点关注弱链肌群+技术纠正\n• 如无不适可逐步恢复正常训练",
  },
];

function findBestMatch(input: string): { q: string; a: string } | null {
  const query = input.trim().toLowerCase();
  if (!query) return null;

  // Simple keyword matching
  const keywords: Record<string, string[]> = {
    "动作": ["动作", "怎么做", "执行"],
    "新手": ["新手", "负荷", "重量", "开始"],
    "拉伸": ["拉伸", "拉筋", "放松"],
    "频率": ["几次", "频率", "一周", "几次"],
    "训练前吃": ["训练前", "吃", "饮食", "餐"],
    "膝盖": ["膝盖", "膝", "疼", "痛", "伤"],
    "爆发力": ["爆发力", "爆发", "速度", "快"],
    "减脂": ["减脂", "减肥", "瘦", "肌肉", "脂肪"],
    "抽筋": ["抽筋", "痉挛", "抽"],
    "青少年": ["青少年", "小孩", "孩子", "年轻", "少年", "年龄"],
    "补负荷": ["补负荷", "上场", "分钟", "负荷", "没上", "出场", "怎么练"],
    "赛前": ["赛前", "比赛周", "赛前一周", "安排", "赛前怎么"],
    "监控": ["监控", "负荷监控", "怎么监控", "训练负荷", "疲劳"],
    "分组": ["分组", "多少人", "20人", "怎么分组", "团体"],
    "恢复": ["恢复", "赛后", "比赛后", "怎么恢复", "再生"],
  };

  for (const [presetKey, kws] of Object.entries(keywords)) {
    if (kws.some((kw) => query.includes(kw))) {
      return QA_PRESETS.find((p) => p.q.includes(presetKey)) || null;
    }
  }

  return null;
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Start at bottom-right
    setPos({ x: window.innerWidth - 60, y: window.innerHeight - 180 });
    // Global pointerup to reset drag state
    const resetDrag = () => { dragging.current = false; };
    window.addEventListener('pointerup', resetDrag);
    return () => window.removeEventListener('pointerup', resetDrag);
  }, []);

  const MOVE_THRESHOLD = 3; // pixels — ignore tiny moves as drag
  const hasMoved = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    hasMoved.current = false;
    dragging.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
      dragging.current = true;
      hasMoved.current = true;
    }
    if (!dragging.current) return;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 48, dragStart.current.px + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 48, dragStart.current.py + dy)),
    });
  };
  const onPointerUp = () => {
    // Reset after a short delay so onClick can check hasMoved
    setTimeout(() => { dragging.current = false; }, 50);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: text.trim() }]);
    setInput("");

    const match = findBestMatch(text);
    if (match) {
      setMessages((prev) => [...prev, { role: "assistant", text: match.a }]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "请描述具体问题，或尝试以下常见问题：",
        },
      ]);
    }
  };

  const handleQuickQuestion = (q: string) => {
    handleSend(q);
  };

  const showPresets = messages.length === 0;

  return (
    <>
      {/* Draggable floating button — just the butterfly, no background */}
      <button
        ref={btnRef}
        onClick={() => { if (!hasMoved.current) setOpen(!open); }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`fixed z-40 flex items-center justify-center text-2xl transition-transform duration-200 hover:scale-125 active:scale-95 select-none ${
          open ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{ left: pos.x, top: pos.y, width: 44, height: 44, touchAction: "none" }}
        aria-label="AI 训练助手"
      >
        🦋
      </button>

      {/* Chat popup — smart positioning, never off-screen */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-[320px] rounded-2xl shadow-2xl border border-[#333] overflow-hidden"
            style={{
              left: pos.x > window.innerWidth - 200 ? Math.max(0, pos.x - 300) : Math.max(0, pos.x - 20),
              top: pos.y > window.innerHeight - 200 ? Math.max(0, pos.y - 440) : Math.max(0, pos.y + 30),
              height: "400px",
              animation: "aiPopupIn 300ms ease-out",
            }}
          >
          {/* Header */}
          <div className="flex items-center justify-between bg-[#1e1e1e] px-4 py-3 border-b border-[#222]">
            <span className="text-sm font-bold text-white">🦋 AI 训练助手</span>
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col h-[calc(400px-49px)] bg-[#121212]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {showPresets && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 mb-2">常见问题，点击快速提问：</p>
                  {QA_PRESETS.slice(0, 5).map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickQuestion(item.q)}
                      className="block w-full text-left px-3 py-2 rounded-lg bg-[#1e1e1e] border border-[#222] text-xs text-gray-300 hover:border-[#d92525]/30 hover:text-white transition-all"
                    >
                      {item.q}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-xs whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[#d92525] text-white rounded-br-sm"
                        : "bg-[#1e1e1e] text-gray-200 rounded-bl-sm border border-[#222]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Show presets when AI says no match */}
              {messages.length > 0 &&
                messages[messages.length - 1]?.role === "assistant" &&
                messages[messages.length - 1]?.text === "请描述具体问题，或尝试以下常见问题：" && (
                  <div className="space-y-1.5 pt-1">
                    {QA_PRESETS.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickQuestion(item.q)}
                        className="block w-full text-left px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#222] text-xs text-gray-300 hover:border-[#d92525]/30 hover:text-white transition-all"
                      >
                        {item.q}
                      </button>
                    ))}
                  </div>
                )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#222] p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSend(input); }}
                  placeholder="输入问题..."
                  className="flex-1 bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-[#d92525] focus:outline-none"
                />
                <button
                  onClick={() => handleSend(input)}
                  className="w-9 h-9 rounded-lg bg-[#d92525] text-white flex items-center justify-center hover:bg-opacity-90 transition flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Scale-in animation */}
      <style jsx>{`
        @keyframes aiPopupIn {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(8px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </>
  );
}
