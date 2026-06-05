/**
 * 天气适配引擎 — 自动调整训练方案应对恶劣天气
 */

import type { WeatherAdaptation } from '@/lib/types';

// ═══════════════════════════════════════════
// 适配规则
// ═══════════════════════════════════════════

interface WeatherCondition {
  condition: WeatherAdaptation['condition'];
  severity: WeatherAdaptation['severity'];
  temperature: number;
  humidity: number;
  aqi: number;
  windSpeed: number;
  isLightning: boolean;
}

interface WeatherAdaptationFull extends WeatherAdaptation {
  substituteExercises: Record<string, string>;
}

/**
 * 从天气数据生成训练适配方案
 */
export function generateWeatherAdaptation(weather: WeatherCondition): WeatherAdaptationFull | null {
  // 正常天气，无需适配
  if (
    weather.temperature > 5 && weather.temperature < 32 &&
    weather.aqi < 150 && !weather.condition.includes('rain') &&
    !weather.isLightning
  ) {
    return null;
  }

  let adaptation: WeatherAdaptationFull = {
    condition: weather.condition,
    severity: weather.severity,
    bannedActivities: [],
    addedPrecautions: [],
    substituteExercises: {},
  };

  // 高温 >32°C
  if (weather.temperature > 32) {
    adaptation.condition = 'heat';
    adaptation.severity = weather.temperature > 38 ? 'severe' : 'moderate';
    adaptation.intensityReduction = weather.temperature > 38 ? 30 : 20;
    adaptation.hydrationFrequency = 10;
    adaptation.addedPrecautions.push(
      '每10分钟强制补水150-250mL',
      '训练安排在清晨或傍晚避开高温时段',
      '穿浅色透气训练服',
      '出现头晕/恶心/肌肉痉挛立即停止'
    );
    adaptation.bannedActivities.push('高强度间歇跑', '反复冲刺训练', '穿戴厚重护具训练');
  }

  // 寒冷 <5°C
  if (weather.temperature < 5) {
    adaptation.condition = 'cold';
    adaptation.severity = weather.temperature < -5 ? 'severe' : 'moderate';
    adaptation.warmupExtension = weather.temperature < -5 ? 15 : 10;
    adaptation.addedPrecautions.push(
      `热身延长至${(adaptation.warmupExtension || 0) + 15}分钟`,
      '多层穿衣法（内层排汗+中层保暖+外层防风）',
      '冷身阶段立即添衣防止体温骤降',
      '避免静态拉伸（放冷身末尾）'
    );
    adaptation.bannedActivities.push('长时间静态拉伸（热身中）');
  }

  // 雨
  if (weather.condition === 'rain' || weather.humidity > 90) {
    adaptation.condition = 'rain';
    adaptation.severity = weather.windSpeed > 30 ? 'severe' : 'moderate';
    adaptation.venueChange = '室内或遮盖场地';
    adaptation.addedPrecautions.push(
      '草地训练降强度（湿滑→减少急停变向）',
      '穿长钉鞋增加抓地力',
      '减少冲刺距离（刹车距离延长）',
      '准备干毛巾和替换衣物'
    );
    adaptation.bannedActivities.push('全速冲刺（湿滑草地）', '极限变向训练');
  }

  // 雷暴
  if (weather.isLightning) {
    adaptation.condition = 'storm';
    adaptation.severity = 'severe';
    adaptation.venueChange = '室内';
    adaptation.addedPrecautions.push('立即停止室外训练', '远离金属结构');
    adaptation.bannedActivities.push('所有室外活动');
  }

  // 空气污染 AQI>150
  if (weather.aqi > 150) {
    adaptation.condition = 'poor_air';
    adaptation.severity = weather.aqi > 200 ? 'severe' : 'moderate';
    adaptation.venueChange = '室内';
    adaptation.intensityReduction = Math.min(adaptation.intensityReduction || 0, 30);
    adaptation.addedPrecautions.push(
      `AQI ${weather.aqi} — 训练移至室内`,
      '减少高强度有氧训练时长',
      '训练后盐水漱口清喉',
      weather.aqi > 200 ? '戴N95口罩出行' : ''
    );
    adaptation.bannedActivities.push('室外跑步', '室外HIIT');
  }

  return adaptation;
}

/**
 * 生成天气适配提示文本（供AI prompt使用）
 */
export function buildWeatherHint(adaptation: WeatherAdaptationFull | null): string {
  if (!adaptation) return '';

  const lines = ['### ⚠️ 天气适配（自动调整）'];
  lines.push(`条件: ${adaptation.condition} (${adaptation.severity})`);

  if (adaptation.venueChange) lines.push(`场地变更: ${adaptation.venueChange}`);
  if (adaptation.intensityReduction) lines.push(`强度降低: ${adaptation.intensityReduction}%`);
  if (adaptation.warmupExtension) lines.push(`热身延长: +${adaptation.warmupExtension}分钟`);

  if (adaptation.bannedActivities.length > 0) {
    lines.push(`禁止活动: ${adaptation.bannedActivities.join('、')}`);
  }
  if (adaptation.addedPrecautions.length > 0) {
    lines.push('注意事项:');
    adaptation.addedPrecautions.filter(Boolean).forEach(p => lines.push(`  - ${p}`));
  }

  return lines.join('\n');
}

/**
 * 根据天气判断场景
 */
export function getVenueFromWeather(weather: WeatherCondition): 'outdoor' | 'indoor' | 'gym' {
  if (weather.isLightning || weather.aqi > 200 || weather.temperature < -10) return 'gym';
  if (weather.aqi > 150 || weather.temperature > 38 || weather.condition === 'storm') return 'indoor';
  if (weather.condition === 'rain' && weather.severity === 'severe') return 'indoor';
  return 'outdoor';
}
