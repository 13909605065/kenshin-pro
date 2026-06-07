/**
 * Catapult Vector 8 Integration — types, parsers, API client
 *
 * Data flow:
 *   1. Real-time: OpenField Webhook → POST /api/catapult → PostgreSQL
 *   2. Post-session: CSV import → parse → PostgreSQL + localStorage
 *   3. Historical: OpenField API → fetch → PostgreSQL
 */

// ═══════════════════════════════════════════════════════════
// Database Types (matching Supabase schema)
// ═══════════════════════════════════════════════════════════

export interface TrainingSession {
  id: string;
  user_id: string;
  name: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  weather?: string;
  player_count: number;
  duration_min: number;
  total_trimp: number;
  notes?: string;
  catapult_id?: string;
}

export interface AthleteProfile {
  id: string;
  user_id: string;
  name: string;
  position?: string;
  number?: string;
  catapult_id?: string;
  hr_max?: number;
  hr_rest?: number;
}

/** 10Hz raw data point from Catapult */
export interface GPSRawPoint {
  session_id: string;
  athlete_id: string;
  timestamp: string;     // ISO 8601
  x?: number;            // field X (m)
  y?: number;            // field Y (m)
  speed?: number;        // m/s
  acceleration?: number; // m/s²
  heart_rate?: number;   // bpm
  player_load?: number;  // instantaneous PL
}

/** Per-session per-athlete summary */
export interface GPSSessionSummary {
  id: string;
  session_id: string;
  athlete_id: string;
  total_distance: number;
  hsr_distance: number;
  sprint_distance: number;
  max_speed: number;
  avg_speed: number;
  player_load: number;
  player_load_per_min: number;
  hr_avg?: number;
  hr_max?: number;
  hr_zone_1_pct: number;
  hr_zone_2_pct: number;
  hr_zone_3_pct: number;
  hr_zone_4_pct: number;
  hr_zone_5_pct: number;
  accelerations: number;
  decelerations: number;
  trimp: number;
  acwr?: number;
  intensity: string;
}

// ═══════════════════════════════════════════════════════════
// Catapult CSV Field Mapping
// ═══════════════════════════════════════════════════════════

/**
 * Catapult CTR (summary) CSV column map.
 * Keys: Catapult column names → Values: our field names
 */
export const CTR_FIELD_MAP: Record<string, string> = {
  "Athlete": "athlete",
  "Player Name": "athlete",
  "Session Date": "date",
  "Date": "date",
  "Total Distance (m)": "total_distance",
  "Distance (m)": "total_distance",
  "HSR Distance (m)": "hsr_distance",
  "HSR (m)": "hsr_distance",
  "Sprint Distance (m)": "sprint_distance",
  "Sprint (m)": "sprint_distance",
  "Max Velocity (km/h)": "max_speed",
  "Max Speed (km/h)": "max_speed",
  "Avg Speed (km/h)": "avg_speed",
  "Player Load": "player_load",
  "Player Load (Total)": "player_load",
  "PL": "player_load",
  "Player Load / Min": "player_load_per_min",
  "PL/min": "player_load_per_min",
  "HR Avg (bpm)": "hr_avg",
  "Avg HR": "hr_avg",
  "HR Max (bpm)": "hr_max",
  "Max HR": "hr_max",
  "Accelerations": "accelerations",
  "Accels": "accelerations",
  "Decelerations": "decelerations",
  "Decels": "decelerations",
  "HML Distance (m)": "hml_distance",
  "Impacts": "impacts",
  "Metabolic Power (W/kg)": "metabolic_power",
  "Work Ratio": "work_ratio",
};

/**
 * Catapult Replay (10Hz raw) CSV column map.
 */
export const REPLAY_FIELD_MAP: Record<string, string> = {
  "Time": "timestamp",
  "time": "timestamp",
  "Lat": "lat",
  "lat": "lat",
  "Long": "long",
  "long": "long",
  "X": "x",
  "x": "x",
  "Y": "y",
  "y": "y",
  "V": "speed",
  "v": "speed",
  "Speed": "speed",
  "A": "acceleration",
  "a": "acceleration",
  "HR": "heart_rate",
  "hr": "heart_rate",
  "Heart Rate": "heart_rate",
  "PL": "player_load",
  "pl": "player_load",
  "PlayerLoad": "player_load",
  "SL": "step_load",
  "sl": "step_load",
  "MP": "metabolic_power",
  "mp": "metabolic_power",
};

/** Parse any Catapult CSV (auto-detect CTR vs Replay) */
export function parseCatapultCSV(csvText: string, fileName: string): {
  type: "ctr" | "replay";
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { type: "ctr", headers: [], rows: [] };

  const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
  const rows: Record<string, string>[] = [];

  // Detect type: CTR has fewer columns (athlete-level), Replay has time/speed (raw)
  const hasTime = headers.some(h => /time/i.test(h));
  const type = hasTime ? "replay" : "ctr";
  const fieldMap = type === "ctr" ? CTR_FIELD_MAP : REPLAY_FIELD_MAP;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const mappedField = fieldMap[headers[j]] || headers[j].toLowerCase().replace(/\s+/g, "_");
      row[mappedField] = cols[j] || "";
    }
    if (Object.values(row).some(v => v)) rows.push(row);
  }

  return { type, headers, rows };
}

