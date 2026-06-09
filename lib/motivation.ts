/**
 * 激励系统 — Streak / Badge / Mileage
 *
 * 15+徽章 + 连续训练天数 + 里程统计
 */

import { teamGet, teamSet } from "@/lib/team-storage";
import type { Badge, MotivationStats } from '@/lib/types';

const STORAGE_KEY = 'kenshin_motivation';

// ═══════════════════════════════════════════
// 徽章定义
// ═══════════════════════════════════════════

const BADGE_DEFINITIONS: Omit<Badge, 'earnedAt' | 'progress'>[] = [
  { id: 'first_week', name: 'First Week', nameCn: '初入江湖', description: '连续训练7天', icon: '🌟',
    requirement: { type: 'streak', threshold: 7 } },
  { id: 'iron_man', name: 'Iron Man', nameCn: '钢铁之躯', description: '连续训练30天', icon: '🦾',
    requirement: { type: 'streak', threshold: 30 } },
  { id: 'century', name: 'Century', nameCn: '百炼成钢', description: '完成100次训练', icon: '💯',
    requirement: { type: 'total_sessions', threshold: 100 } },
  { id: 'ton', name: 'Ton', nameCn: '千吨之力', description: '累计训练量达10000kg', icon: '🏋️',
    requirement: { type: 'total_volume', threshold: 10000 } },
  { id: 'pr_breaker', name: 'PR Breaker', nameCn: '破纪录者', description: '打破5次个人纪录', icon: '🏆',
    requirement: { type: 'pr_count', threshold: 5 } },
  { id: 'early_bird', name: 'Early Bird', nameCn: '早起鸟儿', description: '早上7点前完成10次训练', icon: '🌅',
    requirement: { type: 'early_sessions', threshold: 10 } },
  { id: 'discipline', name: 'Discipline', nameCn: '铁律执行', description: '连续4周每周≥4次训练', icon: '📋',
    requirement: { type: 'weekly_target', threshold: 4 } },
  { id: 'comeback', name: 'Comeback Kid', nameCn: '王者归来', description: '中断14天后恢复训练', icon: '🦅',
    requirement: { type: 'comeback', threshold: 1 } },
  { id: 'double_century', name: 'Double Century', nameCn: '两百勇士', description: '完成200次训练', icon: '🔥',
    requirement: { type: 'total_sessions', threshold: 200 } },
  { id: 'speed_demon', name: 'Speed Demon', nameCn: '速度恶魔', description: '30m冲刺突破4.0s', icon: '⚡',
    requirement: { type: 'sprint_30m', threshold: 1 } },
  { id: 'mileage_king', name: 'Mileage King', nameCn: '里程之王', description: '累计训练100小时', icon: '👑',
    requirement: { type: 'total_minutes', threshold: 6000 } },
  { id: 'perfect_month', name: 'Perfect Month', nameCn: '完美月份', description: '一个月内完成所有计划训练', icon: '💎',
    requirement: { type: 'perfect_month', threshold: 1 } },
  { id: 'fifa_11_master', name: 'FIFA 11+ Master', nameCn: 'FIFA 11+大师', description: '完成30次FIFA 11+热身', icon: '⚽',
    requirement: { type: 'fifa11_count', threshold: 30 } },
  { id: 'recovery_pro', name: 'Recovery Pro', nameCn: '恢复专家', description: '记录20次恢复日志', icon: '🧘',
    requirement: { type: 'recovery_logs', threshold: 20 } },
  { id: 'bulgarian', name: 'Bulgarian', nameCn: '保加利亚勇士', description: '累计完成500次保加利亚分腿蹲', icon: '🇧🇬',
    requirement: { type: 'bulgarian_squats', threshold: 500 } },
];

// ═══════════════════════════════════════════
// 加载/保存
// ═══════════════════════════════════════════

