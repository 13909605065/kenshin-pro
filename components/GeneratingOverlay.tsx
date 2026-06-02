"use client";

const EVENT_LABELS: Record<string, string> = {
  module_1: "正在生成专项分位置训练...",
  module_2: "正在生成定向能力训练...",
  module_3: "正在生成技术练习与跑动方案...",
  module_4: "正在生成周期适配计划...",
  module_5: "正在生成伤病康复方案...",
};

const COACH_EVENT_LABELS: Record<string, string> = {
  module_1: "正在设计训练课结构...",
  module_2: "正在编排战术主题内容...",
  module_3: "正在设定组织方式与指导要点...",
  module_4: "正在制定进退阶方案...",
  module_5: "正在整理训练课完整方案...",
};

interface Props {
  currentModule: string;
  isCoach?: boolean;
}

export function GeneratingOverlay({ currentModule, isCoach }: Props) {
  const labels = isCoach ? COACH_EVENT_LABELS : EVENT_LABELS;
  const label = labels[currentModule] || (isCoach ? "正在设计训练课方案..." : "正在分析球员数据...");

  return (
    <div className="glass-card p-12 flex flex-col items-center justify-center space-y-6">
      {/* Pulse Logo */}
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-neon-pink animate-pulse" />
        <div className="absolute inset-0 w-16 h-16 rounded-full bg-neon-pink animate-ping opacity-30" />
      </div>

      {/* Status text */}
      <p className="text-gray-300 text-lg font-medium">{label}</p>

      <div className="flex gap-1">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-neon-pink rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
