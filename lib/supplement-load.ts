// Auto-calculate supplement load based on match minutes played

export interface MatchRecord {
  playerName: string;
  minutes: number; // 0-90
  position: string; // midfielder, defender, wingback, forward, goalkeeper
  date: string; // ISO date string
}

export interface SupplementResult {
  needSupplement: boolean;
  runDistance: number; // meters
  strategy: string;
}

/** Average running distance per position for a full 90-minute match (meters) */
const POS_DISTANCE: Record<string, number> = {
  midfielder: 7061,
  defender: 7080,
  wingback: 7012,
  forward: 6960,
  goalkeeper: 4000,
};

/**
 * Calculate supplement load for a player based on match minutes played.
 * Players who play < 45 minutes need additional running volume.
 */
export function calcSupplementLoad(match: MatchRecord): SupplementResult {
  const baseDist = POS_DISTANCE[match.position] || 7000;

  if (match.minutes >= 45) {
    return { needSupplement: false, runDistance: 0, strategy: "正常训练，无需额外补负荷" };
  }

  let ratio = 0;
  if (match.minutes === 0) {
    ratio = 0.65;
  } else if (match.minutes <= 20) {
    ratio = 0.45;
  } else {
    ratio = 0.25;
  }

  const runDistance = Math.round(baseDist * ratio);
  const strategy =
    match.minutes === 0
      ? `未出场，需补${runDistance}m跑量。优先SSG(4v4/5v5)补负荷，无SSG用间歇跑(15s跑/15s走×10-15组)，训练主体后/冷身前进行。`
      : `上场${match.minutes}min，需补${runDistance}m跑量。增加变速跑+加速减速次数。训练主体后/冷身前进行。`;

  return { needSupplement: true, runDistance, strategy };
}

/**
 * Batch calculate supplement loads for multiple match records.
 * Returns a list of results with player names.
 */
export function batchSupplementLoads(
  matches: MatchRecord[]
): (MatchRecord & SupplementResult)[] {
  return matches.map((match) => ({
    ...match,
    ...calcSupplementLoad(match),
  }));
}

/**
 * Calculate total supplement running volume needed for a squad.
 */
export function totalSupplementVolume(matches: MatchRecord[]): {
  totalDistance: number;
  playerCount: number;
} {
  const results = batchSupplementLoads(matches);
  const supplementing = results.filter((r) => r.needSupplement);
  return {
    totalDistance: supplementing.reduce((sum, r) => sum + r.runDistance, 0),
    playerCount: supplementing.length,
  };
}
