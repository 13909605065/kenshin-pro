'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTraining } from '@/hooks/useTraining';
import { PhysicalTab } from './tabs/PhysicalTab';
import { WorkoutTimer } from './WorkoutTimer';
import { ExportTable } from './ExportTable';
import AIAssistant from './AIAssistant';
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
  { id: 'gym' as const, label: '力量房', icon: '🏋️', desc: '抗阻力量 · 爆发力 · 协调灵敏 · 肌耐力', hint: '全无球热身 · FIFA 11+' },
  { id: 'pitch' as const, label: '外场', icon: '⚽', desc: '自重力量 · 场地爆发力 · 直线速度 · 专项耐力', hint: '无球/有球热身二选一' },
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
};

const DURATIONS = [30, 45, 60, 75, 90];
const ADDON_DURATIONS = [15, 20, 25, 30];

// ── goal/scene label lookups ──
const GOAL_LABELS: Record<string, string> = {
  strength: '力量', power: '爆发力', speed: '速度', agility: '灵敏', mas_endurance: '耐力',
};
const SCENE_LABELS: Record<string, string> = { gym: '力量房', pitch: '外场' };

// ── roster types ──
interface RosterPlayer { id: string; name: string; position: string; number: string; age: number | null; height: number | null; weight: number | null; injuryStatus: 'healthy' | 'minor' | 'out'; injuryNote: string; injuryHistory?: string; disabledExercises?: string[]; }
type PlayerStatus = { name: string; status: 'green' | 'yellow' | 'red'; reason: string; disabledExercises?: string[] };
function loadRoster(): RosterPlayer[] { try { const raw = localStorage.getItem('roster_players'); return raw ? JSON.parse(raw) : []; } catch { return []; } }

function mapPosition(cn: string): Position {
  const map: Record<string, Position> = {
    '门将': 'goalkeeper',
    '中后卫': 'defender', '左后卫': 'wingback', '右后卫': 'wingback',
    '后腰': 'midfielder', '中前卫': 'midfielder', '前腰': 'midfielder',
    '中锋': 'center_forward', '影锋': 'forward', '边锋': 'winger',
    '左边翼卫': 'wingback', '右边翼卫': 'wingback',
  };
  return map[cn] || 'midfielder';
}

// ── MD recommendation map ──
function getMDRecommendation(mdDay: number): { scene: 'gym' | 'pitch'; goal: string; label: string } {
  if (mdDay >= 4) return { scene: 'gym', goal: 'strength', label: '力量房·力量' };
  if (mdDay === 3) return { scene: 'gym', goal: 'strength', label: '力量房·力量+爆发' };
  if (mdDay === 2) return { scene: 'gym', goal: 'power', label: '力量房·爆发力' };
  if (mdDay === 1) return { scene: 'pitch', goal: 'speed', label: '外场·赛前激活' };
  if (mdDay === 0) return { scene: 'pitch', goal: 'speed', label: '外场·比赛日激活' };
  if (mdDay === -1) return { scene: 'gym', goal: 'mas_endurance', label: '力量房·主动恢复' };
  if (mdDay === -2) return { scene: 'gym', goal: 'strength', label: '力量房·弱链纠正' };
  return { scene: 'gym', goal: 'strength', label: '力量房·正常训练' };
}

// ── microcycle MD rules by season phase ──
type CalendarPhaseKey = 'regular_season' | 'preseason_build' | 'offseason' | 'playoffs';

const MICROCYCLE_DAYS = [-2, -1, 0, 1, 2, 3, 4] as const;

interface MicrocycleDayInfo {
  icon: string;
  label: string;
  scene: 'pitch' | 'gym' | 'match' | 'recovery';
}

