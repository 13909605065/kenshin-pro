/**
 * GPS Data Import — Catapult / SportsCode / standard CSV
 * Parses GPS tracking data and stores it for load analysis.
 *
 * Standard Catapult export columns:
 *   Athlete, Date, Total Distance(m), HSR Distance(m), Sprint Distance(m),
 *   Max Speed(km/h), Accelerations, Decelerations, Player Load, HR Avg, HR Max
 *
 * Data feeds into: TRIMP calculation, ACWR monitoring, weekly load reports
 */

export interface GPSRecord {
  id: string;
  athlete: string;
  date: string;         // YYYY-MM-DD
  totalDistance: number; // meters
  hsrDistance: number;   // High Speed Running (>19.8 km/h) meters
  sprintDistance: number; // Sprint (>25.2 km/h) meters
  maxSpeed: number;      // km/h
  accelerations: number; // count
  decelerations: number; // count
  playerLoad: number;    // accumulated load
  hrAvg: number | null;  // bpm
  hrMax: number | null;  // bpm
  importedAt: string;    // ISO timestamp
}

export interface GPSImportResult {
  success: number;
  skipped: number;
  errors: string[];
  records: GPSRecord[];
}

const STORAGE_KEY = "kenshin_gps_data";

/** Column name mapping — handles variations in export formats */
const COLUMN_MAP: Record<string, string> = {
  "athlete": "athlete",
  "player name": "athlete",
  "player": "athlete",
  "name": "athlete",
  "date": "date",
  "session date": "date",
  "total distance": "totalDistance",
  "total distance(m)": "totalDistance",
  "distance": "totalDistance",
  "distance (m)": "totalDistance",
  "hsr distance": "hsrDistance",
  "hsr distance(m)": "hsrDistance",
  "high speed running": "hsrDistance",
  "high speed running (m)": "hsrDistance",
  "sprint distance": "sprintDistance",
  "sprint distance(m)": "sprintDistance",
  "sprint (m)": "sprintDistance",
  "max speed": "maxSpeed",
  "max speed(km/h)": "maxSpeed",
  "max velocity": "maxSpeed",
  "top speed": "maxSpeed",
  "accelerations": "accelerations",
  "accels": "accelerations",
  "decelerations": "decelerations",
  "decels": "decelerations",
  "player load": "playerLoad",
  "playerload": "playerLoad",
  "load": "playerLoad",
  "hr avg": "hrAvg",
  "heart rate avg": "hrAvg",
  "average hr": "hrAvg",
  "hr max": "hrMax",
  "heart rate max": "hrMax",
  "max hr": "hrMax",
};

/**
 * Parse Catapult/SportsCode CSV data
 */
export function parseGPSCSV(csvText: string): GPSImportResult {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { success: 0, skipped: 0, errors: ["CSV 格式错误：至少需要标题行+1行数据"], records: [] };
  }

  // Parse header
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
  const columnMap: Record<string, number> = {};

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    // Try exact match first, then fuzzy
    for (const [key, field] of Object.entries(COLUMN_MAP)) {
      if (h.includes(key) || key.includes(h)) {
        columnMap[field] = i;
        break;
      }
    }
  }

  // Must have athlete + distance at minimum
  if (!columnMap["athlete"]) {
    return { success: 0, skipped: 0, errors: ["找不到「运动员」列"], records: [] };
  }
  if (!columnMap["totalDistance"] && !columnMap["playerLoad"]) {
    return { success: 0, skipped: 0, errors: ["找不到「总距离」或「Player Load」列"], records: [] };
  }

  const result: GPSImportResult = { success: 0, skipped: 0, errors: [], records: [] };
  const existingIds = new Set(loadGPSData().map(r => r.id));

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
    if (row.length < 2 || !row[columnMap["athlete"]]) {
      result.skipped++;
      continue;
    }

    try {
      const athlete = row[columnMap["athlete"]];
      const date = columnMap["date"] ? parseDate(row[columnMap["date"]]) : new Date().toISOString().slice(0, 10);

      const record: GPSRecord = {
        id: `gps_${date}_${athlete}`,
        athlete,
        date,
        totalDistance: parseNum(row, columnMap, "totalDistance"),
        hsrDistance: parseNum(row, columnMap, "hsrDistance"),
        sprintDistance: parseNum(row, columnMap, "sprintDistance"),
        maxSpeed: parseNum(row, columnMap, "maxSpeed"),
        accelerations: Math.round(parseNum(row, columnMap, "accelerations")),
        decelerations: Math.round(parseNum(row, columnMap, "decelerations")),
        playerLoad: parseNum(row, columnMap, "playerLoad"),
        hrAvg: parseOptionalNum(row, columnMap, "hrAvg"),
        hrMax: parseOptionalNum(row, columnMap, "hrMax"),
        importedAt: new Date().toISOString(),
      };

      // Skip duplicates
      if (existingIds.has(record.id)) {
        result.skipped++;
        continue;
      }
      existingIds.add(record.id);

      result.records.push(record);
      result.success++;
    } catch {
      result.skipped++;
    }
  }

  return result;
}

