"use client";

import { useState } from "react";

const STEPS = [
  {
    title: "选择你的身份",
    desc: "点击顶部身份切换按钮，选择教练、球员或健身模式。不同身份将获得完全不同的训练方案。",
    highlight: "role-switch",
  },
  {
    title: "填写训练需求",
    desc: "根据你的身份填写训练目标、赛季阶段、伤病情况等信息。信息越详细，AI 生成的方案越精准。",
    highlight: "form-area",
  },
  {
    title: "生成专属方案",
    desc: "点击底部红色的「生成训练方案」按钮，AI 将根据你的需求实时生成个性化训练计划。",
    highlight: "generate-btn",
  },
];

interface OnboardingGuideProps {
  onComplete: () => void;
}

export function OnboardingGuide({ onComplete }: OnboardingGuideProps) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem("kenshin_onboarding_done", "1");
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("kenshin_onboarding_done", "1");
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 w-full max-w-sm space-y-5">
        {/* Step indicators */}
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "bg-[#992828] scale-125"
                  : i < step
                    ? "bg-[#992828]/50"
                    : "bg-[#444]"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center space-y-2">
          <h2 className="text-white font-bold text-lg">
            {STEPS[step].title}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            {STEPS[step].desc}
          </p>
        </div>

        {/* Step counter */}
        <p className="text-center text-[10px] text-gray-500">
          {step + 1} / {STEPS.length}
        </p>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleNext}
            className="w-full py-2.5 bg-[#992828] text-white font-bold rounded-lg text-sm hover:bg-opacity-90 transition"
          >
            {step < STEPS.length - 1 ? "下一步" : "开始使用"}
          </button>
          <button
            onClick={handleSkip}
            className="w-full py-2 text-gray-400 text-xs hover:text-white transition"
          >
            跳过引导
          </button>
        </div>
      </div>
    </div>
  );
}
