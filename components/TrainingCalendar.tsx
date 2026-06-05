'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Sun, Cloud, CloudRain, ChevronLeft, ChevronRight, X } from 'lucide-react';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface DayNotes {
  date: string;
  weather: 'sun' | 'cloud' | 'rain' | '';
  theme: string;
  ballOption: 'ball' | 'no-ball' | '';
  notes: string;
  warmupId: string | null;
  warmupDuration: number; // 5-25
  scaledSegments?: { name: string; duration: number }[];
}

export interface WarmupDesign {
  id: string;
  name: string;
  duration: number;
  ballOption: 'ball' | 'no-ball' | 'both';
  segments: { id: string; name: string; duration: number }[];
  createdAt: string;
}

interface GymWorkout {
  id: string;
  name: string;
  exerciseIds: string[];
  phase: string;
  goal: string;
  createdAt: string;
  updatedAt: string;
}

interface GymCalendarEntry {
  id: string;
  comboId: string;
  date: string;
  phase: string;
  goal: string;
  exerciseIds: string[];
}

interface Props {
  matchDate: string;  // ISO date string
  mdDay: number;      // days until match
  onSelectDay?: (date: string, notes: DayNotes) => void;
  onWarmupSelect?: (date: string, warmupId: string) => void;
  onDurationChange?: (date: string, duration: number) => void;
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

const CALENDAR_KEY = 'kenshin_warmup_calendar';
const WARMUP_LIB_KEY = 'kenshin_warmup_library';
const GYM_CALENDAR_KEY = 'kenshin_gym_calendar';
const GYM_LIBRARY_KEY = 'kenshin_gym_library';

const WEEKDAY_CN = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const dateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const dateFmt = (d: Date): string => `${d.getMonth() + 1}月${d.getDate()}日`;

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function loadCalendar(): Record<string, DayNotes> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CALENDAR_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCalendar(data: Record<string, DayNotes>) {
  try { localStorage.setItem(CALENDAR_KEY, JSON.stringify(data)); } catch {}
}

function loadWarmupLibrary(): WarmupDesign[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(WARMUP_LIB_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadGymCalendar(): GymCalendarEntry[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(GYM_CALENDAR_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadGymLibrary(): GymWorkout[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(GYM_LIBRARY_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getMDLabel(dayDate: string, matchDate: string): string | null {
  if (!matchDate) return null;
  const day = new Date(dayDate + 'T00:00:00');
  const match = new Date(matchDate + 'T00:00:00');
  const diff = Math.round((match.getTime() - day.getTime()) / 86400000);
  if (diff === 0) return 'MD';
  if (diff > 0) return `MD-${diff}`;
  return `MD+${Math.abs(diff)}`;
}

// ═══════════════════════════════════════════════
// Weather icon component
// ═══════════════════════════════════════════════

function WeatherIcon({ type, size = 12 }: { type: string; size?: number }) {
  if (type === 'sun') return <Sun style={{ width: size, height: size }} className="text-yellow-400 shrink-0" />;
  if (type === 'cloud') return <Cloud style={{ width: size, height: size }} className="text-gray-400 shrink-0" />;
  if (type === 'rain') return <CloudRain style={{ width: size, height: size }} className="text-blue-400 shrink-0" />;
  return null;
}

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════

export default function TrainingCalendar({ matchDate, mdDay: _mdDay, onSelectDay, onWarmupSelect, onDurationChange }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [calendarData, setCalendarData] = useState<Record<string, DayNotes>>({});
  const [showWarmupModal, setShowWarmupModal] = useState<string | null>(null); // date string
  const [warmupLib, setWarmupLib] = useState<WarmupDesign[]>([]);
  const [gymCalendarEntries, setGymCalendarEntries] = useState<GymCalendarEntry[]>([]);
  const [gymLib, setGymLib] = useState<GymWorkout[]>([]);

  // ── load data on mount ──
  useEffect(() => {
    setCalendarData(loadCalendar());
    setWarmupLib(loadWarmupLibrary());
    setGymCalendarEntries(loadGymCalendar());
    setGymLib(loadGymLibrary());
  }, []);

  // ── sync warmup lib when modal opens ──
  useEffect(() => {
    if (showWarmupModal) {
      setWarmupLib(loadWarmupLibrary());
    }
  }, [showWarmupModal]);

  // ── gym calendar lookup: date → { name, exerciseCount }[] ──
  const gymByDate = useMemo(() => {
    const map: Record<string, { name: string; exerciseCount: number }[]> = {};
    for (const entry of gymCalendarEntries) {
      const workout = gymLib.find(w => w.id === entry.comboId);
      if (!map[entry.date]) map[entry.date] = [];
      map[entry.date].push({
        name: workout?.name || '力量训练',
        exerciseCount: entry.exerciseIds.length,
      });
    }
    return map;
  }, [gymCalendarEntries, gymLib]);

  // ── compute week days (Mon-Sun) ──
  const weekDays = useMemo(() => {
    const today = new Date();
    const monday = getMonday(today);
    monday.setDate(monday.getDate() + weekOffset * 7);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekOffset]);

  // ── week label ──
  const weekLabel = useMemo(() => {
    const monday = weekDays[0];
    const sunday = weekDays[6];
    if (monday.getMonth() === sunday.getMonth()) {
      return `${monday.getFullYear()}年${monday.getMonth() + 1}月`;
    }
    return `${monday.getMonth() + 1}月-${sunday.getMonth() + 1}月`;
  }, [weekDays]);

  const todayStr = dateStr(new Date());

  // ── update day notes (with persist) ──
  const updateDayNotes = useCallback((dayDate: string, updates: Partial<DayNotes>) => {
    setCalendarData(prev => {
      const current = prev[dayDate] || {
        date: dayDate,
        weather: '' as const,
        theme: '',
        ballOption: '' as const,
        notes: '',
        warmupId: null,
        warmupDuration: 15,
      };
      const updated = { ...current, ...updates };
      const newData = { ...prev, [dayDate]: updated };
      saveCalendar(newData);
      return newData;
    });
  }, []);

  // ── handle warmup selection from modal ──
  const handleWarmupSelect = useCallback((warmup: WarmupDesign, dayDate: string) => {
    const ballOpt = warmup.ballOption === 'both' ? '' : warmup.ballOption as 'ball' | 'no-ball';
    updateDayNotes(dayDate, {
      warmupId: warmup.id,
      warmupDuration: warmup.duration,
      ballOption: ballOpt,
    });
    setShowWarmupModal(null);
    onWarmupSelect?.(dayDate, warmup.id);
  }, [updateDayNotes, onWarmupSelect]);

  // ── copy last week ──
  const handleCopyLastWeek = useCallback(() => {
    const thisMonday = weekDays[0];
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(lastMonday.getDate() - 7);

    const allData = loadCalendar();
    const newData = { ...allData };

    for (let i = 0; i < 7; i++) {
      const lastDay = new Date(lastMonday);
      lastDay.setDate(lastMonday.getDate() + i);
      const lastStr = dateStr(lastDay);

      const thisDay = new Date(thisMonday);
      thisDay.setDate(thisMonday.getDate() + i);
      const thisStr = dateStr(thisDay);

      if (allData[lastStr]) {
        newData[thisStr] = { ...allData[lastStr], date: thisStr };
      }
    }

    saveCalendar(newData);
    setCalendarData(newData);
  }, [weekDays]);

  // ── duration change handler ──
  const handleDurationChange = useCallback((dayDate: string, duration: number) => {
    // Read current notes to get warmupId
    const allData = loadCalendar();
    const currentNotes = allData[dayDate];
    const warmupId = currentNotes?.warmupId;

    let scaledSegments: { name: string; duration: number }[] | undefined;

    if (warmupId) {
      const lib = loadWarmupLibrary();
      const warmup = lib.find(w => w.id === warmupId);
      if (warmup && warmup.segments && warmup.segments.length > 0) {
        const originalTotal = warmup.segments.reduce((s, seg) => s + seg.duration, 0);
        if (originalTotal > 0) {
          scaledSegments = warmup.segments.map(seg => ({
            name: seg.name,
            duration: Math.max(1, Math.round(seg.duration * (duration / originalTotal))),
          }));
        }
      }
    }

    updateDayNotes(dayDate, { warmupDuration: duration, scaledSegments });
    onDurationChange?.(dayDate, duration);
  }, [updateDayNotes, onDurationChange]);

  // ── get selected warmup info ──
  const getSelectedWarmup = useCallback(
    (warmupId: string | null | undefined): WarmupDesign | undefined => {
      if (!warmupId) return undefined;
      return warmupLib.find(w => w.id === warmupId);
    },
    [warmupLib],
  );

  // ═══════════════════════════════════════════════
  // Determine week view: show Mon-Sun centered on current
  // ═══════════════════════════════════════════════
  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="bg-[#121212] border border-[#222] rounded-xl p-4 space-y-3">
      {/* ══ HEADER: title + week navigator + quick actions ══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-400">📅 训练日历</h3>
          <span className="text-[10px] text-gray-600">{weekLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-1 rounded hover:bg-[#1a1a1a] text-gray-500 hover:text-white transition"
            title="上一周"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`px-2 py-0.5 text-[10px] rounded transition ${
              isCurrentWeek
                ? 'bg-[#d92525] text-white'
                : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            当前周
          </button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1 rounded hover:bg-[#1a1a1a] text-gray-500 hover:text-white transition"
            title="下一周"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopyLastWeek}
            className="ml-2 px-2 py-0.5 text-[10px] bg-[#1a1a1a] border border-[#333] hover:border-[#555] rounded text-gray-300 hover:text-white transition"
            title="复制上周训练安排到本周"
          >
            📋 复制上周
          </button>
        </div>
      </div>

      {/* ══ WEEK GRID: responsive — stacked on mobile, 7 cols on desktop ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 lg:gap-3">
        {weekDays.map(day => {
          const dayStr = dateStr(day);
          const notes = calendarData[dayStr];
          const isToday = dayStr === todayStr;
          const mdLabel = getMDLabel(dayStr, matchDate);
          const isMatchDay = mdLabel === 'MD';
          const isBeforeMatch = mdLabel?.startsWith('MD-');
          const isAfterMatch = mdLabel?.startsWith('MD+');
          const weekdayIdx = day.getDay();
          const weekdayCN = weekdayIdx === 0 ? '周日' : WEEKDAY_CN[weekdayIdx - 1];
          const selectedWarmup = getSelectedWarmup(notes?.warmupId);
          const gymEntries = gymByDate[dayStr] || [];

          // ── Determine if this is a rest day (no warmup, no gym) ──
          const hasWarmup = !!selectedWarmup || !!notes?.warmupId;
          const hasGym = gymEntries.length > 0;
          const isRestDay = !hasWarmup && !hasGym;

          // ── Determine border treatment ──
          let borderClass = 'border-[#222] bg-[#1a1a1a]';
          if (isMatchDay) {
            borderClass = 'border-[#d92525]/70 bg-[#d92525]/8';
          } else if (isToday) {
            borderClass = 'border-[#d92525]/50 bg-[#1a1a1a] shadow-[0_0_16px_rgba(217,37,37,0.12)]';
          }

          return (
            <div
              key={dayStr}
              className={`rounded-lg p-3 border transition flex flex-col min-w-0 lg:min-w-[140px] ${
                isRestDay ? 'opacity-50' : ''
              } ${borderClass}`}
            >
              {/* ── Row 1: Date + Weekday + MD badge ── */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-xs font-bold leading-none ${
                      isToday ? 'text-[#d92525]' : isMatchDay ? 'text-[#d92525]' : 'text-gray-200'
                    }`}
                  >
                    {dateFmt(day)}
                  </span>
                  <span className="text-[9px] text-gray-500 leading-none">{weekdayCN}</span>
                </div>
                {mdLabel && (
                  <span
                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded leading-none ${
                      isMatchDay
                        ? 'bg-[#d92525] text-white'
                        : isBeforeMatch
                          ? 'bg-[#d92525]/20 text-[#d92525]'
                          : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {mdLabel}
                  </span>
                )}
              </div>

              {/* ── Day purpose summary: gym / warmup / rest ── */}
              <div className="mb-2 space-y-0.5">
                {hasGym && gymEntries.map((gym, i) => (
                  <div key={i} className="flex items-center gap-1 text-[9px] text-gray-300">
                    <span className="shrink-0">🏋️</span>
                    <span className="truncate">{gym.name}</span>
                    <span className="text-gray-600 shrink-0">{gym.exerciseCount}动作</span>
                  </div>
                ))}
                {hasWarmup && selectedWarmup && (
                  <div className="flex items-center gap-1 text-[9px] text-gray-300">
                    <span className="shrink-0">🔥</span>
                    <span className="truncate">{selectedWarmup.name}</span>
                    <span className="text-gray-600 shrink-0">{notes?.warmupDuration || selectedWarmup.duration}min</span>
                  </div>
                )}
                {hasWarmup && !selectedWarmup && notes?.warmupId && (
                  <div className="flex items-center gap-1 text-[9px] text-gray-300">
                    <span className="shrink-0">🔥</span>
                    <span className="truncate">已选热身</span>
                    <span className="text-gray-600 shrink-0">{notes?.warmupDuration || 15}min</span>
                  </div>
                )}
                {isRestDay && (
                  <div className="flex items-center gap-1 text-[9px] text-gray-600">
                    <span>— 休息</span>
                  </div>
                )}
              </div>

              {/* ── Weather quick-select ── */}
              <div className="flex items-center gap-1 mb-2">
                {(['sun', 'cloud', 'rain'] as const).map(w => {
                  const isSelected = notes?.weather === w;
                  return (
                    <button
                      key={w}
                      onClick={() =>
                        updateDayNotes(dayStr, { weather: notes?.weather === w ? '' : w })
                      }
                      className={`p-1 rounded transition ${
                        isSelected
                          ? 'bg-[#252525] ring-1 ring-[#555]'
                          : 'text-gray-600 hover:text-gray-400 hover:bg-[#121212]'
                      }`}
                      title={w === 'sun' ? '晴' : w === 'cloud' ? '阴' : '雨'}
                    >
                      <WeatherIcon type={w} size={12} />
                    </button>
                  );
                })}
              </div>

              {/* ── Training theme ── */}
              <input
                type="text"
                value={notes?.theme || ''}
                onChange={e => updateDayNotes(dayStr, { theme: e.target.value })}
                placeholder="主题"
                className="w-full bg-[#121212] border border-[#222] rounded px-2 py-1.5 text-[9px] text-gray-300 placeholder-gray-600 mb-1.5 focus:outline-none focus:border-[#444]"
              />

              {/* ── Ball option toggle ── */}
              <div className="flex gap-1 mb-1.5">
                <button
                  onClick={() =>
                    updateDayNotes(dayStr, {
                      ballOption: notes?.ballOption === 'ball' ? '' : 'ball',
                    })
                  }
                  className={`flex-1 py-1 rounded text-[9px] font-medium transition ${
                    notes?.ballOption === 'ball'
                      ? 'bg-[#d92525] text-white'
                      : 'bg-[#121212] text-gray-600 hover:text-gray-400'
                  }`}
                >
                  ⚽有球
                </button>
                <button
                  onClick={() =>
                    updateDayNotes(dayStr, {
                      ballOption: notes?.ballOption === 'no-ball' ? '' : 'no-ball',
                    })
                  }
                  className={`flex-1 py-1 rounded text-[9px] font-medium transition ${
                    notes?.ballOption === 'no-ball'
                      ? 'bg-[#d92525] text-white'
                      : 'bg-[#121212] text-gray-600 hover:text-gray-400'
                  }`}
                >
                  🏃无球
                </button>
              </div>

              {/* ── Notes ── */}
              <textarea
                value={notes?.notes || ''}
                onChange={e => updateDayNotes(dayStr, { notes: e.target.value })}
                placeholder="备注..."
                rows={2}
                className="w-full bg-[#121212] border border-[#222] rounded px-2 py-1 text-[9px] text-gray-300 placeholder-gray-600 mb-1.5 resize-none focus:outline-none focus:border-[#444]"
              />

              {/* ── Warmup section ── */}
              <div className="mt-auto space-y-1.5">
                {/* Selected warmup preview */}
                {selectedWarmup ? (
                  <div className="bg-[#121212] rounded p-2 border border-[#1a1a1a]">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-[#d92525] font-medium truncate max-w-[80px]">
                        {selectedWarmup.name}
                      </span>
                      <button
                        onClick={() => updateDayNotes(dayStr, { warmupId: null })}
                        className="text-gray-600 hover:text-gray-400 shrink-0"
                        title="清除热身"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Duration slider */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[8px] text-gray-600 shrink-0">
                        {selectedWarmup.duration}m
                      </span>
                      <input
                        type="range"
                        min={5}
                        max={25}
                        value={notes?.warmupDuration || selectedWarmup.duration}
                        onChange={e =>
                          handleDurationChange(dayStr, Number(e.target.value))
                        }
                        className="flex-1 h-1 accent-[#d92525] cursor-pointer"
                      />
                      <span className="text-[8px] text-gray-500 shrink-0 w-7 text-right">
                        {notes?.warmupDuration || selectedWarmup.duration}m
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 px-3 rounded border border-dashed border-[#222] text-center">
                    <span className="text-[9px] text-gray-600">未选择热身</span>
                  </div>
                )}

                {/* Select/change warmup button */}
                <button
                  onClick={() => setShowWarmupModal(dayStr)}
                  className="w-full py-1 rounded text-[9px] bg-[#1a1a1a] border border-[#333] hover:border-[#555] text-gray-400 hover:text-white transition"
                >
                  {selectedWarmup ? '更换热身' : '选择热身'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════
          WARMUP SELECTOR MODAL
          ═══════════════════════════════════════════════ */}
      {showWarmupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setShowWarmupModal(null)}
        >
          <div
            className="bg-[#121212] border border-[#333] rounded-xl w-[480px] max-h-[80vh] flex flex-col m-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-[#222]">
              <h3 className="text-sm font-bold text-white">选择热身方案</h3>
              <button
                onClick={() => setShowWarmupModal(null)}
                className="text-gray-500 hover:text-white transition p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body — warmup list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {warmupLib.length === 0 ? (
                <div className="text-center py-10 space-y-4">
                  <p className="text-xs text-gray-500">暂无保存的热身方案</p>
                  <p className="text-[10px] text-gray-600">
                    在热身设计页面创建热身组合后，<br />可在此快速选择应用到训练日。
                  </p>
                  <a
                    href="/warmup"
                    className="inline-flex items-center gap-1 px-4 py-2 bg-[#d92525] hover:bg-[#b71d1d] text-white rounded-lg text-xs font-medium transition"
                  >
                    + 创建热身方案
                  </a>
                </div>
              ) : (
                warmupLib.map(warmup => {
                  const isBall = warmup.ballOption === 'ball';
                  const isNoBall = warmup.ballOption === 'no-ball';
                  return (
                    <button
                      key={warmup.id}
                      onClick={() => handleWarmupSelect(warmup, showWarmupModal)}
                      className="w-full p-3 bg-[#1a1a1a] border border-[#222] hover:border-[#d92525]/40 rounded-lg text-left transition group"
                    >
                      {/* Top row: name + type + duration */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-white group-hover:text-[#d92525] transition truncate">
                            {warmup.name}
                          </span>
                          <span
                            className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                              isBall
                                ? 'bg-blue-500/20 text-blue-400'
                                : isNoBall
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-purple-500/20 text-purple-400'
                            }`}
                          >
                            {isBall ? '⚽有球' : isNoBall ? '🏃无球' : '🔀混合'}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-500 shrink-0 ml-2">
                          {warmup.duration}min
                        </span>
                      </div>

                      {/* Segments preview */}
                      {warmup.segments && warmup.segments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {warmup.segments.slice(0, 5).map(seg => (
                            <span
                              key={seg.id}
                              className="text-[7px] px-1.5 py-0.5 bg-[#121212] text-gray-500 rounded"
                            >
                              {seg.name} {seg.duration}m
                            </span>
                          ))}
                          {warmup.segments.length > 5 && (
                            <span className="text-[7px] text-gray-600 self-center">
                              +{warmup.segments.length - 5}项
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal footer */}
            <div className="p-3 border-t border-[#222]">
              <a
                href="/warmup"
                className="block text-center py-1.5 text-[10px] text-gray-500 hover:text-[#d92525] transition"
              >
                + 创建新热身方案
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
