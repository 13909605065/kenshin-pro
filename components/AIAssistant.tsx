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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-20 right-4 w-10 h-10 rounded-full bg-[#d92525] shadow-lg z-40 flex items-center justify-center text-lg transition-transform duration-200 hover:scale-110 active:scale-95 ${
          open ? "scale-0" : "scale-100"
        }`}
        aria-label="AI 训练助手"
      >
        🦋
      </button>

      {/* Chat popup */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-40 w-[320px] rounded-2xl shadow-2xl border border-[#333] overflow-hidden"
          style={{
            height: "400px",
            animation: "aiPopupIn 300ms ease-out",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-[#1e1e1e] px-4 py-3 border-b border-[#222]">
            <span className="text-sm font-bold text-white">🦋 AI 训练助手</span>
            <button
              onClick={() => setOpen(false)}
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
                  <p className="text-xs text-gray-500 mb-2">常见问题，点击快速提问：</p>
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
