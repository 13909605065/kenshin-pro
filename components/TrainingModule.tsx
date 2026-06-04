"use client";

import { useState, useEffect } from "react";
import {
  TrainingModule as ModuleType,
  PositionTraining,
  AbilityTraining,
  TechniqueRunning,
  PhasePlan,
  InjuryRecovery,
  ParseError,
} from "@/lib/types";
import { ChevronDown, Copy, Check, Eye } from "lucide-react";
import { ImageModal } from "./ImageModal";
import { FieldDiagram } from "./FieldDiagram";

interface Props {
  module: ModuleType;
  defaultExpanded?: boolean;
}

export function TrainingModule({ module, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (defaultExpanded) {
      setExpanded(true);
    }
  }, [defaultExpanded]);

  const copyContent = () => {
    const text = formatModuleForCopy(module);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              module.status === "skipped" ? "bg-gray-500" : "bg-[#d92525]"
            }`}
          />
          <h3 className="font-bold text-white">{module.title}</h3>
          {module.status === "skipped" && (
            <span className="text-xs text-gray-400">无需康复</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyContent();
            }}
            className="p-2 text-gray-400 hover:text-white transition"
            title="复制此模块"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#d92525]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Content */}
      <div className={`accordion-content ${expanded ? "expanded" : "collapsed"}`}>
        <div className="px-5 pb-5 space-y-4">
          {module.module === "position_training" && (
            <PositionTrainingContent data={module as PositionTraining} />
          )}
          {module.module === "ability_training" && (
            <AbilityTrainingContent data={module as AbilityTraining} />
          )}
          {module.module === "technique_running" && (
            <TechniqueRunningContent data={module as TechniqueRunning} />
          )}
          {module.module === "phase_plan" && (
            <PhasePlanContent data={module as PhasePlan} />
          )}
          {module.module === "injury_recovery" && module.status === "complete" && (
            <InjuryRecoveryContent data={module as InjuryRecovery} />
          )}
          {module.module === "parse_error" && (
            <ParseErrorContent data={module as ParseError} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
// Smart exercise icon: shows image if available, falls back to category icon
function ExerciseIcon({ name, imageUrl }: { name: string; imageUrl?: string }) {
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

  // Fallback: derive icon from exercise name
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

function ExerciseTable({ exercises }: { exercises: any[] }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222]">
              <th className="text-left py-2 text-gray-400 font-medium">动作</th>
              <th className="text-center py-2 text-gray-400 font-medium">组数</th>
              <th className="text-center py-2 text-gray-400 font-medium">次数</th>
              <th className="text-center py-2 text-gray-400 font-medium">负荷</th>
              <th className="text-center py-2 text-gray-400 font-medium">间歇(s)</th>
              <th className="text-center py-2 text-gray-400 font-medium">RPE</th>
              <th className="text-center py-2 text-gray-400 font-medium">心率区间</th>
              <th className="text-center py-2 text-gray-400 font-medium w-24"></th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex: any, i: number) => {
              const hasImage = !!(ex.image_url || ex.side_view_url);
              const imgUrl = ex.image_url || ex.side_view_url;
              return (
                <tr key={i} className="border-b border-[#1e1e1e]/50">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <ExerciseIcon name={ex.name} imageUrl={ex.image_url} />
                      <span className="text-white">{ex.name}</span>
                    </div>
                  </td>
                  <td className="py-2 text-center text-gray-300">{ex.sets}</td>
                  <td className="py-2 text-center text-gray-300">{ex.reps}</td>
                  <td className="py-2 text-center text-gray-300">{ex.load}</td>
                  <td className="py-2 text-center text-gray-300">{ex.rest}</td>
                  <td className="py-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                      ex.rpe >= 8 ? "bg-red-500/20 text-red-400" :
                      ex.rpe >= 6 ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-green-500/20 text-green-400"
                    }`}>{ex.rpe || "-"}</span>
                  </td>
                  <td className="py-2 text-center text-gray-300 text-xs">{ex.heart_rate_zone || "-"}</td>
                  <td className="py-2 text-center">
                    {hasImage ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewUrl(imgUrl);
                          setPreviewName(ex.name);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium
                                   bg-[#1e1e1e] border border-[#222] text-gray-300
                                   hover:border-[#d92525] hover:text-[#d92525] transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        查看动作图
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Image preview modal */}
      <ImageModal
        open={!!previewUrl}
        imageUrl={previewUrl || ""}
        title={previewName}
        onClose={() => setPreviewUrl(null)}
      />
    </>
  );
}

