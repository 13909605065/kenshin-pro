"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Activity, TrendingUp, AlertTriangle, User, CheckCircle2, BarChart3 } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import WeeklyLoadBar from "@/components/WeeklyLoadBar";

const WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

type PhaseKey = 'offseason' | 'preseason_build' | 'regular_season' | 'playoffs';

const PHASE_INFO: Record<PhaseKey, { label: string; icon: string; color: string; weekCap: number; dayCap: number; matchWeekCap: number }> = {
  offseason:     { label: '休赛期', icon: '🧊', color: '#374151', weekCap: 1000, dayCap: 180, matchWeekCap: 1000 },
  preseason_build: { label: '季前备战期', icon: '🏋️', color: '#166534', weekCap: 1500, dayCap: 300, matchWeekCap: 1200 },
  regular_season:  { label: '常规赛季', icon: '⚽', color: '#991b1b', weekCap: 1400, dayCap: 280, matchWeekCap: 1000 },
  playoffs:       { label: '附加赛', icon: '🏆', color: '#7f1d1d', weekCap: 1100, dayCap: 220, matchWeekCap: 800 },
};

// ═══ Position baseline for match deficit ═══
const POSITION_BASELINE: Record<string, { trimp: number; distance: number }> = {
  midfielder:    { trimp: 120, distance: 11000 },
  wingback:      { trimp: 100, distance: 10000 },
  winger:        { trimp: 100, distance: 10000 },
  forward:       { trimp: 90,  distance: 9000 },
  center_forward:{ trimp: 90,  distance: 9000 },
  striker:       { trimp: 90,  distance: 9000 },
  defender:      { trimp: 85,  distance: 9000 },
  center_back:   { trimp: 85,  distance: 9000 },
  goalkeeper:    { trimp: 60,  distance: 4000 },
};

function getPositionGroup(pos: string): string {
  const p = pos.toLowerCase();
  if (p === 'midfielder') return '中场';
  if (p === 'wingback' || p === 'winger') return '边路';
  if (p === 'forward' || p === 'center_forward' || p === 'striker') return '前锋';
  if (p === 'defender' || p === 'center_back') return '后卫';
  if (p === 'goalkeeper') return '门将';
  return pos || '未知';
}

function getBaseline(pos: string): { trimp: number; distance: number } {
  return POSITION_BASELINE[pos.toLowerCase()] || { trimp: 90, distance: 9000 };
}

/** Safe localStorage read */
function readLS<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

// ═══ Player TRIMP entry type ═══
interface PlayerTRIMPEntry {
  playerName: string;
  date: string;       // YYYY-MM-DD
  trimp: number;
  trainType: string;
  savedAt: string;
}

// ═══ Match player from match_state ═══
interface MatchPlayerData {
  id: string;
  name: string;
  number: string;
  position: string;
  status: string;
  timeOnField: number; // seconds
  entries?: { in: number; out: number | null }[];
  notes?: string;
}

interface MatchStateData {
  matchType?: string;
  matchName?: string;
  totalTime: number;
  players?: MatchPlayerData[];
  startedAt?: string | null;
}

// ═══ Roster player ═══
interface RosterPlayer {
  id: string;
  name: string;
  position: string;
  number: string;
  age?: number | null;
  injuryStatus?: string;
}

