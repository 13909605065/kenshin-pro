'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSyncVersion } from '@/lib/data-events';
import { useTraining } from '@/hooks/useTraining';
import { PhysicalTab } from './tabs/PhysicalTab';
import { WorkoutTimer } from './WorkoutTimer';
import { ExportTable } from './ExportTable';
import { ExerciseEditor } from './ExerciseEditor';
import { TrainingLogPanel } from './TrainingLogPanel';
import TrainingTimer from './TrainingTimer';

import { Share2 } from 'lucide-react';
import type { EditableExercise } from './ExerciseEditor';
import type { PlayerFormData, SeasonPhase, TrainingGoal, TrainingModule, Position } from '@/lib/types';
import { GymDesigner } from './GymDesigner';
import { PHASE_LABELS } from '@/lib/constants';
import { getPhaseParams, getGoalParams } from '@/lib/periodization';
import { getFitnessProfile, fitnessSummary, strengthAssessment, speedAssessment } from '@/lib/fitness-store';
import { getAtRiskPlayers, calcACWR, getLoadData, type LoadEntry } from '@/lib/acwr';
import { calcRecoveryScore, getRecoveryEmoji, type RecoveryInput } from '@/lib/recovery-score';
import { buildRecoveryInputFromStatus, getPlayerSelfReports, getCoachScores } from '@/lib/player-status';
import { getPlayers, type PlayerRecord } from '@/lib/roster-utils';
import { getTodayAttendance, buildAttendance, saveAttendance, getAttendanceStats, setAbsentReason, type AbsenceReason, ABSENCE_LABELS, ABSENCE_ORDER } from '@/lib/attendance-store';
import { groupByPosition, GROUP_META } from '@/lib/player-groups';

// ── helpers ──
const today = new Date();
const fmt = (d: Date, o = 0) => { const w = new Date(d); w.setDate(w.getDate() + o); return w; };
const dateStr = (d: Date) => d.toISOString().slice(0, 10);
const weekLabel = (d: Date, o: number) => fmt(d, o).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
const dayDiff = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000);



// ═══════════════════════════════════════════════
// Chinese weekday helper
// ═══════════════════════════════════════════════
const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const todayWeekday = WEEKDAY_CN[today.getDay()];
const todayDateStr = `${today.getMonth() + 1}月${today.getDate()}日`;

// ── microcycle plan persistence ──
const MC_KEY = 'kenshin_microcycle_plans';

interface MicrocyclePlan {
  modules: TrainingModule[];
  formData: PlayerFormData;
  scene: string;
  duration: number;
  goal: string;
  phase: string;
  savedAt: string;
}

function loadMicrocyclePlans(): Record<string, MicrocyclePlan> {
  try { return JSON.parse(localStorage.getItem(MC_KEY) || '{}'); } catch { return {}; }
}

function saveMicrocyclePlan(matchDate: string, dayOffset: number, plan: MicrocyclePlan) {
  const all = loadMicrocyclePlans();
  all[`${matchDate}_${dayOffset}`] = plan;
  const prefix = `${matchDate}_`;
  const cleaned: Record<string, MicrocyclePlan> = {};
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith(prefix) || Object.keys(cleaned).length < 1) cleaned[k] = v;
  }
  try { localStorage.setItem(MC_KEY, JSON.stringify(cleaned)); } catch {}
}

function getMicrocyclePlan(matchDate: string, dayOffset: number): MicrocyclePlan | null {
  const all = loadMicrocyclePlans();
  return all[`${matchDate}_${dayOffset}`] || null;
}

// ── scene config ──
const SCENES = [
  { id: 'gym' as const, label: '力量房', desc: '抗阻力量 · 爆发力 · 协调灵敏 · 肌耐力', hint: '全无球热身 · FIFA 11+' },
  { id: 'pitch' as const, label: '外场', desc: '自重力量 · 场地爆发力 · 直线速度 · 专项耐力', hint: '无球/有球热身二选一' },
  { id: 'recovery' as const, label: '恢复再生', desc: '拉伸放松 · 筋膜释放 · 主动恢复 · 活动度', hint: '赛后MD+1 · 无球 · HR Zone1-2' },
];

const SCENE_GOALS: Record<string, { id: string; label: string }[]> = {
  gym: [
    { id: 'strength', label: '基础抗阻力量' }, { id: 'power', label: 'SSC爆发力' },
    { id: 'agility', label: '神经协调灵敏' }, { id: 'mas_endurance', label: '局部肌肉耐力' },
  ],
  pitch: [
    { id: 'strength', label: '自重基础力量' }, { id: 'power', label: '场地爆发力' },
    { id: 'speed', label: '直线加速速度' }, { id: 'mas_endurance', label: '专项间歇耐力' },
  ],
  recovery: [
    { id: 'flexibility', label: '拉伸柔韧' },
    { id: 'regeneration', label: '主动恢复' },
  ] };

const DURATIONS = [30, 45, 60, 75, 90];
const ADDON_DURATIONS = [15, 20, 25, 30];

// ── goal/scene label lookups ──
const GOAL_LABELS: Record<string, string> = {
  strength: '力量', power: '爆发力', speed: '速度', agility: '灵敏', mas_endurance: '耐力',
  flexibility: '拉伸', regeneration: '恢复' };
const SCENE_LABELS: Record<string, string> = { gym: '力量房', pitch: '外场', recovery: '恢复再生' };

// ── roster types ──
type PlayerStatus = { name: string; status: 'green' | 'yellow' | 'red'; reason: string; disabledExercises?: string[] };
// Unified roster read — uses getPlayers() from roster-utils (team-scoped)
function loadRoster(): PlayerRecord[] { return getPlayers(); }

function mapPosition(cn: string): Position {
  const map: Record<string, Position> = {
    '门将': 'goalkeeper',
    '中后卫': 'defender', '左后卫': 'wingback', '右后卫': 'wingback',
    '后腰': 'midfielder', '中前卫': 'midfielder', '前腰': 'midfielder',
    '中锋': 'center_forward', '影锋': 'forward', '边锋': 'winger',
    '左边翼卫': 'wingback', '右边翼卫': 'wingback' };
  return map[cn] || 'midfielder';
}

// ── MD recommendation map ──
function getMDRecommendation(mdDay: number): { scene: 'gym' | 'pitch' | 'recovery'; goal: string; label: string } {
  if (mdDay >= 4) return { scene: 'gym', goal: 'strength', label: '力量房·力量' };
  if (mdDay === 3) return { scene: 'gym', goal: 'strength', label: '力量房·力量+爆发' };
  if (mdDay === 2) return { scene: 'gym', goal: 'power', label: '力量房·爆发力' };
  if (mdDay === 1) return { scene: 'pitch', goal: 'speed', label: '外场·赛前激活' };
  if (mdDay === 0) return { scene: 'pitch', goal: 'speed', label: '外场·比赛日激活' };
  if (mdDay === -1) return { scene: 'recovery', goal: 'flexibility', label: '恢复·拉伸放松' };
  if (mdDay === -2) return { scene: 'recovery', goal: 'regeneration', label: '恢复·筋膜放松' };
  return { scene: 'gym', goal: 'strength', label: '力量房·正常训练' };
}

// ── microcycle MD rules by season phase ──
type CalendarPhaseKey = 'regular_season' | 'preseason_build' | 'offseason' | 'playoffs';

const MICROCYCLE_DAYS = [-2, -1, 0, 1, 2, 3, 4] as const;

interface MicrocycleDayInfo {
  label: string;
  scene: 'pitch' | 'gym' | 'match' | 'recovery';
}

const MICROCYCLE_RULES: Record<CalendarPhaseKey, Record<number, MicrocycleDayInfo>> = {
  regular_season: {
    [-2]: { label: '外场·赛前激活', scene: 'pitch' },
    [-1]: { label: '外场·微调', scene: 'pitch' },
    [0]:  { label: '比赛日', scene: 'match' },
    [1]:  { label: '恢复', scene: 'recovery' },
    [2]:  { label: '外场常规', scene: 'pitch' },
    [3]:  { label: '唯一力量', scene: 'gym' },
    [4]:  { label: '外场大课', scene: 'pitch' } },
  preseason_build: {
    [-2]: { label: '外场磨合', scene: 'pitch' },
    [-1]: { label: '激活', scene: 'pitch' },
    [0]:  { label: '教学赛', scene: 'match' },
    [1]:  { label: '恢复', scene: 'recovery' },
    [2]:  { label: '力量①', scene: 'gym' },
    [3]:  { label: '外场体能', scene: 'pitch' },
    [4]:  { label: '力量②', scene: 'gym' } },
  offseason: {
    [-2]: { label: '力量轻负荷', scene: 'gym' },
    [-1]: { label: '活动', scene: 'pitch' },
    [0]:  { label: '热身赛', scene: 'match' },
    [1]:  { label: '恢复力量', scene: 'gym' },
    [2]:  { label: '主力力量①', scene: 'gym' },
    [3]:  { label: '主力力量②', scene: 'gym' },
    [4]:  { label: '主力力量③', scene: 'gym' } },
  playoffs: {
    [-2]: { label: '外场激活·压负荷', scene: 'pitch' },
    [-1]: { label: '最低负荷', scene: 'pitch' },
    [0]:  { label: '关键赛', scene: 'match' },
    [1]:  { label: '恢复', scene: 'recovery' },
    [2]:  { label: '外场纠错', scene: 'pitch' },
    [3]:  { label: '轻量维持力量', scene: 'gym' },
    [4]:  { label: '外场对抗', scene: 'pitch' } } };

const WEEKLY_STRENGTH_LIMIT: Record<CalendarPhaseKey, number> = {
  regular_season: 1,
  preseason_build: 2,
  offseason: 3,
  playoffs: 1 };

const CALENDAR_PHASE_META: Record<CalendarPhaseKey, { label: string; color: string; defaultMode: 'gym' | 'football' }> = {
  regular_season: { label: '常规赛季', color: '#992828', defaultMode: 'football' },
  preseason_build: { label: '季前备战', color: '#166534', defaultMode: 'football' },
  offseason: { label: '休赛期', color: '#374151', defaultMode: 'gym' },
  playoffs: { label: '附加赛', color: '#992828', defaultMode: 'football' } };

function getMicrocycleDay(phaseKey: CalendarPhaseKey, dayOffset: number): MicrocycleDayInfo {
  const rules = MICROCYCLE_RULES[phaseKey];
  if (rules[dayOffset]) return rules[dayOffset];
  // fallback
  if (dayOffset === 0) return { label: '比赛日', scene: 'match' };
  if (dayOffset < 0) return { label: '外场训练', scene: 'pitch' };
  return { label: '训练', scene: 'gym' };
}

// ── edit modal state ──
interface EditState {
  moduleType: string;
  category: string;
  index: number;
  exercise: any;
}


