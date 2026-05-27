// Waypoint stored as [lat, lng, timestamp_ms]
export type Waypoint = [number, number, number];

export interface IdlePeriod {
  startTime: number;
  endTime: number;
  resumeTime: number | null; // timestamp of first waypoint OUTSIDE the radius (actual departure)
  durationMs: number;
  lat: number;
  lng: number;
}

/** Haversine distance in metres between two lat/lng points */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Detect periods where the device stayed within `radiusM` metres for at least
 * `minMs` milliseconds.
 *
 * Algorithm:
 * - Walk forward from each waypoint i
 * - Keep expanding the window while all subsequent points stay within radiusM
 *   of waypoint[i]
 * - If the window spans ≥ minMs, record it as an idle period
 * - Skip ahead past the end of that window to avoid overlapping periods
 */
export function findIdlePeriods(
  waypoints: Waypoint[],
  radiusM = 100,
  minMs = 90_000 // TODO: restore to 4 * 60_000 after testing
): IdlePeriod[] {
  const periods: IdlePeriod[] = [];
  if (waypoints.length < 2) return periods;

  let i = 0;
  while (i < waypoints.length - 1) {
    const [anchorLat, anchorLng, anchorT] = waypoints[i];
    let j = i + 1;

    while (j < waypoints.length) {
      const [lat, lng] = waypoints[j];
      if (haversineM(anchorLat, anchorLng, lat, lng) > radiusM) break;
      j++;
    }

    // j is now the first point outside the radius (or end of array)
    const lastInWindow = waypoints[j - 1];
    const durationMs = lastInWindow[2] - anchorT;

    if (durationMs >= minMs) {
      periods.push({
        startTime: anchorT,
        endTime: lastInWindow[2],
        resumeTime: waypoints[j]?.[2] ?? null,
        durationMs,
        lat: anchorLat,
        lng: anchorLng,
      });
      i = j; // skip past this idle window
    } else {
      i++;
    }
  }

  return periods;
}

/** Format a duration in minutes as "Xh Ym" or "Ym" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Format milliseconds as "Xh Ym Zs", "Ym Zs", or "Zs" */
export function formatDurationMs(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

/**
 * Estimate the duration of a saved stop by looking at waypoints clustered
 * within `radiusM` metres of the stop's coordinates. Returns the time span
 * from the first to the last clustered waypoint, or null if not enough data.
 */
export function computeStopDuration(
  waypoints: Waypoint[],
  stopLat: number,
  stopLng: number,
  radiusM = 100,
): number | null {
  let first: number | null = null;
  let last: number | null = null;
  for (const [lat, lng, t] of waypoints) {
    if (haversineM(stopLat, stopLng, lat, lng) <= radiusM) {
      if (first === null) first = t;
      last = t;
    }
  }
  if (first === null || last === null || last - first < 1000) return null;
  return last - first;
}