export default function LoadPage() {
  const router = useRouter();

  // Auto-refresh when training/match data changes
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('training-log-updated', handler);
    window.addEventListener('storage', handler); // cross-tab
    return () => {
      window.removeEventListener('training-log-updated', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // Read season phase
  const info = useMemo(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem("kenshin_season_calendar");
      if (!raw) return null;
      const ranges = JSON.parse(raw).phaseRanges || [];
      const p = ranges.find((r: any) => today >= r.startDate && today <= r.endDate);
      if (p && PHASE_INFO[p.phase as PhaseKey]) return PHASE_INFO[p.phase as PhaseKey];
    } catch {}
    return null;
  }, [refreshKey]);

  // Current phase date range (separate from info to capture dates)
  const currentPhaseRange = useMemo(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem("kenshin_season_calendar");
      if (!raw) return null;
      const ranges = JSON.parse(raw).phaseRanges || [];
      const p = ranges.find((r: any) => today >= r.startDate && today <= r.endDate);
      if (p) return { startDate: p.startDate, endDate: p.endDate, phase: p.phase as PhaseKey };
    } catch {}
    return null;
  }, [refreshKey]);

  // MD calc
  const matchDate = (() => { try { return localStorage.getItem('kenshin_coach_matchDate') || new Date().toISOString().slice(0, 10); } catch { return new Date().toISOString().slice(0, 10); }})();
  const mdDay = (() => { try { const m = new Date(matchDate + 'T00:00:00'); const n = new Date(); return Math.ceil((m.getTime() - n.getTime()) / 86400000); } catch { return 7; }})();

  // Is this a match week?
  const isMatchWeek = mdDay >= -1 && mdDay <= 6;
  const weekCap = info ? (isMatchWeek ? info.matchWeekCap : info.weekCap) : 1500;
  const dayCap = info ? info.dayCap : 300;

  // Weather adjustment: rain reduces load cap by 10% (higher HR in hot/humid conditions)
  const todayWeather = useMemo(() => {
    try {
      const logs = JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]");
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayLog = logs.find((l: any) => l.date === todayStr);
      return todayLog?.weather || null;
    } catch { return null; }
  }, [refreshKey]);
  const weatherLabel = todayWeather === 'rain' ? '🌧️ 雨天' : todayWeather === 'cloud' ? '⛅ 阴天' : todayWeather === 'sun' ? '☀️ 晴天' : '';
  const weatherAdjustedDayCap = todayWeather === 'rain' ? Math.round(dayCap * 0.9) : dayCap;
  const weatherAdjustedWeekCap = todayWeather === 'rain' ? Math.round(weekCap * 0.9) : weekCap;

  // Read logs
  const logs = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]"); }
    catch { return []; }
  }, [refreshKey]);

  // This week
  const { weekDays, usedTRIMP, remainingTRIMP, pct } = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    const days: any[] = [];
    let used = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = d.toISOString().slice(0, 10);
      const log = logs.find((l: any) => l.date === ds);
      const isRest = log?.timeSlot === 'rest';
      const estTRIMP = log && !isRest ? Math.round(log.duration * (log.trainType === 'pitch' ? 2.5 : 2.0)) : 0;
      const matchTRIMP = (() => {
        if (mdDay !== 0) return 0;
        try {
          const matchState = JSON.parse(localStorage.getItem('kenshin_match_state') || 'null');
          if (matchState?.totalTime) return Math.round(matchState.totalTime * 5);
        } catch {}
        return 0;
      })();
      const dayTRIMP = estTRIMP + matchTRIMP;
      used += dayTRIMP;
      days.push({ date: ds, day: WEEKDAY[d.getDay()], monthDay: `${d.getMonth()+1}/${d.getDate()}`, log, trimp: dayTRIMP, isRest, isToday: ds === new Date().toISOString().slice(0, 10) });
    }
    const remaining = Math.max(0, weatherAdjustedWeekCap - used);
    const pctVal = Math.min(100, Math.round((used / weatherAdjustedWeekCap) * 100));
    return { weekDays: days, usedTRIMP: used, remainingTRIMP: remaining, pct: pctVal };
  }, [logs, weatherAdjustedWeekCap]);

  // ═══════════════════════════════════════════
  // Muscle Group Load Heatmap
  // ═══════════════════════════════════════════

  /** Map exercise IDs → 8 main muscle groups */
  const EXERCISE_MUSCLE_GROUP: Record<string, string> = {
    // 股四头肌 — knee-dominant compound
    "barbell-back-squat": "股四头肌", "front-squat": "股四头肌", "goblet-squat": "股四头肌",
    "bulgarian-split-squat": "股四头肌", "split-squat": "股四头肌", "cossack-squat": "股四头肌",
    "sumo-squat": "股四头肌", "leg-press": "股四头肌", "lunge-squat": "股四头肌",
    "walking-lunge": "股四头肌", "lateral-lunge": "股四头肌", "dumbbell-lunges": "股四头肌",
    "kettlebell-goblet-split-squat": "股四头肌", "barbell-squat-jump": "股四头肌",
    "box-jump": "股四头肌", "squat-to-sprint": "股四头肌",
    // 腘绳肌 — hip-dominant RDLs + nordic
    "deadlift": "腘绳肌", "romanian-deadlift": "腘绳肌", "single-leg-rdl": "腘绳肌",
    "kettlebell-single-leg-rdl": "腘绳肌", "nordic-hamstring-curl": "腘绳肌",
    "hamstring-glute-bridge": "腘绳肌",
    // 臀大肌 — hip thrusts/bridges + swing
    "barbell-hip-thrust": "臀大肌", "weighted-glute-bridge": "臀大肌",
    "single-leg-glute-bridge": "臀大肌", "kneeling-hip-extension": "臀大肌",
    "rapid-hip-thrust": "臀大肌", "kettlebell-swing": "臀大肌",
    // 胸大肌 — horizontal push + chest fly
    "bench-press": "胸大肌", "dumbbell-bench-press": "胸大肌", "push-up": "胸大肌",
    "dynamic-pushup": "胸大肌", "wide-pushup": "胸大肌", "single-leg-db-bench-press": "胸大肌",
    "lying-med-ball-chest-push": "胸大肌", "cable-chest-fly": "胸大肌",
    // 背阔肌 — horizontal pull + vertical pull
    "bent-over-row": "背阔肌", "cable-row": "背阔肌", "dumbbell-row": "背阔肌",
    "inverted-row": "背阔肌", "trx-row": "背阔肌", "pull-up": "背阔肌", "lat-pulldown": "背阔肌",
    // 三角肌 — vertical push + shoulder isolation
    "overhead-press": "三角肌", "dumbbell-shoulder-press": "三角肌",
    "single-arm-kettlebell-press": "三角肌", "face-pull": "三角肌", "band-face-pull": "三角肌",
    "med-ball-overhead-slam": "三角肌",
    // 核心
    "plank": "核心", "dead-bug": "核心", "bird-dog": "核心", "copenhagen-plank": "核心",
    "russian-twist": "核心", "bosu-russian-twist": "核心", "v-up": "核心",
    "opposite-arm-leg-raise": "核心", "adductor-raise": "核心", "plank-shoulder-tap": "核心",
    "saw-plank": "核心", "hollow-body-hold": "核心", "side-plank": "核心",
    "banded-plank-variation": "核心", "sit-up": "核心", "pallof-press": "核心",
    // 小腿
    "seated-calf-raise": "小腿", "standing-calf-raise": "小腿", "rapid-calf-raise": "小腿",
    // Other → map to closest group
    "tricep-pushdown": "三角肌", "farmers-walk": "背阔肌",
  };

  const MUSCLE_GROUP_NAMES = ["股四头肌", "腘绳肌", "臀大肌", "胸大肌", "背阔肌", "三角肌", "核心", "小腿"];
  const WEEKLY_MUSCLE_MAX = 6; // max direct exercises per muscle group per week

  const muscleHeatmap = useMemo(() => {
    try {
      const cal = JSON.parse(localStorage.getItem('kenshin_gym_calendar') || '[]');
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      // Filter this week's gym calendar entries
      const weekEntries = cal.filter((e: any) => {
        const d = e.date;
        return d >= monday.toISOString().slice(0, 10) && d <= sunday.toISOString().slice(0, 10);
      });

      // Count exercises per muscle group
      const counts: Record<string, number> = {};
      MUSCLE_GROUP_NAMES.forEach(g => { counts[g] = 0; });

      weekEntries.forEach((entry: any) => {
        (entry.exerciseIds || []).forEach((eid: string) => {
          const group = EXERCISE_MUSCLE_GROUP[eid];
          if (group && counts[group] !== undefined) {
            counts[group]++;
          }
        });
      });

      // Build heatmap rows
      const rows = MUSCLE_GROUP_NAMES.map(name => {
        const count = counts[name] || 0;
        const pct = Math.min(100, Math.round((count / WEEKLY_MUSCLE_MAX) * 100));
        let level: 'high' | 'medium' | 'low' = 'low';
        if (pct > 80) level = 'high';
        else if (pct >= 50) level = 'medium';
        return { name, count, pct, level };
      });

      // Find highest and lowest
      const maxCount = Math.max(...rows.map(r => r.count), 0);
      const minCount = Math.min(...rows.map(r => r.count), 0);
      const highest = rows.filter(r => r.count === maxCount && maxCount > 0).map(r => r.name);
      const lowest = rows.filter(r => r.count === minCount).map(r => r.name);

      return { rows, highest, lowest, hasData: weekEntries.length > 0, totalExercises: Object.values(counts).reduce((a, b) => a + b, 0) };
    } catch {
      return { rows: MUSCLE_GROUP_NAMES.map(name => ({ name, count: 0, pct: 0, level: 'low' as const })), highest: [], lowest: [], hasData: false, totalExercises: 0 };
    }
  }, [refreshKey]);

  // Today's date string and training info for team overview
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY[d.getDay()]}`;
  }, []);

  const todayTraining = useMemo(() => weekDays.find((d: any) => d.isToday) || null, [weekDays]);

  // ── Last training record date (data integrity indicator) ──
  const lastRecord = useMemo(() => {
    try {
      const raw = localStorage.getItem("kenshin_daily_training_log");
      if (!raw) return null;
      const logs = JSON.parse(raw);
      if (!Array.isArray(logs) || logs.length === 0) return null;
      // Find the latest non-rest entry with actual duration
      const latestLog = logs.find((l: any) => l.timeSlot !== 'rest' && l.duration > 0);
      if (!latestLog) return null;
      const logDate = new Date(latestLog.date + "T00:00:00");
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const daysAgo = Math.round((now.getTime() - logDate.getTime()) / 86400000);
      const timeStr = latestLog.savedAt
        ? new Date(latestLog.savedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
        : "";
      const dateLabel = `${logDate.getMonth() + 1}月${logDate.getDate()}日`;
      return {
        dateLabel,
        timeStr,
        daysAgo,
        isToday: daysAgo === 0,
        needsWarning: daysAgo > 2,
      };
    } catch {
      return null;
    }
  }, [refreshKey]);

  const statusEmoji = pct >= 90 ? '🔴' : pct >= 70 ? '🟡' : '🟢';
  const statusText = pct >= 90 ? '超负荷' : pct >= 70 ? '关注' : '安全';

  // ═══════════════════════════════════════════
  // Section 1: Single Player Load
  // ═══════════════════════════════════════════
  const [selectedPlayer, setSelectedPlayer] = useState<string>("__all__");

  // Read all player TRIMP data
  const allPlayerTRIMP = useMemo<PlayerTRIMPEntry[]>(() => {
    return readLS<PlayerTRIMPEntry[]>('kenshin_player_trimp', []);
  }, [refreshKey]);

  // Read roster
  const roster = useMemo<RosterPlayer[]>(() => {
    return readLS<RosterPlayer[]>('roster_players', []);
  }, [refreshKey]);

  // Roster injury stats for team overview
  const rosterStats = useMemo(() => {
    const healthy = roster.filter(p => p.injuryStatus === 'healthy').length;
    const minor = roster.filter(p => p.injuryStatus === 'minor').length;
    const out = roster.filter(p => p.injuryStatus === 'out').length;
    return { healthy, minor, out, total: roster.length };
  }, [roster]);

  // Build player list from roster + TRIMP data
  const playerList = useMemo(() => {
    const names = new Set<string>();
    roster.forEach(p => { if (p.name) names.add(p.name); });
    allPlayerTRIMP.forEach(e => { if (e.playerName) names.add(e.playerName); });
    return Array.from(names).sort();
  }, [roster, allPlayerTRIMP]);

  // Get position for a player from roster
  const getPlayerPosition = useCallback((playerName: string): string => {
    const p = roster.find(r => r.name === playerName);
    return p?.position || '';
  }, [roster]);

  // Compute single-player data
  const singlePlayerData = useMemo(() => {
    if (selectedPlayer === '__all__') return null;

    const entries = allPlayerTRIMP
      .filter(e => e.playerName === selectedPlayer)
      .sort((a, b) => b.date.localeCompare(a.date)); // newest first

    if (entries.length === 0) return null;

    // Group by date, sum trimp
    const byDate = new Map<string, number>();
    entries.forEach(e => {
      byDate.set(e.date, (byDate.get(e.date) || 0) + e.trimp);
    });

    // Last 7 days (today back to 6 days ago)
    const today = new Date();
    const last7Days: { date: string; day: string; trimp: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      last7Days.push({
        date: ds,
        day: WEEKDAY[d.getDay()],
        trimp: byDate.get(ds) || 0,
      });
    }

    // Last 4 weeks TRIMP totals (for trend and ACWR)
    const weekTotals: { label: string; total: number }[] = [];
    const allDates = Array.from(byDate.keys()).sort();
    for (let w = 3; w >= 0; w--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      let weekTotal = 0;
      allDates.forEach(ds => {
        if (ds >= weekStart.toISOString().slice(0, 10) && ds <= weekEnd.toISOString().slice(0, 10)) {
          weekTotal += byDate.get(ds) || 0;
        }
      });
      weekTotals.push({
        label: `${weekStart.getMonth()+1}/${weekStart.getDate()}-${weekEnd.getMonth()+1}/${weekEnd.getDate()}`,
        total: weekTotal,
      });
    }

    // ACWR: acute (current week) / chronic (avg of last 4 weeks)
    const currentWeekTRIMP = weekTotals[weekTotals.length - 1]?.total || 0;
    const acuteAvg = currentWeekTRIMP / 7;
    const chronicAvg28 = weekTotals.reduce((s, w) => s + w.total, 0) / 28;
    const acwr = chronicAvg28 > 0 ? acuteAvg / chronicAvg28 : 1;

    let acwrStatus: 'safe' | 'warning' | 'danger' = 'safe';
    let acwrMessage = '';
    if (acwr > 1.5) {
      acwrStatus = 'danger';
      acwrMessage = `ACWR=${acwr.toFixed(1)}，受伤风险显著升高，建议减量`;
    } else if (acwr > 1.3) {
      acwrStatus = 'warning';
      acwrMessage = `ACWR=${acwr.toFixed(1)}，负荷偏高，关注恢复`;
    } else if (acwr < 0.8) {
      acwrStatus = 'warning';
      acwrMessage = `ACWR=${acwr.toFixed(1)}，训练量可能不足`;
    } else {
      acwrMessage = `ACWR=${acwr.toFixed(1)}，负荷在安全区间`;
    }

    // Alerts
    const dailyAlerts: { date: string; day: string; trimp: number; level: 'yellow' | 'red' }[] = [];
    last7Days.forEach(d => {
      if (d.trimp > dayCap) dailyAlerts.push({ ...d, level: 'red' });
      else if (d.trimp > dayCap * 0.8) dailyAlerts.push({ ...d, level: 'yellow' });
    });
    const weekAlert = currentWeekTRIMP > weekCap ? 'red' : currentWeekTRIMP > weekCap * 0.8 ? 'yellow' : null;

    const maxWeekTotal = Math.max(...weekTotals.map(w => w.total), 1);

    return {
      entries,
      last7Days,
      weekTotals,
      currentWeekTRIMP,
      acwr,
      acwrStatus,
      acwrMessage,
      dailyAlerts,
      weekAlert,
      maxWeekTotal,
    };
  }, [selectedPlayer, allPlayerTRIMP, dayCap, weekCap]);

  // ═══════════════════════════════════════════
  // Section 2: Match Deficit Supplement
  // ═══════════════════════════════════════════
  const [completedSupplements, setCompletedSupplements] = useState<Record<string, boolean>>(() => {
    return readLS<Record<string, boolean>>('kenshin_supplement_completed', {});
  });

  const toggleCompleted = useCallback((playerName: string) => {
    setCompletedSupplements(prev => {
      const next = { ...prev, [playerName]: !prev[playerName] };
      try { localStorage.setItem('kenshin_supplement_completed', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const supplementData = useMemo(() => {
    const matchState = readLS<MatchStateData | null>('kenshin_match_state', null);
    if (!matchState || !matchState.players || matchState.players.length === 0) return null;

    interface SupplementRow {
      playerName: string;
      position: string;
      positionGroup: string;
      minutesOnField: number;
      benchmarkTRIMP: number;
      actualTRIMP: number;
      deficitTRIMP: number;
      deficitDistance: number;
      completed: boolean;
    }

    const rows: SupplementRow[] = [];

    matchState.players.forEach(mp => {
      const minutesOnField = Math.round(mp.timeOnField / 60);
      if (minutesOnField <= 0 && mp.status === 'bench') return; // skip bench players with 0 min

      const pos = mp.position || '';
      const baseline = getBaseline(pos);

      // Benchmark: position baseline × minutes/90
      const benchmarkTRIMP = Math.round(baseline.trimp * (minutesOnField / 90));

      // Actual: from player TRIMP entries on match day
      const matchDateISO = matchState.startedAt ? matchState.startedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const playerTRIMPEntries = readLS<PlayerTRIMPEntry[]>('kenshin_player_trimp', [])
        .filter(e => e.playerName === mp.name && e.date === matchDateISO);
      const actualTRIMP = playerTRIMPEntries.reduce((sum, e) => sum + e.trimp, 0);

      const deficitTRIMP = Math.max(0, benchmarkTRIMP - actualTRIMP);

      // Deficit distance: deficit * (distance / trimp ratio for position)
      const mPerTrimp = baseline.trimp > 0 ? baseline.distance / baseline.trimp : 100;
      const deficitDistance = Math.round(deficitTRIMP * mPerTrimp);

      rows.push({
        playerName: mp.name,
        position: pos,
        positionGroup: getPositionGroup(pos),
        minutesOnField,
        benchmarkTRIMP,
        actualTRIMP,
        deficitTRIMP,
        deficitDistance,
        completed: !!completedSupplements[mp.name],
      });
    });

    // Sort: players with deficit first, then by deficit desc
    rows.sort((a, b) => {
      const aEff = a.completed ? 1 : 0;
      const bEff = b.completed ? 1 : 0;
      if (aEff !== bEff) return aEff - bEff;
      return b.deficitTRIMP - a.deficitTRIMP;
    });

    const hasDeficit = rows.filter(r => r.deficitTRIMP > 0 && !r.completed);
    const totalWithDeficit = hasDeficit.length;

    return { rows, hasDeficit, totalWithDeficit };
  }, [completedSupplements, refreshKey]);

  return (
    <div className="min-h-screen bg-[#121212] p-4 pb-20">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-white font-bold text-lg">负荷管理</h1>
        {info && <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: info.color + '30', color: '#fff' }}>{info.icon} {info.label}</span>}
      </div>

      {/* ═══ LOAD CAPACITY CARD ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-bold text-white">周负荷</span>
            <span className="text-[10px] text-gray-500 ml-2">{isMatchWeek ? '比赛周' : '非比赛周'}</span>
            {weatherLabel && (
              <span className={`text-[10px] ml-2 ${todayWeather === 'rain' ? 'text-blue-400' : 'text-gray-400'}`}>
                {weatherLabel}{todayWeather === 'rain' ? ' -10%' : ''}
              </span>
            )}
          </div>
          <span className={`text-lg font-bold ${pct >= 90 ? 'text-red-400' : pct >= 70 ? 'text-yellow-400' : 'text-green-400'}`}>
            {statusText}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: pct >= 90 ? '#ef4444' : pct >= 70 ? '#eab308' : '#22c55e' }} />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">已用 <span className="text-white font-bold">{usedTRIMP}</span></span>
          <span className="text-gray-400">剩余 <span className={`font-bold ${remainingTRIMP < weatherAdjustedDayCap * 1.5 ? 'text-red-400' : 'text-green-400'}`}>{remainingTRIMP}</span></span>
          <span className="text-gray-500">上限 {weatherAdjustedWeekCap}</span>
        </div>

        {remainingTRIMP < weatherAdjustedDayCap && remainingTRIMP > 0 && (
          <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-[10px] text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 shrink-0" /> 剩余负荷不足一日量，控制训练强度
          </div>
        )}
        {remainingTRIMP <= 0 && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-[10px] text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 shrink-0" /> 本周负荷已达上限，建议改为恢复训练
          </div>
        )}
      </div>

      {/* ═══ TEAM OVERVIEW DASHBOARD ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">球队总览</h3>
          <span className="text-[10px] text-gray-500">{todayStr}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* 球员状态 */}
          <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 hover:border-[#444] transition-colors">
            <div className="text-[10px] text-gray-500 mb-1.5">球员状态</div>
            <div className="flex items-center gap-2.5 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{rosterStats.healthy}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />{rosterStats.minor}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{rosterStats.out}</span>
            </div>
            <div className="text-[9px] text-gray-600 mt-1">共 {rosterStats.total} 人</div>
          </div>

          {/* 周负荷进度 */}
          <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 hover:border-[#444] transition-colors">
            <div className="text-[10px] text-gray-500 mb-1.5">周负荷</div>
            <div className="text-lg font-bold text-white font-mono">{pct}%</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`text-[9px] font-mono ${remainingTRIMP > 0 ? 'text-gray-500' : 'text-red-400'}`}>
                {remainingTRIMP} / {weatherAdjustedWeekCap}
              </span>
            </div>
          </div>

          {/* 当前阶段 */}
          <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 hover:border-[#444] transition-colors">
            <div className="text-[10px] text-gray-500 mb-1.5">当前阶段</div>
            <div className="text-sm font-bold text-white">
              {info ? info.label : <span className="text-gray-600">未设置</span>}
            </div>
            {currentPhaseRange ? (
              <div className="text-[9px] text-gray-600 mt-1">{currentPhaseRange.startDate} - {currentPhaseRange.endDate}</div>
            ) : (
              <div className="text-[9px] text-gray-700 mt-1">请在赛季日历中设置</div>
            )}
          </div>

          {/* 今日训练 */}
          <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 hover:border-[#444] transition-colors">
            <div className="text-[10px] text-gray-500 mb-1.5">今日训练</div>
            {todayTraining?.log && todayTraining.log.timeSlot !== 'rest' ? (
              <>
                <div className="text-xs text-white font-medium">
                  {todayTraining.log.trainType === 'pitch' ? '外场训练' : '力量训练'}
                </div>
                <div className="text-[9px] text-gray-500 mt-0.5">
                  {todayTraining.log.duration}min · {todayTraining.log.timeSlot === 'morning' ? '上午' : '下午'}
                </div>
              </>
            ) : todayTraining?.log?.timeSlot === 'rest' ? (
              <div className="text-xs text-gray-500">今日休息</div>
            ) : (
              <div className="text-xs text-gray-600">暂无记录</div>
            )}
          </div>
        </div>

        {/* ── Data Integrity: Last Record Indicator ── */}
        {lastRecord && (
          <div className={`mt-3 pt-3 border-t text-[10px] flex items-center gap-2 ${
            lastRecord.needsWarning
              ? 'border-yellow-500/20 text-yellow-400'
              : 'border-[#222] text-gray-500'
          }`}>
            {lastRecord.needsWarning ? (
              <>
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>
                  注意：最近{lastRecord.daysAgo}天无训练记录 ·
                  最近记录: {lastRecord.dateLabel}
                </span>
              </>
            ) : (
              <span>
                上次记录: {lastRecord.isToday ? '今天' : lastRecord.dateLabel}
                {lastRecord.timeStr && ` ${lastRecord.timeStr}`}
              </span>
            )}
          </div>
        )}
        {!lastRecord && (
          <div className="mt-3 pt-3 border-t border-[#222] text-[10px] text-gray-600 flex items-center gap-2">
            暂无训练记录
          </div>
        )}
      </div>

      {/* ═══ MUSCLE GROUP LOAD HEATMAP ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4 mb-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#992828]" /> 肌肉群负荷热力图
          <span className="text-[9px] text-gray-600 ml-auto">本周力量训练统计</span>
        </h3>

        {!muscleHeatmap.hasData ? (
          <p className="text-xs text-gray-600 text-center py-4">本周暂无力量训练数据，在力量房排课后自动统计</p>
        ) : (
          <>
            {/* Horizontal bar chart */}
            <div className="space-y-1.5 mb-3">
              {muscleHeatmap.rows.map(row => {
                const barColor = row.level === 'high' ? '#ef4444' : row.level === 'medium' ? '#eab308' : '#22c55e';
                const bgBar = row.level === 'high' ? 'bg-red-500/10' : row.level === 'medium' ? 'bg-yellow-500/5' : 'bg-green-500/5';
                return (
                  <div key={row.name} className={`flex items-center gap-2 py-1 px-2 rounded ${bgBar}`}>
                    <span className="text-[10px] text-gray-300 w-16 shrink-0 font-medium">{row.name}</span>
                    <div className="flex-1 h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, row.pct)}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <span className="text-[10px] font-mono w-16 text-right shrink-0" style={{ color: barColor }}>
                      {row.count}次 ({row.pct}%)
                    </span>
                    <span className="text-[9px] w-10 shrink-0 text-right" style={{ color: barColor }}>
                      {row.level === 'high' ? '过高' : row.level === 'medium' ? '适中' : '偏低'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[9px] text-gray-500 mb-2">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444] inline-block" /> 过高(&gt;80%)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#eab308] inline-block" /> 适中(50-80%)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e] inline-block" /> 偏低(&lt;50%)</span>
            </div>

            {/* Auto-detection alerts */}
            <div className="space-y-1 mt-2 pt-2 border-t border-[#1a1a1a]">
              {muscleHeatmap.highest.length > 0 && (
                <div className="text-[10px] flex items-center gap-1.5">
                  <span className="text-red-400 font-medium">负荷最高:</span>
                  <span className="text-gray-400">
                    {muscleHeatmap.highest.join('、')}
                    {muscleHeatmap.rows.find(r => muscleHeatmap.highest.includes(r.name))?.level === 'high' &&
                      <span className="text-red-400 ml-1">— 建议减少该肌群动作或增加恢复时间</span>
                    }
                  </span>
                </div>
              )}
              {muscleHeatmap.lowest.length > 0 && (
                <div className="text-[10px] flex items-center gap-1.5">
                  <span className="text-green-400 font-medium">负荷最低:</span>
                  <span className="text-gray-400">
                    {muscleHeatmap.lowest.join('、')}
                    {(() => {
                      const lowestRow = muscleHeatmap.rows.find(r => muscleHeatmap.lowest.includes(r.name));
                      return lowestRow && lowestRow.count === 0
                        ? <span className="text-green-400 ml-1">— 本周未训练，建议适当补充</span>
                        : null;
                    })()}
                  </span>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="text-[9px] text-gray-600 mt-2">
              本周共 {muscleHeatmap.totalExercises} 个力量动作覆盖 {muscleHeatmap.rows.filter(r => r.count > 0).length}/{MUSCLE_GROUP_NAMES.length} 个肌群
            </div>
          </>
        )}
      </div>

      {/* ═══ WEEKLY LOAD BAR ═══ */}
      <WeeklyLoadBar matchDate={matchDate} mdDay={mdDay} />

      {/* ═══ DAILY BREAKDOWN ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4 mb-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#992828]" /> 每日明细
        </h3>
        <div className="space-y-1.5">
          {weekDays.map((d: any) => (
            <div key={d.date} className={`flex items-center gap-3 py-2 px-3 rounded-lg ${d.log ? 'bg-[#111]' : 'bg-[#0a0a0a] opacity-50'} ${d.isToday ? 'ring-1 ring-[#992828]' : ''}`}>
              <span className="text-xs text-white font-medium w-16 shrink-0">{d.monthDay} {d.day}</span>
              {d.log ? (d.isRest ? (
                <span className="text-xs text-gray-500">休息日</span>
              ) : (
                <>
                  <span className="text-xs">{d.log.trainType === 'pitch' ? '外场' : '力量房'}</span>
                  <span className="text-xs text-gray-500">{d.log.timeSlot === 'morning' ? '上午' : '下午'}</span>
                  <div className="flex-1 mx-2">
                    <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, (d.trimp / dayCap) * 100)}%`,
                        backgroundColor: d.trimp > dayCap ? '#ef4444' : d.trimp > dayCap * 0.8 ? '#eab308' : '#22c55e'
                      }} />
                    </div>
                  </div>
                  <span className={`text-[10px] tabular-nums font-mono ${d.trimp > dayCap ? 'text-red-400' : d.trimp > dayCap * 0.8 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {d.trimp} / {dayCap}
                  </span>
                </>
              )) : (
                <span className="text-[10px] text-gray-600">{d.isToday ? '未训练' : '休息'}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ LOG ═══ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4 mb-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-[#992828]" /> 训练日志
        </h3>
        {logs.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">暂无记录</p>
        ) : (
          <div className="space-y-1">
            {logs.slice(0, 14).map((log: any) => (
              <div key={log.date} className="flex items-center gap-3 py-1.5 px-2 text-xs">
                <span className="text-gray-400 w-16 shrink-0">{log.date.slice(5)} {WEEKDAY[new Date(log.date + "T00:00:00").getDay()]}</span>
                <span>{log.trainType === 'pitch' ? '外场' : '力量房'}</span>
                <span className="text-gray-500">{log.timeSlot === 'morning' ? '上午' : '下午'}</span>
                <span className="text-gray-600 ml-auto">{log.duration}min</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
           SECTION 1: SINGLE PLAYER LOAD
           ═══════════════════════════════════════════ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-5 mb-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-4 flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-[#992828]" /> 单人球员负荷
        </h3>

        {/* Player selector */}
        <div className="mb-4">
          <select
            value={selectedPlayer}
            onChange={e => setSelectedPlayer(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#992828] appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '2rem',
            }}
          >
            <option value="__all__">全队负荷</option>
            {playerList.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {selectedPlayer === '__all__' ? (
          <p className="text-xs text-gray-600 text-center py-4">选择一名球员查看个人负荷详情</p>
        ) : !singlePlayerData ? (
          <p className="text-xs text-gray-600 text-center py-4">该球员暂无 TRIMP 数据，请先在训练/比赛页录入</p>
        ) : (
          <div className="space-y-4">
            {/* 7-day daily TRIMP */}
            <div>
              <h4 className="text-[11px] font-medium text-gray-400 mb-2">本周 7 日 TRIMP 明细</h4>
              <div className="space-y-1">
                {singlePlayerData.last7Days.map(d => {
                  const barPct = dayCap > 0 ? Math.min(100, (d.trimp / dayCap) * 100) : 0;
                  const isOver = d.trimp > dayCap;
                  const isWarn = d.trimp > dayCap * 0.8 && !isOver;
                  const isToday = d.date === new Date().toISOString().slice(0, 10);
                  return (
                    <div key={d.date} className={`flex items-center gap-3 py-1.5 px-2 rounded ${isToday ? 'bg-[#992828]/5 ring-1 ring-[#992828]/30' : ''}`}>
                      <span className="text-[11px] text-gray-400 w-16 shrink-0">{d.date.slice(5)} {d.day}</span>
                      <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${barPct}%`,
                            backgroundColor: isOver ? '#ef4444' : isWarn ? '#eab308' : '#22c55e'
                          }}
                        />
                      </div>
                      <span className={`text-[10px] font-mono w-12 text-right shrink-0 ${isOver ? 'text-red-400 font-bold' : isWarn ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {d.trimp}
                      </span>
                      <span className="text-[9px] text-gray-600 w-8 shrink-0">/{dayCap}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4-week TRIMP trend bars */}
            <div>
              <h4 className="text-[11px] font-medium text-gray-400 mb-2 flex items-center gap-1.5">
                <BarChart3 className="w-3 h-3 text-[#992828]" /> 近 4 周 TRIMP 趋势
              </h4>
              <div className="flex items-end gap-2 h-24 px-2">
                {singlePlayerData.weekTotals.map((w, i) => {
                  const h = singlePlayerData.maxWeekTotal > 0
                    ? Math.max(4, (w.total / singlePlayerData.maxWeekTotal) * 100)
                    : 4;
                  const isCurrent = i === singlePlayerData.weekTotals.length - 1;
                  const overWeek = w.total > weekCap;
                  return (
                    <div key={w.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <span className={`text-[9px] font-mono font-bold ${overWeek ? 'text-red-400' : 'text-gray-300'}`}>
                        {w.total}
                      </span>
                      <div
                        className="w-full rounded-t transition-all"
                        style={{
                          height: `${h}%`,
                          backgroundColor: overWeek ? '#ef4444' : isCurrent ? '#992828' : '#333',
                          minHeight: '4px',
                        }}
                      />
                      <span className="text-[8px] text-gray-600 text-center leading-tight truncate w-full">{w.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ACWR */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
              <span className="text-[11px] text-gray-400">近 4 周 ACWR</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold font-mono ${
                  singlePlayerData.acwrStatus === 'danger' ? 'text-red-400' :
                  singlePlayerData.acwrStatus === 'warning' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {singlePlayerData.acwr.toFixed(1)}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                  singlePlayerData.acwrStatus === 'danger' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                  singlePlayerData.acwrStatus === 'warning' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                  'text-green-400 border-green-500/30 bg-green-500/10'
                }`}>
                  {singlePlayerData.acwrStatus === 'danger' ? '危险' :
                   singlePlayerData.acwrStatus === 'warning' ? '关注' : '安全'}
                </span>
              </div>
            </div>
            {singlePlayerData.acwrMessage && (
              <p className={`text-[10px] ${
                singlePlayerData.acwrStatus === 'danger' ? 'text-red-400/80' :
                singlePlayerData.acwrStatus === 'warning' ? 'text-yellow-400/80' : 'text-gray-500'
              }`}>
                {singlePlayerData.acwrMessage}
              </p>
            )}

            {/* Alerts */}
            {(singlePlayerData.dailyAlerts.length > 0 || singlePlayerData.weekAlert) && (
              <div className="space-y-1">
                {singlePlayerData.weekAlert === 'red' && (
                  <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-[10px] text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    本周总 TRIMP ({singlePlayerData.currentWeekTRIMP}) 超过周上限 ({weekCap})，建议调整训练计划
                  </div>
                )}
                {singlePlayerData.weekAlert === 'yellow' && (
                  <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-[10px] text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    本周总 TRIMP ({singlePlayerData.currentWeekTRIMP}) 接近周上限 ({weekCap})，关注后续负荷
                  </div>
                )}
                {singlePlayerData.dailyAlerts.filter(a => a.level === 'red').length > 0 && (
                  <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-[10px] text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {singlePlayerData.dailyAlerts.filter(a => a.level === 'red').map(a => `${a.date.slice(5)}(${a.trimp})`).join('、')} 超过日上限 ({dayCap})
                  </div>
                )}
                {singlePlayerData.dailyAlerts.filter(a => a.level === 'yellow').length > 0 && (
                  <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-[10px] text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {singlePlayerData.dailyAlerts.filter(a => a.level === 'yellow').map(a => `${a.date.slice(5)}(${a.trimp})`).join('、')} 接近日上限 ({dayCap})
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
           SECTION 2: MATCH DEFICIT SUPPLEMENT
           ═══════════════════════════════════════════ */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-5 mb-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#992828]" /> 缺额补负荷
        </h3>

        {!supplementData ? (
          <p className="text-xs text-gray-600 text-center py-6">暂无比赛数据，请先在比赛页录入出场信息</p>
        ) : (
          <>
            {/* Summary row */}
            <div className={`p-2 rounded-lg mb-3 text-[10px] flex items-center gap-2 ${
              supplementData.totalWithDeficit > 0
                ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                : 'bg-green-500/10 border border-green-500/30 text-green-400'
            }`}>
              {supplementData.totalWithDeficit > 0 ? (
                <>
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  共 <span className="font-bold">{supplementData.totalWithDeficit}</span> 名球员存在负荷缺口待补
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  全部球员负荷已达标，无缺口
                </>
              )}
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_3.5rem_3rem_3rem_3rem_3rem_1.5rem] gap-1 mb-1.5 text-[9px] text-gray-600 px-1">
              <span>球员</span>
              <span className="text-center">位置</span>
              <span className="text-center">出场</span>
              <span className="text-center">基准</span>
              <span className="text-center">实际</span>
              <span className="text-center">缺口</span>
              <span className="text-center">补</span>
            </div>

            {/* Player rows */}
            <div className="space-y-1">
              {supplementData.rows.map(row => (
                <div
                  key={row.playerName}
                  className={`grid grid-cols-[1fr_3.5rem_3rem_3rem_3rem_3rem_1.5rem] gap-1 py-1.5 px-1 rounded items-center text-[10px] transition ${
                    row.completed
                      ? 'bg-green-500/5 opacity-50'
                      : row.deficitTRIMP > 0
                        ? 'bg-yellow-500/5'
                        : 'bg-[#0a0a0a]'
                  }`}
                >
                  <span className="text-white font-medium truncate" title={row.playerName}>
                    {row.playerName}
                    {row.completed && <span className="text-green-400 ml-1">✓</span>}
                  </span>
                  <span className="text-gray-500 text-center text-[9px]">{row.positionGroup}</span>
                  <span className="text-gray-400 text-center font-mono">{row.minutesOnField}&apos;</span>
                  <span className="text-gray-300 text-center font-mono">{row.benchmarkTRIMP}</span>
                  <span className="text-gray-400 text-center font-mono">{row.actualTRIMP}</span>
                  <span className={`text-center font-mono font-bold ${row.deficitTRIMP > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {row.deficitTRIMP > 0 ? `-${row.deficitTRIMP}` : '0'}
                  </span>
                  <button
                    onClick={() => toggleCompleted(row.playerName)}
                    className={`w-4 h-4 rounded border mx-auto flex items-center justify-center transition ${
                      row.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-[#444] hover:border-[#992828] text-transparent hover:text-gray-500'
                    }`}
                    title={row.completed ? '已完成补训' : '标记完成补训'}
                  >
                    {row.completed && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>

            {/* Deficit detail for players with gaps */}
            {supplementData.hasDeficit.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#1a1a1a] space-y-1.5">
                {supplementData.hasDeficit.map(row => (
                  <div key={row.playerName} className="text-[10px] text-gray-500 flex items-center gap-2 px-1">
                    <span className="text-white">{row.playerName}</span>
                    <span>缺口 {row.deficitTRIMP} TRIMP</span>
                    <span className="text-[#992828]">补跑 {row.deficitDistance}m</span>
                    <span className="text-gray-600">
                      ({row.positionGroup}基准 {getBaseline(row.position).trimp} TRIMP/90min，{getBaseline(row.position).distance / 1000}km)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
