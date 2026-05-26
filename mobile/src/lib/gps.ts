import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  getActiveTripId,
  appendWaypoints,
  getWaypoints,
  savePendingIdleStop,
  clearPendingIdleStop,
  Waypoint,
} from './storage';

export const WAYPOINT_TASK = 'ENTRETIEN_WAYPOINT_TASK';

// ─── Haversine distance ───────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateTotalKm(waypoints: Waypoint[]): number {
  if (waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += haversineKm(
      waypoints[i - 1][0],
      waypoints[i - 1][1],
      waypoints[i][0],
      waypoints[i][1]
    );
  }
  return Math.round(total * 10) / 10;
}

// ─── Idle / stop detection ────────────────────────────────────────────────────

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineKm(lat1, lng1, lat2, lng2) * 1000;
}

export interface IdleInfo {
  startTime: number;   // ms timestamp — when the device first stopped
  lat: number;
  lng: number;
  durationMs: number;  // how long idle so far
}

/**
 * Returns info about an ACTIVE idle period (device currently stopped) or null.
 * Walks backwards from the most recent waypoint: as long as each prior point
 * is within radiusM of the latest point, it is part of the same stationary
 * cluster. If the cluster spans >= minMs the device is considered idle.
 */
export function detectCurrentIdle(
  waypoints: Waypoint[],
  radiusM = 100,
  minMs = 90_000, // TODO: restore to 4 * 60_000 after testing
): IdleInfo | null {
  if (waypoints.length < 2) return null;
  const latest = waypoints[waypoints.length - 1];
  let clusterStart = waypoints.length - 1;
  for (let i = waypoints.length - 2; i >= 0; i--) {
    if (haversineM(latest[0], latest[1], waypoints[i][0], waypoints[i][1]) <= radiusM) {
      clusterStart = i;
    } else {
      break;
    }
  }
  const durationMs = latest[2] - waypoints[clusterStart][2];
  if (durationMs >= minMs) {
    return {
      startTime: waypoints[clusterStart][2],
      lat: waypoints[clusterStart][0],
      lng: waypoints[clusterStart][1],
      durationMs,
    };
  }
  return null;
}

// ─── Background task definition ──────────────────────────────────────────────
// IMPORTANT: This must be defined at module scope, before registerRootComponent.
// It is activated by importing this file in index.ts.

TaskManager.defineTask(WAYPOINT_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[GPS] Task error:', error);
    return;
  }
  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;

  const tripId = await getActiveTripId();
  if (!tripId) return;

  const points: Waypoint[] = locations.map((loc) => [
    loc.coords.latitude,
    loc.coords.longitude,
    loc.timestamp ?? Date.now(),
  ]);
  await appendWaypoints(tripId, points);

  // ── Idle detection from background (runs even when JS thread is paused) ──
  try {
    const allWps = await getWaypoints(tripId);
    const idle = detectCurrentIdle(allWps);
    if (idle) {
      // Save pending stop — JS thread will submit it when it next wakes up.
      // Always overwrite so we keep the most recent idle period.
      await savePendingIdleStop({ tripId, ...idle });
    }
    // Do NOT clear on movement — the JS thread clears after successful submission.
    // Clearing here would delete the stop before the JS thread can submit it.
  } catch {}
});

// ─── Start / stop tracking ────────────────────────────────────────────────────

// ─── Foreground tracking (Expo Go fallback) ─────────────────────────────────
// Uses watchPositionAsync: records a waypoint every 100 metres moved (or every
// 30 seconds), which still yields ~70 points on a 7 km trip — plenty for
// OSRM / Google sampling — while dramatically reducing GPS polling frequency.

let _positionWatcher: Location.LocationSubscription | null = null;

export async function startForegroundTracking(tripId: number): Promise<void> {
  stopForegroundTracking();
  // Capture first point immediately
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    await appendWaypoints(tripId, [[loc.coords.latitude, loc.coords.longitude, loc.timestamp ?? Date.now()]]);
  } catch {}
  _positionWatcher = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 100,  // new waypoint every 100 metres (~70 pts/7 km trip)
      timeInterval: 30_000,   // or every 30 seconds as fallback
    },
    async (location) => {
      await appendWaypoints(tripId, [
        [location.coords.latitude, location.coords.longitude, location.timestamp ?? Date.now()],
      ]);
    }
  );
}

export function stopForegroundTracking(): void {
  if (_positionWatcher) {
    _positionWatcher.remove();
    _positionWatcher = null;
  }
}

export function isForegroundTracking(): boolean {
  return _positionWatcher !== null;
}

// ─── Location permissions ─────────────────────────────────────────────────────

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') return false;
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return bg === 'granted';
}

export async function startLocationTracking(): Promise<void> {
  const already = await Location.hasStartedLocationUpdatesAsync(WAYPOINT_TASK);
  if (already) return;
  await Location.startLocationUpdatesAsync(WAYPOINT_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 30_000,
    distanceInterval: 100,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Trajet en cours',
      notificationBody: 'Enregistrement de votre trajet…',
      notificationColor: '#1D4ED8',
    },
  });
}

export async function stopLocationTracking(): Promise<void> {
  const running = await Location.hasStartedLocationUpdatesAsync(WAYPOINT_TASK);
  if (running) {
    await Location.stopLocationUpdatesAsync(WAYPOINT_TASK);
  }
}

export async function getCurrentLocation(): Promise<Location.LocationObject> {
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
}

// Uses Nominatim for precise house-level reverse geocoding
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'EntretienBatiment/1.0', 'Accept-Language': 'fr,en' } }
    );
    const data: any = await res.json();
    if (data?.address) {
      const a = data.address;
      const parts = [
        a.house_number,
        a.road,
        a.city ?? a.town ?? a.village ?? a.municipality,
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
  } catch {
    // fall through to coordinate fallback
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
