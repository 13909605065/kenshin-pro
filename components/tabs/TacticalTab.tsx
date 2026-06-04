"use client";

import { TrainingModule, TacticalFocus } from "@/lib/types";

interface Props {
  modules: TrainingModule[];
}

function TacticalAnalysisCards({ module: m }: { module: TacticalFocus }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#1e1e1e]/50 rounded-lg p-4">
        <h3 className="text-white font-bold text-lg">{m.title}</h3>
        <span className="text-xs text-[#d92525] bg-[#d92525]/10 px-2 py-0.5 rounded mt-1 inline-block">
          {m.tactical_theme}
        </span>
      </div>

      {/* Tactical Analysis Bullet Points */}
      {m.tactical_analysis && m.tactical_analysis.length > 0 && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">战术核心分析</h4>
          <div className="space-y-2">
            {m.tactical_analysis.map((point, i) => (
              <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-3 flex gap-3">
                <span className="text-[#d92525] font-bold flex-shrink-0">{i + 1}.</span>
                <p className="text-sm text-gray-200 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formation Notes */}
      {m.formation_notes && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">阵型体系</h4>
          <div className="bg-[#1e1e1e]/50 rounded-lg p-3">
            <p className="text-sm text-gray-200 leading-relaxed">{m.formation_notes}</p>
          </div>
        </div>
      )}

      {/* Phases of Play Grid */}
      {(m.build_up_phase || m.midfield_transition || m.final_third || m.defensive_block) && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">比赛阶段分析</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {m.build_up_phase && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3 border-l-2 border-blue-400">
                <span className="text-xs text-blue-400 font-bold">组织推进 Build-Up</span>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{m.build_up_phase}</p>
              </div>
            )}
            {m.midfield_transition && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3 border-l-2 border-yellow-400">
                <span className="text-xs text-yellow-400 font-bold">中场过渡 Midfield</span>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{m.midfield_transition}</p>
              </div>
            )}
            {m.final_third && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3 border-l-2 border-green-400">
                <span className="text-xs text-green-400 font-bold">前场终结 Final Third</span>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{m.final_third}</p>
              </div>
            )}
            {m.defensive_block && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3 border-l-2 border-red-400">
                <span className="text-xs text-red-400 font-bold">防守阵块 Defensive Block</span>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{m.defensive_block}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pressing & Defensive Shape */}
      {(m.pressing_triggers || m.defensive_shape) && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">压迫与防守组织</h4>
          <div className="space-y-2">
            {m.pressing_triggers && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3">
                <span className="text-xs text-[#d92525] font-bold">压迫触发信号</span>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{m.pressing_triggers}</p>
              </div>
            )}
            {m.defensive_shape && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3">
                <span className="text-xs text-[#d92525] font-bold">防守阵型组织</span>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{m.defensive_shape}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attacking Patterns & Counter Structure */}
      {(m.attacking_patterns || m.counter_structure) && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">进攻与反击</h4>
          <div className="space-y-2">
            {m.attacking_patterns && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3">
                <span className="text-xs text-[#d92525] font-bold">进攻模式</span>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{m.attacking_patterns}</p>
              </div>
            )}
            {m.counter_structure && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3">
                <span className="text-xs text-[#d92525] font-bold">反击结构</span>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{m.counter_structure}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transition Moments */}
      {m.transition_moments && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">攻守转换</h4>
          <div className="bg-[#1e1e1e]/50 rounded-lg p-3">
            <p className="text-xs text-gray-300 leading-relaxed">{m.transition_moments}</p>
          </div>
        </div>
      )}

      {/* Set Piece Organization */}
      {(m.set_piece_offense || m.set_piece_defense) && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">定位球战术</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {m.set_piece_offense && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3 border-l-2 border-green-500">
                <span className="text-xs text-green-400 font-bold">进攻定位球</span>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{m.set_piece_offense}</p>
              </div>
            )}
            {m.set_piece_defense && (
              <div className="bg-[#1e1e1e]/50 rounded-lg p-3 border-l-2 border-red-500">
                <span className="text-xs text-red-400 font-bold">防守定位球</span>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{m.set_piece_defense}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player Roles */}
      {m.player_roles && m.player_roles.length > 0 && (
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">球员战术角色</h4>
          <div className="space-y-2">
            {m.player_roles.map((role, i) => (
              <div key={i} className="bg-[#1e1e1e]/50 rounded-lg p-3 flex items-start gap-3">
                <span className="text-[#d92525] text-lg flex-shrink-0">&#9733;</span>
                <p className="text-sm text-gray-200 leading-relaxed">{role}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TacticalTab({ modules }: Props) {
  const tacticalFocus = modules.find((m) => m.module === "tactical_focus") as TacticalFocus | undefined;
  const phaseModule = modules.find((m) => m.module === "phase_plan");

  // Coach mode: show rich tactical analysis
  if (tacticalFocus) {
    return (
      <div className="space-y-6">
        <TacticalAnalysisCards module={tacticalFocus} />
      </div>
    );
  }

  // Athlete mode: show phase plan
  if (phaseModule && phaseModule.module === "phase_plan") {
    return (
      <div className="space-y-4">
        {/* Intensity Distribution */}
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">周期适配计划</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#1e1e1e]/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-[#d92525]">{phaseModule.weekly_frequency}</div>
              <div className="text-xs text-gray-400 mt-1">次/周</div>
            </div>
            <div className="bg-[#1e1e1e]/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-[#d92525]">{phaseModule.session_duration}</div>
              <div className="text-xs text-gray-400 mt-1">分钟/次</div>
            </div>
            <div className="col-span-2 bg-[#1e1e1e]/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">强度分布</div>
              <div className="flex h-3 rounded-full overflow-hidden">
                <div
                  className="bg-gray-500"
                  style={{ width: `${phaseModule.intensity_distribution.low}%` }}
                  title={`低强度 ${phaseModule.intensity_distribution.low}%`}
                />
                <div
                  className="bg-[#d92525]/60"
                  style={{ width: `${phaseModule.intensity_distribution.medium}%` }}
                  title={`中强度 ${phaseModule.intensity_distribution.medium}%`}
                />
                <div
                  className="bg-neon-red/60"
                  style={{ width: `${phaseModule.intensity_distribution.high}%` }}
                  title={`高强度 ${phaseModule.intensity_distribution.high}%`}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>低 {phaseModule.intensity_distribution.low}%</span>
                <span>中 {phaseModule.intensity_distribution.medium}%</span>
                <span>高 {phaseModule.intensity_distribution.high}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recovery Strategy */}
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">恢复策略</h4>
          <div className="bg-[#1e1e1e]/50 rounded-lg p-3">
            <p className="text-sm text-gray-300">{phaseModule.recovery_strategy}</p>
          </div>
        </div>

        {/* Tactical Board Placeholder */}
        <div>
          <h4 className="text-[#d92525] text-sm font-bold mb-2">战术分析</h4>
          <div className="bg-[#1e1e1e]/50 rounded-lg p-6 text-center border border-dashed border-[#222]">
            <p className="text-sm text-gray-500">
              战术板功能将在下一版本上线
            </p>
            <p className="text-xs text-gray-600 mt-1">
              届时支持绘制点位、球员跑动路线、攻防站位排布
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <p className="text-sm text-gray-500 py-8 text-center">暂无战术内容</p>;
}
