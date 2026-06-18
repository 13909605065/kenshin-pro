'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Download, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { notifyChange, useSyncVersion } from "@/lib/data-events";
import { createClient } from "@/lib/supabase/supabase-client";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type EventType =
  | 'league_match'
  | 'cup_match'
  | 'playoff_match'
  | 'preseason_friendly'
  | 'fitness_test'
  | 'recovery_week'
  | 'deload_week';

export interface SeasonEvent {
  id: string;
  date: string; // ISO date
  type: EventType;
  notes: string;
  createdAt: string;
}

export type PhaseType = 'offseason' | 'preseason_build' | 'regular_season' | 'playoffs';

export interface BatchPlanConfig {
  phaseType: PhaseType;
  notes: string;
}

export interface PhaseRange {
  id: string;
  startDate: string;
  endDate: string;
  phase: PhaseType;
  notes: string;
}

export interface SeasonCalendarData {
  events: SeasonEvent[];
  phaseRanges: PhaseRange[];
  matchDates: string[]; // ISO dates of league/cup matches
  seasonStart: string; // first date of the season timeline
  seasonEnd: string; // last date of the season timeline
}

export type ViewMode = 'season' | 'month' | 'week';

// ═══════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════

const SEASON_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // Fixed 1-12 order
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const EVENT_CONFIG: Record<EventType, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  league_match: { label: '联赛日', emoji: '🔴', color: '#ef4444', bg: '#ef4444/15', border: '#ef4444/40' },
  cup_match: { label: '杯赛日', emoji: '🟠', color: '#f97316', bg: '#f97316/15', border: '#f97316/40' },
  playoff_match: { label: '附加赛', emoji: '💀', color: '#dc2626', bg: '#dc2626/15', border: '#dc2626/40' },
  preseason_friendly: { label: '季前热身赛', emoji: '🟢', color: '#22c55e', bg: '#22c55e/15', border: '#22c55e/40' },
  fitness_test: { label: '体能测试', emoji: '🟣', color: '#a855f7', bg: '#a855f7/15', border: '#a855f7/40' },
  recovery_week: { label: '恢复周', emoji: '⚪', color: '#9ca3af', bg: '#9ca3af/15', border: '#9ca3af/40' },
  deload_week: { label: '减量周', emoji: '🟡', color: '#eab308', bg: '#eab308/15', border: '#eab308/40' } };

const PHASE_CONFIG: Record<PhaseType, { label: string; icon: string; desc: string; defaultEvent: EventType }> = {
  offseason: { label: '休赛期', icon: '🧊', desc: '灰色恢复周 · 禁用全队MD · 仅加练小组 · 短板补强+身体重塑', defaultEvent: 'recovery_week' },
  preseason_build: { label: '季前备战期', icon: '🏋️', desc: '绿色季前 · 体能储备+战术磨合 · 末尾1周自动黄色减量', defaultEvent: 'preseason_friendly' },
  regular_season: { label: '常规赛季', icon: '⚽', desc: '红色联赛+橙色杯赛 · 以赛代练维持状态 · 关键战前可手动标记黄色减量周', defaultEvent: 'league_match' },
  playoffs: { label: '附加赛', icon: '🏆', desc: '收官冲刺 · 赛程密集 · 默认小强度模板 · 避免透支伤病 · 减量高频', defaultEvent: 'playoff_match' } };

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

function getDefaultData(): SeasonCalendarData {
  const now = new Date();
  const year = now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
  return {
    events: [],
    phaseRanges: [],
    matchDates: [],
    seasonStart: `${year}-07-01`,
    seasonEnd: `${year + 1}-06-30` };
}

/** Validate loaded data — repair corruption, return clean default if broken */
function validateData(raw: any): SeasonCalendarData | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!Array.isArray(raw.events)) return null;
  if (!Array.isArray(raw.phaseRanges)) return null;
  if (!Array.isArray(raw.matchDates)) return null;
  // Validate each event has required fields
  for (const ev of raw.events) {
    if (!ev.id || !ev.date || !ev.type) return null;
  }
  // Validate each phase range
  for (const pr of raw.phaseRanges) {
    if (!pr.id || !pr.phase) return null;
  }
  return raw as SeasonCalendarData;
}

