'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Download, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type EventType =
  | 'league_match'
  | 'cup_match'
  | 'international_break'
  | 'preseason'
  | 'recovery_week'
  | 'fitness_test'
  | 'deload_week';

export interface SeasonEvent {
  id: string;
  date: string; // ISO date
  type: EventType;
  notes: string;
  createdAt: string;
}

export type PhaseType = 'preseason_build' | 'competition' | 'winter_break' | 'final_push';

export interface BatchPlanConfig {
  phaseType: PhaseType;
  notes: string;
}

export interface SeasonCalendarData {
  events: SeasonEvent[];
  matchDates: string[]; // ISO dates of league/cup matches
  seasonStart: string; // first date of the season timeline
  seasonEnd: string; // last date of the season timeline
}

export type ViewMode = 'season' | 'month' | 'week';

// ═══════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════

const SEASON_MONTHS = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5]; // Aug → May
const MONTH_LABELS = ['8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月'];

const EVENT_CONFIG: Record<EventType, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  league_match: { label: '联赛', emoji: '🔴', color: '#ef4444', bg: '#ef4444/15', border: '#ef4444/40' },
  cup_match: { label: '杯赛', emoji: '🟠', color: '#f97316', bg: '#f97316/15', border: '#f97316/40' },
  international_break: { label: '国际比赛日', emoji: '🔵', color: '#3b82f6', bg: '#3b82f6/15', border: '#3b82f6/40' },
  preseason: { label: '季前', emoji: '🟢', color: '#22c55e', bg: '#22c55e/15', border: '#22c55e/40' },
  recovery_week: { label: '恢复周', emoji: '⚪', color: '#9ca3af', bg: '#9ca3af/15', border: '#9ca3af/40' },
  fitness_test: { label: '体能测试', emoji: '🟣', color: '#a855f7', bg: '#a855f7/15', border: '#a855f7/40' },
  deload_week: { label: '减量周', emoji: '🟡', color: '#eab308', bg: '#eab308/15', border: '#eab308/40' },
};

const PHASE_CONFIG: Record<PhaseType, { label: string; icon: string; defaultEvent: EventType }> = {
  preseason_build: { label: '季前备战期', icon: '🟢', defaultEvent: 'preseason' },
  competition: { label: '联赛期', icon: '🔴', defaultEvent: 'league_match' },
  winter_break: { label: '冬歇期', icon: '🔵', defaultEvent: 'recovery_week' },
  final_push: { label: '冲刺期', icon: '🟣', defaultEvent: 'fitness_test' },
};

const STORAGE_KEY = 'kenshin_season_calendar';

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr(): string {
  return dateStr(new Date());
}

function genId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function loadData(): SeasonCalendarData | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveData(data: SeasonCalendarData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function getDefaultSeasonYear(): number {
  const now = new Date();
  // If current month is Jan-May, the season started last year
  return now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
}

function getMonthDateRange(year: number, month: number): { start: string; end: string } {
  const start = dateStr(new Date(year, month - 1, 1));
  const daysInMonth = getDaysInMonth(year, month);
  const end = dateStr(new Date(year, month - 1, daysInMonth));
  return { start, end };
}

// HTML color string to style objects for inline use
function eventStyle(type: EventType): { bg: string; border: string; color: string } {
  const cfg = EVENT_CONFIG[type];
  const colorHex = cfg.color;
  return {
    bg: `${colorHex}18`,
    border: `${colorHex}50`,
    color: colorHex,
  };
}

// ═══════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════

function EventDot({ type, size = 8 }: { type: EventType; size?: number }) {
  const cfg = EVENT_CONFIG[type];
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, backgroundColor: cfg.color }}
      title={cfg.label}
    />
  );
}