/** Calculate summary statistics from raw CSV rows (one athlete) */
export function calcSummaryFromRaw(
  athleteId: string,
  sessionId: string,
  rows: Record<string, string>[]
): GPSSessionSummary {
  let totalDist = 0, hsrDist = 0, sprintDist = 0, maxSpeed = 0, sumSpeed = 0;
  let totalPL = 0, accels = 0, decels = 0, maxHR = 0, sumHR = 0, hrCount = 0;

  let prevSpeed = 0;
  const durationMin = rows.length / 600; // 10Hz → 600 rows per minute

  for (const r of rows) {
    const speed = parseFloat(r.speed || "0");     // m/s
    const pl = parseFloat(r.player_load || "0");
    const hr = parseInt(r.heart_rate || "0");
    const acc = parseFloat(r.acceleration || "0");

    if (speed > 0) {
      totalDist += speed * 0.1; // 10Hz → 0.1s per sample
      sumSpeed += speed;
      if (speed > maxSpeed) maxSpeed = speed;
      if (speed > 5.5) hsrDist += speed * 0.1;       // >19.8 km/h
      if (speed > 7.0) sprintDist += speed * 0.1;     // >25.2 km/h
    }

    totalPL += pl;

    // Acceleration count (>2 m/s² from prev)
    if (acc > 2 && prevSpeed <= 2) accels++;
    if (acc < -2 && prevSpeed >= -2) decels++;
    prevSpeed = acc;

    if (hr > 0) { sumHR += hr; hrCount++; if (hr > maxHR) maxHR = hr; }
  }

  const avgSpeed = totalDist > 0 ? sumSpeed / (totalDist / 0.1) : 0;
  const plPerMin = durationMin > 0 ? totalPL / durationMin : 0;

  // TRIMP: simplified based on PL and duration
  const trimp = Math.round(totalPL * 1.2 + (durationMin * 0.5));

  return {
    id: `${sessionId}_${athleteId}`,
    session_id: sessionId,
    athlete_id: athleteId,
    total_distance: Math.round(totalDist),
    hsr_distance: Math.round(hsrDist),
    sprint_distance: Math.round(sprintDist),
    max_speed: Math.round(maxSpeed * 3.6 * 10) / 10, // m/s → km/h
    avg_speed: Math.round(avgSpeed * 3.6 * 10) / 10,
    player_load: Math.round(totalPL),
    player_load_per_min: Math.round(plPerMin * 10) / 10,
    hr_avg: hrCount > 0 ? Math.round(sumHR / hrCount) : undefined,
    hr_max: maxHR > 0 ? maxHR : undefined,
    hr_zone_1_pct: 0, hr_zone_2_pct: 0, hr_zone_3_pct: 0, hr_zone_4_pct: 0, hr_zone_5_pct: 0,
    accelerations: accels,
    decelerations: decels,
    trimp,
    intensity: trimp > 150 ? "very_high" : trimp > 100 ? "high" : trimp > 50 ? "moderate" : "low",
  };
}

// ═══════════════════════════════════════════════════════════
// Catapult OpenField API Client (future: when you have API key)
// ═══════════════════════════════════════════════════════════

const CATAPULT_BASE = process.env.CATAPULT_API_URL || "https://openfield.catapultsports.com/api/v8";

export async function fetchSessionFromCatapult(
  sessionId: string,
  apiKey: string = process.env.CATAPULT_API_KEY || ""
): Promise<{ session: any; data: any[] } | null> {
  if (!apiKey) {
    console.warn("Catapult API key not configured");
    return null;
  }

  try {
    const res = await fetch(`${CATAPULT_BASE}/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    });
    if (!res.ok) return null;

    const session = await res.json();

    // Fetch raw data
    const dataRes = await fetch(`${CATAPULT_BASE}/sessions/${sessionId}/data?format=json`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = dataRes.ok ? await dataRes.json() : [];

    return { session, data };
  } catch {
    return null;
  }
}

/** Generate Catapult-compatible CSV template */
export function generateCatapultTemplate(): string {
  return [
    "Athlete,Session Date,Total Distance (m),HSR Distance (m),Sprint Distance (m),Max Velocity (km/h),Player Load,Accelerations,Decelerations,HR Avg (bpm),HR Max (bpm)",
    "Player1,2026-06-08,8500,1200,200,32.5,650,45,38,145,185",
    "Player2,2026-06-08,9200,1500,350,34.2,720,52,42,150,190",
  ].join("\n");
}
