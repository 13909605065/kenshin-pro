'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTraining } from '@/hooks/useTraining';
import { PhysicalTab } from './tabs/PhysicalTab';
import { WorkoutTimer } from './WorkoutTimer';
import { ExportTable } from './ExportTable';
import AIAssistant from './AIAssistant';
import type { PlayerFormData, SeasonPhase, TrainingGoal } from '@/lib/types';
import { PHASE_LABELS } from '@/lib/constants';
import { getAtRiskPlayers } from '@/lib/acwr';

// ── helpers ──
const today = new Date();
const fmt = (d: Date, o = 0) => { const w = new Date(d); w.setDate(w.getDate() + o); return w; };
const dateStr = (d: Date) => d.toISOString().slice(0, 10);
const weekLabel = (d: Date, o: number) => fmt(d, o).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
const dayDiff = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000);

// ── scene config ──
const SCENES = [
  { id: 'gym' as const, label: '力量房', icon: '🏋️', desc: '抗阻力量 · 爆发力 · 协调灵敏 · 肌耐力', hint: '全无球热身 · FIFA 11+' },
  { id: 'pitch' as const, label: '外场', icon: '⚽', desc: '自重力量 · 场地爆发力 · 直线速度 · 专项耐力', hint: '无球/有球热身二选一' },
];

const SCENE_GOALS: Record<string, { id: string; label: string }[]> = {
  gym: [
    { id: 'strength', label: '基础抗阻力量' }, { id: 'power', label: 'SSC爆发力' },
    { id: 'agility', label: '神经协调灵敏' }, { id: 'muscle_endurance', label: '局部肌肉耐力' },
  ],
  pitch: [
    { id: 'bodyweight_strength', label: '自重基础力量' }, { id: 'field_power', label: '场地爆发力' },
    { id: 'speed', label: '直线加速速度' }, { id: 'mas_endurance', label: '专项间歇耐力' },
  ],
};

const DURATIONS = [30, 45, 60, 75, 90];

// ── roster types ──
interface RosterPlayer { id: string; name: string; position: string; number: string; age: number | null; height: number | null; weight: number | null; injuryStatus: 'healthy' | 'minor' | 'out'; injuryNote: string; }
type PlayerStatus = { name: string; status: 'green' | 'yellow' | 'red'; reason: string };
function loadRoster(): RosterPlayer[] { try { const raw = localStorage.getItem('kenshin_roster'); return raw ? JSON.parse(raw) : []; } catch { return []; } }