function loadData(): SeasonCalendarData {
  // First load: return default; async pull will update once Supabase responds
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return getDefaultData();
    const parsed = JSON.parse(raw);
    const validated = validateData(parsed);
    if (!validated) {
      try { localStorage.setItem(STORAGE_KEY + '_corrupted_backup', raw); } catch {}
      localStorage.removeItem(STORAGE_KEY);
      return getDefaultData();
    }
    return validated;
  } catch {
    return getDefaultData();
  }
}

/**
 * Pull season calendar from Supabase (source of truth).
 * If cloud has data → cache to localStorage and return it.
 * If cloud is empty but localStorage has data → migrate localStorage → cloud.
 */
async function pullSeasonFromCloud(): Promise<SeasonCalendarData | null> {
  try {
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) return null;

    const { data, error } = await supabase
      .from("season_calendar")
      .select("calendar_data")
      .eq("user_id", session.session.user.id)
      .single();

    if (error || !data?.calendar_data) return null;

    const validated = validateData(data.calendar_data);
    if (validated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
      return validated;
    }
    return null;
  } catch {
    return null;
  }
}

function saveData(data: SeasonCalendarData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  // Robust async push to Supabase
  pushSeasonToCloud(data);
}

/** Push season calendar to Supabase (source of truth). */
async function pushSeasonToCloud(data: SeasonCalendarData) {
  try {
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) return;
    const { error } = await supabase.from("season_calendar").upsert({
      user_id: session.session.user.id,
      calendar_data: data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) console.warn("[season] pushSeasonToCloud error:", error);
  } catch (e) { console.warn("[season] pushSeasonToCloud failed:", e); }
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
    color: colorHex };
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
  onClose }: {
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
      createdAt: existingEvent?.createdAt || new Date().toISOString() };
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
                    color: cfg.color } : {
                    backgroundColor: '#111',
                    color: '#9ca3af',
                    borderColor: '#222' }}
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
            className="px-4 py-2 bg-[#992828] hover:bg-[#7a1e1e] text-white rounded-lg text-[10px] font-bold transition"
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
    const seasonStart = `${year}-01-01`;
    const seasonEnd = `${year}-12-31`;
    return { events: [], phaseRanges: [], matchDates: [], seasonStart, seasonEnd };
  });

  const syncVersion = useSyncVersion();

  // Pull season calendar from Supabase when sync completes
  useEffect(() => {
    // First try dedicated season_calendar table, fall back to localStorage (synced via user_kv)
    pullSeasonFromCloud().then(cloudData => {
      if (cloudData) {
        setData(cloudData);
      } else {
        // Cloud table might be empty — try localStorage (populated by user_kv sync)
        const local = loadData();
        if (local.events.length > 0 || local.phaseRanges.length > 0) {
          setData(local);
        }
      }
    });
  }, [syncVersion]);

  const [viewMode, setViewMode] = useState<ViewMode>('season');
  const [focusedMonth, setFocusedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [focusedWeekStart, setFocusedWeekStart] = useState<string>(() => dateStr(getMonday(new Date())));
  const [showEventEditor, setShowEventEditor] = useState<{ date: string; event: SeasonEvent | null } | null>(null);
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchPhase, setBatchPhase] = useState<PhaseType>('regular_season');
  const [legendOpen, setLegendOpen] = useState(false);
  const [showOnlyMarked, setShowOnlyMarked] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [batchStartDate, setBatchStartDate] = useState<string>('');
  const [batchEndDate, setBatchEndDate] = useState<string>('');
  const [batchNotes, setBatchNotes] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const today = todayStr();
  const seasonYear = useMemo(() => getDefaultSeasonYear(), []);

  // ── Year mapping: season year for all months ──
  const yearForMonth = useCallback((_month: number): number => seasonYear, [seasonYear]);

  // ── persist on change ──
  const updateData = useCallback((updater: (prev: SeasonCalendarData) => SeasonCalendarData) => {
    setData(prev => {
      const next = updater(prev);
      saveData(next); notifyChange("season-calendar-updated");
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
        .filter(e => e.type === 'league_match' || e.type === 'cup_match' || e.type === 'playoff_match')
        .map(e => e.date)
        .sort();
      return { ...prev, events, matchDates };
    });
  }, [updateData]);

  const handleDeleteEvent = useCallback((id: string) => {
    updateData(prev => {
      const events = prev.events.filter(e => e.id !== id);
      const matchDates = events
        .filter(e => e.type === 'league_match' || e.type === 'cup_match' || e.type === 'playoff_match')
        .map(e => e.date)
        .sort();
      return { ...prev, events, matchDates };
    });
  }, [updateData]);

  // ── Auto calculations ──
  const autoStats = useMemo(() => {
    const matchEvents = data.events.filter(e => e.type === 'league_match' || e.type === 'cup_match' || e.type === 'playoff_match');
    const leagueCount = data.events.filter(e => e.type === 'league_match').length;
    const cupCount = data.events.filter(e => e.type === 'cup_match').length;
    const playoffCount = data.events.filter(e => e.type === 'playoff_match').length;
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
      playoffCount,
      testCount,
      recoveryWeeks,
      deloadWeeks,
      totalWeeks,
      totalMatches: leagueCount + cupCount + playoffCount };
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
    if (!batchStartDate || !batchEndDate) return;
    updateData(prev => {
      const newRange: PhaseRange = {
        id: genId(),
        startDate: batchStartDate,
        endDate: batchEndDate,
        phase: batchPhase,
        notes: batchNotes || PHASE_CONFIG[batchPhase].label };

      // Remove overlapping ranges of same phase
      const ranges = prev.phaseRanges.filter(
        r => !(r.phase === batchPhase && r.startDate >= batchStartDate && r.endDate <= batchEndDate)
      );

      return { ...prev, phaseRanges: [...ranges, newRange] };
    });
    setShowBatchPanel(false);
  }, [updateData, batchPhase, batchStartDate, batchEndDate, batchNotes]);

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
      if (next > 12) next = 1;
      if (next < 1) next = 12;
      return next;
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
          days });
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

  // ── Get phase range color for a date ──
  const getPhaseForDate = useCallback((d: string): PhaseType | null => {
    for (const range of data.phaseRanges) {
      if (d >= range.startDate && d <= range.endDate) return range.phase;
    }
    return null;
  }, [data.phaseRanges]);

  const PHASE_COLORS: Record<PhaseType, string> = {
    offseason: '#374151',       // 灰色 — 恢复周
    preseason_build: '#166534',  // 绿色 — 季前
    regular_season: '#991b1b',   // 红色 — 联赛 + 杯赛橙
    playoffs: '#7f1d1d',         // 深红 — 冲刺段
  };

  // ── Determine if a date is a match day ──
  const isMatchDay = useCallback((d: string): boolean => {
    return data.matchDates.includes(d);
  }, [data.matchDates]);

  // ── Render a mini day cell (season view) ──
  const renderMiniDay = useCallback((d, isToday, isCurrentMonth) => {
    const events = getEventsForDate(d);
    const parsed = parseDate(d);
    const dayNum = parsed.getDate();
    const matchDay = isMatchDay(d);
    const phase = getPhaseForDate(d);
    const phaseBg = phase ? PHASE_COLORS[phase] : undefined;
    const hasEvent = events.length > 0;

    if (showOnlyMarked && !hasEvent) return <div key={d} className="w-8 h-8" />;

    return (
      <button key={d} onClick={() => setShowEventEditor({ date: d, event: events[0] || null })}
        className="relative flex items-center justify-center rounded transition cursor-pointer w-8 h-8 text-[10px]"
        style={{ backgroundColor: phaseBg || (matchDay ? "#99282820" : "transparent") }}
        title={hasEvent ? events.map(e => EVENT_CONFIG[e.type].label).join(", ") : d}
      >
        <span className={"font-medium leading-none " + (
          isToday ? "text-[#992828] font-bold"
            : matchDay ? "text-white font-bold"
            : hasEvent ? "text-gray-300"
            : isCurrentMonth ? "text-gray-500"
            : "text-gray-700"
        )}>{dayNum}</span>
        {hasEvent && (
          <span className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{ backgroundColor: EVENT_CONFIG[events[0].type].color }} />
        )}
      </button>
    );
  }, [getEventsForDate, isMatchDay, getPhaseForDate, showOnlyMarked]);

  // ── Render a full day cell (month/week view) ──
  const renderFullDay = useCallback((d, isToday) => {
    const events = getEventsForDate(d);
    const parsed = parseDate(d);
    const dayNum = parsed.getDate();
    const matchDay = isMatchDay(d);
    const isWeekend = parsed.getDay() === 0 || parsed.getDay() === 6;

    return (
      <button key={d} onClick={() => setShowEventEditor({ date: d, event: events[0] || null })}
        className={"relative rounded-lg p-1.5 border transition cursor-pointer text-left flex flex-col min-h-[56px] " +
          (isToday ? "ring-1 ring-[#992828] " : "") +
          (matchDay ? "border-[#992828]/40 bg-[#992828]/5 " : "border-[#222] bg-[#111] hover:border-[#444] ") +
          (isWeekend ? "opacity-70" : "")}
      >
        <span className={"text-[11px] font-bold mb-1 " + (isToday ? "text-[#992828]" : matchDay ? "text-white" : "text-gray-400")}>
          {dayNum}
        </span>
        <div className="flex-1 space-y-0.5">
          {events.map(evt => {
            const cfg = EVENT_CONFIG[evt.type];
            return (
              <div key={evt.id} className="text-[7px] px-1 py-0.5 rounded truncate font-medium"
                style={{ backgroundColor: cfg.color + "20", color: cfg.color }}>
                {cfg.label}
              </div>
            );
          })}
        </div>
      </button>
    );
  }, [getEventsForDate, isMatchDay]);

  // ── Render a week strip in the season view ──
  const renderWeekStrip = useCallback((week: typeof seasonTimeline[0], targetMonth: number) => {
    return (
      <div key={week.weekStart} className="flex gap-0.5 items-center">
        {week.days.map(d => {
          const isCurrentMonth = parseDate(d).getMonth() + 1 === targetMonth;
          return renderMiniDay(d, d === today, isCurrentMonth);
        })}
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
          <span className="text-sm font-semibold text-[#992828]">📅 赛季全景</span>
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
                  viewMode === 'season' ? 'bg-[#992828] text-white' : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                全赛季
              </button>
              <button
                onClick={e => { e.stopPropagation(); setViewMode('month'); }}
                className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                  viewMode === 'month' ? 'bg-[#992828] text-white' : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                月视图
              </button>
              <button
                onClick={e => { e.stopPropagation(); setViewMode('week'); }}
                className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                  viewMode === 'week' ? 'bg-[#992828] text-white' : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'
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
                  showBatchPanel ? 'bg-[#992828]/20 text-[#992828]' : 'bg-[#1a1a1a] border border-[#333] hover:border-[#555] text-gray-300 hover:text-white'
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
          {/* ══ LEGEND + TOGGLES ══ */}
          <div className="px-3 py-1 border-b border-[#222] flex items-center gap-3 text-[9px]">
            <button onClick={e => { e.stopPropagation(); setLegendOpen(!legendOpen); }}
              className="text-gray-600 hover:text-gray-400 flex items-center gap-1">
              {legendOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              图例
            </button>
            <label className="flex items-center gap-1 text-gray-500 cursor-pointer">
              <input type="checkbox" checked={showOnlyMarked} onChange={e => setShowOnlyMarked(e.target.checked)}
                className="w-3 h-3 rounded accent-[#992828]" />
              只看事件
            </label>
          </div>
          {legendOpen && (
            <div className="px-4 py-1.5 border-b border-[#222] flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] text-gray-500">
              {(Object.entries(EVENT_CONFIG) as [EventType, typeof EVENT_CONFIG[EventType]][]).map(([key, cfg]) => (
                <span key={key} className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />{cfg.label}</span>
              ))}
            </div>
          )}

          {/* ══ BATCH PLANNING PANEL ══ */}
          {showBatchPanel && (
            <div className="px-4 py-3 border-b border-[#222] bg-[#0a0a0a] space-y-3">
              <span className="text-[10px] text-gray-500 font-medium">批量规划 — 选择日期范围并指定阶段类型</span>
              <div className="flex flex-wrap items-start gap-4">
                {/* Date inputs */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={batchStartDate}
                    onChange={e => setBatchStartDate(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#555]"
                  />
                  <span className="text-[10px] text-gray-600">至</span>
                  <input
                    type="date"
                    value={batchEndDate}
                    onChange={e => setBatchEndDate(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#555]"
                  />
                </div>

                {/* Phase buttons — vertical */}
                <div className="flex flex-col gap-1">
                  {(Object.entries(PHASE_CONFIG) as [PhaseType, typeof PHASE_CONFIG[PhaseType]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setBatchPhase(key)}
                      className={`px-2.5 py-1 rounded text-[10px] text-left transition border ${
                        batchPhase === key
                          ? 'text-white'
                          : 'border-[#222] text-gray-500 hover:text-gray-300 hover:border-[#333]'
                      }`}
                      style={batchPhase === key ? {
                        backgroundColor: `${PHASE_COLORS[key]}40`,
                        borderColor: `${PHASE_COLORS[key]}80` } : { backgroundColor: '#111' }}
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: PHASE_COLORS[key] }} />
                      {cfg.label}
                    </button>
                  ))}
                </div>

                {/* Notes + Apply */}
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={batchNotes}
                    onChange={e => setBatchNotes(e.target.value)}
                    placeholder="备注（可选）"
                    className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-gray-300 placeholder-gray-600 w-40 focus:outline-none focus:border-[#555]"
                  />
                  <button
                    onClick={handleBatchPlan}
                    disabled={!batchStartDate || !batchEndDate}
                    className="px-3 py-1 bg-[#992828] hover:bg-[#7a1e1e] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-[10px] font-bold transition"
                  >
                    应用
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ PHASE COLOR LEGEND (when ranges exist) ══ */}
          {data.phaseRanges.length > 0 && (
            <div className="px-4 py-2 border-b border-[#222] flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[9px] text-gray-500 font-medium">阶段色标:</span>
              {(Object.entries(PHASE_CONFIG) as [PhaseType, typeof PHASE_CONFIG[PhaseType]][]).map(([key, cfg]) => {
                const active = data.phaseRanges.some(r => r.phase === key);
                if (!active) return null;
                return (
                  <span key={key} className="flex items-center gap-1 text-[9px]" style={{ opacity: 0.85 }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PHASE_COLORS[key] }} />
                    <span style={{ color: PHASE_COLORS[key] }}>{cfg.label}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* ═══ SEASON VIEW — 3×4 grid ═══ */}
          {viewMode === "season" && (
            <div className="p-4">
              {/* Weekday headers — once at top */}
              <div className="grid grid-cols-7 gap-0.5 mb-1 px-1">
                {["一","二","三","四","五","六","日"].map(w => (
                  <div key={w} className="text-center text-[9px] text-gray-600">{w}</div>
                ))}
              </div>

              {/* 3×4 month grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {monthColumns.map(col => {
                  const isCurrentMonth = col.month === (new Date().getMonth()+1);
                  // Build 6×7 grid for this month
                  const firstDay = new Date(col.year, col.month-1, 1).getDay() || 7; // Mon=1..Sun=7
                  const daysInMonth = new Date(col.year, col.month, 0).getDate();
                  const cells = [];
                  // Empty cells before first day
                  for (let i=1; i<firstDay; i++) cells.push(null);
                  // Actual days
                  for (let d=1; d<=daysInMonth; d++) {
                    const dateIso = col.year + "-" + String(col.month).padStart(2,"0") + "-" + String(d).padStart(2,"0");
                    const evts = getEventsForDate(dateIso);
                    cells.push({ day: d, date: dateIso, events: evts, isToday: dateIso===today });
                  }
                  // Fill to 42 cells (6×7)
                  while (cells.length < 42) cells.push(null);

                  return (
                    <div key={col.month}
                      className={"rounded-lg border p-1.5 transition hover:border-[#555] hover:bg-[#0d0d0d] " +
                        (isCurrentMonth ? "border-[#992828]/30 bg-[#992828]/5" : "border-[#222] bg-[#0a0a0a]")}>
                      {/* Month label */}
                      <button onClick={() => { setFocusedMonth(col.month); setViewMode("month"); }}
                        className={"w-full text-center py-0.5 mb-1 rounded text-[10px] font-bold " +
                          (isCurrentMonth ? "text-[#992828]" : "text-gray-500 hover:text-gray-300")}>
                        {MONTH_LABELS[col.month-1]}
                      </button>

                      {/* 6×7 grid */}
                      <div className="grid grid-cols-7 gap-px">
                        {cells.map((cell, i) => {
                          if (!cell) return <div key={"e"+i} className="aspect-square" />;
                          const hasEvent = cell.events.length > 0;
                          const cfg = hasEvent ? EVENT_CONFIG[cell.events[0].type] : null;
                          const phase = getPhaseForDate(cell.date);
                          const phaseColor = phase ? PHASE_COLORS[phase] : null;
                          const bg = cfg ? cfg.color + "40" : phaseColor ? phaseColor + "25" : "transparent";
                          return (
                            <button key={cell.date}
                              onClick={() => setShowEventEditor({ date: cell.date, event: cell.events[0] || null })}
                              className={"aspect-square flex flex-col items-center justify-center rounded-sm text-[8px] transition " +
                                (cell.isToday ? "ring-1 ring-[#992828] " : "")}
                              style={{ backgroundColor: bg, borderLeft: cfg ? "2px solid "+cfg.color : "2px solid transparent" }}
                              title={hasEvent ? cell.events.map(e => EVENT_CONFIG[e.type].label).join(", ") : cell.date}>
                              <span className={"leading-none " + (cell.isToday ? "text-[#992828] font-bold"
                                : hasEvent ? "text-gray-200" : "text-gray-600")}>
                                {cell.day}
                              </span>
                              {cfg && (
                                <span className="text-[6px] leading-none mt-px truncate w-full text-center" style={{ color: cfg.color }}>
                                  {cfg.label}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ MONTH VIEW ═══ */}{/* ═══ MONTH VIEW ═══ */}
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
                <span className="text-sm font-bold text-[#992828]">
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
                      <div className={`text-center py-1.5 rounded-t-lg ${isToday ? 'bg-[#992828]/10' : 'bg-[#0a0a0a]'}`}>
                        <div className={`text-[10px] font-bold ${isToday ? 'text-[#992828]' : 'text-gray-400'}`}>
                          {WEEKDAY_CN[i]}
                        </div>
                        <div className="text-[9px] text-gray-600">{parseDate(d).getDate()}日</div>
                      </div>
                      {/* Events */}
                      <button
                        onClick={() => setShowEventEditor({ date: d, event: events[0] || null })}
                        className={`flex-1 p-2 border border-t-0 rounded-b-lg transition cursor-pointer min-h-[80px]
                          ${isToday ? 'border-[#992828]/30 bg-[#992828]/3' : 'border-[#222] bg-[#111] hover:border-[#444]'}
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
                                  {cfg.label}
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

          {/* ═══ SUMMARY STATS ═══ */}
          <div className="px-4 py-2 border-t border-[#222] bg-[#0a0a0a]">
            <button onClick={e => { e.stopPropagation(); setOverviewOpen(!overviewOpen); }}
              className="flex items-center gap-1 text-[10px] text-gray-500 font-medium hover:text-gray-300 mb-1">
              {overviewOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              赛季概览
            </button>
            {overviewOpen && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
              <div className="bg-[#111] rounded-lg px-2 py-1.5">
                <p className="text-[8px] text-gray-600">总周数</p>
                <p className="text-xs font-bold text-gray-300">{autoStats.totalWeeks}</p>
              </div>
              <div className="bg-[#111] rounded-lg px-2 py-1.5">
                <p className="text-[8px] text-gray-600">联赛</p>
                <p className="text-xs font-bold text-[#ef4444]">{autoStats.leagueCount || data.events.filter(e=>e.type==="league_match").length}</p>
              </div>
              <div className="bg-[#111] rounded-lg px-2 py-1.5">
                <p className="text-[8px] text-gray-600">杯赛</p>
                <p className="text-xs font-bold text-[#f97316]">{autoStats.cupCount || data.events.filter(e=>e.type==="cup_match").length}</p>
              </div>
              <div className="bg-[#111] rounded-lg px-2 py-1.5">
                <p className="text-[8px] text-gray-600">附加赛</p>
                <p className="text-xs font-bold text-[#dc2626]">{autoStats.playoffCount || data.events.filter(e=>e.type==="playoff_match").length}</p>
              </div>
              <div className="bg-[#111] rounded-lg px-2 py-1.5">
                <p className="text-[8px] text-gray-600">体测</p>
                <p className="text-xs font-bold text-[#a855f7]">{autoStats.testCount || data.events.filter(e=>e.type==="fitness_test").length}</p>
              </div>
              <div className="bg-[#111] rounded-lg px-2 py-1.5">
                <p className="text-[8px] text-gray-600">恢复/减量</p>
                <p className="text-xs font-bold text-gray-400">
                  {(autoStats.recoveryWeeks||0) + (autoStats.deloadWeeks||0)}
                </p>
              </div>
            </div>
            )}
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