function loadStats(): MotivationStats {
  try {
    const raw = teamGet(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // 合并徽章（支持新徽章添加）
      const badges = BADGE_DEFINITIONS.map(def => {
        const existing = data.badges?.find((b: Badge) => b.id === def.id);
        return existing || { ...def, earnedAt: null, progress: 0 };
      });
      return { ...data, badges };
    }
  } catch { /* ignore */ }

  return {
    currentStreak: 0, bestStreak: 0, totalSessions: 0,
    totalMinutes: 0, totalVolume: 0, prCount: 0,
    badges: BADGE_DEFINITIONS.map(b => ({ ...b, earnedAt: null, progress: 0 })),
    weeklyTarget: 4, weeklyCompleted: 0,
  };
}

function saveStats(stats: MotivationStats): void {
  teamSet(STORAGE_KEY, JSON.stringify(stats));
}

// ═══════════════════════════════════════════
// 更新函数
// ═══════════════════════════════════════════

/**
 * 记录一次训练完成
 */
export function recordTrainingSession(durationMinutes: number, volumeLoad: number): MotivationStats {
  const stats = loadStats();
  const today = new Date().toISOString().slice(0, 10);

  stats.totalSessions++;
  stats.totalMinutes += durationMinutes;
  stats.totalVolume += volumeLoad;

  // Streak（简化逻辑，实际需要检查昨天的训练）
  // 此处依赖已有的sessions数据，只做简单递增
  stats.currentStreak++;
  if (stats.currentStreak > stats.bestStreak) {
    stats.bestStreak = stats.currentStreak;
  }

  // 更新徽章进度
  stats.badges = stats.badges.map(badge => {
    if (badge.earnedAt) return badge;

    let progress = 0;
    switch (badge.requirement.type) {
      case 'streak': progress = Math.min(100, (stats.currentStreak / badge.requirement.threshold) * 100); break;
      case 'total_sessions': progress = Math.min(100, (stats.totalSessions / badge.requirement.threshold) * 100); break;
      case 'total_volume': progress = Math.min(100, (stats.totalVolume / badge.requirement.threshold) * 100); break;
      case 'total_minutes': progress = Math.min(100, (stats.totalMinutes / badge.requirement.threshold) * 100); break;
      case 'pr_count': progress = Math.min(100, (stats.prCount / badge.requirement.threshold) * 100); break;
      default: progress = 0;
    }

    const earned = progress >= 100;
    return {
      ...badge,
      progress: Math.round(progress),
      earnedAt: earned ? today : null,
    };
  });

  saveStats(stats);
  return stats;
}

/**
 * 记录PR
 */
export function recordPRBadge(): void {
  const stats = loadStats();
  stats.prCount++;
  stats.badges = stats.badges.map(badge => {
    if (badge.earnedAt) return badge;
    if (badge.requirement.type === 'pr_count') {
      const progress = Math.min(100, (stats.prCount / badge.requirement.threshold) * 100);
      return { ...badge, progress: Math.round(progress), earnedAt: progress >= 100 ? new Date().toISOString().slice(0, 10) : null };
    }
    return badge;
  });
  saveStats(stats);
}

/**
 * 获取当前激励数据
 */
export function getMotivationStats(): MotivationStats {
  return loadStats();
}

/**
 * 获取里程数据
 */
export function getMileage() {
  const stats = loadStats();
  return [
    { label: '总训练次数', value: stats.totalSessions, unit: '次', icon: '📊' },
    { label: '总训练时长', value: Math.round(stats.totalMinutes / 60 * 10) / 10, unit: '小时', icon: '⏱️' },
    { label: '总训练量', value: Math.round(stats.totalVolume), unit: 'kg', icon: '🏋️' },
    { label: '最长连续', value: stats.bestStreak, unit: '天', icon: '🔥' },
    { label: '破纪录', value: stats.prCount, unit: '次', icon: '🏆' },
    { label: '徽章', value: `${stats.badges.filter(b => b.earnedAt).length}/${stats.badges.length}`, unit: '枚', icon: '🎖️' },
  ];
}