const MICROCYCLE_RULES: Record<CalendarPhaseKey, Record<number, MicrocycleDayInfo>> = {
  regular_season: {
    [-2]: { icon: '⚽', label: '外场·赛前激活', scene: 'pitch' },
    [-1]: { icon: '⚽', label: '外场·微调', scene: 'pitch' },
    [0]:  { icon: '🏆', label: '比赛日', scene: 'match' },
    [1]:  { icon: '💆', label: '恢复', scene: 'recovery' },
    [2]:  { icon: '⚽', label: '外场常规', scene: 'pitch' },
    [3]:  { icon: '🏋️', label: '唯一力量', scene: 'gym' },
    [4]:  { icon: '⚽', label: '外场大课', scene: 'pitch' },
  },
  preseason_build: {
    [-2]: { icon: '⚽', label: '外场磨合', scene: 'pitch' },
    [-1]: { icon: '🔥', label: '激活', scene: 'pitch' },
    [0]:  { icon: '📋', label: '教学赛', scene: 'match' },
    [1]:  { icon: '💆', label: '恢复', scene: 'recovery' },
    [2]:  { icon: '🏋️', label: '力量①', scene: 'gym' },
    [3]:  { icon: '⚽', label: '外场体能', scene: 'pitch' },
    [4]:  { icon: '🏋️', label: '力量②', scene: 'gym' },
  },
  offseason: {
    [-2]: { icon: '🏋️', label: '力量轻负荷', scene: 'gym' },
    [-1]: { icon: '🏃', label: '活动', scene: 'pitch' },
    [0]:  { icon: '📋', label: '热身赛', scene: 'match' },
    [1]:  { icon: '🏋️', label: '恢复力量', scene: 'gym' },
    [2]:  { icon: '🏋️', label: '主力力量①', scene: 'gym' },
    [3]:  { icon: '🏋️', label: '主力力量②', scene: 'gym' },
    [4]:  { icon: '🏋️', label: '主力力量③', scene: 'gym' },
  },
  playoffs: {
    [-2]: { icon: '⚽', label: '外场激活·压负荷', scene: 'pitch' },
    [-1]: { icon: '🧘', label: '最低负荷', scene: 'pitch' },
    [0]:  { icon: '🏆', label: '关键赛', scene: 'match' },
    [1]:  { icon: '💆', label: '恢复', scene: 'recovery' },
    [2]:  { icon: '⚽', label: '外场纠错', scene: 'pitch' },
    [3]:  { icon: '🏋️', label: '轻量维持力量', scene: 'gym' },
    [4]:  { icon: '⚽', label: '外场对抗', scene: 'pitch' },
  },
};

const WEEKLY_STRENGTH_LIMIT: Record<CalendarPhaseKey, number> = {
  regular_season: 1,
  preseason_build: 2,
  offseason: 3,
  playoffs: 1,
};

const CALENDAR_PHASE_META: Record<CalendarPhaseKey, { label: string; icon: string; color: string; defaultMode: 'gym' | 'football' }> = {
  regular_season: { label: '常规赛季', icon: '⚽', color: '#992828', defaultMode: 'football' },
  preseason_build: { label: '季前备战', icon: '🏋️', color: '#166534', defaultMode: 'football' },
  offseason: { label: '休赛期', icon: '🧊', color: '#374151', defaultMode: 'gym' },
  playoffs: { label: '附加赛', icon: '🏆', color: '#992828', defaultMode: 'football' },
};

function getMicrocycleDay(phaseKey: CalendarPhaseKey, dayOffset: number): MicrocycleDayInfo {
  const rules = MICROCYCLE_RULES[phaseKey];
  if (rules[dayOffset]) return rules[dayOffset];
  // fallback
  if (dayOffset === 0) return { icon: '⚽', label: '比赛日', scene: 'match' };
  if (dayOffset < 0) return { icon: '⚽', label: '外场训练', scene: 'pitch' };
  return { icon: '🏋️', label: '训练', scene: 'gym' };
}

// ── edit modal state ──
interface EditState {
  moduleType: string;
  category: string;
  index: number;
  exercise: any;
}