export default function CoachWorkbench() {
  const { modules, planId, generate, fromCache } = useTraining();
  const [scene, setScene] = useState<'gym' | 'pitch'>('gym');
  const [goal, setGoal] = useState('strength');
  const [duration, setDuration] = useState(60);
  const [phase, setPhase] = useState<SeasonPhase>('competition');
  const [generating, setGenerating] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [matchDate, setMatchDate] = useState<string>(() => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return dateStr(d); });
  // ── coach profile ──
  const [coachCert, setCoachCert] = useState('b');
  const [coachRole, setCoachRole] = useState('semi_pro');
  const [leagueTag, setLeagueTag] = useState('china_league_two');
  const [playerCount, setPlayerCount] = useState(20);

  // ── MD calculation from match date ──
  const mdDay = useMemo(() => {
    const match = new Date(matchDate + 'T00:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return dayDiff(now, match);
  }, [matchDate]);

  const mdLabel = useMemo(() => {
    if (mdDay === 0) return '比赛日';
    if (mdDay > 0) return `MD-${mdDay}`;
    return `MD+${Math.abs(mdDay)}`;
  }, [mdDay]);

  // ── player status from roster + ACWR ──
  const [players, setPlayers] = useState<PlayerStatus[]>([]);
  useEffect(() => {
    const roster = loadRoster();
    const atRisk = getAtRiskPlayers();
    const results: PlayerStatus[] = roster.map(p => {
      if (p.injuryStatus !== 'healthy') return { name: p.name, status: 'red' as const, reason: p.injuryNote || '伤病 · 动作已屏蔽' };
      const risk = atRisk.find(r => r.name === p.name);
      if (risk && risk.result.status === 'danger') return { name: p.name, status: 'yellow' as const, reason: risk.result.message };
      if (risk && risk.result.status === 'warning') return { name: p.name, status: 'yellow' as const, reason: risk.result.message };
      return { name: p.name, status: 'green' as const, reason: '正常训练' };
    });
    setPlayers(results.length > 0 ? results : []);
  }, []);

  const { greens, yellows, reds } = useMemo(() => ({
    greens: players.filter(p => p.status === 'green').length,
    yellows: players.filter(p => p.status === 'yellow').length,
    reds: players.filter(p => p.status === 'red').length,
  }), [players]);
  const atRiskReasons = useMemo(() => players.filter(p => p.status !== 'green'), [players]);

  // ── load recommendation based on MD ──
  useEffect(() => {
    if (mdDay > 2) { setScene('gym'); setGoal('strength'); }
    else if (mdDay === 2) { setScene('gym'); setGoal('power'); }
    else if (mdDay === 1) { setScene('pitch'); setGoal('speed'); }
    else if (mdDay === 0) { setScene('pitch'); setGoal('speed'); } // match day - light activation
    else if (mdDay === -1) { setScene('gym'); setGoal('muscle_endurance'); } // MD+1 recovery
    else { setScene('pitch'); setGoal('mas_endurance'); }
  }, [mdDay]);

  // ── generate ──
  const handleGenerate = async () => {
    setGenerating(true);
    setShowPlan(true);

    const injuryList = players.filter(p => p.status === 'red').map(p => p.name);
    const acwrWarnings = players.filter(p => p.status === 'yellow').map(p => p.reason);

    const fd: PlayerFormData = {
      role: 'coach', name: '', gender: 'male', position: null,
      age: null, height: null, weight: null, years: null,
      injuryHistory: `${injuryList.join('、')} | ACWR预警: ${acwrWarnings.join('; ')}`,
      goal: goal as TrainingGoal, phase,
      injurySites: [], weakness: '',
      coachCert: coachCert as any, coachRole: coachRole as any, leagueTag: leagueTag as any,
      tacticalThemes: [], equipmentAvailable: [],
      trainingDuration: duration, playerCount,
    };

    try { await generate(fd, undefined, scene); }
    catch (e) { console.error('Generate failed:', e); }
    setGenerating(false);
  };

  const isLoading = generating;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">
            {PHASE_LABELS[phase]} · <span className="text-[#d92525]">{mdLabel}</span>
          </h2>
          <p className="text-[10px] text-gray-600">{weekLabel(today, 0)}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-500">比赛日</label>
          <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-xs text-white" />
          <select value={phase} onChange={e => setPhase(e.target.value as SeasonPhase)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-xs text-white">
            <option value="preseason">季前备战</option>
            <option value="competition">联赛期</option>
            <option value="recovery">赛后恢复</option>
            <option value="offseason">休赛补强</option>
          </select>
        </div>
      </div>

      {/* ═══ SCENE + GOAL ═══ */}
      <div className="grid grid-cols-2 gap-3">
        {SCENES.map(s => (
          <button key={s.id} onClick={() => { setScene(s.id); setGoal(SCENE_GOALS[s.id][0].id); }}
            className={`p-4 rounded-xl border text-left transition ${
              scene === s.id ? 'border-[#d92525] bg-[#d92525]/5' : 'border-[#222] bg-[#0d0d0d] hover:border-[#444]'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{s.icon}</span>
              <span className={`text-sm font-bold ${scene === s.id ? 'text-[#d92525]' : 'text-white'}`}>{s.label}</span>
            </div>
            <p className="text-[10px] text-gray-500">{s.desc}</p>
            <p className="text-[9px] text-gray-600 mt-1">{s.hint}</p>
          </button>
        ))}
      </div>

      {/* Goal sub-select + Duration */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-gray-500">目标</span>
        <div className="flex gap-1">
          {(SCENE_GOALS[scene] || []).map(g => (
            <button key={g.id} onClick={() => setGoal(g.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition ${
                goal === g.id ? 'bg-[#d92525] text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
              }`}>{g.label}</button>
          ))}
        </div>
        <span className="text-[10px] text-gray-500 ml-3">时长</span>
        <div className="flex gap-1">
          {DURATIONS.map(d => (
            <button key={d} onClick={() => setDuration(d)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition ${duration === d ? 'bg-[#d92525] text-white' : 'bg-[#1a1a1a] text-gray-400'}`}>{d}min</button>
          ))}
        </div>
      </div>

      {/* ═══ PLAYER STATUS ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-300 font-semibold">全队 {players.length || '?'} 人</span>
          <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-green-500" /> {greens}</span>
          <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-yellow-500" /> {yellows}</span>
          <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-red-500" /> {reds}</span>
        </div>
        {players.length === 0 ? (
          <p className="text-[10px] text-gray-600">暂无花名册数据 · <a href="/roster" className="text-[#d92525] underline">去录入球员</a></p>
        ) : atRiskReasons.length === 0 ? (
          <p className="text-[10px] text-green-400">全队状态良好</p>
        ) : (
          atRiskReasons.map(p => (
            <div key={p.name} className={`flex items-center gap-2 text-[10px] p-2 rounded-lg mb-1 ${
              p.status === 'red' ? 'bg-red-500/10 border border-red-500/20' : 'bg-yellow-500/5 border border-yellow-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'red' ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <span className="text-white font-medium">{p.name}</span>
              <span className="text-gray-500">{p.reason}</span>
            </div>
          ))
        )}
      </div>

      {/* ═══ COACH SETTINGS (collapsible) ═══ */}
      <details className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 text-[10px] text-gray-500">
        <summary className="cursor-pointer text-gray-400">⚙️ 教练档案 · 队员{playerCount}人 · {leagueTag}</summary>
        <div className="flex flex-wrap gap-2 mt-2">
          <select value={coachCert} onChange={e => setCoachCert(e.target.value)} className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white">
            <option value="pro">PRO职业级</option><option value="a">A级</option><option value="b">B级</option><option value="c">C级</option><option value="d">D级</option><option value="none">无证</option>
          </select>
          <select value={coachRole} onChange={e => setCoachRole(e.target.value)} className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white">
            <option value="pro">职业教练</option><option value="semi_pro">半职业</option><option value="amateur">业余</option><option value="youth">青训</option><option value="campus">校园</option>
          </select>
          <select value={leagueTag} onChange={e => setLeagueTag(e.target.value)} className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white">
            <option value="chinese_super_league">中超</option><option value="china_league_one">中甲</option><option value="china_league_two">中乙</option><option value="amateur_team">业余队</option>
          </select>
          <input type="number" value={playerCount} onChange={e => setPlayerCount(Number(e.target.value))} min={8} max={35}
            className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white w-16" placeholder="人数" />
        </div>
      </details>

      {/* ═══ GENERATE ═══ */}
      <button onClick={handleGenerate} disabled={isLoading}
        className="w-full py-4 bg-[#d92525] hover:bg-[#b71d1d] disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
        {isLoading ? <><span className="animate-spin">⏳</span> 生成中…</> : fromCache ? '📋 已有方案 · 秒开' : `⚡ 生成${mdLabel}训练方案`}
      </button>

      {/* ═══ PLAN OUTPUT ═══ */}
      {showPlan && modules.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#222] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#222]">
            <h3 className="text-sm font-bold text-white">
              {scene === 'gym' ? '🏋️ 力量房' : '⚽ 外场'} · {duration}min · {mdLabel} · 职业三段式
            </h3>
            <div className="flex items-center gap-2">
              <ExportTable modules={modules} formData={{ role: 'coach', name: '', gender: 'male', position: null, age: null, height: null, weight: null, years: null, injuryHistory: '', goal: goal as TrainingGoal, phase, injurySites: [], weakness: '', coachCert: coachCert as any, coachRole: coachRole as any, leagueTag: leagueTag as any, tacticalThemes: [], equipmentAvailable: [], trainingDuration: duration, playerCount }} />
              <WorkoutTimer modules={modules} planId={planId ?? undefined} onClose={() => {}} />
              <button onClick={() => setShowPlan(false)} className="text-[10px] text-gray-500 hover:text-white">收起</button>
            </div>
          </div>
          <div className="p-4">
            <PhysicalTab modules={modules} position={null} />
          </div>
        </div>
      )}

      {/* ═══ MICROCYCLE ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-3">📅 比赛周微周期</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const dayOffset = mdDay - 3 + i;
            const label = dayOffset === 0 ? 'MD' : dayOffset > 0 ? `MD-${dayOffset}` : `MD+${Math.abs(dayOffset)}`;
            const isToday = dayOffset === mdDay;
            const isMatch = dayOffset === 0;
            const isPast = dayOffset > mdDay;
            return (
              <button key={i} onClick={() => setSelectedDay(selectedDay === i ? null : i)}
                className={`rounded-lg p-2 text-center border transition cursor-pointer ${
                  selectedDay === i ? 'ring-1 ring-[#d92525]' : ''
                } ${
                  isMatch ? 'border-[#d92525]/40 bg-[#d92525]/5' :
                  isToday ? 'border-white/20 bg-white/5' :
                  isPast ? 'border-green-500/20 bg-green-500/5 opacity-60' :
                  'border-[#222] bg-[#111] hover:border-[#444]'
                }`}>
                <div className={`text-[9px] font-bold ${isMatch ? 'text-[#d92525]' : isToday ? 'text-white' : 'text-gray-500'}`}>{label}</div>
                <div className="text-[8px] text-gray-600 mt-0.5">{isMatch ? '⚽比赛' : isPast ? '✓完成' : isToday ? '←今天' : weekLabel(fmt(new Date(matchDate), dayOffset), 0).slice(-2)}</div>
                <div className="text-[7px] text-gray-500 mt-1 leading-tight">
                  {isMatch ? '极高强度' : dayOffset >= 2 ? '力量房' : dayOffset === 1 ? '外场激活' : '恢复再生'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <AIAssistant />
    </div>
  );
}