function PositionTrainingContent({ data }: { data: PositionTraining }) {
  return (
    <div className="space-y-4">
      {data.warmup && data.warmup.length > 0 && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">🔥 热身激活</h4>
          <div className="space-y-2">
            {data.warmup.map((w, i) => (
              <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="font-medium text-white">{w.name}</span>
                  <span className="text-xs text-gray-400">{w.duration}秒</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{w.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.upper_limb.length > 0 && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">🦾 上肢训练</h4>
          <ExerciseTable exercises={data.upper_limb} />
        </div>
      )}
      {data.lower_limb.length > 0 && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">🦿 下肢训练</h4>
          <ExerciseTable exercises={data.lower_limb} />
        </div>
      )}
      {data.core.length > 0 && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">💪 核心训练</h4>
          <ExerciseTable exercises={data.core} />
        </div>
      )}
      {data.cooldown && data.cooldown.length > 0 && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">🧊 整理活动</h4>
          <div className="space-y-2">
            {data.cooldown.map((c, i) => (
              <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="font-medium text-white">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.duration}秒</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.nutrition && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">🥗 饮食搭配</h4>
          <div className="bg-[#1e1e1e]/50 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-[#d92525] text-xs font-bold">训练前：</span>
              <p className="text-sm text-gray-300 mt-1">{data.nutrition.pre_training}</p>
            </div>
            <div>
              <span className="text-[#d92525] text-xs font-bold">训练后：</span>
              <p className="text-sm text-gray-300 mt-1">{data.nutrition.post_training}</p>
            </div>
            <div>
              <span className="text-[#d92525] text-xs font-bold">日常饮食：</span>
              <p className="text-sm text-gray-300 mt-1">{data.nutrition.daily_plan}</p>
            </div>
            <div>
              <span className="text-[#d92525] text-xs font-bold">补水：</span>
              <p className="text-sm text-gray-300 mt-1">{data.nutrition.hydration}</p>
            </div>
            <div>
              <span className="text-[#d92525] text-xs font-bold">补剂建议：</span>
              <p className="text-sm text-gray-300 mt-1">{data.nutrition.supplements}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AbilityTrainingContent({ data }: { data: AbilityTraining }) {
  return (
    <div className="space-y-3">
      {data.exercises.map((ex, i) => (
        <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">{ex.name}</span>
            <span className="text-xs text-gray-400">
              {ex.sets}组 × {ex.reps}次 @ {ex.load} · 间歇{ex.rest}s
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{ex.progression}</p>
        </div>
      ))}
    </div>
  );
}

function TechniqueRunningContent({ data }: { data: TechniqueRunning }) {
  const [drillPreview, setDrillPreview] = useState<{ url: string; name: string } | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[#d92525] text-sm font-bold mb-2">技术练习</h4>
        <div className="space-y-3">
          {data.drills.map((drill, i) => (
            <div key={i}>
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white">{drill.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {drill.image_url && (
                      <button
                        onClick={() => setDrillPreview({ url: drill.image_url!, name: drill.name })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium
                                   bg-[#1e1e1e] border border-[#222] text-gray-300
                                   hover:border-[#d92525] hover:text-[#d92525] transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        查看动作图
                      </button>
                    )}
                    <span className="text-xs text-gray-400">{drill.duration}分钟</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{drill.description}</p>

                {/* Purpose & Key Points */}
                {(drill.purpose || (drill.key_points && drill.key_points.length > 0)) && (
                  <div className="mt-3 pt-3 border-t border-[#222] space-y-2">
                    {drill.purpose && (
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-[#d92525] font-bold mt-0.5 whitespace-nowrap">🎯 目的</span>
                        <span className="text-xs text-gray-300">{drill.purpose}</span>
                      </div>
                    )}
                    {drill.key_points && drill.key_points.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#d92525] font-bold">⚡ 要点</span>
                        {drill.key_points.map((kp, j) => (
                          <div key={j} className="flex items-start gap-1.5">
                            <span className="text-[10px] text-[#d92525] font-bold mt-0.5">{j + 1}.</span>
                            <span className="text-xs text-gray-300">{kp}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Field Diagram */}
              {drill.diagram && <FieldDiagram diagram={drill.diagram} />}
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-[#d92525] text-sm font-bold mb-2">跑动特征</h4>
        <div className="bg-[#1e1e1e]/50 rounded-lg p-3">
          <p className="text-sm text-gray-300">
            总跑动距离：<span className="text-white">{data.running_profile.total_distance}</span>
          </p>
          <div className="flex gap-2 mt-2">
            {data.running_profile.intensity_zones.map((zone, i) => (
              <span key={i} className="px-2 py-1 bg-[#222] rounded text-xs text-gray-300">
                {zone}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Drill image preview modal */}
      <ImageModal
        open={!!drillPreview}
        imageUrl={drillPreview?.url || ""}
        title={drillPreview?.name || ""}
        onClose={() => setDrillPreview(null)}
      />
    </div>
  );
}

function PhasePlanContent({ data }: { data: PhasePlan }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-[#1e1e1e]/50 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-[#d92525]">{data.weekly_frequency}</div>
        <div className="text-xs text-gray-400 mt-1">次/周</div>
      </div>
      <div className="bg-[#1e1e1e]/50 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-[#d92525]">{data.session_duration}</div>
        <div className="text-xs text-gray-400 mt-1">分钟/次</div>
      </div>
      <div className="col-span-2 bg-[#1e1e1e]/50 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-2">强度分布</div>
        <div className="flex h-3 rounded-full overflow-hidden">
          <div
            className="bg-gray-500"
            style={{ width: `${data.intensity_distribution.low}%` }}
            title={`低强度 ${data.intensity_distribution.low}%`}
          />
          <div
            className="bg-[#d92525]/60"
            style={{ width: `${data.intensity_distribution.medium}%` }}
            title={`中强度 ${data.intensity_distribution.medium}%`}
          />
          <div
            className="bg-[#d92525]/60"
            style={{ width: `${data.intensity_distribution.high}%` }}
            title={`高强度 ${data.intensity_distribution.high}%`}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>低 {data.intensity_distribution.low}%</span>
          <span>中 {data.intensity_distribution.medium}%</span>
          <span>高 {data.intensity_distribution.high}%</span>
        </div>
      </div>
      <div className="col-span-2 sm:col-span-4 bg-[#1e1e1e]/50 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-1">恢复策略</div>
        <p className="text-sm text-gray-300">{data.recovery_strategy}</p>
      </div>
    </div>
  );
}

function InjuryRecoveryContent({ data }: { data: InjuryRecovery }) {
  return (
    <div className="space-y-4">
      {data.phases.map((phase, i) => (
        <div key={i} className="border border-[#222] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-[#d92525]/20 text-[#d92525] flex items-center justify-center text-xs font-bold">
              {i + 1}
            </div>
            <h4 className="font-bold text-white">{phase.name}</h4>
          </div>
          {phase.exercises.length > 0 && (
            <ExerciseTable exercises={phase.exercises} />
          )}
          <div className="mt-3 p-3 bg-[#d92525]/5 border border-[#d92525]/20 rounded-lg">
            <span className="text-xs text-[#d92525] font-bold">📋 评估标准：</span>
            <span className="text-xs text-gray-300 ml-1">{phase.evaluation}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ParseErrorContent({ data }: { data: ParseError }) {
  return (
    <div className="p-3 bg-[#d92525]/5 border border-[#d92525]/20 rounded-lg">
      <p className="text-[#d92525] text-sm mb-2">⚠️ 格式化失败，以下为原始内容：</p>
      <pre className="text-xs text-gray-400 whitespace-pre-wrap">{data.raw}</pre>
    </div>
  );
}

/* ---- Format for clipboard ---- */

function formatModuleForCopy(mod: ModuleType): string {
  switch (mod.module) {
    case "position_training": {
      const p = mod as PositionTraining;
      let out = `${p.title}\n`;
      if (p.warmup && p.warmup.length > 0) {
        out += "\n🔥 热身激活：\n";
        p.warmup.forEach((w) => { out += `  ${w.name} — ${w.duration}秒 — ${w.description}\n`; });
      }
      out += "\n上肢训练：\n";
      p.upper_limb.forEach((ex) => { out += `  ${ex.name} — ${ex.sets}组×${ex.reps}次 @ ${ex.load} 间歇${ex.rest}s\n`; });
      out += "\n下肢训练：\n";
      p.lower_limb.forEach((ex) => { out += `  ${ex.name} — ${ex.sets}组×${ex.reps}次 @ ${ex.load} 间歇${ex.rest}s\n`; });
      out += "\n核心训练：\n";
      p.core.forEach((ex) => { out += `  ${ex.name} — ${ex.sets}组×${ex.reps}次 @ ${ex.load} 间歇${ex.rest}s\n`; });
      if (p.cooldown && p.cooldown.length > 0) {
        out += "\n🧊 整理活动：\n";
        p.cooldown.forEach((c) => { out += `  ${c.name} — ${c.duration}秒 — ${c.description}\n`; });
      }
      if (p.nutrition) {
        out += "\n🥗 饮食搭配：\n";
        out += `  训练前：${p.nutrition.pre_training}\n`;
        out += `  训练后：${p.nutrition.post_training}\n`;
        out += `  日常饮食：${p.nutrition.daily_plan}\n`;
        out += `  补水：${p.nutrition.hydration}\n`;
        out += `  补剂：${p.nutrition.supplements}\n`;
      }
      return out;
    }
    case "ability_training": {
      const a = mod as AbilityTraining;
      let out = `${a.title}\n`;
      a.exercises.forEach((ex) => { out += `  ${ex.name} — ${ex.sets}组×${ex.reps}次 @ ${ex.load} 间歇${ex.rest}s | ${ex.progression}\n`; });
      return out;
    }
    case "technique_running": {
      const t = mod as TechniqueRunning;
      let out = `${t.title}\n总跑动: ${t.running_profile.total_distance}\n`;
      t.drills.forEach((d) => { out += `  ${d.name} (${d.duration}min): ${d.description}\n`; });
      return out;
    }
    case "phase_plan": {
      const pp = mod as PhasePlan;
      return `${pp.title}\n频率: ${pp.weekly_frequency}次/周\n时长: ${pp.session_duration}分钟/次\n恢复: ${pp.recovery_strategy}`;
    }
    case "injury_recovery": {
      const ir = mod as InjuryRecovery;
      let out = `${ir.title}\n`;
      ir.phases.forEach((p) => { out += `\n${p.name}\n评估: ${p.evaluation}\n`; });
      return out;
    }
    case "parse_error": {
      const pe = mod as ParseError;
      return `${pe.title}\n${pe.raw}`;
    }
    default:
      return "";
  }
}