function DailyTrainingNotes({ matchDate, modules, setTrainingActive, trainingStartRef }: {
    matchDate: string;
    modules: TrainingModule[];
    setTrainingActive: (v: boolean) => void;
    trainingStartRef: React.MutableRefObject<number>;
  }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // ── manual input state ──
  const [tactical, setTactical] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [saved, setSaved] = useState(false);

  // ── load existing notes on mount ──
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem('kenshin_structured_notes') || '{}');
      const today = all[todayStr];
      if (today) {
        setTactical(today.tactical || '');
        setCoachNotes(today.notes || '');
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── auto-read: warmup name from kenshin_warmup_calendar + kenshin_warmup_library ──
  const warmupName = (() => {
    try {
      const cal = JSON.parse(localStorage.getItem('kenshin_warmup_calendar') || '{}');
      const today = cal[todayStr];
      if (!today?.warmupId) return '';
      const lib = JSON.parse(localStorage.getItem('kenshin_warmup_library') || '[]');
      const w = lib.find((x: any) => x.id === today.warmupId);
      return w?.name || '';
    } catch { return ''; }
  })();

  // ── auto-read: strength plan name from kenshin_gym_calendar + kenshin_gym_library ──
  const strengthName = (() => {
    try {
      const cal = JSON.parse(localStorage.getItem('kenshin_gym_calendar') || '[]');
      if (!Array.isArray(cal)) return '';
      const entry = cal.find((e: any) => e.date === todayStr);
      if (!entry?.comboId) return '';
      const lib = JSON.parse(localStorage.getItem('kenshin_gym_library') || '[]');
      const w = lib.find((x: any) => x.id === entry.comboId);
      return w?.name || '';
    } catch { return ''; }
  })();

  // ── auto-read: match state if today is match day ──
  const matchInfo = (() => {
    try {
      const state = JSON.parse(localStorage.getItem('kenshin_match_state') || 'null');
      if (!state || !state.startedAt) return '';
      const stateDate = state.startedAt.slice(0, 10);
      if (stateDate !== todayStr) return '';
      const parts: string[] = [];
      if (state.matchType) parts.push(state.matchType);
      if (state.matchName) parts.push(state.matchName);
      if (state.players?.length) parts.push(`${state.players.length}人`);
      return parts.join(' · ');
    } catch { return ''; }
  })();

  // ── save to kenshin_structured_notes ──
  const handleSave = () => {
    try {
      const all = JSON.parse(localStorage.getItem('kenshin_structured_notes') || '{}');
      all[todayStr] = {
        warmup: warmupName,
        tactical,
        strength: strengthName,
        match: matchInfo,
        notes: coachNotes,
      };
      localStorage.setItem('kenshin_structured_notes', JSON.stringify(all));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  return (
    <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl p-4">
      <h3 className="text-xs font-semibold text-[#999] mb-3">今日训练笔记</h3>

      <div className="space-y-3 text-xs">
        {/* ── warmup: auto-read ── */}
        <div className="flex gap-2 items-start">
          <span className="text-[#888] shrink-0 w-[72px]">热身内容:</span>
          <span className={warmupName ? 'text-[#ccc]' : 'text-[#666]'}>{warmupName || '（未绑定热身方案）'}</span>
        </div>

        {/* ── tactical: manual input ── */}
        <div className="flex gap-2 items-start">
          <span className="text-[#888] shrink-0 w-[72px] pt-2">战术内容:</span>
          <textarea
            value={tactical}
            onChange={e => setTactical(e.target.value)}
            placeholder="今天练了什么战术/SSG/定位球"
            className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#992828] resize-none min-h-[56px]"
            rows={2}
          />
        </div>

        {/* ── strength: auto-read ── */}
        <div className="flex gap-2 items-start">
          <span className="text-[#888] shrink-0 w-[72px]">力量内容:</span>
          <span className={strengthName ? 'text-[#ccc]' : 'text-[#666]'}>{strengthName || '（今日无力量房排课）'}</span>
        </div>

        {/* ── match: auto-read if match day ── */}
        <div className="flex gap-2 items-start">
          <span className="text-[#888] shrink-0 w-[72px]">比赛数据:</span>
          <span className={matchInfo ? 'text-[#992828]' : 'text-[#777]'}>{matchInfo || '（非比赛日）'}</span>
        </div>

        {/* ── coach notes: manual input ── */}
        <div className="flex gap-2 items-start">
          <span className="text-[#888] shrink-0 w-[72px] pt-2">教练备注:</span>
          <textarea
            value={coachNotes}
            onChange={e => setCoachNotes(e.target.value)}
            placeholder="其他补充说明..."
            className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#992828] resize-none min-h-[48px]"
            rows={2}
          />
        </div>

        {/* ── divider + save button ── */}
        <div className="border-t border-[#2c2c2c] pt-3 flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-lg text-xs font-bold transition active:scale-[0.98]"
          >
            {saved ? '✓ 已保存' : '保存笔记'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CoachWorkbench() {
  const { modules, planId, generate, loadModules, isOffline } = useTraining();
  const [workbenchMode, setWorkbenchMode] = useState<'gym' | 'football'>('football');
  const [trainDate, setTrainDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon'>(new Date().getHours() < 12 ? 'morning' : 'afternoon');
  const [scene, setScene] = useState<'gym' | 'pitch'>('gym');
  const [goal, setGoal] = useState('strength');
  const [duration, setDuration] = useState(60);
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
  const [addonScene, setAddonScene] = useState<'gym' | 'pitch'>('gym');
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
  }, []);
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
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
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
  const [trainingRoster, setTrainingRoster] = useState<{id: string; name: string}[]>([]);

  function loadTrainingRoster(): {id: string; name: string}[] {
    if (typeof window === 'undefined') return [];
    try {
      let raw = localStorage.getItem('kenshin_roster');
      if (!raw) raw = localStorage.getItem('roster_players');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  // Initialize training attendees from roster on mount
  useEffect(() => {
    const roster = loadTrainingRoster();
    setTrainingRoster(roster);
    setTrainingAttendees(new Set(roster.map(p => p.name)));
  }, []);

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
    reds: players.filter(p => p.status === 'red').length,
  }), [players]);
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

  // ── Team recovery score ──
  const recoveryScore = useMemo(() => {
    const input: RecoveryInput = {
      lastSessionRPE: null,
      lastSessionDate: null,
      sleepHours: null,
      sleepQuality: null,
      morningHR: null,
      restingHR: null,
      muscleSoreness: null,
      stressLevel: null,
      acwr: teamACWR?.acwr ?? null,
      hoursSinceLastSession: null,
    };
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
          trainingDuration: duration, playerCount: selectedRosterPlayers.length,
        };
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
    return {
      role: 'coach', name: '', gender: 'male', position: null,
      age: null, height: null, weight: null, years: null,
      injuryHistory: `${playerLabel}: ${injuryList.join('、')} | 禁用动作: ${allDisabled.join(',')} | ACWR预警: ${acwrWarnings.join('; ')}`,
      goal: goal as TrainingGoal, phase,
      injurySites: [], weakness: '',
      coachCert: coachCert as any, coachRole: coachRole as any, leagueTag: leagueTag as any,
      tacticalThemes: [], equipmentAvailable: [],
      trainingDuration: duration, playerCount,
    };
  }, [players, goal, phase, coachCert, coachRole, leagueTag, duration, playerCount, selectedPlayers, planMode, addonTheme, addonScene]);

  // ── generate ──
  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    setShowPlan(true);
    setWorkoutTimerActive(true);

    // Auto-save to daily training log for load management
    const date = trainDate;
    const trainType = workbenchMode === 'football' ? 'pitch' : 'gym';
    const attendeeNames = Array.from(trainingAttendees);
    try {
      const logs = JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]");
      const existing = logs.findIndex((l: any) => l.date === date);
      const entry = { date, trainType, timeSlot, duration: 0, weather, savedAt: new Date().toISOString(), players: attendeeNames };
      if (existing >= 0) logs[existing] = entry;
      else logs.unshift(entry);
      localStorage.setItem("kenshin_daily_training_log", JSON.stringify(logs.slice(0, 100)));
    } catch {}

    // Save estimated TRIMP for each attending player
    if (attendeeNames.length > 0) {
      try {
        const trimpMultiplier = trainType === 'pitch' ? 2.5 : 2.0;
        const perPlayerTRIMP = Math.round((duration * trimpMultiplier) / attendeeNames.length);
        const existingTRIMP = JSON.parse(localStorage.getItem("kenshin_player_trimp") || "[]");
        const savedAt = new Date().toISOString();
        for (const playerName of attendeeNames) {
          existingTRIMP.push({ playerName, date, trimp: perPlayerTRIMP, trainType, savedAt, estimated: true });
        }
        localStorage.setItem("kenshin_player_trimp", JSON.stringify(existingTRIMP.slice(-500)));
      } catch {}
    }

    // Notify load management page to refresh
    window.dispatchEvent(new CustomEvent('training-log-updated'));

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
        savedAt: new Date().toISOString(),
      });
    }
  }, [generating, modules.length]);

  // ── load plan for a microcycle day ──
  const loadPlanForDay = useCallback((dayOffset: number) => {
    const plan = getMicrocyclePlan(matchDate, dayOffset);
    if (plan) {
      loadModules(plan.modules, plan.formData);
      setScene(plan.scene as 'gym' | 'pitch');
      setGoal(plan.goal);
      setDuration(plan.duration);
      setPhase(plan.phase as SeasonPhase);
      setShowPlan(true);
      setActiveDayOffset(dayOffset);
    } else {
      const rec = getMDRecommendation(dayOffset);
      setScene(rec.scene);
      setGoal(rec.goal);
      setActiveDayOffset(dayOffset);
      setShowPlan(false);
    }
  }, [matchDate, loadModules]);

  // ── Quick actions ──
  const reuseLastWeek = useCallback(() => {
    const lastWeekMatchDate = dateStr(fmt(new Date(matchDate), -7));
    const plan = getMicrocyclePlan(lastWeekMatchDate, mdDay);
    if (plan) {
      loadModules(plan.modules, plan.formData);
      setScene(plan.scene as 'gym' | 'pitch');
      setGoal(plan.goal);
      setDuration(plan.duration);
      setPhase(plan.phase as SeasonPhase);
      setShowPlan(true);
      setActiveDayOffset(mdDay);
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
      savedAt: new Date().toISOString(),
    });

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
          <span className="text-xl">{calendarPhaseMeta?.icon || ''}</span>
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
          (workbenchMode === 'gym' && tp.scene === 'gym')
        ) ? tp : null;
        if (!matchPlan) return (
          <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <span className="text-sm font-bold text-[#F1F1F1]">暂无{workbenchMode === 'football' ? '外场' : '力量'}预排方案</span>
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
          }`}>⚽ 足球训练
          {workbenchMode === 'football' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#992828] rounded-full" />}
        </button>
        <button onClick={() => setWorkbenchMode('gym')}
          className={`flex-1 py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 relative ${
            workbenchMode === 'gym' ? 'bg-[#171717] text-[#992828]' : 'bg-[#171717] text-[#888] hover:text-[#aaa]'
          }`}>🏋️ 力量房
          {workbenchMode === 'gym' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#992828] rounded-full" />}
        </button>
      </div>

      {/* ── 训练日期 + 类型 + 时段 ── */}
      <div className="flex items-center gap-2 bg-[#141414] border border-[#2c2c2c] rounded-xl p-2.5 flex-wrap">
        <input type="date" value={trainDate} onChange={e => setTrainDate(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-white focus:border-[#992828] outline-none" />
        <span className="text-xs font-bold text-[#F1F1F1]">{workbenchMode === 'football' ? '⚽ 外场' : '🏋️ 力量房'}</span>
        <span className="text-[#555]">|</span>
        <a href="/planning" className="text-[10px] px-2 py-1 rounded bg-[#1a1a1a] border border-[#333] text-[#888] hover:text-white no-underline">提前排课</a>
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
                        }`}>{p.name} · {p.position || '?'}
                        {p.injuryStatus !== 'healthy' && (p.injuryStatus === 'out' ? ' 🔴' : ' 🟡')}
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

        {/* Row 3: Training type indicator */}
        <div className="flex items-center gap-2 p-2.5 bg-[#1a1a1a] rounded-lg">
          <span className="text-[10px] text-gray-500">训练:</span>
          <span className="text-xs font-bold text-white">{workbenchMode === 'football' ? '外场训练' : '力量房'} · {duration}min</span>
          {recoveryScore.adjustments.length > 0 && (
            <span className="text-[9px] text-yellow-400/80 truncate max-w-[240px]">
              ⚠ {recoveryScore.adjustments[0]}
            </span>
          )}
        </div>

        {/* ── 参训球员选择器 (collapsible) ── */}
        <div className="bg-[#1a1a1a] border border-[#2c2c2c] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowAttendeeSelector(!showAttendeeSelector)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-[#222] transition"
          >
            <span className="text-[#ccc] font-medium">
              参训球员 <span className="text-[#992828]">{trainingAttendees.size}人</span>
            </span>
            <span className="text-gray-500 text-[10px] transition-transform duration-200" style={{ transform: showAttendeeSelector ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </button>
          {showAttendeeSelector && (
            <div className="px-3 pb-3 border-t border-[#2c2c2c]">
              <div className="flex items-center gap-2 mt-2 mb-2">
                <button
                  onClick={() => setTrainingAttendees(new Set(trainingRoster.map(p => p.name)))}
                  className="text-[10px] px-2 py-1 rounded bg-[#222] text-[#888] hover:text-white hover:bg-[#333] transition"
                >全选</button>
                <button
                  onClick={() => setTrainingAttendees(new Set())}
                  className="text-[10px] px-2 py-1 rounded bg-[#222] text-[#888] hover:text-white hover:bg-[#333] transition"
                >全不选</button>
              </div>
              {trainingRoster.length === 0 ? (
                <p className="text-[10px] text-gray-600 py-1">暂无花名册数据</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                  {trainingRoster.map(p => (
                    <label key={p.id} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded cursor-pointer transition ${
                      trainingAttendees.has(p.name)
                        ? 'bg-[#992828]/15 text-[#992828] ring-1 ring-[#992828]/40'
                        : 'bg-[#111] text-[#888] hover:text-[#aaa]'
                    }`}>
                      <input
                        type="checkbox"
                        checked={trainingAttendees.has(p.name)}
                        onChange={() => {
                          setTrainingAttendees(prev => {
                            const next = new Set(prev);
                            if (next.has(p.name)) next.delete(p.name);
                            else next.add(p.name);
                            return next;
                          });
                        }}
                        className="accent-[#992828] w-3 h-3"
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
          ADVANCED SETTINGS (collapsible)
          ═══════════════════════════════════════════════ */}
      <details className="bg-[#141414] border border-[#2c2c2c] rounded-xl" open={showAdvanced}
        onToggle={e => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer text-[10px] text-[#888] p-3 hover:text-[#aaa] select-none">
          高级设置: {SCENE_LABELS[scene]} · {GOAL_LABELS[goal] || goal} · {duration}min · {PHASE_LABELS[phase]}
        </summary>
        <div className="px-3 pb-3 space-y-3">

          {/* Scene + Goal selectors */}
          <div>
            <div className="grid grid-cols-1 gap-3 mb-3">
              {SCENES.filter(s => s.id === 'pitch').map(s => (
                <button key={s.id} onClick={() => { setScene(s.id); setGoal(SCENE_GOALS[s.id][0].id); }}
                  className={`p-4 rounded-xl border text-left transition ${
                    scene === s.id ? 'border-[#992828] bg-[#992828]/5' : 'border-[#2c2c2c] bg-[#111] hover:border-[#3d3d3d]'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{s.icon}</span>
                    <span className={`text-sm font-bold ${scene === s.id ? 'text-[#992828]' : 'text-[#F1F1F1]'}`}>{s.label}</span>
                  </div>
                  <p className="text-[10px] text-[#888]">{s.desc}</p>
                  <p className="text-[9px] text-gray-600 mt-1">{s.hint}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-gray-500">目标</span>
              <div className="flex gap-1">
                {(SCENE_GOALS[scene] || []).map(g => (
                  <button key={g.id} onClick={() => setGoal(g.id)}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition ${
                      goal === g.id ? 'bg-[#992828] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-white'
                    }`}>{g.label}</button>
                ))}
              </div>
              <span className="text-[10px] text-gray-500 ml-3">时长</span>
              <div className="flex gap-1">
                {(planMode === 'individual' ? ADDON_DURATIONS : DURATIONS).map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition ${duration === d ? 'bg-[#992828] text-white' : 'bg-[#1a1a1a] text-[#888]'}`}>{d}min</button>
                ))}
              </div>
            </div>
          </div>

          {/* Match date */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-gray-500">比赛日</label>
            <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-xs text-white" />
          </div>

          {/* Periodization live params */}
          {(() => {
            const pp = getPhaseParams(phase);
            const gp = getGoalParams(goal);
            return (
              <div className="bg-[#111] border border-[#2c2c2c] rounded-xl p-3 text-[10px]">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#888]">
                  <span className="text-[#999]">周期化参考</span>
                  <span><b className="text-[#F1F1F1]">{pp.labelCn}</b>: {pp.intensityPercent[0]}-{pp.intensityPercent[1]}%1RM · {pp.repsRange[0]}-{pp.repsRange[1]}次 · {pp.setsRange[0]}-{pp.setsRange[1]}组 · 间歇{pp.restBetweenSets[0]}-{pp.restBetweenSets[1]}s</span>
                  {gp && (
                    <span className="text-[#992828]">🎯 {gp.labelCn}: {gp.percent1RM[0]}-{gp.percent1RM[1]}%1RM · {gp.setsReps} · 间歇{gp.rest} · 节奏{gp.tempo}</span>
                  )}
                  <span className="text-[#777]">每周{pp.weeklyFrequency}次 · {pp.volumeTrend === 'increasing' ? '↑增量' : pp.volumeTrend === 'tapering' ? '↓减量' : '→维持'}</span>
                </div>
              </div>
            );
          })()}

          {/* Player status details (team mode) */}
          {planMode === 'team' && (
          <div className="bg-[#111] border border-[#2c2c2c] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-[#ccc] font-semibold">球员状态管理</span>
              {players.length > 0 && (
                <>
                  <button onClick={selectAllHealthy} className="text-[10px] text-[#888] hover:text-white transition">全选健康</button>
                  <button onClick={() => setSelectedPlayers(new Set())} className="text-[10px] text-[#888] hover:text-white transition">清空</button>
                  {selectedPlayers.size > 0 && <span className="text-[10px] text-[#992828]">已选{selectedPlayers.size}人</span>}
                </>
              )}
            </div>
            {players.length === 0 ? (
              <p className="text-[10px] text-[#888]">暂无花名册数据 · <a href="/roster" className="text-[#992828] hover:underline">去录入球员</a></p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {players.map(p => (
                  <button key={p.name} onClick={() => togglePlayerSelect(p.name)}
                    className={`text-[10px] px-2 py-1 rounded transition ${
                      selectedPlayers.has(p.name) ? 'bg-[#992828]/15 text-[#992828] ring-1 ring-[#992828]/40' : 'bg-[#1a1a1a] text-[#888] hover:text-white'
                    }`}>
                    {p.name} {p.status !== 'green' && (p.status === 'red' ? '🔴' : '🟡')}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Coach settings */}
          <div className="bg-[#111] border border-[#2c2c2c] rounded-xl p-3 text-[10px]">
            <div className="text-[#888] mb-2">教练档案 · 队员{playerCount}人 · {leagueTag}</div>
            <div className="flex flex-wrap gap-2">
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
          </div>

        </div>
      </details>

      {/* ── 四大功能入口：热身设计 -> 场地训练监控 -> 热身方案库 ── */}
      <div className="space-y-3">
        <a href="/warmup" className="bg-[#171717] border border-[#2c2c2c] hover:border-[#3d3d3d] rounded-xl p-4 group transition no-underline block">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#F1F1F1] group-hover:text-white transition">热身设计</h3>
              <p className="text-[10px] text-[#888] mt-0.5">RAMP系统 · FIFA 11+ · 有球/无球</p>
            </div>
            <span className="text-[#555] group-hover:text-[#999] text-lg transition">&rarr;</span>
          </div>
        </a>
        <a href="/field" className="bg-[#171717] border border-[#992828]/30 hover:border-[#992828]/50 rounded-xl p-4 group transition no-underline block">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#992828] group-hover:text-[#b53a3a] transition">场地训练监控</h3>
              <p className="text-[10px] text-[#888] mt-0.5">SSG强度估算 · TRIMP · 战术录入</p>
            </div>
            <span className="text-[#555] group-hover:text-[#992828] text-lg transition">&rarr;</span>
          </div>
        </a>
        <a href="/warmup" className="bg-[#171717] border border-[#8b6914]/30 hover:border-[#8b6914]/50 rounded-xl p-4 group transition no-underline block">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#F1F1F1] group-hover:text-white transition">热身方案库</h3>
              <p className="text-[10px] text-[#888] mt-0.5">预设方案 · 快速调用 · 自定义组合</p>
            </div>
            <span className="text-[#555] group-hover:text-[#999] text-lg transition">&rarr;</span>
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
                  {SCENES.filter(s => s.id === 'pitch').map(s => (
                    <button key={s.id} onClick={() => { setScene(s.id); setGoal(SCENE_GOALS[s.id][0].id); }}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                        scene === s.id ? 'bg-[#992828] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-white'
                      }`}>{s.icon} {s.label}</button>
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
                <div className="text-sm mb-0.5">{dayInfo.icon}</div>

                {/* Short label */}
                <div className={`text-[8px] leading-tight ${
                  isMatch ? 'text-[#aaa]' :
                  isToday ? 'text-[#ccc]' :
                  isPast ? 'text-[#666]' :
                  'text-[#777]'
                }`}>
                  {hasPlan && <span className="text-[#992828]">已排</span>}
                  {!hasPlan && dayInfo.icon}
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

      <AIAssistant />

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
          onClose={() => {
            setTrainingActive(false);
            const elapsedMin = Math.round((Date.now() - trainingStartRef.current) / 60000);
            if (elapsedMin > 0) {
              const date = trainDate;
              const trainType = workbenchMode === 'football' ? 'pitch' : 'gym';
              try {
                const logs = JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]");
                const existing = logs.findIndex((l: any) => l.date === date);
                if (existing >= 0) { logs[existing].duration = elapsedMin; logs[existing].savedAt = new Date().toISOString(); logs[existing].weather = weather; }
                else {
                  logs.unshift({ date, trainType, timeSlot, duration: elapsedMin, weather, savedAt: new Date().toISOString() });
                }
                localStorage.setItem("kenshin_daily_training_log", JSON.stringify(logs.slice(0, 100)));
              } catch {}

              // Update individual TRIMP with actual duration
              const attendeeNames = Array.from(trainingAttendees);
              if (attendeeNames.length > 0) {
                try {
                  const trimpMultiplier = trainType === 'pitch' ? 2.5 : 2.0;
                  const perPlayerTRIMP = Math.round((elapsedMin * trimpMultiplier) / attendeeNames.length);
                  let existingTRIMP = JSON.parse(localStorage.getItem("kenshin_player_trimp") || "[]");
                  // Remove estimated entries for this date
                  existingTRIMP = existingTRIMP.filter((e: any) => !(e.date === date && e.estimated));
                  const savedAt = new Date().toISOString();
                  for (const playerName of attendeeNames) {
                    existingTRIMP.push({ playerName, date, trimp: perPlayerTRIMP, trainType, savedAt });
                  }
                  localStorage.setItem("kenshin_player_trimp", JSON.stringify(existingTRIMP.slice(-500)));
                } catch {}
              }

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
            rpe: editState.exercise?.rpe || 7,
          }}
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

      {/* ═══════════════════════════════════════════════
          NOTES DRAWER — floating button + slide-out panel
          ═══════════════════════════════════════════════ */}
      {/* Floating trigger button */}
      <button
        onClick={() => setShowNotesDrawer(true)}
        className="fixed left-0 top-1/3 w-10 h-10 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-r-full flex items-center justify-center shadow-lg z-40 transition active:scale-95"
        title="训练笔记"
      >
        <span className="text-sm">笔记</span>
      </button>

      {/* Slide-out drawer + overlay */}
      {showNotesDrawer && (
        <>
          {/* Semi-transparent backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowNotesDrawer(false)}
          />

          {/* Drawer panel */}
          <div className="fixed left-0 top-0 h-full w-[380px] max-w-[100vw] z-50 bg-[#0A0A0A] border-r border-[#2c2c2c] shadow-2xl overflow-y-auto">
            {/* Drawer header */}
            <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#2c2c2c] p-4 flex items-center justify-between z-10">
              <h3 className="text-sm font-bold text-white">训练笔记</h3>
              <button
                onClick={() => setShowNotesDrawer(false)}
                className="w-8 h-8 rounded-full bg-[#1a1a1a] hover:bg-[#333] text-gray-400 hover:text-white flex items-center justify-center transition text-sm"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            {/* Drawer body — DailyTrainingNotes inline */}
            <div className="p-4">
              <DailyTrainingNotes
                matchDate={matchDate}
                modules={modules}
                setTrainingActive={setTrainingActive}
                trainingStartRef={trainingStartRef}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