export default function CoachWorkbench() {
  const { modules, planId, generate, loadModules, isOffline } = useTraining();
  const syncVersion = useSyncVersion();
  const [workbenchMode, setWorkbenchMode] = useState<'gym' | 'football' | 'recovery'>('football');
  const [trainDate, setTrainDate] = useState(() => {
    try { return localStorage.getItem("kenshin_coach_trainDate") || new Date().toISOString().slice(0, 10); } catch { return new Date().toISOString().slice(0, 10); }
  });
  const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon'>(new Date().getHours() < 12 ? 'morning' : 'afternoon');
  const [scene, setScene] = useState<'gym' | 'pitch' | 'recovery'>(() => {
    try { return (localStorage.getItem("kenshin_coach_scene") as 'gym'|'pitch'|'recovery') || 'gym'; } catch { return 'gym'; }
  });
  const [goal, setGoal] = useState(() => {
    try { return localStorage.getItem("kenshin_coach_goal") || 'strength'; } catch { return 'strength'; }
  });
  const [duration, setDuration] = useState(() => {
    try { return parseInt(localStorage.getItem("kenshin_coach_duration") || "60"); } catch { return 60; }
  });

  // Auto-persist form state
  useEffect(() => { localStorage.setItem("kenshin_coach_trainDate", trainDate); }, [trainDate]);
  useEffect(() => { localStorage.setItem("kenshin_coach_scene", scene); }, [scene]);
  useEffect(() => { localStorage.setItem("kenshin_coach_goal", goal); }, [goal]);
  useEffect(() => { localStorage.setItem("kenshin_coach_duration", String(duration)); }, [duration]);
  const [phase, setPhase] = useState<SeasonPhase>(() => {
    if (typeof window === 'undefined') return 'competition';
    return (localStorage.getItem('kenshin_coach_phase') as SeasonPhase) || 'competition';
  });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [matchDate, setMatchDate] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('kenshin_coach_matchDate') : null;
    if (saved) return saved;
    const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return dateStr(d);
  });
  const [planMode, setPlanMode] = useState<'team' | 'individual'>(() => {
    if (typeof window === 'undefined') return 'team';
    return (localStorage.getItem('kenshin_coach_planMode') as 'team' | 'individual') || 'team';
  });
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [addonTheme, setAddonTheme] = useState('');
  const [addonScene, setAddonScene] = useState<'gym' | 'pitch' | 'recovery'>('gym');
  const [weather, setWeather] = useState<'sun' | 'cloud' | 'rain'>(() => {
    if (typeof window === 'undefined') return 'sun';
    return (localStorage.getItem('kenshin_coach_weather') as 'sun' | 'cloud' | 'rain') || 'sun';
  });

  // ── coach profile — persisted to localStorage ──
  const COACH_KEY = 'kenshin_coach_profile';
  const loadCoachProfile = () => { if (typeof window === 'undefined') return {}; try { return JSON.parse(localStorage.getItem(COACH_KEY) || '{}'); } catch { return {}; } };
  const savedProfile = typeof window !== 'undefined' ? loadCoachProfile() : {};
  const [coachCert, setCoachCert] = useState(savedProfile.coachCert || 'b');
  const [coachRole, setCoachRole] = useState(savedProfile.coachRole || 'semi_pro');
  const [leagueTag, setLeagueTag] = useState(savedProfile.leagueTag || 'china_league_two');
  const [playerCount, setPlayerCount] = useState(savedProfile.playerCount || 20);

  // ── persist coach profile on change ──
  useEffect(() => {
    try { localStorage.setItem(COACH_KEY, JSON.stringify({ coachCert, coachRole, leagueTag, playerCount })); } catch {}
  }, [coachCert, coachRole, leagueTag, playerCount]);

  // ── persist matchDate + phase ──
  useEffect(() => { try { localStorage.setItem('kenshin_coach_matchDate', matchDate); } catch {} }, [matchDate]);
  useEffect(() => { try { localStorage.setItem('kenshin_coach_phase', phase); } catch {} }, [phase]);
  useEffect(() => { try { localStorage.setItem('kenshin_coach_planMode', planMode); } catch {} }, [planMode]);
  useEffect(() => { try { localStorage.setItem('kenshin_coach_weather', weather); } catch {} }, [weather]);

  // ── calendar phase from kenshin_season_calendar ──
  const calendarPhase = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('kenshin_season_calendar') : null;
      if (!raw) return null;
      const data = JSON.parse(raw);
      const ranges = data?.phaseRanges || [];
      const todayStr = new Date().toISOString().slice(0, 10);
      return ranges.find((r: any) => todayStr >= r.startDate && todayStr <= r.endDate) || null;
    } catch { return null; }
  }, [syncVersion]);
  const calendarPhaseKey = (calendarPhase?.phase || 'regular_season') as CalendarPhaseKey;
  const calendarPhaseMeta = CALENDAR_PHASE_META[calendarPhaseKey];

  // ── STATUS CARD: display only, no auto-switch. Coach decides workbenchMode. ──

  // ── save weather to kenshin_daily_training_log on change ──
  useEffect(() => {
    try {
      const logs = JSON.parse(localStorage.getItem('kenshin_daily_training_log') || '[]');
      const date = trainDate;
      const existing = logs.findIndex((l: any) => l.date === date);
      if (existing >= 0) {
        logs[existing].weather = weather;
        logs[existing].savedAt = new Date().toISOString();
      }
      localStorage.setItem('kenshin_daily_training_log', JSON.stringify(logs.slice(0, 100)));
    } catch {}
  }, [weather, trainDate]);

  // ── exercise editor + training log ──
  const [editState, setEditState] = useState<EditState | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [planEditMode, setPlanEditMode] = useState(false);

  // ── share toast ──
  const [shareToast, setShareToast] = useState<string | null>(null);
  // ── save confirmation toast (TrainingTimer close) ──
  const [saveToast, setSaveToast] = useState(false);

  // ── player check-in notifications ──
  const [checkinCount, setCheckinCount] = useState(0);
  useEffect(() => {
    const check = () => {
      try {
        const raw = localStorage.getItem('kenshin_player_checkins');
        if (!raw) { setCheckinCount(0); return; }
        const checkins = JSON.parse(raw);
        // Count unread check-ins from today
        const today = new Date().toISOString().slice(0, 10);
        const todayCheckins = checkins.filter((c: any) => c.date === today);
        setCheckinCount(todayCheckins.length);
      } catch { setCheckinCount(0); }
    };
    check();
    const interval = setInterval(check, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);
  const [trainingActive, setTrainingActive] = useState(false);
  const trainingStartRef = useRef(0);
  const [workoutTimerActive, setWorkoutTimerActive] = useState(true);
  const [selectedWarmup, setSelectedWarmup] = useState<{id: string; name: string} | null>(null);
  const [restFeedback, setRestFeedback] = useState(false);

  // ── training attendees selector ──
  const [trainingAttendees, setTrainingAttendees] = useState<Set<string>>(new Set());
  const [showAttendeeSelector, setShowAttendeeSelector] = useState(false);
  const [showAbsentPanel, setShowAbsentPanel] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Unified roster data — always from getPlayers() (team-scoped)
  const rosterPlayers = useMemo(() => getPlayers(), [syncVersion]);

  // Initialize training attendees from roster + saved attendance
  useEffect(() => {
    const players = getPlayers();
    if (players.length === 0) return;
    const saved = getTodayAttendance();
    if (saved) {
      // Restore saved attendance
      const attending = new Set<string>();
      for (const e of saved.entries) {
        if (e.present) attending.add(e.playerId);
      }
      setTrainingAttendees(attending);
    } else {
      // Default: all healthy players attending, injured (out) auto-excluded
      const attending = new Set<string>();
      for (const p of players) {
        if (p.injuryStatus !== "out") attending.add(p.id);
      }
      setTrainingAttendees(attending);
    }
  }, [syncVersion]);

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

  const mdRecommendation = useMemo(() => getMDRecommendation(mdDay), [mdDay]);

  // ── current day offset for saving ──
  const [activeDayOffset, setActiveDayOffset] = useState(mdDay);

  // ── player status from roster + ACWR ──
  const [players, setPlayers] = useState<PlayerStatus[]>([]);
  useEffect(() => {
    const roster = loadRoster();
    const atRisk = getAtRiskPlayers();
    const results: PlayerStatus[] = roster.map(p => {
      if (p.injuryStatus !== 'healthy') return { name: p.name, status: 'red' as const, reason: p.injuryNote || '伤病 · 动作已屏蔽', disabledExercises: p.disabledExercises };
      const risk = atRisk.find(r => r.name === p.name);
      if (risk && risk.result.status === 'danger') return { name: p.name, status: 'yellow' as const, reason: risk.result.message };
      if (risk && risk.result.status === 'warning') return { name: p.name, status: 'yellow' as const, reason: risk.result.message };
      return { name: p.name, status: 'green' as const, reason: '正常训练' };
    });
    setPlayers(results.length > 0 ? results : []);
  }, []);

  // ── pick up preset from planning page ──
  useEffect(() => {
    try {
      const preset = localStorage.getItem('kenshin_workbench_preset');
      if (preset) {
        const { scene: s, goal: g, duration: d } = JSON.parse(preset);
        if (s) setScene(s);
        if (g) setGoal(g);
        if (d) setDuration(d);
        localStorage.removeItem('kenshin_workbench_preset');
      }
    } catch {}
  }, []);

  const { greens, yellows, reds } = useMemo(() => ({
    greens: players.filter(p => p.status === 'green').length,
    yellows: players.filter(p => p.status === 'yellow').length,
    reds: players.filter(p => p.status === 'red').length }), [players]);
  const atRiskReasons = useMemo(() => players.filter(p => p.status !== 'green'), [players]);

  // ── batch player selection ──
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const togglePlayerSelect = (name: string) => {
    setSelectedPlayers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const selectAllHealthy = () => {
    setSelectedPlayers(new Set(players.filter(p => p.status === 'green').map(p => p.name)));
  };

  // ── Team ACWR calculation ──
  const teamACWR = useMemo(() => {
    const allLoads = getLoadData();
    const allEntries: LoadEntry[] = [];
    for (const entries of Object.values(allLoads)) {
      allEntries.push(...entries);
    }
    if (allEntries.length === 0) return null;
    // sort descending by date
    allEntries.sort((a, b) => b.date.localeCompare(a.date));
    return calcACWR(allEntries.slice(0, 28));
  }, []);

  // ── Team recovery score (uses player self-report data) ──
  const recoveryScore = useMemo(() => {
    const statusData = buildRecoveryInputFromStatus();
    const input: RecoveryInput = {
      lastSessionRPE: statusData.lastSessionRPE,
      lastSessionDate: null,
      sleepHours: null,
      sleepQuality: null,
      morningHR: null,
      restingHR: null,
      muscleSoreness: statusData.muscleSoreness,
      stressLevel: null,
      acwr: teamACWR?.acwr ?? null,
      hoursSinceLastSession: null };
    return calcRecoveryScore(input);
  }, [teamACWR]);

  // ── Coach manually selects scene/goal. No auto-recommendation. ──

  // ── build form data helper ──
  const buildFormData = useCallback((): PlayerFormData => {
    if (planMode === 'individual' && selectedPlayers.size > 0) {
      const roster = loadRoster();
      const selectedRosterPlayers = roster.filter(p => selectedPlayers.has(p.name));
      if (selectedRosterPlayers.length > 0) {
        const names = selectedRosterPlayers.map(p => p.name).join('、');
        const positions = selectedRosterPlayers.map(p => p.position).join('、');
        const injuredList = selectedRosterPlayers.filter(p => p.injuryStatus !== 'healthy');
        const injuryDetail = injuredList.map(p => `${p.name}:${p.injuryNote || p.injuryStatus}`).join('、');
        const allDisabled = Array.from(new Set(selectedRosterPlayers.flatMap(p => p.disabledExercises || [])));
        const primaryPlayer = selectedRosterPlayers[0];
        const sceneForAddon = addonScene;

        return {
          role: 'coach', name: '', gender: 'male',
          position: primaryPlayer ? mapPosition(primaryPlayer.position) : null,
          age: null, height: null, weight: null, years: null,
          injuryHistory: [
            `【加练小组 · 短时补充训练】主题: ${addonTheme || '未指定'}`,
            `球员: ${names} | 位置: ${positions} | 共${selectedRosterPlayers.length}人`,
            injuryDetail ? `伤病限制: ${injuryDetail}` : '',
            allDisabled.length > 0 ? `禁用动作: ${allDisabled.join(',')}` : '',
            '模式: 此为短时加练(补充训练)，不是完整训练课。仅需2-4个针对性练习。不要输出combo_id完整套餐。不要三段式方案。',
            '聚焦教练指定的加练主题，精简高效，控制训练量到指定时长内。',
          ].filter(Boolean).join('\n'),
          goal: goal as TrainingGoal, phase,
          injurySites: [],
          weakness: addonTheme ? `加练主题: ${addonTheme} | 场景: ${SCENE_LABELS[sceneForAddon]}` : '',
          coachCert: coachCert as any, coachRole: coachRole as any, leagueTag: leagueTag as any,
          tacticalThemes: [], equipmentAvailable: [],
          trainingDuration: duration, playerCount: selectedRosterPlayers.length };
      }
    }

    const relevantPlayers = selectedPlayers.size > 0
      ? players.filter(p => selectedPlayers.has(p.name))
      : players;
    const injuredPlayers = relevantPlayers.filter(p => p.status === 'red');
    const injuryList = injuredPlayers.map(p => p.name);
    const acwrWarnings = relevantPlayers.filter(p => p.status === 'yellow').map(p => p.reason);
    const allDisabled = Array.from(new Set(relevantPlayers.flatMap(p => p.disabledExercises || [])));
    const playerLabel = selectedPlayers.size > 0 ? `已选${selectedPlayers.size}人` : `全队${players.length}人`;

    // 闭环：球员自评数据注入 AI 上下文
    const todaySelfReports = getPlayerSelfReports();
    const todayCoachScores = getCoachScores();
    let selfReportCtx = '';
    if (todaySelfReports.length > 0) {
      const highFatigue = todaySelfReports.filter(r => r.fatigue >= 4 || r.soreness >= 4);
      const avgRPE = Math.round(todaySelfReports.reduce((a, r) => a + r.rpe, 0) / todaySelfReports.length * 10) / 10;
      selfReportCtx = `球员自评: ${todaySelfReports.length}人已评, 均RPE=${avgRPE}`;
      if (highFatigue.length > 0) {
        selfReportCtx += `, 高疲劳/酸痛: ${highFatigue.map(r => r.name).join('、')}`;
      }
      if (Object.keys(todayCoachScores).length > 0) {
        selfReportCtx += `, 教练已评${Object.keys(todayCoachScores).length}人`;
      }
    }

    return {
      role: 'coach', name: '', gender: 'male', position: null,
      age: null, height: null, weight: null, years: null,
      injuryHistory: [
        `${playerLabel}: ${injuryList.join('、')} | 禁用动作: ${allDisabled.join(',')} | ACWR预警: ${acwrWarnings.join('; ')}`,
        selfReportCtx
      ].filter(Boolean).join('\n'),
      goal: goal as TrainingGoal, phase,
      injurySites: [], weakness: '',
      coachCert: coachCert as any, coachRole: coachRole as any, leagueTag: leagueTag as any,
      tacticalThemes: [], equipmentAvailable: [],
      trainingDuration: duration, playerCount };
  }, [players, goal, phase, coachCert, coachRole, leagueTag, duration, playerCount, selectedPlayers, planMode, addonTheme, addonScene]);

  // ── manual record (no AI) ──
  const handleManualRecord = useCallback((trainType: string, note: string) => {
    const date = trainDate;
    const attendeeNames = Array.from(trainingAttendees).map(id => {
      const p = rosterPlayers.find(r => r.id === id);
      return p ? p.name : id;
    });
    // Save to daily log
    try {
      const logs = JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]");
      const slot = `${Date.now()}`;
      logs.unshift({ date, trainType, timeSlot, duration, weather, savedAt: new Date().toISOString(), players: attendeeNames, slot, note });
      localStorage.setItem("kenshin_daily_training_log", JSON.stringify(logs.slice(0, 200)));
    } catch {}
    // Save TRIMP per player
    if (attendeeNames.length > 0) {
      try {
        const trimpMultiplier = trainType === 'pitch' ? 2.5 : trainType === 'gym' ? 2.0 : 1.0;
        const perPlayerTRIMP = Math.round((duration * trimpMultiplier) / attendeeNames.length);
        const sRPE = trainType === 'pitch' ? 7 : trainType === 'gym' ? 6 : 2;
        const existingTRIMP = JSON.parse(localStorage.getItem("kenshin_player_trimp") || "[]");
        const savedAt = new Date().toISOString();
        for (const playerName of attendeeNames) {
          existingTRIMP.push({ playerName, date, trimp: perPlayerTRIMP, trainType, savedAt });
        }
        localStorage.setItem("kenshin_player_trimp", JSON.stringify(existingTRIMP.slice(-500)));
        // Also write to ACWR store (kenshin_load_data)
        const loadData = JSON.parse(localStorage.getItem("kenshin_load_data") || "{}");
        for (const playerName of attendeeNames) {
          if (!loadData[playerName]) loadData[playerName] = [];
          loadData[playerName].push({ date, sRPE, duration });
          if (loadData[playerName].length > 35) loadData[playerName] = loadData[playerName].slice(-35);
        }
        localStorage.setItem("kenshin_load_data", JSON.stringify(loadData));
      } catch {}
    }
    window.dispatchEvent(new CustomEvent('training-log-updated'));
    window.dispatchEvent(new Event('storage'));
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  }, [trainDate, trainingAttendees, rosterPlayers, timeSlot, duration, weather]);

  // ── generate ──
  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    setShowPlan(true);
    setWorkoutTimerActive(true);

    // Auto-save to daily training log for load management
    const date = trainDate;
    const trainType = workbenchMode === 'football' ? 'pitch' : workbenchMode === 'gym' ? 'gym' : 'recovery';
    const attendeeNames = Array.from(trainingAttendees).map(id => {
      const p = rosterPlayers.find(r => r.id === id);
      return p ? p.name : id;
    });
    try {
      const logs = JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]");
      const slot = `${Date.now()}`;
      const entry = { date, trainType, timeSlot, duration: 0, weather, savedAt: new Date().toISOString(), players: attendeeNames, slot };
      logs.unshift(entry);
      localStorage.setItem("kenshin_daily_training_log", JSON.stringify(logs.slice(0, 200)));
    } catch {}

    // Save estimated TRIMP for each attending player
    if (attendeeNames.length > 0) {
      try {
        const trimpMultiplier = trainType === 'pitch' ? 2.5 : trainType === 'gym' ? 2.0 : 1.0;
        const perPlayerTRIMP = Math.round((duration * trimpMultiplier) / attendeeNames.length);
        const existingTRIMP = JSON.parse(localStorage.getItem("kenshin_player_trimp") || "[]");
        const savedAt = new Date().toISOString();
        for (const playerName of attendeeNames) {
          existingTRIMP.push({ playerName, date, trimp: perPlayerTRIMP, trainType, savedAt, estimated: true });
        }
        localStorage.setItem("kenshin_player_trimp", JSON.stringify(existingTRIMP.slice(-500)));
        // Also write to ACWR store
        const sRPE = trainType === 'pitch' ? 7 : trainType === 'gym' ? 6 : 2;
        const loadData = JSON.parse(localStorage.getItem("kenshin_load_data") || "{}");
        for (const playerName of attendeeNames) {
          if (!loadData[playerName]) loadData[playerName] = [];
          loadData[playerName].push({ date, sRPE, duration });
          if (loadData[playerName].length > 35) loadData[playerName] = loadData[playerName].slice(-35);
        }
        localStorage.setItem("kenshin_load_data", JSON.stringify(loadData));
      } catch {}
    }

    // Notify load management page to refresh
    window.dispatchEvent(new CustomEvent('training-log-updated'));
    window.dispatchEvent(new Event('storage'));

    setActiveDayOffset(mdDay);

    const fd = buildFormData();

    // Read today's calendar notes and pass warmup/ball/notes context to AI
    try {
      const todayStr = dateStr(new Date());
      const calRaw = localStorage.getItem('kenshin_warmup_calendar');
      if (calRaw) {
        const cal = JSON.parse(calRaw);
        const todayNotes = cal[todayStr];
        if (todayNotes) {
          const parts: string[] = [];
          if (todayNotes.warmupId) parts.push(`热身方案ID:${todayNotes.warmupId},时长${todayNotes.warmupDuration}min`);
          if (todayNotes.ballOption) parts.push(`热身方式:${todayNotes.ballOption === 'ball' ? '有球' : '无球'}`);
          if (todayNotes.notes) parts.push(`教练备注:${todayNotes.notes}`);
          if (todayNotes.theme) parts.push(`训练主题:${todayNotes.theme}`);
          if (todayNotes.weather) {
            const weatherMap: Record<string, string> = { sun: '晴', cloud: '阴', rain: '雨' };
            parts.push(`天气:${weatherMap[todayNotes.weather] || todayNotes.weather}`);
          }
          if (parts.length > 0) {
            fd.weakness = fd.weakness ? `${fd.weakness} | 训练日历: ${parts.join('; ')}` : `训练日历: ${parts.join('; ')}`;
          }
        }
      }
    } catch {}

    try { await generate(fd, undefined, planMode === 'individual' ? addonScene : scene); }
    catch (e: any) {
      setGenError(e?.message || 'AI生成失败，请重试');
      console.error('Generate failed:', e);
    }
    setGenerating(false);
  };

  // ── auto-save plan after generation ──
  const prevModulesLen = useRef(0);
  const modulesRef = useRef(modules);
  modulesRef.current = modules;
  useEffect(() => {
    if (!generating && modules.length > 0 && modules.length !== prevModulesLen.current) {
      prevModulesLen.current = modules.length;
      const fd = buildFormData();
      saveMicrocyclePlan(matchDate, activeDayOffset, {
        modules: [...modules],
        formData: fd,
        scene,
        duration,
        goal,
        phase,
        savedAt: new Date().toISOString() });
    }
  }, [generating, modules.length]);

  // ── load plan for a microcycle day ──
  const loadPlanForDay = useCallback((dayOffset: number) => {
    const plan = getMicrocyclePlan(matchDate, dayOffset);
    if (plan) {
      loadModules(plan.modules, plan.formData);
      setScene(plan.scene as 'gym' | 'pitch' | 'recovery');
      setGoal(plan.goal);
      setDuration(plan.duration);
      setPhase(plan.phase as SeasonPhase);
      setShowPlan(true);
      setActiveDayOffset(dayOffset);
      // Auto-switch workbench mode for recovery plans
      if (plan.scene === 'recovery') setWorkbenchMode('recovery');
      else if (plan.scene === 'gym') setWorkbenchMode('gym');
      else setWorkbenchMode('football');
    } else {
      const rec = getMDRecommendation(dayOffset);
      setScene(rec.scene);
      setGoal(rec.goal);
      setActiveDayOffset(dayOffset);
      setShowPlan(false);
      // Auto-switch workbench mode based on recommendation
      if (rec.scene === 'recovery') setWorkbenchMode('recovery');
      else if (rec.scene === 'gym') setWorkbenchMode('gym');
      else setWorkbenchMode('football');
    }
  }, [matchDate, loadModules]);

  // ── Quick actions ──
  const reuseLastWeek = useCallback(() => {
    const lastWeekMatchDate = dateStr(fmt(new Date(matchDate), -7));
    const plan = getMicrocyclePlan(lastWeekMatchDate, mdDay);
    if (plan) {
      loadModules(plan.modules, plan.formData);
      setScene(plan.scene as 'gym' | 'pitch' | 'recovery');
      setGoal(plan.goal);
      setDuration(plan.duration);
      setPhase(plan.phase as SeasonPhase);
      setShowPlan(true);
      setActiveDayOffset(mdDay);
      if (plan.scene === 'recovery') setWorkbenchMode('recovery');
      else if (plan.scene === 'gym') setWorkbenchMode('gym');
      else setWorkbenchMode('football');
    }
  }, [matchDate, mdDay, loadModules]);

  const loadFromPlanning = useCallback(() => {
    try {
      const preset = localStorage.getItem('kenshin_periodization_preset');
      if (preset) {
        const { scene: s, goal: g, duration: d, phase: ph } = JSON.parse(preset);
        if (s) setScene(s);
        if (g) setGoal(g);
        if (d) setDuration(d);
        if (ph) setPhase(ph);
      }
    } catch {}
  }, []);

  // ── exercise editing ──
  const handleEditExercise = useCallback((moduleType: string, category: string, index: number, exercise: any) => {
    setEditState({ moduleType, category, index, exercise });
  }, []);

  const handleSaveExercise = useCallback((updated: EditableExercise) => {
    if (!editState) return;
    const newModules = modulesRef.current.map(m => {
      if (m.module !== editState.moduleType) return m;

      if (m.module === 'position_training') {
        const pm = { ...m };
        if (editState.category === 'upper_limb') {
          pm.upper_limb = [...pm.upper_limb];
          pm.upper_limb[editState.index] = { ...pm.upper_limb[editState.index], ...updated };
        } else if (editState.category === 'lower_limb') {
          pm.lower_limb = [...pm.lower_limb];
          pm.lower_limb[editState.index] = { ...pm.lower_limb[editState.index], ...updated };
        } else if (editState.category === 'core') {
          pm.core = [...pm.core];
          pm.core[editState.index] = { ...pm.core[editState.index], ...updated };
        } else if (editState.category === 'exercises') {
          return m;
        }
        return pm;
      }

      if (m.module === 'ability_training' && editState.category === 'exercises') {
        const am = { ...m };
        am.exercises = [...am.exercises];
        am.exercises[editState.index] = { ...am.exercises[editState.index], ...updated };
        return am;
      }

      return m;
    });

    loadModules(newModules);

    const fd = buildFormData();
    saveMicrocyclePlan(matchDate, activeDayOffset, {
      modules: newModules,
      formData: fd,
      scene,
      duration,
      goal,
      phase,
      savedAt: new Date().toISOString() });

    setEditState(null);
  }, [editState, loadModules, buildFormData, matchDate, activeDayOffset, scene, duration, goal, phase]);

  const isLoading = generating;

  // ── check if current day has a plan ──
  const hasPlanForToday = useMemo(() => {
    return !!getMicrocyclePlan(matchDate, mdDay);
  }, [matchDate, mdDay, modules]);

  // ── check if last week has a plan for same MD ──
  const hasLastWeekPlan = useMemo(() => {
    const lastWeekMatchDate = dateStr(fmt(new Date(matchDate), -7));
    return !!getMicrocyclePlan(lastWeekMatchDate, mdDay);
  }, [matchDate, mdDay, modules]);

  // ── determine recovery level display ──
  const recoveryEmoji = getRecoveryEmoji(recoveryScore.level);
  const acwrDisplay = teamACWR ? `${teamACWR.acwr.toFixed(1)} (${teamACWR.status === 'safe' ? '安全' : teamACWR.status === 'warning' ? '关注' : '危险'})` : '--';

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-10">

      {/* ═══════════════════════════════════════════════
          STATUS CARD — 当前阶段 + MD
          ═══════════════════════════════════════════════ */}
      <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <span className="text-sm font-bold text-[#F1F1F1]">{calendarPhaseMeta?.label || '赛季阶段未设置'}</span>
            {!calendarPhase && (
              <a href="/planning" className="text-[10px] text-[#999] ml-2 hover:text-white">设置赛季</a>
            )}
          </div>
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
            mdDay === 0 ? 'bg-green-600/20 text-green-400 border border-green-600/30' :
            mdDay > 0 ? 'bg-[#992828]/15 text-[#992828] border border-[#992828]/30' :
            'bg-[#992828]/10 text-[#992828] border border-[#992828]/20'
          }`}>{mdDay === 0 ? '比赛日' : mdDay > 0 ? `MD-${mdDay}` : `MD+${Math.abs(mdDay)}`}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          PRE-PLANNED TRAINING PROMPT — 今日预排方案提示
          ═══════════════════════════════════════════════ */}
      {(() => {
        const tdo = dayDiff(new Date(trainDate + 'T00:00:00'), new Date(matchDate + 'T00:00:00'));
        const tp = getMicrocyclePlan(matchDate, tdo);
        // 只显示匹配当前模式的预排方案
        const matchPlan = tp && (
          (workbenchMode === 'football' && tp.scene === 'pitch') ||
          (workbenchMode === 'gym' && tp.scene === 'gym') ||
          (workbenchMode === 'recovery' && tp.scene === 'recovery')
        ) ? tp : null;
        if (!matchPlan) return (
          <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <span className="text-sm font-bold text-[#F1F1F1]">暂无{workbenchMode === 'football' ? '外场' : workbenchMode === 'gym' ? '力量' : '恢复'}预排方案</span>
                <p className="text-[10px] text-[#888] mt-0.5">提前在周期方案中编排本周训练</p>
              </div>
              <a href="/planning" className="px-3 py-2 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-lg text-xs font-bold transition active:scale-[0.98] no-underline inline-block">
                编排本周训练
              </a>
            </div>
          </div>
        );
        return (
          <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-[#F1F1F1]">
                  已预排 · {matchPlan.duration}min {matchPlan.scene === 'gym' ? '力量房' : '外场'}
                </span>
                <span className="text-[10px] text-[#888] ml-2">
                  {GOAL_LABELS[matchPlan.goal] || matchPlan.goal} · {PHASE_LABELS[matchPlan.phase as SeasonPhase] || matchPlan.phase}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const tdo2 = dayDiff(new Date(trainDate + 'T00:00:00'), new Date(matchDate + 'T00:00:00'));
                    loadPlanForDay(tdo2);
                  }}
                  className="px-3 py-2 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-lg text-xs font-bold transition active:scale-[0.98]"
                >
                  加载方案
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════
          WORKBENCH MODE TOGGLE — 力量房 vs 足球训练
          ═══════════════════════════════════════════════ */}
      <div className="flex gap-2 bg-[#141414] border border-[#2c2c2c] rounded-xl p-1.5">
        <button onClick={() => setWorkbenchMode('football')}
          className={`flex-1 py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 relative ${
            workbenchMode === 'football' ? 'bg-[#171717] text-[#992828]' : 'bg-[#171717] text-[#888] hover:text-[#aaa]'
          }`}>足球训练
          {workbenchMode === 'football' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#992828] rounded-full" />}
        </button>
        <button onClick={() => setWorkbenchMode('gym')}
          className={`flex-1 py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 relative ${
            workbenchMode === 'gym' ? 'bg-[#171717] text-[#992828]' : 'bg-[#171717] text-[#888] hover:text-[#aaa]'
          }`}>力量房
          {workbenchMode === 'gym' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#992828] rounded-full" />}
        </button>
        <button onClick={() => setWorkbenchMode('recovery')}
          className={`flex-1 py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 relative ${
            workbenchMode === 'recovery' ? 'bg-[#171717] text-[#992828]' : 'bg-[#171717] text-[#888] hover:text-[#aaa]'
          }`}>恢复再生
          {workbenchMode === 'recovery' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#992828] rounded-full" />}
        </button>
      </div>

      {/* ── 训练日期 + 类型 + 时段 ── */}
      <div className="flex items-center gap-2 bg-[#141414] border border-[#2c2c2c] rounded-xl p-2.5 flex-wrap">
        <input type="date" value={trainDate} onChange={e => setTrainDate(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-white focus:border-[#992828] outline-none" />
        <span className="text-xs font-bold text-[#F1F1F1]">{workbenchMode === 'football' ? '外场' : workbenchMode === 'gym' ? '力量房' : '恢复再生'}</span>
        <span className="text-[#555]">|</span>
        {trainDate === dateStr(new Date()) ? (
          <span className="text-[10px] text-[#992828] font-medium">今日训练</span>
        ) : trainDate > dateStr(new Date()) ? (
          <span className="text-[10px] text-yellow-500 font-medium">备课模式</span>
        ) : (
          <span className="text-[10px] text-gray-500">回顾</span>
        )}
        <button onClick={() => setTimeSlot('morning')}
          className={`px-2 py-1 rounded text-[10px] font-medium transition ${timeSlot === 'morning' ? 'bg-[#1e3a5f] text-[#7eb8da] border border-[#2d5a8e]/50' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}>上午</button>
        <button onClick={() => setTimeSlot('afternoon')}
          className={`px-2 py-1 rounded text-[10px] font-medium transition ${timeSlot === 'afternoon' ? 'bg-[#4a3720] text-[#c9a044] border border-[#6b5020]/50' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}>下午</button>
        <span className="text-[#555]">|</span>
        <button onClick={() => setWeather('sun')}
          className={`px-2 py-1 rounded text-[10px] font-medium transition ${weather === 'sun' ? 'bg-[#4a3720] text-[#c9a044] border border-[#6b5020]/50' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}>晴</button>
        <button onClick={() => setWeather('cloud')}
          className={`px-2 py-1 rounded text-[10px] font-medium transition ${weather === 'cloud' ? 'bg-[#2a2e35] text-[#8a8f96] border border-[#3d4148]/50' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}>阴</button>
        <button onClick={() => setWeather('rain')}
          className={`px-2 py-1 rounded text-[10px] font-medium transition ${weather === 'rain' ? 'bg-[#1e3a5f] text-[#7eb8da] border border-[#2d5a8e]/50' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}>雨</button>
        <button onClick={() => {
          const date = trainDate;
          try {
            const logs = JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]");
            const existing = logs.findIndex((l: any) => l.date === date);
            const entry = { date, trainType: 'pitch', timeSlot: 'rest' as const, duration: 0, weather, savedAt: new Date().toISOString() };
            if (existing >= 0) logs[existing] = entry;
            else logs.unshift(entry);
            localStorage.setItem("kenshin_daily_training_log", JSON.stringify(logs.slice(0, 100)));
            setRestFeedback(true);
            setTimeout(() => setRestFeedback(false), 2000);
            window.dispatchEvent(new CustomEvent('training-log-updated'));
          } catch {}
        }}
          className={`text-[10px] px-2 py-1 rounded transition ml-auto ${restFeedback ? 'bg-green-500/15 border border-green-500/40 text-green-400' : 'bg-[#1a1a1a] border border-[#333] text-[#888] hover:text-white'}`}>{restFeedback ? '已标记休息' : '休息'}</button>
        {(() => {
          const plan = getMicrocyclePlan(trainDate, dayDiff(new Date(trainDate + 'T00:00:00'), new Date(matchDate + 'T00:00:00')));
          if (plan) return <span className="text-[10px] text-[#992828]">已预排</span>;
          return null;
        })()}
      </div>

      {/* ═══════════════════════════════════════════════
          GYM MODE — 力量房设计器
          ═══════════════════════════════════════════════ */}
      {workbenchMode === 'gym' && (
        <div className="space-y-4">
          {/* Plan mode toggle */}
          <div className="flex gap-1 bg-[#141414] border border-[#2c2c2c] rounded-xl p-1">
            <button onClick={() => setPlanMode('team')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                planMode === 'team' ? 'bg-[#171717] text-[#992828]' : 'bg-transparent text-[#888] hover:text-[#aaa]'
              }`}>👥 全队方案</button>
            <button onClick={() => setPlanMode('individual')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                planMode === 'individual' ? 'bg-[#171717] text-[#992828]' : 'bg-transparent text-[#888] hover:text-[#aaa]'
              }`}>➕ 加练小组</button>
          </div>

          {/* Individual mode: player picker */}
          {planMode === 'individual' && (
            <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl p-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-gray-400">选择加练球员</label>
                  <div className="flex gap-2">
                    <button onClick={selectAllHealthy} className="text-[9px] text-gray-500 hover:text-white">全选健康</button>
                    <button onClick={() => setSelectedPlayers(new Set())} className="text-[9px] text-gray-500 hover:text-white">清空</button>
                  </div>
                </div>
                {(() => { const roster = loadRoster(); return roster.length === 0 ? (
                  <p className="text-[10px] text-[#888]">暂无花名册 · <a href="/roster" className="text-[#992828] hover:underline">去录入球员</a></p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                    {roster.map(p => (
                      <button key={p.id} onClick={() => togglePlayerSelect(p.name)}
                        className={`text-[10px] px-2 py-1 rounded transition whitespace-nowrap ${
                          selectedPlayers.has(p.name) ? 'bg-[#992828]/15 text-[#992828] ring-1 ring-[#992828]/40' : 'bg-[#1a1a1a] text-[#888] hover:text-white'
                        }`}>{p.name}
                        {p.injuryStatus !== 'healthy' && (p.injuryStatus === 'out' ? ' 🔴' : ' 🟡')}
                        {p.age != null && p.age <= 21 && ' 🌱'}
                      </button>
                    ))}
                  </div>
                )})()}
              </div>
              <input type="text" value={addonTheme} onChange={e => setAddonTheme(e.target.value)}
                placeholder="加练主题，如：腘绳肌离心强化..."
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#992828]" />
            </div>
          )}

          {/* Quick manual record */}
          <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400">快速记录（不经过AI）</span>
              <button onClick={() => {
                const noteEl = document.getElementById('gym-manual-note') as HTMLTextAreaElement;
                const note = noteEl?.value?.trim();
                if (!note) return;
                handleManualRecord('gym', note);
                if (noteEl) noteEl.value = '';
              }}
                className="px-3 py-1 bg-[#1a5c1a] hover:bg-[#145014] text-white rounded text-[10px] font-bold transition active:scale-95"
              >💾 记录</button>
            </div>
            <textarea
              id="gym-manual-note"
              placeholder="写训练内容。例：深蹲4×8 70%1RM + 卧推3×10 + 北欧弯举3×6 + 核心循环"
              rows={2}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#992828] resize-none"
            />
          </div>

          {/* GymDesigner */}
          <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#2c2c2c]">
              <h3 className="text-sm font-bold text-[#F1F1F1] flex items-center gap-2">力量房训练设计</h3>
              <span className="text-[10px] text-gray-500">从动作库挑选 → AI校验 → 保存方案</span>
            </div>
            <GymDesigner />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          RECOVERY MODE — 赛后恢复/再生训练
          ═══════════════════════════════════════════════ */}
      {workbenchMode === 'recovery' && (
        <div className="space-y-4">
          {/* Recovery info card */}
          <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg font-bold text-[#F1F1F1]">恢复再生课</span>
              <span className="text-[10px] text-[#888] bg-[#1a1a1a] px-2 py-0.5 rounded">MD+1</span>
              <span className="text-[10px] text-[#888]">心率 Zone1-2 · 纯自重 · 无球</span>
            </div>
            <p className="text-[10px] text-[#666] mb-4">赛后24h副交感神经恢复窗口，降低肌肉张力、促进代谢产物清除</p>

            {/* Goal selector */}
            <div className="flex gap-2 mb-3 flex-wrap items-center">
              <span className="text-[10px] text-gray-500">目标:</span>
              {(SCENE_GOALS['recovery'] || []).map(g => (
                <button key={g.id} onClick={() => setGoal(g.id)}
                  className={`px-3 py-1.5 rounded text-[11px] font-medium transition ${
                    goal === g.id ? 'bg-[#992828] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-white'
                  }`}>{g.label}</button>
              ))}
            </div>

            {/* Duration selector */}
            <div className="flex gap-2 mb-3 flex-wrap items-center">
              <span className="text-[10px] text-gray-500">时长:</span>
              {[30, 45, 60].map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded text-[11px] font-medium transition ${
                    duration === d ? 'bg-[#992828] text-white' : 'bg-[#1a1a1a] text-[#888]'
                  }`}>{d}min</button>
              ))}
            </div>

            {/* Phase selector */}
            <div className="flex gap-2 mb-4 flex-wrap items-center">
              <span className="text-[10px] text-gray-500">阶段:</span>
              <select value={phase} onChange={e => setPhase(e.target.value as SeasonPhase)}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-xs text-white">
                <option value="preseason">季前备战</option>
                <option value="competition">联赛期</option>
                <option value="recovery">赛后恢复</option>
                <option value="offseason">休赛补强</option>
              </select>
              <span className="text-[10px] text-[#555] ml-2">参训 {trainingAttendees.size}/{rosterPlayers.length}人</span>
            </div>

            {/* Player selector — recovery-specific */}
            {rosterPlayers.length > 0 && (
              <div className="mb-4 border border-[#2c2c2c] rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowAttendeeSelector(!showAttendeeSelector)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] hover:bg-[#1a1a1a] transition"
                >
                  <span className="text-[#888]">{showAttendeeSelector ? '收起' : '选择参训球员'}</span>
                  <span className="text-gray-500 text-[9px]">{showAttendeeSelector ? '▲' : '▼'}</span>
                </button>
                {showAttendeeSelector && (
                  <div className="px-3 pb-3 border-t border-[#2c2c2c] max-h-[240px] overflow-y-auto">
                    <div className="flex gap-1.5 my-2 flex-wrap">
                      <button onClick={() => {
                        const allIds = rosterPlayers.map(p => p.id);
                        setTrainingAttendees(new Set(allIds));
                      }} className="text-[9px] px-2 py-1 rounded bg-[#222] text-[#888] hover:text-white">全选</button>
                      <button onClick={() => setTrainingAttendees(new Set())} className="text-[9px] px-2 py-1 rounded bg-[#222] text-[#888] hover:text-white">清空</button>
                      <button onClick={() => {
                        const healthyIds = rosterPlayers.filter(p => p.injuryStatus === 'healthy').map(p => p.id);
                        setTrainingAttendees(new Set(healthyIds));
                      }} className="text-[9px] px-2 py-1 rounded bg-[#222] text-[#888] hover:text-white">健康球员</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rosterPlayers.map(p => {
                        const isAttending = trainingAttendees.has(p.id);
                        const isInjured = p.injuryStatus !== 'healthy';
                        return (
                          <label key={p.id} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded cursor-pointer transition ${
                            isAttending
                              ? 'bg-[#992828]/15 text-[#992828] ring-1 ring-[#992828]/40'
                              : isInjured
                              ? 'bg-[#111] text-red-500/60 hover:text-red-400'
                              : 'bg-[#111] text-[#888] hover:text-[#aaa]'
                          }`}>
                            <input type="checkbox" checked={isAttending}
                              onChange={() => {
                                setTrainingAttendees(prev => {
                                  const next = new Set(prev);
                                  if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                  return next;
                                });
                              }}
                              className="accent-[#992828] w-3 h-3" />
                            {p.name}
                            {p.number && <span className="text-[8px] text-gray-600">#{p.number}</span>}
                            {isInjured && <span className="text-[8px]">{p.injuryStatus === 'out' ? '🔴' : '🟡'}</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 手动记录模式 ── */}
            <div className="mb-3">
              <textarea
                placeholder="直接写训练内容，不经过AI生成。例：20min慢跑 + 10min全身静态拉伸 + 冰敷"
                rows={2}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#992828] resize-none"
                id="recovery-manual-note"
              />
            </div>

            <div className="flex gap-2">
              {/* Manual record button — just save, no AI */}
              <button onClick={() => {
                const noteEl = document.getElementById('recovery-manual-note') as HTMLTextAreaElement;
                handleManualRecord('recovery', noteEl?.value?.trim() || '恢复训练');
                if (noteEl) noteEl.value = '';
              }}
                className="flex-1 py-3 bg-[#1a5c1a] hover:bg-[#145014] text-white rounded-xl text-sm font-bold transition active:scale-[0.98]">
                💾 直接记录
              </button>

              {/* AI generate button */}
              <button onClick={handleGenerate} disabled={generating}
                className="flex-1 py-3 bg-[#992828] hover:bg-[#7a1e1e] disabled:bg-[#333] disabled:text-[#666] text-white rounded-xl text-sm font-bold transition active:scale-[0.98]">
                {generating ? '生成中...' : 'AI生成'}
              </button>
            </div>
            {genError && <p className="text-[10px] text-red-400 mt-2">{genError}</p>}
          </div>

          {/* Plan output area */}
          {showPlan && modules.length > 0 && (
            <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#2c2c2c]">
                <h3 className="text-sm font-bold text-[#F1F1F1]">
                  恢复再生 · {duration}min · {activeDayOffset === 0 ? '比赛日' : activeDayOffset > 0 ? `MD-${activeDayOffset}` : `MD+${Math.abs(activeDayOffset)}`}
                  {isOffline && <span className="ml-2 text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">离线</span>}
                </h3>
                <div className="flex items-center gap-2">
                  <ExportTable modules={modules} formData={buildFormData()} />
                  <button onClick={() => setShowPlan(false)} className="text-[10px] text-gray-500 hover:text-white">收起</button>
                </div>
              </div>
              <div className="p-4">
                <PhysicalTab modules={modules} position={null} onUpdateExercise={handleEditExercise} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          FOOTBALL MODE
          ═══════════════════════════════════════════════ */}
      {workbenchMode === 'football' && (
      <>

      {/* ═══════════════════════════════════════════════
          WEEKLY LOAD BAR — automatic load tracking
          ═══════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════
          DASHBOARD HEADER — overview at a glance
          ═══════════════════════════════════════════════ */}
      <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl p-5 space-y-4">

        {/* Row 1: Date + MD + Scene */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#F1F1F1]">
                {todayDateStr} {todayWeekday}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                mdDay === 0 ? 'bg-green-600/15 text-green-400 border border-green-600/30' :
                mdDay > 0 ? 'bg-[#992828]/15 text-[#992828] border border-[#992828]/30' :
                'bg-[#992828]/10 text-[#992828] border border-[#992828]/20'
              }`}>
                {mdLabel}
              </span>
            </div>
            <p className="text-[10px] text-[#888] mt-0.5">{PHASE_LABELS[phase]} · 比赛日 {matchDate}</p>
          </div>

          {/* Phase quick toggle */}
          <select value={phase} onChange={e => setPhase(e.target.value as SeasonPhase)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-xs text-white">
            <option value="preseason">季前备战</option>
            <option value="competition">联赛期</option>
            <option value="recovery">赛后恢复</option>
            <option value="offseason">休赛补强</option>
          </select>
        </div>

        {/* Row 2: Player status bar + ACWR + Recovery */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Player count */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-300 font-semibold">全队 {players.length || '?'}人</span>
            {players.length > 0 ? (
              <>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-green-500" /> {greens}</span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-yellow-500" /> {yellows}</span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-red-500" /> {reds}</span>
              </>
            ) : (
              <span className="text-[10px] text-gray-600">无花名册</span>
            )}
          </div>

          {/* ACWR */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">ACWR:</span>
            <span className={`text-[10px] font-mono font-medium ${
              teamACWR?.status === 'safe' ? 'text-green-400' :
              teamACWR?.status === 'warning' ? 'text-yellow-400' :
              teamACWR?.status === 'danger' ? 'text-red-400' :
              'text-gray-500'
            }`}>
              {acwrDisplay}
            </span>
          </div>

          {/* Recovery Score */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">恢复:</span>
            <span className="text-[10px] font-medium">
              {recoveryEmoji} {recoveryScore.level === 'green' ? '正常训练' : recoveryScore.level === 'yellow' ? '降低负荷' : '主动恢复'}
            </span>
            <span className="text-[9px] text-gray-600">({recoveryScore.score}分)</span>
          </div>
        </div>

        {/* Row 3: Training type indicator + quick manual record */}
        <div className="flex items-center gap-2 p-2.5 bg-[#1a1a1a] rounded-lg">
          <span className="text-[10px] text-gray-500">训练:</span>
          <span className="text-xs font-bold text-white">{workbenchMode === 'football' ? '外场训练' : workbenchMode === 'gym' ? '力量房' : '恢复再生'} · {duration}min</span>
          {recoveryScore.adjustments.length > 0 && (
            <span className="text-[9px] text-yellow-400/80 truncate max-w-[240px]">
              ⚠ {recoveryScore.adjustments[0]}
            </span>
          )}
          <button
            onClick={() => {
              const noteEl = document.getElementById('football-manual-note') as HTMLTextAreaElement;
              const note = noteEl?.value?.trim();
              if (!note) return;
              handleManualRecord(workbenchMode === 'football' ? 'pitch' : 'gym', note);
              if (noteEl) noteEl.value = '';
            }}
            className="ml-auto px-3 py-1 bg-[#1a5c1a] hover:bg-[#145014] text-white rounded text-[10px] font-bold transition active:scale-95"
          >💾 记录</button>
        </div>
        {/* Manual note input */}
        <textarea
          id="football-manual-note"
          placeholder="直接写训练内容，不经过AI。例：热身15min + 传球练习15min + 50×50m对抗15min"
          rows={2}
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#992828] resize-none"
        />

        {/* ── 参训球员选择器 (collapsible, grouped) ── */}
        {(() => {
          const allPlayers = rosterPlayers;
          const groups = groupByPosition(allPlayers);
          const allIds = allPlayers.map(p => p.id);
          const attendingCount = trainingAttendees.size;
          const absentCount = allPlayers.length - attendingCount;

          const togglePlayer = (playerId: string) => {
            setTrainingAttendees(prev => {
              const next = new Set(prev);
              if (next.has(playerId)) next.delete(playerId);
              else next.add(playerId);
              return next;
            });
          };

          const selectGroup = (playerIds: string[]) => {
            setTrainingAttendees(prev => { const next = new Set(prev); playerIds.forEach(id => next.add(id)); return next; });
          };
          const deselectGroup = (playerIds: string[]) => {
            setTrainingAttendees(prev => { const next = new Set(prev); playerIds.forEach(id => next.delete(id)); return next; });
          };
          const invertGroup = (playerIds: string[]) => {
            setTrainingAttendees(prev => {
              const next = new Set(prev);
              for (const id of playerIds) {
                if (next.has(id)) next.delete(id); else next.add(id);
              }
              return next;
            });
          };

          // Save attendance to localStorage on change
          const saveCurrentAttendance = () => {
            const record = buildAttendance(allPlayers, trainingAttendees);
            saveAttendance(record);
          };

          return (
            <div className="bg-[#1a1a1a] border border-[#2c2c2c] rounded-xl overflow-hidden">
              <button
                onClick={() => setShowAttendeeSelector(!showAttendeeSelector)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-[#222] transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#ccc] font-medium">
                    参训球员 <span className="text-[#992828]">{attendingCount}人</span>
                  </span>
                  {absentCount > 0 && (
                    <span className="text-[10px] text-yellow-500/80">
                      · 缺席{absentCount}人
                    </span>
                  )}
                  <span className="text-[10px] text-gray-600">/ 在册{allPlayers.length}人</span>
                </div>
                <span className="text-gray-500 text-[10px] transition-transform duration-200" style={{ transform: showAttendeeSelector ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </button>

              {/* Absent alert banner */}
              {absentCount > 0 && (
                <div className="mx-3 mb-2 px-3 py-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg flex items-center justify-between">
                  <span className="text-[10px] text-yellow-500/80">
                    ⚠️ 在册{allPlayers.length}人，本次参训{attendingCount}人，缺席{absentCount}人
                  </span>
                  <button
                    onClick={() => { setShowAbsentPanel(!showAbsentPanel); saveCurrentAttendance(); }}
                    className="text-[10px] text-yellow-400 hover:text-yellow-300 underline"
                  >
                    {showAbsentPanel ? '收起' : '查看缺席名单'}
                  </button>
                </div>
              )}

              {/* Absent player details panel */}
              {showAbsentPanel && absentCount > 0 && (
                <div className="mx-3 mb-2 px-3 py-2 bg-[#111] border border-[#2c2c2c] rounded-lg max-h-[200px] overflow-y-auto">
                  <p className="text-[10px] text-gray-500 mb-2">缺席球员 · 点击原因可修改</p>
                  <div className="space-y-1">
                    {(() => {
                      const stats = getAttendanceStats(allPlayers);
                      return stats.absentPlayers.map(ap => (
                        <div key={ap.playerId} className="flex items-center gap-2 text-[10px]">
                          <span className="text-gray-300 w-16 truncate">{ap.name}</span>
                          <span className="text-gray-600 w-8">{ap.position}</span>
                          <select
                            value={ap.reason || ''}
                            onChange={(e) => {
                              const v = e.target.value as AbsenceReason | '';
                              setAbsentReason(ap.playerId, v || null);
                              // Refresh UI by re-reading attendance
                              const updated = getTodayAttendance();
                              if (updated) {
                                const attending = new Set<string>();
                                for (const en of updated.entries) {
                                  if (en.present) attending.add(en.playerId);
                                }
                                setTrainingAttendees(attending);
                              }
                            }}
                            className={`bg-[#1a1a1a] border rounded px-1.5 py-0.5 text-[9px] ${
                              ap.reason ? 'border-yellow-500/30 text-yellow-400' : 'border-red-500/30 text-red-400'
                            }`}
                          >
                            <option value="">未标记 ⚠️</option>
                            {ABSENCE_ORDER.map(r => (
                              <option key={r} value={r}>{ABSENCE_LABELS[r]}</option>
                            ))}
                          </select>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {showAttendeeSelector && (
                <div className="px-3 pb-3 border-t border-[#2c2c2c]">
                  {/* Global actions */}
                  <div className="flex items-center gap-1.5 mt-2 mb-3 flex-wrap">
                    <button onClick={() => { setTrainingAttendees(new Set(allIds)); }}
                      className="text-[9px] px-2 py-1 rounded bg-[#222] text-[#888] hover:text-white hover:bg-[#333] transition">全选</button>
                    <button onClick={() => { setTrainingAttendees(new Set()); }}
                      className="text-[9px] px-2 py-1 rounded bg-[#222] text-[#888] hover:text-white hover:bg-[#333] transition">全不选</button>
                    <button onClick={() => invertGroup(allIds)}
                      className="text-[9px] px-2 py-1 rounded bg-[#222] text-[#888] hover:text-white hover:bg-[#333] transition">反选</button>
                    <button onClick={() => {
                      const healthyIds = allPlayers.filter(p => p.injuryStatus === 'healthy').map(p => p.id);
                      setTrainingAttendees(new Set(healthyIds));
                    }}
                      className="text-[9px] px-2 py-1 rounded bg-[#222] text-[#888] hover:text-white hover:bg-[#333] transition">全选健康</button>
                    <button onClick={saveCurrentAttendance}
                      className="text-[9px] px-2 py-1 rounded bg-[#992828]/15 text-[#992828] hover:bg-[#992828]/25 transition ml-auto">保存</button>
                  </div>

                  {allPlayers.length === 0 ? (
                    <p className="text-[10px] text-gray-600 py-1">暂无花名册数据 · <a href="/roster" className="text-[#992828] hover:underline">去录入球员</a></p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {groups.map(g => {
                        const groupIds = g.players.map(p => p.id);
                        const groupAttending = g.players.filter(p => trainingAttendees.has(p.id)).length;
                        const meta = GROUP_META[g.group];
                        const groupOpen = !collapsedGroups.has(g.group);
                        return (
                          <div key={g.group} className="bg-[#111] rounded-lg overflow-hidden border border-[#1a1a1a]">
                            {/* Group header */}
                            <button
                              onClick={() => setCollapsedGroups(prev => { const n = new Set(prev); if (n.has(g.group)) n.delete(g.group); else n.add(g.group); return n; })}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#1a1a1a] transition text-[10px]"
                            >
                              <span>{groupOpen ? '▼' : '▶'}</span>
                              <span className="text-gray-300">{meta.emoji} {meta.label}</span>
                              <span className="text-gray-500">({groupAttending}/{g.players.length}人)</span>
                              <div className="flex-1" />
                              <span
                                onClick={(e) => { e.stopPropagation(); selectGroup(groupIds); }}
                                className="text-[9px] text-gray-500 hover:text-white px-1"
                              >全选</span>
                              <span
                                onClick={(e) => { e.stopPropagation(); invertGroup(groupIds); }}
                                className="text-[9px] text-gray-500 hover:text-white px-1"
                              >反选</span>
                            </button>
                            {/* Group players */}
                            {groupOpen && (
                              <div className="flex flex-wrap gap-1 px-2.5 pb-2">
                                {g.players.map(p => {
                                  const isAttending = trainingAttendees.has(p.id);
                                  const isInjured = p.injuryStatus !== 'healthy';
                                  return (
                                    <label key={p.id} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded cursor-pointer transition ${
                                      isAttending
                                        ? 'bg-[#992828]/15 text-[#992828] ring-1 ring-[#992828]/40'
                                        : isInjured
                                        ? 'bg-[#111] text-red-500/60 hover:text-red-400'
                                        : 'bg-[#111] text-[#888] hover:text-[#aaa]'
                                    }`}>
                                      <input
                                        type="checkbox"
                                        checked={isAttending}
                                        onChange={() => togglePlayer(p.id)}
                                        className="accent-[#992828] w-3 h-3"
                                      />
                                      {p.name}
                                      {p.number && <span className="text-[8px] text-gray-600">#{p.number}</span>}
                                      {isInjured && <span className="text-[8px]">{p.injuryStatus === 'out' ? '🔴' : '🟡'}</span>}
                                      {p.age != null && p.age <= 21 && <span className="text-[8px]">🌱</span>}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ══ QUICK ACTIONS ROW ══ */}
        <div className="flex items-center gap-2">
          {hasLastWeekPlan ? (
            <button onClick={reuseLastWeek}
              className="px-2 py-1.5 bg-[#1a1a1a] border border-[#333] hover:border-[#555] rounded-lg text-[10px] text-gray-300 hover:text-white transition">
              复用上周
            </button>
          ) : (
            <button disabled
              className="px-2 py-1.5 bg-[#1a1a1a] border border-[#2c2c2c] rounded-lg text-[10px] text-[#666] cursor-not-allowed">
              上周无方案
            </button>
          )}
          <button onClick={loadFromPlanning}
            className="px-2 py-1.5 bg-[#1a1a1a] border border-[#333] hover:border-[#555] rounded-lg text-[10px] text-gray-300 hover:text-white transition">
            从周期方案加载
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ATTENTION ALERTS — at-risk players
          ═══════════════════════════════════════════════ */}
      {planMode === 'team' && atRiskReasons.length > 0 && (
        <div className="bg-[#141414] border border-yellow-500/15 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-yellow-500/80 font-semibold">关注球员</span>
            <span className="text-[9px] text-[#888]">{atRiskReasons.length}人</span>
          </div>
          <div className="space-y-1">
            {atRiskReasons.slice(0, 5).map(p => (
              <button key={p.name} onClick={() => togglePlayerSelect(p.name)}
                className={`flex items-center gap-2 text-[10px] p-2 rounded-lg w-full text-left transition cursor-pointer ${
                  selectedPlayers.has(p.name) ? 'ring-1 ring-[#992828]' : ''
                } ${
                  p.status === 'red' ? 'bg-red-500/10 border border-red-500/20' : 'bg-yellow-500/5 border border-yellow-500/20'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.status === 'red' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                <span className="text-[#F1F1F1] font-medium shrink-0">{p.name}</span>
                <span className="text-[#888] truncate">{p.reason}</span>
                {selectedPlayers.has(p.name) && <span className="ml-auto text-[#992828] text-[9px] shrink-0">✓</span>}
              </button>
            ))}
            {atRiskReasons.length > 5 && (
              <p className="text-[9px] text-[#888] pl-5">还有 {atRiskReasons.length - 5} 人...</p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════

      {/* ── 功能入口 ── */}
      <div className="space-y-3">
        <a href="/warmup" className="bg-[#171717] border border-[#2c2c2c] hover:border-[#3d3d3d] rounded-xl p-4 group transition no-underline block">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#F1F1F1] group-hover:text-white transition">热身设计</h3>
            </div>
            <span className="text-[#555] group-hover:text-[#999] text-lg transition">&rarr;</span>
          </div>
        </a>
        <a href="/field" className="bg-[#171717] border border-[#992828]/30 hover:border-[#992828]/50 rounded-xl p-4 group transition no-underline block">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#992828] group-hover:text-[#b53a3a] transition">场地训练监控</h3>
            </div>
            <span className="text-[#555] group-hover:text-[#992828] text-lg transition">&rarr;</span>
          </div>
        </a>
      </div>

      {/* ═══════════════════════════════════════════════
          PLAN OUTPUT AREA
          ═══════════════════════════════════════════════ */}
      {showPlan && modules.length > 0 && (
        <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2c2c2c]">
            <h3 className="text-sm font-bold text-[#F1F1F1]">
              {planMode === 'individual' ? (() => {
                const roster = loadRoster();
                const names = roster.filter(p => selectedPlayers.has(p.name)).map(p => p.name).join('/');
                return `加练小组 · ${names || '未选球员'} · ${addonScene === 'gym' ? '力量房' : '外场'} · ${duration}min${addonTheme ? ` · ${addonTheme}` : ''}`;
              })() : `${scene === 'gym' ? '力量房' : '外场'} · ${duration}min · ${activeDayOffset === 0 ? '比赛日' : activeDayOffset > 0 ? `MD-${activeDayOffset}` : `MD+${Math.abs(activeDayOffset)}`}`}
              {isOffline && <span className="ml-2 text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">离线</span>}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={() => { trainingStartRef.current = Date.now(); setTrainingActive(true); }} className="px-3 py-1.5 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-lg text-[10px] font-bold transition active:scale-95">▶ 开始训练</button>
              <button onClick={() => setShowLog(!showLog)} className={`text-[10px] transition ${showLog ? 'text-[#992828]' : 'text-[#888] hover:text-white'}`}>📝 日志</button>
              <ExportTable modules={modules} formData={buildFormData()} />
              {workoutTimerActive && (
                <WorkoutTimer modules={modules} planId={planId ?? undefined} onClose={() => setWorkoutTimerActive(false)} />
              )}
              {/* Share check-in link */}
              <button
                onClick={() => {
                  const planKey = planId || `${matchDate}_${activeDayOffset}`;
                  const url = `${window.location.origin}/checkin?plan=${encodeURIComponent(planKey)}`;
                  try {
                    navigator.clipboard.writeText(url).then(() => {
                      setShareToast('链接已复制，发送给球员');
                      setTimeout(() => setShareToast(null), 2500);
                    });
                  } catch {
                    // fallback
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    setShareToast('链接已复制，发送给球员');
                    setTimeout(() => setShareToast(null), 2500);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#1a1a1a] border border-[#333] hover:border-[#555] rounded-lg text-[10px] text-gray-300 hover:text-white transition"
                title="复制球员确认链接"
              >
                <Share2 className="w-3 h-3" />
                分享给球员
              </button>
              {/* Check-in notification badge */}
              {checkinCount > 0 && (
                <button
                  onClick={() => {
                    try {
                      const raw = localStorage.getItem('kenshin_player_checkins');
                      if (!raw) return;
                      const checkins = JSON.parse(raw);
                      const today = new Date().toISOString().slice(0, 10);
                      const todayCheckins = checkins.filter((c: any) => c.date === today);
                      if (todayCheckins.length === 0) return;
                      const names = todayCheckins.map((c: any) => c.playerName).filter(Boolean).join('、');
                      setShareToast(`${names} 已确认训练完成`);
                      setTimeout(() => setShareToast(null), 3000);
                    } catch {}
                  }}
                  className="relative px-3 py-1.5 bg-green-500/10 border border-green-500/30 hover:border-green-500/50 rounded-lg text-[10px] text-green-400 hover:text-green-300 transition"
                  title="查看球员确认"
                >
                  ✅ {checkinCount}人已确认
                </button>
              )}
              <button onClick={() => setPlanEditMode(!planEditMode)} className={`text-[10px] transition ${planEditMode ? 'text-[#992828]' : 'text-[#888] hover:text-white'}`} title="编辑方案参数">✏️</button>
              <button onClick={() => {
                if (!confirm('确认删除当前训练方案？')) return;
                const all = loadMicrocyclePlans();
                const key = `${matchDate}_${activeDayOffset}`;
                if (all[key]) {
                  delete all[key];
                  try { localStorage.setItem(MC_KEY, JSON.stringify(all)); } catch {}
                }
                loadModules([], buildFormData());
                setShowPlan(false);
              }} className="text-[10px] text-gray-500 hover:text-red-400 transition" title="删除方案">🗑️</button>
              <button onClick={() => setShowPlan(false)} className="text-[10px] text-gray-500 hover:text-white">收起</button>
            </div>
          </div>

          {/* ── Inline edit bar ── */}
          {planEditMode && (
            <div className="border-b border-[#2c2c2c] bg-[#111] p-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] text-[#888]">编辑参数:</span>

                {/* Scene */}
                <div className="flex gap-1">
                  {SCENES.map(s => (
                    <button key={s.id} onClick={() => { setScene(s.id); setGoal(SCENE_GOALS[s.id][0].id); }}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                        scene === s.id ? 'bg-[#992828] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-white'
                      }`}>{s.label}</button>
                  ))}
                </div>

                <span className="text-[10px] text-[#555]">·</span>

                {/* Goal */}
                <div className="flex gap-1">
                  {(SCENE_GOALS[scene] || []).map(g => (
                    <button key={g.id} onClick={() => setGoal(g.id)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                        goal === g.id ? 'bg-[#992828] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-white'
                      }`}>{g.label}</button>
                  ))}
                </div>

                <span className="text-[10px] text-[#555]">·</span>

                {/* Duration */}
                <div className="flex gap-1">
                  {(planMode === 'individual' ? ADDON_DURATIONS : DURATIONS).map(d => (
                    <button key={d} onClick={() => setDuration(d)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition ${duration === d ? 'bg-[#992828] text-white' : 'bg-[#1a1a1a] text-[#888]'}`}>{d}min</button>
                  ))}
                </div>

                <button onClick={() => { setPlanEditMode(false); handleGenerate(); }}
                  className="ml-auto px-4 py-1.5 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-lg text-[10px] font-bold transition active:scale-[0.98]">
                  🔄 重新生成
                </button>
                <button onClick={() => setPlanEditMode(false)}
                  className="px-3 py-1.5 bg-[#1a1a1a] border border-[#333] hover:border-[#555] text-[#aaa] hover:text-white rounded-lg text-[10px] transition">
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="p-4">
            <PhysicalTab modules={modules} position={null} onUpdateExercise={handleEditExercise} />
          </div>

          {showLog && (
            <TrainingLogPanel
              modules={modules}
              planId={planId}
              scene={scene}
              goal={goal}
              duration={duration}
              matchDay={activeDayOffset === 0 ? '比赛日' : activeDayOffset > 0 ? `MD-${activeDayOffset}` : `MD+${Math.abs(activeDayOffset)}`}
              playerName={planMode === 'individual' && selectedPlayers.size > 0 ? loadRoster().filter(p => selectedPlayers.has(p.name)).map(p => p.name).join('/') : undefined}
              onClose={() => setShowLog(false)}
            />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          MICROCYCLE — phase-based MD-2 → MD+4
          ═══════════════════════════════════════════════ */}
      <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl p-4">
        {/* Top info line */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#999]">比赛周微周期</h3>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-[#888]">
              {calendarPhaseMeta?.label || '未设置'}
            </span>
            <span className="text-[#555]">|</span>
            <span className="text-[#888]">
              周力量<span className="text-[#992828] font-bold">{WEEKLY_STRENGTH_LIMIT[calendarPhaseKey]}节</span>
            </span>
          </div>
        </div>

        {/* 7-day grid: MD-2 → MD-1 → MD → MD+1 → MD+2 → MD+3 → MD+4 */}
        <div className="grid grid-cols-7 gap-1.5">
          {MICROCYCLE_DAYS.map((dayOffset) => {
            const dayInfo = getMicrocycleDay(calendarPhaseKey, dayOffset);
            const label = dayOffset === 0 ? 'MD' : dayOffset > 0 ? `MD-${dayOffset}` : `MD+${Math.abs(dayOffset)}`;
            const isToday = dayOffset === mdDay;
            const isMatch = dayOffset === 0;
            const isPast = dayOffset > mdDay;
            const hasPlan = !!getMicrocyclePlan(matchDate, dayOffset);

            return (
              <button key={dayOffset} onClick={() => loadPlanForDay(dayOffset)}
                className={`rounded-lg p-2 text-center border transition cursor-pointer ${
                  isMatch ? 'border-[#992828]/40 bg-[#992828]/10 ring-1 ring-[#992828]/20' :
                  isToday ? 'border-[#992828]/50 bg-[#992828]/10 ring-1 ring-[#992828]/25' :
                  isPast ? 'border-[#2c2c2c] bg-[#111] opacity-50' :
                  'border-[#2c2c2c] bg-[#111] hover:border-[#3d3d3d]'
                }`}>
                {/* MD label */}
                <div className={`text-[9px] font-bold mb-0.5 ${
                  isMatch ? 'text-[#992828]' :
                  isToday ? 'text-[#992828]' :
                  'text-[#888]'
                }`}>{label}</div>

                {/* Scene icon */}
                

                {/* Short label */}
                <div className={`text-[8px] leading-tight ${
                  isMatch ? 'text-[#aaa]' :
                  isToday ? 'text-[#ccc]' :
                  isPast ? 'text-[#666]' :
                  'text-[#777]'
                }`}>
                  {hasPlan && <span className="text-[#992828]">已排</span>}
                  
                </div>

                {/* Date hint */}
                <div className="text-[7px] text-[#666] mt-0.5">
                  {isToday ? '今天' : weekLabel(fmt(new Date(matchDate), dayOffset), 0).slice(-2)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ TRAINING TIMER — full-screen overlay ══ */}
      {trainingActive && (
        <TrainingTimer
          modules={modules}
          planId={planId}
          scene={scene}
          goal={goal}
          duration={duration}
          matchDay={activeDayOffset === 0 ? '比赛日' : activeDayOffset > 0 ? `MD-${activeDayOffset}` : `MD+${Math.abs(activeDayOffset)}`}
          playerName={planMode === 'individual' && selectedPlayers.size > 0 ? loadRoster().filter(p => selectedPlayers.has(p.name)).map(p => p.name).join('/') : undefined}
          onClose={async () => {
            setTrainingActive(false);
            const elapsedMin = Math.round((Date.now() - trainingStartRef.current) / 60000);
            if (elapsedMin > 0) {
              const date = trainDate;
              const trainType = workbenchMode === 'football' ? 'pitch' : workbenchMode === 'gym' ? 'gym' : 'recovery';
              try {
                const logs = JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]");
                const attendeeNames = Array.from(trainingAttendees).map(id => {
                  const p = rosterPlayers.find(r => r.id === id);
                  return p ? p.name : id;
                });
                const slot = `${Date.now()}`;
                logs.unshift({ date, trainType, timeSlot, duration: elapsedMin, weather, savedAt: new Date().toISOString(), players: attendeeNames, slot });
                localStorage.setItem("kenshin_daily_training_log", JSON.stringify(logs.slice(0, 200)));
              } catch {}

              // Update individual TRIMP with actual duration
              const attendeeNames = Array.from(trainingAttendees).map(id => {
      const p = rosterPlayers.find(r => r.id === id);
      return p ? p.name : id;
    });
              if (attendeeNames.length > 0) {
                try {
                  const trimpMultiplier = trainType === 'pitch' ? 2.5 : trainType === 'gym' ? 2.0 : 1.0;
                  const perPlayerTRIMP = Math.round((elapsedMin * trimpMultiplier) / attendeeNames.length);
                  let existingTRIMP = JSON.parse(localStorage.getItem("kenshin_player_trimp") || "[]");
                  // Remove estimated entries for this date
                  existingTRIMP = existingTRIMP.filter((e: any) => !(e.date === date && e.estimated));
                  const savedAt = new Date().toISOString();
                  for (const playerName of attendeeNames) {
                    existingTRIMP.push({ playerName, date, trimp: perPlayerTRIMP, trainType, savedAt });
                  }
                  localStorage.setItem("kenshin_player_trimp", JSON.stringify(existingTRIMP.slice(-500)));
                  // Also write to ACWR store
                  const sRPE = trainType === 'pitch' ? 7 : trainType === 'gym' ? 6 : 2;
                  const loadData = JSON.parse(localStorage.getItem("kenshin_load_data") || "{}");
                  for (const playerName of attendeeNames) {
                    if (!loadData[playerName]) loadData[playerName] = [];
                    loadData[playerName].push({ date, sRPE, duration: elapsedMin });
                    if (loadData[playerName].length > 35) loadData[playerName] = loadData[playerName].slice(-35);
                  }
                  localStorage.setItem("kenshin_load_data", JSON.stringify(loadData));
                } catch {}
              }

              // ── Auto-generate training notes ──
              const todayKey = new Date().toISOString().slice(0, 10);
              const sceneLabel = trainType === 'pitch' ? '外场' : trainType === 'gym' ? '力量房' : '恢复再生';
              const intensityLabel = '中'; // default, coach can edit later
              const noteDraft = `${sceneLabel}训练 · ${elapsedMin}min · ${intensityLabel}强度\n${attendeeNames.length > 0 ? `参训: ${attendeeNames.join('、')}` : '全队合练'}\n要点: ___`;
              try {
                const notes = JSON.parse(localStorage.getItem('kenshin_structured_notes') || '{}');
                if (!notes[todayKey] || !notes[todayKey].notes) {
                  notes[todayKey] = { notes: noteDraft, savedAt: new Date().toISOString() };
                  localStorage.setItem('kenshin_structured_notes', JSON.stringify(notes));
                }
              } catch {}

              // ── Sync to Supabase (best-effort) ──
              try {
                const { saveSessionLog, extractExercisesFromModules, calcSummary } = await import('@/lib/training-log');
                const exercises = extractExercisesFromModules(modules);
                const summary = calcSummary(exercises, noteDraft);
                const log = {
                  id: `log_${Date.now()}`,
                  date: todayKey,
                  planId: planId || 'manual',
                  scene: scene,
                  goal: goal,
                  duration: elapsedMin,
                  matchDay: activeDayOffset === 0 ? '比赛日' : activeDayOffset > 0 ? `MD-${activeDayOffset}` : `MD+${Math.abs(activeDayOffset)}`,
                  playerName: planMode === 'individual' && selectedPlayers.size > 0 ? Array.from(selectedPlayers).join('/') : undefined,
                  exercises,
                  summary,
                  createdAt: new Date().toISOString() };
                saveSessionLog(log);
              } catch {}

              // Notify load management page to refresh
              window.dispatchEvent(new CustomEvent('training-log-updated'));

              // Show save confirmation toast
              setSaveToast(true);
              setTimeout(() => setSaveToast(false), 2500);
            }
          }}
        />
      )}

      {/* ══ EXERCISE EDITOR MODAL ══ */}
      {editState && (
        <ExerciseEditor
          exercise={{
            name: editState.exercise?.name || '',
            sets: typeof editState.exercise?.sets === 'number' ? editState.exercise.sets : Array.isArray(editState.exercise?.sets) ? editState.exercise.sets[0] : 3,
            reps: typeof editState.exercise?.reps === 'number' ? editState.exercise.reps : Array.isArray(editState.exercise?.reps) ? editState.exercise.reps[0] : 10,
            load: editState.exercise?.load || 'BW',
            rest: editState.exercise?.rest || 90,
            rpe: editState.exercise?.rpe || 7 }}
          onSave={handleSaveExercise}
          onCancel={() => setEditState(null)}
        />
      )}

      {/* ══ Close football mode fragment ══ */}
      </>
      )}

      {/* ══ SHARE TOAST ══ */}
      {shareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#992828] text-white text-xs px-4 py-2 rounded-xl shadow-xl animate-in slide-in-from-top-2">
          {shareToast}
        </div>
      )}

      {/* ══ SAVE TOAST ══ */}
      {saveToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white text-xs px-4 py-2 rounded-xl shadow-xl animate-in slide-in-from-bottom-2">
          数据已保存
        </div>
      )}
    </div>
  );
}
