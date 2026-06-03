export interface WeatherInfo {
  temp: number;
  humidity: number;
  condition: string;
  windSpeed: number;
}

let cached: { data: WeatherInfo; ts: number } | null = null;

/** Fetch current weather from Open-Meteo (free, no API key). Cached 30min. */
export async function getWeather(): Promise<WeatherInfo | null> {
  if (cached && Date.now() - cached.ts < 30 * 60 * 1000) return cached.data;
  try {
    // Default to Shanghai lat/lon; browser geolocation optional
    const lat = 31.23;
    const lon = 121.47;
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia/Shanghai`
    );
    const json = await res.json();
    const c = json.current;
    const data: WeatherInfo = {
      temp: c.temperature_2m,
      humidity: c.relative_humidity_2m,
      condition: weatherCodeLabel(c.weather_code),
      windSpeed: c.wind_speed_10m,
    };
    cached = { data, ts: Date.now() };
    return data;
  } catch {
    return cached?.data || null;
  }
}

function weatherCodeLabel(code: number): string {
  if (code <= 1) return "晴天";
  if (code <= 3) return "多云";
  if (code <= 48) return "雾/霾";
  if (code <= 57) return "小雨";
  if (code <= 67) return "雨";
  if (code <= 77) return "雪";
  if (code <= 82) return "阵雨";
  return "雷暴";
}

/** Generate weather hint for prompts */
export function weatherHint(w: WeatherInfo | null): string {
  if (!w) return "";
  const hints: string[] = [];
  hints.push(`当前天气：${w.condition}，${w.temp}°C，湿度${w.humidity}%`);
  if (w.temp > 30) hints.push("⚠️ 高温：补水策略需加强，训练中每15min补水200ml。考虑降低训练强度或移至早晚凉爽时段。");
  if (w.temp < 5) hints.push("⚠️ 低温：热身延长至25min，穿着保暖层，避免静态拉伸引发寒颤。");
  if (w.humidity > 80) hints.push("💧 高湿度：汗液蒸发慢，补水频率加倍，每10-15min补水。");
  if (w.condition.includes("雨")) hints.push("🌧️ 雨天：如场地湿滑，减少急停/变向练习，考虑室内替代方案。守门员扑救注意落地缓冲。");
  if (w.windSpeed > 20) hints.push("💨 大风：影响长传和高球，降低对此类练习的依赖。");
  return hints.join("\n");
}