function parseNum(row: string[], map: Record<string, number>, field: string): number {
  return map[field] !== undefined ? Number(row[map[field]]) || 0 : 0;
}

function parseOptionalNum(row: string[], map: Record<string, number>, field: string): number | null {
  if (map[field] === undefined) return null;
  const v = Number(row[map[field]]);
  return isNaN(v) ? null : v;
}

function parseDate(val: string): string {
  // Try various date formats
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  // Try DD/MM/YYYY
  const parts = val.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const d2 = new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`);
    if (!isNaN(d2.getTime())) return d2.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

/** Load all GPS records */
export function loadGPSData(): GPSRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

/** Save GPS records (merge with existing) */
export function saveGPSData(records: GPSRecord[]): void {
  const existing = loadGPSData();
  const existingIds = new Set(existing.map(r => r.id));

  for (const r of records) {
    if (!existingIds.has(r.id)) {
      existing.push(r);
      existingIds.add(r.id);
    }
  }

  // Keep last 5000 records
  const trimmed = existing.slice(-5000);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/** Get GPS data for a specific date range */
export function getGPSByDateRange(from: string, to: string): GPSRecord[] {
  return loadGPSData().filter(r => r.date >= from && r.date <= to);
}

/** Get GPS data for a specific athlete */
export function getGPSByAthlete(athlete: string): GPSRecord[] {
  return loadGPSData().filter(r => r.athlete === athlete);
}

/** Get athlete list from GPS data */
export function getGPSAthletes(): string[] {
  const names = new Set(loadGPSData().map(r => r.athlete));
  return Array.from(names).sort();
}

/** Calculate TRIMP from GPS data using Banister's method */
export function calcGPS_TRIMP(record: GPSRecord, maxHR: number = 200, restingHR: number = 50): {
  trimp: number;
  intensity: "low" | "moderate" | "high" | "very_high";
} {
  const hr = record.hrAvg || ((record.playerLoad > 100 ? 0.75 : 0.6) * (maxHR - restingHR) + restingHR);
  const hrRatio = (hr - restingHR) / (maxHR - restingHR);
  const duration = record.totalDistance > 0 ? record.totalDistance / 100 : 60; // approximate minutes
  const trimp = Math.round(duration * hrRatio * 0.64 * Math.exp(1.92 * hrRatio));
  const intensity = trimp > 150 ? "very_high" : trimp > 100 ? "high" : trimp > 50 ? "moderate" : "low";
  return { trimp, intensity };
}

/** Template data shared across GPS import UIs. Use with xlsx to write file. */
export const GPS_TEMPLATE_HEADERS = [
  "Athlete","Date","Total Distance(m)","HSR Distance(m)","Sprint Distance(m)","Max Speed(km/h)","Accelerations","Decelerations","Player Load","HR Avg","HR Max"
];

export const GPS_TEMPLATE_ROWS = [
  ["张三","2026-06-01",8500,1200,200,32.5,45,38,650,145,185],
  ["李四","2026-06-01",9200,1500,350,34.2,52,42,720,150,190],
  ["王五","2026-06-01",7800,800,100,30.1,38,35,580,140,178],
];

/** @deprecated Use GPS_TEMPLATE_HEADERS + GPS_TEMPLATE_ROWS with xlsx library instead */
export function generateGPSTemplate(): string {
  return [GPS_TEMPLATE_HEADERS.join(","), ...GPS_TEMPLATE_ROWS.map(r => r.join(","))].join("\n");
}
