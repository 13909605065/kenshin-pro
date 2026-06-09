/**
 * 个人纪录追踪系统
 *
 * 预设PR + 自定义PR + 破纪录检测 + 时间线趋势
 */

import { teamGet, teamSet } from "@/lib/team-storage";
import type { PersonalRecord } from '@/lib/types';

const STORAGE_KEY = 'kenshin_pr_data';

// ═══════════════════════════════════════════
// 预设PR类别
// ═══════════════════════════════════════════

export const PR_CATEGORIES = [
  {
    id: 'strength',
    label: '力量',
    icon: '🏋️',
    defaults: [
      { exercise: 'squat_1rm', label: '深蹲1RM', unit: 'kg', metricType: '1rm' as const },
      { exercise: 'bench_1rm', label: '卧推1RM', unit: 'kg', metricType: '1rm' as const },
      { exercise: 'deadlift_1rm', label: '硬拉1RM', unit: 'kg', metricType: '1rm' as const },
      { exercise: 'pull_up_max', label: '引体向上最大次数', unit: '次', metricType: 'max_reps' as const },
    ],
  },
  {
    id: 'speed',
    label: '速度',
    icon: '⚡',
    defaults: [
      { exercise: 'sprint_30m', label: '30m冲刺', unit: 's', metricType: 'time' as const },
      { exercise: 'sprint_10m', label: '10m冲刺', unit: 's', metricType: 'time' as const },
    ],
  },
  {
    id: 'power',
    label: '爆发力',
    icon: '🚀',
    defaults: [
      { exercise: 'vertical_jump', label: '垂直弹跳', unit: 'cm', metricType: 'height' as const },
      { exercise: 'broad_jump', label: '立定跳远', unit: 'cm', metricType: 'distance' as const },
    ],
  },
  {
    id: 'custom',
    label: '自定义',
    icon: '⭐',
    defaults: [],
  },
];

// ═══════════════════════════════════════════
// PR管理函数
// ═══════════════════════════════════════════

function loadPRs(): PersonalRecord[] {
  try {
    const raw = teamGet(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePRs(prs: PersonalRecord[]): void {
  teamSet(STORAGE_KEY, JSON.stringify(prs));
}

/**
 * 添加/更新PR，返回是否破纪录
 */
export function recordPR(pr: Omit<PersonalRecord, 'id'>): { pr: PersonalRecord; isNewRecord: boolean; previousBest?: number } {
  const prs = loadPRs();
  const existing = prs.filter(p => p.exerciseName === pr.exerciseName && p.metricType === pr.metricType);

  // 检测破纪录
  let isNewRecord = false;
  let previousBest: number | undefined;

  if (existing.length > 0) {
    const isHigherBetter = !['time'].includes(pr.metricType);
    const best = isHigherBetter
      ? Math.max(...existing.map(e => e.value))
      : Math.min(...existing.map(e => e.value));

    previousBest = best;
    isNewRecord = isHigherBetter ? pr.value > best : pr.value < best;
  } else {
    isNewRecord = true; // 首次记录也算
  }

  const newPR: PersonalRecord = {
    ...pr,
    id: `${pr.exerciseName}_${Date.now()}`,
    date: pr.date || new Date().toISOString().slice(0, 10),
  };

  prs.unshift(newPR);
  savePRs(prs.slice(0, 200)); // 保留200条

  return { pr: newPR, isNewRecord, previousBest };
}

/**
 * 获取某项运动的所有PR历史
 */
export function getPRHistory(exerciseName: string): PersonalRecord[] {
  return loadPRs()
    .filter(p => p.exerciseName === exerciseName)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 获取某项运动的最佳PR
 */
export function getPRBest(exerciseName: string, metricType?: PersonalRecord['metricType']): PersonalRecord | null {
  const prs = loadPRs().filter(p => p.exerciseName === exerciseName && (!metricType || p.metricType === metricType));
  if (prs.length === 0) return null;

  const isHigherBetter = prs[0] && !['time'].includes(prs[0].metricType);
  return isHigherBetter
    ? prs.reduce((a, b) => a.value > b.value ? a : b)
    : prs.reduce((a, b) => a.value < b.value ? a : b);
}

/**
 * 获取所有PR摘要
 */
export function getPRSummary(): Array<{
  exerciseName: string;
  label: string;
  unit: string;
  best: number;
  date: string;
  count: number;
}> {
  const prs = loadPRs();
  const map = new Map<string, { label: string; unit: string; best: number; date: string; count: number; metricType: string }>();

  for (const pr of prs) {
    const existing = map.get(pr.exerciseName);
    const isHigherBetter = !['time'].includes(pr.metricType);

    if (existing) {
      existing.count++;
      const isBetter = isHigherBetter ? pr.value > existing.best : pr.value < existing.best;
      if (isBetter) {
        existing.best = pr.value;
        existing.date = pr.date;
      }
    } else {
      const cat = PR_CATEGORIES.find(c => c.defaults.find(d => d.exercise === pr.exerciseName));
      const def = cat?.defaults.find(d => d.exercise === pr.exerciseName);
      map.set(pr.exerciseName, {
        label: def?.label || pr.exerciseName,
        unit: pr.unit,
        best: pr.value,
        date: pr.date,
        count: 1,
        metricType: pr.metricType,
      });
    }
  }

  return Array.from(map.entries()).map(([exerciseName, data]) => ({
    exerciseName,
    label: data.label,
    unit: data.unit,
    best: data.best,
    date: data.date,
    count: data.count,
  }));
}

/**
 * 删除一条PR记录
 */
export function deletePR(prId: string): void {
  const prs = loadPRs().filter(p => p.id !== prId);
  savePRs(prs);
}

/**
 * 获取所有PR
 */
export function getAllPRs(): PersonalRecord[] {
  return loadPRs();
}