function EventEditorPopup({
  date,
  existingEvent,
  onSave,
  onDelete,
  onClose,
}: {
  date: string;
  existingEvent: SeasonEvent | null;
  onSave: (evt: SeasonEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<EventType>(existingEvent?.type || 'league_match');
  const [notes, setNotes] = useState(existingEvent?.notes || '');

  const handleSave = () => {
    const evt: SeasonEvent = {
      id: existingEvent?.id || genId(),
      date,
      type,
      notes,
      createdAt: existingEvent?.createdAt || new Date().toISOString(),
    };
    onSave(evt);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0d0d] border border-[#333] rounded-xl w-[360px] max-h-[80vh] flex flex-col m-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#222]">
          <h3 className="text-sm font-bold text-white">
            {existingEvent ? '编辑事件' : '添加事件'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Date display */}
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">日期</label>
            <span className="text-sm text-white font-medium">{date}</span>
          </div>

          {/* Type selector */}
          <div>
            <label className="text-[10px] text-gray-500 block mb-2">事件类型</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(EVENT_CONFIG) as [EventType, typeof EVENT_CONFIG[EventType]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setType(key)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] font-medium transition border text-left ${
                    type === key
                      ? 'ring-1'
                      : 'border-[#222] hover:border-[#444]'
                  }`}
                  style={type === key ? {
                    backgroundColor: `${cfg.color}20`,
                    borderColor: `${cfg.color}60`,
                    color: cfg.color,
                  } : {
                    backgroundColor: '#111',
                    color: '#9ca3af',
                    borderColor: '#222',
                  }}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">备注</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="对手、场地、赛程说明..."
              rows={3}
              className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-[#444]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t border-[#222]">
          {existingEvent && (
            <button
              onClick={() => { onDelete(existingEvent.id); onClose(); }}
              className="px-3 py-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
            >
              删除
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-3 py-2 text-[10px] text-gray-500 hover:text-white rounded-lg transition"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#d92525] hover:bg-[#b71d1d] text-white rounded-lg text-[10px] font-bold transition"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════

export default function SeasonCalendar() {
  const [data, setData] = useState<SeasonCalendarData>(() => {
    const saved = loadData();
    if (saved) return saved;

    const year = getDefaultSeasonYear();
    const seasonStart = `${year}-08-01`;
    const seasonEnd = `${year + 1}-05-31`;
    return { events: [], matchDates: [], seasonStart, seasonEnd };
  });

  const [viewMode, setViewMode] = useState<ViewMode>('season');
  const [focusedMonth, setFocusedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [focusedWeekStart, setFocusedWeekStart] = useState<string>(() => dateStr(getMonday(new Date())));
  const [showEventEditor, setShowEventEditor] = useState<{ date: string; event: SeasonEvent | null } | null>(null);
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchPhase, setBatchPhase] = useState<PhaseType>('competition');
  const [batchStartMonth, setBatchStartMonth] = useState<number>(8);
  const [batchEndMonth, setBatchEndMonth] = useState<number>(10);
  const [batchNotes, setBatchNotes] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const today = todayStr();
  const seasonYear = useMemo(() => getDefaultSeasonYear(), []);

  // ── Build season year mapping (month 8-12 → seasonYear, month 1-5 → seasonYear+1) ──
  const yearForMonth = useCallback((month: number): number => {
    return month >= 8 ? seasonYear : seasonYear + 1;
  }, [seasonYear]);

  // ── persist on change ──
  const updateData = useCallback((updater: (prev: SeasonCalendarData) => SeasonCalendarData) => {
    setData(prev => {
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }, []);

  // ── Event CRUD ──
  const handleSaveEvent = useCallback((evt: SeasonEvent) => {
    updateData(prev => {
      const idx = prev.events.findIndex(e => e.id === evt.id);
      const events = idx >= 0
        ? prev.events.map((e, i) => i === idx ? evt : e)
        : [...prev.events, evt];
      // Update matchDates
      const matchDates = events
        .filter(e => e.type === 'league_match' || e.type === 'cup_match')
        .map(e => e.date)
        .sort();
      return { ...prev, events, matchDates };
    });
  }, [updateData]);

  const handleDeleteEvent = useCallback((id: string) => {
    updateData(prev => {
      const events = prev.events.filter(e => e.id !== id);
      const matchDates = events
        .filter(e => e.type === 'league_match' || e.type === 'cup_match')
        .map(e => e.date)
        .sort();
      return { ...prev, events, matchDates };
    });
  }, [updateData]);

  // ── Auto calculations ──
  const autoStats = useMemo(() => {
    const matchEvents = data.events.filter(e => e.type === 'league_match' || e.type === 'cup_match');
    const leagueCount = data.events.filter(e => e.type === 'league_match').length;
    const cupCount = data.events.filter(e => e.type === 'cup_match').length;
    const testCount = data.events.filter(e => e.type === 'fitness_test').length;
    const recoveryWeeks = data.events.filter(e => e.type === 'recovery_week').length;
    const deloadWeeks = data.events.filter(e => e.type === 'deload_week').length;

    // Pre-season weeks: weeks before first match
    let preseasonWeeks = 0;
    if (matchEvents.length > 0) {
      const firstMatch = parseDate(matchEvents[0].date);
      const seasonStart = parseDate(data.seasonStart);
      const diffDays = Math.round((firstMatch.getTime() - seasonStart.getTime()) / 86400000);
      preseasonWeeks = Math.max(0, Math.ceil(diffDays / 7));
    }

    // Total weeks in season
    const totalDays = Math.round(
      (parseDate(data.seasonEnd).getTime() - parseDate(data.seasonStart).getTime()) / 86400000
    );
    const totalWeeks = Math.ceil(totalDays / 7);

    return {
      preseasonWeeks,
      leagueCount,
      cupCount,
      testCount,
      recoveryWeeks,
      deloadWeeks,
      totalWeeks,
      totalMatches: leagueCount + cupCount,
    };
  }, [data]);

  // ── Events grouped by date ──
  const eventsByDate = useMemo(() => {
    const map: Record<string, SeasonEvent[]> = {};
    for (const evt of data.events) {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    }
    return map;
  }, [data.events]);

  // ── Get events for a specific date ──
  const getEventsForDate = useCallback((d: string): SeasonEvent[] => {
    return eventsByDate[d] || [];
  }, [eventsByDate]);

  // ── Batch planning ──
  const handleBatchPlan = useCallback(() => {
    updateData(prev => {
      const newEvents = [...prev.events];
      const cfg = PHASE_CONFIG[batchPhase];

      // Remove existing events in the selected month range (keep non-phase events)
      // Actually, add phase-typical markers to each week in the range
      for (let m = batchStartMonth; m <= batchEndMonth; m++) {
        const yr = yearForMonth(m);
        const daysInMonth = getDaysInMonth(yr, m);

        // Add one marker per week (every 7 days, starting from day 1)
        for (let d = 1; d <= daysInMonth; d += 7) {
          const ds = dateStr(new Date(yr, m - 1, d));
          // Check if there's already an event of the same type on this date
          const hasExisting = newEvents.some(e => e.date === ds && e.type === cfg.defaultEvent);
          if (!hasExisting) {
            newEvents.push({
              id: genId(),
              date: ds,
              type: cfg.defaultEvent,
              notes: `${cfg.label} · ${batchNotes || '批量规划'}`,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      const matchDates = newEvents
        .filter(e => e.type === 'league_match' || e.type === 'cup_match')
        .map(e => e.date)
        .sort();

      return { ...prev, events: newEvents, matchDates };
    });
    setShowBatchPanel(false);
  }, [updateData, batchPhase, batchStartMonth, batchEndMonth, batchNotes, yearForMonth]);

  // ── Export JSON ──
  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `season_calendar_${seasonYear}_${seasonYear + 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, seasonYear]);

  // ── Navigate to today ──
  const handleGoToToday = useCallback(() => {
    const now = new Date();
    setFocusedMonth(now.getMonth() + 1);
    setFocusedWeekStart(dateStr(getMonday(now)));
    setViewMode('month');
  }, []);

  // ── Month view: generate day cells ──
  const monthDays = useMemo(() => {
    const yr = yearForMonth(focusedMonth);
    const daysInMonth = getDaysInMonth(yr, focusedMonth);
    const firstDayOfMonth = new Date(yr, focusedMonth - 1, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun

    const days: (string | null)[] = [];
    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(dateStr(new Date(yr, focusedMonth - 1, d)));
    }
    return { days, yr };
  }, [focusedMonth, yearForMonth]);

  // ── Week view: generate day cells ──
  const weekDays = useMemo(() => {
    const monday = parseDate(focusedWeekStart);
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(dateStr(d));
    }
    return days;
  }, [focusedWeekStart]);

  // ── Navigate week ──
  const navigateWeek = useCallback((dir: -1 | 1) => {
    const monday = parseDate(focusedWeekStart);
    monday.setDate(monday.getDate() + dir * 7);
    setFocusedWeekStart(dateStr(monday));
  }, [focusedWeekStart]);

  // ── Navigate month ──
  const navigateMonth = useCallback((dir: -1 | 1) => {
    setFocusedMonth(prev => {
      let next = prev + dir;
      if (next > 5 && dir > 0 && prev <= 5) next = 8; // wrap May -> Aug
      if (next < 8 && dir < 0) next = 5; // wrap Aug -> May
      if (next > 5 && prev > 5) next = 5; // May is max
      if (next < 8) next = 8; // Aug is min
      return Math.max(8, Math.min(12, next));
    });
  }, []);

  // ── Season timeline: generate all dates ──
  const seasonTimeline = useMemo(() => {
    const weeks: { weekStart: string; month: number; days: string[] }[] = [];
    const startDate = parseDate(data.seasonStart);
    // Align to Monday
    const cursor = getMonday(startDate);
    const endDate = parseDate(data.seasonEnd);

    while (cursor <= endDate) {
      const days: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(cursor);
        d.setDate(cursor.getDate() + i);
        if (d <= endDate) {
          days.push(dateStr(d));
        }
      }
      if (days.length > 0) {
        weeks.push({
          weekStart: dateStr(cursor),
          month: cursor.getMonth() + 1,
          days,
        });
      }
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  }, [data.seasonStart, data.seasonEnd]);

  // ── Group weeks by month ──
  const monthColumns = useMemo(() => {
    const cols: { month: number; year: number; weeks: typeof seasonTimeline }[] = [];
    for (const m of SEASON_MONTHS) {
      const yr = yearForMonth(m);
      const monthWeeks = seasonTimeline.filter(w => w.month === m);
      if (monthWeeks.length > 0) {
        cols.push({ month: m, year: yr, weeks: monthWeeks });
      }
    }
    return cols;
  }, [seasonTimeline, yearForMonth]);

  // ── Determine if a date is a match day ──
  const isMatchDay = useCallback((d: string): boolean => {
    return data.matchDates.includes(d);
  }, [data.matchDates]);

  // ── Render a mini day cell ──
  const renderMiniDay = useCallback((d: string, isToday: boolean) => {
    const events = getEventsForDate(d);
    const parsed = parseDate(d);
    const dayNum = parsed.getDate();
    const weekday = WEEKDAY_CN[parsed.getDay()];
    const isWeekend = parsed.getDay() === 0 || parsed.getDay() === 6;
    const matchDay = isMatchDay(d);

    return (
      <button
        key={d}
        onClick={() => setShowEventEditor({ date: d, event: events[0] || null })}
        className={`relative flex flex-col items-center justify-center rounded transition cursor-pointer group
          w-7 h-8 text-[9px]
          ${isToday ? 'ring-1 ring-[#d92525] bg-[#d92525]/10' : ''}
          ${matchDay ? 'bg-[#d92525]/10' : 'hover:bg-[#1a1a1a]'}
          ${isWeekend ? 'opacity-70' : ''}
        `}
        title={events.map(e => EVENT_CONFIG[e.type].label).join(', ') || `${d} — 无事件`}
      >
        <span className={`font-bold leading-none ${isToday ? 'text-[#d92525]' : matchDay ? 'text-white' : 'text-gray-400'}`}>
          {dayNum}
        </span>
        {events.length > 0 && (
          <div className="flex gap-0.5 absolute -bottom-0.5">
            {events.slice(0, 2).map((e, i) => (
              <span key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: EVENT_CONFIG[e.type].color }} />
            ))}
            {events.length > 2 && <span className="text-[7px] text-gray-500 leading-none">+</span>}
          </div>
        )}
      </button>
    );
  }, [getEventsForDate, isMatchDay]);

  // ── Render a full day cell (month/week view) ──
  const renderFullDay = useCallback((d: string, isToday: boolean) => {
    const events = getEventsForDate(d);
    const parsed = parseDate(d);
    const dayNum = parsed.getDate();
    const weekday = WEEKDAY_CN[parsed.getDay()];
    const matchDay = isMatchDay(d);
    const isWeekend = parsed.getDay() === 0 || parsed.getDay() === 6;

    return (
      <button
        key={d}
        onClick={() => setShowEventEditor({ date: d, event: events[0] || null })}
        className={`relative rounded-lg p-1.5 border transition cursor-pointer text-left flex flex-col min-h-[72px]
          ${isToday ? 'ring-1 ring-[#d92525]' : ''}
          ${matchDay ? 'border-[#d92525]/40 bg-[#d92525]/5' : 'border-[#222] bg-[#111] hover:border-[#444]'}
          ${isWeekend ? 'opacity-70' : ''}
        `}
      >
        {/* Date + Weekday */}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-bold ${isToday ? 'text-[#d92525]' : matchDay ? 'text-white' : 'text-gray-400'}`}>
            {dayNum}
          </span>
          <span className="text-[7px] text-gray-600">{weekday}</span>
        </div>

        {/* Event badges */}
        <div className="flex-1 space-y-0.5">
          {events.map(evt => {
            const cfg = EVENT_CONFIG[evt.type];
            return (
              <div
                key={evt.id}
                className="text-[7px] px-1 py-0.5 rounded truncate font-medium"
                style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
              >
                {cfg.emoji} {cfg.label}
              </div>
            );
          })}
          {events.length === 0 && (
            <span className="text-[7px] text-gray-700">—</span>
          )}
        </div>
      </button>
    );
  }, [getEventsForDate, isMatchDay]);

  // ── Render a week strip in the season view ──
  const renderWeekStrip = useCallback((week: typeof seasonTimeline[0]) => {
    return (
      <div key={week.weekStart} className="flex gap-0.5 items-center">
        {week.days.map(d => renderMiniDay(d, d === today))}
      </div>
    );
  }, [renderMiniDay, today]);

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

  return (
    <div className="bg-[#0d0d0d] border border-[#222] rounded-xl overflow-hidden">
      {/* ══ TOOLBAR ══ */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[#222] cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#d92525]">📅 赛季全景</span>
          <span className="text-[10px] text-gray-500">
            {seasonYear}-{seasonYear + 1}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* View mode toggles */}
          {!collapsed && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setViewMode('season'); }}
                className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                  viewMode === 'season' ? 'bg-[#d92525] text-white' : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                全赛季
              </button>
              <button
                onClick={e => { e.stopPropagation(); setViewMode('month'); }}
                className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                  viewMode === 'month' ? 'bg-[#d92525] text-white' : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                月视图
              </button>
              <button
                onClick={e => { e.stopPropagation(); setViewMode('week'); }}
                className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                  viewMode === 'week' ? 'bg-[#d92525] text-white' : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                周视图
              </button>

              <span className="w-px h-4 bg-[#333] mx-1" />

              <button
                onClick={e => { e.stopPropagation(); handleGoToToday(); }}
                className="px-2 py-1 rounded text-[10px] bg-[#1a1a1a] border border-[#333] hover:border-[#555] text-gray-300 hover:text-white transition"
              >
                回到今天
              </button>
              <button
                onClick={e => { e.stopPropagation(); setShowBatchPanel(!showBatchPanel); }}
                className={`px-2 py-1 rounded text-[10px] transition ${
                  showBatchPanel ? 'bg-[#d92525]/20 text-[#d92525]' : 'bg-[#1a1a1a] border border-[#333] hover:border-[#555] text-gray-300 hover:text-white'
                }`}
              >
                批量规划
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleExport(); }}
                className="px-2 py-1 rounded text-[10px] bg-[#1a1a1a] border border-[#333] hover:border-[#555] text-gray-300 hover:text-white transition flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> 导出
              </button>
            </>
          )}
          <span className="text-gray-600 ml-1">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </span>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* ══ LEGEND ══ */}
          <div className="px-4 py-2 border-b border-[#222] flex flex-wrap items-center gap-x-3 gap-y-1">
            {(Object.entries(EVENT_CONFIG) as [EventType, typeof EVENT_CONFIG[EventType]][]).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1 text-[9px] text-gray-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                {cfg.emoji} {cfg.label}
              </span>
            ))}
          </div>

          {/* ══ BATCH PLANNING PANEL ══ */}
          {showBatchPanel && (
            <div className="px-4 py-3 border-b border-[#222] bg-[#0a0a0a] space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-medium">批量规划</span>
                <span className="text-[9px] text-gray-600">选择月份区间 → 设置阶段类型 → 自动填充每周标记</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Month range */}
                <div className="flex items-center gap-1">
                  <select
                    value={batchStartMonth}
                    onChange={e => setBatchStartMonth(Number(e.target.value))}
                    className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-white"
                  >
                    {SEASON_MONTHS.map(m => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-600">至</span>
                  <select
                    value={batchEndMonth}
                    onChange={e => setBatchEndMonth(Number(e.target.value))}
                    className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-white"
                  >
                    {SEASON_MONTHS.filter(m => m >= batchStartMonth).map(m => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                </div>

                {/* Phase preset buttons */}
                <div className="flex gap-1">
                  {(Object.entries(PHASE_CONFIG) as [PhaseType, typeof PHASE_CONFIG[PhaseType]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setBatchPhase(key)}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium transition ${
                        batchPhase === key
                          ? 'bg-[#d92525] text-white'
                          : 'bg-[#1a1a1a] border border-[#333] text-gray-400 hover:text-white'
                      }`}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  ))}
                </div>

                {/* Notes */}
                <input
                  type="text"
                  value={batchNotes}
                  onChange={e => setBatchNotes(e.target.value)}
                  placeholder="备注（可选）"
                  className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-gray-300 placeholder-gray-600 w-32 focus:outline-none focus:border-[#555]"
                />

                <button
                  onClick={handleBatchPlan}
                  className="px-3 py-1 bg-[#d92525] hover:bg-[#b71d1d] text-white rounded text-[10px] font-bold transition"
                >
                  应用
                </button>
              </div>
            </div>
          )}

          {/* ═══ SEASON VIEW ═══ */}
          {viewMode === 'season' && (
            <div className="p-3 overflow-x-auto">
              <div className="flex gap-3" style={{ minWidth: '900px' }}>
                {monthColumns.map(col => (
                  <div key={col.month} className="flex-1 min-w-[80px]">
                    {/* Month header */}
                    <button
                      onClick={() => { setFocusedMonth(col.month); setViewMode('month'); }}
                      className="w-full text-center py-1.5 mb-1 rounded hover:bg-[#1a1a1a] transition"
                    >
                      <span className="text-xs font-bold text-[#d92525] block">
                        {MONTH_LABELS[SEASON_MONTHS.indexOf(col.month)]}
                      </span>
                      <span className="text-[8px] text-gray-600">{col.year}</span>
                    </button>

                    {/* Weekday headers */}
                    <div className="flex gap-0.5 mb-1 px-0.5">
                      {['一','二','三','四','五','六','日'].map((w, i) => (
                        <span key={i} className="w-7 text-center text-[7px] text-gray-600 leading-none">
                          {w}
                        </span>
                      ))}
                    </div>

                    {/* Weeks */}
                    <div className="space-y-1">
                      {col.weeks.map(w => renderWeekStrip(w))}
                    </div>

                    {/* Month summary pins */}
                    <div className="mt-1.5 space-y-0.5">
                      {(() => {
                        const yr = yearForMonth(col.month);
                        const monthStart = dateStr(new Date(yr, col.month - 1, 1));
                        const monthEndDays = getDaysInMonth(yr, col.month);
                        const monthEnd = dateStr(new Date(yr, col.month - 1, monthEndDays));
                        const monthEvents = data.events.filter(e => e.date >= monthStart && e.date <= monthEnd);
                        const typeCount: Partial<Record<EventType, number>> = {};
                        for (const e of monthEvents) {
                          typeCount[e.type] = (typeCount[e.type] || 0) + 1;
                        }
                        return (Object.entries(typeCount) as [EventType, number][]).map(([type, count]) => {
                          const cfg = EVENT_CONFIG[type];
                          return (
                            <div key={type} className="text-[7px] px-1 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: `${cfg.color}15` }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                              <span className="text-gray-400">{cfg.label} ×{count}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ MONTH VIEW ═══ */}
          {viewMode === 'month' && (
            <div className="p-3">
              {/* Month navigator */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1 rounded hover:bg-[#1a1a1a] text-gray-500 hover:text-white transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-[#d92525]">
                  {focusedMonth}月 {monthDays.yr}
                </span>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-1 rounded hover:bg-[#1a1a1a] text-gray-500 hover:text-white transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAY_CN.map(w => (
                  <div key={w} className="text-center text-[9px] text-gray-600 py-1">{w}</div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-1">
                {monthDays.days.map((d, i) => {
                  if (d === null) {
                    return <div key={`empty-${i}`} className="rounded-lg min-h-[72px]" />;
                  }
                  return renderFullDay(d, d === today);
                })}
              </div>

              {/* Month stats */}
              <div className="mt-3 p-3 bg-[#0a0a0a] border border-[#222] rounded-lg">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400">
                  <span className="text-gray-500 font-medium">
                    {focusedMonth}月统计
                  </span>
                  {(() => {
                    const yr = monthDays.yr;
                    const monthStart = dateStr(new Date(yr, focusedMonth - 1, 1));
                    const monthEndDays = getDaysInMonth(yr, focusedMonth);
                    const monthEnd = dateStr(new Date(yr, focusedMonth - 1, monthEndDays));
                    const monthEvents = data.events.filter(e => e.date >= monthStart && e.date <= monthEnd);
                    const leagueMatches = monthEvents.filter(e => e.type === 'league_match').length;
                    const cupMatches = monthEvents.filter(e => e.type === 'cup_match').length;
                    const tests = monthEvents.filter(e => e.type === 'fitness_test').length;
                    return (
                      <>
                        {leagueMatches > 0 && <span>⚽ 联赛 {leagueMatches}场</span>}
                        {cupMatches > 0 && <span>🏆 杯赛 {cupMatches}场</span>}
                        {tests > 0 && <span>🧪 体能测试 {tests}次</span>}
                        {monthEvents.length === 0 && <span className="text-gray-600">暂无事件</span>}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ═══ WEEK VIEW ═══ */}
          {viewMode === 'week' && (
            <div className="p-3">
              {/* Week navigator */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => navigateWeek(-1)}
                  className="p-1 rounded hover:bg-[#1a1a1a] text-gray-500 hover:text-white transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-white">
                  {(() => {
                    const monday = parseDate(focusedWeekStart);
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    const fmtMonth = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
                    return `${fmtMonth(monday)} — ${fmtMonth(sunday)}`;
                  })()}
                </span>
                <button
                  onClick={() => navigateWeek(1)}
                  className="p-1 rounded hover:bg-[#1a1a1a] text-gray-500 hover:text-white transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day columns */}
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((d, i) => {
                  const isToday = d === today;
                  const events = getEventsForDate(d);
                  return (
                    <div key={d} className="flex flex-col">
                      {/* Day header */}
                      <div className={`text-center py-1.5 rounded-t-lg ${isToday ? 'bg-[#d92525]/10' : 'bg-[#0a0a0a]'}`}>
                        <div className={`text-[10px] font-bold ${isToday ? 'text-[#d92525]' : 'text-gray-400'}`}>
                          {WEEKDAY_CN[i]}
                        </div>
                        <div className="text-[9px] text-gray-600">{parseDate(d).getDate()}日</div>
                      </div>
                      {/* Events */}
                      <button
                        onClick={() => setShowEventEditor({ date: d, event: events[0] || null })}
                        className={`flex-1 p-2 border border-t-0 rounded-b-lg transition cursor-pointer min-h-[80px]
                          ${isToday ? 'border-[#d92525]/30 bg-[#d92525]/3' : 'border-[#222] bg-[#111] hover:border-[#444]'}
                        `}
                      >
                        {events.length > 0 ? (
                          <div className="space-y-1">
                            {events.map(evt => {
                              const cfg = EVENT_CONFIG[evt.type];
                              return (
                                <div
                                  key={evt.id}
                                  className="text-[8px] px-1.5 py-1 rounded font-medium"
                                  style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
                                >
                                  {cfg.emoji} {cfg.label}
                                  {evt.notes && (
                                    <div className="text-[7px] opacity-70 mt-0.5 truncate">{evt.notes}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[8px] text-gray-700">无事件</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ SUMMARY STATS BAR ═══ */}
          <div className="px-4 py-3 border-t border-[#222] bg-[#0a0a0a]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
              <span className="text-gray-500 font-medium">赛季概览</span>
              <span className="text-gray-400">
                季前{autoStats.preseasonWeeks}周
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">
                联赛{autoStats.leagueCount || '?'}轮
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">
                杯赛预计{autoStats.cupCount || '?'}场
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">
                体能测试{autoStats.testCount || '?'}次
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">
                总{autoStats.totalWeeks}周
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">
                {autoStats.totalMatches}场比赛
              </span>
              {autoStats.recoveryWeeks > 0 && (
                <>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-400">恢复{autoStats.recoveryWeeks}周</span>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══ EVENT EDITOR MODAL ═══ */}
      {showEventEditor && (
        <EventEditorPopup
          date={showEventEditor.date}
          existingEvent={showEventEditor.event}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onClose={() => setShowEventEditor(null)}
        />
      )}
    </div>
  );
}
