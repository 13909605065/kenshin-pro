"use client";

import { useState } from "react";

export function ExerciseIcon({ name, imageUrl }: { name: string; imageUrl?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imageUrl && !imgFailed) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#222]"
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }

  const lower = name.toLowerCase();
  let emoji = "🏋️";
  if (/squat|深蹲|スクワット|leg|腿|脚|下肢|hamstring|quad|calf|deadlift|硬拉|lunge/.test(lower)) emoji = "🦿";
  else if (/bench|卧推|press|chest|胸|tricep|bicep|curl|arm|腕|肩|shoulder|upper/.test(lower)) emoji = "🦾";
  else if (/plank|core|腹|ab|crunch|sit.up|背|back|row|划船/.test(lower)) emoji = "💪";
  else if (/run|跑|sprint|冲刺|jog|cardio|有氧|aerobic/.test(lower)) emoji = "🏃";
  else if (/jump|跳|box|plyo|敏捷|agility|ladder/.test(lower)) emoji = "⚡";
  else if (/stretch|拉伸|flex|mobility|yoga|泡沫/.test(lower)) emoji = "🧘";
  else if (/balance|稳定|stability|single/.test(lower)) emoji = "🎯";

  return (
    <div className="w-10 h-10 rounded-lg bg-[#222] flex items-center justify-center flex-shrink-0 text-lg">
      {emoji}
    </div>
  );
}
